import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
const source = readFileSync(new URL('../../src/utils/harvestReport.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { filterHarvestRows: filter, summarizeHarvestRows: summarize, dailyHarvestSeries: series } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const rows = [
  { id:'1', date:'2026-10-20', time:'08:00', yield:100, ph:6, ec:1, temp:24 },
  { id:'2', date:'2026-10-20', time:'18:00', yield:200, ph:8, ec:2, temp:26 },
  { id:'3', date:'2026-10-21', time:'09:00', yield:50, ph:7, ec:3, temp:28 },
  { id:'4', date:'2026-09-30', time:'12:00', yield:900, ph:9, ec:4, temp:30 },
];
const empty = { month:'', startDate:'', endDate:'', startTime:'', endTime:'' };
test('month filter supplies the same selected records for summaries, charts and exports', () => {
  const selected = filter(rows, { ...empty, month:'2026-10' });
  assert.deepEqual(selected.map(row=>row.id), ['1','2','3']);
  assert.equal(summarize(selected).totalYield, 350);
  assert.equal(series(selected).reduce((sum,day)=>sum+day.totalYield,0),350);
});
test('date-time boundaries include records at both ends, including overnight ranges', () => {
  assert.deepEqual(filter(rows,{...empty,startDate:'2026-10-20',startTime:'18:00',endDate:'2026-10-21',endTime:'09:00'}).map(row=>row.id),['2','3']);
});
test('time-only search filters each day without silently changing the date range',()=>{
  assert.deepEqual(filter(rows,{...empty,startTime:'09:00',endTime:'12:00'}).map(row=>row.id),['3','4']);
});
test('multiple harvests in a day count as one day and aggregate to one chart point',()=>{
  const summary=summarize(rows.slice(0,2));
  assert.equal(summary.days,1); assert.equal(summary.records,2); assert.equal(summary.avgPh,7);
  assert.equal(series(rows.slice(0,2))[0].totalYield,300);
});
test('daily chart points are chronological and quality values are actual averages',()=>{
  const points=series(rows); assert.deepEqual(points.map(p=>p.date),['2026-09-30','2026-10-20','2026-10-21']);
  assert.equal(points[1].avgEc,1.5); assert.equal(points[1].avgTemp,25);
});
test('empty results have no fabricated quality values or chart points',()=>{
  assert.deepEqual(series([]),[]); assert.equal(summarize([]).avgPh,null); assert.equal(summarize([]).totalYield,0);
});
