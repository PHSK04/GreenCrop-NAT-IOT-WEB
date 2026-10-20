import { useMachine } from "@/contexts/MachineContext";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function SensorCharts() {
  const { telemetryHistory, boardConnected } = useMachine();
  const data = telemetryHistory.filter(row => Number.isFinite(Date.parse(row.timestamp)))
    .slice().sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)).slice(-120);
  return <section className="space-y-5 p-5">
    <div><h2 className="text-lg font-bold text-slate-900">กราฟ pH / EC / อุณหภูมิน้ำ</h2>
      <p className="mt-1 text-xs text-slate-500">ข้อมูลเซนเซอร์จริง 120 รายการล่าสุด · {boardConnected ? "อุปกรณ์ออนไลน์" : "อุปกรณ์ออฟไลน์ — แสดงข้อมูลย้อนหลังที่มี"}</p></div>
    {([
      { key: "phValue", label: "pH", unit: "", color: "#059669" },
      { key: "ecValue", label: "EC", unit: "mS/cm", color: "#0891b2" },
      { key: "tempValue", label: "อุณหภูมิน้ำ", unit: "°C", color: "#2563eb" },
    ] as const).map(metric => {
      const rows = data.map(row => ({ time: Date.parse(row.timestamp), value: Number.isFinite(row[metric.key]) && row[metric.key] > 0 ? row[metric.key] : null }));
      const hasData = rows.some(row => row.value !== null);
      return <div key={metric.key} className="rounded-2xl border border-slate-200 p-4">
        <h3 className="mb-3 text-sm font-semibold" style={{ color: metric.color }}>{metric.label} {metric.unit && `(${metric.unit})`}</h3>
        <div className="relative h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 15, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" type="number" domain={["dataMin", "dataMax"]} tickFormatter={value => new Date(value).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} fontSize={10} />
              <YAxis domain={["auto", "auto"]} fontSize={11} width={45} />
              <Tooltip labelFormatter={value => new Date(Number(value)).toLocaleString("th-TH")} />
              <Line dataKey="value" name={metric.label} unit={metric.unit} stroke={metric.color} strokeWidth={2} dot={{ r: 2 }} connectNulls={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
          {!hasData && <div className="pointer-events-none absolute inset-0 grid place-items-center"><span className="rounded-lg bg-white/95 px-4 py-2 text-sm text-slate-500">ยังไม่มีข้อมูลเซนเซอร์ {metric.label}</span></div>}
        </div>
      </div>;
    })}
  </section>;
}
