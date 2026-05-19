import { useMemo } from "react";
import { useMachine } from "../../contexts/MachineContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Droplets,
  Gauge,
  Power,
  Radio,
  Siren,
  Thermometer,
  Waves,
} from "lucide-react";
import type { AdminDbDeviceRow } from "@/features/auth/services/authService";

interface DashboardPageProps {
  language?: string;
  devices?: AdminDbDeviceRow[];
  activeDeviceId?: string;
  onDeviceChange?: (deviceId: string) => void;
}

const translations = {
  EN: {
    title: "GreenCrop Remote Panel",
    subtitle: "Web = remote button, board = main controller",
    activeDevice: "Active Device",
    changeDevice: "Change device",
    noDevice: "No paired device selected",
    deviceId: "Device ID",
    location: "Location",
    online: "MQTT Connected",
    offline: "MQTT Disconnected",
    lastUpdate: "Last telemetry",
    manualControl: "Manual Remote Control",
    manualDesc: "Commands must behave like pressing the real buttons on the machine.",
    startPump2: "Start Pump 2",
    stopPump2: "Stop Pump 2",
    emergencyStop: "Emergency Stop",
    resetUptime: "Reset Uptime",
    machineLocked: "Locked by emergency stop",
    machineReady: "Ready for manual command",
    machineWaiting: "Waiting for water level / process logic",
    telemetry: "Live Telemetry",
    telemetryDesc: "Values coming from the ESP32 through MQTT.",
    history: "Auto Saved History",
    historyDesc: "Latest snapshots saved automatically in the browser.",
    noHistory: "No telemetry saved yet",
    uptime: "Pump 2 Uptime",
    states: {
      wls1: "WLS1 Lower",
      wls2: "WLS2 Upper",
      floatAlarm: "Float Alarm",
      locked: "Locked",
      pump1: "Pump 1",
      pump2: "Pump 2",
      green: "Green Lamp",
      red: "Red Lamp",
      phOk: "pH Ready",
    },
    values: {
      ph: "pH",
      ec: "EC",
      temp: "Temperature",
    },
    on: "ON",
    off: "OFF",
    normal: "Normal",
    alarm: "Alarm",
  },
  TH: {
    title: "แผงรีโมต GreenCrop",
    subtitle: "เว็บ = ปุ่มรีโมต, ตัวเครื่อง = สมองหลัก",
    activeDevice: "อุปกรณ์ที่กำลังใช้งาน",
    changeDevice: "เปลี่ยนอุปกรณ์",
    noDevice: "ยังไม่ได้เลือกอุปกรณ์ที่จับคู่",
    deviceId: "Device ID",
    location: "ตำแหน่ง",
    online: "MQTT เชื่อมต่อแล้ว",
    offline: "MQTT ยังไม่เชื่อมต่อ",
    lastUpdate: "อัปเดตล่าสุด",
    manualControl: "ปุ่มรีโมตควบคุม",
    manualDesc: "การกดจากหน้าเว็บต้องทำงานเหมือนกดปุ่มจริงที่หน้าเครื่อง",
    startPump2: "เริ่มปั๊ม 2",
    stopPump2: "หยุดปั๊ม 2",
    emergencyStop: "หยุดฉุกเฉิน",
    resetUptime: "รีเซ็ตเวลา",
    machineLocked: "ระบบล็อคจากปุ่มฉุกเฉิน",
    machineReady: "พร้อมรับคำสั่งแบบกดมือ",
    machineWaiting: "กำลังรอเงื่อนไขระดับน้ำ/ลอจิกระบบ",
    telemetry: "ค่าที่วัดได้จริง",
    telemetryDesc: "ค่าที่บอร์ด ESP32 ส่งกลับมาผ่าน MQTT",
    history: "ประวัติที่บันทึกอัตโนมัติ",
    historyDesc: "บันทึก snapshot ล่าสุดอัตโนมัติในเบราว์เซอร์",
    noHistory: "ยังไม่มีข้อมูลที่บันทึกไว้",
    uptime: "เวลาทำงานปั๊ม 2",
    states: {
      wls1: "WLS1 ล่าง",
      wls2: "WLS2 บน",
      floatAlarm: "ลูกลอยเตือน",
      locked: "ล็อคระบบ",
      pump1: "ปั๊ม 1",
      pump2: "ปั๊ม 2",
      green: "ไฟเขียว",
      red: "ไฟแดง",
      phOk: "pH พร้อมทำงาน",
    },
    values: {
      ph: "ค่า pH",
      ec: "ค่า EC",
      temp: "อุณหภูมิ",
    },
    on: "ทำงาน",
    off: "หยุด",
    normal: "ปกติ",
    alarm: "เตือน",
  },
};

const formatUptime = (seconds: number) => {
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

const formatTimestamp = (value: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
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
    sendEmergencyStop,
    stopPump2FromWeb,
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
    greenOn,
    redOn,
    phOk,
    lastTelemetryAt,
    telemetryHistory,
    mqttStatus,
  } = useMachine();

  const activeDevice = devices.find((device) => device.device_id === activeDeviceId);
  const activeDeviceName = activeDevice?.device_name || activeDeviceId || t.noDevice;
  const activeDeviceLocation = activeDevice?.location || "-";

  const statusTone = locked
    ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
    : wls2
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";

  const machineSummary = locked
    ? t.machineLocked
    : wls2
      ? t.machineReady
      : t.machineWaiting;

  const stateCards = useMemo(
    () => [
      { label: t.states.wls1, active: wls1 },
      { label: t.states.wls2, active: wls2 },
      { label: t.states.floatAlarm, active: floatAlarm, alarm: true },
      { label: t.states.locked, active: locked, alarm: true },
      { label: t.states.pump1, active: pump1On },
      { label: t.states.pump2, active: pump2On },
      { label: t.states.green, active: greenOn },
      { label: t.states.red, active: redOn, alarm: true },
      { label: t.states.phOk, active: phOk },
    ],
    [floatAlarm, greenOn, locked, phOk, pump1On, pump2On, redOn, t.states.floatAlarm, t.states.green, t.states.locked, t.states.phOk, t.states.pump1, t.states.pump2, t.states.red, t.states.wls1, t.states.wls2, wls1, wls2],
  );

  const latestHistory = telemetryHistory.slice(0, 6);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border/60 bg-card/80 px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-xl font-bold text-foreground md:text-2xl">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Radio className="h-5 w-5" />
              </span>
              {t.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={mqttStatus === "connected" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"}>
              {mqttStatus === "connected" ? t.online : t.offline}
            </Badge>
            <Badge variant="outline" className={statusTone}>
              {machineSummary}
            </Badge>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-auto p-4 md:p-8">
        <Card className="mb-6 rounded-2xl border-emerald-500/20 bg-card/75 shadow-sm backdrop-blur-sm">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                {t.activeDevice}
              </p>
              <h2 className="mt-1 text-lg font-bold text-foreground">{activeDeviceName}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="border-border bg-background/70 text-muted-foreground">
                  {t.deviceId}: {activeDeviceId || "-"}
                </Badge>
                <Badge variant="outline" className="border-border bg-background/70 text-muted-foreground">
                  {t.location}: {activeDeviceLocation}
                </Badge>
                <Badge variant="outline" className="border-border bg-background/70 text-muted-foreground">
                  {t.lastUpdate}: {formatTimestamp(lastTelemetryAt)}
                </Badge>
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

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card className="rounded-2xl border-border/70 bg-card/80 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Power className="h-5 w-5" />
                  {t.manualControl}
                </CardTitle>
                <CardDescription>{t.manualDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button onClick={sendStartCommand} className="h-14 justify-start rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                    <Power className="mr-2 h-4 w-4" />
                    {t.startPump2}
                  </Button>
                  <Button onClick={stopPump2FromWeb} variant="outline" className="h-14 justify-start rounded-xl border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300">
                    <Waves className="mr-2 h-4 w-4" />
                    {t.stopPump2}
                  </Button>
                  <Button onClick={sendEmergencyStop} variant="destructive" className="h-14 justify-start rounded-xl">
                    <Siren className="mr-2 h-4 w-4" />
                    {t.emergencyStop}
                  </Button>
                  <Button onClick={resetUptime} variant="outline" className="h-14 justify-start rounded-xl">
                    <Clock3 className="mr-2 h-4 w-4" />
                    {t.resetUptime}
                  </Button>
                </div>

                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.uptime}</p>
                      <p className="mt-1 font-mono text-2xl font-semibold text-foreground">{formatUptime(uptimeSeconds)}</p>
                    </div>
                    <Badge variant="outline" className={statusTone}>
                      {machineSummary}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 bg-card/75 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Activity className="h-5 w-5" />
                  {t.telemetry}
                </CardTitle>
                <CardDescription>{t.telemetryDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Gauge className="h-4 w-4" />
                      {t.values.ph}
                    </div>
                    <p className="mt-2 text-3xl font-bold text-foreground">{phValue.toFixed(2)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Droplets className="h-4 w-4" />
                      {t.values.ec}
                    </div>
                    <p className="mt-2 text-3xl font-bold text-foreground">{ecValue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">mS/cm</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/70 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Thermometer className="h-4 w-4" />
                      {t.values.temp}
                    </div>
                    <p className="mt-2 text-3xl font-bold text-foreground">{tempValue.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">°C</p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {stateCards.map((item) => (
                    <div
                      key={item.label}
                      className={`rounded-xl border p-3 ${
                        item.active
                          ? item.alarm
                            ? "border-red-500/30 bg-red-500/10"
                            : "border-emerald-500/30 bg-emerald-500/10"
                          : "border-border bg-background/70"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-foreground">{item.label}</span>
                        <Badge variant="outline" className={item.active ? (item.alarm ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400") : "border-border bg-muted text-muted-foreground"}>
                          {item.active ? (item.alarm ? t.alarm : t.on) : t.off}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-2xl border-border/70 bg-card/75 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="h-5 w-5" />
                  {t.history}
                </CardTitle>
                <CardDescription>{t.historyDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                {latestHistory.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-background/60 p-6 text-center text-sm text-muted-foreground">
                    {t.noHistory}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {latestHistory.map((entry) => (
                      <div key={`${entry.timestamp}-${entry.deviceId}`} className="rounded-xl border border-border bg-background/70 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">{formatTimestamp(entry.timestamp)}</span>
                          <Badge variant="outline" className={entry.locked ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"}>
                            {entry.locked ? t.alarm : t.normal}
                          </Badge>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-[11px] text-muted-foreground">{t.values.ph}</p>
                            <p className="font-semibold text-foreground">{entry.phValue.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">{t.values.ec}</p>
                            <p className="font-semibold text-foreground">{entry.ecValue.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-muted-foreground">{t.values.temp}</p>
                            <p className="font-semibold text-foreground">{entry.tempValue.toFixed(1)}°C</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                          <span>WLS1: {entry.wls1 ? t.on : t.off}</span>
                          <span>WLS2: {entry.wls2 ? t.on : t.off}</span>
                          <span>P1: {entry.pump1On ? t.on : t.off}</span>
                          <span>P2: {entry.pump2On ? t.on : t.off}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/70 bg-card/75 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <AlertTriangle className="h-5 w-5" />
                  Manual Logic
                </CardTitle>
                <CardDescription>
                  {language === "TH"
                    ? "หน้าเว็บเป็นรีโมต ส่วนบอร์ดเป็นตัวตัดสินการทำงานจริงตาม WLS, pH, Float, และ Stop NC"
                    : "The web page acts as a remote. The board remains the source of truth for WLS, pH, float, and Stop NC logic."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{language === "TH" ? "กด เริ่มปั๊ม 2 = เหมือนกด Start ที่หน้าเครื่อง" : "Start Pump 2 = same as pressing the physical Start button."}</p>
                <p>{language === "TH" ? "กด หยุดฉุกเฉิน = เหมือนกด Stop ที่หน้าเครื่อง และระบบต้องล็อค" : "Emergency Stop = same as the physical Stop button and should lock the system."}</p>
                <p>{language === "TH" ? "ถ้า WLS2 ยังไม่ถึงหรือระบบยังล็อคอยู่ หน้าเว็บจะแสดงสถานะตามที่บอร์ดตอบกลับ" : "If WLS2 has not reached the target or the system remains locked, the board reply stays authoritative."}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
