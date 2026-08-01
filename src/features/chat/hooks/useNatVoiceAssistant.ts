import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "nat_ai_hands_free_enabled";
const ONBOARDED_KEY = "nat_ai_local_voice_onboarded";
const VOICE_REPLY_STORAGE_KEY = "nat_ai_voice_reply_enabled";
const VOICE_RATE_STORAGE_KEY = "nat_ai_voice_rate";
const ACTIVE_CONVERSATION_MS = 45_000;
const WAKE_CAPTURE_MS = 3_500;
const COMMAND_CAPTURE_MS = 5_500;
const VOICE_RATES = [0.8, 1, 1.15] as const;

export type VoiceAssistantPhase = "off" | "waiting-wake-word" | "listening-command" | "thinking" | "speaking";
type AssistantVoiceMessage = { id: string; text: string };
type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};
type Options = {
  isOpen: boolean;
  isAssistantMode: boolean;
  isSending: boolean;
  isThai: boolean;
  latestAssistantMessage?: AssistantVoiceMessage;
  onTranscript: (transcript: string) => void;
  onSubmit: (transcript: string) => Promise<void> | void;
  onSynthesizeSpeech?: (text: string, rate: number) => Promise<Blob>;
  onTranscribeAudio?: (audio: Blob, language: string) => Promise<string>;
};

const WAKE_WORD_PATTERNS = [
  /(?:เฮ้|เฮ|โอเค|สวัสดี)\s*(?:กรีน|green)/i,
  /\b(?:hey|hi|okay|ok)\s+green\b/i,
];
const SLEEP_PATTERN = /^(?:พอแล้ว|หยุดฟัง|พักก่อน|ไปพัก|ขอบคุณ(?:ครับ|ค่ะ)?|stop listening|go to sleep|that's all)$/i;
const REPEAT_PATTERN = /^(?:พูดซ้ำ|พูดอีกครั้ง|ทวนอีกครั้ง|repeat(?: that)?|say that again)$/i;
const STOP_SPEAKING_PATTERN = /^(?:หยุดพูด|พอแล้ว|เงียบก่อน|stop speaking|be quiet)$/i;

function extractWakeWordCommand(transcript: string) {
  for (const pattern of WAKE_WORD_PATTERNS) {
    const match = pattern.exec(transcript);
    if (match) return {
      woke: true,
      command: `${transcript.slice(0, match.index)} ${transcript.slice(match.index + match[0].length)}`
        .replace(/^[\s,.;:!?ๆ]+|[\s,.;:!?ๆ]+$/g, "").trim(),
    };
  }
  return { woke: false, command: "" };
}

const storedBool = (key: string, fallback = false) => typeof window === "undefined"
  ? fallback
  : (window.localStorage.getItem(key) == null ? fallback : window.localStorage.getItem(key) === "true");

export function useNatVoiceAssistant(options: Options) {
  const { isOpen, isAssistantMode, isSending, isThai, latestAssistantMessage, onTranscript, onSubmit, onSynthesizeSpeech, onTranscribeAudio } = options;
  const [enabled, setEnabled] = useState(true);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(true);
  const [voiceRate, setVoiceRate] = useState(() => {
    const value = Number(typeof window === "undefined" ? 1 : window.localStorage.getItem(VOICE_RATE_STORAGE_KEY));
    return VOICE_RATES.includes(value as (typeof VOICE_RATES)[number]) ? value : 1;
  });
  const [isListening, setIsListening] = useState(false);
  const [phase, setPhase] = useState<VoiceAssistantPhase>(enabled ? "waiting-wake-word" : "off");
  const [permissionState, setPermissionState] = useState<PermissionState | "unknown">("unknown");
  const enabledRef = useRef(enabled);
  const runtimeRef = useRef({ isOpen, isAssistantMode, isSending });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<number | null>(null);
  const retryCountRef = useRef(0);
  const browserFallbackRef = useRef(false);
  const browserRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const commandWindowUntilRef = useRef(0);
  const lastWakeAtRef = useRef(0);
  const speakingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const bargeMonitorRef = useRef<{ context: AudioContext; frame: number } | null>(null);
  const lastSpokenTextRef = useRef(latestAssistantMessage?.text || "");
  const lastSpokenMessageIdRef = useRef<string | null>(latestAssistantMessage?.id || null);
  const callbacksRef = useRef({ onTranscript, onSubmit, onSynthesizeSpeech, onTranscribeAudio });
  const startCaptureRef = useRef<() => void>(() => {});
  const speakTextRef = useRef<(text: string) => Promise<void>>(async () => {});

  useEffect(() => {
    enabledRef.current = enabled;
    runtimeRef.current = { isOpen, isAssistantMode, isSending };
    callbacksRef.current = { onTranscript, onSubmit, onSynthesizeSpeech, onTranscribeAudio };
  }, [enabled, isAssistantMode, isOpen, isSending, onSubmit, onSynthesizeSpeech, onTranscript, onTranscribeAudio]);

  // The widget stays mounted in the authenticated application shell. Voice capture must
  // therefore follow the signed-in session, not the visual open/closed state of the panel.
  const canRun = useCallback(() => enabledRef.current, []);
  const scheduleRestart = useCallback((delay = 300) => {
    window.setTimeout(() => {
      if (canRun() && !runtimeRef.current.isSending && !speakingRef.current) startCaptureRef.current();
    }, delay);
  }, [canRun]);

  const processTranscript = useCallback((raw: string) => {
    const clean = raw.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const active = Date.now() < commandWindowUntilRef.current;
    const wake = extractWakeWordCommand(clean);
    if (!active && !wake.woke) return;
    if (!active && wake.woke && Date.now() - lastWakeAtRef.current < 2_500) return;
    if (!active && wake.woke) lastWakeAtRef.current = Date.now();
    const command = active ? clean : wake.command;
    commandWindowUntilRef.current = Date.now() + ACTIVE_CONVERSATION_MS;
    if (!command) { setPhase("listening-command"); return; }
    if (SLEEP_PATTERN.test(command)) { commandWindowUntilRef.current = 0; setPhase("waiting-wake-word"); return; }
    if (STOP_SPEAKING_PATTERN.test(command)) { audioRef.current?.pause(); speakingRef.current = false; return; }
    if (REPEAT_PATTERN.test(command)) { if (lastSpokenTextRef.current) void speakTextRef.current(lastSpokenTextRef.current); return; }
    callbacksRef.current.onTranscript(command);
    setPhase("thinking");
    void Promise.resolve(callbacksRef.current.onSubmit(command)).catch(() => undefined);
  }, []);

  const startBrowserFallback = useCallback(() => {
    if (!canRun() || runtimeRef.current.isSending || speakingRef.current || browserRecognitionRef.current) return;
    const speechWindow = window as typeof window & {
      SpeechRecognition?: new () => BrowserSpeechRecognition;
      webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setPhase("off");
      toast.error(isThai
        ? "อุปกรณ์นี้ต้องเชื่อม Local STT จึงจะใช้ Hey Green ได้"
        : "This device needs Local STT to use Hey Green.");
      return;
    }
    const recognition = new Recognition();
    browserRecognitionRef.current = recognition;
    recognition.lang = isThai ? "th-TH" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0]?.transcript || "")
        .join(" ");
      processTranscript(transcript);
    };
    recognition.onerror = () => { retryCountRef.current += 1; };
    recognition.onend = () => {
      browserRecognitionRef.current = null;
      setIsListening(false);
      if (canRun() && !runtimeRef.current.isSending && !speakingRef.current) scheduleRestart(500);
    };
    try {
      recognition.start();
      setPermissionState("granted");
      setIsListening(true);
      setPhase(Date.now() < commandWindowUntilRef.current ? "listening-command" : "waiting-wake-word");
    } catch {
      browserRecognitionRef.current = null;
      scheduleRestart(1_000);
    }
  }, [canRun, isThai, processTranscript, scheduleRestart]);

  const startCapture = useCallback(async () => {
    if (!canRun() || runtimeRef.current.isSending || speakingRef.current || recorderRef.current) return;
    if (browserFallbackRef.current) { startBrowserFallback(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setEnabled(false); enabledRef.current = false; setPhase("off");
      toast.error(isThai ? "เบราว์เซอร์นี้ไม่รองรับ Local Voice Capture" : "This browser cannot capture audio locally.");
      return;
    }
    if (!callbacksRef.current.onTranscribeAudio) {
      setEnabled(false); enabledRef.current = false; setPhase("off");
      toast.error(isThai ? "ยังไม่ได้เชื่อม local STT" : "Local STT is not connected.");
      return;
    }
    try {
      const stream = streamRef.current?.active
        ? streamRef.current
        : await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      streamRef.current = stream;
      setPermissionState("granted");
      window.localStorage.setItem(ONBOARDED_KEY, "true");
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32_000 } : undefined);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        recorderRef.current = null;
        setIsListening(false);
        if (!canRun()) return;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        try {
          const text = await callbacksRef.current.onTranscribeAudio!(blob, isThai ? "th" : "en");
          retryCountRef.current = 0;
          processTranscript(text);
        } catch (error) {
          retryCountRef.current += 1;
          if (retryCountRef.current === 1) {
            browserFallbackRef.current = true;
            toast.info(isThai
              ? "Local STT ไม่พร้อม—สลับเป็นระบบฟังเสียงของเบราว์เซอร์อัตโนมัติ"
              : "Local STT unavailable—using the browser speech fallback automatically.");
          }
        } finally {
          if (canRun() && !runtimeRef.current.isSending && !speakingRef.current) {
            const backoff = Math.min(5_000, 300 * Math.max(1, retryCountRef.current));
            scheduleRestart(backoff);
          }
        }
      };
      recorderRef.current = recorder;
      setIsListening(true);
      const active = Date.now() < commandWindowUntilRef.current;
      setPhase(active ? "listening-command" : "waiting-wake-word");
      recorder.start(500);
      captureTimerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, active ? COMMAND_CAPTURE_MS : WAKE_CAPTURE_MS);
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError");
      setPermissionState(denied ? "denied" : "prompt");
      if (denied) { setEnabled(false); enabledRef.current = false; setPhase("off"); window.localStorage.setItem(STORAGE_KEY, "false"); }
      toast.error(isThai ? "กรุณาอนุญาตไมโครโฟนสำหรับ Local Voice AI" : "Allow microphone access for Local Voice AI.");
    }
  }, [canRun, isThai, processTranscript, scheduleRestart, startBrowserFallback]);
  startCaptureRef.current = () => { void startCapture(); };

  const stopCapture = useCallback(() => {
    if (captureTimerRef.current) window.clearTimeout(captureTimerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current = null;
    browserRecognitionRef.current?.abort();
    browserRecognitionRef.current = null;
    setIsListening(false);
  }, []);

  const stopBargeMonitor = useCallback(() => {
    const monitor = bargeMonitorRef.current;
    if (!monitor) return;
    cancelAnimationFrame(monitor.frame);
    void monitor.context.close();
    bargeMonitorRef.current = null;
  }, []);

  const startBargeMonitor = useCallback(() => {
    stopBargeMonitor();
    const stream = streamRef.current;
    if (!stream?.active) return;
    const context = new AudioContext();
    const analyser = context.createAnalyser(); analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const values = new Float32Array(analyser.fftSize);
    const startedAt = performance.now(); let speechFrames = 0;
    const tick = () => {
      analyser.getFloatTimeDomainData(values);
      const rms = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length);
      // Grace period and sustained high threshold reduce self-trigger from the assistant speaker.
      speechFrames = performance.now() - startedAt > 900 && rms > 0.075 ? speechFrames + 1 : 0;
      if (speechFrames >= 8 && speakingRef.current) {
        speechQueueRef.current = []; audioRef.current?.pause(); window.speechSynthesis?.cancel(); speakingRef.current = false;
        commandWindowUntilRef.current = Date.now() + ACTIVE_CONVERSATION_MS; stopBargeMonitor(); scheduleRestart(50); return;
      }
      const frame = requestAnimationFrame(tick);
      if (bargeMonitorRef.current) bargeMonitorRef.current.frame = frame;
    };
    bargeMonitorRef.current = { context, frame: requestAnimationFrame(tick) };
  }, [scheduleRestart, stopBargeMonitor]);

  const disable = useCallback(() => {
    enabledRef.current = false; setEnabled(false); setPhase("off"); commandWindowUntilRef.current = 0;
    window.localStorage.setItem(STORAGE_KEY, "false"); stopCapture();
    streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null;
    audioRef.current?.pause(); window.speechSynthesis?.cancel();
  }, [stopCapture]);

  const toggleHandsFree = useCallback(() => {
    if (enabledRef.current) { disable(); return; }
    enabledRef.current = true; setEnabled(true); setVoiceReplyEnabled(true); setPhase("waiting-wake-word");
    window.localStorage.setItem(STORAGE_KEY, "true"); window.localStorage.setItem(VOICE_REPLY_STORAGE_KEY, "true");
    toast.success(isThai ? "กำลังเปิดไมค์ Local AI ครั้งแรก จากนั้นพูด “เฮ้ Green” ได้เลย" : "Enabling the local microphone. Then say “Hey Green”.");
    void startCapture();
  }, [disable, isThai, startCapture]);

  const speakText = useCallback(async (text: string) => {
    const clean = text.replace(/[*#`_>-]/g, " ").replace(/\s+/g, " ").trim();
    if (!clean || !voiceReplyEnabled) { scheduleRestart(); return; }
    if (speakingRef.current) {
      if (!speechQueueRef.current.includes(text)) speechQueueRef.current.push(text);
      return;
    }
    stopCapture(); speakingRef.current = true; lastSpokenTextRef.current = text; setPhase("speaking"); startBargeMonitor();
    const finish = () => {
      speakingRef.current = false;
      stopBargeMonitor();
      const next = speechQueueRef.current.shift();
      if (next) { window.setTimeout(() => { void speakTextRef.current(next); }, 0); return; }
      commandWindowUntilRef.current = Date.now() + ACTIVE_CONVERSATION_MS; setPhase("listening-command"); scheduleRestart(250);
    };
    try {
      if (!callbacksRef.current.onSynthesizeSpeech) throw new Error("No local TTS");
      const blob = await callbacksRef.current.onSynthesizeSpeech(clean, voiceRate);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = URL.createObjectURL(blob);
      const audio = new Audio(audioUrlRef.current); audioRef.current = audio; audio.onended = finish; audio.onerror = finish;
      await audio.play();
    } catch {
      if (!("speechSynthesis" in window)) { finish(); return; }
      const utterance = new SpeechSynthesisUtterance(clean); utterance.lang = isThai ? "th-TH" : "en-US"; utterance.rate = voiceRate; utterance.onend = finish; utterance.onerror = finish;
      window.speechSynthesis.cancel(); window.speechSynthesis.speak(utterance);
    }
  }, [isThai, scheduleRestart, startBargeMonitor, stopBargeMonitor, stopCapture, voiceRate, voiceReplyEnabled]);
  speakTextRef.current = speakText;

  const toggleVoiceReply = useCallback(() => { const next = !voiceReplyEnabled; setVoiceReplyEnabled(next); window.localStorage.setItem(VOICE_REPLY_STORAGE_KEY, String(next)); }, [voiceReplyEnabled]);
  const repeatLastReply = useCallback(() => { if (lastSpokenTextRef.current) void speakText(lastSpokenTextRef.current); }, [speakText]);
  const cycleVoiceRate = useCallback(() => { const next = VOICE_RATES[(VOICE_RATES.indexOf(voiceRate as never) + 1) % VOICE_RATES.length]; setVoiceRate(next); window.localStorage.setItem(VOICE_RATE_STORAGE_KEY, String(next)); }, [voiceRate]);
  const stopSpeaking = useCallback(() => { speechQueueRef.current = []; audioRef.current?.pause(); window.speechSynthesis?.cancel(); speakingRef.current = false; stopBargeMonitor(); scheduleRestart(100); }, [scheduleRestart, stopBargeMonitor]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    window.localStorage.setItem(VOICE_REPLY_STORAGE_KEY, "true");
    if (enabled && !isSending) void startCapture();
  }, [enabled, isSending, startCapture]);
  useEffect(() => {
    if (!latestAssistantMessage || latestAssistantMessage.id === lastSpokenMessageIdRef.current || latestAssistantMessage.id.includes("thinking")) return;
    lastSpokenMessageIdRef.current = latestAssistantMessage.id;
    if (voiceReplyEnabled) void speakText(latestAssistantMessage.text); else scheduleRestart();
  }, [latestAssistantMessage, scheduleRestart, speakText, voiceReplyEnabled]);
  useEffect(() => () => { stopCapture(); stopBargeMonitor(); streamRef.current?.getTracks().forEach((track) => track.stop()); audioRef.current?.pause(); if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current); }, [stopBargeMonitor, stopCapture]);

  return { enabled, isListening, phase, permissionState, needsOnboarding: !storedBool(ONBOARDED_KEY), voiceReplyEnabled, voiceRate, toggleHandsFree, toggleVoiceReply, repeatLastReply, cycleVoiceRate, stopSpeaking };
}
