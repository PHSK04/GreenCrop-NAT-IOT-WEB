const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const scope = require('./telemetry_scope');

const received = new Date('2026-11-02T09:00:00Z');
test('a device is authorized by authenticated user ID, including for administrators', async () => {
    const db = { get: async (query, [device, user]) => device === 'A1' && user === 1 ? { user_id: 1 } : null };
    assert.deepEqual(await scope.accountDeviceScope(db, { id: 1 }, ' a1 '), { deviceId: 'A1', tenantId: '1', pairedAt: null });
    await assert.rejects(scope.accountDeviceScope(db, { id: 2, role: 'admin' }, 'A1'), { status: 403 });
    await assert.rejects(scope.accountDeviceScope(db, { id: 1 }, ''), { status: 400 });
    await assert.rejects(scope.accountDeviceScope(db, null, 'A1'), { status: 401 });
});
test('offline measurements preserve their original time and separate arrival time', () => {
    const result = scope.telemetryTime({ timestamp: '2026-10-01T14:00:00+07:00' }, received);
    assert.equal(result.measuredAt.toISOString(), '2026-10-01T07:00:00.000Z');
    assert.equal(result.receivedAt.toISOString(), received.toISOString());
    assert.equal(result.timestampSource, 'device');
});
test('unknown device time is explicitly labelled as receive time', () => {
    assert.equal(scope.telemetryTime({}, received).timestampSource, 'received');
    assert.equal(scope.telemetryTime({}, received).measuredAt, received);
});
test('invalid, ambiguous, pre-clock-sync and future timestamps are rejected', () => {
    for (const timestamp of ['bad', '2026-02-30T12:00:00Z', '2026-11-02T24:00:00Z', '2026-11-02T12:00:00', '1970-01-01T00:00:00Z', '2026-11-02T09:06:00Z']) {
        assert.throws(() => scope.telemetryTime({ timestamp }, received), { status: 400 });
    }
});
test('date filters cover a Thai calendar day, including UTC day rollover', () => {
    assert.deepEqual(scope.telemetryRange('2026-11-02', '2026-11-02'), {
        startDate: '2026-11-01T17:00:00.000Z', endDate: '2026-11-02T16:59:59.999Z',
    });
    assert.throws(() => scope.telemetryRange('2026-11-03', '2026-11-02'), { status: 400 });
});
test('message IDs survive retries and do not collapse legitimate untimed samples', () => {
    assert.equal(scope.telemetryMessageId({ msg_id: 'boot1:42' }), 'boot1:42');
    const a = scope.telemetryMessageId({ timestamp: '2026-11-02T07:00:00Z', ec: 1.2 });
    assert.equal(a, scope.telemetryMessageId({ ec: 1.2, timestamp: '2026-11-02T07:00:00Z' }));
    assert.notEqual(a, scope.telemetryMessageId({ ec: 1.3, timestamp: '2026-11-02T07:00:00Z' }));
    assert.equal(scope.telemetryMessageId({ ec: 1.2 }), null);
    assert.throws(() => scope.telemetryMessageId({ msg_id: 'x'.repeat(129) }), { status: 400 });
});
test('only expected telemetry uniqueness conflicts are treated as duplicate delivery', () => {
    assert.equal(scope.isDuplicateTelemetry({ constraint: 'uq_sensor_device_message' }), true);
    assert.equal(scope.isDuplicateTelemetry({ message: 'connection refused' }), false);
});

// Exercise the actual API read functions with a fake DB, without starting MQTT,
// touching real accounts, or running unrelated startup tasks.
function readers(db) {
    const source = fs.readFileSync(require.resolve('../server'), 'utf8');
    const start = source.indexOf('async function getSensorTenantCandidates(');
    const end = source.indexOf('\nfunction httpsGetJson', start);
    const context = vm.createContext({
        ...scope, db, SENSOR_DATA_SELECT_COLUMNS: '*', isBoardTelemetryRow: () => true,
        parsePositiveInt: (n, fallback) => Number(n) || fallback,
    });
    vm.runInContext(source.slice(start, end), context);
    return context;
}
test('read scope ignores forged tenant requests and never expands into another owner', async () => {
    const queries = [];
    const api = readers({ get: async (sql, args) => args[1] === 1 ? { user_id: 1 } : null, all: async (...args) => { queries.push(args); return []; } });
    const tenants = await api.getSensorTenantCandidates({ user: { id: 1 } }, 'victim', 'A1');
    assert.equal(JSON.stringify(tenants), '["1"]');
    await assert.rejects(api.getSensorTenantCandidates({ user: { id: 2 } }, '1', 'A1'), { status: 403 });
    assert.equal(queries.length, 0);
});
test('latest queries use measurement time and exclude device-less/shared records', async () => {
    const calls = [];
    const api = readers({ all: async (sql, args) => { calls.push([sql, args]); return [
        { id: 200, timestamp: '2026-10-01T00:00:00Z' },
        { id: 100, timestamp: '2026-11-01T00:00:00Z' },
    ]; } });
    const rows = await api.loadLatestSensorRows(['1'], 'A1');
    assert.equal(rows[0].id, 100);
    assert.match(calls[0][0], /tenant_id = \? AND device_id = \?/);
    assert.match(calls[0][0], /ORDER BY timestamp DESC, id DESC/);
    assert.doesNotMatch(calls[0][0], /IS NULL/);
    assert.equal(JSON.stringify(calls[0][1]), '["1","A1"]');
});
test('history is scoped to the selected device and Thai date bounds', async () => {
    let query, params;
    const api = readers({ all: async (sql, values) => { query = sql; params = values; return []; } });
    await api.loadSensorHistoryRows(['1'], 'A2', { startDate: '2026-11-02', endDate: '2026-11-02' });
    assert.match(query, /device_id = \?/);
    assert.doesNotMatch(query, /OR device_id IS NULL/);
    assert.equal(JSON.stringify(params), '["1","A2","2026-11-01T17:00:00.000Z","2026-11-02T16:59:59.999Z"]');
});

function mqttHarness(ownerId = 1) {
    const handlers = {}, writes = [], errors = [];
    const db = {
        get: async sql => sql.includes('device_pairings') ? (ownerId ? { user_id: ownerId } : null) : null,
        run: async (sql, args) => { writes.push({ sql, args }); return { id: writes.length }; },
    };
    const context = vm.createContext({
        module: { exports: {} }, process: { env: {} }, Date, setTimeout, clearTimeout,
        console: { log() {}, warn() {}, error(...args) { errors.push(args); } },
        require: name => {
            if (name === 'mqtt') return { connect: () => ({ on: (name, handler) => { handlers[name] = handler; } }) };
            if (name === './database') return db;
            if (name === './services/telemetry_scope') return scope;
            if (name === './services/ai_training') return { recordAiSensorSample: async () => {} };
            return require(name);
        },
    });
    vm.runInContext(fs.readFileSync(require.resolve('../mqtt_listener'), 'utf8'), context);
    context.module.exports.startMqttListener();
    return { writes, errors, send: (topic, payload) => handlers.message(topic, Buffer.from(JSON.stringify(payload))) };
}
test('MQTT records the paired owner, device, original UTC measurement and receive time', async () => {
    const api = mqttHarness();
    await api.send('tenants/1/devices/A1/sensors', { device_id: 'A1', msg_id: 'sample1', ec: 1.2, timestamp: '2026-10-01T14:00:00+07:00' });
    assert.equal(api.errors.length, 0);
    assert.equal(api.writes.length, 1);
    const { sql, args } = api.writes[0];
    assert.equal((sql.match(/\?/g) || []).length, args.length);
    assert.equal(args[0], '1');
    assert.equal(args[1], 'A1');
    assert.equal(args[3], 'sample1');
    assert.equal(args[29].toISOString(), '2026-10-01T07:00:00.000Z');
    assert.ok(args[30].getTime() > args[29].getTime());
    assert.equal(args[31], 'device');
});
test('MQTT rejects wrong-owner topics, payload device substitution and unpaired devices', async () => {
    const api = mqttHarness();
    await api.send('tenants/2/devices/A1/sensors', { ec: 1.2 });
    await api.send('tenants/1/devices/A1/sensors', { device_id: 'B1', ec: 1.2 });
    await api.send('tenants/1/devices/A1/sensors', { tenant_id: '2', ec: 1.2 });
    assert.equal(api.writes.length, 0);
    const unpaired = mqttHarness(null);
    await unpaired.send('tenants/1/devices/A1/sensors', { ec: 1.2 });
    assert.equal(unpaired.writes.length, 0);
});

function httpWriter(userId, duplicate = false) {
    const writes = [], response = { statusCode: 200, body: null,
        status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    let handler;
    const context = vm.createContext({ ...scope, Date,
        app: { post: (path, fn) => { handler = fn; } },
        db: {
            get: async (sql, values) => sql.includes('device_pairings') && values[0] === 'A1' && values[1] === 1 ? { user_id: 1 } : null,
            run: async (sql, args) => {
                if (duplicate) throw { constraint: 'uq_sensor_device_message' };
                writes.push({ sql, args }); return { id: 1 };
            },
        },
        asNumber: (n, fallback) => Number.isFinite(Number(n)) ? Number(n) : fallback,
        asBool: v => v === true, normalizeSensorColumnValues: () => ({}),
        normalizePumpsJson: () => '[]', hasMeaningfulSensorSignal: () => true,
        SENSOR_DATA_SELECT_COLUMNS: '*', recordAiSensorSample: async () => {},
        console: { log() {}, warn() {}, error() {} },
    });
    const source = fs.readFileSync(require.resolve('../server'), 'utf8');
    const start = source.indexOf("app.post('/api/sensor-data'");
    vm.runInContext(source.slice(start, source.indexOf('\nfunction startServer()', start)), context);
    return { writes, response, send: body => handler({ user: { id: userId }, tenant: 'forged', headers: {}, body }, response) };
}
test('HTTP writes use the authenticated device owner and preserve delayed measurement time', async () => {
    const api = httpWriter(1);
    await api.send({ device_id: 'A1', tenant_id: 'victim', timestamp: '2026-10-01T14:00:00+07:00', ec_value: 1.2, source: 'web-ui', msg_id: '42' });
    assert.equal(api.response.statusCode, 200);
    assert.equal(api.writes.length, 1);
    const { sql, args } = api.writes[0];
    assert.equal((sql.match(/\?/g) || []).length, args.length);
    assert.equal(args[0], '1');
    assert.equal(args[1], 'A1');
    assert.equal(args[28].toISOString(), '2026-10-01T07:00:00.000Z');
    assert.ok(args[29].getTime() > args[28].getTime());
    assert.equal(args[30], 'device');
    assert.equal(args[31], '42');
});
test('HTTP ownership failures write nothing and retry delivery is idempotent', async () => {
    const denied = httpWriter(2);
    await denied.send({ device_id: 'A1', ec_value: 1.2 });
    assert.equal(denied.response.statusCode, 403);
    assert.equal(denied.writes.length, 0);
    const retry = httpWriter(1, true);
    await retry.send({ device_id: 'A1', msg_id: '42', ec_value: 1.2, source: 'web-ui' });
    assert.equal(retry.response.body.duplicate, true);
    assert.equal(retry.writes.length, 0);
});

test('delayed data from before device transfer cannot be assigned to the new owner', () => {
    const timing = scope.telemetryTime({ timestamp: '2026-10-01T00:00:00Z' }, received);
    assert.throws(() => scope.assertMeasurementOwnership(timing, '2026-11-01T00:00:00Z'), { status: 403 });
    assert.doesNotThrow(() => scope.assertMeasurementOwnership(timing, '2026-09-01T00:00:00Z'));
});
