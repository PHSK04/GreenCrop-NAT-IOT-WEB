import { Activity, Droplets, Gauge, Maximize2 } from "lucide-react";
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
}: DigitalTwinModelProps) {
  const isTH = language === "TH";
  const alarm = locked || floatAlarm || redOn;
  const level1 = liveSignal ? (wls1 ? 68 : 28) : null;
  const level2 = liveSignal ? (wls2 ? 76 : 24) : null;

  return (
    <section className="overflow-hidden rounded-[24px] border border-white/90 bg-white shadow-[0_26px_65px_-42px_rgba(7,55,92,.52)]">
      <header className="flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-blue-600">
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

      <div className="relative min-h-[430px] overflow-hidden bg-[radial-gradient(circle_at_52%_36%,#ffffff_0%,#f3fbff_44%,#e7f5fb_100%)] px-4 py-6 sm:min-h-[520px]">
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(125,180,205,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(125,180,205,.18)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="absolute inset-x-[18%] bottom-6 h-20 rounded-[50%] bg-cyan-200/25 blur-2xl" />
        <div className="absolute left-[28%] top-5 font-mono text-[9px] tracking-[0.2em] text-cyan-500/55">GREENCROP DIGITAL TWIN / LIVE TOPOLOGY</div>

        <div className="absolute left-4 top-5 z-10 hidden rounded-xl border border-sky-100 bg-white/90 p-3 text-xs text-slate-600 shadow-sm lg:block">
          <p className="mb-2 font-bold text-slate-900">{isTH ? "สัญลักษณ์" : "Legend"}</p>
          <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />{isTH ? "ทำงานปกติ" : "Normal"}</p>
          <p className="mt-1 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-300" />{isTH ? "หยุด / รอสัญญาณ" : "Off / waiting"}</p>
          <p className="mt-1 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" />{isTH ? "แจ้งเตือน" : "Alarm"}</p>
        </div>

        <div className="relative mx-auto flex min-h-[380px] max-w-4xl items-center justify-center sm:min-h-[470px]">
          <div className={`absolute h-[68%] w-[58%] rounded-full blur-3xl ${alarm ? "bg-red-100/70" : "bg-cyan-100/65"}`} />
          <img
            src={waterSystemModel}
            alt={isTH ? "อุปกรณ์ระบบปลูกพืช GreenCropNAT" : "GreenCropNAT growing system"}
            className="relative z-[2] max-h-[430px] w-full object-contain drop-shadow-[0_28px_28px_rgba(7,42,76,.2)] transition-transform duration-700 hover:scale-[1.015] sm:max-h-[520px]"
          />

          <StatusCallout code="WLS-02" side="right" className="right-[1%] top-[14%]" title={isTH ? "ระดับน้ำบ่อปลูก" : "Grow bed level"} value={level2 == null ? "--" : `${level2}%`} active={liveSignal && wls2} />
          <StatusCallout code="WLS-01" side="left" className="left-[1%] bottom-[15%]" title={isTH ? "ระดับน้ำถัง 1" : "Tank 1 level"} value={level1 == null ? "--" : `${level1}%`} active={liveSignal && wls1} />
          <StatusCallout code="PUMP-02" side="right" className="right-0 top-[46%]" title={isTH ? "ปั๊มน้ำ #2" : "Water pump #2"} value={pump2On ? (isTH ? "กำลังทำงาน" : "Running") : (isTH ? "พร้อมทำงาน" : "Ready")} active={liveSignal && pump2On} />
          <StatusCallout code="PUMP-01" side="right" className="right-[5%] bottom-[6%]" title={isTH ? "ปั๊มน้ำ #1" : "Water pump #1"} value={pump1On ? (isTH ? "กำลังทำงาน" : "Running") : "OFF"} active={liveSignal && pump1On} />
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
