import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWaterEffects} from './water-effects.js';
test('Jets join each nozzle exactly and terminate at the actual changing surface',()=>{
 const machine=new THREE.Group(),water=createWaterEffects(machine);
 for(const level of [0,.5,1]){
  water.update(1,1,3.2,level);
  const jets=machine.getObjectByName('continuous-water-jets').children.slice(0,2);
  jets.forEach((jet,i)=>{
   const p=jet.geometry.attributes.position,origin=water.outlets[i];
   assert.ok(Math.abs(p.getY(0)-origin.y)<1e-6);
   assert.ok(Math.abs(p.getY(264)-(.673+.04*level+.0008))<1e-6);
   const radius=Math.abs(p.getX(0)-origin.x);
   assert.ok(Math.abs(radius-.0048)<1e-6);
   assert.ok([...p.array].every(Number.isFinite));
  });
 }
});
test('Stopped jets disappear, impacts settle, and weaker flow has a thinner column',()=>{
 const machine=new THREE.Group(),water=createWaterEffects(machine);
 const jet=machine.getObjectByName('continuous-water-jets').children[0];
 water.update(1,1,1,.5);const full=jet.geometry.attributes.position.getX(0)-water.outlets[0].x;
 water.update(.25,.3,1,.5);const low=jet.geometry.attributes.position.getX(0)-water.outlets[0].x;
 assert.ok(low>0&&low<full);water.update(0,0,1,.5);
 assert.equal(jet.visible,false);
 for(const ring of machine.getObjectByName('continuous-water-jets').children.slice(2))assert.equal(ring.visible,false);
});
test('Blue bands move through a continuous jet and freeze when animation time stops',()=>{
 const machine=new THREE.Group(),water=createWaterEffects(machine);
 const jet=machine.getObjectByName('continuous-water-jets').children[0];
 water.update(1,1,1,.5);const first=[...jet.geometry.attributes.color.array];
 water.update(1,1,1.2,.5);const moving=[...jet.geometry.attributes.color.array];
 assert.notDeepEqual(moving,first);
 water.update(0,0,1.2,.5);assert.deepEqual([...jet.geometry.attributes.color.array],moving);
});
