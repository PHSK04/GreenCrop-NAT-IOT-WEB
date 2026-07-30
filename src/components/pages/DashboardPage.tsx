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
  Siren,
  Thermometer,
  AlertTriangle,
  Wifi,
  Droplets,
  CloudSun,
  CloudRain,
  CloudLightning,
  Moon,
  UserRound,
  ChevronDown,
  Bell,
  LogOut,
  UserCircle
} from "lucide-react";
import { MetricsChart } from "../MetricsChart";
import { DigitalTwinModel } from "../dashboard/DigitalTwinModel";
import type { AdminDbDeviceRow } from "@/features/auth/services/authService";
import type { LucideIcon } from "lucide-react";
import { useLiveWeather } from "@/features/weather/useLiveWeather";


interface DashboardPageProps {
  language?: string;
  devices?: AdminDbDeviceRow[];
  activeDeviceId?: string;
  onDeviceChange?: (deviceId: string) => void;
  user?: { name: string; email?: string; role?: string };
  onOpenProfile?: () => void;
  onLogout?: () => void;
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
  user,
  onOpenProfile,
  onLogout,
}: DashboardPageProps) {
  const t = translations[language as keyof typeof translations] || translations.EN;
  const { 
    sendStartCommand,
    stopPump2FromWeb,
    sendEmergencyStop,
    uptimeSeconds,
    flowRate,
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
  const availableSensorCount = [stablePhValue, stableTempValue, stableEcValue].filter(
    (value) => value != null,
  ).length;
  const activePumpCount = visiblePumpStates.filter(Boolean).length;
  const systemHealthChecks = [
    mqttStatus === "connected",
    boardConnected,
    stablePhValue != null,
    stableTempValue != null,
    stableEcValue != null,
    !locked,
    !floatAlarm && !redOn,
  ];
  const systemHealthPercent = Math.round(
    (systemHealthChecks.filter(Boolean).length / systemHealthChecks.length) * 100,
  );
  const activeAlertCount = [mqttStatus !== "connected", !boardConnected, locked, floatAlarm, redOn].filter(Boolean).length;
  const [sensorTrend, setSensorTrend] = useState<SensorTrendPoint[]>([]);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const liveWeather = useLiveWeather();
  const currentWeather = liveWeather.weather;
  const dashboardNotifications = [
    {
      title: mqttStatus === "connected"
        ? (language === "TH" ? "เชื่อมต่อ MQTT แล้ว" : "MQTT connected")
        : (language === "TH" ? "MQTT ยังไม่เชื่อมต่อ" : "MQTT disconnected"),
      detail: boardConnected
        ? (language === "TH" ? "บอร์ดกำลังส่งข้อมูล" : "Board is sending data")
        : (language === "TH" ? "กำลังรอสัญญาณจากบอร์ด" : "Waiting for board signal"),
      active: mqttStatus === "connected" && boardConnected,
      icon: Wifi,
    },
    {
      title: language === "TH" ? "สถานะระดับน้ำ" : "Water level status",
      detail: wls2
        ? (language === "TH" ? "ระดับน้ำอยู่ในเกณฑ์" : "Water level is normal")
        : (language === "TH" ? "กำลังตรวจสอบระดับน้ำ" : "Checking water level"),
      active: wls2,
      icon: Droplets,
    },
    {
      title: language === "TH" ? "ข้อมูลคุณภาพน้ำ" : "Water quality data",
      detail: stablePhValue != null || stableEcValue != null
        ? (language === "TH" ? "ได้รับข้อมูลเซนเซอร์ล่าสุดแล้ว" : "Latest sensor data received")
        : (language === "TH" ? "ยังไม่ได้รับค่า pH และ EC" : "Waiting for pH and EC"),
      active: stablePhValue != null || stableEcValue != null,
      icon: Beaker,
    },
  ];
  const notificationCount = dashboardNotifications.filter((item) => !item.active).length;
  const weatherVisual = (() => {
    const code = currentWeather?.weatherCode ?? -1;
    if (code >= 95) {
      return {
        icon: CloudLightning,
        label: language === "TH" ? "พายุฝน" : "Thunderstorm",
        card: "border-violet-300/60 bg-gradient-to-br from-violet-100 to-slate-200",
        iconTone: "bg-violet-200 text-violet-700",
        badge: "bg-violet-200/80 text-violet-800",
      };
    }
    if ((code >= 51 && code <= 82) || (currentWeather?.precipitation ?? 0) > 0) {
      return {
        icon: CloudRain,
        label: language === "TH" ? "มีฝนตก" : "Rain",
        card: "border-sky-300/60 bg-gradient-to-br from-sky-100 to-blue-200",
        iconTone: "bg-sky-200 text-sky-700",
        badge: "bg-sky-200/80 text-sky-800",
      };
    }
    if (currentWeather && !currentWeather.isDay) {
      return {
        icon: Moon,
        label: language === "TH" ? "กลางคืน" : "Night",
        card: "border-indigo-300/50 bg-gradient-to-br from-indigo-100 to-slate-200",
        iconTone: "bg-indigo-200 text-indigo-700",
        badge: "bg-indigo-200/80 text-indigo-800",
      };
    }
    if (code === 0) {
      return {
        icon: CloudSun,
        label: language === "TH" ? "ท้องฟ้าแจ่มใส" : "Clear",
        card: "border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-100",
        iconTone: "bg-amber-100 text-amber-600",
        badge: "bg-amber-100 text-amber-800",
      };
    }
    return {
      icon: CloudSun,
      label: currentWeather ? (language === "TH" ? "มีเมฆบางส่วน" : "Cloudy") : (language === "TH" ? "รอข้อมูล" : "Waiting"),
      card: "border-slate-200 bg-gradient-to-br from-white to-slate-100",
      iconTone: "bg-slate-100 text-slate-600",
      badge: "bg-slate-100 text-slate-600",
    };
  })();

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
      <header className="sticky top-0 z-20 flex min-h-[102px] items-center border-b border-border/60 bg-white/90 px-4 text-foreground backdrop-blur-xl dark:bg-slate-950/90 md:px-6">
        <div className="flex w-full flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-500/10 bg-emerald-500/10 text-emerald-600">
                <Activity className="h-[22px] w-[22px]" />
              </span>
              {t.title}
            </h1>
            <p className="ml-14 mt-0.5 text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
              <select
                aria-label={t.changeDevice}
                className="h-9 w-full rounded-xl border border-border bg-background px-3 pr-8 text-xs font-medium text-foreground outline-none transition focus:border-emerald-500/50 disabled:opacity-60"
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
            className={`hidden border px-3 py-1.5 font-mono text-[10px] sm:flex ${mqttStatus === "connected" && boardConnected ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300" : "border-border bg-muted text-muted-foreground"}`}
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
          </Badge>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationMenuOpen((open) => !open);
                setAccountMenuOpen(false);
                setNotificationsRead(true);
              }}
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-border bg-white/85 text-slate-600 shadow-sm transition hover:border-emerald-200 hover:bg-white hover:text-emerald-600 dark:bg-slate-900"
              aria-label={language === "TH" ? "การแจ้งเตือน" : "Notifications"}
            >
              <Bell className="h-4.5 w-4.5" />
              {!notificationsRead && notificationCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full border-2 border-white bg-red-500 px-1 text-[9px] font-bold text-white">
                  {notificationCount}
                </span>
              )}
            </button>
            {notificationMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_-22px_rgba(15,23,42,.35)] dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <p className="text-sm font-bold">{language === "TH" ? "การแจ้งเตือน" : "Notifications"}</p>
                  <span className="text-[10px] text-slate-400">{language === "TH" ? "สถานะล่าสุด" : "Latest status"}</span>
                </div>
                <div className="p-2">
                  {dashboardNotifications.map(({ title, detail, active, icon: Icon }) => (
                    <div key={title} className="flex gap-3 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-slate-800/70">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${active ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{title}</p>
                        <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setAccountMenuOpen((open) => !open);
                setNotificationMenuOpen(false);
              }}
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-white/85 px-2.5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-white dark:bg-slate-900"
              aria-label={language === "TH" ? "บัญชีผู้ใช้งาน" : "User account"}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
                <UserRound className="h-4 w-4" />
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-28 truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {user?.name || (language === "TH" ? "ผู้ใช้งาน" : "User")}
                </span>
                <span className="block text-[9px] uppercase tracking-wide text-slate-400">
                  {user?.role || "Member"}
                </span>
              </span>
              <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${accountMenuOpen ? "rotate-180" : ""}`} />
            </button>
            {accountMenuOpen && (
              <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_20px_60px_-22px_rgba(15,23,42,.35)] dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-1 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{user?.name || (language === "TH" ? "ผู้ใช้งาน" : "User")}</p>
                  <p className="mt-0.5 truncate text-[10px] text-slate-500">{user?.email || user?.role || "Member"}</p>
                </div>
                <button type="button" onClick={onOpenProfile} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-slate-200">
                  <UserCircle className="h-4 w-4" />
                  {language === "TH" ? "โปรไฟล์ของฉัน" : "My profile"}
                </button>
                <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
                <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" />
                  {language === "TH" ? "ออกจากระบบ" : "Logout"}
                </button>
              </div>
            )}
          </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-auto bg-[#f2f5f3] p-3 dark:bg-slate-950 md:p-5">
        <div className="w-full rounded-2xl border border-slate-200/80 bg-[#e9eeeb] p-3 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.42)] dark:border-slate-800 dark:bg-slate-900/55 md:p-4">

        <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {[
            { label: language === "TH" ? "สภาพอากาศ" : "Weather", value: currentWeather ? `${Math.round(currentWeather.temperature)} °C` : "--", detail: weatherVisual.label, icon: weatherVisual.icon, tone: "weather", cardClass: weatherVisual.card, iconClass: weatherVisual.iconTone, badgeClass: weatherVisual.badge },
            { label: language === "TH" ? "สถานะระบบ" : "System status", value: liveSignal ? (language === "TH" ? "ระบบพร้อมทำงาน" : "System ready") : (language === "TH" ? "รอสัญญาณ" : "Waiting"), detail: locked ? "LOCKED" : liveSignal ? (language === "TH" ? "ปกติ" : "Normal") : "--", icon: Wifi, tone: "emerald" },
            { label: language === "TH" ? "สถานะปั๊ม" : "Pump status", value: pump2On ? (language === "TH" ? "ปั๊มน้ำ #2" : "Water pump #2") : (language === "TH" ? "ปั๊มพร้อมทำงาน" : "Pumps ready"), detail: activePumpLabels || "OFF", icon: Cpu, tone: "cyan" },
            { label: language === "TH" ? "ระดับน้ำ" : "Water level", value: liveSignal ? `${wls2 ? 76 : wls1 ? 48 : 24}%` : "--", detail: wls2 ? (language === "TH" ? "ระดับเหมาะสม" : "Normal") : (language === "TH" ? "กำลังตรวจสอบ" : "Checking"), icon: Droplets, tone: "blue" },
            { label: "pH", value: stablePhValue != null ? stablePhValue.toFixed(2) : "--", detail: stablePhValue != null && stablePhOk ? (language === "TH" ? "เหมาะสม" : "Suitable") : "WAITING", icon: Beaker, tone: "emerald" },
            { label: "EC", value: stableEcValue != null ? stableEcValue.toFixed(2) : "--", detail: "mS/cm", icon: Zap, tone: "cyan" },
          ].map((item) => {
            const Icon = item.icon;
            const tone = item.iconClass || (item.tone === "blue" ? "bg-blue-50 text-blue-600" : item.tone === "cyan" ? "bg-cyan-50 text-cyan-600" : "bg-emerald-50 text-emerald-600");
            return (
              <Card key={item.label} className={`rounded-2xl border-white/70 bg-white/90 shadow-none ${item.cardClass || ""}`}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-slate-500">{item.label}</p>
                    <p className="mt-0.5 truncate text-sm font-bold text-slate-900 md:text-base">{item.value}</p>
                  </div>
                  <Badge variant="secondary" className={`hidden shrink-0 text-[9px] sm:inline-flex ${item.badgeClass || "bg-emerald-50 text-emerald-700"}`}>{item.detail}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Machine Control Section (Hero) */}
        <div className="mb-3 grid grid-cols-1 gap-3 xl:grid-cols-12">
          
          {/* Left Column: Visual Model */}
          <div className="space-y-3 xl:col-span-8">
            <Card className="h-full min-h-[400px] overflow-hidden rounded-[24px] border-white/80 bg-white/75 shadow-none sm:min-h-[540px] xl:min-h-[640px]">
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
          <div className="xl:col-span-4">
            <Card className="h-full rounded-[24px] border-white/80 bg-white/90 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-slate-900">
                  <span className="flex items-center gap-2"><Power className="h-5 w-5 text-emerald-600" />{t.masterControl}</span>
                  <span className="font-mono text-xs font-medium text-slate-400">{formatUptime(uptimeSeconds)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={sendStartCommand} className="group flex min-h-24 flex-col items-center justify-center rounded-2xl border border-emerald-500 bg-emerald-600 p-3 text-white shadow-[0_14px_28px_-18px_rgba(5,150,105,.8)] transition hover:bg-emerald-700">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-emerald-600 shadow"><Power className="h-5 w-5" /></span>
                    <span className="mt-2 text-sm font-bold">{language === "TH" ? "เริ่มทำงาน" : "Start"}</span>
                    <span className="text-[10px] text-emerald-50">Pump 2</span>
                  </button>
                  <button onClick={stopPump2FromWeb} className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-800 transition hover:bg-amber-100">
                    <span className="grid h-11 w-11 place-items-center rounded-full border border-amber-300 bg-white"><Cpu className="h-5 w-5" /></span>
                    <span className="mt-2 text-sm font-bold">{language === "TH" ? "หยุดชั่วคราว" : "Pause"}</span>
                    <span className="text-[10px] text-amber-600">Pump 2</span>
                  </button>
                  <button onClick={sendEmergencyStop} className="flex min-h-24 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700 transition hover:bg-red-100">
                    <span className="grid h-11 w-11 place-items-center rounded-full border border-red-300 bg-white"><Siren className="h-5 w-5" /></span>
                    <span className="mt-2 text-sm font-bold">{language === "TH" ? "หยุดฉุกเฉิน" : "Emergency"}</span>
                    <span className="text-[10px] text-red-500">E-STOP</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                  {[
                    { label: t.metrics.ph.title, value: stablePhValue != null ? stablePhValue.toFixed(2) : "--", unit: "", icon: Beaker, accent: "emerald", note: stablePhOk ? (language === "TH" ? "เหมาะสม" : "Suitable") : (language === "TH" ? "รอตรวจสอบ" : "Waiting") },
                    { label: t.metrics.temp.title, value: stableTempValue != null ? stableTempValue.toFixed(1) : "--", unit: "°C", icon: Thermometer, accent: "blue", note: stableTempValue != null ? (language === "TH" ? "ปกติ" : "Normal") : "Waiting" },
                    { label: t.metrics.ec.title, value: stableEcValue != null ? stableEcValue.toFixed(2) : "--", unit: "mS/cm", icon: Zap, accent: "cyan", note: stableEcValue != null ? (language === "TH" ? "เหมาะสม" : "Suitable") : "Waiting" },
                  ].map((metric) => {
                    const Icon = metric.icon;
                    const accent = metric.accent === "blue" ? "bg-blue-50 text-blue-600" : metric.accent === "cyan" ? "bg-cyan-50 text-cyan-600" : "bg-emerald-50 text-emerald-600";
                    return (
                      <div key={metric.label} className="rounded-2xl border border-slate-100 bg-[#f8faf9] p-4">
                        <div className={`grid h-9 w-9 place-items-center rounded-full ${accent}`}><Icon className="h-4 w-4" /></div>
                        <p className="mt-3 truncate text-[11px] font-semibold text-slate-500">{metric.label}</p>
                        <div className="mt-1 flex items-end gap-1"><span className="font-mono text-2xl font-black text-[#082a54]">{metric.value}</span><span className="pb-1 text-[10px] text-slate-500">{metric.unit}</span></div>
                        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{metric.note}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-[#f8faf9] px-4 py-3">
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
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_minmax(500px,1.15fr)_minmax(320px,0.72fr)]">
          <div className="overflow-hidden rounded-[24px] border border-white/80 bg-white/90 p-1 shadow-none">
            <MetricsChart compact />
          </div>
          <Card className="min-h-[340px] rounded-[24px] border-white/80 bg-white/90 shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-slate-900">
                {language === "TH" ? "ภาพรวมการทำงานวันนี้" : "Today's operation overview"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 min-[1680px]:grid-cols-3">
              <section className="rounded-2xl border border-slate-100 bg-[#f8faf9] p-4">
                <p className="text-sm font-bold text-slate-800">
                  {language === "TH" ? "สุขภาพระบบ" : "System health"}
                </p>
                <div className="mt-4 space-y-3 text-xs text-slate-500">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${availableSensorCount === 3 ? "bg-emerald-500" : "bg-amber-400"}`} />{language === "TH" ? "เซนเซอร์" : "Sensors"}</span>
                    <strong className="text-slate-700">{availableSensorCount}/3</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${boardConnected ? "bg-emerald-500" : "bg-slate-300"}`} />{language === "TH" ? "ปั๊มทำงาน" : "Active pumps"}</span>
                    <strong className="text-slate-700">{activePumpCount}/2</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full ${liveSignal ? "bg-emerald-500" : "bg-slate-300"}`} />{language === "TH" ? "การเชื่อมต่อ" : "Connection"}</span>
                    <strong className={liveSignal ? "text-emerald-600" : "text-slate-500"}>{liveSignal ? (language === "TH" ? "ออนไลน์" : "Online") : (language === "TH" ? "ออฟไลน์" : "Offline")}</strong>
                  </div>
                </div>
                <div className="mx-auto mt-4 grid h-24 w-24 place-items-center rounded-full p-[7px]" style={{ background: `conic-gradient(#10b981 ${systemHealthPercent * 3.6}deg, #e2e8f0 0deg)` }}>
                  <div className="grid h-full w-full place-items-center rounded-full bg-white text-center">
                    <div><p className="text-2xl font-black leading-none text-emerald-600">{systemHealthPercent}%</p><p className="mt-1 text-[10px] text-slate-500">{language === "TH" ? "สุขภาพระบบ" : "Health"}</p></div>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-100 bg-[#f8faf9] p-4">
                <p className="text-sm font-bold text-slate-800">
                  {language === "TH" ? "สูตรสารละลาย" : "Nutrient targets"}
                </p>
                {[
                  { label: "pH", target: "6.5–7.5", value: stablePhValue, max: 14, color: "bg-emerald-500" },
                  { label: "EC", target: "1.5–2.0", value: stableEcValue, max: 4, color: "bg-cyan-500" },
                ].map((metric) => {
                  const percentage = metric.value == null ? 0 : Math.min(100, Math.max(0, (metric.value / metric.max) * 100));
                  return (
                    <div key={metric.label} className="mt-5">
                      <div className="flex items-end justify-between gap-2">
                        <div><p className="text-xs font-bold text-slate-700">{metric.label}</p><p className="text-[10px] text-slate-400">{language === "TH" ? "เป้าหมาย" : "Target"} {metric.target}</p></div>
                        <div className="text-right"><p className="text-[10px] text-slate-400">{language === "TH" ? "ปัจจุบัน" : "Current"}</p><p className="text-lg font-black text-slate-800">{metric.value != null ? metric.value.toFixed(metric.label === "pH" ? 2 : 2) : "--"}</p></div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className={`h-full rounded-full transition-all duration-500 ${metric.color}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </section>

              <section className="rounded-2xl border border-slate-100 bg-[#f8faf9] p-4">
                <p className="text-sm font-bold text-slate-800">
                  {language === "TH" ? "ประสิทธิภาพวันนี้" : "Today's performance"}
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    { icon: Droplets, label: language === "TH" ? "อัตราการไหล" : "Flow rate", value: flowRate > 0 ? `${flowRate.toFixed(1)} L/min` : "--" },
                    { icon: Power, label: language === "TH" ? "เวลาออนไลน์" : "Online time", value: formatUptime(uptimeSeconds) },
                    { icon: Bell, label: language === "TH" ? "การแจ้งเตือน" : "Alerts", value: String(activeAlertCount), danger: activeAlertCount > 0 },
                  ].map(({ icon: Icon, label, value, danger }) => (
                    <div key={label} className="flex items-center gap-3 rounded-xl border border-white bg-white/80 p-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${danger ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"}`}><Icon className="h-4 w-4" /></span>
                      <div className="min-w-0"><p className="text-[10px] text-slate-400">{label}</p><p className={`truncate text-sm font-black ${danger ? "text-red-600" : "text-slate-800"}`}>{value}</p></div>
                    </div>
                  ))}
                </div>
              </section>
            </CardContent>
          </Card>
          <Card className="rounded-[24px] border-white/80 bg-white/90 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{language === "TH" ? "กิจกรรมระบบล่าสุด" : "Recent activity"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {[
                { icon: Power, label: language === "TH" ? `ระบบ ${liveSignal ? "พร้อมทำงาน" : "รอสัญญาณ"}` : `System ${liveSignal ? "ready" : "waiting"}`, active: liveSignal },
                { icon: Droplets, label: language === "TH" ? `ระดับน้ำ ${wls2 ? "เหมาะสม" : "กำลังตรวจสอบ"}` : `Water level ${wls2 ? "normal" : "checking"}`, active: wls2 },
                { icon: Beaker, label: language === "TH" ? `ค่า pH ${stablePhOk ? "อยู่ในเกณฑ์" : "รอตรวจสอบ"}` : `pH ${stablePhOk ? "in range" : "waiting"}`, active: stablePhOk },
                { icon: Zap, label: language === "TH" ? `ค่า EC ${stableEcValue != null ? "ได้รับข้อมูลแล้ว" : "รอตรวจสอบ"}` : `EC ${stableEcValue != null ? "received" : "waiting"}`, active: stableEcValue != null },
              ].map(({ icon: Icon, label, active }, index) => (
                <div key={label} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-600">{String(label)}</p>
                  <span className="text-[10px] text-slate-400">{index === 0 ? "now" : "—"}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        </div>
      </main>
    </>
  );
}
