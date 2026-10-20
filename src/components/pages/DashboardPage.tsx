import { useEffect, useState } from "react";
import { useMachine } from "../../contexts/MachineContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Beaker, Zap, Thermometer, Wifi, Droplets, UserRound, ChevronDown, Bell, LogOut, UserCircle, ArrowUpRight, Power, Square, AlertTriangle } from "lucide-react";
import { SensorCharts } from "../dashboard/SensorCharts";
import type { AdminDbDeviceRow } from "@/features/auth/services/authService";
import greenCropLogo from "@/assets/images/3_transparent_logo_green.png";

interface DashboardPageProps {
  language?: string;
  devices?: AdminDbDeviceRow[];
  activeDeviceId?: string;
  onDeviceChange?: (deviceId: string) => void;
  user?: { name: string; email?: string; role?: string; avatar?: string };
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

export function DashboardPage({ language = "EN", devices = [], activeDeviceId = "", onDeviceChange, user, onOpenProfile, onLogout }: DashboardPageProps) {
  const isTH = language === "TH";
  const text = (th: string, en: string) => isTH ? th : en;
  const { phValue, ecValue, tempValue, mqttStatus, boardConnected, lastTelemetryAt } = useMachine();
  const live = mqttStatus === "connected" && boardConnected;
  const [guideMode, setGuideMode] = useState<"manual" | "auto">("manual");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false);
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  useEffect(() => setAvatarLoadFailed(false), [user?.avatar]);
  const t = {
    title: text("แดชบอร์ด", "Dashboard"),
    subtitle: text("คุณภาพน้ำและการทำงานของเครื่อง", "Water quality and machine operation"),
    changeDevice: text("เปลี่ยนอุปกรณ์", "Change device"),
    noDevice: text("ยังไม่มีอุปกรณ์ที่จับคู่", "No paired device"),
  };
  const dashboardNotifications = [{
    title: text(live ? "ได้รับข้อมูลจากเครื่อง" : "รอสัญญาณจากเครื่อง", live ? "Receiving device data" : "Waiting for device"),
    detail: text("สถานะนี้แสดงการเชื่อมต่อข้อมูล ไม่ใช่สถานะปั๊ม", "Connection status does not indicate pump state"),
    active: live,
    icon: Wifi,
  }];
  const notificationCount = live ? 0 : 1;
  const steps = guideMode === "manual" ? [
    [text("ตรวจน้ำต้นทาง", "Check source water"), text("รอลูกลอยยืนยันระดับน้ำคงที่ 5 วินาที", "Wait for the source float to stay stable for 5 seconds")],
    [text("รอปุ่ม Start", "Wait for Start"), text("เครื่องแจ้งเตือนว่าพร้อม แล้วกด Start ที่หน้าตู้", "After the ready signal, press Start at the cabinet")],
    [text("สูบน้ำ", "Transfer water"), text("ปั๊มทำงานเมื่อถังปลายทางยังไม่เต็ม · ไฟเหลืองติด", "Pump runs if the destination is not full · Yellow lamp on")],
    [text("เสร็จสิ้น", "Complete"), text("ลูกลอยปลายทางสั่งหยุดปั๊ม และ Alarm 5 วินาที", "Destination float stops the pump · Alarm for 5 seconds")],
  ] : [
    [text("กด Start", "Press Start"), text("เลือก Auto ที่หน้าตู้ แล้วกด Start", "Select Auto at the cabinet, then press Start")],
    [text("ตรวจน้ำต้นทาง", "Check source water"), text("ตรวจน้ำเพียงพอ และรอระดับน้ำคงที่ 5 วินาที", "Check water availability and wait 5 seconds for a stable level")],
    [text("สูบอัตโนมัติ", "Automatic transfer"), text("เมื่อเงื่อนไขพร้อม ปั๊มเริ่มทำงาน · ไฟเหลืองติด", "Pump starts when conditions are met · Yellow lamp on")],
    [text("เสร็จสิ้น", "Complete"), text("ลูกลอยปลายทางสั่งหยุดปั๊ม และ Alarm 5 วินาที", "Destination float stops the pump · Alarm for 5 seconds")],
  ];
  return (
    <>
      <header className="sticky top-0 z-20 flex min-h-[80px] items-center border-b border-border/60 bg-white/90 px-4 text-foreground backdrop-blur-xl dark:bg-slate-950/90 md:px-6">
        <div className="flex w-full flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-white via-emerald-50 to-cyan-50 shadow-[0_10px_30px_-14px_rgba(5,150,105,0.65)] dark:border-emerald-700/50 dark:from-slate-900 dark:via-emerald-950 dark:to-slate-900">
              <span className="absolute inset-1 rounded-xl border border-white/80 dark:border-white/10" />
              <img
                src={greenCropLogo}
                alt="GreenCropNAT"
                className="relative h-10 w-10 object-contain contrast-125 saturate-125"
              />
            </span>
            <div className="min-w-0">
              <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-600/80 dark:text-emerald-400">
                Smart Hydroponic Control
              </span>
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {t.title}
              </h1>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.subtitle}</p>
            </div>
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
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
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
              <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-emerald-200 bg-emerald-500 text-white shadow-sm">
                {user?.avatar && !avatarLoadFailed ? (
                  <img
                    src={user.avatar}
                    alt={user.name || (language === "TH" ? "รูปโปรไฟล์ผู้ใช้งาน" : "User profile")}
                    className="h-full w-full object-cover"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <UserRound className="h-4 w-4" />
                )}
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

      <main className="flex-1 overflow-auto bg-[#f7f9f8] px-4 py-6 dark:bg-slate-950 md:px-8 md:py-8">
        <div className="mx-auto max-w-[1440px] space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-medium text-emerald-600">GREENCROP NAT</p><h2 className="mt-1 text-2xl font-semibold tracking-tight">{text("ภาพรวมเครื่องของคุณ", "Your machine at a glance")}</h2></div>
            <p className="text-xs text-muted-foreground">{text("ข้อมูลล่าสุด", "Last received")} · {lastTelemetryAt ? new Date(lastTelemetryAt).toLocaleString(isTH ? "th-TH" : "en-GB") : "—"}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: text("ความเป็นกรด–ด่าง", "Acidity"), name: "pH", value: phValue, digits: 2, unit: "pH", icon: Beaker },
              { label: text("การนำไฟฟ้า", "Conductivity"), name: "EC", value: ecValue, digits: 2, unit: "mS/cm", icon: Zap },
              { label: text("อุณหภูมิน้ำ", "Water temperature"), name: "Temp", value: tempValue, digits: 1, unit: "°C", icon: Thermometer },
            ].map(({ name, label, value, digits, unit, icon: Icon }) => (
              <section key={name} className="rounded-2xl border border-border/70 bg-card p-5 md:p-6">
                <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-emerald-600" /></div>
                <div className="mt-5 flex items-baseline gap-2"><span className="text-4xl font-medium tracking-tight tabular-nums">{live && Number.isFinite(value) && value > 0 ? value.toFixed(digits) : "—"}</span><span className="text-sm text-muted-foreground">{unit}</span></div>
                <p className="mt-3 text-xs text-muted-foreground">{text(live ? "ค่าที่เครื่องส่งล่าสุด" : "รอข้อมูลจากอุปกรณ์", live ? "Latest device reading" : "Waiting for device data")}</p>
              </section>
            ))}
          </div>

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
              <SensorCharts language={language} />
            </section>
            <aside className="space-y-5">
              <section className="rounded-2xl border border-border/70 bg-card p-6">
                <div className="flex items-center gap-2"><Power className="h-4 w-4 text-emerald-600" /><h2 className="font-semibold">{text("ควบคุมการทำงาน", "Machine control")}</h2></div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{text("เลือกโหมดและสั่งเริ่ม–หยุดจากหน้าตู้", "Select the mode and start or stop at the cabinet")}</p>
                <dl className="mt-5 divide-y divide-border text-sm">
                  {[
                    [text("โหมดปัจจุบัน", "Current mode"), text("ยังไม่มีข้อมูลจากเครื่อง", "Not reported by device")],
                    [text("ขั้นตอนปัจจุบัน", "Current step"), text("ยังไม่มีข้อมูลจากเครื่อง", "Not reported by device")],
                  ].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3"><dt className="text-muted-foreground">{label}</dt><dd className="text-right text-xs leading-5">{value}</dd></div>)}
                </dl>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button disabled className="gap-2"><Power className="h-4 w-4" />Start</Button>
                  <Button disabled variant="outline" className="gap-2"><Square className="h-4 w-4" />Stop</Button>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{text("เฟิร์มแวร์ปัจจุบันส่งค่าเซนเซอร์เท่านั้น ยังไม่รองรับคำสั่งจากเว็บไซต์", "Current firmware reports sensor readings only. Web commands are not supported yet.")}</p>
              </section>
              <section className="rounded-2xl border border-border/70 bg-card p-6">
                <h3 className="text-sm font-semibold">{text("ไฟแสดงสถานะหน้าตู้", "Cabinet indicator lamps")}</h3>
                <div className="mt-4 space-y-3 text-sm">
                  {[
                    ["bg-white border border-slate-300", "Manual", text("ควบคุมเอง", "Manual mode")],
                    ["bg-emerald-500", "Auto", text("อัตโนมัติ", "Auto mode")],
                    ["bg-amber-400", text("ปั๊มทำงาน", "Pumping"), text("กำลังสูบน้ำ", "Water transfer")],
                  ].map(([color, label, detail]) => <div key={label} className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${color}`} /><span>{label}</span><span className="ml-auto text-xs text-muted-foreground">{detail}</span></div>)}
                </div>
                <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">{text("คำอธิบายสีไฟ ไม่ใช่สถานะไฟแบบสด", "Lamp guide · Not live lamp status")}</p>
              </section>
            </aside>
          </div>

          <section className="rounded-2xl border border-border/70 bg-card p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><h2 className="font-semibold">{text("ขั้นตอนการใช้งาน", "How to operate")}</h2><p className="mt-1 text-xs text-muted-foreground">{text("คู่มือการทำงานของเครื่อง · เลือกดูขั้นตอนตามโหมด", "Operation guide · Choose a mode to view its sequence")}</p></div>
              <div className="flex gap-1 rounded-xl bg-muted p-1" role="group" aria-label={text("ดูคู่มือตามโหมด", "Operation guide mode")}>
                {(["manual", "auto"] as const).map(mode => <Button key={mode} size="sm" variant={guideMode === mode ? "secondary" : "ghost"} aria-pressed={guideMode === mode} onClick={() => setGuideMode(mode)}>{mode === "manual" ? "Manual" : "Auto"}</Button>)}
              </div>
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-xl bg-muted/50 p-4"><Droplets className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="text-sm font-medium">{text("เตรียมน้ำและสารละลาย", "Prepare water and solution")}</p><p className="mt-1 text-xs leading-6 text-muted-foreground">{text("เติมน้ำในถังด้านบน แล้วเติมกรดซิตริก, Sodium bicarbonate หรือสารอาหารที่ต้องการ น้ำไหลลงฐานผสมเพื่อให้สารละลายและกระจายตัว จากนั้นเซนเซอร์วัด pH, EC และอุณหภูมิ", "Fill the upper tank and add the required citric acid, sodium bicarbonate or plant nutrients. Water flows into the mixing base, where the solution mixes before pH, EC and temperature are measured.")}</p></div></div>
            <ol className="mt-6 grid gap-6 md:grid-cols-4">
              {steps.map(([title, detail], index) => <li key={title} className="relative"><div className="mb-3 flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{index + 1}</span>{index < 3 && <ArrowUpRight className="h-4 w-4 text-muted-foreground/50" />}</div><h3 className="text-sm font-medium">{title}</h3><p className="mt-2 text-xs leading-6 text-muted-foreground">{detail}</p></li>)}
            </ol>
            <div className="mt-6 grid gap-4 border-t border-border pt-5 text-xs leading-6 text-muted-foreground sm:grid-cols-2">
              <p className="flex items-start gap-2"><Square className="mt-1 h-4 w-4 shrink-0" /><span>{text("Stop หยุดปั๊มและปิด Alarm ทันที แล้วกลับไปรอเริ่มใหม่ วงจร Stop แบบ NC จะหยุดเครื่องเมื่อสายสัญญาณขาดด้วย", "Stop immediately turns off the pump and alarm, then returns to waiting. The NC stop circuit also stops the machine if its wire breaks.")}</span></p>
              <p className="flex items-start gap-2"><AlertTriangle className="mt-1 h-4 w-4 shrink-0" /><span>{text("เลือก Manual หรือ Auto เพียงโหมดเดียว หากเลือกทั้งสองโหมดหรือไม่เลือกเลย เครื่องจะเข้าสู่ Fault", "Select exactly one mode. Selecting both modes or neither puts the machine into Fault.")}</span></p>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
