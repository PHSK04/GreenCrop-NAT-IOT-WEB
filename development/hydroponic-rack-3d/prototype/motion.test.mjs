import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMotion,stepMotion} from './motion.mjs';
test('Idle has no flow, waves, motor motion, or advancing animation phase',()=>{
 const s=createMotion();for(let i=0;i<600;i++)stepMotion(s,false,1/60);
 assert.deepEqual(s,createMotion());
});
test('Start ramps flow; Stop coasts then freezes every animation phase',()=>{
 const s=createMotion();stepMotion(s,true,1/60);assert.ok(s.flow>0&&s.flow<1);
 for(let i=0;i<120;i++)stepMotion(s,true,1/60);
 const before=s.flow;stepMotion(s,false,1/60);assert.ok(s.flow>0&&s.flow<before);
 for(let i=0;i<600;i++)stepMotion(s,false,1/60);
 assert.equal(s.flow,0);assert.equal(s.ripple,0);
 const frozen={...s};for(let i=0;i<120;i++)stepMotion(s,false,1/60);
 assert.deepEqual(s,frozen);
});
