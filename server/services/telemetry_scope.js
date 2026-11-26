const crypto = require('node:crypto');

function failure(message, status = 400) {
    return Object.assign(new Error(message), { status });
}

async function accountDeviceScope(db, user, deviceId) {
    const device = String(deviceId || '').trim().toUpperCase();
    if (!user?.id) throw failure('Authentication required', 401);
    if (!device) throw failure('Select a paired device');
    const owner = await db.get(
        'SELECT user_id, paired_at FROM device_pairings WHERE device_id = ? AND user_id = ?',
        [device, user.id]
    );
    if (!owner) throw failure('Device is not paired with this account', 403);
    return { deviceId: device, tenantId: String(user.id), pairedAt: owner.paired_at || null };
}

function assertMeasurementOwnership(timing, pairedAt) {
    const pairedMs = pairedAt ? new Date(pairedAt).getTime() : NaN;
    if (timing.timestampSource === 'device' && Number.isFinite(pairedMs) && timing.measuredAt.getTime() < pairedMs) {
        throw failure('Measurement predates this device pairing', 403);
    }
}

function telemetryTime(payload, receivedAt = new Date()) {
    const raw = payload.measured_at ?? payload.timestamp;
    if (raw === undefined || raw === null || raw === '') {
        return { measuredAt: receivedAt, receivedAt, timestampSource: 'received' };
    }
    // Offset-free dates depend on the host timezone and cannot identify an instant.
    const parts = typeof raw === 'string' && raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/i);
    if (!parts) {
        throw failure('Sensor timestamp must be ISO 8601 with a timezone');
    }
    const [, year, month, day, hour, minute, second] = parts.map(Number);
    const civil = new Date(Date.UTC(year, month - 1, day));
    if (civil.getUTCFullYear() !== year || civil.getUTCMonth() !== month - 1 || civil.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) {
        throw failure('Invalid sensor measurement time');
    }
    const measuredAt = new Date(raw);
    if (!Number.isFinite(measuredAt.getTime()) || measuredAt.getTime() < Date.UTC(2000, 0, 1) || measuredAt.getTime() > receivedAt.getTime() + 300000) {
        throw failure('Invalid sensor measurement time');
    }
    return { measuredAt, receivedAt, timestampSource: 'device' };
}

function telemetryMessageId(payload) {
    const explicit = payload.msg_id ?? payload.msgId;
    if (explicit !== undefined && explicit !== null && explicit !== '') {
        const id = String(explicit);
        if (id.length > 128) throw failure('msg_id must not exceed 128 characters');
        return id;
    }
    // Without a device timestamp or message ID, repeats cannot be distinguished
    // from legitimate identical readings. Do not deduplicate those readings.
    const time = payload.measured_at ?? payload.timestamp;
    if (!time) return null;
    return crypto.createHash('sha256').update(JSON.stringify(
        Object.keys(payload).sort().map(key => [key, payload[key]])
    )).digest('hex');
}

function isDuplicateTelemetry(error) {
    const key = `${error?.constraint || ''} ${error?.message || ''}`.toLowerCase();
    return /uq_sensor_data_msg_id|uq_sensor_device_message|uq_tenant_device_sensor_ts/.test(key);
}

function telemetryRange(start, end) {
    const bound = (raw, last) => {
        if (!raw) return null;
        const text = String(raw).trim();
        const value = /^\d{4}-\d{2}-\d{2}$/.test(text)
            ? `${text}T${last ? '23:59:59.999' : '00:00:00.000'}+07:00`
            : text;
        return telemetryTime({ timestamp: value }, new Date('9999-01-01T00:00:00Z')).measuredAt.toISOString();
    };
    const startDate = bound(start, false);
    const endDate = bound(end, true);
    if (startDate && endDate && startDate > endDate) throw failure('startDate must not be after endDate');
    return { startDate, endDate };
}

module.exports = { accountDeviceScope, assertMeasurementOwnership, telemetryTime, telemetryMessageId, isDuplicateTelemetry, telemetryRange };
