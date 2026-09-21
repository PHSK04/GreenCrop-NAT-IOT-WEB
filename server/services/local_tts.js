const { spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const WORKER_SCRIPT = process.env.NAT_AI_TTS_SCRIPT ||
    path.join(PROJECT_ROOT, 'ai', 'tts', 'local_thai_tts.py');
const MODEL = process.env.NAT_AI_TTS_MODEL || 'facebook/mms-tts-tha';
const TIMEOUT_MS = Math.max(10_000, Math.min(180_000, Number(process.env.NAT_AI_TTS_TIMEOUT_MS || 120_000)));
const MAX_TEXT_CHARS = Math.max(100, Math.min(2400, Number(process.env.NAT_AI_TTS_MAX_TEXT_CHARS || 1200)));
const ENABLED = String(process.env.NAT_AI_LOCAL_TTS_ENABLED || 'true').toLowerCase() !== 'false';
const GOOGLE_TTS_API_KEY = String(process.env.GOOGLE_TTS_API_KEY || '').trim();
const GOOGLE_TTS_VOICE = String(process.env.GOOGLE_TTS_VOICE || 'th-TH-Chirp3-HD-Zubenelgenubi').trim();
const GOOGLE_TTS_LANGUAGE = String(process.env.GOOGLE_TTS_LANGUAGE || 'th-TH').trim();
const TTS_HTTP_URL = String(process.env.NAT_AI_TTS_HTTP_URL || '').replace(/\/$/, '');
const TTS_HTTP_TOKEN = String(process.env.NAT_AI_TTS_HTTP_TOKEN || '');

let worker = null;
let stdoutBuffer = '';
let readyPromise = null;
let readyResolve = null;
let readyReject = null;
const pending = new Map();

function defaultPythonBin() {
    if (process.env.NAT_AI_TTS_PYTHON_BIN) return process.env.NAT_AI_TTS_PYTHON_BIN;
    const candidates = process.platform === 'win32'
        ? [path.join(PROJECT_ROOT, '.venv-tts', 'Scripts', 'python.exe'), 'python']
        : [path.join(PROJECT_ROOT, '.venv-tts', 'bin', 'python'), 'python3'];
    return candidates.find((candidate) => !path.isAbsolute(candidate) || fs.existsSync(candidate)) || candidates.at(-1);
}

function rejectPending(error) {
    for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(error);
    }
    pending.clear();
}

function resetWorker(error) {
    const current = worker;
    worker = null;
    stdoutBuffer = '';
    if (readyReject) readyReject(error);
    readyPromise = null;
    readyResolve = null;
    readyReject = null;
    rejectPending(error);
    if (current && !current.killed) current.kill();
}

function handleWorkerMessage(message) {
    if (message?.type === 'ready') {
        if (readyResolve) readyResolve(message);
        readyResolve = null;
        readyReject = null;
        return;
    }
    const request = pending.get(String(message?.id || ''));
    if (!request) return;
    pending.delete(String(message.id));
    clearTimeout(request.timer);
    if (message.error) {
        request.reject(new Error(message.error));
        return;
    }
    request.resolve(message);
}

function ensureWorker() {
    if (!ENABLED) return Promise.reject(new Error('Local TTS is disabled'));
    if (worker && readyPromise) return readyPromise;
    if (!fs.existsSync(WORKER_SCRIPT)) return Promise.reject(new Error(`TTS worker not found: ${WORKER_SCRIPT}`));

    const pythonBin = defaultPythonBin();
    readyPromise = new Promise((resolve, reject) => {
        readyResolve = resolve;
        readyReject = reject;
    });
    worker = spawn(pythonBin, ['-u', WORKER_SCRIPT], {
        cwd: PROJECT_ROOT,
        env: {
            ...process.env,
            PYTHONIOENCODING: 'utf-8',
            NAT_AI_TTS_MODEL: MODEL,
            NAT_AI_TTS_MAX_TEXT_CHARS: String(MAX_TEXT_CHARS),
        },
        windowsHide: true,
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    worker.stdout.setEncoding('utf8');
    worker.stdout.on('data', (chunk) => {
        stdoutBuffer += chunk;
        let newlineIndex = stdoutBuffer.indexOf('\n');
        while (newlineIndex >= 0) {
            const line = stdoutBuffer.slice(0, newlineIndex).trim();
            stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
            if (line) {
                try {
                    handleWorkerMessage(JSON.parse(line));
                } catch (error) {
                    console.error('[local-tts] invalid worker response:', error.message);
                }
            }
            newlineIndex = stdoutBuffer.indexOf('\n');
        }
    });
    worker.stderr.setEncoding('utf8');
    worker.stderr.on('data', (chunk) => console.log(String(chunk).trimEnd()));
    worker.once('error', (error) => resetWorker(error));
    worker.once('exit', (code, signal) => {
        if (worker) resetWorker(new Error(`Local TTS worker exited (${code ?? signal ?? 'unknown'})`));
    });

    const startupTimer = setTimeout(() => {
        if (readyReject) resetWorker(new Error(`Local TTS model did not load within ${TIMEOUT_MS}ms`));
    }, TIMEOUT_MS);
    readyPromise.finally(() => clearTimeout(startupTimer)).catch(() => {});
    return readyPromise;
}

async function synthesizeLocalSpeech(text, options = {}) {
    const cleanText = String(text || '').replace(/\s+/g, ' ').trim();
    if (!cleanText) throw new Error('Text is required');
    if (cleanText.length > MAX_TEXT_CHARS) throw new Error(`Text exceeds ${MAX_TEXT_CHARS} characters`);

    if (TTS_HTTP_URL) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        try {
            const response = await fetch(`${TTS_HTTP_URL}/synthesize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(TTS_HTTP_TOKEN ? { 'X-NAT-TTS-Token': TTS_HTTP_TOKEN } : {}),
                },
                body: JSON.stringify({ text: cleanText, rate: Number(options.rate || 0.92) }),
                signal: controller.signal,
            });
            if (!response.ok) throw new Error(`F5 voice service failed (${response.status}): ${(await response.text()).slice(0, 300)}`);
            return {
                audio: Buffer.from(await response.arrayBuffer()),
                contentType: response.headers.get('content-type') || 'audio/wav',
                model: response.headers.get('x-nat-ai-voice-model') || 'VIZINTZOR/F5-TTS-THAI',
            };
        } finally {
            clearTimeout(timer);
        }
    }

    if (GOOGLE_TTS_API_KEY) {
        const rate = Math.max(0.75, Math.min(1.25, Number(options.rate || 0.95)));
        const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(GOOGLE_TTS_API_KEY)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: { text: cleanText },
                voice: { languageCode: GOOGLE_TTS_LANGUAGE, name: GOOGLE_TTS_VOICE },
                audioConfig: { audioEncoding: 'MP3', speakingRate: rate },
            }),
        });
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            throw new Error(`Google TTS failed (${response.status}): ${detail.slice(0, 300)}`);
        }
        const payload = await response.json();
        if (!payload.audioContent) throw new Error('Google TTS returned no audio');
        return {
            audio: Buffer.from(payload.audioContent, 'base64'),
            contentType: 'audio/mpeg',
            model: GOOGLE_TTS_VOICE,
        };
    }

    await ensureWorker();
    if (!worker?.stdin?.writable) throw new Error('Local TTS worker is unavailable');

    const id = crypto.randomUUID();
    const response = new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            pending.delete(id);
            reject(new Error(`Local TTS request timed out after ${TIMEOUT_MS}ms`));
        }, TIMEOUT_MS);
        pending.set(id, { resolve, reject, timer });
    });
    worker.stdin.write(`${JSON.stringify({
        id,
        text: cleanText,
        rate: Number(options.rate || 1),
    })}\n`);
    const result = await response;
    return {
        audio: Buffer.from(result.audio_base64, 'base64'),
        contentType: result.content_type || 'audio/wav',
        model: result.model || MODEL,
    };
}

function getLocalTtsStatus() {
    return {
        enabled: ENABLED,
        running: Boolean(worker),
        model: MODEL,
        engine: process.env.NAT_AI_TTS_ENGINE || 'mms',
        provider: TTS_HTTP_URL ? 'local-f5-voice-clone' : (GOOGLE_TTS_API_KEY ? 'google-cloud' : 'local'),
        voiceCloneConfigured: Boolean(TTS_HTTP_URL || process.env.NAT_AI_XTTS_SPEAKER_WAV),
        googleVoice: GOOGLE_TTS_API_KEY ? GOOGLE_TTS_VOICE : null,
        python: defaultPythonBin(),
        maxTextChars: MAX_TEXT_CHARS,
    };
}

module.exports = { synthesizeLocalSpeech, getLocalTtsStatus };
