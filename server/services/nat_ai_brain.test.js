const test = require('node:test');
const assert = require('node:assert/strict');
const { buildBrainAssessment } = require('./nat_ai_brain');

test('marks fresh telemetry and never claims hardware changed', () => {
    const result = buildBrainAssessment({
        current_datetime: '2026-07-31T10:05:00Z',
        latest_sensor: { timestamp: '2026-07-31T10:00:00Z' },
        project_evidence: [{ source: 'docs/API.md', score: 0.9 }],
    }, {
        provider: 'python',
        actions: [{ command: 'pump1_on' }],
        risk: { severity: 'warning' },
    });
    assert.equal(result.data_quality.telemetry_fresh, true);
    assert.equal(result.safety.mode, 'confirmation-required');
    assert.equal(result.safety.hardware_changed, false);
    assert.ok(result.confidence >= 0.8);
});

test('lowers confidence when telemetry and evidence are missing', () => {
    const result = buildBrainAssessment({}, { provider: 'fallback', actions: [] });
    assert.equal(result.data_quality.telemetry_available, false);
    assert.equal(result.safety.mode, 'read-only');
    assert.ok(result.confidence < 0.6);
});
