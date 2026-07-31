function minutesSince(timestamp, now = new Date()) {
    const value = Date.parse(timestamp || '');
    if (!Number.isFinite(value)) return null;
    return Math.max(0, Math.round((now.getTime() - value) / 60000));
}

function buildAgentPlan(context, generated) {
    const risk = generated?.risk || {};
    const severity = String(risk.severity || 'unknown').toLowerCase();
    const steps = [
        { id: 'understand', label: 'Understand the request and account context', status: 'completed' },
        { id: 'verify', label: 'Verify telemetry freshness and evidence', status: 'completed' },
    ];
    if (['critical', 'warning', 'offline'].includes(severity)) {
        steps.push({ id: 'diagnose', label: 'Diagnose the detected risk before control', status: 'recommended' });
    }
    if (Array.isArray(generated?.actions) && generated.actions.length) {
        steps.push({ id: 'confirm', label: 'Wait for explicit user confirmation', status: 'blocked-by-safety' });
    }
    steps.push({ id: 'monitor', label: 'Monitor the next telemetry update', status: 'recommended' });
    return steps;
}

function buildBrainAssessment(context, generated) {
    const latest = context?.latest_sensor || {};
    const telemetryAgeMinutes = minutesSince(latest.timestamp, new Date(context?.current_datetime || Date.now()));
    const evidence = Array.isArray(context?.project_evidence) ? context.project_evidence : [];
    const hasTelemetry = Boolean(latest.timestamp);
    const telemetryFresh = hasTelemetry && telemetryAgeMinutes !== null && telemetryAgeMinutes <= 10;
    const hasActions = Array.isArray(generated?.actions) && generated.actions.length > 0;
    const confidence = Math.max(0.2, Math.min(0.98,
        0.42 +
        (telemetryFresh ? 0.25 : 0) +
        (evidence.length ? 0.18 : 0) +
        (generated?.provider && generated.provider !== 'fallback' ? 0.1 : 0)
    ));
    return {
        version: 'brain-v2',
        confidence: Math.round(confidence * 100) / 100,
        data_quality: {
            telemetry_available: hasTelemetry,
            telemetry_fresh: telemetryFresh,
            telemetry_age_minutes: telemetryAgeMinutes,
            evidence_count: evidence.length,
        },
        safety: {
            mode: hasActions ? 'confirmation-required' : 'read-only',
            hardware_changed: false,
            reason: hasActions
                ? 'Proposed hardware actions require explicit confirmation.'
                : 'This response did not execute hardware actions.',
        },
        evidence: evidence.slice(0, 4).map((item) => ({
            source: item.source || item.path || 'project',
            score: item.score,
        })),
        plan: buildAgentPlan(context, generated),
    };
}

module.exports = { buildBrainAssessment, minutesSince };
