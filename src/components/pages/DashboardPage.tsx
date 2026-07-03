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
  AlertTriangle
} from "lucide-react";
import { MetricsChart } from "../MetricsChart";
import { DigitalTwinModel } from "../dashboard/DigitalTwinModel";
import type { AdminDbDeviceRow } from "@/features/auth/services/authService";


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
    isOn, 
    sendStartCommand,
    stopPump2FromWeb,
    sendEmergencyStop,
    resetUptime,
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
  const activeDevice = devices.find((device) => device.device_id === activeDeviceId);
  const activeDeviceName = activeDevice?.device_name || activeDeviceId || t.noDevice;
  const activeDeviceLocation = activeDevice?.location || "-";
  const waterFullAlarm = boardConnected && redOn;
  const showWaterFullAlarm = waterFullAlarm && !dismissedWaterFullAlarm;
  const stablePhValue = useStablePositiveValue(phValue, boardConnected);
  const stableTempValue = useStablePositiveValue(tempValue, boardConnected);
  const stableEcValue = useStablePositiveValue(ecValue, boardConnected);
  const stablePhOk =
    stablePhValue != null ? stablePhValue >= 6.5 && stablePhValue <= 7.5 : phOk;
  const liveSignal = mqttStatus === "connected" && boardConnected;

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
      <header className="sticky top-0 z-10 border-b border-border/60 bg-card/75 px-4 py-4 backdrop-blur-xl md:px-8 md:py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="flex items-center gap-3 text-lg font-bold tracking-tight text-foreground sm:text-xl md:text-2xl">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/15 text-primary sm:h-9 sm:w-9">
                <Activity className="h-5 w-5" />
              </span>
              {t.title}
            </h1>
            <p className="mt-1 text-xs font-medium text-muted-foreground md:text-sm">{t.subtitle}</p>
          </div>
          <Badge 
            variant={mqttStatus === "connected" && boardConnected ? "default" : "secondary"}
            className={`self-end border px-4 py-1.5 font-mono text-xs sm:self-auto ${mqttStatus === "connected" && boardConnected ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20" : "border-border bg-muted text-muted-foreground"}`}
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
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-auto p-4 md:p-8">
        <Card className="mb-6 rounded-2xl border-emerald-500/20 bg-card/75 shadow-sm backdrop-blur-sm">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {t.activeDevice}
              </p>
              <h2 className="mt-1 text-lg font-bold text-foreground">
                {activeDeviceName}
              </h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="border-border bg-background/70 text-muted-foreground">
                  {t.deviceId}: {activeDeviceId || "-"}
                </Badge>
                <Badge variant="outline" className="border-border bg-background/70 text-muted-foreground">
                  {t.location}: {activeDeviceLocation}
                </Badge>
                {activeDevice?.is_primary && (
                  <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                    Primary
                  </Badge>
                )}
              </div>
            </div>
            <div className="w-full md:w-72">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t.changeDevice}
              </label>
              <select
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground disabled:opacity-60"
                value={activeDeviceId}
                onChange={(event) => onDeviceChange?.(event.target.value)}
                disabled={!devices.length}
              >
                {devices.length === 0 ? (
                  <option value="">{t.noDevice}</option>
                ) : (
                  devices.map((device) => (
                    <option key={String(device.id)} value={device.device_id}>
                      {device.device_name || device.device_id} ({device.device_id})
                    </option>
                  ))
                )}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 grid grid-cols-1 gap-4 md:mb-8">
          <Card className="rounded-2xl border-border/60 bg-card/70 shadow-sm backdrop-blur-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.uptime}</p>
                <p className="mt-1 font-mono text-xl font-semibold text-foreground">{formatUptime(uptimeSeconds)}</p>
              </div>
              <div className="rounded-xl bg-primary/15 p-2 text-primary">
                <Clock3 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Water Quality Metrics */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              title: t.metrics.ph.title,
              value: stablePhValue != null ? stablePhValue.toFixed(2) : "--",
              status: stablePhValue != null ? (stablePhOk ? "OK" : "CHECK") : "WAITING",
              desc: t.metrics.ph.desc,
              icon: Beaker,
              color: "text-blue-500 dark:text-blue-400",
              bgColor: "bg-blue-500/10",
              unit: "",
            },
            {
              title: t.metrics.temp.title,
              value: stableTempValue != null ? stableTempValue.toFixed(1) : "--",
              unit: "C",
              status: stableTempValue != null ? "LIVE" : "WAITING",
              desc: t.metrics.temp.desc,
              icon: Thermometer,
              color: "text-cyan-600 dark:text-cyan-400",
              bgColor: "bg-cyan-500/10",
            },
            {
              title: t.metrics.ec.title,
              value: stableEcValue != null ? stableEcValue.toFixed(2) : "--",
              unit: "mS/cm",
              status: stableEcValue != null ? "LIVE" : "WAITING",
              desc: t.metrics.ec.desc,
              icon: Zap,
              color: "text-yellow-600 dark:text-yellow-400",
              bgColor: "bg-yellow-500/10",
            },
          ].map((metric) => (
            <Card key={metric.title} className="rounded-2xl border-border/70 bg-card/70 shadow-sm backdrop-blur-sm">
              <CardContent className="flex min-h-24 items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${metric.bgColor}`}>
                    <metric.icon className={`h-5 w-5 ${metric.color}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold leading-none text-foreground">{metric.value}</span>
                      {metric.unit && <span className="text-xs font-medium text-muted-foreground">{metric.unit}</span>}
                    </div>
                    <h3 className="mt-1 truncate text-sm font-semibold text-foreground">{metric.title}</h3>
                    <p className="truncate text-[11px] text-muted-foreground">{metric.desc}</p>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 border-border bg-background/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {metric.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Machine Control Section (Hero) */}
        <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-8">
          
          {/* Left Column: Visual Model */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="h-full min-h-[320px] overflow-hidden rounded-2xl border-border/70 bg-card/65 shadow-lg backdrop-blur-xl sm:min-h-[420px] lg:min-h-[500px]">
              <CardContent className="bg-gradient-to-b from-transparent to-background/30 p-3 sm:p-4 lg:p-5">
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

          {/* Right Column: Controls & Pumps */}
          <div className="lg:col-span-5 space-y-6">
            {/* Master Control */}
            <Card className="rounded-2xl border-border/70 bg-card/80 shadow-xl backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Power className="w-5 h-5" />
                  {t.masterControl}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                     <div
                       className={`
                         w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300
                         ${pump2On 
                           ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                           : locked
                             ? "border-red-500/40 bg-red-500/10 text-red-500"
                             : "bg-muted border-border text-muted-foreground"
                         }
                       `}
                     >
                       <Power className={`w-8 h-8 ${pump2On ? "scale-110" : "scale-100"}`} />
                     </div>
                      <div>
                        <h3 className="text-lg font-medium text-foreground">
                          {locked ? (language === "TH" ? "ระบบล็อค" : "Locked") : pump2On ? t.running : t.stopped}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {wls2 ? (language === "TH" ? "น้ำถึง WLS2 พร้อมกดมือ" : "WLS2 ready for manual start") : t.manualMode}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-left sm:text-right">
                      <p className="text-xs text-muted-foreground">{t.uptime}</p>
                      <p className="font-mono text-primary">{formatUptime(uptimeSeconds)}</p>
                      <button
                        type="button"
                        onClick={resetUptime}
                        className="mt-1 inline-flex h-9 w-full items-center justify-center gap-1 rounded-md border border-red-400/30 bg-red-600 px-3 text-[11px] font-bold text-white transition-colors hover:bg-red-500 sm:w-28"
                      >
                        <span>↺</span>
                        {language === "TH" ? "รีเซ็ตเวลา" : "RESET"}
                      </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button onClick={sendStartCommand} className="h-11 bg-emerald-600 text-white hover:bg-emerald-700">
                    <Power className="mr-2 h-4 w-4" />
                    {language === "TH" ? "เริ่มปั๊ม 2" : "Start P2"}
                  </Button>
                  <Button onClick={stopPump2FromWeb} variant="outline" className="h-11 border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300">
                    <Cpu className="mr-2 h-4 w-4" />
                    {language === "TH" ? "หยุดปั๊ม 2" : "Stop P2"}
                  </Button>
                  <Button onClick={sendEmergencyStop} variant="destructive" className="h-11">
                    <Siren className="mr-2 h-4 w-4" />
                    {language === "TH" ? "หยุดฉุกเฉิน" : "E-Stop"}
                  </Button>
                </div>

                {/* Pump Status Grid */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{t.pumpStatus}</h4>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/35 px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">{t.activePumps}</span>
                    <Badge
                      variant={activePumpLabels ? "default" : "secondary"}
                      className={activePumpLabels ? "bg-blue-500 text-white hover:bg-blue-500" : "bg-background text-muted-foreground"}
                    >
                      {activePumpLabels || t.noActivePumps}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 min-[450px]:grid-cols-2 gap-2">
                    {visiblePumpStates.map((active, idx) => {
                      return (
                      <button
                        key={idx}
                        type="button"
                        onClick={idx === 1 ? (active ? stopPump2FromWeb : sendStartCommand) : undefined}
                        className={`
                        flex min-h-[98px] flex-col items-center justify-center rounded-lg border p-2 transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-500/60
                        ${active 
                          ? "bg-blue-500/10 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.1)]" 
                          : "bg-muted/50 border-border opacity-70"
                        }
                      `}>
                         <div className={`w-1.5 h-1.5 rounded-full mb-1.5 ${active ? "bg-blue-500 animate-pulse" : "bg-muted-foreground"}`}></div>
                         <Cpu className={`w-4 h-4 mb-1 ${active ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground"}`} />
                         <span className="text-[9px] text-muted-foreground font-medium text-center leading-tight line-clamp-2 h-6 flex items-center">{t.pumpNames[idx]}</span>
                         <span className="text-[8px] text-muted-foreground font-mono mt-0.5">P{idx + 1}</span>
                         <span className={`mt-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-blue-500 text-white" : "bg-background text-muted-foreground"}`}>
                           {active ? "ON" : "OFF"}
                         </span>
                      </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Sensor Health Status */}
            <Card className="rounded-2xl border-border/70 bg-card/55 shadow-lg">
               <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${!boardConnected ? "bg-muted text-muted-foreground" : locked || floatAlarm ? "bg-red-500/10 text-red-500" : isOn ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                       <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{t.sensorNetwork}</h4>
                      <p className="text-xs text-muted-foreground">
                        {!boardConnected
                          ? (language === "TH" ? "ยังไม่มีสัญญาณสดจากบอร์ด" : "No live board telemetry")
                          : locked
                          ? (language === "TH" ? "หยุดฉุกเฉินและล็อคระบบ" : "Emergency lock active")
                          : floatAlarm
                            ? (language === "TH" ? "ลูกลอยแจ้งเตือน" : "Float alarm")
                            : wls1 || wls2
                              ? t.sensorsOk
                              : t.standby}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                     <span className={`text-xs font-bold px-2 py-1 rounded bg-muted border border-border ${!boardConnected ? "text-muted-foreground" : locked || floatAlarm ? "text-red-500" : isOn ? "text-emerald-500" : "text-muted-foreground"}`}>
                       {!boardConnected ? (language === "TH" ? "ไม่มีสัญญาณ" : "NO SIGNAL") : locked ? "LOCKED" : floatAlarm ? "ALARM" : isOn ? t.statusOnline : t.statusSleep}
                     </span>
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
