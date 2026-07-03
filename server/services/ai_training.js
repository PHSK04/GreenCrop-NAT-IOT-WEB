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

function parseRawPayload(row) {
    if (!row?.raw_payload) return null;
    try {
        const parsed = typeof row.raw_payload === 'string' ? JSON.parse(row.raw_payload) : row.raw_payload;
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
        return null;
    }
}

function enrichedSensorRow(row) {
    const raw = parseRawPayload(row) || {};
    return {
        ...row,
        ph_value: firstDefined(row?.ph_value, raw.ph_value, raw.phValue, raw.ph),
        ec_value: firstDefined(row?.ec_value, raw.ec_value, raw.ecValue, raw.ec),
        temp_c: firstDefined(row?.temp_c, raw.temp_c, raw.tempValue, raw.temperature),
        pressure: firstDefined(row?.pressure, raw.pressure),
        flow_rate: firstDefined(row?.flow_rate, raw.flow_rate, raw.flow),
        wls1: firstDefined(row?.wls1, raw.wls1, raw.WLS1),
        wls2: firstDefined(row?.wls2, raw.wls2, raw.WLS2),
        float_alarm: firstDefined(row?.float_alarm, raw.float_alarm, raw.floatAlarm, raw.float),
        locked: firstDefined(row?.locked, raw.locked, raw.lock, raw.reed, raw.reed_switch),
        pump1_on: firstDefined(row?.pump1_on, raw.pump1_on, raw.pump1On),
        pump2_on: firstDefined(row?.pump2_on, raw.pump2_on, raw.pump2On),
        green_on: firstDefined(row?.green_on, raw.green_on, raw.greenOn),
        red_on: firstDefined(row?.red_on, raw.red_on, raw.redOn),
        ph_ok: firstDefined(row?.ph_ok, raw.ph_ok, raw.phOk),
        is_on: firstDefined(row?.is_on, raw.is_on, raw.isOn),
        uptime_seconds: firstDefined(row?.uptime_seconds, raw.uptime_seconds, raw.uptimeSeconds),
    };
}

function classifySample(row) {
    const ph = asNumber(row.ph_value, 0);
    const ec = asNumber(row.ec_value, 0);
    const temp = asNumber(row.temp_c, 0);
    const locked = asBool(row.locked);
    const redOn = asBool(row.red_on);
    const floatAlarm = asBool(row.float_alarm);
    const pump2On = asBool(row.pump2_on);
    const wls2 = asBool(row.wls2);

    if (locked || redOn || floatAlarm || (pump2On && wls2)) {
        return { label: 'critical', riskScore: 95, action: 'stop_and_inspect' };
    }
    if ((ph > 0 && (ph < 5.8 || ph > 8.2)) || (ec > 0 && (ec < 0.25 || ec > 3.5)) || (temp > 0 && (temp < 15 || temp > 38))) {
        return { label: 'critical', riskScore: 88, action: 'inspect_water_quality' };
    }
    if ((ph > 0 && (ph < 6.5 || ph > 7.5)) || (ec > 0 && (ec < 0.8 || ec > 2.4)) || (temp > 0 && (temp < 20 || temp > 32))) {
        return { label: 'warning', riskScore: 62, action: 'review_sensor_values' };
    }
    if (!ph && !ec && !temp) {
        return { label: 'learning', riskScore: 35, action: 'collect_more_data' };
    }
    return { label: 'normal', riskScore: 12, action: 'monitor' };
}

function buildFeatures(row) {
    const pumps = normalizePumpsArray(row.pumps);
    return {
        pressure: asNumber(row.pressure, 0),
        flow_rate: asNumber(row.flow_rate, 0),
        ec_value: asNumber(row.ec_value, 0),
        ph_value: asNumber(row.ph_value, 0),
        temp_c: asNumber(row.temp_c, 0),
        wls1: asBool(row.wls1) ? 1 : 0,
        wls2: asBool(row.wls2) ? 1 : 0,
        float_alarm: asBool(row.float_alarm) ? 1 : 0,
        locked: asBool(row.locked) ? 1 : 0,
        pump1_on: asBool(row.pump1_on) ? 1 : 0,
        pump2_on: asBool(row.pump2_on) ? 1 : 0,
        green_on: asBool(row.green_on) ? 1 : 0,
        red_on: asBool(row.red_on) ? 1 : 0,
        ph_ok: asBool(row.ph_ok) ? 1 : 0,
        is_on: asBool(row.is_on) ? 1 : 0,
        active_tank: asNumber(row.active_tank, 0),
        uptime_seconds: asNumber(row.uptime_seconds, 0),
        pump_count: pumps.filter(Boolean).length,
    };
}

async function resolveUserId(db, tenantId, deviceId, explicitUserId) {
    if (explicitUserId !== undefined && explicitUserId !== null && explicitUserId !== '') {
        const parsed = Number(explicitUserId);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    const tenantAsNumber = Number(tenantId);
    if (Number.isFinite(tenantAsNumber) && tenantAsNumber > 0) return tenantAsNumber;

    const normalizedDeviceId = String(deviceId || '').trim().toUpperCase();
    if (!normalizedDeviceId) return null;

    const pairing = await db.get(
        `SELECT TOP 1 user_id
         FROM device_pairings
         WHERE device_id = ?
         ORDER BY is_primary DESC, paired_at DESC, id DESC`,
        [normalizedDeviceId]
    ).catch(() => null);

    const parsed = Number(pairing?.user_id);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function recordAiSensorSample(db, options = {}) {
    const tenantId = String(options.tenantId || options.sensorRow?.tenant_id || '').trim();
    if (!tenantId) return null;

    const row = enrichedSensorRow(options.sensorRow || {});
    const deviceId = String(options.deviceId || row.device_id || '').trim().toUpperCase() || null;
    const userId = await resolveUserId(db, tenantId, deviceId, options.userId);
    const classification = classifySample(row);
    const features = buildFeatures(row);
    const timestamp = row.timestamp || options.timestamp || new Date();
    const featureJson = JSON.stringify(features);

    try {
        const result = await db.run(
            `INSERT INTO ai_sensor_samples (
                tenant_id, user_id, device_id, sensor_data_id, sample_source,
                feature_json, label, risk_score, action_hint, captured_at, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId,
                userId,
                deviceId,
                options.sensorDataId || row.id || null,
                options.source || row.source || 'sensor',
                featureJson,
                classification.label,
                classification.riskScore,
                classification.action,
                timestamp,
                new Date(),
            ]
        );
        return { id: result.id, ...classification, features };
    } catch (err) {
        const message = String(err?.message || '').toLowerCase();
        if (message.includes('unique') || message.includes('duplicate')) return null;
        console.warn('[AI] Failed to record sensor sample:', err.message);
        return null;
    }
}

async function getTenantLearningSummary(db, { tenantId, deviceId, limit = 200 } = {}) {
    const safeLimit = Math.max(1, Math.min(1000, Number(limit) || 200));
    const where = ['tenant_id = ?'];
    const params = [String(tenantId || '')];
    const normalizedDeviceId = String(deviceId || '').trim().toUpperCase();
    if (normalizedDeviceId) {
        where.push('(device_id = ? OR device_id IS NULL)');
        params.push(normalizedDeviceId);
    }

    const [totalRow, latestRows, labelRows] = await Promise.all([
        db.get(`SELECT COUNT(*) AS total FROM ai_sensor_samples WHERE ${where.join(' AND ')}`, params),
        db.all(
            `SELECT TOP ${safeLimit} id, tenant_id, user_id, device_id, sensor_data_id, sample_source, feature_json, label, risk_score, action_hint, captured_at, created_at
             FROM ai_sensor_samples
             WHERE ${where.join(' AND ')}
             ORDER BY captured_at DESC, id DESC`,
            params
        ),
        db.all(
            `SELECT label, COUNT(*) AS total
             FROM ai_sensor_samples
             WHERE ${where.join(' AND ')}
             GROUP BY label`,
            params
        ),
    ]);

    return {
        tenant_id: String(tenantId || ''),
        device_id: normalizedDeviceId || null,
        total_samples: Number(totalRow?.total || 0),
        labels: labelRows.reduce((acc, row) => {
            acc[row.label || 'unknown'] = Number(row.total || 0);
            return acc;
        }, {}),
        samples: latestRows.map((row) => ({
            ...row,
            feature_json: typeof row.feature_json === 'string' ? row.feature_json : JSON.stringify(row.feature_json || {}),
        })),
    };
}

async function backfillTenantSensorSamples(db, { tenantId, userId, deviceId, limit = 500 } = {}) {
    const safeLimit = Math.max(1, Math.min(5000, Number(limit) || 500));
    const where = ['tenant_id = ?'];
    const params = [String(tenantId || '')];
    const normalizedDeviceId = String(deviceId || '').trim().toUpperCase();
    if (normalizedDeviceId) {
        where.push('(device_id = ? OR device_id IS NULL)');
        params.push(normalizedDeviceId);
    }

    const rows = await db.all(
        `SELECT TOP ${safeLimit} id, tenant_id, device_id, sensor_id, pressure, flow_rate, ec_value, pumps,
                raw_payload, source, ph_value, temp_c, wls1, wls2, float_alarm, locked,
                pump1_on, pump2_on, green_on, red_on, ph_ok, active_tank, is_on,
                uptime_seconds, timestamp
         FROM sensor_data
         WHERE ${where.join(' AND ')}
         ORDER BY timestamp DESC, id DESC`,
        params
    );

    let captured = 0;
    for (const row of rows.reverse()) {
        const result = await recordAiSensorSample(db, {
            tenantId,
            userId,
            deviceId: row.device_id || normalizedDeviceId,
            sensorDataId: row.id,
            source: row.source || 'backfill',
            sensorRow: row,
        });
        if (result) captured += 1;
    }
    return { scanned: rows.length, captured };
}

module.exports = {
    backfillTenantSensorSamples,
    buildFeatures,
    classifySample,
    getTenantLearningSummary,
    recordAiSensorSample,
};
