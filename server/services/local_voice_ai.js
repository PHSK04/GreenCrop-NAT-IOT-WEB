const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '../..');

const enabled = (name, fallback = false) => String(process.env[name] ?? fallback).toLowerCase() === 'true';

function normalizeToolProposal(proposal = {}) {
  if (!['none', 'read_device_context', 'control_device'].includes(proposal.tool)) return { tool: 'none', action: null };
  if (proposal.tool !== 'control_device') return { tool: proposal.tool, action: null };
  const allowedActions = ['system_on', 'system_off', 'pump1_on', 'pump1_off', 'pump2_on', 'pump2_off'];
  return allowedActions.includes(proposal.action)
    ? { tool: proposal.tool, action: proposal.action }
    : { tool: 'none', action: null };
}

function getLocalVoiceAiStatus() {
  return {
    cloud_disabled: true,
    stt: {
      enabled: enabled('NAT_AI_LOCAL_STT_ENABLED'),
      engine: process.env.NAT_AI_STT_ENGINE || 'faster-whisper',
      model: process.env.NAT_AI_STT_MODEL || 'small',
    },
    llm: {
      enabled: enabled('NAT_AI_OLLAMA_ENABLED', true),
      provider: 'ollama',
      model: process.env.NAT_AI_OLLAMA_MODEL || 'qwen2.5:7b',
    },
    tts: {
      enabled: enabled('NAT_AI_LOCAL_TTS_ENABLED', true),
      engine: process.env.NAT_AI_TTS_ENGINE || 'mms',
      voice_cloning: (process.env.NAT_AI_TTS_ENGINE || '').toLowerCase() === 'xtts',
      voice_profile_configured: Boolean(process.env.NAT_AI_XTTS_SPEAKER_WAV),
    },
    wake_word: { engine: 'browser-local-or-push-to-talk', phrase: 'เฮ้ Green' },
  };
}

function transcribeLocalAudio(audio, { language = 'th' } = {}) {
  if (process.env.NAT_AI_STT_MOCK_TEXT !== undefined) {
    return Promise.resolve({ text: process.env.NAT_AI_STT_MOCK_TEXT, language, mock: true });
  }
  if (!enabled('NAT_AI_LOCAL_STT_ENABLED')) throw new Error('Local STT is disabled');
  const configuredPython = process.env.NAT_AI_STT_PYTHON_BIN || '';
  const localPython = path.join(PROJECT_ROOT, 'ai', '.venv', 'bin', 'python');
  const python = configuredPython
    ? (path.isAbsolute(configuredPython) ? configuredPython : path.resolve(PROJECT_ROOT, configuredPython))
    : (fs.existsSync(localPython) ? localPython : 'python3');
  const configuredScript = process.env.NAT_AI_STT_SCRIPT || 'ai/stt/local_transcribe.py';
  const script = path.isAbsolute(configuredScript) ? configuredScript : path.resolve(PROJECT_ROOT, configuredScript);
  const args = [script, '--stdin', '--model', process.env.NAT_AI_STT_MODEL || 'small', '--language', language];
  return new Promise((resolve, reject) => {
    const child = spawn(python, args, { cwd: PROJECT_ROOT, stdio: ['pipe', 'pipe', 'pipe'] });
    const chunks = []; const errors = [];
    const timeout = setTimeout(() => child.kill('SIGKILL'), Number(process.env.NAT_AI_STT_TIMEOUT_MS || 90000));
    child.stdout.on('data', (value) => chunks.push(value));
    child.stderr.on('data', (value) => errors.push(value));
    child.on('error', reject);
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) return reject(new Error(Buffer.concat(errors).toString().trim() || 'Local STT failed'));
      try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
      catch { reject(new Error('Local STT returned invalid JSON')); }
    });
    child.stdin.end(audio);
  });
}

async function proposeLocalTool({ userMessage, recentConversation = [] }) {
  if (process.env.NAT_AI_OLLAMA_TOOL_MOCK_JSON) {
    const parsed = JSON.parse(process.env.NAT_AI_OLLAMA_TOOL_MOCK_JSON);
    return { ...normalizeToolProposal(parsed), mock: true };
  }
  if (!enabled('NAT_AI_OLLAMA_ENABLED', true)) return { tool: 'none' };
  const baseUrl = String(process.env.NAT_AI_OLLAMA_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.NAT_AI_OLLAMA_TOOL_TIMEOUT_MS || 15000));
  const schema = {
    type: 'object', additionalProperties: false, required: ['tool'],
    properties: {
      tool: { type: 'string', enum: ['none', 'read_device_context', 'control_device'] },
      action: { type: ['string', 'null'], enum: ['system_on', 'system_off', 'pump1_on', 'pump1_off', 'pump2_on', 'pump2_off', null] },
    },
  };
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.NAT_AI_OLLAMA_MODEL || 'qwen2.5:7b', stream: false, format: schema,
        messages: [
          { role: 'system', content: 'เลือก tool เฉพาะเมื่อผู้ใช้ต้องการอ่านข้อมูลอุปกรณ์จริงหรือควบคุมอุปกรณ์ ห้ามเดาคำสั่งจากบทสนทนาทั่วไป ใช้บริบท follow-up ภาษาไทยได้ ตอบ JSON ตาม schema เท่านั้น และห้ามอ้างว่าได้สั่งอุปกรณ์แล้ว' },
          ...recentConversation.slice(-8).map((item) => ({ role: item.role === 'assistant' ? 'assistant' : 'user', content: String(item.content || '') })),
          { role: 'user', content: String(userMessage || '') },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Ollama tool router failed (${response.status})`);
    const payload = await response.json();
    const parsed = JSON.parse(payload?.message?.content || '{}');
    return normalizeToolProposal(parsed);
  } finally { clearTimeout(timeout); }
}

module.exports = { getLocalVoiceAiStatus, transcribeLocalAudio, proposeLocalTool, normalizeToolProposal };
