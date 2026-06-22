const mqtt = require('mqtt');
const db = require('./database');

const MQTT_BROKER = process.env.MQTT_BROKER_URL || process.env.MQTT_BROKER || 'mqtts://862ddab18768410486982f71e1ac75bb.s1.eu.hivemq.cloud:8883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || 'GreenCropnat';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || 'GreenCropnat123456';
// Support both legacy topic and tenant-based topics
const TOPIC_LEGACY = 'smartfarm/sensors';
const TOPIC_TENANT_PATTERN = 'tenants/+/devices/+/sensors';
const ACCEPT_LEGACY_SENSOR_TOPIC = String(process.env.ACCEPT_LEGACY_SENSOR_TOPIC || 'false').toLowerCase() === 'true';
const SENSOR_DATA_SELECT_COLUMNS = [
    'id',
    'tenant_id',
    'device_id',
    'sensor_id',
    'pressure',
    'flow_rate',
    'ec_value',
    'pumps',
    'raw_payload',
    'source',
    'mqtt_topic',
    'ph_value',
    'temp_c',
    'wls1',
    'wls2',
    'float_alarm',
    'locked',
    'pump1_on',
    'pump2_on',
    'green_on',
    'red_on',
    'ph_ok',
    'start_button',
    'stop_button',
    'alarm_muted',
    'pairing_status',
    'active_tank',
    'is_on',
    'uptime_seconds',
    'timestamp'
].join(', ');

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

function firstDefined(...values) {
    return values.find((value) => value !== undefined && value !== null);
}

function asOptionalBool(value) {
    if (value === undefined || value === null || value === '') return null;
    return asBool(value);
}

function asOptionalNumber(value) {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function asOptionalText(value) {
    if (value === undefined || value === null) return null;
    const text = String(value).trim();
    return text || null;
}

function normalizeSensorColumnValues(payload) {
    return {
        ph_value: asOptionalNumber(firstDefined(payload.ph_value, payload.phValue, payload.ph)),
        temp_c: asOptionalNumber(firstDefined(payload.temp_c, payload.tempValue, payload.temperature)),
        wls1: asOptionalBool(firstDefined(payload.wls1, payload.WLS1)),
        wls2: asOptionalBool(firstDefined(payload.wls2, payload.WLS2)),
        float_alarm: asOptionalBool(firstDefined(payload.float_alarm, payload.floatAlarm, payload.float)),
        locked: asOptionalBool(firstDefined(payload.locked, payload.lock, payload.reed, payload.reed_switch)),
        pump1_on: asOptionalBool(firstDefined(payload.pump1_on, payload.pump1On)),
        pump2_on: asOptionalBool(firstDefined(payload.pump2_on, payload.pump2On)),
        green_on: asOptionalBool(firstDefined(payload.green_on, payload.greenOn)),
        red_on: asOptionalBool(firstDefined(payload.red_on, payload.redOn)),
        ph_ok: asOptionalBool(firstDefined(payload.ph_ok, payload.phOk)),
        start_button: asOptionalBool(firstDefined(payload.start_button, payload.startButton)),
        stop_button: asOptionalBool(firstDefined(payload.stop_button, payload.stopButton)),
        alarm_muted: asOptionalBool(firstDefined(payload.alarm_muted, payload.alarmMuted)),
        pairing_status: asOptionalText(firstDefined(payload.pairing_status, payload.pairingStatus)),
    };
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
    const numericKeys = ['pressure', 'flow_rate', 'flow', 'ec_value', 'ec', 'ph_value', 'phValue', 'ph', 'temp_c', 'tempValue', 'temperature'];
    const hasNumericSignal = numericKeys.some((key) => {
        if (payload[key] === undefined || payload[key] === null || payload[key] === '') return false;
        return Number.isFinite(asNumber(payload[key], Number.NaN));
    });
    const activeTank = payload.active_tank ?? payload.activeTank;
    const hasTankSignal = activeTank !== undefined &&
        activeTank !== null &&
        String(activeTank).trim() !== '' &&
        asNumber(activeTank, 0) > 0;
    const hasPumpSignal = normalizePumpsArray(payload.pumps).some(Boolean);
    const eventKeys = ['triggered', 'event', 'detected', 'changed'];
    const hasEventSignal = eventKeys.some((key) => asBool(payload[key]));
    const booleanKeys = ['wls1', 'wls2', 'float_alarm', 'floatAlarm', 'locked', 'lock', 'reed', 'reed_switch', 'pump1_on', 'pump1On', 'pump2_on', 'pump2On', 'green_on', 'greenOn', 'red_on', 'redOn', 'ph_ok', 'phOk', 'start_button', 'startButton', 'stop_button', 'stopButton', 'alarm_muted', 'alarmMuted'];
    const hasBooleanSignal = booleanKeys.some((key) => payload[key] !== undefined && payload[key] !== null && payload[key] !== '');
    return hasNumericSignal || hasTankSignal || hasPumpSignal || hasEventSignal || hasBooleanSignal || Boolean(asOptionalText(payload.pairing_status || payload.pairingStatus));
}

function isSensorTimestampUniqueError(error) {
    const message = String(error?.message || '').toLowerCase();
    const constraint = String(error?.constraint || '').toLowerCase();
    return (
        constraint.includes('uq_tenant_device_sensor_ts') ||
        message.includes('uq_tenant_device_sensor_ts') ||
        (message.includes('sensor_data.tenant_id') && message.includes('sensor_data.timestamp')) ||
        message.includes('tenant_id, device_id, sensor_id, timestamp')
    );
}

function sensorSignature(row) {
    if (!row) return '';
    return JSON.stringify({
        pressure: Number(asNumber(row.pressure, 0).toFixed(3)),
        flow_rate: Number(asNumber(row.flow_rate, 0).toFixed(3)),
        ec_value: Number(asNumber(row.ec_value, 0).toFixed(3)),
        ph_value: Number(asNumber(firstDefined(row.ph_value, row.phValue, row.ph), 0).toFixed(3)),
        temp_c: Number(asNumber(firstDefined(row.temp_c, row.tempValue, row.temperature), 0).toFixed(2)),
        pumps: normalizePumpsArray(row.pumps).map((item) => item ? 1 : 0),
        active_tank: row.active_tank ?? null,
        is_on: asBool(row.is_on),
        wls1: asBool(firstDefined(row.wls1, row.WLS1)),
        wls2: asBool(firstDefined(row.wls2, row.WLS2)),
        float_alarm: asBool(firstDefined(row.float_alarm, row.floatAlarm, row.float)),
        locked: asBool(firstDefined(row.locked, row.lock, row.reed, row.reed_switch)),
        pump1_on: asBool(firstDefined(row.pump1_on, row.pump1On)),
        pump2_on: asBool(firstDefined(row.pump2_on, row.pump2On)),
        green_on: asBool(firstDefined(row.green_on, row.greenOn)),
        red_on: asBool(firstDefined(row.red_on, row.redOn)),
        ph_ok: asBool(firstDefined(row.ph_ok, row.phOk)),
        start_button: asBool(firstDefined(row.start_button, row.startButton)),
        stop_button: asBool(firstDefined(row.stop_button, row.stopButton)),
        alarm_muted: asBool(firstDefined(row.alarm_muted, row.alarmMuted)),
        pairing_status: String(firstDefined(row.pairing_status, row.pairingStatus, '') || '')
    });
}

function enrichSensorLikeRow(row) {
    if (!row || !row.raw_payload) return row;
    try {
        const raw = typeof row.raw_payload === 'string' ? JSON.parse(row.raw_payload) : row.raw_payload;
        if (!raw || typeof raw !== 'object') return row;
        return {
            ...row,
            ph_value: firstDefined(row.ph_value, raw.ph_value, raw.phValue, raw.ph),
            temp_c: firstDefined(row.temp_c, raw.temp_c, raw.tempValue, raw.temperature),
            wls1: firstDefined(row.wls1, raw.wls1, raw.WLS1),
            wls2: firstDefined(row.wls2, raw.wls2, raw.WLS2),
            float_alarm: firstDefined(row.float_alarm, raw.float_alarm, raw.floatAlarm, raw.float),
            locked: firstDefined(row.locked, raw.locked, raw.lock, raw.reed, raw.reed_switch),
            pump1_on: firstDefined(row.pump1_on, raw.pump1_on, raw.pump1On),
            pump2_on: firstDefined(row.pump2_on, raw.pump2_on, raw.pump2On),
            green_on: firstDefined(row.green_on, raw.green_on, raw.greenOn),
            red_on: firstDefined(row.red_on, raw.red_on, raw.redOn),
            ph_ok: firstDefined(row.ph_ok, raw.ph_ok, raw.phOk),
            start_button: firstDefined(row.start_button, raw.start_button, raw.startButton),
            stop_button: firstDefined(row.stop_button, raw.stop_button, raw.stopButton),
            alarm_muted: firstDefined(row.alarm_muted, raw.alarm_muted, raw.alarmMuted),
            pairing_status: firstDefined(row.pairing_status, raw.pairing_status, raw.pairingStatus),
        };
    } catch (_) {
        return row;
    }
}

function startMqttListener() {
    console.log(`[MQTT] Connecting to ${MQTT_BROKER}...`);
    client = mqtt.connect(MQTT_BROKER, {
        clientId: `smartfarm_backend_${Math.random().toString(16).substr(2, 8)}`,
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD,
    });

    client.on('connect', () => {
        console.log('[MQTT] Connected to Broker');

        const subscriptions = ACCEPT_LEGACY_SENSOR_TOPIC
            ? [TOPIC_LEGACY, TOPIC_TENANT_PATTERN]
            : [TOPIC_TENANT_PATTERN];

        client.subscribe(subscriptions, (err, granted) => {
            if (!err) {
                console.log(`[MQTT] Subscribed to ${subscriptions.join(', ')}`);
            } else {
                console.error('[MQTT] Subscription error:', err);
            }
        });
    });

    client.on('message', async (topic, message) => {
        // Normalize topic parsing: tenant-based topics: tenants/{tenant}/devices/{device}/sensors
        try {
            if (topic === TOPIC_LEGACY && !ACCEPT_LEGACY_SENSOR_TOPIC) {
                console.warn(`[MQTT] Ignored legacy public topic ${TOPIC_LEGACY}. Set ACCEPT_LEGACY_SENSOR_TOPIC=true only for local testing.`);
                return;
            }

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
            const sensorColumns = normalizeSensorColumnValues(payload);

            // Pumps array handling
            const pumpsJson = normalizePumpsJson(payload.pumps);

            // Obtain device_id and sensor_id from payload if not from topic
            const payloadDeviceId = payload.device_id || payload.device || deviceId || null;
            const payloadSensorId = payload.sensor_id || payload.sensor || null;
            const finalTenant = tenantId || payload.tenant_id || payload.tenant || 'public';

            // Insert into Database (include tenant/device/sensor, raw payload and optional msg_id for idempotency)
            try {
                const rawPayload = {
                    ...payload,
                    source: 'mqtt',
                    mqtt_topic: topic,
                };
                const raw = JSON.stringify(rawPayload);
                const msgId = payload.msg_id || payload.msgId || payload.id || null;
                const latest = await db.get(
                    `SELECT TOP 1 ${SENSOR_DATA_SELECT_COLUMNS}
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
                    is_on,
                    ...sensorColumns
                };
                const insertSql =
                    `INSERT INTO sensor_data 
                    (tenant_id, device_id, sensor_id, msg_id, pressure, flow_rate, ec_value, pumps, raw_payload, source, mqtt_topic, ph_value, temp_c, wls1, wls2, float_alarm, locked, pump1_on, pump2_on, green_on, red_on, ph_ok, start_button, stop_button, alarm_muted, pairing_status, active_tank, is_on, uptime_seconds, timestamp) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                const nowMs = Date.now();
                const insertParams = [
                    finalTenant,
                    payloadDeviceId,
                    payloadSensorId,
                    msgId,
                    pressure,
                    flow_rate,
                    ec_value,
                    pumpsJson,
                    raw,
                    'mqtt',
                    topic,
                    sensorColumns.ph_value,
                    sensorColumns.temp_c,
                    sensorColumns.wls1,
                    sensorColumns.wls2,
                    sensorColumns.float_alarm,
                    sensorColumns.locked,
                    sensorColumns.pump1_on,
                    sensorColumns.pump2_on,
                    sensorColumns.green_on,
                    sensorColumns.red_on,
                    sensorColumns.ph_ok,
                    sensorColumns.start_button,
                    sensorColumns.stop_button,
                    sensorColumns.alarm_muted,
                    sensorColumns.pairing_status,
                    active_tank,
                    is_on,
                    Number.isFinite(uptime_seconds) ? uptime_seconds : 0,
                    new Date(nowMs),
                ];

                for (let attempt = 0; attempt < 5; attempt += 1) {
                    try {
                        insertParams[29] = new Date(nowMs + attempt);
                        await db.run(insertSql, insertParams);
                        break;
                    } catch (insertErr) {
                        if (attempt < 4 && isSensorTimestampUniqueError(insertErr)) continue;
                        throw insertErr;
                    }
                }
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
