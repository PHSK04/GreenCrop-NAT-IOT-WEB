const test = require('node:test');
const assert = require('node:assert/strict');
const { searchProjectKnowledge, splitDocument } = require('./project_knowledge');

test('splits markdown into source-backed sections', () => {
    const chunks = splitDocument('guide.md', '# Guide\nThis introduction contains enough project detail to be retained.\n## MQTT\nUse smartfarm/control for machine commands in this project.');
    assert.equal(chunks.length, 2);
    assert.equal(chunks[1].source, 'guide.md');
    assert.equal(chunks[1].heading, 'MQTT');
});

test('retrieves real project MQTT documentation', () => {
    const results = searchProjectKnowledge('ปั๊มส่งคำสั่งผ่าน MQTT topic อะไร');
    assert.ok(results.length > 0);
    assert.ok(results.some((item) => item.source === 'docs/guides/IOT_GUIDE.md'));
    assert.ok(results.some((item) => item.text.includes('smartfarm/control')));
});

test('retrieves authenticated device API documentation', () => {
    const results = searchProjectKnowledge('API จับคู่อุปกรณ์ device pair');
    assert.ok(results.some((item) => item.source === 'docs/reference/API.md'));
    assert.ok(results.some((item) => item.text.includes('/api/devices/pair')));
});
