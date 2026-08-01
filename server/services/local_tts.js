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
        voiceCloneConfigured: Boolean(process.env.NAT_AI_XTTS_SPEAKER_WAV),
        python: defaultPythonBin(),
        maxTextChars: MAX_TEXT_CHARS,
    };
}

module.exports = { synthesizeLocalSpeech, getLocalTtsStatus };
