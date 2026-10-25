import { useMemo, useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CropYieldEntry } from '@/utils/cropYieldStore';
import { dailyHarvestSeries } from '@/utils/harvestReport';
import { BarChart3 } from 'lucide-react';

export function HarvestReportChart({ rows, language = 'TH' }: { rows: CropYieldEntry[]; language?: string }) {
  const isTH = language === 'TH';
  const [quality, setQuality] = useState<'avgPh' | 'avgEc' | 'avgTemp'>('avgPh');
  const data = useMemo(() => dailyHarvestSeries(rows), [rows]);
  const metrics = [{ key: 'avgPh', label: 'pH', unit: '' }, { key: 'avgEc', label: 'EC', unit: 'mS/cm' }, { key: 'avgTemp', label: isTH ? 'อุณหภูมิ' : 'Temperature', unit: '°C' }] as const;
  const selected = metrics.find(metric => metric.key === quality)!;
  return <section className="report-chart" aria-label={isTH ? 'กราฟผลผลิตและคุณภาพตามช่วงที่เลือก' : 'Filtered harvest and quality chart'}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="workspace-eyebrow">{isTH ? 'แนวโน้มตามช่วงที่เลือก' : 'SELECTED PERIOD'}</p><h2 className="mt-1 text-lg font-semibold">{isTH ? 'ผลผลิตและคุณภาพน้ำ' : 'Harvest & water quality'}</h2></div>
      <div className="workspace-segments" role="group" aria-label={isTH ? 'เลือกค่าคุณภาพน้ำในกราฟ' : 'Chart quality metric'}>{metrics.map(metric => <button type="button" key={metric.key} aria-pressed={quality === metric.key} onClick={() => setQuality(metric.key)}>{metric.label}</button>)}</div>
    </div>
    {data.length ? <div className="mt-6 h-64 sm:h-80"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
      <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 6" />
      <XAxis dataKey="date" tickFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString(isTH ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short' })} tickLine={false} axisLine={false} minTickGap={28} fontSize={13} />
      <YAxis yAxisId="yield" width={52} tickLine={false} axisLine={false} fontSize={13} />
      <YAxis yAxisId="quality" orientation="right" width={42} tickLine={false} axisLine={false} domain={['auto', 'auto']} fontSize={13} />
      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, color: 'hsl(var(--foreground))' }} labelFormatter={value => new Date(`${value}T00:00:00`).toLocaleDateString(isTH ? 'th-TH' : 'en-GB')} />
      <Legend iconType="circle" wrapperStyle={{ paddingTop: 16, fontSize: 14 }} />
      <Bar yAxisId="yield" dataKey="totalYield" name={isTH ? 'ผลผลิต' : 'Harvest'} unit=" g" fill="#12b77f" radius={[5, 5, 0, 0]} maxBarSize={48} isAnimationActive={false} />
      <Line yAxisId="quality" dataKey={quality} name={selected.label} unit={selected.unit ? ` ${selected.unit}` : ''} stroke="#6f7fb8" strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
    </ComposedChart></ResponsiveContainer></div> : <div className="mt-5 flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 text-center"><BarChart3 className="h-7 w-7 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">{isTH ? 'ยังไม่มีรายการในช่วงนี้ ลองเปลี่ยนตัวกรองหรือเพิ่มผลผลิต' : 'No records in this period. Change the filter or add a harvest.'}</p></div>}
  </section>;
}
