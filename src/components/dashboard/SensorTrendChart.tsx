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
  ph: { color: "#12b77f", domain: [0, 14], min: 6.5, max: 7.5, range: "6.5–7.5", lowTH: "ผำเครียด โตช้า", highTH: "ผำขาดธาตุอาหารและตัวเหลือง", lowEN: "Stress and slower growth", highEN: "Nutrient deficiency and yellowing" },
  temp: { color: "#6f7fb8", domain: [0, 50], min: 25, max: 32, range: "25–32", lowTH: "อุณหภูมิต่ำกว่าช่วงที่กำหนด", highTH: "น้ำร้อนเกินไป ใกล้ 40°C ผำอาจชะงักและตาย", lowEN: "Below the specified temperature range", highEN: "Excess heat; near 40°C growth may stop and plants may die" },
  ec: { color: "#4f8c96", domain: [0, 5], min: .5, max: 1, range: "0.5–1.0", lowTH: "สารอาหารไม่พอ", highTH: "เสี่ยงผำน็อคปุ๋ยและเสียหาย", lowEN: "Insufficient nutrients", highEN: "Risk of fertilizer damage" },
} as const;

export function SensorTrendChart({ data, dataKey, title, unit, language = "TH", demo = false }: Props) {
  const config = metrics[dataKey];
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
  const yDomain = hasData ? [Math.max(0,low-padding),high+padding] : [...config.domain];
  const locale = language === "TH" ? "th-TH" : "en-GB";
  const formatTime = (time: number) => new Date(time).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  const thai = language === "TH";
  const current = latest?.[dataKey];
  const status = current == null ? "waiting" : current < config.min ? "low" : current > config.max ? "high" : "normal";
  const statusText = status === "waiting" ? (thai ? "รอข้อมูล" : "Waiting") : status === "low" ? (thai ? "ต่ำกว่าเกณฑ์" : "Below range") : status === "high" ? (thai ? "สูงกว่าเกณฑ์" : "Above range") : (thai ? "อยู่ในเกณฑ์" : "In range");
  const impact = status === "low" ? (thai ? config.lowTH : config.lowEN) : status === "high" ? (thai ? config.highTH : config.highEN) : "";

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-1 pb-2 text-xs">
        <span className="text-muted-foreground">{thai ? "เกณฑ์ที่กำหนด" : "Target range"}: {config.range} {unit}{dataKey === "ec" ? " (500–1,000 µS/cm)" : ""}</span>
        <span className={`rounded-full px-2 py-1 font-semibold ${status === "normal" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : status === "waiting" ? "bg-muted text-muted-foreground" : "bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"}`}>{statusText}{demo ? (thai ? " · จำลอง" : " · Demo") : ""}</span>
      </div>
    <div className="sensor-chart relative h-40 min-w-0 px-1 pt-2" role="img" aria-label={`${title}${demo ? " · ข้อมูลจำลอง" : ""} · ${language === "TH" ? "กราฟตามเวลา" : "time series"}${unit ? ` (${unit})` : ""}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={rows} margin={{ top: 10, right: 18, bottom: 0, left: 0 }} accessibilityLayer>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={config.color} stopOpacity={.26} /><stop offset="55%" stopColor={config.color} stopOpacity={.07} /><stop offset="100%" stopColor={config.color} stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid stroke="#e6ece8" strokeDasharray="2 5" vertical={false} />
          <XAxis dataKey="time" type="number" domain={timeDomain} tickFormatter={formatTime} tick={{ fontSize: 11, fill: "#506a5c" }} axisLine={false} tickLine={false} minTickGap={35} height={25} />
          <YAxis domain={yDomain} tick={{ fontSize: 11, fill: "#506a5c" }} axisLine={false} tickLine={false} width={34} tickCount={4} tickFormatter={value => Number(value).toLocaleString(locale, { maximumFractionDigits: dataKey === "temp" ? 1 : 2 })} />
          <Tooltip cursor={{ stroke: config.color, strokeWidth: 1, strokeDasharray: "4 4", strokeOpacity: .4 }} labelFormatter={value => new Date(Number(value)).toLocaleTimeString(locale)} formatter={(value: number) => [`${Number(value).toFixed(2)}${unit ? ` ${unit}` : ""}`, title]} contentStyle={{ borderRadius: 12, border: "1px solid #dce7df", boxShadow: "0 8px 24px #173d2914", padding: "10px 14px", fontSize: 12 }} />
          <ReferenceArea y1={config.min} y2={config.max} fill="#10b981" fillOpacity={.08} />
          <ReferenceLine y={config.min} stroke="#059669" strokeDasharray="5 4" />
          <ReferenceLine y={config.max} stroke="#059669" strokeDasharray="5 4" />
          <Area fill={`url(#${gradientId})`} type="monotoneX" dataKey={dataKey} name={title} stroke={config.color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" dot={values.length < 3 ? { r: 3, fill: config.color, strokeWidth: 0 } : false} activeDot={{ r: 5, fill: config.color, stroke: "#fff", strokeWidth: 3 }} connectNulls={false} isAnimationActive={false} />
          {latest && <ReferenceDot x={latest.time} y={latest[dataKey]!} r={8} fill={config.color} fillOpacity={.12} stroke="none" isFront />}
          {latest && <ReferenceDot x={latest.time} y={latest[dataKey]!} r={4} fill={config.color} stroke="#fff" strokeWidth={2} isFront />}
        </ComposedChart>
      </ResponsiveContainer>
      {!hasData && <div className="pointer-events-none absolute inset-x-10 top-1/2 -translate-y-1/2 text-center"><span className="rounded-lg bg-white/90 px-3 py-1.5 text-[11px] text-slate-500">{language === "TH" ? "รอข้อมูลเซนเซอร์" : "Waiting for sensor data"}</span></div>}
    </div>
    {impact && <div className="px-1 pt-2 text-xs text-amber-800 dark:text-amber-200">{impact}</div>}
    </div>
  );
}
