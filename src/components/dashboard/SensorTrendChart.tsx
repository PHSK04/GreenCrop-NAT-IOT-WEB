import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, ReferenceArea, ReferenceLine, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type SensorTrendPoint = { time: number; ph: number | null; temp: number | null; ec: number | null };

type Props = {
  data: SensorTrendPoint[];
  dataKey: "ph" | "temp" | "ec";
  title: string;
  unit: string;
  language?: string;
  demo?: boolean;
};

const metrics = {
  ph: { min: 6.5, max: 7.5, scale: 14, range: "6.5–7.5", lowTH: "ผำเครียด โตช้า", highTH: "ผำขาดธาตุอาหารและตัวเหลือง", lowEN: "Stress and slower growth", highEN: "Nutrient deficiency and yellowing" },
  temp: { min: 25, max: 32, scale: 45, range: "25–32", lowTH: "อุณหภูมิต่ำกว่าช่วงที่กำหนด", highTH: "น้ำร้อนเกินไป ใกล้ 40°C ผำอาจชะงักและตาย", lowEN: "Below the specified temperature range", highEN: "Excess heat; near 40°C growth may stop and plants may die" },
  ec: { min: .5, max: 1, scale: 2, range: "0.5–1.0", lowTH: "สารอาหารไม่พอ", highTH: "เสี่ยงผำน็อคปุ๋ยและเสียหาย", lowEN: "Insufficient nutrients", highEN: "Risk of fertilizer damage" },
} as const;

/** A fixed scale makes the moving marker comparable across successive readings. */
function SensorGauge({ data, dataKey, title, unit, language = "TH", demo = false }: Props) {
  const config = metrics[dataKey];
  const latest = data.filter(point => Number.isFinite(point.time) && point[dataKey] != null && Number.isFinite(point[dataKey])).reduce<SensorTrendPoint | undefined>((newest, point) => !newest || point.time >= newest.time ? point : newest, undefined);
  const current = latest?.[dataKey];
  const thai = language === "TH";
  const status = current == null ? "waiting" : current < config.min ? "low" : current > config.max ? "high" : "normal";
  const statusText = status === "waiting" ? (thai ? "รอข้อมูลเซนเซอร์" : "Waiting for sensor") : status === "low" ? (thai ? "ต่ำกว่าเกณฑ์" : "Below target") : status === "high" ? (thai ? "สูงกว่าเกณฑ์" : "Above target") : (thai ? "อยู่ในเกณฑ์" : "On target");
  const impact = status === "low" ? (thai ? config.lowTH : config.lowEN) : status === "high" ? (thai ? config.highTH : config.highEN) : (thai ? "ช่วงเหมาะสมตามเกณฑ์ที่กำหนด" : "Within the specified target range");
  const position = current == null ? 0 : Math.min(100, Math.max(0, current / config.scale * 100));
  const minPosition = config.min / config.scale * 100;
  const maxPosition = config.max / config.scale * 100;
  const format = (value: number) => value.toLocaleString(thai ? "th-TH" : "en-GB", { maximumFractionDigits: 2 });

  return <div className={`sensor-gauge sensor-gauge-${status}`}>
    <div className="sensor-gauge-summary">
      <span className="sensor-gauge-status">{statusText}</span>
      <span>{thai ? "เป้าหมาย" : "Target"} <strong>{config.range} {unit}</strong></span>
    </div>
    <div className="sensor-gauge-scale" role="img" aria-label={`${title}: ${current == null ? statusText : `${format(current)} ${unit}, ${statusText}`}. ${thai ? "เกณฑ์" : "Target"} ${config.range} ${unit}${demo ? (thai ? " ข้อมูลจำลอง" : " Demo data") : ""}`}>
      <div className="sensor-gauge-track">
        <div className="sensor-gauge-zone-low" style={{ width: `${minPosition}%` }} />
        <div className="sensor-gauge-target" style={{ left: `${minPosition}%`, width: `${maxPosition - minPosition}%` }} />
        <div className="sensor-gauge-zone-high" style={{ left: `${maxPosition}%`, width: `${100 - maxPosition}%` }} />
      </div>
      <div className="sensor-gauge-boundary" style={{ left: `${minPosition}%` }}><span>{format(config.min)}</span></div>
      <div className="sensor-gauge-boundary" style={{ left: `${maxPosition}%` }}><span>{format(config.max)}</span></div>
      {current != null && <div className="sensor-gauge-pointer" style={{ left: `${position}%` }}><span className="sensor-gauge-needle" /></div>}
      <div className="sensor-gauge-endpoints"><span>0</span><span>{format(config.scale)} {unit}</span></div>
    </div>
    <div className="sensor-gauge-legend"><span><i />{thai ? "ต่ำ" : "Low"}</span><span><i />{thai ? "เหมาะสม" : "Target"}</span><span><i />{thai ? "สูง" : "High"}</span></div>
    <p className="sensor-gauge-impact">{status === "waiting" ? (thai ? "ตำแหน่งบนเกจจะแสดงเมื่อได้รับข้อมูล" : "The marker appears when a reading arrives") : impact}</p>
    {dataKey === "ec" && <p className="sensor-gauge-conversion">500–1,000 µS/cm = 0.5–1.0 mS/cm</p>}
    {current != null && (current < 0 || current > config.scale) && <p className="sensor-gauge-impact">{thai ? "ค่าอยู่นอกสเกล · ตัวชี้แสดงที่ปลายแท่ง" : "Outside scale · marker shown at the end"}</p>}
  </div>;
}

function SensorHistoryChart({ data, dataKey, title, unit, language = "TH", demo = false }: Props) {
  const config = metrics[dataKey];
  const color = dataKey === "ph" ? "#059669" : dataKey === "temp" ? "#2563eb" : "#0891b2";
  const chartId = useId().replace(/:/g, "");
  const gradientId = `sensor-fill-${chartId}`;
  const latest = [...data].reverse().find(point => Number.isFinite(point.time) && point[dataKey] != null && Number.isFinite(point[dataKey]));
  const rows = data.filter(point => Number.isFinite(point.time));
  const values = rows.map(point => point[dataKey]).filter((value): value is number => value != null && Number.isFinite(value));
  const hasData = values.length > 0;
  const now = Date.now();
  const first = rows[0]?.time ?? now - 60 * 60 * 1000;
  const last = rows.at(-1)?.time ?? now;
  const timeDomain = first === last ? [first - 30_000, last + 30_000] : [first, last];
  const low = hasData ? Math.min(...values, config.min) : config.min;
  const high = hasData ? Math.max(...values, config.max) : config.max;
  const padding = Math.max((high - low) * .25, dataKey === "temp" ? .4 : dataKey === "ph" ? .08 : .025);
  const yDomain = hasData ? [Math.max(0,low-padding),high+padding] : [0, config.scale];
  const locale = language === "TH" ? "th-TH" : "en-GB";
  const formatTime = (time: number) => new Date(time).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  const thai = language === "TH";
  const current = latest?.[dataKey];
  const status = current == null ? "waiting" : current < config.min ? "low" : current > config.max ? "high" : "normal";
  const statusText = status === "waiting" ? (thai ? "รอข้อมูล" : "Waiting") : status === "low" ? (thai ? "ต่ำกว่าเกณฑ์" : "Below range") : status === "high" ? (thai ? "สูงกว่าเกณฑ์" : "Above range") : (thai ? "อยู่ในเกณฑ์" : "In range");
  const impact = status === "low" ? (thai ? config.lowTH : config.lowEN) : status === "high" ? (thai ? config.highTH : config.highEN) : "";

  return (
    <div>
    <div className="sensor-chart relative h-44 min-w-0 px-1 pt-2" role="img" aria-label={`${title}${demo ? " · ข้อมูลจำลอง" : ""} · ${language === "TH" ? "กราฟตามเวลา" : "time series"}${unit ? ` (${unit})` : ""}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={rows} margin={{ top: 10, right: 18, bottom: 0, left: 0 }} accessibilityLayer>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={.26} /><stop offset="55%" stopColor={color} stopOpacity={.07} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid stroke="#e6ece8" strokeDasharray="2 5" vertical={false} />
          <XAxis dataKey="time" type="number" domain={timeDomain} tickFormatter={formatTime} tick={{ fontSize: 11, fill: "#506a5c" }} axisLine={false} tickLine={false} minTickGap={35} height={25} />
          <YAxis domain={yDomain} tick={{ fontSize: 11, fill: "#506a5c" }} axisLine={false} tickLine={false} width={34} tickCount={4} tickFormatter={value => Number(value).toLocaleString(locale, { maximumFractionDigits: dataKey === "temp" ? 1 : 2 })} />
          <Tooltip cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "4 4", strokeOpacity: .4 }} labelFormatter={value => new Date(Number(value)).toLocaleTimeString(locale)} formatter={(value: number) => [`${Number(value).toFixed(2)}${unit ? ` ${unit}` : ""}`, title]} contentStyle={{ borderRadius: 12, border: "1px solid #dce7df", boxShadow: "0 8px 24px #173d2914", padding: "10px 14px", fontSize: 12 }} />
          <ReferenceArea y1={config.min} y2={config.max} fill="#10b981" fillOpacity={.08} />
          <ReferenceLine y={config.min} stroke="#059669" strokeDasharray="5 4" />
          <ReferenceLine y={config.max} stroke="#059669" strokeDasharray="5 4" />
          <Area fill={`url(#${gradientId})`} type="monotoneX" dataKey={dataKey} name={title} stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" dot={values.length < 3 ? { r: 3, fill: color, strokeWidth: 0 } : false} activeDot={{ r: 5, fill: color, stroke: "#fff", strokeWidth: 3 }} connectNulls={false} isAnimationActive={false} />
          {latest && <ReferenceDot x={latest.time} y={latest[dataKey]!} r={8} fill={color} fillOpacity={.12} stroke="none" isFront />}
          {latest && <ReferenceDot x={latest.time} y={latest[dataKey]!} r={4} fill={color} stroke="#fff" strokeWidth={2} isFront />}
        </ComposedChart>
      </ResponsiveContainer>
      {!hasData && <div className="pointer-events-none absolute inset-x-10 top-1/2 -translate-y-1/2 text-center"><span className="rounded-lg bg-white/90 px-3 py-1.5 text-[11px] text-slate-500">{language === "TH" ? "รอข้อมูลเซนเซอร์" : "Waiting for sensor data"}</span></div>}
    </div>

    </div>
  );
}

export function SensorTrendChart(props: Props) {
  return <div className="sensor-history-and-gauge"><SensorHistoryChart {...props} /><SensorGauge {...props} /></div>;
}
