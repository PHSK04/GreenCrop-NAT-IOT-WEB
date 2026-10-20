import { useMemo, useState } from "react";
import { useMachine } from "@/contexts/MachineContext";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../ui/button";

const metrics = [
  { key: "phValue", label: "pH", unit: "", color: "#059669" },
  { key: "ecValue", label: "EC", unit: "mS/cm", color: "#0891b2" },
  { key: "tempValue", label: "Temp", unit: "°C", color: "#64748b" },
] as const;

export function SensorCharts({ language = "TH" }: { language?: string }) {
  const { telemetryHistory, boardConnected } = useMachine();
  const [selected, setSelected] = useState(0);
  const isTH = language === "TH";
  const metric = metrics[selected];
  const locale = isTH ? "th-TH" : "en-GB";
  const rows = useMemo(() => telemetryHistory
    .filter(row => Number.isFinite(Date.parse(row.timestamp)))
    .slice().sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)).slice(-120)
    .map(row => ({ time: Date.parse(row.timestamp), value: Number.isFinite(row[metric.key]) && row[metric.key] > 0 ? row[metric.key] : null })), [telemetryHistory, metric.key]);
  const hasData = rows.some(row => row.value !== null);
  return <section className="p-5 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="font-semibold">{isTH ? "แนวโน้มคุณภาพน้ำ" : "Water quality trend"}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{isTH ? "120 รายการล่าสุด" : "Last 120 readings"} · {boardConnected ? (isTH ? "เชื่อมต่อแล้ว" : "Connected") : (isTH ? "ข้อมูลย้อนหลัง" : "Historical data")}</p></div>
      <div className="flex gap-1 rounded-xl bg-muted p-1" role="group" aria-label={isTH ? "เลือกกราฟเซนเซอร์" : "Choose sensor chart"}>
        {metrics.map((item, index) => <Button key={item.key} variant={selected === index ? "secondary" : "ghost"} size="sm" aria-pressed={selected === index} onClick={() => setSelected(index)}>{item.label}</Button>)}
      </div>
    </div>
    <p className="mb-3 mt-7 text-xs text-muted-foreground">{metric.key === "tempValue" ? (isTH ? "อุณหภูมิน้ำ" : "Water temperature") : metric.label}{metric.unit && ` (${metric.unit})`}</p>
    <div className="relative h-[300px] md:h-[380px]">
      {hasData ? <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 12, right: 12, bottom: 8, left: -10 }}>
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 5" />
          <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} tickFormatter={value => new Date(value).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} tickLine={false} axisLine={false} minTickGap={45} fontSize={11} />
          <YAxis domain={["auto", "auto"]} tickLine={false} axisLine={false} fontSize={11} width={50} />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, color: "hsl(var(--foreground))" }} labelFormatter={value => new Date(Number(value)).toLocaleString(locale)} />
          <Line dataKey="value" name={metric.label} unit={metric.unit} stroke={metric.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer> : <div className="absolute inset-0 grid place-items-center rounded-xl bg-muted/25"><div className="text-center"><p className="text-sm text-muted-foreground">{isTH ? "ยังไม่มีข้อมูลเซนเซอร์" : "No sensor readings yet"}</p><p className="mt-2 text-xs text-muted-foreground">{isTH ? "กราฟจะแสดงเมื่อได้รับข้อมูลจากอุปกรณ์" : "The chart appears when device readings arrive"}</p></div></div>}
    </div>
  </section>;
}
