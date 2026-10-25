import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCycle,act,advance} from './cycle.mjs';
test('Manual waits five seconds and requires Start',()=>{
 const s=createCycle();act(s,'start');advance(s,4.9);assert.equal(s.pump,false);
 advance(s,.1);assert.equal(s.phase,'ready');assert.equal(s.pump,false);
 act(s,'start');assert.equal(s.pump,true);
});
test('Auto can be armed before stability confirmation',()=>{
 const s=createCycle();act(s,'auto');act(s,'start');assert.equal(s.pump,false);
 advance(s,5);assert.equal(s.pump,true);
});
test('Stop immediately silences and stops, with no idle transfer',()=>{
 const s=createCycle();advance(s,5);act(s,'start');advance(s,3);
 act(s,'stop');const level=s.destination;advance(s,30);
 assert.equal(s.pump,false);assert.equal(s.alarm,false);assert.equal(s.destination,level);
});
test('Full destination stops pump and gives five second alarm',()=>{
 const s=createCycle();advance(s,5);act(s,'start');
 for(let i=0;i<241;i++) advance(s,.1);
 assert.equal(s.pump,false);assert.equal(s.alarm,true);assert.equal(s.phase,'complete');
 advance(s,5);assert.equal(s.alarm,false);assert.equal(s.phase,'idle');
 act(s,'start');assert.equal(s.pump,false);
});
test('Emergency and ten minute timeout latch Fault',()=>{
 const s=createCycle();advance(s,5);act(s,'start');act(s,'fault');advance(s,60);
 assert.equal(s.pump,false);assert.equal(s.alarm,true);assert.equal(s.fault,true);
 act(s,'stop');assert.equal(s.fault,false);assert.equal(s.alarm,false);
 act(s,'start');s.pumpTime=599.95;advance(s,.1);
 assert.equal(s.fault,true);assert.equal(s.pump,false);
});
