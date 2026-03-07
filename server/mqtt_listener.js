const mqtt = require('mqtt');
const db = require('./database_mssql');

const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883'; // Standard TCP Port for Node.js backend
// Support both legacy topic and tenant-based topics
const TOPIC_LEGACY = 'smartfarm/sensors';
const TOPIC_TENANT_PATTERN = 'tenants/+/devices/+/sensors';

let client;

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

            // Extract data
            const pressure = payload.pressure || 0;
            const flow_rate = payload.flow || payload.flow_rate || 0;
            const ec_value = payload.ec || payload.ec_value || 0;
            const is_on = payload.isOn !== undefined ? (payload.isOn ? 1 : 0) : (payload.is_on ? (payload.is_on ? 1 : 0) : 0);
            const active_tank = payload.activeTank || payload.active_tank || null;

            // Pumps array handling
            let pumpsJson = "[]";
            if (payload.pumps && Array.isArray(payload.pumps)) {
                const pumpStates = payload.pumps.map(p => p ? 1 : 0);
                pumpsJson = JSON.stringify(pumpStates);
            }

            // Obtain device_id and sensor_id from payload if not from topic
            const payloadDeviceId = payload.device_id || payload.device || deviceId || null;
            const payloadSensorId = payload.sensor_id || payload.sensor || null;
            const finalTenant = tenantId || payload.tenant_id || payload.tenant || 'public';

            // Insert into Database (include tenant/device/sensor, raw payload and optional msg_id for idempotency)
            try {
                const raw = message.toString();
                const msgId = payload.msg_id || payload.msgId || payload.id || null;

                await db.run(
                    `INSERT INTO sensor_data 
                    (tenant_id, device_id, sensor_id, msg_id, pressure, flow_rate, ec_value, pumps, raw_payload, active_tank, is_on, timestamp) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE())`,
                    [finalTenant, payloadDeviceId, payloadSensorId, msgId, pressure, flow_rate, ec_value, pumpsJson, raw, active_tank, is_on]
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
