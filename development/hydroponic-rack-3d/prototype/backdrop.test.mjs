import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createBackdrop} from './backdrop.js';
test('Room animation changes ventilation and telemetry, and freezes with zero delta or reduced motion',()=>{
 const scene=new THREE.Scene(),room=createBackdrop(scene);
 const rotor=scene.getObjectByName('room-vent-rotor'),graph=scene.getObjectByName('room-telemetry-graph');
 room.update(.1);const angle=rotor.rotation.z,vertices=[...graph.geometry.attributes.position.array];
 room.update(1);assert.notEqual(rotor.rotation.z,angle);assert.notDeepEqual([...graph.geometry.attributes.position.array],vertices);
 const paused=rotor.rotation.z;room.update(0);assert.equal(rotor.rotation.z,paused);room.update(2,true);assert.equal(rotor.rotation.z,paused);
});
test('Wall display and ventilation have a clear physical gap',()=>{
 const scene=new THREE.Scene();createBackdrop(scene);scene.updateMatrixWorld(true);
 const panel=new THREE.Box3().setFromObject(scene.getObjectByName('room-live-panel'));
 const fan=new THREE.Box3().setFromObject(scene.getObjectByName('room-ventilation'));
 assert.ok(panel.min.y-fan.max.y>.06);
});
