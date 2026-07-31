import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "nat_ai_hands_free_enabled";
const ACTIVE_CONVERSATION_MS = 45_000;

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export type VoiceAssistantPhase =
  | "off"
  | "waiting-wake-word"
  | "listening-command"
  | "thinking"
  | "speaking";

type AssistantVoiceMessage = {
  id: string;
  text: string;
};

type UseNatVoiceAssistantOptions = {
  isOpen: boolean;
  isAssistantMode: boolean;
  isSending: boolean;
  isThai: boolean;
  latestAssistantMessage?: AssistantVoiceMessage;
  onTranscript: (transcript: string) => void;
  onSubmit: (transcript: string) => Promise<void> | void;
};

const WAKE_WORD_PATTERNS = [
  /(?:เฮ้|เฮ|โอเค|สวัสดี)\s*(?:แนท|nat|เอ็นเอที)/i,
  /\b(?:hey|hi|okay|ok)\s+nat\b/i,
  /(?:แนท|nat|เอ็นเอที)\s*(?:เอไอ|ai)?/i,
];

const SLEEP_PATTERN =
  /^(?:พอแล้ว|หยุดฟัง|พักก่อน|ไปพัก|ขอบคุณ(?:ครับ|ค่ะ)?|stop listening|go to sleep|that's all)$/i;

const extractWakeWordCommand = (transcript: string) => {
  for (const pattern of WAKE_WORD_PATTERNS) {
    const match = pattern.exec(transcript);
    if (!match) continue;
    return {
      woke: true,
      command: `${transcript.slice(0, match.index)} ${transcript.slice(match.index + match[0].length)}`
        .replace(/^[\s,.;:!?ๆ]+|[\s,.;:!?ๆ]+$/g, "")
        .trim(),
    };
  }
  return { woke: false, command: "" };
};

const readStoredEnabled = () => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
};

export function useNatVoiceAssistant({
  isOpen,
  isAssistantMode,
  isSending,
  isThai,
  latestAssistantMessage,
  onTranscript,
  onSubmit,
}: UseNatVoiceAssistantOptions) {
  const [enabled, setEnabled] = useState(readStoredEnabled);
  const [voiceReplyEnabled, setVoiceReplyEnabled] = useState(readStoredEnabled);
  const [isListening, setIsListening] = useState(false);
  const [phase, setPhase] = useState<VoiceAssistantPhase>(
    readStoredEnabled() ? "waiting-wake-word" : "off",
  );
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const enabledRef = useRef(enabled);
  const openRef = useRef(isOpen);
  const assistantModeRef = useRef(isAssistantMode);
  const sendingRef = useRef(isSending);
  const speakingRef = useRef(false);
  const commandWindowUntilRef = useRef(0);
  const lastSpokenMessageIdRef = useRef<string | null>(latestAssistantMessage?.id || null);
  const startListeningRef = useRef<() => void>(() => {});
  const onTranscriptRef = useRef(onTranscript);
  const onSubmitRef = useRef(onSubmit);

  useEffect(() => {
    enabledRef.current = enabled;
    openRef.current = isOpen;
    assistantModeRef.current = isAssistantMode;
    sendingRef.current = isSending;
    onTranscriptRef.current = onTranscript;
    onSubmitRef.current = onSubmit;
  }, [enabled, isAssistantMode, isOpen, isSending, onSubmit, onTranscript]);

  const canRun = useCallback(
    () => enabledRef.current && openRef.current && assistantModeRef.current,
    [],
  );

  const scheduleRestart = useCallback((delay = 350) => {
    window.setTimeout(() => {
      if (canRun() && !sendingRef.current && !speakingRef.current) {
        startListeningRef.current();
      }
    }, delay);
  }, [canRun]);

  const startListening = useCallback(() => {
    if (!canRun() || sendingRef.current || speakingRef.current || recognitionRef.current) return;
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setEnabled(false);
      enabledRef.current = false;
      setPhase("off");
      toast.error(isThai
        ? "เบราว์เซอร์นี้ยังไม่รองรับผู้ช่วยเสียง กรุณาใช้ Chrome หรือ Edge"
        : "Voice assistant is not supported. Try Chrome or Edge.");
      return;
    }

    const recognition = new Recognition();
    let handledFinalResult = false;
    recognition.lang = isThai ? "th-TH" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index]?.[0]?.transcript || "";
      }
      const cleanTranscript = transcript.trim();
      const finalResult = event.results[event.results.length - 1];
      if (!finalResult?.isFinal || !cleanTranscript || handledFinalResult) return;
      handledFinalResult = true;

      const activeConversation = Date.now() < commandWindowUntilRef.current;
      const wakeResult = extractWakeWordCommand(cleanTranscript);
      if (!activeConversation && !wakeResult.woke) {
        recognition.stop();
        return;
      }

      const command = activeConversation ? cleanTranscript : wakeResult.command;
      commandWindowUntilRef.current = Date.now() + ACTIVE_CONVERSATION_MS;
      if (!command) {
        setPhase("listening-command");
        recognition.stop();
        return;
      }
      if (SLEEP_PATTERN.test(command)) {
        commandWindowUntilRef.current = 0;
        onTranscriptRef.current("");
        setPhase("waiting-wake-word");
        recognition.stop();
        return;
      }

      onTranscriptRef.current(command);
      setPhase("thinking");
      recognition.stop();
      window.setTimeout(() => Promise.resolve(onSubmitRef.current(command)).catch(() => {}), 0);
    };
    recognition.onerror = (event) => {
      recognitionRef.current = null;
      setIsListening(false);
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setEnabled(false);
        enabledRef.current = false;
        setPhase("off");
        window.localStorage.setItem(STORAGE_KEY, "false");
        toast.error(isThai
          ? "กรุณาอนุญาตใช้ไมโครโฟนเพื่อเปิด NAT AI แบบไม่ใช้มือ"
          : "Allow microphone access to use hands-free NAT AI.");
        return;
      }
      if (event.error !== "aborted" && event.error !== "no-speech") {
        toast.error(isThai ? "ระบบฟังเสียงสะดุด กำลังลองใหม่" : "Voice listening was interrupted. Retrying.");
      }
    };
    recognition.onend = () => {
      if (recognitionRef.current === recognition) recognitionRef.current = null;
      setIsListening(false);
      if (canRun() && !sendingRef.current && !speakingRef.current) {
        setPhase(Date.now() < commandWindowUntilRef.current ? "listening-command" : "waiting-wake-word");
        scheduleRestart();
      }
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    setPhase(Date.now() < commandWindowUntilRef.current ? "listening-command" : "waiting-wake-word");
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      scheduleRestart(700);
    }
  }, [canRun, isThai, scheduleRestart]);

  startListeningRef.current = startListening;

  const disable = useCallback(() => {
    enabledRef.current = false;
    setEnabled(false);
    setPhase("off");
    setIsListening(false);
    commandWindowUntilRef.current = 0;
    window.localStorage.setItem(STORAGE_KEY, "false");
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
  }, []);

  const toggleHandsFree = useCallback(() => {
    if (enabledRef.current) {
      disable();
      return;
    }
    enabledRef.current = true;
    setEnabled(true);
    setVoiceReplyEnabled(true);
    setPhase("waiting-wake-word");
    window.localStorage.setItem(STORAGE_KEY, "true");
    lastSpokenMessageIdRef.current = latestAssistantMessage?.id || null;
    window.setTimeout(() => startListeningRef.current(), 0);
    toast.success(isThai
      ? "เปิด NAT AI แบบไม่ใช้มือแล้ว พูดว่า “เฮ้ NAT” เพื่อเริ่ม"
      : "Hands-free NAT AI is on. Say “Hey NAT” to begin.");
  }, [disable, isThai, latestAssistantMessage?.id]);

  const toggleVoiceReply = useCallback(() => {
    if (voiceReplyEnabled) {
      window.speechSynthesis?.cancel();
      speakingRef.current = false;
      setVoiceReplyEnabled(false);
      scheduleRestart();
      return;
    }
    lastSpokenMessageIdRef.current = latestAssistantMessage?.id || null;
    setVoiceReplyEnabled(true);
    toast.success(isThai ? "เปิดเสียงตอบกลับแล้ว" : "Voice replies enabled");
  }, [isThai, latestAssistantMessage?.id, scheduleRestart, voiceReplyEnabled]);

  useEffect(() => {
    if (!enabled || !isOpen || !isAssistantMode || isSending) return;
    startListeningRef.current();
  }, [enabled, isAssistantMode, isOpen, isSending]);

  useEffect(() => {
    if (!latestAssistantMessage || latestAssistantMessage.id === lastSpokenMessageIdRef.current) return;
    if (latestAssistantMessage.id.includes("thinking")) return;
    lastSpokenMessageIdRef.current = latestAssistantMessage.id;
    if (!voiceReplyEnabled || !("speechSynthesis" in window)) {
      if (enabledRef.current) scheduleRestart();
      return;
    }

    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
    speakingRef.current = true;
    setPhase("speaking");
    const utterance = new SpeechSynthesisUtterance(
      latestAssistantMessage.text.replace(/[*#`_>-]/g, " ").replace(/\s+/g, " ").trim(),
    );
    utterance.lang = isThai ? "th-TH" : "en-US";
    utterance.rate = isThai ? 1 : 0.95;
    utterance.onend = () => {
      speakingRef.current = false;
      commandWindowUntilRef.current = Date.now() + ACTIVE_CONVERSATION_MS;
      setPhase("listening-command");
      scheduleRestart(250);
    };
    utterance.onerror = () => {
      speakingRef.current = false;
      scheduleRestart();
    };
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, [isThai, latestAssistantMessage, scheduleRestart, voiceReplyEnabled]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  return {
    enabled,
    isListening,
    phase,
    voiceReplyEnabled,
    toggleHandsFree,
    toggleVoiceReply,
  };
}
