const test = require('node:test');
const assert = require('node:assert/strict');
const { getLocalVoiceAiStatus, transcribeLocalAudio, proposeLocalTool, normalizeToolProposal } = require('./local_voice_ai');

test('local voice status never advertises a cloud provider', () => {
  const status = getLocalVoiceAiStatus();
  assert.equal(status.cloud_disabled, true);
  assert.equal(status.llm.provider, 'ollama');
  assert.equal(status.wake_word.phrase, 'เฮ้ Green');
});

test('voice cloning is opt-in and requires a protected speaker profile', () => {
  const previousEngine = process.env.NAT_AI_TTS_ENGINE;
  const previousProfile = process.env.NAT_AI_XTTS_SPEAKER_WAV;
  process.env.NAT_AI_TTS_ENGINE = 'xtts';
  delete process.env.NAT_AI_XTTS_SPEAKER_WAV;
  const status = getLocalVoiceAiStatus();
  assert.equal(status.tts.voice_cloning, true);
  assert.equal(status.tts.voice_profile_configured, false);
  if (previousEngine === undefined) delete process.env.NAT_AI_TTS_ENGINE; else process.env.NAT_AI_TTS_ENGINE = previousEngine;
  if (previousProfile === undefined) delete process.env.NAT_AI_XTTS_SPEAKER_WAV; else process.env.NAT_AI_XTTS_SPEAKER_WAV = previousProfile;
});

test('local STT mock preserves Thai wake phrase without downloading a model', async () => {
  process.env.NAT_AI_STT_MOCK_TEXT = 'เฮ้ Green วันนี้ค่า pH เท่าไร';
  const result = await transcribeLocalAudio(Buffer.from('mock-audio'), { language: 'th' });
  assert.equal(result.text, 'เฮ้ Green วันนี้ค่า pH เท่าไร');
  assert.equal(result.mock, true);
  delete process.env.NAT_AI_STT_MOCK_TEXT;
});

test('structured local tool mock keeps control as a proposal only', async () => {
  process.env.NAT_AI_OLLAMA_TOOL_MOCK_JSON = JSON.stringify({ tool: 'control_device', action: 'pump1_on' });
  const result = await proposeLocalTool({
    userMessage: 'เปิดตัวเดิมด้วย',
    recentConversation: [{ role: 'user', content: 'เราคุยเรื่องปั๊มหนึ่ง' }],
  });
  assert.deepEqual({ tool: result.tool, action: result.action }, { tool: 'control_device', action: 'pump1_on' });
  delete process.env.NAT_AI_OLLAMA_TOOL_MOCK_JSON;
});

test('read-only tool proposals cannot carry a device action', () => {
  assert.deepEqual(
    normalizeToolProposal({ tool: 'read_device_context', action: 'system_off' }),
    { tool: 'read_device_context', action: null },
  );
});

test('unknown device actions are rejected before authorization', () => {
  assert.deepEqual(
    normalizeToolProposal({ tool: 'control_device', action: 'factory_reset' }),
    { tool: 'none', action: null },
  );
});
