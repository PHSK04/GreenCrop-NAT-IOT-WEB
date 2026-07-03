export type IntelligenceLanguage = "TH" | "EN" | string;

export type TelemetryLike = {
  timestamp?: string | null;
  deviceId?: string;
  phValue: number;
  ecValue: number;
  tempValue: number;
  wls1: boolean;
  wls2: boolean;
  floatAlarm: boolean;
  locked: boolean;
  pump1On: boolean;
  pump2On: boolean;
  greenOn: boolean;
  redOn: boolean;
  isOn: boolean;
};

export type SensorIntelligenceInput = {
  language?: IntelligenceLanguage;
  deviceId?: string;
  mqttStatus: "connected" | "disconnected" | "connecting";
  boardConnected: boolean;
  lastTelemetryAt?: string | null;
  current: TelemetryLike;
  history?: TelemetryLike[];
};

export type InsightSeverity = "good" | "watch" | "warning" | "critical" | "offline";

export type MetricInsight = {
  id: "ph" | "ec" | "temp" | "water" | "pump" | "signal";
  label: string;
  value: string;
  severity: InsightSeverity;
  detail: string;
};

export type TrendInsight = {
  id: "ph" | "ec" | "temp";
  label: string;
  direction: "up" | "down" | "stable" | "unknown";
  delta: number;
  text: string;
};

export type SensorIntelligenceReport = {
  severity: InsightSeverity;
  healthScore: number;
  statusText: string;
  summary: string;
  recommendations: string[];
  risks: string[];
  metrics: MetricInsight[];
  trends: TrendInsight[];
  sampleCount: number;
  lastTelemetryLabel: string;
};

const isTH = (language?: IntelligenceLanguage) => language !== "EN";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const validNumber = (value: number) => Number.isFinite(value) && value > 0;

const formatNumber = (value: number, digits: number) => {
  if (!validNumber(value)) return "--";
  return value.toFixed(digits);
};

const latestFirst = (history: TelemetryLike[] = []) =>
  [...history]
    .filter((item) => item?.timestamp && Number.isFinite(Date.parse(String(item.timestamp))))
    .sort((a, b) => Date.parse(String(b.timestamp)) - Date.parse(String(a.timestamp)));

const average = (items: number[]) => {
  const clean = items.filter(validNumber);
  if (clean.length === 0) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
};

const severityRank: Record<InsightSeverity, number> = {
  good: 0,
  watch: 1,
  warning: 2,
  critical: 3,
  offline: 4,
};

const worstSeverity = (items: InsightSeverity[]) =>
  items.reduce<InsightSeverity>((worst, item) => (severityRank[item] > severityRank[worst] ? item : worst), "good");

const classifyPh = (ph: number): InsightSeverity => {
  if (!validNumber(ph)) return "watch";
  if (ph < 5.8 || ph > 8.2) return "critical";
  if (ph < 6.5 || ph > 7.5) return "warning";
  return "good";
};

const classifyEc = (ec: number): InsightSeverity => {
  if (!validNumber(ec)) return "watch";
  if (ec < 0.25 || ec > 3.5) return "critical";
  if (ec < 0.8 || ec > 2.4) return "warning";
  return "good";
};

const classifyTemp = (temp: number): InsightSeverity => {
  if (!validNumber(temp)) return "watch";
  if (temp < 15 || temp > 38) return "critical";
  if (temp < 20 || temp > 32) return "warning";
  return "good";
};

const metricToneText = (severity: InsightSeverity, language?: IntelligenceLanguage) => {
  const th = isTH(language);
  if (severity === "good") return th ? "ปกติ" : "Normal";
  if (severity === "watch") return th ? "รอข้อมูล" : "Waiting";
  if (severity === "warning") return th ? "ควรตรวจ" : "Check";
  if (severity === "critical") return th ? "เร่งด่วน" : "Urgent";
  return th ? "ไม่มีสัญญาณ" : "Offline";
};

const buildTrend = (
  id: TrendInsight["id"],
  label: string,
  latest: TelemetryLike[],
  older: TelemetryLike[],
  pick: (item: TelemetryLike) => number,
  threshold: number,
  language?: IntelligenceLanguage,
): TrendInsight => {
  const th = isTH(language);
  const recentAvg = average(latest.map(pick));
  const olderAvg = average(older.map(pick));
  if (recentAvg == null || olderAvg == null) {
    return {
      id,
      label,
      direction: "unknown",
      delta: 0,
      text: th ? "ยังไม่มีข้อมูลย้อนหลังพอ" : "Not enough history yet",
    };
  }

  const delta = recentAvg - olderAvg;
  const direction = Math.abs(delta) < threshold ? "stable" : delta > 0 ? "up" : "down";
  const directionText =
    direction === "stable"
      ? th ? "ค่อนข้างนิ่ง" : "stable"
      : direction === "up"
        ? th ? "เพิ่มขึ้น" : "rising"
        : th ? "ลดลง" : "falling";

  return {
    id,
    label,
    direction,
    delta,
    text: th
      ? `${label} ${directionText} ${Math.abs(delta).toFixed(id === "temp" ? 1 : 2)} จากช่วงก่อนหน้า`
      : `${label} is ${directionText} by ${Math.abs(delta).toFixed(id === "temp" ? 1 : 2)} versus the prior window`,
  };
};

const formatLastTelemetry = (timestamp: string | null | undefined, language?: IntelligenceLanguage) => {
  if (!timestamp) return isTH(language) ? "ยังไม่มีข้อมูล" : "No telemetry yet";
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return parsed.toLocaleString(isTH(language) ? "th-TH" : "en-US");
};

export function analyzeSensorIntelligence(input: SensorIntelligenceInput): SensorIntelligenceReport {
  const th = isTH(input.language);
  const current = input.current;
  const history = latestFirst(input.history);
  const sampleCount = history.length;
  const liveSignal = input.mqttStatus === "connected" && input.boardConnected;
  const risks: string[] = [];
  const recommendations: string[] = [];
  const severities: InsightSeverity[] = [];

  const phSeverity = classifyPh(current.phValue);
  const ecSeverity = classifyEc(current.ecValue);
  const tempSeverity = classifyTemp(current.tempValue);
  severities.push(phSeverity, ecSeverity, tempSeverity);

  if (!liveSignal) {
    severities.push("offline");
    risks.push(th ? "ยังไม่มีสัญญาณสดจากบอร์ดหรือ MQTT" : "No live board or MQTT signal");
    recommendations.push(th ? "ตรวจ Wi-Fi, ไฟเลี้ยง, และ MQTT ของอุปกรณ์ก่อน" : "Check device power, Wi-Fi, and MQTT connectivity first");
  }

  if (current.locked) {
    severities.push("critical");
    risks.push(th ? "ระบบอยู่ในสถานะล็อค" : "System lock is active");
    recommendations.push(th ? "หยุดสั่งงานต่อและตรวจสวิตช์/ตู้ควบคุม" : "Stop new commands and inspect the cabinet or safety switch");
  }

  if (current.redOn || current.floatAlarm) {
    severities.push("critical");
    risks.push(th ? "พบสัญญาณเตือนน้ำเต็มหรือไฟแดง" : "Water full or red alarm signal detected");
    recommendations.push(th ? "หยุดปั๊ม 2 แล้วตรวจระดับน้ำจริงทันที" : "Stop Pump 2 and verify the actual water level immediately");
  }

  if (phSeverity === "critical" || phSeverity === "warning") {
    risks.push(th ? `pH อยู่นอกช่วงเหมาะสม (${formatNumber(current.phValue, 2)})` : `pH is outside target range (${formatNumber(current.phValue, 2)})`);
    recommendations.push(th ? "ตรวจหัววัด pH และปรับน้ำให้อยู่ใกล้ 6.5-7.5" : "Check the pH probe and bring water closer to 6.5-7.5");
  }

  if (ecSeverity === "critical" || ecSeverity === "warning") {
    risks.push(th ? `EC ควรตรวจสอบ (${formatNumber(current.ecValue, 2)} mS/cm)` : `EC needs review (${formatNumber(current.ecValue, 2)} mS/cm)`);
    recommendations.push(th ? "ตรวจความเข้มข้นสารอาหารและการไหลเวียนน้ำ" : "Review nutrient concentration and water circulation");
  }

  if (tempSeverity === "critical" || tempSeverity === "warning") {
    risks.push(th ? `อุณหภูมิน้ำเริ่มเสี่ยง (${formatNumber(current.tempValue, 1)} °C)` : `Water temperature is risky (${formatNumber(current.tempValue, 1)} °C)`);
    recommendations.push(th ? "ตรวจร่มเงา/การระบายความร้อนของถัง" : "Check shade and cooling around the tank");
  }

  if (current.pump2On && (current.wls2 || current.redOn || current.floatAlarm)) {
    severities.push("critical");
    risks.push(th ? "ปั๊ม 2 ทำงานขณะระดับน้ำสูง" : "Pump 2 is running while water level is high");
    recommendations.push(th ? "หยุดปั๊ม 2 เพื่อลดความเสี่ยงน้ำล้น" : "Stop Pump 2 to reduce overflow risk");
  }

  if (recommendations.length === 0) {
    recommendations.push(th ? "ระบบดูปกติ ให้เฝ้าดูแนวโน้ม pH, EC และอุณหภูมิต่อเนื่อง" : "System looks normal. Keep watching pH, EC, and temperature trends");
    recommendations.push(th ? "เก็บข้อมูลต่อเนื่องเพื่อให้การทำนายแม่นขึ้น" : "Keep collecting telemetry so predictions become more useful");
  }

  const severity = worstSeverity(severities);
  const penalty = severities.reduce((sum, item) => {
    if (item === "offline") return sum + 35;
    if (item === "critical") return sum + 28;
    if (item === "warning") return sum + 14;
    if (item === "watch") return sum + 6;
    return sum;
  }, 0);
  const healthScore = clamp(100 - penalty, 5, 100);

  const statusText =
    severity === "offline"
      ? th ? "รอสัญญาณเครื่อง" : "Waiting for device signal"
      : severity === "critical"
        ? th ? "ต้องตรวจทันที" : "Needs immediate attention"
        : severity === "warning"
          ? th ? "ควรตรวจสอบ" : "Needs review"
          : severity === "watch"
            ? th ? "ข้อมูลยังไม่ครบ" : "Learning from data"
            : th ? "ระบบปกติ" : "Healthy";

  const summary =
    severity === "good"
      ? th
        ? "AI ไม่พบสัญญาณเสี่ยงหลักในรอบล่าสุด ค่า sensor และสถานะปั๊มอยู่ในภาพรวมที่ดี"
        : "AI found no major risk in the latest telemetry. Sensor values and pump state look healthy overall."
      : th
        ? `AI พบ ${risks.length || 1} จุดที่ควรดูแล โดยสถานะรวมคือ "${statusText}"`
        : `AI found ${risks.length || 1} item${risks.length === 1 ? "" : "s"} to review. Overall status: ${statusText}.`;

  const metrics: MetricInsight[] = [
    {
      id: "signal",
      label: th ? "สัญญาณเครื่อง" : "Device Signal",
      value: liveSignal ? (th ? "ออนไลน์" : "Online") : metricToneText("offline", input.language),
      severity: liveSignal ? "good" : "offline",
      detail: input.mqttStatus === "connected"
        ? th ? "MQTT เชื่อมต่อแล้ว" : "MQTT connected"
        : th ? "MQTT ยังไม่พร้อม" : "MQTT is not ready",
    },
    {
      id: "ph",
      label: "pH",
      value: formatNumber(current.phValue, 2),
      severity: phSeverity,
      detail: metricToneText(phSeverity, input.language),
    },
    {
      id: "ec",
      label: "EC",
      value: `${formatNumber(current.ecValue, 2)} mS/cm`,
      severity: ecSeverity,
      detail: metricToneText(ecSeverity, input.language),
    },
    {
      id: "temp",
      label: th ? "อุณหภูมิ" : "Temperature",
      value: `${formatNumber(current.tempValue, 1)} °C`,
      severity: tempSeverity,
      detail: metricToneText(tempSeverity, input.language),
    },
    {
      id: "water",
      label: th ? "ระดับน้ำ" : "Water Level",
      value: current.redOn || current.floatAlarm ? (th ? "เตือน" : "Alarm") : current.wls2 ? (th ? "ระดับบน" : "Upper") : current.wls1 ? (th ? "ระดับล่าง" : "Lower") : "--",
      severity: current.redOn || current.floatAlarm ? "critical" : current.wls2 ? "watch" : "good",
      detail: current.floatAlarm ? (th ? "ลูกลอยแจ้งเตือน" : "Float alarm active") : current.redOn ? (th ? "ไฟแดงทำงาน" : "Red lamp active") : metricToneText(current.wls2 ? "watch" : "good", input.language),
    },
    {
      id: "pump",
      label: th ? "ปั๊ม" : "Pumps",
      value: `${[current.pump1On, current.pump2On].filter(Boolean).length}/2`,
      severity: current.pump2On && (current.wls2 || current.redOn || current.floatAlarm) ? "critical" : "good",
      detail: current.pump1On || current.pump2On ? (th ? "มีปั๊มทำงาน" : "Pump running") : (th ? "หยุดอยู่" : "Stopped"),
    },
  ];

  const recent = history.slice(0, 12);
  const older = history.slice(12, 36);
  const trends = [
    buildTrend("ph", "pH", recent, older, (item) => item.phValue, 0.08, input.language),
    buildTrend("ec", "EC", recent, older, (item) => item.ecValue, 0.08, input.language),
    buildTrend("temp", th ? "อุณหภูมิ" : "Temperature", recent, older, (item) => item.tempValue, 0.4, input.language),
  ];

  return {
    severity,
    healthScore,
    statusText,
    summary,
    recommendations: Array.from(new Set(recommendations)).slice(0, 5),
    risks: risks.length ? Array.from(new Set(risks)).slice(0, 5) : [th ? "ยังไม่พบความเสี่ยงสำคัญ" : "No major risks detected"],
    metrics,
    trends,
    sampleCount,
    lastTelemetryLabel: formatLastTelemetry(input.lastTelemetryAt || current.timestamp, input.language),
  };
}

export function formatSensorAiAnswer(report: SensorIntelligenceReport, language?: IntelligenceLanguage, deviceId?: string) {
  const th = isTH(language);
  const title = th
    ? `AI วิเคราะห์เครื่อง${deviceId ? ` ${deviceId}` : ""}: ${report.statusText}`
    : `AI analysis${deviceId ? ` for ${deviceId}` : ""}: ${report.statusText}`;
  const risks = report.risks.map((item) => `- ${item}`).join("\n");
  const recommendations = report.recommendations.map((item) => `- ${item}`).join("\n");
  const trends = report.trends.map((item) => `- ${item.text}`).join("\n");

  return [
    title,
    th ? `คะแนนสุขภาพ: ${report.healthScore}/100` : `Health score: ${report.healthScore}/100`,
    report.summary,
    "",
    th ? "จุดที่ AI เห็น:" : "AI observations:",
    risks,
    "",
    th ? "คำแนะนำถัดไป:" : "Recommended next steps:",
    recommendations,
    "",
    th ? "แนวโน้มล่าสุด:" : "Latest trends:",
    trends,
  ].join("\n");
}
