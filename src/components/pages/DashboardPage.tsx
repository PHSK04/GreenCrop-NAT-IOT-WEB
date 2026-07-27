import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useMachine } from "../../contexts/MachineContext";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { 
  Power, 
  Activity, 
  Beaker, 
  Zap, 
  Cpu,
  Clock3,
  Siren,
  Thermometer,
  AlertTriangle,
  Wifi,
  Droplets
} from "lucide-react";
import { MetricsChart } from "../MetricsChart";
import { DigitalTwinModel } from "../dashboard/DigitalTwinModel";
import type { AdminDbDeviceRow } from "@/features/auth/services/authService";
import type { LucideIcon } from "lucide-react";


interface DashboardPageProps {
  language?: string;
  devices?: AdminDbDeviceRow[];
  activeDeviceId?: string;
  onDeviceChange?: (deviceId: string) => void;
}

const useStablePositiveValue = (value: number, enabled = true) => {
  const [stableValue, setStableValue] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStableValue(null);
      return;
    }
    if (Number.isFinite(value) && value > 0) {
      setStableValue(value);
    }
  }, [enabled, value]);

  return stableValue;
};

type SensorTrendPoint = {
  time: number;
  ph: number | null;
  temp: number | null;
  ec: number | null;
};

function MiniSensorChart({
  data,
  dataKey,
  color,
}: {
  data: SensorTrendPoint[];
  dataKey: "ph" | "temp" | "ec";
  color: string;
}) {
  const values = data
    .map((point) => point[dataKey])
    .filter((value): value is number => value != null && Number.isFinite(value));

  if (values.length < 2) {
    return (
      <div className="grid h-16 place-items-center rounded-xl border border-dashed border-border/70 bg-muted/20 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Waiting for trend
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.01);
  const width = 220;
  const height = 58;
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / (values.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 10) - 5;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const path = `M ${points.join(" L ")}`;
  const fillPath = `${path} L ${width},${height} L 0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-16 w-full overflow-visible rounded-xl bg-background/35">
      <path d={fillPath} fill={color} opacity="0.12" />
      <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      {points.map((point, index) => {
        if (index !== points.length - 1) return null;
        const [cx, cy] = point.split(",");
        return <circle key={point} cx={cx} cy={cy} r="4" fill={color} />;
      })}
    </svg>
  );
}

function RealtimeMetricCard({
  title,
  value,
  unit,
  status,
  icon: Icon,
  color,
  bgColor,
  data,
  dataKey,
}: {
  title: string;
  value: string;
  unit: string;
  status: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  data: SensorTrendPoint[];
  dataKey: "ph" | "temp" | "ec";
}) {
  return (
    <Card className="rounded-2xl border-border/70 bg-card/65 shadow-lg backdrop-blur-sm">
      <CardContent className="grid gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${bgColor}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-muted-foreground">{title}</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="font-mono text-3xl font-black leading-none text-foreground">{value}</span>
                {unit && <span className="pb-0.5 text-sm font-semibold text-muted-foreground">{unit}</span>}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 border-border bg-background/70 px-3 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {status}
          </Badge>
        </div>
        <MiniSensorChart data={data} dataKey={dataKey} color={color.includes("yellow") ? "#ca8a04" : color.includes("cyan") ? "#0891b2" : "#3b82f6"} />
      </CardContent>
    </Card>
  );
}

const translations = {
  EN: {
    title: "GreenCropNAT Dashboard",
    subtitle: "Real-time machine control and analytics",
    online: "System Online",
    offline: "System Offline",
    visualizer: "System Visualizer",
    visualizerDesc: "Real-time digital twin representation",
    masterControl: "Master Control",
    running: "Running",
    stopped: "Stopped",
    autoSeq: "Automatic Sequence",
    manualMode: "Manual Mode",
    uptime: "Uptime",
    pumpStatus: "Pump Status",
    activePumps: "Active pumps",
    noActivePumps: "No pump running",
    activeDevice: "Active Device",
    changeDevice: "Change device",
    noDevice: "No paired device selected",
    deviceId: "Device ID",
    location: "Location",
    waterFull: "Water Full",
    waterFullDesc: "Red alarm sensor is active. Pump 2 can be stopped from the web or the cabinet.",
    stopPump2: "Stop Pump 2",
    tankLevels: "Tank Levels & Flow",
    filling: "Filling Tank",
    idle: "Idle",
    sensorNetwork: "Sensor Network",
    sensorsOk: "All sensors communicating",
    standby: "Standby Mode",
    statusOnline: "ONLINE",
    statusSleep: "SLEEP",
    metrics: {
      ph: { title: "pH Balance", desc: "Acidity Level" },
      temp: { title: "Water Temperature", desc: "DS18B20 reading" },
      ec: { title: "Conductivity (EC)", desc: "Nutrient Concentration" }
    },
    pumpNames: ["Pump 1 Auto", "Pump 2 Manual"]
  },
  TH: {
    title: "แดชบอร์ด GreenCropNAT",
    subtitle: "การควบคุมเครื่องจักรและวิเคราะห์ผลแบบเรียลไทม์",
    online: "ระบบออนไลน์",
    offline: "ระบบออฟไลน์",
    visualizer: "แบบจำลองระบบ",
    visualizerDesc: "แบบจำลองดิจิทัลทวินแบบเรียลไทม์",
    masterControl: "การควบคุมหลัก",
    running: "กำลังทำงาน",
    stopped: "หยุดทำงาน",
    autoSeq: "ลำดับอัตโนมัติ",
    manualMode: "โหมดควบคุมเอง",
    uptime: "เวลาทำงานต่อเนื่อง",
    pumpStatus: "สถานะปั๊ม",
    activePumps: "ปั๊มที่ทำงาน",
    noActivePumps: "ยังไม่มีปั๊มทำงาน",
    activeDevice: "อุปกรณ์ที่กำลังใช้งาน",
    changeDevice: "เปลี่ยนอุปกรณ์",
    noDevice: "ยังไม่ได้เลือกอุปกรณ์ที่จับคู่",
    deviceId: "Device ID",
    location: "ตำแหน่ง",
    waterFull: "น้ำเต็ม",
    waterFullDesc: "เซ็นเซอร์ไฟแดงแจ้งเตือนน้ำเต็ม สามารถหยุดปั๊ม 2 ได้ทั้งหน้าเว็บและหน้าตู้",
    stopPump2: "หยุดปั๊ม 2",
    tankLevels: "ระดับน้ำและการไหล",
    filling: "กำลังเติมน้ำถัง",
    idle: "ว่าง",
    sensorNetwork: "เครือข่ายเซนเซอร์",
    sensorsOk: "เซนเซอร์ทั้งหมดสื่อสารปกติ",
    standby: "โหมดสแตนด์บาย",
    statusOnline: "ออนไลน์",
    statusSleep: "สถานะหลับ",
    metrics: {
      ph: { title: "ค่าความเป็นกรดด่าง (pH)", desc: "ระดับความเป็นกรด" },
      temp: { title: "อุณหภูมิน้ำ", desc: "ค่าจาก DS18B20" },
      ec: { title: "ค่าการนำไฟฟ้า (EC)", desc: "ความเข้มข้นของสารอาหาร" }
    },
    pumpNames: ["ปั๊ม 1 อัตโนมัติ", "ปั๊ม 2 กดมือ/เว็บ"]
  }
};

export function DashboardPage({
  language = "EN",
  devices = [],
  activeDeviceId = "",
  onDeviceChange,
}: DashboardPageProps) {
  const t = translations[language as keyof typeof translations] || translations.EN;
  const { 
    sendStartCommand,
    stopPump2FromWeb,
    sendEmergencyStop,
    uptimeSeconds,
    ecValue,
    phValue,
    tempValue,
    locked,
    wls1,
    wls2,
    floatAlarm,
    pump1On,
    pump2On,
    redOn,
    phOk,
    mqttStatus,
    boardConnected
  } = useMachine();

  const visiblePumpStates = [pump1On, pump2On];
  const activePumpLabels = visiblePumpStates
    .map((isActive, idx) => (isActive ? `P${idx + 1}` : null))
    .filter(Boolean)
    .join(", ");
  const [dismissedWaterFullAlarm, setDismissedWaterFullAlarm] = useState(false);
  const waterFullAlarm = boardConnected && redOn;
  const showWaterFullAlarm = waterFullAlarm && !dismissedWaterFullAlarm;
  const stablePhValue = useStablePositiveValue(phValue, boardConnected);
  const stableTempValue = useStablePositiveValue(tempValue, boardConnected);
  const stableEcValue = useStablePositiveValue(ecValue, boardConnected);
  const stablePhOk =
    stablePhValue != null ? stablePhValue >= 6.5 && stablePhValue <= 7.5 : phOk;
  const liveSignal = mqttStatus === "connected" && boardConnected;
  const [sensorTrend, setSensorTrend] = useState<SensorTrendPoint[]>([]);

  const formatUptime = (seconds: number) => {
    const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  };

  useEffect(() => {
    if (!waterFullAlarm) {
      setDismissedWaterFullAlarm(false);
    }
  }, [waterFullAlarm]);

  useEffect(() => {
    const hasAnyLiveMetric = stablePhValue != null || stableTempValue != null || stableEcValue != null;
    if (!hasAnyLiveMetric) return;

    setSensorTrend((prev) => {
      const nextPoint: SensorTrendPoint = {
        time: Date.now(),
        ph: stablePhValue,
        temp: stableTempValue,
        ec: stableEcValue,
      };
      const last = prev[prev.length - 1];
      if (
        last &&
        last.ph === nextPoint.ph &&
        last.temp === nextPoint.temp &&
        last.ec === nextPoint.ec
      ) {
        return prev;
      }
      return [...prev, nextPoint].slice(-24);
    });
  }, [stableEcValue, stablePhValue, stableTempValue]);

  const handleStopWaterFullAlarm = () => {
    setDismissedWaterFullAlarm(true);
    stopPump2FromWeb();
  };

  const handleEmergencyWaterFullAlarm = () => {
    setDismissedWaterFullAlarm(true);
    sendEmergencyStop();
  };

  const waterFullAlarmOverlay =
    showWaterFullAlarm && typeof document !== "undefined"
      ? createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 99999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              background: "rgba(2, 6, 23, 0.68)",
              backdropFilter: "blur(6px)",
            }}
          >
            <div
              className="dashboard-water-alarm-stripe pointer-events-none absolute inset-x-0 top-0 h-20 bg-[repeating-linear-gradient(115deg,#facc15_0_40px,#020617_40px_80px)]"
              style={{ animation: "dashboardSignalBlink 0.75s ease-in-out infinite" }}
            />
            <div
              className="dashboard-water-alarm-stripe pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[repeating-linear-gradient(115deg,#facc15_0_40px,#020617_40px_80px)]"
              style={{ animation: "dashboardSignalBlink 0.75s ease-in-out infinite" }}
            />

            <div
              className="dashboard-water-alarm-card max-h-[calc(100vh-8rem)] w-[min(96vw,1180px)] overflow-hidden rounded-[36px] border-4 border-yellow-400 bg-white/98 text-center shadow-2xl"
              style={{ animation: "dashboardAlarmPulse 0.95s ease-in-out infinite" }}
              role="alert"
              aria-live="assertive"
            >
              <div className="bg-[repeating-linear-gradient(115deg,#facc15_0_34px,#020617_34px_68px)] px-6 py-6" />
              <div className="px-6 py-12 sm:px-14 sm:py-16">
                <div
                  className="dashboard-water-alarm-signal mx-auto grid h-32 w-32 place-items-center rounded-[32px] border-4 border-yellow-400 bg-yellow-300 shadow-[0_20px_45px_rgba(234,179,8,0.32)]"
                  style={{ animation: "dashboardSignalBlink 0.72s ease-in-out infinite" }}
                >
                  <AlertTriangle className="h-20 w-20 text-slate-950" />
                </div>
                <p className="mt-8 text-base font-black uppercase tracking-[0.24em] text-red-600">
                  {language === "TH" ? "สัญญาณเตือนระดับน้ำ" : "Water Level Alarm"}
                </p>
                <h2 className="mt-3 text-6xl font-black leading-none text-slate-950 sm:text-8xl md:text-9xl">
                  {t.waterFull}
                </h2>
                <p className="mx-auto mt-7 max-w-3xl text-xl font-bold leading-9 text-slate-800 sm:text-3xl">
                  {language === "TH"
                    ? "เซ็นเซอร์แจ้งว่าน้ำเต็ม กรุณาหยุดปั๊มน้ำทันที"
                    : "The sensor reports water full. Stop the water pump immediately."}
                </p>
                <p className="mx-auto mt-3 max-w-3xl text-sm font-medium text-slate-500 sm:text-lg">
                  {language === "TH"
                    ? "กดหยุดแล้วหน้าต่างนี้จะหายไป และเว็บจะส่งคำสั่งหยุดพร้อมรับทราบ alarm ไปที่ตู้"
                    : "After stopping, this alert closes and sends stop plus alarm acknowledgement to the cabinet."}
                </p>
                <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
                  <Button
                    onClick={handleStopWaterFullAlarm}
                    variant="destructive"
                    className="h-16 min-w-72 text-xl font-black shadow-xl shadow-red-900/20"
                  >
                    <Cpu className="mr-2 h-6 w-6" />
                    {language === "TH" ? "หยุดปั๊มน้ำ" : "Stop Water Pump"}
                  </Button>
                  <Button
                    onClick={handleEmergencyWaterFullAlarm}
                    variant="outline"
                    className="h-16 min-w-72 border-red-500/50 bg-red-50 text-xl font-black text-red-700 hover:bg-red-100"
                  >
                    <Siren className="mr-2 h-6 w-6" />
                    {language === "TH" ? "หยุดฉุกเฉิน" : "Emergency Stop"}
                  </Button>
                </div>
              </div>
              <div className="bg-[repeating-linear-gradient(115deg,#facc15_0_34px,#020617_34px_68px)] px-6 py-6" />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <style>{`
        @keyframes dashboardAlarmPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45), 0 28px 90px rgba(127, 29, 29, 0.34);
          }
          50% {
            transform: scale(1.018);
            box-shadow: 0 0 0 16px rgba(239, 68, 68, 0.08), 0 38px 120px rgba(127, 29, 29, 0.48);
          }
        }

        @keyframes dashboardSignalBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.42; }
        }

        @keyframes dashboardFlowDash {
          to { stroke-dashoffset: -48; }
        }

        @keyframes dashboardFanSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes dashboardNodePulse {
          0%, 100% { opacity: 0.58; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.18); }
        }

        .dashboard-flow-active {
          animation: dashboardFlowDash 1.25s linear infinite;
        }

        .dashboard-fan-active {
          animation: dashboardFanSpin 1.1s linear infinite;
          transform-origin: center;
          transform-box: fill-box;
        }

        .dashboard-node-active {
          animation: dashboardNodePulse 1.4s ease-in-out infinite;
          transform-origin: center;
        }

        @media (prefers-reduced-motion: reduce) {
          .dashboard-water-alarm-card,
          .dashboard-water-alarm-signal,
          .dashboard-water-alarm-stripe,
          .dashboard-flow-active,
          .dashboard-fan-active,
          .dashboard-node-active {
            animation: none !important;
          }
        }
      `}</style>

      {waterFullAlarmOverlay}

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-sky-900/60 bg-[#061a35]/95 px-4 py-4 text-white shadow-[0_16px_40px_-28px_rgba(2,20,46,.85)] backdrop-blur-xl md:px-7">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="flex items-center gap-3 text-lg font-bold tracking-tight text-white sm:text-xl md:text-2xl">
              <span className="grid h-8 w-8 place-items-center rounded-xl border border-emerald-300/20 bg-emerald-300/10 text-emerald-300 sm:h-9 sm:w-9">
                <Activity className="h-5 w-5" />
              </span>
              {t.title}
            </h1>
            <p className="mt-1 text-xs font-medium text-sky-100/55 md:text-sm">{t.subtitle}</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
              <select
                aria-label={t.changeDevice}
                className="h-10 w-full rounded-xl border border-white/15 bg-white/[0.07] px-3 pr-8 text-xs font-semibold text-white outline-none backdrop-blur transition focus:border-emerald-300/50 disabled:opacity-60"
                value={activeDeviceId}
                onChange={(event) => onDeviceChange?.(event.target.value)}
                disabled={!devices.length}
              >
                {devices.length === 0 ? <option value="">{t.noDevice}</option> : devices.map((device) => (
                  <option key={String(device.id)} value={device.device_id}>{device.device_name || device.device_id}</option>
                ))}
              </select>
            </div>
          <Badge
            variant={mqttStatus === "connected" && boardConnected ? "default" : "secondary"}
            className={`hidden border px-3 py-1.5 font-mono text-[10px] sm:flex ${mqttStatus === "connected" && boardConnected ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200 hover:bg-emerald-300/10" : "border-white/10 bg-white/[0.05] text-sky-100/50"}`}
          >
            {mqttStatus === "connected" ? (
              <span className="flex items-center gap-2">
                {boardConnected ? (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-muted-foreground"></span>
                )}
                {boardConnected
                  ? language === "TH" ? "บอร์ดเชื่อมต่อ" : "BOARD ONLINE"
                  : language === "TH" ? "รอสัญญาณบอร์ด" : "WAITING FOR BOARD"}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted-foreground"></span>
                {language === "TH" ? "MQTT ยังไม่เชื่อมต่อ" : "MQTT DISCONNECTED"}
              </span>
            )}
          </Badge></div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-auto bg-[radial-gradient(circle_at_top,#dff5ff_0%,#eff9ff_38%,#f5fbff_72%)] p-4 md:p-6 xl:p-7">

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: language === "TH" ? "สถานะระบบ" : "System status", value: liveSignal ? (language === "TH" ? "ระบบพร้อมทำงาน" : "System ready") : (language === "TH" ? "รอสัญญาณ" : "Waiting"), detail: locked ? "LOCKED" : liveSignal ? (language === "TH" ? "ปกติ" : "Normal") : "--", icon: Wifi, tone: "emerald" },
            { label: language === "TH" ? "สถานะปั๊ม" : "Pump status", value: pump2On ? (language === "TH" ? "ปั๊มน้ำ #2" : "Water pump #2") : (language === "TH" ? "ปั๊มพร้อมทำงาน" : "Pumps ready"), detail: activePumpLabels || "OFF", icon: Cpu, tone: "cyan" },
            { label: language === "TH" ? "ระดับน้ำ" : "Water level", value: liveSignal ? `${wls2 ? 76 : wls1 ? 48 : 24}%` : "--", detail: wls2 ? (language === "TH" ? "ระดับเหมาะสม" : "Normal") : (language === "TH" ? "กำลังตรวจสอบ" : "Checking"), icon: Droplets, tone: "blue" },
            { label: t.metrics.ph.title, value: stablePhValue != null ? stablePhValue.toFixed(2) : "--", detail: stablePhValue != null ? (stablePhOk ? (language === "TH" ? "เหมาะสม" : "Suitable") : (language === "TH" ? "ควรตรวจสอบ" : "Check")) : "WAITING", icon: Beaker, tone: "emerald" },
          ].map((item) => {
            const Icon = item.icon;
            const tone = item.tone === "blue" ? "bg-blue-50 text-blue-600" : item.tone === "cyan" ? "bg-cyan-50 text-cyan-600" : "bg-emerald-50 text-emerald-600";
            return (
              <Card key={item.label} className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${tone}`}><Icon className="h-6 w-6" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">{item.label}</p>
                    <p className="mt-0.5 truncate text-lg font-bold text-slate-900">{item.value}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0 bg-emerald-50 text-[10px] text-emerald-700">{item.detail}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Machine Control Section (Hero) */}
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
          
          {/* Left Column: Visual Model */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="h-full min-h-[320px] overflow-hidden rounded-2xl border-0 bg-transparent shadow-none sm:min-h-[420px] lg:min-h-[500px]">
              <CardContent className="p-0">
                <DigitalTwinModel
                  language={language}
                  liveSignal={liveSignal}
                  locked={locked}
                  floatAlarm={floatAlarm}
                  redOn={redOn}
                  wls1={wls1}
                  wls2={wls2}
                  pump1On={pump1On}
                  pump2On={pump2On}
                  phValue={stablePhValue}
                  ecValue={stableEcValue}
                  tempValue={stableTempValue}
                  phOk={stablePhOk}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Controls and live readings */}
          <div className="lg:col-span-5">
            <Card className="h-full rounded-2xl border-sky-100 bg-white/95 shadow-[0_20px_55px_-38px_rgba(7,55,92,.5)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-slate-900">
                  <span className="flex items-center gap-2"><Power className="h-5 w-5 text-emerald-600" />{t.masterControl}</span>
                  <span className="font-mono text-xs font-medium text-slate-400">{formatUptime(uptimeSeconds)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <button onClick={sendStartCommand} className="group flex min-h-28 flex-col items-center justify-center rounded-2xl border border-emerald-400 bg-gradient-to-br from-emerald-400 to-emerald-600 p-3 text-white shadow-[0_14px_28px_-18px_rgba(5,150,105,.8)] transition hover:-translate-y-0.5">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-emerald-600 shadow"><Power className="h-5 w-5" /></span>
                    <span className="mt-2 text-sm font-bold">{language === "TH" ? "เริ่มทำงาน" : "Start"}</span>
                    <span className="text-[10px] text-emerald-50">Pump 2</span>
                  </button>
                  <button onClick={stopPump2FromWeb} className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-amber-300 bg-amber-50 p-3 text-amber-800 transition hover:-translate-y-0.5 hover:bg-amber-100">
                    <span className="grid h-11 w-11 place-items-center rounded-full border border-amber-300 bg-white"><Cpu className="h-5 w-5" /></span>
                    <span className="mt-2 text-sm font-bold">{language === "TH" ? "หยุดชั่วคราว" : "Pause"}</span>
                    <span className="text-[10px] text-amber-600">Pump 2</span>
                  </button>
                  <button onClick={sendEmergencyStop} className="flex min-h-28 flex-col items-center justify-center rounded-2xl border border-red-300 bg-red-50 p-3 text-red-700 transition hover:-translate-y-0.5 hover:bg-red-100">
                    <span className="grid h-11 w-11 place-items-center rounded-full border border-red-300 bg-white"><Siren className="h-5 w-5" /></span>
                    <span className="mt-2 text-sm font-bold">{language === "TH" ? "หยุดฉุกเฉิน" : "Emergency"}</span>
                    <span className="text-[10px] text-red-500">E-STOP</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { label: t.metrics.ph.title, value: stablePhValue != null ? stablePhValue.toFixed(2) : "--", unit: "", icon: Beaker, accent: "emerald", note: stablePhOk ? (language === "TH" ? "เหมาะสม" : "Suitable") : (language === "TH" ? "รอตรวจสอบ" : "Waiting") },
                    { label: t.metrics.temp.title, value: stableTempValue != null ? stableTempValue.toFixed(1) : "--", unit: "°C", icon: Thermometer, accent: "blue", note: stableTempValue != null ? (language === "TH" ? "ปกติ" : "Normal") : "Waiting" },
                    { label: t.metrics.ec.title, value: stableEcValue != null ? stableEcValue.toFixed(2) : "--", unit: "mS/cm", icon: Zap, accent: "cyan", note: stableEcValue != null ? (language === "TH" ? "เหมาะสม" : "Suitable") : "Waiting" },
                  ].map((metric) => {
                    const Icon = metric.icon;
                    const accent = metric.accent === "blue" ? "bg-blue-50 text-blue-600" : metric.accent === "cyan" ? "bg-cyan-50 text-cyan-600" : "bg-emerald-50 text-emerald-600";
                    return (
                      <div key={metric.label} className="rounded-2xl border border-sky-100 bg-[#fbfdff] p-4">
                        <div className={`grid h-9 w-9 place-items-center rounded-full ${accent}`}><Icon className="h-4 w-4" /></div>
                        <p className="mt-3 truncate text-[11px] font-semibold text-slate-500">{metric.label}</p>
                        <div className="mt-1 flex items-end gap-1"><span className="font-mono text-2xl font-black text-[#082a54]">{metric.value}</span><span className="pb-1 text-[10px] text-slate-500">{metric.unit}</span></div>
                        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{metric.note}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-sky-50/70 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-9 w-9 place-items-center rounded-full ${!boardConnected ? "bg-slate-100 text-slate-400" : locked || floatAlarm ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}><Cpu className="h-4 w-4" /></span>
                    <div><p className="text-xs font-bold text-slate-800">{t.sensorNetwork}</p><p className="text-[10px] text-slate-500">{boardConnected ? t.sensorsOk : (language === "TH" ? "รอสัญญาณจากอุปกรณ์" : "Waiting for device")}</p></div>
                  </div>
                  <Badge className={boardConnected ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}>{boardConnected ? t.statusOnline : "OFFLINE"}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Charts Row */}
        <div className="mb-10">
            <MetricsChart />
        </div>


      </main>
    </>
  );
}
