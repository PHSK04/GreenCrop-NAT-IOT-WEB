import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperator} from './operator.js';
test('Operator demonstration presses once and leaves; cancelling prevents a delayed Start',()=>{
 let presses=0;const scene=new THREE.Scene();const operator=createOperator(scene,()=>presses++);
 operator.start();operator.start();
 for(let i=0;i<200;i++)operator.update(1/60);
 assert.equal(presses,1);assert.equal(operator.active,true);
 for(let i=0;i<200;i++)operator.update(1/60);
 assert.equal(operator.active,false);assert.equal(scene.getObjectByName('lab-operator').visible,false);
 operator.start();operator.update(.3);operator.cancel();
 for(let i=0;i<400;i++)operator.update(1/60);
 assert.equal(presses,1);
});
