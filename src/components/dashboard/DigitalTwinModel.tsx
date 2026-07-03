type DigitalTwinModelProps = {
  language?: string;
  liveSignal: boolean;
  locked: boolean;
  floatAlarm: boolean;
  redOn: boolean;
  wls1: boolean;
  wls2: boolean;
  pump1On: boolean;
  pump2On: boolean;
  phValue: number | null;
  ecValue: number | null;
  tempValue: number | null;
  phOk: boolean;
};

const COLORS = {
  cyan: "#06b6d4",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  slate: "#64748b",
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

const formatValue = (value: number | null, digits: number) =>
  value == null ? "--" : value.toFixed(digits);

export function DigitalTwinModel({
  language = "EN",
  liveSignal,
  locked,
  floatAlarm,
  redOn,
  wls1,
  wls2,
  pump1On,
  pump2On,
  phValue,
  ecValue,
  tempValue,
  phOk,
}: DigitalTwinModelProps) {
  const isTH = language === "TH";
  const alarmOn = locked || floatAlarm || redOn;
  const readyForPump2 = liveSignal && wls2 && !pump2On && !locked;
  const flowToTank2 = liveSignal && pump1On;
  const flowToGrowBed = liveSignal && pump2On;
  const tank1Level = liveSignal ? (wls1 ? 72 : flowToTank2 ? 48 : 22) : 14;
  const tank2Level = liveSignal ? (wls2 ? 84 : flowToTank2 ? 58 : flowToGrowBed ? 46 : 24) : 14;
  const growBedLevel = liveSignal ? (alarmOn ? 92 : flowToGrowBed ? 68 : 34) : 20;
  const statusColor = locked || alarmOn
    ? COLORS.red
    : flowToGrowBed
      ? COLORS.amber
      : readyForPump2
        ? COLORS.green
        : flowToTank2
          ? COLORS.cyan
          : COLORS.slate;
  const statusText = locked
    ? isTH ? "ระบบล็อค" : "Locked"
    : alarmOn
      ? isTH ? "มีสัญญาณเตือน" : "Alarm"
      : flowToGrowBed
        ? isTH ? "P2 ส่งน้ำไปบ่อเพาะ" : "P2 feeding grow bed"
        : readyForPump2
          ? isTH ? "ถัง 2 พร้อมเริ่ม P2" : "Tank 2 ready for P2"
          : flowToTank2
            ? isTH ? "P1 เติมน้ำเข้าถัง 2" : "P1 filling tank 2"
            : liveSignal
              ? isTH ? "พร้อมทำงาน" : "Ready"
              : isTH ? "รอสัญญาณจริง" : "Waiting for signal";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950 p-3 text-slate-100 shadow-inner sm:p-4">
      <style>{`
        @keyframes twinFlow {
          from { background-position: 0 0; }
          to { background-position: 64px 0; }
        }

        @keyframes twinSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes twinPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .36; }
        }

        @keyframes twinWave {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .twin-grid {
          background-image:
            linear-gradient(rgba(20,184,166,0.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(20,184,166,0.12) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .twin-flow-on {
          animation: twinFlow 1.05s linear infinite;
        }

        .twin-spin-on {
          animation: twinSpin .8s linear infinite;
          transform-origin: center;
        }

        .twin-pulse-on {
          animation: twinPulse .8s ease-in-out infinite;
        }

        .twin-wave-on {
          animation: twinWave 2.3s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .twin-flow-on,
          .twin-spin-on,
          .twin-pulse-on,
          .twin-wave-on {
            animation: none !important;
          }
        }
      `}</style>

      <div className="twin-grid pointer-events-none absolute inset-0 opacity-45" />

      <div className="relative z-10 grid min-h-[560px] gap-3 sm:min-h-[520px]">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2">
          <div className="flex flex-wrap gap-2">
            <TwinLed label="ALARM" color={COLORS.red} on={alarmOn} />
            <TwinLed label="P1" color={COLORS.cyan} on={flowToTank2} />
            <TwinLed label="READY" color={COLORS.green} on={readyForPump2} />
            <TwinLed label="P2" color={COLORS.amber} on={flowToGrowBed} />
          </div>
          <div
            className="inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 py-1 text-xs font-bold"
            style={{
              borderColor: `${statusColor}40`,
              background: `${statusColor}18`,
              color: statusColor,
            }}
          >
            <span
              className={alarmOn || flowToTank2 || flowToGrowBed ? "twin-pulse-on h-2 w-2 rounded-full" : "h-2 w-2 rounded-full"}
              style={{ background: statusColor, boxShadow: `0 0 10px ${statusColor}` }}
            />
            {statusText}
          </div>
        </div>

        <div className="rounded-xl border border-emerald-400/20 bg-slate-900/75 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              {isTH ? "ถัง 3 / บ่อเพาะเลี้ยง" : "Tank 3 / Grow Bed"}
            </span>
            <TwinSensorBadge label="WLS3" active={growBedLevel > 30} color={COLORS.green} />
          </div>
          <HorizontalTank level={growBedLevel} active={flowToGrowBed} color={COLORS.green} />
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_180px_1fr] lg:items-end">
          <TankCard
            name={isTH ? "ถัง 1" : "Tank 1"}
            sub="Raw Water"
            level={tank1Level}
            sensorLabel="WLS1"
            sensorOn={liveSignal && wls1}
            color={COLORS.cyan}
          />

          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-700/70 bg-slate-900/80 p-3">
            <FlowPipe active={flowToTank2} color={COLORS.cyan} />
            <PumpUnit active={flowToTank2 || flowToGrowBed} color={flowToGrowBed ? COLORS.amber : COLORS.cyan} label={isTH ? "ชุดปั๊มน้ำ" : "Pump Unit"} />
            <FlowPipe active={flowToGrowBed} color={COLORS.green} />
            <div className="grid w-full grid-cols-2 gap-2 text-center text-[10px] font-bold">
              <span className={`rounded-md px-2 py-1 ${pump1On ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                P1 {pump1On ? "ON" : "OFF"}
              </span>
              <span className={`rounded-md px-2 py-1 ${pump2On ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-400"}`}>
                P2 {pump2On ? "ON" : "OFF"}
              </span>
            </div>
          </div>

          <TankCard
            name={isTH ? "ถัง 2" : "Tank 2"}
            sub="Preparation"
            level={tank2Level}
            sensorLabel="WLS2"
            sensorOn={liveSignal && wls2}
            color="#38bdf8"
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <MetricTile
            label="pH"
            value={formatValue(phValue, 2)}
            status={phOk ? "OK" : "CHECK"}
            color={phOk ? COLORS.green : COLORS.amber}
          />
          <MetricTile
            label="EC"
            value={`${formatValue(ecValue, 2)} mS/cm`}
            status={ecValue == null ? "WAIT" : "LIVE"}
            color={COLORS.cyan}
          />
          <MetricTile
            label={isTH ? "อุณหภูมิ" : "Temp"}
            value={`${formatValue(tempValue, 1)} C`}
            status={tempValue == null ? "WAIT" : "LIVE"}
            color={tempValue != null && tempValue >= 30 ? COLORS.amber : COLORS.green}
          />
        </div>
      </div>
    </div>
  );
}

function TwinLed({ label, color, on }: { label: string; color: string; on: boolean }) {
  return (
    <div
      className="inline-flex min-h-7 items-center gap-2 rounded-md border px-2.5 text-[10px] font-bold"
      style={{
        borderColor: on ? `${color}55` : "rgba(148, 163, 184, 0.18)",
        background: on ? `${color}18` : "rgba(15, 23, 42, 0.6)",
        color: on ? color : "#94a3b8",
      }}
    >
      <span
        className={on ? "twin-pulse-on h-2 w-2 rounded-full" : "h-2 w-2 rounded-full"}
        style={{
          background: on ? color : "#475569",
          boxShadow: on ? `0 0 9px ${color}` : "none",
        }}
      />
      {label}
    </div>
  );
}

function TwinSensorBadge({ label, active, color }: { label: string; active: boolean; color: string }) {
  return (
    <span
      className="inline-flex min-h-6 items-center gap-1.5 rounded-md border px-2 text-[10px] font-bold"
      style={{
        borderColor: active ? `${color}45` : "rgba(148, 163, 184, 0.18)",
        background: active ? `${color}15` : "rgba(15, 23, 42, 0.45)",
        color: active ? color : "#94a3b8",
      }}
    >
      <span
        className={active ? "twin-pulse-on h-1.5 w-1.5 rounded-full" : "h-1.5 w-1.5 rounded-full"}
        style={{ background: active ? color : "#475569" }}
      />
      {label}: {active ? "ON" : "OFF"}
    </span>
  );
}

function HorizontalTank({ level, active, color }: { level: number; active: boolean; color: string }) {
  const width = clamp(level);

  return (
    <div className="flex items-stretch">
      <div className="w-4 rounded-l-xl border border-r-0 border-slate-600 bg-gradient-to-r from-slate-700 to-slate-300" />
      <div className="relative h-20 flex-1 overflow-hidden border-y border-slate-600 bg-slate-950/85">
        <div
          className="absolute inset-y-0 left-0 transition-all duration-700"
          style={{
            width: `${width}%`,
            background: `linear-gradient(180deg, ${color}cc 0%, ${color}86 48%, ${color}50 100%)`,
          }}
        >
          <svg
            viewBox="0 0 200 16"
            preserveAspectRatio="none"
            className={active ? "twin-wave-on absolute right-0 top-0 h-4 w-[200%]" : "absolute right-0 top-0 h-4 w-[200%]"}
            style={{ fill: color }}
          >
            <path d="M0 8 Q25 0 50 8 T100 8 T150 8 T200 8 V16 H0 Z" />
          </svg>
        </div>
        <div className="absolute inset-0 grid place-items-center text-lg font-black text-slate-100">
          {Math.round(level)}<span className="text-xs text-slate-400">%</span>
        </div>
      </div>
      <div className="w-4 rounded-r-xl border border-l-0 border-slate-600 bg-gradient-to-r from-slate-300 to-slate-700" />
    </div>
  );
}

function TankCard({
  name,
  sub,
  level,
  sensorLabel,
  sensorOn,
  color,
}: {
  name: string;
  sub: string;
  level: number;
  sensorLabel: string;
  sensorOn: boolean;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-900/80 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-bold text-slate-100">{name}</div>
          <div className="text-[10px] text-slate-400">{sub}</div>
        </div>
        <TwinSensorBadge label={sensorLabel} active={sensorOn} color={color} />
      </div>

      <div className="mx-auto w-28">
        <div className="mx-auto h-3 w-24 rounded-[50%] border border-slate-500 bg-gradient-to-b from-slate-100 to-slate-500" />
        <div className="relative h-36 overflow-hidden rounded-b-xl border border-slate-600 bg-slate-950/85 shadow-inner">
          <div
            className="absolute inset-x-0 bottom-0 transition-all duration-700"
            style={{
              height: `${clamp(level)}%`,
              background: `linear-gradient(180deg, ${color}cc 0%, ${color}88 45%, ${color}55 100%)`,
            }}
          >
            <svg
              viewBox="0 0 200 14"
              preserveAspectRatio="none"
              className="twin-wave-on absolute left-0 top-[-7px] h-3.5 w-[200%]"
              style={{ fill: color }}
            >
              <path d="M0 7 Q25 0 50 7 T100 7 T150 7 T200 7 V14 H0 Z" />
            </svg>
          </div>
          <div className="absolute inset-y-0 left-4 w-2 bg-white/20" />
          <div className="absolute inset-0 grid place-items-center text-xl font-black text-slate-100">
            {Math.round(level)}<span className="text-xs text-slate-400">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FlowPipe({ active, color }: { active: boolean; color: string }) {
  return (
    <div
      className={active ? "twin-flow-on h-2 w-full rounded-full" : "h-2 w-full rounded-full"}
      style={{
        background: active
          ? `linear-gradient(90deg, transparent 0 20%, ${color} 35% 55%, transparent 70% 100%)`
          : "repeating-linear-gradient(90deg, rgba(148,163,184,.28) 0 12px, transparent 12px 22px)",
        backgroundSize: active ? "64px 100%" : undefined,
        boxShadow: active ? `0 0 14px ${color}66` : "none",
      }}
    />
  );
}

function PumpUnit({ active, color, label }: { active: boolean; color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 72 72" className="h-20 w-20" style={{ filter: active ? `drop-shadow(0 0 16px ${color}70)` : "none" }}>
        <rect x="13" y="39" width="14" height="10" rx="3" fill="#475569" />
        <rect x="23" y="18" width="36" height="36" rx="12" fill="#94a3b8" stroke="#cbd5e1" strokeWidth="1.5" />
        <circle cx="41" cy="38" r="14" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
        <g className={active ? "twin-spin-on" : ""}>
          <path d="M41 38 L41 26 Q50 29 50 38 Z" fill={active ? color : "#64748b"} />
          <path d="M41 38 L53 38 Q50 47 41 47 Z" fill={active ? color : "#64748b"} />
          <path d="M41 38 L41 50 Q32 47 32 38 Z" fill={active ? color : "#64748b"} />
          <path d="M41 38 L29 38 Q32 29 41 29 Z" fill={active ? color : "#64748b"} />
        </g>
        <circle cx="41" cy="38" r="3" fill="#e2e8f0" />
        <circle cx="41" cy="20" r="4" fill={active ? color : "#475569"} />
      </svg>
      <span className="text-center text-[11px] font-bold text-slate-300">{label}</span>
    </div>
  );
}

function MetricTile({
  label,
  value,
  status,
  color,
}: {
  label: string;
  value: string;
  status: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700/70 bg-slate-900/80 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>
        <span
          className="rounded-md border px-2 py-0.5 text-[9px] font-black"
          style={{ borderColor: `${color}40`, background: `${color}15`, color }}
        >
          {status}
        </span>
      </div>
      <div className="text-xl font-black" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
