import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Gauge,
  Lightbulb,
  LineChart,
  Signal,
  Thermometer,
  Waves,
} from "lucide-react";
import { useMachine } from "@/contexts/MachineContext";
import { chatService, type AiSensorLearningSummary } from "@/features/chat/services/chatService";
import { analyzeSensorIntelligence, type InsightSeverity } from "@/features/ai/services/sensorIntelligence";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type SensorIntelligencePageProps = {
  language?: string;
  activeDeviceId?: string;
};

const severityClass: Record<InsightSeverity, string> = {
  good: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  watch: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  critical: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  offline: "border-slate-500/25 bg-slate-500/10 text-slate-600 dark:text-slate-300",
};

const severityDotClass: Record<InsightSeverity, string> = {
  good: "bg-emerald-500",
  watch: "bg-sky-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  offline: "bg-slate-400",
};

const metricIcon = {
  signal: Signal,
  ph: Gauge,
  ec: Waves,
  temp: Thermometer,
  water: Waves,
  pump: Activity,
};

export function SensorIntelligencePage({
  language = "TH",
  activeDeviceId = "",
}: SensorIntelligencePageProps) {
  const isTH = language === "TH";
  const {
    mqttStatus,
    boardConnected,
    lastTelemetryAt,
    telemetryHistory,
    isOn,
    phValue,
    ecValue,
    tempValue,
    wls1,
    wls2,
    floatAlarm,
    locked,
    pump1On,
    pump2On,
    greenOn,
    redOn,
  } = useMachine();

  const report = useMemo(
    () =>
      analyzeSensorIntelligence({
        language,
        deviceId: activeDeviceId,
        mqttStatus,
        boardConnected,
        lastTelemetryAt,
        current: {
          timestamp: lastTelemetryAt,
          deviceId: activeDeviceId,
          phValue,
          ecValue,
          tempValue,
          wls1,
          wls2,
          floatAlarm,
          locked,
          pump1On,
          pump2On,
          greenOn,
          redOn,
          isOn,
        },
        history: telemetryHistory,
      }),
    [
      activeDeviceId,
      boardConnected,
      ecValue,
      floatAlarm,
      greenOn,
      isOn,
      language,
      lastTelemetryAt,
      locked,
      mqttStatus,
      phValue,
      pump1On,
      pump2On,
      redOn,
      telemetryHistory,
      tempValue,
      wls1,
      wls2,
    ],
  );
  const [learningSummary, setLearningSummary] = useState<AiSensorLearningSummary | null>(null);
  const [isLearningLoading, setIsLearningLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLearningLoading(true);
    chatService.getMySensorLearning({
      deviceId: activeDeviceId || undefined,
      limit: 80,
      backfill: "auto",
    })
      .then((summary) => {
        if (isMounted) setLearningSummary(summary);
      })
      .catch(() => {
        if (isMounted) setLearningSummary(null);
      })
      .finally(() => {
        if (isMounted) setIsLearningLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeDeviceId]);

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto bg-[#f2f5f3] dark:bg-slate-950">
      <header className="sticky top-0 z-10 border-b border-white/80 bg-white/90 px-4 py-4 shadow-[0_12px_35px_-28px_rgba(15,23,42,.45)] backdrop-blur-xl md:px-8 md:py-5">
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-cyan-50 text-emerald-600 shadow-sm">
                <BrainCircuit className="h-6 w-6" />
              </span>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                  {isTH ? "ระบบเซนเซอร์อัจฉริยะ" : "Sensor Intelligence"}
                </div>
                <h1 className="mt-0.5 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                  {isTH ? "AI วิเคราะห์สุขภาพระบบ" : "AI System Health Analysis"}
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {isTH
                    ? "ประเมินความเสี่ยง แนวโน้ม และคำแนะนำจากข้อมูลจริงแบบเรียลไทม์"
                    : "Real-time risk, trend, and recommendation analysis from live telemetry"}
                </p>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`w-fit gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-sm ${severityClass[report.severity]}`}>
            <span className={`h-2 w-2 rounded-full ${severityDotClass[report.severity]}`} />
            {report.statusText}
          </Badge>
        </div>
      </header>

      <main className="w-full space-y-4 p-4 md:p-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(340px,0.72fr)_minmax(0,1.55fr)]">
          <Card className="overflow-hidden rounded-[28px] border-white/80 bg-gradient-to-br from-white via-white to-emerald-50/60 shadow-[0_24px_60px_-42px_rgba(15,23,42,.45)]">
            <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center">
              <CardDescription className="font-semibold uppercase tracking-[0.14em]">
                {isTH ? "คะแนนสุขภาพ AI" : "AI Health Score"}
              </CardDescription>
              <div
                className="mt-5 grid h-44 w-44 place-items-center rounded-full p-[10px] shadow-[0_18px_45px_-28px_rgba(5,150,105,.75)]"
                style={{
                  background: `conic-gradient(${
                    report.severity === "critical"
                      ? "#ef4444"
                      : report.severity === "warning"
                        ? "#f59e0b"
                        : report.severity === "offline"
                          ? "#94a3b8"
                          : "#10b981"
                  } ${report.healthScore * 3.6}deg, #e2e8f0 0deg)`,
                }}
              >
                <div className="grid h-full w-full place-items-center rounded-full border border-white bg-white">
                  <div>
                    <div className="flex items-end justify-center">
                      <span className="text-5xl font-black leading-none tracking-tight text-slate-900">{report.healthScore}</span>
                      <span className="pb-1 text-sm font-bold text-slate-400">/100</span>
                    </div>
                    <p className="mt-2 text-xs font-bold text-emerald-600">{report.statusText}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 grid w-full grid-cols-2 divide-x divide-slate-200 rounded-2xl border border-white bg-white/80 p-3 text-sm shadow-sm">
                <div className="px-2">
                  <span>{isTH ? "ข้อมูลล่าสุด" : "Last telemetry"}</span>
                  <span className="mt-1 block truncate font-bold text-slate-800">{report.lastTelemetryLabel}</span>
                </div>
                <div className="px-2">
                  <span>{isTH ? "ตัวอย่างย้อนหลัง" : "History samples"}</span>
                  <span className="mt-1 block text-lg font-black text-slate-800">{report.sampleCount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[28px] border-white/80 bg-white/95 shadow-[0_24px_60px_-42px_rgba(15,23,42,.45)]">
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="flex items-center gap-3 text-xl text-slate-900">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-500"><Lightbulb className="h-5 w-5" /></span>
                {isTH ? "สรุปจาก AI" : "AI Summary"}
              </CardTitle>
              <CardDescription className="text-sm leading-6">{report.summary}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5 md:grid-cols-2">
              <div className="rounded-2xl border border-amber-100 bg-amber-50/55 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-800">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {isTH ? "จุดที่ควรดู" : "What to watch"}
                </div>
                <div className="space-y-2.5">
                  {report.risks.map((risk) => (
                    <div key={risk} className="flex gap-2 rounded-xl border border-white bg-white/85 px-3 py-3 text-sm leading-5 text-slate-700 shadow-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      {risk}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/55 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {isTH ? "คำแนะนำถัดไป" : "Next steps"}
                </div>
                <div className="space-y-2.5">
                  {report.recommendations.map((item) => (
                    <div key={item} className="flex gap-2 rounded-xl border border-white bg-white/85 px-3 py-3 text-sm leading-5 text-slate-700 shadow-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {report.metrics.map((metric) => {
            const Icon = metricIcon[metric.id];
            return (
              <Card key={metric.id} className="rounded-2xl border-white/80 bg-white/95 shadow-[0_16px_38px_-32px_rgba(15,23,42,.5)] transition-transform duration-200 hover:-translate-y-0.5">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`grid h-12 w-12 place-items-center rounded-2xl border ${severityClass[metric.severity]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-muted-foreground">{metric.label}</div>
                    <div className="truncate text-xl font-black text-slate-900">{metric.value}</div>
                    <div className="truncate text-xs text-muted-foreground">{metric.detail}</div>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${severityDotClass[metric.severity]}`} />
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section>
          <Card className="rounded-[28px] border-white/80 bg-white/95 shadow-[0_24px_60px_-42px_rgba(15,23,42,.45)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <LineChart className="h-5 w-5 text-sky-500" />
                {isTH ? "แนวโน้มจากข้อมูลย้อนหลัง" : "Historical Trends"}
              </CardTitle>
              <CardDescription>
                {isTH
                  ? "เปรียบเทียบข้อมูลล่าสุดกับช่วงก่อนหน้า เพื่อช่วยมองความเปลี่ยนแปลงเร็วขึ้น"
                  : "Compares the latest telemetry window with the prior window to surface changes sooner"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {report.trends.map((trend) => (
                <div key={trend.id} className="rounded-2xl border border-slate-100 bg-[#f8faf9] p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{trend.label}</div>
                    <Badge variant="outline">
                      {trend.direction === "up"
                        ? isTH ? "เพิ่ม" : "Up"
                        : trend.direction === "down"
                          ? isTH ? "ลด" : "Down"
                          : trend.direction === "stable"
                            ? isTH ? "นิ่ง" : "Stable"
                            : isTH ? "รอข้อมูล" : "Learning"}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{trend.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="rounded-[28px] border-white/80 bg-white/95 shadow-[0_24px_60px_-42px_rgba(15,23,42,.45)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <BrainCircuit className="h-5 w-5 text-emerald-500" />
                {isTH ? "ข้อมูลสำหรับ Machine Learning" : "Machine Learning Data"}
              </CardTitle>
              <CardDescription>
                {isTH
                  ? "ระบบเก็บตัวอย่างจาก sensor_data ไปเรื่อย ๆ โดยผูกกับ user/tenant ของบัญชีนี้เท่านั้น"
                  : "The system keeps collecting samples from sensor_data, scoped only to this account's user/tenant"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-5 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
                <div className="text-sm font-semibold opacity-75">
                  {isTH ? "Sample ที่สะสม" : "Collected samples"}
                </div>
                <div className="mt-2 text-4xl font-black">
                  {isLearningLoading ? "..." : (learningSummary?.total_samples ?? 0).toLocaleString()}
                </div>
                <div className="mt-3 text-sm leading-6 opacity-85">
                  {isTH
                    ? `ข้อมูลนี้ถูกกรองด้วย tenant_id ของ user ที่ login อยู่${learningSummary?.tenant_id ? ` (${learningSummary.tenant_id})` : ""} ไม่ใช้ข้อมูลข้ามบัญชี`
                    : `This data is filtered by the logged-in user's tenant_id${learningSummary?.tenant_id ? ` (${learningSummary.tenant_id})` : ""}; no cross-account training data is used.`}
                </div>
                {learningSummary?.backfill && learningSummary.backfill.scanned > 0 && (
                  <div className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs dark:bg-slate-950/40">
                    {isTH
                      ? `Backfill ล่าสุด: อ่าน ${learningSummary.backfill.scanned} แถว, เพิ่ม ${learningSummary.backfill.captured} sample`
                      : `Last backfill: scanned ${learningSummary.backfill.scanned}, captured ${learningSummary.backfill.captured} samples`}
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(learningSummary?.labels || {}).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground sm:col-span-2">
                    {isTH
                      ? "ยังไม่มี sample พอสำหรับ train model เมื่ออุปกรณ์ส่งข้อมูลเข้ามา ระบบจะเก็บให้อัตโนมัติ"
                      : "No samples yet. Once the device sends telemetry, samples will be stored automatically."}
                  </div>
                ) : (
                  Object.entries(learningSummary?.labels || {}).map(([label, total]) => (
                    <div key={label} className="rounded-lg border border-border/70 bg-background/70 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
                      <div className="mt-1 text-2xl font-black">{Number(total).toLocaleString()}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
