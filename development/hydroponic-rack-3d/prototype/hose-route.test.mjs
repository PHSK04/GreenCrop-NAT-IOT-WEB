import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hoseRoute} from './hose-route.mjs';
const hoses=JSON.parse(readFileSync(new URL('../models/hose-paths.json',import.meta.url)));
test('Both parallel hoses flow downward through upper and lower stages without reversing',()=>{
 for(const hose of hoses){
  const points=hoseRoute(hose);
  assert.ok(points[0].y>points.at(-1).y,hose.name);
  for(let i=1;i<points.length;i++)assert.ok(points[i].y<=points[i-1].y,hose.name+' flows upwards');
 }
 for(const prefix of ['Blue irrigation hose','Reservoir return hose']){
  const a=hoseRoute(hoses.find(h=>h.name===prefix));
  const b=hoseRoute(hoses.find(h=>h.name===prefix+'.001'));
  for(let i=0;i<a.length;i++){
   assert.ok(Math.abs((b[i].x-a[i].x)-.022)<1e-6);
   assert.ok(Math.abs(b[i].y-a[i].y)<1e-6);
   assert.ok(Math.abs(b[i].z-a[i].z)<1e-6);
  }
 }
});
test('Main hoses meet at the existing tray fitting and pass through every original compression fitting',()=>{
 for(const suffix of ['', '.001']){
  const upper=hoseRoute(hoses.find(h=>h.name==='Blue irrigation hose'+suffix));
  const lower=hoseRoute(hoses.find(h=>h.name==='Reservoir return hose'+suffix));
  assert.ok(upper.at(-1).distanceTo(lower[0])<1e-7);
  const x=suffix?-.488:-.510;
  for(const y of [1.020,.700,.390,.290]){
   const route=y>.700?upper:lower;
   const a=route.at(-2),b=route.at(-1);
   const ratio=(y-a.y)/(b.y-a.y),point=a.clone().lerp(b,ratio);
   assert.ok(Math.abs(point.x-x)<1e-6);assert.ok(Math.abs(point.z-.150)<1e-6);
  }
 }
});
