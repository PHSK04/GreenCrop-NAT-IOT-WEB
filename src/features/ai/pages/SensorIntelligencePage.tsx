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
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-card/80 px-4 py-4 backdrop-blur-xl md:px-8 md:py-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-300">
              <BrainCircuit className="h-4 w-4" />
              {isTH ? "ระบบเซนเซอร์อัจฉริยะ" : "Sensor Intelligence"}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {isTH ? "AI วิเคราะห์สุขภาพระบบ" : "AI System Health Analysis"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isTH
                ? "สรุปความเสี่ยงและคำแนะนำจากข้อมูล sensor ล่าสุดและประวัติย้อนหลัง"
                : "Risk summary and recommendations from live telemetry and historical data"}
            </p>
          </div>
          <Badge variant="outline" className={`w-fit gap-2 px-3 py-1.5 ${severityClass[report.severity]}`}>
            <span className={`h-2 w-2 rounded-full ${severityDotClass[report.severity]}`} />
            {report.statusText}
          </Badge>
        </div>
      </header>

      <main className="space-y-5 p-4 md:p-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.45fr)]">
          <Card className="overflow-hidden border-border/70 bg-card/90 shadow-sm">
            <CardHeader className="pb-3">
              <CardDescription>{isTH ? "คะแนนสุขภาพ AI" : "AI Health Score"}</CardDescription>
              <CardTitle className="flex items-end gap-3">
                <span className="text-5xl font-black tracking-tight">{report.healthScore}</span>
                <span className="pb-2 text-base text-muted-foreground">/100</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${
                    report.severity === "critical"
                      ? "bg-red-500"
                      : report.severity === "warning"
                        ? "bg-amber-500"
                        : report.severity === "offline"
                          ? "bg-slate-400"
                          : "bg-emerald-500"
                  }`}
                  style={{ width: `${report.healthScore}%` }}
                />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>{isTH ? "ข้อมูลล่าสุด" : "Last telemetry"}</span>
                  <span className="text-right font-medium text-foreground">{report.lastTelemetryLabel}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>{isTH ? "ตัวอย่างย้อนหลัง" : "History samples"}</span>
                  <span className="font-medium text-foreground">{report.sampleCount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/90 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                {isTH ? "สรุปจาก AI" : "AI Summary"}
              </CardTitle>
              <CardDescription>{report.summary}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {isTH ? "จุดที่ควรดู" : "What to watch"}
                </div>
                <div className="space-y-2">
                  {report.risks.map((risk) => (
                    <div key={risk} className="rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm">
                      {risk}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  {isTH ? "คำแนะนำถัดไป" : "Next steps"}
                </div>
                <div className="space-y-2">
                  {report.recommendations.map((item) => (
                    <div key={item} className="rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm">
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
              <Card key={metric.id} className="border-border/70 bg-card/90 shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`grid h-11 w-11 place-items-center rounded-lg border ${severityClass[metric.severity]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-muted-foreground">{metric.label}</div>
                    <div className="truncate text-lg font-bold">{metric.value}</div>
                    <div className="truncate text-xs text-muted-foreground">{metric.detail}</div>
                  </div>
                  <span className={`h-2.5 w-2.5 rounded-full ${severityDotClass[metric.severity]}`} />
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section>
          <Card className="border-border/70 bg-card/90 shadow-sm">
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
                <div key={trend.id} className="rounded-lg border border-border/70 bg-background/70 p-4">
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
          <Card className="border-border/70 bg-card/90 shadow-sm">
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
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
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
