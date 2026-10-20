import type { CropYieldEntry } from './cropYieldStore';

export type HarvestFilters = { month: string; startDate: string; endDate: string; startTime: string; endTime: string };
export function filterHarvestRows(rows: CropYieldEntry[], filters: HarvestFilters) {
  const { month, startDate, endDate, startTime, endTime } = filters;
  const start = startDate ? `${startDate} ${startTime || '00:00'}` : '';
  const end = endDate ? `${endDate} ${endTime || '23:59'}` : '';
  return rows.filter(row => {
    const at = `${row.date} ${row.time || '00:00'}`;
    return (!month || row.date.startsWith(month)) && (!start || at >= start) && (!end || at <= end)
      && (Boolean(startDate) || !startTime || row.time >= startTime)
      && (Boolean(endDate) || !endTime || row.time <= endTime);
  });
}
const average = (rows: CropYieldEntry[], key: 'ph' | 'ec' | 'temp') => {
  const values = rows.map(row => row[key]).filter(Number.isFinite);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100 : null;
};
export function summarizeHarvestRows(rows: CropYieldEntry[]) {
  return { days: new Set(rows.map(row => row.date)).size, records: rows.length,
    totalYield: Math.round(rows.reduce((sum, row) => sum + row.yield, 0) * 100) / 100,
    avgPh: average(rows, 'ph'), avgEc: average(rows, 'ec'), avgTemp: average(rows, 'temp') };
}
export function dailyHarvestSeries(rows: CropYieldEntry[]) {
  const groups = new Map<string, CropYieldEntry[]>();
  rows.forEach(row => {
    const daily = groups.get(row.date) ?? [];
    daily.push(row);
    groups.set(row.date, daily);
  });
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, daily]) => ({ date, ...summarizeHarvestRows(daily) }));
}
