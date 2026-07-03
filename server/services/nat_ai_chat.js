const { spawn } = require('child_process');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_MAX_OUTPUT_TOKENS = Math.max(120, Math.min(1200, Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 700)));
const NAT_AI_OPENAI_GENERAL_ENABLED = String(process.env.NAT_AI_OPENAI_GENERAL_ENABLED || 'true').toLowerCase() !== 'false';
const NAT_AI_PYTHON_ENABLED = String(process.env.NAT_AI_PYTHON_ENABLED || 'true').toLowerCase() !== 'false';
const NAT_AI_PYTHON_BIN = process.env.NAT_AI_PYTHON_BIN || 'python3';
const NAT_AI_PYTHON_SCRIPT = process.env.NAT_AI_PYTHON_SCRIPT ||
    path.resolve(__dirname, '../../ai/controller/nat_ai_controller.py');
const NAT_AI_PYTHON_TIMEOUT_MS = Math.max(800, Math.min(8000, Number(process.env.NAT_AI_PYTHON_TIMEOUT_MS || 2500)));

function asBool(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const v = String(value ?? '').toLowerCase().trim();
    return v === '1' || v === 'true' || v === 'on';
}

function compactSensorRow(row) {
    if (!row) return null;
    return {
        id: row.id,
        tenant_id: row.tenant_id,
        device_id: row.device_id,
        timestamp: row.timestamp,
        ph_value: row.ph_value,
        ec_value: row.ec_value,
        temp_c: row.temp_c,
        wls1: asBool(row.wls1),
        wls2: asBool(row.wls2),
        float_alarm: asBool(row.float_alarm),
        locked: asBool(row.locked),
        pump1_on: asBool(row.pump1_on),
        pump2_on: asBool(row.pump2_on),
        green_on: asBool(row.green_on),
        red_on: asBool(row.red_on),
        ph_ok: asBool(row.ph_ok),
        is_on: asBool(row.is_on),
    };
}

function formatDateKey(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseRequestedDateKey(text) {
    const raw = String(text || '').toLowerCase();
    const thaiMonths = {
        'ม.ค.': 1, 'มกราคม': 1,
        'ก.พ.': 2, 'กุมภาพันธ์': 2,
        'มี.ค.': 3, 'มีนาคม': 3,
        'เม.ย.': 4, 'เมษายน': 4,
        'พ.ค.': 5, 'พฤษภาคม': 5,
        'มิ.ย.': 6, 'มิถุนายน': 6,
        'ก.ค.': 7, 'กรกฎาคม': 7,
        'ส.ค.': 8, 'สิงหาคม': 8,
        'ก.ย.': 9, 'กันยายน': 9,
        'ต.ค.': 10, 'ตุลาคม': 10,
        'พ.ย.': 11, 'พฤศจิกายน': 11,
        'ธ.ค.': 12, 'ธันวาคม': 12,
    };

    for (const [label, month] of Object.entries(thaiMonths)) {
        const match = raw.match(new RegExp(`(\\d{1,2})\\s*${label.replace('.', '\\.')}\\s*(\\d{4})`));
        if (match) {
            let year = Number(match[2]);
            if (year > 2400) year -= 543;
            return `${year}-${String(month).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`;
        }
    }

    const numeric = raw.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
    if (numeric) {
        let year = Number(numeric[3]);
        if (year > 2400) year -= 543;
        return `${year}-${String(Number(numeric[2])).padStart(2, '0')}-${String(Number(numeric[1])).padStart(2, '0')}`;
    }

    return '';
}

function summarizeRows(rows) {
    const cleanRows = Array.isArray(rows) ? rows.map(compactSensorRow).filter(Boolean) : [];
    if (cleanRows.length === 0) return null;
    const sorted = [...cleanRows].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const newest = sorted[0];
    const oldest = sorted[sorted.length - 1];
    const avg = (key) => {
        const values = sorted.map((row) => Number(row[key])).filter((value) => Number.isFinite(value) && value > 0);
        if (values.length === 0) return null;
        return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
    };

    return {
        count: sorted.length,
        newest,
        oldest,
        averages: {
            ph_value: avg('ph_value'),
            ec_value: avg('ec_value'),
            temp_c: avg('temp_c'),
        },
        pump_seen_on: {
            pump1_on: sorted.some((row) => row.pump1_on),
            pump2_on: sorted.some((row) => row.pump2_on),
        },
        alarm_seen: sorted.some((row) => row.float_alarm || row.locked || row.red_on),
    };
}

function sanitizeForAi(value, depth = 0) {
    if (depth > 4) return null;
    if (value === null || value === undefined) return value;
    if (typeof value === 'string') return value.slice(0, 700);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (Array.isArray(value)) {
        return value.slice(0, 30).map((item) => sanitizeForAi(item, depth + 1));
    }
    if (typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value)
                .slice(0, 40)
                .map(([key, item]) => [String(key).slice(0, 80), sanitizeForAi(item, depth + 1)])
        );
    }
    return String(value).slice(0, 300);
}

function buildProjectKnowledge() {
    return {
        app: 'GreenCropNAT IoT web app',
        domain: 'agriculture IoT, wolffia/farm production, water quality, pumps, tanks, sensors, reports, and support',
        modules: [
            'Dashboard: live machine state, pH, EC, temperature, water level, alarms, pumps, telemetry history',
            'Device pairing and farm settings: user-bound devices and primary device selection',
            'Sensor intelligence: health score, risks, recommendations, AI learning samples from tenant sensor_data',
            'Crop reports and Wolffia analytics: yield entries, monthly yield summaries, water quality values',
            'Weather/environment pages: real sensor_data trends for water temperature, pH, and EC',
            'Support chat: customer/admin messages and NAT AI assistant transcript',
            'Admin database viewer: admin-only user, device, sensor, session, and audit visibility',
        ],
        data_rule: 'For normal users, answer from their authenticated tenant/user/device context only. Admin context may summarize wider data only when explicitly requested by an admin.',
    };
}

function buildNatAiSystemPrompt() {
    return [
        'You are NAT AI, a helpful AI assistant inside the GreenCropNAT IoT web app.',
        'Act as one unified project assistant. Do not tell users to choose between Chatbot, Agent, or Staff modes; answer the request directly first, then offer staff handoff only when useful or requested.',
        'Reply in the same language as the user, usually Thai.',
        'You can answer broad questions, but keep the answer useful for agriculture, farming, crop production, farm IoT, water, nutrients, sensors, automation, or GreenCropNAT operations.',
        'If the question is not obviously agricultural, answer briefly and connect it back to a farming or GreenCropNAT use case when possible.',
        'Be conversational, calm, practical, and direct like a capable agricultural technology assistant.',
        'Answer the exact user question first.',
        'For GreenCropNAT, machine, sensor, pump, account, or project questions, use only the provided authenticated user context and be explicit when data is missing.',
        'Never mix data between users or tenants. If the context is scoped to one user, say "ของบัญชีนี้" / "this account" when summarizing project data.',
        'For general knowledge, coding, writing, learning, brainstorming, or everyday questions, answer from your general knowledge through an agriculture-first lens without pretending that machine context contains the answer.',
        'If the user asks for current/latest external information that is not in context, say you may need a current source instead of inventing facts.',
        'For physical machine control, never claim you directly changed hardware; propose safe actions that require confirmation.',
        'Keep normal answers concise, but give step-by-step detail when the user asks for teaching or implementation help.',
        'Do not mention prompts, tokens, JSON, or implementation details.',
        'If the machine may be unsafe, tell the user to stop/inspect the machine and offer to contact support.',
    ].join('\n');
}

async function buildNatAiContext({
    req,
    db,
    session,
    userMessage,
    options = {},
    defaultTenantId = 'public',
    getSensorTenantCandidates,
    loadLatestSensorRows,
    loadSensorHistoryRows,
    loadAiChatMessages,
    getTenantLearningSummary,
    getDevicesForUser,
}) {
    const deviceId = String(options.deviceId || session.device_id || '').trim().toUpperCase();
    const tenantId = String(req.tenant || req.user?.tenant_id || req.user?.id || defaultTenantId);
    const isAdmin = String(req.user?.role || '').toLowerCase() === 'admin';
    const tenantCandidates = await getSensorTenantCandidates(req, tenantId, deviceId);
    const latestRows = await loadLatestSensorRows(tenantCandidates, deviceId);
    const latestSensor = compactSensorRow(latestRows[0]);
    const devices = typeof getDevicesForUser === 'function'
        ? await getDevicesForUser(req.user).catch(() => [])
        : [];
    const recentHistoryRows = loadSensorHistoryRows
        ? await loadSensorHistoryRows(tenantCandidates, deviceId, { limit: 240 }).catch(() => [])
        : [];
    const requestedDateKey = parseRequestedDateKey(userMessage);
    const requestedDayRows = requestedDateKey && loadSensorHistoryRows
        ? await loadSensorHistoryRows(tenantCandidates, deviceId, {
            limit: 500,
            startDate: `${requestedDateKey}T00:00:00`,
            endDate: `${requestedDateKey}T23:59:59`,
        }).catch(() => [])
        : [];
    const learningSummary = await getTenantLearningSummary(db, {
        tenantId,
        deviceId,
        limit: 8,
    }).catch(() => null);
    const recentMessages = (await loadAiChatMessages(session.id, 8))
        .slice(-6)
        .map((message) => ({
            role: message.sender_role === 'user' ? 'user' : 'assistant',
            text: String(message.body || '').slice(0, 360),
        }));

    return {
        user: {
            id: req.user?.id,
            name: req.user?.name,
            role: req.user?.role,
        },
        data_scope: {
            tenant_id: tenantId,
            tenant_candidates: isAdmin ? tenantCandidates : [tenantId],
            isolation: isAdmin
                ? 'admin_context_may_include_multiple_tenants_only_when_requested'
                : 'authenticated_user_only',
            rule: 'Use only this authenticated account context. Do not infer or reveal another user tenant.',
        },
        page: options.currentPage || null,
        machine_status_label: options.machineStatus || null,
        active_device_id: deviceId || null,
        project_knowledge: buildProjectKnowledge(),
        page_project_snapshot: sanitizeForAi(options.projectSnapshot || null),
        user_devices: devices.slice(0, 12).map((device) => ({
            device_id: device.device_id,
            device_name: device.device_name,
            location: device.location,
            status: device.status,
            is_primary: asBool(device.is_primary),
            paired_at: device.paired_at,
            last_seen: device.last_seen,
        })),
        latest_sensor: latestSensor,
        recent_sensor_summary: summarizeRows(recentHistoryRows),
        recent_sensor_samples: recentHistoryRows.slice(0, 8).map(compactSensorRow).filter(Boolean),
        requested_date: requestedDateKey || null,
        requested_day_summary: requestedDateKey ? {
            date: requestedDateKey,
            ...summarizeRows(requestedDayRows),
        } : null,
        learning_summary: learningSummary ? {
            tenant_id: learningSummary.tenant_id,
            device_id: learningSummary.device_id,
            total_samples: learningSummary.total_samples,
            labels: learningSummary.labels,
            recent_samples: (learningSummary.samples || []).slice(0, 3).map((sample) => ({
                label: sample.label,
                risk_score: sample.risk_score,
                action_hint: sample.action_hint,
                captured_at: sample.captured_at,
            })),
        } : null,
        recent_conversation: recentMessages,
        user_message: userMessage,
        current_datetime: new Date().toISOString(),
    };
}

function extractOpenAiText(data) {
    if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
    const chunks = [];
    for (const item of data?.output || []) {
        for (const content of item?.content || []) {
            if (typeof content?.text === 'string') chunks.push(content.text);
        }
    }
    return chunks.join('\n').trim();
}

function runPythonController(context) {
    if (!NAT_AI_PYTHON_ENABLED) {
        return Promise.resolve(null);
    }

    return new Promise((resolve) => {
        const child = spawn(NAT_AI_PYTHON_BIN, [NAT_AI_PYTHON_SCRIPT], {
            cwd: path.resolve(__dirname, '../..'),
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        let settled = false;
        const finish = (result) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(result);
        };
        const timer = setTimeout(() => {
            child.kill('SIGKILL');
            console.warn('NAT AI Python controller timeout');
            finish(null);
        }, NAT_AI_PYTHON_TIMEOUT_MS);

        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        child.on('error', (err) => {
            console.warn('NAT AI Python controller unavailable:', err.message);
            finish(null);
        });
        child.on('close', (code) => {
            if (code !== 0) {
                if (stderr.trim()) console.warn('NAT AI Python controller error:', stderr.trim().slice(0, 300));
                finish(null);
                return;
            }
            try {
                const parsed = JSON.parse(stdout);
                const text = String(parsed?.text || '').trim();
                finish(text ? parsed : null);
            } catch (err) {
                console.warn('NAT AI Python controller parse error:', err.message);
                finish(null);
            }
        });

        child.stdin.end(JSON.stringify({ context }));
    });
}

async function generateNatAiReply(context, fallbackText) {
    const pythonReply = await runPythonController(context);
    const shouldPreferOpenAi =
        NAT_AI_OPENAI_GENERAL_ENABLED &&
        OPENAI_API_KEY &&
        pythonReply?.intent === 'general';

    if (pythonReply?.text && !shouldPreferOpenAi) {
        return {
            text: pythonReply.text,
            provider: pythonReply.provider || 'python-controller',
            intent: pythonReply.intent,
            risk: pythonReply.risk,
            actions: pythonReply.actions,
        };
    }

    if (!OPENAI_API_KEY || typeof fetch !== 'function') {
        if (pythonReply?.text) {
            return {
                text: pythonReply.text,
                provider: pythonReply.provider || 'python-controller',
                intent: pythonReply.intent,
                risk: pythonReply.risk,
                actions: pythonReply.actions,
            };
        }
        return { text: fallbackText, provider: 'fallback' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: OPENAI_MODEL,
                max_output_tokens: OPENAI_MAX_OUTPUT_TOKENS,
                temperature: 0.35,
                input: [
                    { role: 'system', content: buildNatAiSystemPrompt() },
                    {
                        role: 'user',
                        content: `Context for NAT AI:\n${JSON.stringify(context)}\n\nAnswer the user's latest message now.`,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const error = await response.text().catch(() => '');
            console.warn('NAT AI OpenAI fallback:', response.status, error.slice(0, 300));
            return { text: fallbackText, provider: 'fallback' };
        }

        const data = await response.json();
        const text = extractOpenAiText(data);
        return { text: text || fallbackText, provider: text ? 'openai' : 'fallback' };
    } catch (err) {
        console.warn('NAT AI OpenAI fallback:', err.message);
        return { text: fallbackText, provider: 'fallback' };
    } finally {
        clearTimeout(timer);
    }
}

async function saveAiExchange(db, { sessionId, userText, aiText, intent, currentPage, machineStatus, shouldEscalate }) {
    const now = new Date();
    await db.run(
        `INSERT INTO ai_chat_messages (
            session_id, sender_role, body, intent, page_context, machine_status,
            should_escalate, created_at
         ) VALUES (?, 'user', ?, ?, ?, ?, ?, ?)`,
        [
            sessionId,
            userText,
            intent || null,
            currentPage || null,
            machineStatus || null,
            false,
            now,
        ]
    );
    await db.run(
        `INSERT INTO ai_chat_messages (
            session_id, sender_role, body, intent, page_context, machine_status,
            should_escalate, created_at
         ) VALUES (?, 'ai', ?, ?, ?, ?, ?, ?)`,
        [
            sessionId,
            aiText,
            intent || null,
            currentPage || null,
            machineStatus || null,
            shouldEscalate ? 1 : 0,
            new Date(now.getTime() + 1),
        ]
    );
    await db.run(
        `UPDATE ai_chat_sessions
         SET last_message_at = ?,
             last_message_preview = ?,
             updated_at = ?
         WHERE id = ?`,
        [now, aiText.slice(0, 400), now, sessionId]
    );
}

module.exports = {
    OPENAI_MAX_OUTPUT_TOKENS,
    buildNatAiContext,
    generateNatAiReply,
    runPythonController,
    saveAiExchange,
};
