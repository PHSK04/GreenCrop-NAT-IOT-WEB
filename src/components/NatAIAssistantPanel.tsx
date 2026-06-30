import {
  Activity,
  AlertTriangle,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Droplets,
  Radio,
  Sparkles,
  Thermometer,
  WifiOff,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type NatAIAssistantPanelProps = {
  language?: string;
  activeDeviceName: string;
  liveSignal: boolean;
  mqttConnected: boolean;
  boardConnected: boolean;
  pump1On: boolean;
  pump2On: boolean;
  locked: boolean;
  redOn: boolean;
  floatAlarm: boolean;
  phValue: number | null;
  ecValue: number | null;
  tempValue: number | null;
  phOk: boolean;
};

const formatValue = (value: number | null, digits: number) =>
  value == null ? "--" : value.toFixed(digits);

export function NatAIAssistantPanel({
  language = "TH",
  activeDeviceName,
  liveSignal,
  mqttConnected,
  boardConnected,
  pump1On,
  pump2On,
  locked,
  redOn,
  floatAlarm,
  phValue,
  ecValue,
  tempValue,
  phOk,
}: NatAIAssistantPanelProps) {
  const isTH = language === "TH";
  const hasAlarm = locked || redOn || floatAlarm || !phOk;
  const activePumps = [pump1On, pump2On].filter(Boolean).length;
  const natMood = hasAlarm ? "alert" : liveSignal ? "online" : "sleep";
  const statusLabel = hasAlarm
    ? isTH ? "ตรวจพบสัญญาณเตือน" : "Alert detected"
    : liveSignal
      ? isTH ? "NAT AI ออนไลน์" : "NAT AI online"
      : isTH ? "รอสัญญาณอุปกรณ์" : "Waiting for device";

  const assistantMessage = hasAlarm
    ? isTH
      ? "ผมพบค่าที่ควรตรวจสอบครับ แนะนำดูสถานะน้ำ, lock, และค่า pH ก่อนเริ่มสั่งงานต่อ"
      : "I found a condition that needs checking. Review water level, lock state, and pH before running commands."
    : liveSignal
      ? isTH
        ? `ผมกำลังเฝ้า ${activeDeviceName} อยู่ครับ ระบบสื่อสารได้ และปั๊มกำลังทำงาน ${activePumps} ตัว`
        : `I am watching ${activeDeviceName}. Telemetry is live and ${activePumps} pump(s) are running.`
      : isTH
        ? "ผมยังไม่ได้รับสัญญาณสดจากบอร์ดครับ ถ้าเพิ่งเปิดเครื่อง รอ sync สักครู่หรือเช็ก MQTT/Wi-Fi"
        : "I do not have live board signal yet. If the device just started, wait for sync or check MQTT/Wi-Fi.";

  const statusItems = [
    {
      icon: mqttConnected ? Radio : WifiOff,
      label: isTH ? "MQTT" : "MQTT",
      value: mqttConnected ? "Connected" : "Offline",
      active: mqttConnected,
    },
    {
      icon: boardConnected ? CheckCircle2 : WifiOff,
      label: isTH ? "บอร์ด" : "Board",
      value: boardConnected ? (isTH ? "เชื่อมต่อ" : "Online") : (isTH ? "ไม่มีสัญญาณ" : "No signal"),
      active: boardConnected,
    },
    {
      icon: Zap,
      label: isTH ? "ปั๊ม" : "Pumps",
      value: `${activePumps}/2`,
      active: activePumps > 0,
    },
  ];

  return (
    <Card className="overflow-hidden rounded-2xl border-emerald-500/25 bg-card shadow-xl">
      <CardContent className="p-0">
        <style>{`
          @keyframes natFloat {
            0%, 100% { transform: translateY(0) rotate(-1deg); }
            50% { transform: translateY(-10px) rotate(1.5deg); }
          }

          @keyframes natArmWave {
            0%, 100% { transform: rotate(-18deg); }
            50% { transform: rotate(20deg); }
          }

          @keyframes natAntenna {
            0%, 100% { transform: rotate(-8deg); }
            50% { transform: rotate(8deg); }
          }

          @keyframes natEyeGlow {
            0%, 100% { opacity: 0.78; box-shadow: 0 0 14px rgba(167, 243, 208, 0.55); }
            50% { opacity: 1; box-shadow: 0 0 28px rgba(34, 211, 238, 0.8); }
          }

          @keyframes natScan {
            0% { transform: translateY(-120%); opacity: 0; }
            18%, 82% { opacity: 0.78; }
            100% { transform: translateY(120%); opacity: 0; }
          }

          @keyframes natOrbital {
            to { transform: rotate(360deg); }
          }

          @keyframes natTypingDot {
            0%, 80%, 100% { transform: translateY(0); opacity: 0.36; }
            40% { transform: translateY(-4px); opacity: 1; }
          }

          .nat-ai-robot {
            animation: natFloat 4.4s ease-in-out infinite;
            transform-origin: 50% 70%;
          }

          .nat-ai-arm-left {
            animation: natArmWave 3.2s ease-in-out infinite;
            transform-origin: 86px 158px;
          }

          .nat-ai-antenna {
            animation: natAntenna 2.6s ease-in-out infinite;
            transform-origin: 146px 44px;
          }

          .nat-ai-eye {
            animation: natEyeGlow 2.1s ease-in-out infinite;
          }

          .nat-ai-scan {
            animation: natScan 3s ease-in-out infinite;
          }

          .nat-ai-ring {
            animation: natOrbital 9s linear infinite;
            transform-origin: 150px 160px;
          }

          .nat-ai-dot {
            animation: natTypingDot 1.4s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .nat-ai-robot,
            .nat-ai-arm-left,
            .nat-ai-antenna,
            .nat-ai-eye,
            .nat-ai-scan,
            .nat-ai-ring,
            .nat-ai-dot {
              animation: none !important;
            }
          }
        `}</style>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(260px,0.95fr)]">
          <div className="relative min-h-[360px] overflow-hidden bg-slate-950 px-4 py-5 text-white sm:px-6">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(45,212,191,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(45,212,191,0.12)_1px,transparent_1px)] bg-[size:34px_34px] opacity-55" />
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-emerald-400/20 to-transparent" />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  NAT Assistant
                </div>
                <h2 className="mt-3 text-xl font-black tracking-tight sm:text-2xl">
                  {isTH ? "ผู้ช่วย AI ประจำเครื่อง" : "Machine AI Companion"}
                </h2>
              </div>
              <Badge className={`${natMood === "alert" ? "bg-amber-500" : natMood === "online" ? "bg-emerald-500" : "bg-slate-600"} text-white hover:bg-emerald-500`}>
                {statusLabel}
              </Badge>
            </div>

            <div className="relative z-10 mx-auto mt-6 h-[250px] w-[300px] max-w-full">
              <svg className="h-full w-full overflow-visible" viewBox="0 0 300 270" role="img" aria-label="NAT AI animated robot">
                <defs>
                  <linearGradient id="natBodyGradient" x1="20%" x2="82%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="54%" stopColor="#166534" />
                    <stop offset="100%" stopColor="#052e16" />
                  </linearGradient>
                  <linearGradient id="natGlassGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                    <stop offset="0%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#14532d" />
                  </linearGradient>
                  <filter id="natSoftGlow">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <g className="nat-ai-ring" opacity="0.7">
                  <ellipse cx="150" cy="160" rx="118" ry="36" fill="none" stroke="#22d3ee" strokeDasharray="10 18" strokeWidth="2" />
                  <circle cx="268" cy="160" r="4" fill="#a7f3d0" />
                </g>

                <g className="nat-ai-robot">
                  <path className="nat-ai-antenna" d="M145 53 C146 35 147 24 160 18" fill="none" stroke="#111827" strokeLinecap="round" strokeWidth="7" />
                  <circle className="nat-ai-antenna" cx="163" cy="17" r="6" fill="#22c55e" filter="url(#natSoftGlow)" />

                  <rect x="58" y="58" width="184" height="112" rx="42" fill="url(#natBodyGradient)" stroke="#0f172a" strokeWidth="5" />
                  <rect x="81" y="77" width="138" height="62" rx="22" fill="url(#natGlassGradient)" opacity="0.9" />
                  <rect className="nat-ai-scan" x="83" y="78" width="134" height="16" rx="8" fill="#a7f3d0" opacity="0.35" />
                  <circle className="nat-ai-eye" cx="114" cy="111" r="13" fill="#dcfce7" />
                  <circle className="nat-ai-eye" cx="186" cy="111" r="13" fill="#dcfce7" />
                  <path d="M128 142 Q150 151 172 142" fill="none" stroke="#020617" strokeLinecap="round" strokeWidth="5" opacity="0.8" />
                  <text x="150" y="105" textAnchor="middle" fill="#f8fafc" fontSize="24" fontWeight="900" letterSpacing="3">NAT</text>

                  <rect x="35" y="94" width="28" height="54" rx="13" fill="#111827" />
                  <rect x="237" y="94" width="28" height="54" rx="13" fill="#111827" />

                  <path className="nat-ai-arm-left" d="M75 158 C51 171 42 193 48 214" fill="none" stroke="#111827" strokeLinecap="round" strokeWidth="13" />
                  <path d="M225 158 C247 170 254 190 247 211" fill="none" stroke="#111827" strokeLinecap="round" strokeWidth="13" />
                  <circle cx="47" cy="218" r="17" fill="#16a34a" stroke="#111827" strokeWidth="5" />
                  <circle cx="247" cy="215" r="17" fill="#16a34a" stroke="#111827" strokeWidth="5" />

                  <rect x="100" y="164" width="100" height="74" rx="36" fill="url(#natBodyGradient)" stroke="#0f172a" strokeWidth="5" />
                  <circle cx="150" cy="198" r="20" fill="#052e16" stroke="#22c55e" strokeWidth="4" />
                  <Sparkles x={139} y={187} width={22} height={22} color="#f8fafc" strokeWidth={2.4} />

                  <path d="M118 234 V250" stroke="#111827" strokeWidth="12" strokeLinecap="round" />
                  <path d="M182 234 V250" stroke="#111827" strokeWidth="12" strokeLinecap="round" />
                  <rect x="92" y="247" width="46" height="17" rx="8" fill="#16a34a" stroke="#111827" strokeWidth="4" />
                  <rect x="162" y="247" width="46" height="17" rx="8" fill="#16a34a" stroke="#111827" strokeWidth="4" />
                </g>
              </svg>
            </div>
          </div>

          <div className="space-y-5 p-4 sm:p-6">
            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-300">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {isTH ? "ข้อความจาก NAT" : "NAT says"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{assistantMessage}</p>
                  <div className="mt-3 flex gap-1.5">
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className="nat-ai-dot h-1.5 w-1.5 rounded-full bg-emerald-500"
                        style={{ animationDelay: `${dot * 0.18}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {statusItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="rounded-xl border border-border bg-background/65 p-3">
                    <Icon className={`h-4 w-4 ${item.active ? "text-emerald-500" : "text-muted-foreground"}`} />
                    <p className="mt-2 text-[11px] font-medium text-muted-foreground">{item.label}</p>
                    <p className="truncate text-sm font-bold text-foreground">{item.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-3">
                <Droplets className="h-4 w-4 text-cyan-500" />
                <p className="mt-2 text-[11px] text-muted-foreground">pH</p>
                <p className={`text-lg font-black ${phOk ? "text-emerald-600 dark:text-emerald-300" : "text-amber-600 dark:text-amber-300"}`}>
                  {formatValue(phValue, 2)}
                </p>
              </div>
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
                <Thermometer className="h-4 w-4 text-sky-500" />
                <p className="mt-2 text-[11px] text-muted-foreground">{isTH ? "อุณหภูมิ" : "Temp"}</p>
                <p className="text-lg font-black text-sky-600 dark:text-sky-300">{formatValue(tempValue, 1)}</p>
              </div>
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-3">
                <Activity className="h-4 w-4 text-violet-500" />
                <p className="mt-2 text-[11px] text-muted-foreground">EC</p>
                <p className="text-lg font-black text-violet-600 dark:text-violet-300">{formatValue(ecValue, 2)}</p>
              </div>
            </div>

            {hasAlarm && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                <p className="text-sm leading-6">
                  {isTH
                    ? "โหมดตัวอย่างนี้ยังเป็นหน้าตา AI ก่อน ยังไม่ส่งคำสั่งแก้ไขเองอัตโนมัติ"
                    : "This preview is visual-first and does not send automatic fix commands yet."}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
