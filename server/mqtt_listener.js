const mqtt = require('mqtt');
const db = require('./database');

const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883'; // Standard TCP Port for Node.js backend
// Support both legacy topic and tenant-based topics
const TOPIC_LEGACY = 'smartfarm/sensors';
const TOPIC_TENANT_PATTERN = 'tenants/+/devices/+/sensors';

let client;

function asBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const v = String(value ?? '').toLowerCase().trim();
    return v === '1' || v === 'true' || v === 'on';
}

function asNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePumpsArray(value) {
    if (Array.isArray(value)) return value.map((item) => asBool(item));
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed.map((item) => asBool(item)) : [];
        } catch (_) {
            return [];
        }
    }
    return [];
}

function normalizePumpsJson(value) {
    return JSON.stringify(normalizePumpsArray(value).map((item) => item ? 1 : 0));
}

function hasMeaningfulSensorSignal(payload) {
    const numericKeys = ['pressure', 'flow_rate', 'flow', 'ec_value', 'ec'];
    const hasNumericSignal = numericKeys.some((key) => {
        if (payload[key] === undefined || payload[key] === null || payload[key] === '') return false;
        return Math.abs(asNumber(payload[key], 0)) > 0;
    });
    const activeTank = payload.active_tank ?? payload.activeTank;
    const hasTankSignal = activeTank !== undefined &&
        activeTank !== null &&
        String(activeTank).trim() !== '' &&
        asNumber(activeTank, 0) > 0;
    const hasPumpSignal = normalizePumpsArray(payload.pumps).some(Boolean);
    const eventKeys = ['triggered', 'event', 'detected', 'changed'];
    const hasEventSignal = eventKeys.some((key) => asBool(payload[key]));
    return hasNumericSignal || hasTankSignal || hasPumpSignal || hasEventSignal;
}

function sensorSignature(row) {
    if (!row) return '';
    return JSON.stringify({
        pressure: Number(asNumber(row.pressure, 0).toFixed(3)),
        flow_rate: Number(asNumber(row.flow_rate, 0).toFixed(3)),
        ec_value: Number(asNumber(row.ec_value, 0).toFixed(3)),
        pumps: normalizePumpsArray(row.pumps).map((item) => item ? 1 : 0),
        active_tank: row.active_tank ?? null,
        is_on: asBool(row.is_on)
    });
}

function startMqttListener() {
    console.log(`[MQTT] Connecting to ${MQTT_BROKER}...`);
    client = mqtt.connect(MQTT_BROKER, {
        clientId: `smartfarm_backend_${Math.random().toString(16).substr(2, 8)}`,
    });

    client.on('connect', () => {
        console.log('[MQTT] Connected to Broker');
        
        client.subscribe([TOPIC_LEGACY, TOPIC_TENANT_PATTERN], (err, granted) => {
            if (!err) {
                console.log(`[MQTT] Subscribed to ${TOPIC_LEGACY} and ${TOPIC_TENANT_PATTERN}`);
            } else {
                console.error('[MQTT] Subscription error:', err);
            }
        });
    });

    client.on('message', async (topic, message) => {
        // Normalize topic parsing: tenant-based topics: tenants/{tenant}/devices/{device}/sensors
        try {
            const segments = topic.split('/');
            let tenantId = null;
            let deviceId = null;
            if (segments[0] === 'tenants' && segments[2] === 'devices') {
                tenantId = segments[1];
                deviceId = segments[3];
            }

            const payload = JSON.parse(message.toString());
            console.log(`[MQTT] Received data on ${topic}:`, payload);

            if (!hasMeaningfulSensorSignal(payload)) {
                console.log(`[MQTT] Suppressed empty/no-trigger payload on ${topic}`);
                return;
            }

            // Extract data
            const pressure = asNumber(payload.pressure, 0);
            const flow_rate = asNumber(payload.flow ?? payload.flow_rate, 0);
            const ec_value = asNumber(payload.ec ?? payload.ec_value, 0);
            const hasIsOn = payload.isOn !== undefined || payload.is_on !== undefined;
            const hasUptime = payload.uptime_seconds !== undefined || payload.uptimeSeconds !== undefined;
            const active_tank = payload.activeTank ?? payload.active_tank ?? null;

            // Pumps array handling
            const pumpsJson = normalizePumpsJson(payload.pumps);

            // Obtain device_id and sensor_id from payload if not from topic
            const payloadDeviceId = payload.device_id || payload.device || deviceId || null;
            const payloadSensorId = payload.sensor_id || payload.sensor || null;
            const finalTenant = tenantId || payload.tenant_id || payload.tenant || 'public';

            // Insert into Database (include tenant/device/sensor, raw payload and optional msg_id for idempotency)
            try {
                const raw = message.toString();
                const msgId = payload.msg_id || payload.msgId || payload.id || null;
                const latest = await db.get(
                    `SELECT TOP 1 is_on, uptime_seconds, pressure, flow_rate, ec_value, pumps, active_tank, timestamp
                     FROM sensor_data
                     WHERE tenant_id = ?${payloadDeviceId ? ' AND device_id = ?' : ''}
                     ORDER BY id DESC`,
                    payloadDeviceId ? [finalTenant, payloadDeviceId] : [finalTenant]
                );

                const is_on = hasIsOn
                    ? Boolean(payload.isOn !== undefined ? payload.isOn : payload.is_on)
                    : Boolean(latest?.is_on ?? false);
                const uptime_seconds = hasUptime
                    ? Number(payload.uptime_seconds ?? payload.uptimeSeconds ?? 0)
                    : Number(latest?.uptime_seconds ?? 0);

                const nextRow = {
                    pressure,
                    flow_rate,
                    ec_value,
                    pumps: pumpsJson,
                    active_tank,
                    is_on
                };
                const latestTsMs = latest?.timestamp ? new Date(latest.timestamp).getTime() : 0;
                if (
                    latest &&
                    sensorSignature(latest) === sensorSignature(nextRow) &&
                    Number.isFinite(latestTsMs) &&
                    latestTsMs > 0 &&
                    (Date.now() - latestTsMs) <= 30000
                ) {
                    console.log(`[MQTT] Suppressed duplicate sensor state for tenant=${finalTenant} device=${payloadDeviceId || 'none'}`);
                    return;
                }

                await db.run(
                    `INSERT INTO sensor_data 
                    (tenant_id, device_id, sensor_id, msg_id, pressure, flow_rate, ec_value, pumps, raw_payload, active_tank, is_on, uptime_seconds, timestamp) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [finalTenant, payloadDeviceId, payloadSensorId, msgId, pressure, flow_rate, ec_value, pumpsJson, raw, active_tank, is_on, Number.isFinite(uptime_seconds) ? uptime_seconds : 0]
                );
                console.log(`[DB] Saved sensor data for tenant=${finalTenant} device=${payloadDeviceId} msg_id=${msgId || 'none'}`);
            } catch (dbErr) {
                console.error('[DB] Failed to save sensor data:', dbErr);
            }

        } catch (err) {
            console.error('[MQTT] Failed to process message:', err);
        }
    });

    client.on('error', (err) => {
        console.error('[MQTT] Connection error:', err);
    });
}

module.exports = { startMqttListener };
