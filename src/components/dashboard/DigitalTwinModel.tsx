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

const C = {
  cyan: "#06b6d4",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  indigo: "#6366f1",
  slate: "#64748b",
};

const clamp = (n: number, a = 0, b = 100) => Math.max(a, Math.min(b, n));

const valueText = (value: number | null, digits: number) =>
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
  const p1On = liveSignal && pump1On;
  const p2On = liveSignal && pump2On;
  const readyOn = liveSignal && wls2 && !p2On && !locked;
  const tank1Level = liveSignal ? (wls1 ? 58 : p1On ? 44 : 24) : 12;
  const tank2Level = liveSignal ? (wls2 ? 82 : p1On ? 54 : p2On ? 38 : 18) : 8;
  const tank3Level = liveSignal ? (alarmOn ? 86 : p2On ? 62 : 24) : 16;

  let statusText = isTH ? "รอสัญญาณจริง" : "Waiting for live signal";
  let statusColor = C.slate;
  if (locked) {
    statusText = isTH ? "LOCKED - ระบบถูกล็อค" : "LOCKED";
    statusColor = C.red;
  } else if (alarmOn) {
    statusText = isTH ? "ถัง 2 เต็ม / Alarm" : "Tank 2 full / Alarm";
    statusColor = C.red;
  } else if (p2On) {
    statusText = isTH ? "Pump 2 ส่งน้ำไปถัง 3" : "Pump 2 feeds tank 3";
    statusColor = C.amber;
  } else if (readyOn) {
    statusText = isTH ? "ถัง 2 พร้อม - เริ่ม Pump 2 ได้" : "Tank 2 ready";
    statusColor = C.green;
  } else if (p1On) {
    statusText = isTH ? "Pump 1 เติมน้ำถัง 2" : "Pump 1 fills tank 2";
    statusColor = C.cyan;
  } else if (liveSignal) {
    statusText = isTH ? "พร้อมทำงาน" : "Ready";
    statusColor = C.green;
  }

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 24,
        background:
          "linear-gradient(135deg,#f0f9ff 0%,#e0f2fe 40%,#f0fdf4 75%,#fefce8 100%)",
        color: "#0f172a",
        padding: "18px 14px 22px",
      }}
    >
      <style>{`
        @keyframes dtSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        @keyframes dtWave { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes dtPulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }
        @keyframes dtRing { 0% { transform: scale(.6); opacity: .9; } 100% { transform: scale(1.8); opacity: 0; } }
        @keyframes dtSlide { from { background-position: -55% 0; } to { background-position: 155% 0; } }
        @keyframes dtBob { 0%,100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(3px) rotate(4deg); } }
        .dt-glass {
          background: rgba(255,255,255,.72);
          border: 1px solid rgba(255,255,255,.9);
          border-radius: 24px;
          backdrop-filter: blur(18px);
          box-shadow: 0 2px 0 rgba(255,255,255,.85) inset, 0 24px 48px -18px rgba(15,23,42,.16), 0 8px 20px -10px rgba(6,182,212,.15);
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: .001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>

      <Glow color={C.cyan} left="2%" top="-10%" />
      <Glow color={C.green} left="72%" top="-6%" />
      <Glow color={C.amber} left="-8%" top="70%" />

      <div className="dt-glass" style={{ position: "relative", zIndex: 1, padding: 18 }}>
        <Header statusText={statusText} statusColor={statusColor} liveSignal={liveSignal} />

        <ControlPanel
          redOn={alarmOn}
          amberOn={p2On}
          greenOn={readyOn}
          cyanOn={p1On}
          locked={locked}
          canStart={readyOn}
          canStop={p2On || alarmOn}
        />

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: ".6px", textTransform: "uppercase" }}>
              {isTH ? "ถัง 3 - บ่อเพาะเลี้ยง (แนวนอน)" : "Tank 3 - Grow Bed"}
            </span>
            <SensorBadge label="WLS3" on={tank3Level > 20} color={C.green} />
          </div>
          <HorizontalTank level={tank3Level} active={p2On} color={C.green} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, marginBottom: 8 }}>
          <Pipe on={false} vertical color={C.green} height={14} />
          <PumpUnit size={92} on={false} color={C.green} label={isTH ? "P3 - ปั๊มใหญ่ (ยังไม่เชื่อมต่อ)" : "P3 - Main pump"} />
          <Pipe on={false} vertical color={C.green} height={14} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "nowrap", gap: 0, overflow: "visible" }}>
          <TankCard pct={tank1Level} markOn={liveSignal && wls1} name={isTH ? "ถัง 1" : "Tank 1"} sub="Raw Water" color={C.cyan} />
          <div style={{ display: "flex", flex: "1 1 210px", minWidth: 180, maxWidth: 260, flexDirection: "column", alignItems: "center", gap: 8, marginTop: -70, overflow: "visible" }}>
            <Pipe on={p1On} horizontal color={C.cyan} extend />
            <PumpUnit size={70} on={p1On} color={C.cyan} label="P1 - Auto" />
          </div>
          <TankCard pct={tank2Level} markOn={liveSignal && wls2} name={isTH ? "ถัง 2" : "Tank 2"} sub="Preparation" color="#38bdf8" />
          <div style={{ display: "flex", flex: "1 1 210px", minWidth: 180, maxWidth: 260, flexDirection: "column", alignItems: "center", gap: 8, marginTop: -70, overflow: "visible" }}>
            <Pipe on={p2On} vertical color={C.green} height={24} />
            <Pipe on={p2On} horizontal color={C.green} extend />
            <PumpUnit size={70} on={p2On} color={C.green} label="P2 - Manual" />
          </div>
        </div>

        <div className="dt-glass" style={{ marginTop: 16, padding: "14px 16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
            <SensorCard label="pH" value={valueText(phValue, 2)} unit="" color={C.cyan} ok={phOk} />
            <SensorCard label="EC" value={valueText(ecValue, 2)} unit="mS/cm" color={C.amber} ok={ecValue != null} />
            <SensorCard label={isTH ? "Temp" : "Temp"} value={valueText(tempValue, 1)} unit="C" color={C.red} ok={tempValue == null || tempValue < 30} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Header({ statusText, statusColor, liveSignal }: { statusText: string; statusColor: string; liveSignal: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            alignItems: "center",
            background: "linear-gradient(135deg,#06b6d4,#0ea5e9)",
            borderRadius: 14,
            boxShadow: "0 6px 16px rgba(6,182,212,.45)",
            display: "flex",
            height: 40,
            justifyContent: "center",
            width: 40,
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" strokeLinecap="round" strokeWidth="2">
            <path d="M12 2C12 2 5 10 5 15a7 7 0 0014 0c0-5-7-13-7-13z" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.3px" }}>ระบบควบคุมน้ำอัตโนมัติ</div>
          <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 1 }}>ESP32 · ถัง 1 → ถัง 2 → บ่อเพาะเลี้ยง</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            alignItems: "center",
            background: `${statusColor}12`,
            border: `1.5px solid ${statusColor}28`,
            borderRadius: 10,
            color: statusColor,
            display: "inline-flex",
            fontSize: 12,
            fontWeight: 700,
            gap: 6,
            padding: "7px 14px",
          }}
        >
          <span
            style={{
              animation: statusColor === C.red ? "dtPulse .8s ease-in-out infinite" : "none",
              background: statusColor,
              borderRadius: "50%",
              boxShadow: `0 0 8px ${statusColor}`,
              display: "inline-block",
              height: 7,
              width: 7,
            }}
          />
          {statusText}
        </div>
        <div
          style={{
            background: liveSignal ? "rgba(16,185,129,.08)" : "rgba(255,255,255,.5)",
            border: `1px solid ${liveSignal ? "#10b98140" : "rgba(15,23,42,.1)"}`,
            borderRadius: 9,
            color: liveSignal ? "#059669" : "#94a3b8",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 10,
            fontWeight: 700,
            padding: "7px 12px",
          }}
        >
          {liveSignal ? "LIVE" : "DEMO"}
        </div>
      </div>
    </div>
  );
}

function ControlPanel({
  redOn,
  amberOn,
  greenOn,
  cyanOn,
  locked,
  canStart,
  canStop,
}: {
  redOn: boolean;
  amberOn: boolean;
  greenOn: boolean;
  cyanOn: boolean;
  locked: boolean;
  canStart: boolean;
  canStop: boolean;
}) {
  return (
    <div
      style={{
        background: "linear-gradient(155deg,#f1f5f9 0%,#e2e8f0 45%,#cbd5e1 100%)",
        border: "1px solid #94a3b8",
        borderRadius: 3,
        boxShadow:
          "inset 0 2px 3px rgba(255,255,255,.8), inset 0 -3px 8px rgba(0,0,0,.06), 0 10px 24px -10px rgba(15,23,42,.25)",
        marginBottom: 16,
        padding: "20px 24px",
        position: "relative",
      }}
    >
      <Screw top={9} left={9} />
      <Screw top={9} right={9} />
      <Screw bottom={9} left={9} />
      <Screw bottom={9} right={9} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <PanelLed on={redOn} color={C.red} label="ALARM / FULL" />
        <PanelLed on={amberOn} color={C.amber} label="PUMP 2 ON" />
        <PanelLed on={greenOn} color={C.green} label="READY" />
        <PanelLed on={cyanOn} color={C.cyan} label="PUMP 1 ON" />
      </div>

      <div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              animation: locked ? "dtPulse .8s ease-in-out infinite" : "none",
              background: "radial-gradient(circle at 34% 26%, #fca5a5 0%, #dc2626 45%, #7f1d1d 100%)",
              border: locked ? "8px solid #dc2626" : "8px solid #eab308",
              borderRadius: "50%",
              boxShadow: locked
                ? "0 0 28px rgba(239,68,68,.6), inset 0 3px 3px rgba(255,255,255,.4), inset 0 -6px 10px rgba(0,0,0,.4), 0 6px 14px rgba(0,0,0,.3)"
                : "inset 0 3px 3px rgba(255,255,255,.5), inset 0 -6px 10px rgba(0,0,0,.4), 0 8px 18px rgba(0,0,0,.28), 0 1px 0 rgba(255,255,255,.3)",
              height: 76,
              width: 76,
            }}
          />
          <span style={{ color: locked ? C.red : "#475569", fontSize: 9, fontWeight: 700, letterSpacing: ".3px" }}>
            {locked ? "กดเพื่อ RESET" : "E-STOP"}
          </span>
        </div>

        <div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 5 }}>
          <div
            style={{
              animation: redOn ? "dtPulse .5s ease-in-out infinite" : "none",
              background: redOn
                ? "radial-gradient(circle at 34% 26%, #a5b4fc, #4338ca 75%)"
                : "radial-gradient(circle at 34% 26%, #e0e7ff, #c7d2fe 75%)",
              borderRadius: "50%",
              boxShadow: redOn
                ? "0 0 20px rgba(99,102,241,.75), inset 0 -3px 5px rgba(0,0,0,.25), inset 0 2px 2px rgba(255,255,255,.6)"
                : "inset 0 -2px 4px rgba(0,0,0,.1), inset 0 2px 2px rgba(255,255,255,.7), 0 1px 3px rgba(0,0,0,.1)",
              height: 24,
              width: 24,
            }}
          />
          <span style={{ color: "#64748b", fontSize: 8, fontWeight: 600, letterSpacing: ".3px" }}>BEACON</span>
        </div>

        <div style={{ alignItems: "flex-end", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          <ControlButton color="green" label="?" disabled />
          <ControlButton color="red" label="?" disabled />
          <ControlButton color="red" label="STOP" disabled={!canStop} />
          <ControlButton color="green" label="START" disabled={!canStart} />
          <div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                background: "linear-gradient(155deg,#f1f5f9 0%,#cbd5e1 40%,#8494a8 100%)",
                border: "1px solid #64748b",
                borderRadius: 3,
                boxShadow: "inset 0 1px 1px rgba(255,255,255,.7), inset 0 -2px 4px rgba(0,0,0,.15), 0 2px 4px rgba(0,0,0,.15)",
                height: 46,
                position: "relative",
                width: 27,
              }}
            >
              <div
                style={{
                  background: "linear-gradient(155deg,#475569,#0f172a)",
                  borderRadius: 4,
                  boxShadow: "inset 0 1px 1px rgba(255,255,255,.25), 0 1px 2px rgba(0,0,0,.4)",
                  height: 20,
                  left: "50%",
                  position: "absolute",
                  top: 6,
                  transform: "translateX(-50%)",
                  width: 13,
                }}
              />
            </div>
            <span style={{ color: "#64748b", fontSize: 8, fontWeight: 600, letterSpacing: ".3px" }}>MODE</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HorizontalTank({ level, active, color }: { level: number; active: boolean; color: string }) {
  return (
    <div>
      <div style={{ alignItems: "stretch", display: "flex" }}>
        <div style={{ background: "linear-gradient(90deg,#94a3b8,#e2e8f0)", border: "1px solid rgba(15,23,42,.15)", borderRadius: "14px 0 0 14px", borderRight: "none", width: 16 }} />
        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(226,232,240,.4) 0%, rgba(255,255,255,.5) 16%, rgba(255,255,255,.08) 30%, rgba(226,232,240,.35) 100%)",
            borderBottom: "1px solid rgba(15,23,42,.12)",
            borderTop: "1px solid rgba(15,23,42,.12)",
            boxShadow: "inset 0 3px 8px rgba(15,23,42,.08), inset 0 -4px 8px rgba(15,23,42,.05)",
            flex: 1,
            height: 66,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div style={{ background: "linear-gradient(180deg,rgba(255,255,255,.6),transparent)", height: "10%", left: 0, position: "absolute", right: 0, top: "8%" }} />
          <div
            style={{
              background: `linear-gradient(180deg,${color}bf 0%,${color}80 45%,${color}47 100%)`,
              bottom: 0,
              height: `${clamp(level)}%`,
              left: 0,
              position: "absolute",
              right: 0,
              transition: "height .25s linear",
            }}
          >
            <svg
              viewBox="0 0 200 12"
              preserveAspectRatio="none"
              style={{ animation: active ? "dtWave 2.4s linear infinite" : "none", fill: `${color}dd`, height: 11, left: 0, position: "absolute", top: -6, width: "200%" }}
            >
              <path d="M0 6 Q25 0 50 6 T100 6 T150 6 T200 6 V12 H0 Z" />
            </svg>
            <div style={{ background: "rgba(255,255,255,.4)", height: 4, left: 0, position: "absolute", right: 0, top: 0 }} />
          </div>
          <div style={{ alignItems: "center", display: "flex", inset: 0, justifyContent: "center", pointerEvents: "none", position: "absolute" }}>
            <span style={{ color: "#0f172a", fontSize: 15, fontWeight: 800, textShadow: "0 1px 4px rgba(255,255,255,.85)" }}>
              {Math.round(level)}<span style={{ color: "#475569", fontSize: 9, fontWeight: 500 }}>%</span>
            </span>
          </div>
        </div>
        <div style={{ background: "linear-gradient(90deg,#e2e8f0,#94a3b8)", border: "1px solid rgba(15,23,42,.15)", borderLeft: "none", borderRadius: "0 14px 14px 0", width: 16 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-around", padding: "0 24px" }}>
        <div style={{ background: "linear-gradient(180deg,#94a3b8,#64748b)", borderRadius: "0 0 2px 2px", height: 8, width: 3 }} />
        <div style={{ background: "linear-gradient(180deg,#94a3b8,#64748b)", borderRadius: "0 0 2px 2px", height: 8, width: 3 }} />
      </div>
    </div>
  );
}

function TankCard({ pct, markOn, name, sub, color }: { pct: number; markOn: boolean; name: string; sub: string; color: string }) {
  return (
    <div style={{ alignItems: "center", display: "flex", flex: "0 0 190px", flexDirection: "column", gap: 10, width: 190 }}>
      <div style={{ position: "relative", width: 124 }}>
        <div style={{ background: "linear-gradient(180deg,#f8fafc,#cbd5e1)", border: "1px solid #94a3b8", borderRadius: "50%", boxShadow: "0 2px 3px rgba(0,0,0,.12)", height: 13, margin: "0 auto", position: "relative", width: "86%", zIndex: 3 }} />
        <div style={{ background: "linear-gradient(180deg,#e2e8f0,#94a3b8)", border: "1px solid #7d8ea6", borderRadius: 3, height: 8, margin: "-4px auto 0", position: "relative", width: 24, zIndex: 4 }} />
        <div
          style={{
            background:
              "linear-gradient(90deg, rgba(148,163,184,.35) 0%, rgba(255,255,255,.55) 12%, rgba(255,255,255,.15) 24%, rgba(226,232,240,.25) 50%, rgba(255,255,255,.1) 76%, rgba(148,163,184,.3) 100%)",
            border: "1px solid rgba(15,23,42,.12)",
            borderRadius: "6px 6px 10px 10px",
            boxShadow: "inset 0 3px 8px rgba(15,23,42,.1), inset -4px 0 10px rgba(15,23,42,.05), inset 4px 0 10px rgba(255,255,255,.4)",
            height: 150,
            marginTop: 2,
            overflow: "hidden",
            position: "relative",
            width: "100%",
          }}
        >
          {[80, 60, 40, 20].map((m) => (
            <div key={m} style={{ background: "rgba(15,23,42,.18)", height: 1, position: "absolute", right: 3, top: `${100 - m}%`, width: m % 40 === 0 ? 9 : 6 }} />
          ))}
          <div style={{ background: "linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,.1) 60%,transparent)", height: "100%", left: "14%", pointerEvents: "none", position: "absolute", top: 0, width: "10%", zIndex: 2 }} />
          <div
            style={{
              background: `linear-gradient(180deg,${color}c8 0%,${color}90 40%,${color}55 100%)`,
              bottom: 0,
              height: `${clamp(pct)}%`,
              left: 0,
              position: "absolute",
              right: 0,
              transition: "height .25s linear",
            }}
          >
            <svg viewBox="0 0 200 14" preserveAspectRatio="none" style={{ animation: "dtWave 2.4s linear infinite", fill: `${color}dd`, height: 13, left: 0, position: "absolute", top: -7, width: "200%" }}>
              <path d="M0 7 Q25 0 50 7 T100 7 T150 7 T200 7 V14 H0 Z" />
            </svg>
            <div style={{ background: "rgba(255,255,255,.4)", height: 5, left: 0, position: "absolute", right: 0, top: 0 }} />
          </div>
        </div>
        <div style={{ alignItems: "center", bottom: 42, display: "flex", gap: 5, position: "absolute", right: -34 }}>
          <div style={{ alignItems: "center", display: "flex", height: 24, justifyContent: "center", position: "relative", width: 24 }}>
            {markOn && <div style={{ animation: "dtRing 1.2s ease-out infinite", border: `2px solid ${color}`, borderRadius: "50%", height: 24, position: "absolute", width: 24 }} />}
            <div style={{ background: markOn ? color : "#e2e8f0", border: markOn ? "none" : "1.5px solid #cbd5e1", borderRadius: "50%", boxShadow: markOn ? `0 0 12px ${color}, inset 0 1px 2px rgba(255,255,255,.6)` : "inset 0 1px 2px rgba(0,0,0,.1)", height: 17, transition: "all .25s", width: 17, zIndex: 1 }} />
          </div>
        </div>
        <div style={{ background: "linear-gradient(180deg,#cbd5e1,#94a3b8)", border: "1px solid rgba(15,23,42,.15)", borderRadius: "0 0 10px 10px", borderTop: "none", height: 14, margin: "0 auto", width: "96%" }} />
        <div style={{ background: "radial-gradient(ellipse,rgba(15,23,42,.18),transparent 75%)", borderRadius: "50%", height: 11, margin: "2px auto 0", width: "74%" }} />
      </div>
      <SensorBadge label="WLS" on={markOn} color={color} />
      <div style={{ color: "#0f172a", fontSize: 27, fontWeight: 800, letterSpacing: "-.5px" }}>
        {Math.round(pct)}<span style={{ color: "#94a3b8", fontSize: 13, fontWeight: 500 }}>%</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: "#334155", fontSize: 15, fontWeight: 700 }}>{name}</div>
        <div style={{ color: "#94a3b8", fontSize: 12 }}>{sub}</div>
      </div>
    </div>
  );
}

function SensorCard({ label, value, unit, color, ok }: { label: string; value: string; unit: string; color: string; ok: boolean }) {
  return (
    <div style={{ background: `linear-gradient(145deg,#fff,${color}08)`, border: `1px solid ${color}22`, borderRadius: 18, boxShadow: `0 6px 20px -8px ${color}30`, overflow: "hidden", padding: 14 }}>
      <div style={{ alignItems: "flex-start", display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ color: "#94a3b8", fontSize: 10, fontWeight: 700 }}>{label}</div>
        <span style={{ background: ok ? `${C.green}14` : `${C.red}14`, border: `1px solid ${ok ? C.green + "30" : C.red + "30"}`, borderRadius: 6, color: ok ? C.green : C.red, fontSize: 8, fontWeight: 800, padding: "2px 7px" }}>
          {ok ? "OK" : "CHECK"}
        </span>
      </div>
      <div style={{ color: "#0f172a", fontSize: 26, fontWeight: 800, letterSpacing: "-.5px", lineHeight: 1 }}>
        {value}<span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 500, marginLeft: 3 }}>{unit}</span>
      </div>
    </div>
  );
}

function PanelLed({ on, color, label }: { on: boolean; color: string; label: string }) {
  return (
    <div style={{ alignItems: "center", background: on ? `${color}18` : "rgba(15,23,42,.06)", border: `1px solid ${on ? color + "45" : "rgba(15,23,42,.1)"}`, borderRadius: 2, display: "flex", gap: 6, padding: "5px 11px", transition: "all .25s" }}>
      <div style={{ animation: on && color === C.red ? "dtPulse .8s ease-in-out infinite" : "none", background: on ? color : "#cbd5e1", borderRadius: "50%", boxShadow: on ? `0 0 10px ${color}` : "inset 0 1px 1px rgba(0,0,0,.15)", height: 8, width: 8 }} />
      <span style={{ color: on ? color : "#94a3b8", fontFamily: "JetBrains Mono, monospace", fontSize: 10, fontWeight: 700, letterSpacing: ".2px" }}>{label}</span>
    </div>
  );
}

function ControlButton({ color, label, disabled }: { color: "green" | "red"; label: string; disabled?: boolean }) {
  const green = color === "green";
  const base = green ? "#16a34a" : "#b91c1c";
  const dark = green ? "#166534" : "#7f1d1d";
  const light = green ? "#86efac" : "#fca5a5";
  const bezel = green ? "#0f5132" : "#5a1616";
  return (
    <div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ background: `radial-gradient(circle at 32% 26%, ${light} 0%, ${base} 55%, ${dark} 100%)`, border: `3px solid ${bezel}`, borderRadius: "50%", boxShadow: disabled ? "inset 0 2px 3px rgba(0,0,0,.25)" : "inset 0 2px 2px rgba(255,255,255,.55), inset 0 -4px 6px rgba(0,0,0,.35), 0 3px 6px rgba(0,0,0,.3), 0 1px 0 rgba(255,255,255,.4)", height: 38, opacity: disabled ? .42 : 1, width: 38 }} />
      <span style={{ color: "#64748b", fontFamily: "JetBrains Mono, monospace", fontSize: 8.5, fontWeight: 700, letterSpacing: ".3px" }}>{label}</span>
    </div>
  );
}

function Pipe({ on, color, horizontal, vertical, height, extend }: { on: boolean; color: string; horizontal?: boolean; vertical?: boolean; height?: number; extend?: boolean }) {
  const pipeShell = {
    background:
      "linear-gradient(180deg,#f8fafc 0%,#cbd5e1 32%,#94a3b8 52%,#e2e8f0 100%)",
    border: "1px solid rgba(100,116,139,.55)",
    boxShadow:
      "inset 0 1px 2px rgba(255,255,255,.85), inset 0 -2px 3px rgba(15,23,42,.18), 0 4px 10px rgba(15,23,42,.12)",
    overflow: "hidden",
    position: "relative" as const,
  };

  if (vertical) {
    return (
      <div
        style={{
          ...pipeShell,
          borderRadius: 999,
          height: height || 28,
          width: 14,
        }}
      >
        <div
          style={{
            animation: on ? "dtSlide 1s linear infinite" : "none",
            background: on
              ? `linear-gradient(180deg,transparent 0%,${color} 22%,${color} 78%,transparent 100%)`
              : "linear-gradient(180deg,rgba(148,163,184,.18),rgba(226,232,240,.22))",
            backgroundSize: on ? "100% 42px" : undefined,
            borderRadius: 999,
            bottom: 3,
            boxShadow: on ? `0 0 10px ${color}88` : "none",
            left: "50%",
            position: "absolute",
            top: 3,
            transform: "translateX(-50%)",
            width: 6,
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...pipeShell,
        borderRadius: 999,
        height: 14,
        marginLeft: extend ? -24 : 0,
        marginRight: extend ? -24 : 0,
        width: horizontal ? (extend ? "calc(100% + 48px)" : "100%") : 90,
      }}
    >
      <div
        style={{
          animation: on ? "dtSlide 1s linear infinite" : "none",
          background: on
            ? `linear-gradient(90deg,transparent 0%,${color} 22%,${color} 78%,transparent 100%)`
            : "linear-gradient(90deg,rgba(148,163,184,.18),rgba(226,232,240,.22))",
          backgroundSize: on ? "56px 100%" : undefined,
          borderRadius: 999,
          boxShadow: on ? `0 0 10px ${color}88` : "none",
          height: 6,
          left: 3,
          position: "absolute",
          right: 3,
          top: "50%",
          transform: "translateY(-50%)",
        }}
      />
    </div>
  );
}

function PumpUnit({ size, on, color, label }: { size: number; on: boolean; color: string; label: string }) {
  return (
    <div style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 5 }}>
      <svg viewBox="0 0 64 64" style={{ filter: on ? `drop-shadow(0 4px 10px rgba(0,0,0,.12)) drop-shadow(0 0 14px ${color}70)` : "drop-shadow(0 3px 8px rgba(15,23,42,.12))", height: size, transition: "filter .3s", width: size }}>
        <defs>
          <linearGradient id="dtMG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f1f5f9" />
            <stop offset=".5" stopColor="#94a3b8" />
            <stop offset="1" stopColor="#475569" />
          </linearGradient>
          <linearGradient id="dtMGd" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#cbd5e1" />
            <stop offset="1" stopColor="#334155" />
          </linearGradient>
        </defs>
        <rect x="44" y="34" width="14" height="9" rx="2.5" fill="url(#dtMGd)" stroke="#94a3b8" strokeWidth=".8" />
        <rect x="14" y="17" width="36" height="32" rx="11" fill="url(#dtMG)" stroke="#cbd5e1" strokeWidth="1.1" />
        <rect x="22" y="5" width="20" height="14" rx="5" fill="url(#dtMG)" stroke="#cbd5e1" strokeWidth="1" />
        <circle cx="32" cy="35" r="12" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.3" />
        <g style={{ animation: on ? "dtSpin .75s linear infinite" : "none", transformBox: "fill-box", transformOrigin: "center" }}>
          <path d="M32 35 L32 25 Q39 26 39 35 Z" fill={on ? color : "#cbd5e1"} />
          <path d="M32 35 L42 35 Q41 42 32 42 Z" fill={on ? color : "#cbd5e1"} />
          <path d="M32 35 L32 45 Q25 44 25 35 Z" fill={on ? color : "#cbd5e1"} />
          <path d="M32 35 L22 35 Q23 28 32 28 Z" fill={on ? color : "#cbd5e1"} />
        </g>
        <circle cx="32" cy="35" r="2.8" fill="#94a3b8" />
        <circle cx="32" cy="12" r="3.2" fill={on ? color : "#e2e8f0"} />
      </svg>
      <span style={{ color: on ? color : "#94a3b8", fontFamily: "JetBrains Mono, monospace", fontSize: 9.5, fontWeight: 600, textAlign: "center" }}>{label}</span>
    </div>
  );
}

function SensorBadge({ label, on, color }: { label: string; on: boolean; color: string }) {
  return (
    <div style={{ alignItems: "center", background: on ? `${color}16` : "rgba(15,23,42,.05)", border: `1px solid ${on ? color + "40" : "rgba(15,23,42,.1)"}`, borderRadius: 20, display: "flex", gap: 5, padding: "3px 10px" }}>
      <div style={{ animation: on ? "dtPulse .7s ease-in-out infinite" : "none", background: on ? color : "#cbd5e1", borderRadius: "50%", boxShadow: on ? `0 0 6px ${color}` : "none", height: 6, width: 6 }} />
      <span style={{ color: on ? color : "#94a3b8", fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 700, letterSpacing: ".2px" }}>
        {label} {on ? "ON" : "OFF"}
      </span>
    </div>
  );
}

function Screw({ top, left, right, bottom }: { top?: number; left?: number; right?: number; bottom?: number }) {
  return (
    <div style={{ background: "radial-gradient(circle at 35% 30%,#f8fafc,#94a3b8 70%,#64748b)", borderRadius: "50%", bottom, boxShadow: "inset 0 1px 1px rgba(255,255,255,.6), inset 0 -1px 1px rgba(0,0,0,.25), 0 1px 2px rgba(0,0,0,.2)", height: 10, left, position: "absolute", right, top, width: 10 }}>
      <div style={{ background: "rgba(71,85,105,.6)", height: 1.4, left: "15%", position: "absolute", top: "50%", transform: "translateY(-50%) rotate(45deg)", width: "70%" }} />
    </div>
  );
}

function Glow({ color, left, top }: { color: string; left: string; top: string }) {
  return (
    <div
      style={{
        background: `radial-gradient(circle,${color}28,transparent 68%)`,
        borderRadius: "50%",
        filter: "blur(44px)",
        height: 280,
        left,
        pointerEvents: "none",
        position: "absolute",
        top,
        width: 280,
        zIndex: 0,
      }}
    />
  );
}
