const samples = new Map();
const MAX_SAMPLES = 200;

function recordLatency(stage, startedAt, metadata = {}) {
  const durationMs = Math.max(0, Date.now() - Number(startedAt || Date.now()));
  const list = samples.get(stage) || [];
  list.push({ durationMs, at: new Date().toISOString(), ok: metadata.ok !== false });
  if (list.length > MAX_SAMPLES) list.splice(0, list.length - MAX_SAMPLES);
  samples.set(stage, list);
  return durationMs;
}

function getLatencyMetrics() {
  const result = {};
  for (const [stage, list] of samples) {
    const durations = list.map((item) => item.durationMs).sort((a, b) => a - b);
    result[stage] = {
      count: list.length,
      failures: list.filter((item) => !item.ok).length,
      p50_ms: durations[Math.floor((durations.length - 1) * 0.5)] || 0,
      p95_ms: durations[Math.floor((durations.length - 1) * 0.95)] || 0,
      last_at: list.at(-1)?.at || null,
    };
  }
  return { raw_audio_stored: false, stages: result };
}

module.exports = { recordLatency, getLatencyMetrics };
