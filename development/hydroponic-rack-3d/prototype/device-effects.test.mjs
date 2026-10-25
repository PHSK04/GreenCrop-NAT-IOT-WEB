import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDeviceEffects} from './device-effects.js';
function fixture(){const group=new THREE.Group();return {group,fx:createDeviceEffects(group)};}
function run(fx,working,seconds,fault=false){for(let i=0;i<seconds*60;i++)fx.update(1/60,working,fault,[]);}
test('Fan has no wind or rotation at idle, rotates only while enabled and working',()=>{
 const {group,fx}=fixture();run(fx,false,2);
 const rotor=group.getObjectByName('fan-rotor');assert.equal(rotor.visible,false);assert.equal(rotor.rotation.y,0);
 run(fx,true,2);assert.equal(rotor.visible,true);assert.ok(rotor.rotation.y>0);
 const a=group.getObjectByName('fan-air-0');assert.equal(a.visible,true);
 fx.toggleFan();run(fx,true,5);assert.equal(rotor.visible,false);assert.equal(a.visible,false);
 const angle=rotor.rotation.y;run(fx,false,2);assert.equal(rotor.rotation.y,angle);
});
test('Lamp click lights the tray and off/fault fades it completely',()=>{
 const {group,fx}=fixture();const lamp=group.getObjectByName('grow-spotlight');
 run(fx,false,1);assert.equal(lamp.intensity,0);
 fx.toggleLight();run(fx,false,1);assert.ok(lamp.intensity>1);
 fx.toggleLight();run(fx,false,3);assert.equal(lamp.intensity,0);
 fx.toggleLight();run(fx,true,1);run(fx,true,4,true);assert.equal(lamp.intensity,0);
});
test('Direct fan inspection reveals blades, animates air and Stop settles the cover',()=>{
 const {group,fx}=fixture();
 const cover=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial());
 fx.registerCover(cover,'fan');fx.inspectFan();run(fx,false,2);
 assert.ok(cover.material.opacity<.2);assert.equal(group.getObjectByName('fan-rotor').visible,true);
 assert.ok(fx.airStrength>.9);fx.stopFan();run(fx,false,4);
 assert.equal(fx.airStrength,0);assert.ok(cover.material.opacity>.999);
 const phase=fx.airTime;run(fx,false,1);assert.equal(fx.airTime,phase);
});
