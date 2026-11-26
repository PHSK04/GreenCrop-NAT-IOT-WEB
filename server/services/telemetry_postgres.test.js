const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const scope = require('./telemetry_scope');

const url = process.env.TELEMETRY_TEST_DATABASE_URL;
test('PostgreSQL migration, isolation, device-scoped deduplication and delayed history', { skip: !url }, async () => {
    // This suite requires an explicitly designated disposable test database.
    assert.match(new URL(url).pathname, /_test$/);
    process.env.DATABASE_URL = url;
    process.env.DB_SSL_MODE = 'disable';
    let db = require('../database_postgres');
    try {
        await db.ready;
        const suffix = `${Date.now()}-${process.pid}`;
        const userA = await db.run('INSERT INTO users (email, name) VALUES (?, ?)', [`a-${suffix}@test.invalid`, 'A']);
        const userB = await db.run('INSERT INTO users (email, name) VALUES (?, ?)', [`b-${suffix}@test.invalid`, 'B']);
        const a1 = `A1-${suffix}`, a2 = `A2-${suffix}`, b1 = `B1-${suffix}`;
        for (const [device, user] of [[a1, userA.id], [a2, userA.id], [b1, userB.id]]) {
            await db.run('INSERT INTO device_pairings (user_id, device_id, pairing_code) VALUES (?, ?, ?)', [user, device, 'test']);
            await db.run('INSERT INTO sensor_data (tenant_id, device_id, sensor_id, msg_id, ec_value, timestamp, received_at, timestamp_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [String(user), device, 'EC', '42', 1.2, '2026-11-02T14:00:00+07:00', '2026-11-02T09:00:00Z', 'device']);
        }
        await assert.rejects(scope.accountDeviceScope(db, { id: userA.id }, b1), { status: 403 });
        const own = await scope.accountDeviceScope(db, { id: userA.id }, a1);
        assert.equal(own.tenantId, String(userA.id));
        await assert.rejects(db.run('INSERT INTO sensor_data (tenant_id, device_id, msg_id, timestamp) VALUES (?, ?, ?, ?)',
            [String(userA.id), a1, '42', '2026-11-03T00:00:00Z']), { code: '23505' });
        // A late arrival receives a larger ID but must not become the latest reading.
        await db.run('INSERT INTO sensor_data (tenant_id, device_id, sensor_id, msg_id, ec_value, timestamp, received_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [String(userA.id), a1, 'EC', '41', 0.9, '2026-11-01T18:00:00Z', '2026-11-02T10:00:00Z']);
        const source = fs.readFileSync(require.resolve('../server'), 'utf8');
        const start = source.indexOf('async function getSensorTenantCandidates(');
        const context = vm.createContext({ ...scope, db, SENSOR_DATA_SELECT_COLUMNS: '*',
            isBoardTelemetryRow: () => true, parsePositiveInt: (n, fallback) => Number(n) || fallback });
        vm.runInContext(source.slice(start, source.indexOf('\nfunction httpsGetJson', start)), context);
        const latest = await context.loadLatestSensorRows([String(userA.id)], a1);
        assert.equal(latest.length, 1);
        assert.equal(latest[0].msg_id, '42');
        assert.equal(latest[0].timestamp.toISOString(), '2026-11-02T07:00:00.000Z');
        assert.equal(latest[0].received_at.toISOString(), '2026-11-02T09:00:00.000Z');
        const history = await context.loadSensorHistoryRows([String(userA.id)], a1, { startDate: '2026-11-02', endDate: '2026-11-02' });
        assert.equal(history.length, 2);
        assert.ok(history.every(row => row.device_id === a1 && row.tenant_id === String(userA.id)));
        // Re-running application schema initialization preserves recorded data.
        await db.pool.end();
        delete require.cache[require.resolve('../database_postgres')];
        db = require('../database_postgres');
        await db.ready;
        const saved = await db.get('SELECT COUNT(*) AS total FROM sensor_data WHERE tenant_id = ? AND device_id = ?', [String(userA.id), a1]);
        assert.equal(Number(saved.total), 2);
    } finally {
        await db.pool.end();
    }
});
