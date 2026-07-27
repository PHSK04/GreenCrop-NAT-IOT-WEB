const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { buildLocalGroundedReply, buildModelMessages, buildNatAiContext, isProjectKnowledgeQuestion } = require('./nat_ai_chat');

test('generative chat sends recent turns as real conversation roles', () => {
    const result = buildModelMessages({
        user_message: 'แล้วเครื่องที่สองล่ะ',
        recent_conversation: [
            { role: 'user', text: 'เครื่องแรกเป็นยังไง' },
            { role: 'assistant', text: 'เครื่องแรกออนไลน์ครับ' },
        ],
        data_scope: { tenant_id: 'user-1' },
    });

    assert.deepEqual(result.messages.slice(1, 3), [
        { role: 'user', content: 'เครื่องแรกเป็นยังไง' },
        { role: 'assistant', content: 'เครื่องแรกออนไลน์ครับ' },
    ]);
    assert.match(result.messages.at(-1).content, /^แล้วเครื่องที่สองล่ะ/);
    assert.doesNotMatch(result.messages.at(-1).content, /recent_conversation/);
});

test('short follow-up inherits the previous topic for data routing', async () => {
    const context = await buildNatAiContext({
        req: { user: { id: 1, role: 'user' }, tenant: 'tenant-1' },
        db: {},
        session: { id: 9 },
        userMessage: 'แล้วเมื่อวานล่ะ',
        getSensorTenantCandidates: async () => ['tenant-1'],
        loadLatestSensorRows: async () => [],
        loadSensorHistoryRows: async () => [],
        loadAiChatMessages: async () => [
            { sender_role: 'user', body: 'ปั๊มทำงานเป็นยังไง' },
            { sender_role: 'ai', body: 'ตอนนี้ปั๊มหยุดอยู่ครับ' },
        ],
        getTenantLearningSummary: async () => null,
        getDevicesForUser: async () => [],
    });

    assert.equal(context.ai_route.intent, 'pump_status');
    assert.equal(context.ai_route.needsSensorHistory, true);
    assert.ok(context.requested_date);
});

test('local AI composes a Thai source-backed answer without an API key', () => {
    const result = buildLocalGroundedReply({
        user_message: 'จับคู่อุปกรณ์ยังไง',
        project_evidence: [{
            source: 'docs/reference/API.md',
            heading: 'Devices',
            text: 'POST /api/devices/pair ใช้ pair อุปกรณ์เข้ากับบัญชี',
        }],
    });
    assert.equal(result.provider, 'local-grounded-ai');
    assert.match(result.text, /POST \/api\/devices\/pair/);
    assert.match(result.text, /docs\/reference\/API\.md/);
});

test('local AI is honest when project evidence is unavailable', () => {
    const result = buildLocalGroundedReply({ user_message: 'เรื่องที่ไม่มีในระบบ', project_evidence: [] });
    assert.equal(result.provider, 'local-grounded-ai');
    assert.match(result.text, /ยังไม่พบข้อมูล/);
});

test('routes project setup questions to the grounded knowledge path', () => {
    assert.equal(isProjectKnowledgeQuestion('MQTT ควบคุมปั๊มผ่าน topic อะไร'), true);
    assert.equal(isProjectKnowledgeQuestion('สถานะ pH ตอนนี้เป็นอย่างไร'), false);
});

test('stale telemetry is not misreported as pH out of range', () => {
    const script = path.resolve(__dirname, '../../ai/controller/nat_ai_controller.py');
    const payload = JSON.stringify({
        context: {
            user_message: 'ข้อมูลไม่อัปเดตเกิน 10 นาที ทำไง',
            current_datetime: '2026-07-11T12:20:00Z',
            latest_sensor: {
                timestamp: '2026-07-11T12:00:00Z',
                ph_value: 0,
                ec_value: 0,
                temp_c: 0,
                ph_ok: false,
            },
        },
    });
    const result = spawnSync('python3', [script], { input: payload, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const response = JSON.parse(result.stdout);
    assert.equal(response.risk.severity, 'offline');
    assert.deepEqual(response.risk.reasons, ['telemetry_stale']);
    assert.doesNotMatch(response.text, /ph_out_of_range|pH 0\.00/);
    assert.match(response.text, /20 นาที/);
});
