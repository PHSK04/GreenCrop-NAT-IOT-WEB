import { Activity, Beaker, Droplets, Gauge, Maximize2, Thermometer, Zap } from "lucide-react";
import waterSystemModel from "../../assets/images/generated/water_system_model_tall.png";

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

function StatusCallout({
  className,
  title,
  value,
  active,
  code,
  side = "right",
}: {
  className: string;
  title: string;
  value: string;
  active: boolean;
  code: string;
  side?: "left" | "right";
}) {
  return (
    <div className={`group absolute z-10 hidden sm:block ${className}`}>
      <span className={`absolute top-1/2 h-px w-16 -translate-y-1/2 bg-gradient-to-r from-emerald-300 to-cyan-400 ${side === "right" ? "right-full" : "left-full rotate-180"}`}>
        <span className={`absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-500 shadow-[0_0_0_4px_rgba(6,182,212,.13),0_0_18px_rgba(6,182,212,.45)] ${side === "right" ? "left-0" : "right-0"}`} />
      </span>
      <div className="min-w-40 rounded-2xl border border-white/90 bg-white/92 p-3 shadow-[0_18px_38px_-22px_rgba(15,23,42,.5)] backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-0.5 group-hover:border-emerald-200 group-hover:shadow-[0_22px_44px_-20px_rgba(5,150,105,.38)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="font-mono text-[9px] font-bold tracking-[0.14em] text-cyan-600">{code}</span>
          <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" : "bg-slate-300"}`} />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-500">{title}</p>
          <p className={`mt-0.5 text-sm font-black ${active ? "text-emerald-700" : "text-slate-900"}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function ScadaTopology({
  isTH,
  liveSignal,
  pump1On,
  pump2On,
  wls1,
  wls2,
  alarm,
}: {
  isTH: boolean;
  liveSignal: boolean;
  pump1On: boolean;
  pump2On: boolean;
  wls1: boolean;
  wls2: boolean;
  alarm: boolean;
}) {
  const p1 = liveSignal && pump1On;
  const p2 = liveSignal && pump2On;
  const pipeClass = (active: boolean) => active ? "scada-pipe scada-pipe--active" : "scada-pipe";
  const statusColor = (active: boolean) => alarm ? "#ef4444" : active ? "#10b981" : "#94a3b8";

  return (
    <svg viewBox="0 0 1040 500" role="img" aria-label={isTH ? "ผังการไหลของระบบ GreenCropNAT" : "GreenCropNAT system flow diagram"} className="relative z-[2] h-auto w-full overflow-visible">
      <defs>
        <linearGradient id="tankMetal" x1="0" x2="1"><stop stopColor="#f8fafc"/><stop offset=".28" stopColor="#94a3b8"/><stop offset=".52" stopColor="#f1f5f9"/><stop offset=".76" stopColor="#94a3b8"/><stop offset="1" stopColor="#e2e8f0"/></linearGradient>
        <linearGradient id="waterFill" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#67e8f9"/><stop offset="1" stopColor="#0ea5e9"/></linearGradient>
        <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="9" stdDeviation="9" floodColor="#0f172a" floodOpacity=".16"/></filter>
      </defs>

      <rect width="1040" height="500" rx="24" fill="#343a49"/>
      <g opacity=".12" stroke="#cbd5e1" strokeWidth="1"><path d="M0 100H1040M0 200H1040M0 300H1040M0 400H1040"/><path d="M130 0V500M260 0V500M390 0V500M520 0V500M650 0V500M780 0V500M910 0V500"/></g>
      <g transform="translate(28 22)">
        <text className="scada-kicker">GREENCROP NAT · WATER PROCESS / LIVE SCHEMATIC</text>
        <circle cx="705" cy="-4" r="4" fill={statusColor(liveSignal)}/>
        <text x="716" className="scada-header-status">{liveSignal ? "PLC CONNECTED" : "PLC WAITING"}</text>
        <text x="850" className="scada-header-status">AUTO MODE</text>
      </g>

      <path className={pipeClass(p1)} d="M180 330H260V260H350" />
      <path className={pipeClass(p1)} d="M445 260H510V190" />
      <path className={pipeClass(p2)} d="M615 190H700V125H795" />
      <path className={pipeClass(p2)} d="M900 125H965V385H855" />
      <path className={pipeClass(p2)} d="M750 385H570V420H180V365" />

      <g filter="url(#nodeShadow)" transform="translate(210 36)">
        <g><path d="M12 20Q12 5 28 5H68Q84 5 84 20V86Q84 103 48 112Q12 103 12 86Z" fill="url(#tankMetal)" stroke="#94a3b8" strokeWidth="2"/><path d="M19 62H77V87Q77 96 48 104Q19 96 19 87Z" fill="#84cc16" opacity=".75"/><text x="48" y="134" textAnchor="middle" className="scada-code">NUTRIENT A</text></g>
        <g transform="translate(104)"><path d="M12 20Q12 5 28 5H68Q84 5 84 20V86Q84 103 48 112Q12 103 12 86Z" fill="url(#tankMetal)" stroke="#94a3b8" strokeWidth="2"/><path d="M19 62H77V87Q77 96 48 104Q19 96 19 87Z" fill="#f59e0b" opacity=".75"/><text x="48" y="134" textAnchor="middle" className="scada-code">NUTRIENT B</text></g>
        <path d="M48 112V160H300M152 112V145H300" fill="none" stroke="#e2e8f0" strokeWidth="7" strokeLinecap="round"/>
      </g>

      <g filter="url(#nodeShadow)">
        <g transform="translate(70 205)">
          <rect width="110" height="160" rx="22" fill="url(#tankMetal)" stroke="#94a3b8" strokeWidth="3"/>
          <path d="M8 88H102V138Q102 152 88 152H22Q8 152 8 138Z" fill="url(#waterFill)" opacity={liveSignal && wls1 ? .9 : .3}/>
          <ellipse cx="55" cy="9" rx="47" ry="9" fill="#f8fafc" stroke="#94a3b8" strokeWidth="3"/>
          <circle cx="92" cy="28" r="7" fill={statusColor(liveSignal && wls1)}/>
          <text x="55" y="187" textAnchor="middle" className="scada-label">{isTH ? "ถังพักน้ำ" : "RESERVOIR"}</text>
          <text x="55" y="204" textAnchor="middle" className="scada-code">TANK-01 · {liveSignal ? (wls1 ? "68%" : "LOW") : "--"}</text>
        </g>

        <g transform="translate(260 212)">
          <rect width="185" height="96" rx="20" fill="#fff" stroke={statusColor(p1)} strokeWidth="3"/>
          <circle cx="52" cy="48" r="27" fill="#e2e8f0" stroke="#64748b" strokeWidth="4"/>
          <path d="M52 29L63 48 52 67 41 48Z" fill={p1 ? "#10b981" : "#94a3b8"} className={p1 ? "scada-rotor" : ""}/>
          <rect x="82" y="27" width="78" height="42" rx="9" fill="#334155"/>
          <circle cx="147" cy="38" r="5" fill={statusColor(p1)}/>
          <text x="121" y="52" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">PUMP 01</text>
          <text x="92" y="120" textAnchor="middle" className="scada-label">{isTH ? "ปั๊มส่งน้ำ" : "TRANSFER PUMP"}</text>
          <text x="92" y="137" textAnchor="middle" className="scada-code">{p1 ? "RUNNING" : "STANDBY"}</text>
        </g>

        <g transform="translate(510 75)">
          <path d="M14 18Q14 0 32 0H87Q105 0 105 18V155Q105 175 60 190Q14 175 14 155Z" fill="url(#tankMetal)" stroke="#64748b" strokeWidth="3"/>
          <path d="M23 91H96V151Q96 162 60 175Q23 162 23 151Z" fill="url(#waterFill)" opacity={liveSignal ? .72 : .25}/>
          <path d="M60 18V142M44 122L60 140 76 122" fill="none" stroke="#475569" strokeWidth="5" strokeLinecap="round"/>
          <circle cx="60" cy="18" r="13" fill="#334155"/><circle cx="93" cy="29" r="7" fill={statusColor(liveSignal)}/>
          <text x="60" y="219" textAnchor="middle" className="scada-label">{isTH ? "ถังผสมสารละลาย" : "MIXING TANK"}</text>
          <text x="60" y="236" textAnchor="middle" className="scada-code">MIX-01 · {liveSignal ? "READY" : "OFFLINE"}</text>
        </g>

        <g transform="translate(700 77)">
          <rect width="200" height="96" rx="20" fill="#fff" stroke={statusColor(p2)} strokeWidth="3"/>
          <circle cx="52" cy="48" r="27" fill="#e2e8f0" stroke="#64748b" strokeWidth="4"/>
          <path d="M52 29L63 48 52 67 41 48Z" fill={p2 ? "#10b981" : "#94a3b8"} className={p2 ? "scada-rotor" : ""}/>
          <rect x="82" y="27" width="93" height="42" rx="9" fill="#334155"/>
          <circle cx="162" cy="38" r="5" fill={statusColor(p2)}/>
          <text x="128" y="52" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">PUMP 02</text>
          <text x="100" y="120" textAnchor="middle" className="scada-label">{isTH ? "ปั๊มเข้ารางปลูก" : "CIRCULATION PUMP"}</text>
          <text x="100" y="137" textAnchor="middle" className="scada-code">{p2 ? "RUNNING" : "STANDBY"}</text>
        </g>

        <g transform="translate(750 325)">
          <path d="M0 15H210L185 100H25Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="3"/>
          <path d="M19 26H191L178 75H32Z" fill={liveSignal && wls2 ? "#86efac" : "#cbd5e1"}/>
          {[45,75,105,135,165].map(x => <g key={x} transform={`translate(${x} 27)`}><path d="M0 25V4" stroke="#15803d" strokeWidth="3"/><circle cy="4" r="9" fill="#22c55e"/></g>)}
          <circle cx="191" cy="29" r="7" fill={statusColor(liveSignal && wls2)}/>
          <text x="105" y="126" textAnchor="middle" className="scada-label">{isTH ? "รางปลูกไข่น้ำ" : "GROWING BED"}</text>
          <text x="105" y="143" textAnchor="middle" className="scada-code">BED-01 · {liveSignal && wls2 ? "NORMAL" : "WAITING"}</text>
        </g>
      </g>

      <g transform="translate(420 355)">
        <rect width="220" height="72" rx="14" fill="#0f172a" opacity=".92"/>
        <text x="18" y="24" className="scada-panel-label">SYSTEM FLOW</text>
        <circle cx="22" cy="48" r="6" fill={statusColor(liveSignal)}/>
        <text x="38" y="52" className="scada-panel-value">{liveSignal ? (isTH ? "เชื่อมต่อแบบเรียลไทม์" : "REAL-TIME CONNECTED") : (isTH ? "รอสัญญาณอุปกรณ์" : "WAITING FOR DEVICE")}</text>
      </g>

      <g transform="translate(28 50)">
        <rect width="150" height="92" rx="12" fill="#171c27" stroke="#4b5563"/>
        <text x="14" y="21" className="scada-panel-label">PROCESS VALUES</text>
        <text x="14" y="45" className="scada-readout">pH  {liveSignal ? "6.82" : "--"}</text>
        <text x="14" y="66" className="scada-readout">EC  {liveSignal ? "1.72" : "--"} mS/cm</text>
        <text x="14" y="85" className="scada-readout">TEMP  {liveSignal ? "27.4" : "--"} °C</text>
      </g>
      <g transform="translate(910 205)" filter="url(#nodeShadow)">
        <rect width="78" height="92" rx="12" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="3"/>
        <path d="M15 25H63M15 45H63M15 65H63" stroke="#64748b" strokeWidth="6"/>
        <text x="39" y="114" textAnchor="middle" className="scada-code">FILTER-01</text>
      </g>
    </svg>
  );
}

function ModelProcessTwin({
  isTH,
  liveSignal,
  pump1On,
  pump2On,
  wls1,
  wls2,
}: {
  isTH: boolean;
  liveSignal: boolean;
  pump1On: boolean;
  pump2On: boolean;
  wls1: boolean;
  wls2: boolean;
}) {
  const p1 = liveSignal && pump1On;
  const p2 = liveSignal && pump2On;
  const machineRunning = p1 || p2;
  return (
    <div className="relative z-[2] h-[430px] w-full sm:h-[500px]">
      <div className="absolute left-1/2 top-1/2 h-[94%] w-[68%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="absolute left-1/2 top-3 z-[4] flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-600/80 bg-slate-950/80 px-3 py-1.5 font-mono text-[9px] font-bold tracking-[.12em] text-slate-300 backdrop-blur-md">
        <span className={`h-2 w-2 rounded-full ${machineRunning ? "bg-emerald-400 shadow-[0_0_10px_#34d399]" : liveSignal ? "bg-amber-400" : "bg-slate-500"}`} />
        GREENCROP NAT · {machineRunning ? "MACHINE RUNNING" : liveSignal ? "MACHINE STANDBY" : "WAITING FOR MACHINE"}
      </div>
      <img
        src={waterSystemModel}
        alt={isTH ? "โมเดลระบบปลูก GreenCropNAT" : "GreenCropNAT system model"}
        className="absolute inset-0 z-[2] h-full w-full scale-[1.04] object-contain drop-shadow-[0_34px_32px_rgba(0,0,0,.55)] transition-transform duration-500 hover:scale-[1.06]"
      />

      <svg viewBox="0 0 1000 560" className="pointer-events-none absolute inset-0 z-[3] h-full w-full" aria-hidden="true">
        <defs>
          <filter id="flowGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <marker id="flowArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5 0 10Z" fill="#22d3ee"/></marker>
        </defs>
        <path d="M438 382H502" className={p1 ? "model-flow model-flow--active" : "model-flow"} markerEnd={p1 ? "url(#flowArrow)" : undefined}/>
        <path d="M590 350H657V265" className={p2 ? "model-flow model-flow--active" : "model-flow"} markerEnd={p2 ? "url(#flowArrow)" : undefined}/>
        <path d="M657 248V185H625" className={p2 ? "model-flow model-flow--active" : "model-flow"} markerEnd={p2 ? "url(#flowArrow)" : undefined}/>
        <path d="M610 204H510M452 225H384V315" className={p2 ? "model-flow model-flow--return" : "model-flow"}/>

        {(p1 || p2) && <>
          <circle r="6" fill="#67e8f9" filter="url(#flowGlow)"><animateMotion dur="2s" repeatCount="indefinite" path="M438 382H502"/></circle>
          <circle r="6" fill="#67e8f9" filter="url(#flowGlow)"><animateMotion begin="2s" dur="2.5s" repeatCount="indefinite" path="M590 350H657V265V185H625"/></circle>
          <circle r="5" fill="#34d399" filter="url(#flowGlow)"><animateMotion begin="4.5s" dur="3s" repeatCount="indefinite" path="M610 204H510H452V225H384V315"/></circle>
        </>}

        <g className={p1 ? "model-pump-rotor" : ""} transform="translate(480 384)"><circle r="15" fill="none" stroke="#67e8f9" strokeWidth="4" strokeDasharray="13 7"/></g>
        <g className={p2 ? "model-pump-rotor" : ""} transform="translate(478 225)"><circle r="15" fill="none" stroke="#67e8f9" strokeWidth="4" strokeDasharray="13 7"/></g>
        <g className={p2 ? "model-pump-rotor" : ""} transform="translate(657 252)"><circle r="15" fill="none" stroke="#67e8f9" strokeWidth="4" strokeDasharray="13 7"/></g>

        <g transform="translate(394 437)"><rect width="106" height="22" rx="7" className={`model-stage ${p1 ? "model-stage--running" : ""}`}/><text x="53" y="14.5" textAnchor="middle" className="model-stage-text">01 · TRANSFER</text></g>
        <g transform="translate(614 309)"><rect width="92" height="22" rx="7" className={`model-stage ${p2 ? "model-stage--running" : ""}`}/><text x="46" y="14.5" textAnchor="middle" className="model-stage-text">02 · FEED</text></g>
        <g transform="translate(420 272)"><rect width="104" height="22" rx="7" className={`model-stage ${p2 ? "model-stage--returning" : ""}`}/><text x="52" y="14.5" textAnchor="middle" className="model-stage-text">03 · RETURN</text></g>
        {[
          { x: 480, y: 384, on: p1, label: "P-01" },
          { x: 478, y: 225, on: p2, label: "P-02" },
          { x: 657, y: 252, on: p2, label: "P-03" },
        ].map(({ x, y, on, label }) => (
          <g key={label} transform={`translate(${x} ${y})`}>
            <circle r="18" fill={on ? "rgba(16,185,129,.2)" : "rgba(148,163,184,.16)"} className={on ? "model-status-pulse" : ""}/>
            <circle r="7" fill={on ? "#10b981" : "#94a3b8"} stroke="#fff" strokeWidth="3"/>
          </g>
        ))}
      </svg>

      {machineRunning && (
        <div className="absolute bottom-12 left-1/2 z-[5] flex -translate-x-1/2 items-center gap-2 rounded-full border border-cyan-300/40 bg-cyan-950/90 px-4 py-2 text-xs font-bold text-cyan-100 shadow-[0_0_28px_rgba(34,211,238,.28)] backdrop-blur-md">
          <Droplets className="h-4 w-4 animate-pulse text-cyan-300" />
          {p1 && p2
            ? (isTH ? "กำลังหมุนเวียนน้ำทั่วระบบ" : "Water circulating through the system")
            : p2
              ? (isTH ? "กำลังส่งน้ำขึ้นรางปลูก" : "Feeding water to the growing bed")
              : (isTH ? "กำลังถ่ายน้ำระหว่างถัง" : "Transferring water between tanks")}
        </div>
      )}
    </div>
  );
}

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
  const alarm = locked || floatAlarm || redOn;
  const level1 = liveSignal ? (wls1 ? 68 : 28) : null;
  const level2 = liveSignal ? (wls2 ? 76 : 24) : null;

  return (
    <section className="overflow-hidden rounded-[26px] border border-white bg-white shadow-[0_28px_70px_-38px_rgba(15,23,42,.35)]">
      <header className="flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-[14px] bg-gradient-to-br from-blue-500 to-cyan-400 text-white shadow-[0_10px_24px_-12px_rgba(37,99,235,.8)]">
            <Gauge className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900">{isTH ? "ภาพรวมระบบไฮโดรโปนิกส์" : "Hydroponic system overview"}</h3>
            <p className="text-xs text-slate-500">{isTH ? "สถานะอุปกรณ์แบบเรียลไทม์" : "Real-time device status"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden text-xs font-semibold sm:block ${liveSignal ? "text-emerald-600" : "text-slate-400"}`}>
            {liveSignal ? (isTH ? "อัปเดตแบบสด" : "Live") : (isTH ? "รอสัญญาณ" : "Waiting")}
          </span>
          <button type="button" aria-label="Expand system overview" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="relative min-h-[430px] overflow-hidden bg-[#262b37] px-4 py-6 sm:min-h-[560px]">
        <div className="absolute inset-x-[18%] bottom-6 h-20 rounded-[50%] bg-cyan-900/20 blur-2xl" />

        <div className="absolute left-4 top-5 z-10 hidden rounded-xl border border-slate-600 bg-slate-900/90 p-3 text-xs text-slate-300 shadow-sm lg:block">
          <p className="mb-2 font-bold text-white">{isTH ? "สัญลักษณ์" : "Legend"}</p>
          <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />{isTH ? "ทำงานปกติ" : "Normal"}</p>
          <p className="mt-1 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-300" />{isTH ? "หยุด / รอสัญญาณ" : "Off / waiting"}</p>
          <p className="mt-1 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" />{isTH ? "แจ้งเตือน" : "Alarm"}</p>
        </div>

        <div className="relative mx-auto flex min-h-[380px] max-w-4xl items-center justify-center sm:min-h-[500px]">
          <div className={`absolute h-[68%] w-[58%] rounded-full blur-3xl ${alarm ? "bg-red-100/70" : "bg-cyan-100/65"}`} />
          <ModelProcessTwin isTH={isTH} liveSignal={liveSignal} pump1On={pump1On} pump2On={pump2On} wls1={wls1} wls2={wls2} />

        </div>

        <div className="absolute inset-x-5 bottom-4 z-20 hidden grid-cols-4 overflow-hidden rounded-2xl border border-white/90 bg-white/88 shadow-[0_18px_50px_-30px_rgba(15,23,42,.55)] backdrop-blur-xl sm:grid">
          {[
            { icon: Beaker, label: "pH", value: phValue == null ? "--" : phValue.toFixed(2), active: phOk },
            { icon: Zap, label: "EC", value: ecValue == null ? "--" : `${ecValue.toFixed(2)} mS/cm`, active: ecValue != null },
            { icon: Thermometer, label: isTH ? "อุณหภูมิน้ำ" : "Water temp", value: tempValue == null ? "--" : `${tempValue.toFixed(1)} °C`, active: tempValue != null },
            { icon: Activity, label: isTH ? "สถานะระบบ" : "System", value: liveSignal ? (isTH ? "ออนไลน์" : "Online") : (isTH ? "รอสัญญาณ" : "Waiting"), active: liveSignal },
          ].map(({ icon: Icon, label, value, active }, index) => (
            <div key={label} className={`flex items-center gap-3 px-4 py-3 ${index > 0 ? "border-l border-slate-100" : ""}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</p>
                <p className={`truncate text-xs font-black ${active ? "text-slate-900" : "text-slate-500"}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-2 sm:hidden">
          {[
            [isTH ? "ถัง 1" : "Tank 1", level1 == null ? "--" : `${level1}%`, wls1],
            [isTH ? "ปั๊ม 1" : "Pump 1", pump1On ? "ON" : "OFF", pump1On],
            [isTH ? "ปั๊ม 2" : "Pump 2", pump2On ? "ON" : "OFF", pump2On],
          ].map(([label, value, active]) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 bg-white/90 p-3 text-center shadow-sm">
              {label === (isTH ? "ถัง 1" : "Tank 1") ? <Droplets className="mx-auto mb-1 h-4 w-4 text-blue-500" /> : <Activity className="mx-auto mb-1 h-4 w-4 text-emerald-500" />}
              <p className="text-[10px] text-slate-500">{String(label)}</p>
              <p className={`text-sm font-bold ${active ? "text-emerald-600" : "text-slate-700"}`}>{String(value)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
