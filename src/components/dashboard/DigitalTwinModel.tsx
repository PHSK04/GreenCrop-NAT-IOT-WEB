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
}: {
  className: string;
  title: string;
  value: string;
  active: boolean;
}) {
  return (
    <div className={`absolute z-10 hidden min-w-36 rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur sm:block ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.12)]" : "bg-slate-300"}`} />
        <div>
          <p className="text-[11px] font-semibold text-slate-500">{title}</p>
          <p className="text-sm font-bold text-slate-900">{value}</p>
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
    <section className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-[0_20px_55px_-38px_rgba(7,55,92,.5)]">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
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

      <div className="relative min-h-[430px] overflow-hidden bg-[radial-gradient(circle_at_52%_35%,#ffffff_0%,#f3faff_48%,#e9f6fd_100%)] px-4 py-6 sm:min-h-[520px]">
        <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(#9fc8df_1px,transparent_1px)] [background-size:22px_22px]" />

        <div className="absolute left-4 top-5 z-10 hidden rounded-xl border border-sky-100 bg-white/90 p-3 text-xs text-slate-600 shadow-sm lg:block">
          <p className="mb-2 font-bold text-slate-900">{isTH ? "สัญลักษณ์" : "Legend"}</p>
          <p className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />{isTH ? "ทำงานปกติ" : "Normal"}</p>
          <p className="mt-1 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-slate-300" />{isTH ? "หยุด / รอสัญญาณ" : "Off / waiting"}</p>
          <p className="mt-1 flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" />{isTH ? "แจ้งเตือน" : "Alarm"}</p>
        </div>

        <div className="relative mx-auto flex min-h-[380px] max-w-3xl items-center justify-center sm:min-h-[470px]">
          <div className={`absolute h-[68%] w-[58%] rounded-full blur-3xl ${alarm ? "bg-red-100/70" : "bg-cyan-100/65"}`} />
          <img
            src={waterSystemModel}
            alt={isTH ? "อุปกรณ์ระบบปลูกพืช GreenCropNAT" : "GreenCropNAT growing system"}
            className="relative z-[2] max-h-[430px] w-full object-contain drop-shadow-[0_26px_25px_rgba(7,42,76,.18)] sm:max-h-[485px]"
          />

          <StatusCallout className="right-[2%] top-[18%]" title={isTH ? "ระดับน้ำบ่อปลูก" : "Grow bed level"} value={level2 == null ? "--" : `${level2}%`} active={liveSignal && wls2} />
          <StatusCallout className="left-[2%] bottom-[16%]" title={isTH ? "ระดับน้ำถัง 1" : "Tank 1 level"} value={level1 == null ? "--" : `${level1}%`} active={liveSignal && wls1} />
          <StatusCallout className="right-[1%] top-[47%]" title={isTH ? "ปั๊มน้ำ #2" : "Water pump #2"} value={pump2On ? (isTH ? "กำลังทำงาน" : "Running") : (isTH ? "พร้อมทำงาน" : "Ready")} active={liveSignal && pump2On} />
          <StatusCallout className="right-[7%] bottom-[8%]" title={isTH ? "ปั๊มน้ำ #1" : "Water pump #1"} value={pump1On ? (isTH ? "กำลังทำงาน" : "Running") : "OFF"} active={liveSignal && pump1On} />
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
