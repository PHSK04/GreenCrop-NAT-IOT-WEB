import {
  Activity,
  ArrowLeft,
  Bot,
  Cpu,
  Droplets,
  Gauge,
  Orbit,
  Radar,
  Sparkles,
  Waves,
} from "lucide-react";

import machineModel from "@/assets/images/machine_model.png";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useMachine } from "../../contexts/MachineContext";

interface DigitalTwinDetailPageProps {
  language?: string;
  onBack?: () => void;
}

const translations = {
  EN: {
    title: "Digital Twin Detail",
    subtitle: "Futuristic command-center view for live irrigation flow and active devices.",
    live: "Live System",
    phase: "Current Phase",
    activeDevice: "Active Device",
    overview: "System Overview",
    overviewDesc: "A high-clarity view of the current machine loop, optimized for presentations and live monitoring.",
    commandCenter: "Command Center",
    return: "Back to dashboard",
    workflow: "Workflow",
    deviceGrid: "Device Grid",
    metrics: "Operational Metrics",
    phaseIdle: "Awaiting command",
    phaseAnalyze: "Analyzing soil moisture",
    phaseRun: "Irrigation running",
    phaseMonitor: "Standby monitoring",
    hub: "Controller Hub",
    pump: "Main Pump",
    feed: "Tank Feed",
    stable: "System loop stable",
    steps: ["Read sensor", "Send data", "Analyze threshold", "Open valve", "Pump running", "Watering active"],
    labels: {
      sensor: "Sensor Mesh",
      pressure: "Pressure",
      flow: "Flow",
      tank: "Tank Feed",
    },
  },
  TH: {
    title: "รายละเอียดดิจิทัลทวิน",
    subtitle: "มุมมอง command-center สำหรับแสดงการไหลของระบบและอุปกรณ์ที่กำลังทำงานแบบสด",
    live: "ระบบสด",
    phase: "ขั้นตอนปัจจุบัน",
    activeDevice: "อุปกรณ์ที่กำลังทำงาน",
    overview: "ภาพรวมระบบ",
    overviewDesc: "มุมมองชัดเจนของวงจรเครื่องจักรปัจจุบัน เหมาะกับการพรีเซนต์และติดตามสถานะสด",
    commandCenter: "ศูนย์ควบคุม",
    return: "กลับแดชบอร์ด",
    workflow: "ลำดับการทำงาน",
    deviceGrid: "แผงอุปกรณ์",
    metrics: "ค่าปฏิบัติการ",
    phaseIdle: "รอคำสั่งทำงาน",
    phaseAnalyze: "กำลังวิเคราะห์ค่าความชื้น",
    phaseRun: "กำลังรดน้ำ",
    phaseMonitor: "เฝ้าระวังระบบ",
    hub: "กล่องควบคุมหลัก",
    pump: "ปั๊มน้ำหลัก",
    feed: "ระบบจ่ายน้ำถัง",
    stable: "วงจรระบบปกติ",
    steps: ["อ่านค่าเซนเซอร์", "ส่งข้อมูล", "วิเคราะห์เงื่อนไข", "เปิดวาล์ว", "สั่งปั๊ม", "กำลังจ่ายน้ำ"],
    labels: {
      sensor: "เครือข่ายเซนเซอร์",
      pressure: "แรงดัน",
      flow: "การไหล",
      tank: "ระบบจ่ายน้ำ",
    },
  },
};

export function DigitalTwinDetailPage({ language = "TH", onBack }: DigitalTwinDetailPageProps) {
  const t = translations[language as keyof typeof translations] || translations.EN;
  const { isOn, pressure, flowRate, pumps, activeTank, ecValue } = useMachine();

  const hasAnyPumpSignal = pumps.some(Boolean);
  const activePumpIndex = pumps.findIndex(Boolean);
  const currentStep = !isOn
    ? t.phaseIdle
    : hasAnyPumpSignal
      ? t.phaseRun
      : activeTank
        ? t.phaseAnalyze
        : t.phaseMonitor;
  const activeDevice = !isOn
    ? t.commandCenter
    : hasAnyPumpSignal
      ? `${t.pump}${activePumpIndex >= 0 ? ` P${activePumpIndex + 1}` : ""}`
      : activeTank
        ? t.feed
        : t.hub;

  const workflowStates = t.steps.map((label, index) => {
    const activeIndex = !isOn ? 0 : hasAnyPumpSignal ? 4 : activeTank ? 2 : 1;
    return {
      label,
      status: index < activeIndex ? "done" : index === activeIndex ? "active" : "waiting",
    };
  });

  const deviceCards = [
    {
      title: t.hub,
      value: isOn ? "PROCESSING" : "IDLE",
      icon: Cpu,
      active: isOn && !hasAnyPumpSignal,
    },
    {
      title: t.pump,
      value: isOn && hasAnyPumpSignal ? "RUNNING" : "STANDBY",
      icon: Orbit,
      active: isOn && hasAnyPumpSignal,
    },
    {
      title: t.labels.sensor,
      value: isOn ? "ACTIVE" : "SLEEP",
      icon: Radar,
      active: isOn,
    },
    {
      title: t.labels.tank,
      value: activeTank ? `T${activeTank}` : "READY",
      icon: Droplets,
      active: isOn && !!activeTank,
    },
  ];

  const metrics = [
    { label: t.labels.pressure, value: `${pressure.toFixed(1)} BAR`, icon: Gauge },
    { label: t.labels.flow, value: `${flowRate.toFixed(1)} L/min`, icon: Waves },
    { label: "EC", value: `${ecValue.toFixed(1)} mS/cm`, icon: Sparkles },
    { label: "Mode", value: isOn ? "AUTO" : "MANUAL", icon: Bot },
  ];

  return (
    <main className="relative z-10 flex-1 overflow-auto p-4 md:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <header className="rounded-[2rem] border border-cyan-500/20 bg-[linear-gradient(135deg,rgba(2,6,23,0.95),rgba(15,23,42,0.88))] p-5 text-slate-100 shadow-[0_24px_80px_rgba(8,145,178,0.18)] md:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Badge className="border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-cyan-200">
                {t.live}
              </Badge>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] md:text-4xl">{t.title}</h1>
              <p className="max-w-3xl text-sm text-slate-300 md:text-base">{t.subtitle}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="h-11 rounded-full border-cyan-400/30 bg-white/5 px-5 text-cyan-100 hover:bg-cyan-400/10 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.return}
            </Button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{t.phase}</p>
              <p className="mt-2 text-lg font-semibold text-white">{currentStep}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{t.activeDevice}</p>
              <p className="mt-2 text-lg font-semibold text-white">{activeDevice}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{t.overview}</p>
              <p className="mt-2 text-sm text-slate-200">{t.stable}</p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
          <Card className="overflow-hidden rounded-[2rem] border-cyan-500/20 bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(15,23,42,0.78))] shadow-[0_24px_80px_rgba(8,145,178,0.16)]">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="h-5 w-5 text-cyan-300" />
                {t.overview}
              </CardTitle>
              <CardDescription className="text-slate-300">{t.overviewDesc}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.88),rgba(2,6,23,0.94))] p-4 md:p-8">
                <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.22),transparent_60%)]" />
                <div className="relative flex min-h-[520px] items-center justify-center">
                  {isOn && <div className="absolute h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl" />}
                  <div className="absolute left-[10%] top-[12%] rounded-full border border-cyan-400/30 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.14)]">
                    {t.hub}
                  </div>
                  <div className="absolute bottom-[19%] left-[14%] rounded-full border border-emerald-400/30 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.14)]">
                    {t.feed}
                  </div>
                  <div className="absolute right-[10%] top-[44%] rounded-full border border-cyan-400/30 bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,0.14)]">
                    {t.pump}
                  </div>
                  <div className="absolute left-[23%] top-[27%] h-px w-[26%] bg-gradient-to-r from-cyan-400/0 via-cyan-300 to-cyan-400/0" />
                  <div className="absolute left-[36%] top-[28%] h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" />
                  <div className="absolute bottom-[26%] left-[31%] h-px w-[32%] bg-gradient-to-r from-emerald-400/0 via-emerald-300 to-emerald-400/0" />
                  <div className="absolute bottom-[25.5%] left-[50%] h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]" />
                  <img
                    src={machineModel}
                    alt="Digital twin machine model"
                    className="relative z-10 max-h-[520px] w-auto object-contain drop-shadow-[0_30px_60px_rgba(15,23,42,0.65)]"
                    style={{ filter: isOn ? "brightness(1.08) contrast(1.12)" : "grayscale(0.35)" }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-cyan-500/20 bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(15,23,42,0.78))] text-slate-100 shadow-[0_24px_80px_rgba(8,145,178,0.14)]">
              <CardHeader>
                <CardTitle className="text-white">{t.workflow}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {workflowStates.map((step, index) => (
                  <div
                    key={step.label}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                      step.status === "active"
                        ? "border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                        : step.status === "done"
                          ? "border-emerald-400/30 bg-emerald-400/10"
                          : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold ${
                        step.status === "active"
                          ? "bg-cyan-400/20 text-cyan-100"
                          : step.status === "done"
                            ? "bg-emerald-400/20 text-emerald-100"
                            : "bg-white/10 text-slate-300"
                      }`}>
                        {index + 1}
                      </div>
                      <span className="text-sm text-white">{step.label}</span>
                    </div>
                    <Badge className={`border ${
                      step.status === "active"
                        ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                        : step.status === "done"
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                          : "border-white/10 bg-white/5 text-slate-300"
                    }`}>
                      {step.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-cyan-500/20 bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(15,23,42,0.78))] text-slate-100 shadow-[0_24px_80px_rgba(8,145,178,0.14)]">
              <CardHeader>
                <CardTitle className="text-white">{t.deviceGrid}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {deviceCards.map((device) => (
                  <div
                    key={device.title}
                    className={`rounded-2xl border p-4 ${
                      device.active
                        ? "border-cyan-400/40 bg-cyan-400/10 shadow-[0_0_24px_rgba(34,211,238,0.12)]"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`rounded-2xl p-3 ${device.active ? "bg-cyan-400/15 text-cyan-100" : "bg-white/10 text-slate-300"}`}>
                        <device.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{device.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{device.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-cyan-500/20 bg-[linear-gradient(180deg,rgba(2,6,23,0.92),rgba(15,23,42,0.78))] text-slate-100 shadow-[0_24px_80px_rgba(8,145,178,0.14)]">
              <CardHeader>
                <CardTitle className="text-white">{t.metrics}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {metrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-white/10 p-2 text-cyan-100">
                        <metric.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{metric.label}</p>
                        <p className="mt-1 text-base font-semibold text-white">{metric.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
