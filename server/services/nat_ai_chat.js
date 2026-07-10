const { spawn } = require('child_process');
const path = require('path');
const { searchProjectKnowledge } = require('./project_knowledge');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const OPENAI_MAX_OUTPUT_TOKENS = Math.max(120, Math.min(1200, Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 700)));
const NAT_AI_OPENAI_GENERAL_ENABLED = String(process.env.NAT_AI_OPENAI_GENERAL_ENABLED || 'true').toLowerCase() !== 'false';
const NAT_AI_LLM_FIRST = String(process.env.NAT_AI_LLM_FIRST || 'true').toLowerCase() !== 'false';
const NAT_AI_GENERATIVE_CHAT_REQUIRED = String(process.env.NAT_AI_GENERATIVE_CHAT_REQUIRED || 'true').toLowerCase() !== 'false';
const NAT_AI_PYTHON_ENABLED = String(process.env.NAT_AI_PYTHON_ENABLED || 'true').toLowerCase() !== 'false';
const NAT_AI_PYTHON_BIN = process.env.NAT_AI_PYTHON_BIN || 'python3';
const NAT_AI_PYTHON_SCRIPT = process.env.NAT_AI_PYTHON_SCRIPT ||
    path.resolve(__dirname, '../../ai/controller/nat_ai_controller.py');
const NAT_AI_PYTHON_TIMEOUT_MS = Math.max(800, Math.min(8000, Number(process.env.NAT_AI_PYTHON_TIMEOUT_MS || 2500)));
const NAT_AI_OPENAI_CONTEXT_MAX_CHARS = Math.max(2000, Math.min(16000, Number(process.env.NAT_AI_OPENAI_CONTEXT_MAX_CHARS || 8000)));

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

function parseRequestedYear(text) {
    const raw = String(text || '').toLowerCase();
    const explicit = raw.match(/(?:พ\.?\s*ศ\.?|ปี|year|ค\.?\s*ศ\.?)\s*(\d{4})/i);
    const loose = raw.match(/\b(20\d{2}|25\d{2})\b/);
    const match = explicit || loose;
    if (!match) return null;

    let year = Number(match[1]);
    if (!Number.isFinite(year)) return null;
    if (year > 2400) year -= 543;
    return year >= 2000 && year <= 2100 ? year : null;
}

function detectNatAiRoute(text) {
    const raw = String(text || '').toLowerCase();
    const has = (pattern) => pattern.test(raw);
    const route = {
        intent: 'general',
        needsSensorHistory: false,
        needsLearningSummary: false,
        needsCropYield: false,
        needsDevices: false,
        needsLiveMachine: false,
        needsProjectSnapshot: false,
    };

    if (has(/หยุด|ปิด|stop|emergency|ฉุกเฉิน|ดับ/) && has(/ปั๊ม|pump|เครื่อง|machine/)) {
        route.intent = 'control_stop';
        route.needsLiveMachine = true;
    } else if (has(/เปิด|เริ่ม|start|run/) && has(/ปั๊ม|pump|เครื่อง|machine/)) {
        route.intent = 'control_start';
        route.needsLiveMachine = true;
    } else if (has(/ผลผลิต|ผลิตได้|ผลิตเท่า|มีผลิต|เก็บเกี่ยว|yield|harvest|production/)) {
        route.intent = 'crop_yield';
        route.needsCropYield = true;
        route.needsProjectSnapshot = true;
    } else if (has(/สถานะ|status|online|offline|mqtt|สัญญาณ|เครื่อง|device|บอร์ด/)) {
        route.intent = 'machine_status';
        route.needsLiveMachine = true;
        route.needsSensorHistory = true;
        route.needsLearningSummary = true;
        route.needsDevices = true;
    } else if (has(/ปั๊ม|pump/)) {
        route.intent = 'pump_status';
        route.needsLiveMachine = true;
        route.needsSensorHistory = true;
    } else if (has(/sensor|เซ็นเซอร์|ph|ec|temp|อุณหภูมิ|น้ำ|ค่าน้ำ|history|ย้อนหลัง/)) {
        route.intent = 'sensor_insight';
        route.needsLiveMachine = true;
        route.needsSensorHistory = true;
        route.needsLearningSummary = true;
    } else if (has(/โหลด|ดาวน์โหลด|download|export|ส่งออก/)) {
        route.intent = 'export_help';
        route.needsDevices = true;
    } else if (has(/device|อุปกรณ์|จับคู่|pair|เครื่องหลัก|active device/)) {
        route.intent = 'device_help';
        route.needsDevices = true;
        route.needsLiveMachine = true;
    }

    return route;
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

function summarizeCropYearly(entries = []) {
    const groups = new Map();
    for (const entry of Array.isArray(entries) ? entries : []) {
        const year = Number(String(entry?.date || '').slice(0, 4));
        if (!Number.isFinite(year)) continue;
        const current = groups.get(year) || {
            year,
            total_yield_g: 0,
            harvest_count: 0,
            ph_total: 0,
            oxygen_total: 0,
            ec_total: 0,
            temp_total: 0,
        };
        const yieldValue = Number(entry.yield_g ?? entry.yield ?? 0);
        current.total_yield_g += Number.isFinite(yieldValue) ? yieldValue : 0;
        current.harvest_count += 1;
        current.ph_total += Number(entry.ph || 0);
        current.oxygen_total += Number(entry.oxygen || 0);
        current.ec_total += Number(entry.ec || 0);
        current.temp_total += Number(entry.temp_c ?? entry.temp ?? 0);
        groups.set(year, current);
    }

    return Array.from(groups.values())
        .sort((a, b) => b.year - a.year)
        .slice(0, 8)
        .map((year) => ({
            year: year.year,
            total_yield_g: Math.round(year.total_yield_g * 100) / 100,
            harvest_count: year.harvest_count,
            average_yield_g: year.harvest_count ? Math.round((year.total_yield_g / year.harvest_count) * 100) / 100 : 0,
            avg_ph: year.harvest_count ? Math.round((year.ph_total / year.harvest_count) * 100) / 100 : 0,
            avg_oxygen: year.harvest_count ? Math.round((year.oxygen_total / year.harvest_count) * 100) / 100 : 0,
            avg_ec: year.harvest_count ? Math.round((year.ec_total / year.harvest_count) * 100) / 100 : 0,
            avg_temp: year.harvest_count ? Math.round((year.temp_total / year.harvest_count) * 100) / 100 : 0,
        }));
}

function compactProjectSnapshot(snapshot, route = detectNatAiRoute('')) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    const crop = snapshot.crop_yield && typeof snapshot.crop_yield === 'object'
        ? snapshot.crop_yield
        : null;
    const recentCropEntries = Array.isArray(crop?.recent_entries)
        ? crop.recent_entries.slice(0, route.needsCropYield ? 12 : 4)
        : [];

    const compact = {
        scope: snapshot.scope,
        page: snapshot.page,
        language: snapshot.language,
        devices: snapshot.devices ? {
            active_device_id: snapshot.devices.active_device_id,
            loaded_device_count: snapshot.devices.loaded_device_count,
        } : undefined,
    };

    if (route.needsLiveMachine || route.needsSensorHistory) {
        compact.live_machine = snapshot.live_machine ? {
            status_label: snapshot.live_machine.status_label,
            mqtt_status: snapshot.live_machine.mqtt_status,
            board_connected: snapshot.live_machine.board_connected,
            last_telemetry_at: snapshot.live_machine.last_telemetry_at,
            pumps: snapshot.live_machine.pumps,
            water_level: snapshot.live_machine.water_level,
            values: snapshot.live_machine.values,
            latest_values_label: snapshot.live_machine.latest_values_label,
        } : undefined;
        compact.sensor_ai = snapshot.sensor_ai ? {
            health_score: snapshot.sensor_ai.health_score,
            severity: snapshot.sensor_ai.severity,
            status: snapshot.sensor_ai.status,
            summary: snapshot.sensor_ai.summary,
            risks: Array.isArray(snapshot.sensor_ai.risks) ? snapshot.sensor_ai.risks.slice(0, 4) : [],
            recommendations: Array.isArray(snapshot.sensor_ai.recommendations) ? snapshot.sensor_ai.recommendations.slice(0, 4) : [],
        } : undefined;
    }

    if (route.needsCropYield && crop) {
        compact.crop_yield = {
            total_entries: crop.total_entries,
            total_yield_g: crop.total_yield_g,
            yearly: Array.isArray(crop.yearly) ? crop.yearly.slice(0, 8) : summarizeCropYearly(recentCropEntries),
            monthly: Array.isArray(crop.monthly) ? crop.monthly.slice(-6) : [],
            recent_entries: recentCropEntries,
        };
    }

    if (route.needsLearningSummary && snapshot.ai_learning) {
        compact.ai_learning = snapshot.ai_learning;
    }

    return sanitizeForAi(compact);
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

function truncateJsonForBudget(value, maxChars = NAT_AI_OPENAI_CONTEXT_MAX_CHARS) {
    const json = JSON.stringify(value);
    if (json.length <= maxChars) return { value, chars: json.length, truncated: false };
    const clone = JSON.parse(json);
    if (Array.isArray(clone.recent_conversation)) clone.recent_conversation = clone.recent_conversation.slice(-2);
    if (Array.isArray(clone.recent_sensor_samples)) clone.recent_sensor_samples = clone.recent_sensor_samples.slice(0, 2);
    if (clone.page_project_snapshot?.crop_yield?.recent_entries) clone.page_project_snapshot.crop_yield.recent_entries = clone.page_project_snapshot.crop_yield.recent_entries.slice(0, 3);
    if (clone.page_project_snapshot?.crop_yield?.monthly) clone.page_project_snapshot.crop_yield.monthly = clone.page_project_snapshot.crop_yield.monthly.slice(-3);
    const compactJson = JSON.stringify(clone);
    if (compactJson.length <= maxChars) return { value: clone, chars: compactJson.length, truncated: true };
    return {
        value: {
            ai_route: clone.ai_route,
            data_scope: clone.data_scope,
            page: clone.page,
            machine_status_label: clone.machine_status_label,
            active_device_id: clone.active_device_id,
            latest_sensor: clone.latest_sensor,
            recent_sensor_summary: clone.recent_sensor_summary,
            page_project_snapshot: clone.page_project_snapshot?.crop_yield ? { crop_yield: clone.page_project_snapshot.crop_yield } : null,
            recent_conversation: clone.recent_conversation,
            user_message: clone.user_message,
            current_datetime: clone.current_datetime,
            budget_note: `Context compacted to stay under ${maxChars} characters.`,
        },
        chars: Math.min(JSON.stringify(clone).length, maxChars),
        truncated: true,
    };
}

function buildOpenAiContext(context, toolResult = null) {
    const route = context.ai_route || detectNatAiRoute(context.user_message);
    const compact = {
        ai_route: route,
        tool_result: toolResult?.text ? {
            provider: toolResult.provider || 'controller',
            intent: toolResult.intent,
            text: String(toolResult.text || '').slice(0, 900),
            risk: toolResult.risk || undefined,
            actions: toolResult.actions || undefined,
        } : null,
        user: context.user ? {
            id: context.user.id,
            role: context.user.role,
        } : null,
        data_scope: context.data_scope,
        page: context.page,
        machine_status_label: context.machine_status_label,
        active_device_id: context.active_device_id,
        latest_sensor: route.needsLiveMachine || route.needsSensorHistory ? context.latest_sensor : undefined,
        recent_sensor_summary: route.needsSensorHistory ? context.recent_sensor_summary : undefined,
        requested_date: context.requested_date,
        requested_year: context.requested_year,
        requested_day_summary: context.requested_day_summary,
        page_project_snapshot: compactProjectSnapshot(context.page_project_snapshot, route),
        project_evidence: Array.isArray(context.project_evidence) ? context.project_evidence.slice(0, 4) : [],
        learning_summary: route.needsLearningSummary ? context.learning_summary : undefined,
        recent_conversation: Array.isArray(context.recent_conversation) ? context.recent_conversation.slice(-10) : [],
        user_message: context.user_message,
        current_datetime: context.current_datetime,
        project: {
            app: 'GreenCropNAT IoT web app',
            rule: 'Use authenticated account data only. Prefer exact values from context. Say when data is missing.',
        },
    };
    return truncateJsonForBudget(compact);
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
        'Act as one unified project assistant, not a scripted FAQ bot. Answer naturally and directly.',
        'Reply in the same language as the user, usually Thai.',
        'You can answer broad questions. When the user asks about GreenCropNAT data, use the authenticated context and tool result only.',
        'Be conversational, calm, practical, and direct like a capable agricultural technology assistant.',
        'Answer the exact user question first.',
        'For GreenCropNAT, machine, sensor, pump, account, or project questions, use only the provided authenticated user context and be explicit when data is missing.',
        'Never mix data between users or tenants. If the context is scoped to one user, say "ของบัญชีนี้" / "this account" when summarizing project data.',
        'For general knowledge, coding, writing, learning, brainstorming, or everyday questions, answer from your general knowledge without pretending that machine context contains the answer.',
        'If a tool_result is provided, treat it as verified account data. Use its facts, but rewrite the answer naturally instead of copying a template.',
        'Project evidence contains excerpts retrieved from approved repository documentation. Prefer it over general memory for project facts.',
        'When project_evidence supports the answer, end with a short "อ้างอิงในโปรเจกต์:" or "Project references:" line listing only the source paths you actually used.',
        'Do not cite a project source that does not support the claim. Clearly separate live account data from documentation.',
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
    const route = detectNatAiRoute(userMessage);
    const tenantCandidates = await getSensorTenantCandidates(req, tenantId, deviceId);
    const latestRows = await loadLatestSensorRows(tenantCandidates, deviceId);
    const latestSensor = compactSensorRow(latestRows[0]);
    const devices = typeof getDevicesForUser === 'function'
        ? await getDevicesForUser(req.user).catch(() => [])
        : [];
    const requestedDateKey = parseRequestedDateKey(userMessage);
    const requestedYear = parseRequestedYear(userMessage);
    const historyLimit = requestedDateKey
        ? 160
        : route.needsSensorHistory
            ? 80
            : 0;
    const recentHistoryRows = loadSensorHistoryRows && historyLimit > 0
        ? await loadSensorHistoryRows(tenantCandidates, deviceId, { limit: historyLimit }).catch(() => [])
        : [];
    const requestedDayRows = requestedDateKey && loadSensorHistoryRows
        ? await loadSensorHistoryRows(tenantCandidates, deviceId, {
            limit: 500,
            startDate: `${requestedDateKey}T00:00:00`,
            endDate: `${requestedDateKey}T23:59:59`,
        }).catch(() => [])
        : [];
    const learningSummary = route.needsLearningSummary ? await getTenantLearningSummary(db, {
        tenantId,
        deviceId,
        limit: 4,
    }).catch(() => null) : null;
    const recentMessages = (await loadAiChatMessages(session.id, 14))
        .slice(-10)
        .map((message) => ({
            role: message.sender_role === 'user' ? 'user' : 'assistant',
            text: String(message.body || '').slice(0, 240),
        }));

    return {
        ai_route: route,
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
        project_knowledge: route.intent === 'general' ? buildProjectKnowledge() : null,
        project_evidence: searchProjectKnowledge(userMessage, { limit: 4 }),
        page_project_snapshot: compactProjectSnapshot(options.projectSnapshot || null, route),
        user_devices: (route.needsDevices ? devices : []).slice(0, 8).map((device) => ({
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
        recent_sensor_samples: recentHistoryRows.slice(0, route.needsSensorHistory ? 5 : 0).map(compactSensorRow).filter(Boolean),
        requested_date: requestedDateKey || null,
        requested_year: requestedYear || null,
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
    const isControlIntent = pythonReply?.intent === 'control_stop' || pythonReply?.intent === 'control_start';
    const shouldUseOpenAi =
        NAT_AI_OPENAI_GENERAL_ENABLED &&
        OPENAI_API_KEY &&
        !isControlIntent &&
        (NAT_AI_LLM_FIRST || pythonReply?.intent === 'general');

    if (pythonReply?.text && !shouldUseOpenAi) {
        return {
            text: pythonReply.text,
            provider: pythonReply.provider || 'python-controller',
            intent: pythonReply.intent,
            risk: pythonReply.risk,
            actions: pythonReply.actions,
            context_chars: 0,
            context_budget_chars: NAT_AI_OPENAI_CONTEXT_MAX_CHARS,
        };
    }

    if (!OPENAI_API_KEY || typeof fetch !== 'function') {
        if (NAT_AI_GENERATIVE_CHAT_REQUIRED && pythonReply?.intent === 'general') {
            const isThai = /[\u0E00-\u0E7F]/.test(String(context.user_message || ''));
            return {
                text: isThai
                    ? 'ตอนนี้ NAT AI ยังไม่ได้เชื่อมต่อโมเดลภาษาครับ จึงยังสร้างคำตอบใหม่จากข้อมูลโปรเจกต์ไม่ได้ กรุณาตั้งค่า OPENAI_API_KEY ใน server/.env แล้วเริ่มเซิร์ฟเวอร์ใหม่'
                    : 'NAT AI is not connected to a language model yet, so it cannot generate a new grounded answer. Configure OPENAI_API_KEY in server/.env and restart the server.',
                provider: 'model-configuration-required',
                intent: 'general',
                risk: pythonReply?.risk,
                actions: [],
            };
        }
        if (pythonReply?.text) {
            return {
                text: pythonReply.text,
                provider: pythonReply.provider || 'python-controller',
                intent: pythonReply.intent,
                risk: pythonReply.risk,
                actions: pythonReply.actions,
                context_chars: 0,
                context_budget_chars: NAT_AI_OPENAI_CONTEXT_MAX_CHARS,
            };
        }
        return { text: fallbackText, provider: 'fallback' };
    }

    const openAiContext = buildOpenAiContext(context, pythonReply);
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
                        content: `Compact authenticated context and optional tool result for NAT AI:\n${JSON.stringify(openAiContext.value)}\n\nAnswer the user's latest message now. If this is about GreenCropNAT account data, use only values in this compact context/tool result. Do not sound like a predefined FAQ.`,
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
        return {
            text: text || fallbackText,
            provider: text ? (pythonReply?.text ? 'openai-with-controller-context' : 'openai') : 'fallback',
            context_chars: openAiContext.chars,
            context_budget_chars: NAT_AI_OPENAI_CONTEXT_MAX_CHARS,
            context_truncated: openAiContext.truncated,
        };
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
