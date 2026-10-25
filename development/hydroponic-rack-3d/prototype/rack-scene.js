import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createWaterEffects} from './water-effects.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import hosePaths from '../models/hose-paths.json';
import {hoseRoute} from './hose-route.mjs';
import {createCycle,act,advance,phaseText} from './cycle.mjs';
import {createMotion,stepMotion} from './motion.mjs';
import {createDeviceEffects} from './device-effects.js';
import {createBackdrop} from './backdrop.js';
import {createOperator} from './operator.js';

export function createRackScene(root) {
let disposed=false;let operator=null;let ambientPaused=false;
const viewport = root.querySelector('#viewport');
const status = root.querySelector('#status');
const scene = new THREE.Scene();
const machine=new THREE.Group(); scene.add(machine);
const deviceEffects=createDeviceEffects(machine);
const lightMeshes=[];
const deviceTargets=[];
let cycle=createCycle();
let flowSpeed=0;
const motion=createMotion();
let lcdTexture=null;
let lcdContext=null;
let lastLcdText='';
let flowProgress=0;
let disturbance=0;
const controls=[];
const controlTargets=[];
const pressAnimations=[];
const selectorParts=[];
let selectorGroup=null;
const feedback=document.createElement('div');feedback.className='action-feedback';feedback.setAttribute('aria-live','polite');
feedback.textContent='กดปุ่มเขียวล่างเพื่อ Start · ปุ่มแดงล่างเพื่อ Stop';
function animatePress(object) {
 if(!object||object.userData.action==='mode') return;
 if(object.userData.restX===undefined){object.userData.restX=object.position.x;object.userData.restScale=object.scale.clone();}
 const existing=pressAnimations.find(entry=>entry.object===object);
 if(existing) existing.start=performance.now();
 else pressAnimations.push({object,start:performance.now(),x:object.userData.restX,scale:object.userData.restScale});
}
function performAction(action,object) {
 animatePress(object);
 if(action==='stop'||action==='fault')operator.cancel();
 const before=cycle.phase;
 act(cycle,action);
 if(action==='stop'||action==='fault')deviceEffects.stopFan();
 let message=({manual:'เลือก Manual · ไฟขาวติด',auto:'เลือก Auto · ไฟเขียวติด',mode:`หมุนสวิตช์เป็น ${cycle.mode.toUpperCase()}`,stop:'Stop · ปั๊มหยุด และน้ำค่อย ๆ สงบ',fault:'Emergency · หยุดฉุกเฉิน / ไฟแดงและ Alarm ติด'})[action];
 if(action==='start') {
   message=cycle.pump?'Start · ปั๊มเริ่มทำงาน น้ำเริ่มไหล':cycle.fault?'Start ไม่ได้ · กด Stop เพื่อล้าง Fault':cycle.destination>=1?'ปลายทางเต็ม · กดรอบใหม่ก่อนเริ่ม':before==='stabilizing'?`รอระดับน้ำคงที่ ${Math.ceil(5-cycle.elapsed)} วินาที${cycle.armed?' · Auto เตรียมเริ่มแล้ว':''}`:'น้ำต้นทางยังไม่พร้อม';
 }
 feedback.textContent=message;
 for(const {node,target} of [...controlTargets,...secondTargets]) {
   if(node===object){target.classList.remove('press-flash');void target.offsetWidth;target.classList.add('press-flash');}
 }
}
const lamps=[];
const hud=document.createElement('div');hud.className='machine-state';hud.setAttribute('role','status');viewport.append(hud);
const tip=document.createElement('div');tip.className='part-tip';tip.hidden=true;viewport.append(tip);
const controlActions={
  'Upper green button cap':{action:'auto',label:'Auto · ไฟเขียว'},
  'Upper white button cap':{action:'manual',label:'Manual · ไฟขาว'},
  'Lower green button cap':{action:'start',label:'Start · เริ่มปั๊ม'},
  'Lower red button cap':{action:'stop',label:'Stop · หยุดปั๊มและ Alarm'},
  'Emergency stop mushroom':{action:'fault',label:'Emergency · หยุดฉุกเฉิน / Fault'},
  'Black rotary selector cap':{action:'mode',label:'สลับ Manual / Auto'},
  'Selector raised grip':{action:'mode',label:'สลับ Manual / Auto'},
};
const roomScene=scene;
scene.background=new THREE.Color('#f1f2f2');
const backdrop=createBackdrop(scene);
const camera=new THREE.PerspectiveCamera(30,1,.01,40);
const secondCamera=camera;
const secondViewport=root.querySelector('#second-viewport');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
const reflectionRoom=new RoomEnvironment();
const pmrem=new THREE.PMREMGenerator(renderer);
const reflectionTarget=pmrem.fromScene(reflectionRoom,.06);
scene.environment=reflectionTarget.texture;scene.environmentIntensity=.48;
reflectionRoom.dispose();pmrem.dispose();
const secondRenderer=renderer;
const orbit=new OrbitControls(camera,renderer.domElement);orbit.enableDamping=true;orbit.dampingFactor=.08;orbit.minDistance=1.05;orbit.maxDistance=7;orbit.maxPolarAngle=Math.PI/2-.04;orbit.target.set(-.05,.77,-.15);

let cameraTouched=false;orbit.addEventListener('start',()=>{cameraTouched=true;});
const secondTargets=[];let secondClose=false;
viewport.append(renderer.domElement);renderer.domElement.setAttribute('aria-label','เครื่องสองมุมบนพื้นเดียวกันในห้องสามมิติ');
root.querySelector('.machine-scene').append(feedback);
root.querySelector('#second-focus').addEventListener('click',()=>{secondClose=!secondClose;fitCamera();});
const leftStage=new THREE.Group();leftStage.position.x=-.48;scene.add(leftStage);leftStage.add(machine);
const rightStage=new THREE.Group();rightStage.position.x=.82;rightStage.position.z=-.48;rightStage.rotation.y=-Math.PI/2;scene.add(rightStage);
let secondMachine=null;const mirrorPairs=[];const sourceFor=new WeakMap();const copyFor=new WeakMap();
function mirrorMachine(){
  if(!secondMachine){
    secondMachine=machine.clone(true);rightStage.add(secondMachine);renderer.shadowMap.needsUpdate=true;
    const originals=[],copies=[];machine.traverse(n=>originals.push(n));secondMachine.traverse(n=>copies.push(n));
    originals.forEach((source,i)=>{mirrorPairs.push([source,copies[i]]);sourceFor.set(copies[i],source);copyFor.set(source,copies[i]);});
    for(const [source,copy] of mirrorPairs)if(source.isSpotLight)copy.target=copyFor.get(source.target)||source.target;
  }
  for(const [source,copy] of mirrorPairs){copy.position.copy(source.position);copy.quaternion.copy(source.quaternion);copy.scale.copy(source.scale);copy.visible=source.visible;if(source.isLight)copy.intensity=source.intensity;}
  scene.updateMatrixWorld(true);
}
scene.add(new THREE.HemisphereLight(0xffffff, 0xb4c3b8, 1.65));
const sun = new THREE.DirectionalLight(0xfff3dc, 2.8);
sun.position.set(-2.5, 5, 3.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048,2048);
sun.shadow.camera.left=-2.5; sun.shadow.camera.right=2.5;
sun.shadow.camera.top=2; sun.shadow.camera.bottom=-2;
sun.shadow.normalBias=.002; sun.shadow.bias=-.0002;
sun.shadow.radius=2;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xe7efff, 1.5);
fill.position.set(3,3,-2); scene.add(fill);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0xe3e5e6,roughness:.42,metalness:.04}));
floor.rotation.x=-Math.PI/2; floor.position.y=.002; floor.receiveShadow=true; roomScene.add(floor);
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=128;shadowCanvas.height=128;
const shadowContext=shadowCanvas.getContext('2d');const gradient=shadowContext.createRadialGradient(64,64,4,64,64,64);
gradient.addColorStop(0,'rgba(35,45,39,.24)');gradient.addColorStop(.4,'rgba(35,45,39,.12)');gradient.addColorStop(1,'rgba(35,45,39,0)');shadowContext.fillStyle=gradient;shadowContext.fillRect(0,0,128,128);
const contactTexture=new THREE.CanvasTexture(shadowCanvas);
for(const stage of [leftStage,rightStage])for(const x of [-.55,.55])for(const z of [-.19,.19]){
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(.21,.16),new THREE.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
 shadow.rotation.x=-Math.PI/2;shadow.position.set(x,.001,z);stage.updateMatrixWorld(true);shadow.position.applyMatrix4(stage.matrixWorld);scene.add(shadow);
}
const grid = new THREE.GridHelper(30,100,0xc8cdc1,0xd6dbcf);
grid.position.y=.003;
grid.material.transparent=true; grid.material.opacity=.14; grid.material.depthWrite=false; roomScene.add(grid);

const modelBounds = new THREE.Box3(new THREE.Vector3(-.64,.01,-.24),new THREE.Vector3(.76,1.52,.24));
const center = modelBounds.getCenter(new THREE.Vector3());
const corners=[];
function updateCorners() {
  corners.length=0;
  for(const x of [modelBounds.min.x,modelBounds.max.x])
    for(const y of [modelBounds.min.y,modelBounds.max.y])
      for(const z of [modelBounds.min.z,modelBounds.max.z]) corners.push(new THREE.Vector3(x,y,z));
}
updateCorners();
let view='full';
let loaded=false;
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const directions={full:new THREE.Vector3(0,.10,1).normalize(),side:new THREE.Vector3(1,.12,.24).normalize(),panel:new THREE.Vector3(1,.02,.05).normalize()};
const direction=directions.full.clone();
const trays=[];
const trayTargets=[];
const trayMaterials=[];
const raycaster=new THREE.Raycaster();
const pointer=new THREE.Vector2();
let hoveredTray=null;
const temp=new THREE.Vector3();
function fitCamera(){
 const aspect=viewport.clientWidth/Math.max(1,viewport.clientHeight);camera.aspect=aspect;
 const close=secondClose||view==='panel';
 const focus=close?new THREE.Vector3(.82,.82,.25):new THREE.Vector3(-.05,.77,-.15);
 const distance=close?1.05:Math.max(operator?.active?4.25:3.35,(operator?.active?5.1:4.7)/aspect);
 camera.position.copy(focus).add(new THREE.Vector3(0,.16,distance));orbit.target.copy(focus);camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();orbit.update();
}
function projectedPixels(node,diameter){
 const position=new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse);
 return diameter*viewport.clientHeight/(2*Math.max(.01,-position.z)*Math.tan(THREE.MathUtils.degToRad(camera.fov/2)));
}
function fitSecondCamera(){}
function resize(){
 // Preserve crisp edges on large displays without rendering an unbounded canvas.
 const pixelBudget=viewport.clientWidth<=700?3200000:6400000;
 const ratio=Math.min(Math.max(1,window.devicePixelRatio||1),2,Math.sqrt(pixelBudget/Math.max(1,viewport.clientWidth*viewport.clientHeight)));
 renderer.setPixelRatio(ratio);renderer.setSize(viewport.clientWidth,viewport.clientHeight);camera.aspect=viewport.clientWidth/Math.max(1,viewport.clientHeight);camera.updateProjectionMatrix();if(!cameraTouched)fitCamera();
}
const layoutObserver=new ResizeObserver(resize);layoutObserver.observe(viewport);layoutObserver.observe(secondViewport);

new GLTFLoader().load(new URL('../models/hydroponic-rack-control-v2.glb',import.meta.url).href, ({scene:model})=>{
  if(disposed)return;
  model.traverse(node=>{
    if(!node.isMesh) return;
    node.castShadow=true; node.receiveShadow=true;
    // Soften the palette without changing the authored geometry or device positions.
    const materials=(Array.isArray(node.material)?node.material:[node.material]).map(original=>{
      const material=original.clone();
      for(const key of ['map','normalMap','roughnessMap','metalnessMap']){
        const texture=material[key];
        if(texture){texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;}
      }
      const hsl={};material.color.getHSL(hsl);
      if(hsl.l<.12) material.color.lerp(new THREE.Color('#4a5155'),.25);
      else if(hsl.s>.30) material.color.lerp(new THREE.Color('#eef0f0'),.20);
      if(hsl.l>.65&&hsl.s<.2)material.color.lerp(new THREE.Color('#f1f2f2'),.06);
      material.roughness=Math.max(.58,material.roughness);
      // Distinct physical responses instead of one matte finish on every part.
      const name=original.name.toLowerCase();
      if(name.includes('stainless')){material.color.set('#aebbb8');material.metalness=.82;material.roughness=.32;material.envMapIntensity=.9;}
      else if(name.includes('graphite')){material.color.set('#3a4144');material.metalness=.3;material.roughness=.46;material.envMapIntensity=.65;}
      else if(name.includes('hdpe')){material.color.set('#f7f8f2');material.metalness=0;material.roughness=.43;material.envMapIntensity=.5;}
      else if(name.includes('rubber')||name.includes('seal')){material.color.set('#25312d');material.metalness=0;material.roughness=.9;material.envMapIntensity=.2;}
      else if(name.includes('nickel')){material.metalness=.85;material.roughness=.24;material.envMapIntensity=.8;}
      else if(name.includes('powder coat')){material.metalness=.22;material.roughness=.44;material.envMapIntensity=.55;}
      material.emissiveIntensity=0;
      return material;
    });
    node.material=Array.isArray(node.material)?materials:materials[0];
    const part=node.userData.part||'';
    if(part==='grow_light') {lightMeshes.push(node);deviceEffects.registerCover(node,'light');}
    if(part==='fan') deviceEffects.registerCover(node,'fan');
    if(part==='water_hose') {
      node.visible=false;
      for(const material of Array.isArray(node.material)?node.material:[node.material]) {
        material.transparent=true;material.opacity=.26;material.depthWrite=false;
        material.color.set('#86cee3');
      }
    }
    if(part.startsWith('control:')) {
      const name=part.replace('control:CP2 | ','');
      if(name.includes('bezel')) {
        for(const material of Array.isArray(node.material)?node.material:[node.material]) {
          material.metalness=.7;material.roughness=.25;
        }
      }
      if(name==='LCD illuminated window') {
        const box=new THREE.Box3().setFromObject(node);
        const size=box.getSize(new THREE.Vector3());
        const position=box.getCenter(new THREE.Vector3());
        const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192;
        lcdContext=canvas.getContext('2d');lcdTexture=new THREE.CanvasTexture(canvas);
        lcdTexture.colorSpace=THREE.SRGBColorSpace;
        const display=new THREE.Mesh(new THREE.PlaneGeometry(size.z*.94,size.y*.88),new THREE.MeshBasicMaterial({map:lcdTexture,toneMapped:false}));
        display.rotation.y=Math.PI/2;display.position.copy(position);display.position.x=box.max.x+.0006;
        scene.add(display);node.attach(display);
      }
      if(['Selector raised grip','Selector white position stripe'].includes(name)) selectorParts.push(node);
      const action=controlActions[name];
      if(action) {
        node.userData.action=action.action;node.userData.label=action.label;
        controls.push(node);
        if(name!=='Selector raised grip') {
          const target=document.createElement('button');
          target.className='model-button';target.setAttribute('aria-label',action.label);
          target.title=action.label;
          target.addEventListener('pointerdown',()=>animatePress(node));
          target.addEventListener('click',()=>performAction(action.action,node));
          viewport.append(target);controlTargets.push({node,target});
          const secondTarget=target.cloneNode(true);
          secondTarget.setAttribute('aria-label','ด้านข้าง: '+action.label);
          secondTarget.addEventListener('pointerdown',()=>animatePress(node));
          secondTarget.addEventListener('click',()=>performAction(action.action,node));
          secondViewport.append(secondTarget);secondTargets.push({node,target:secondTarget});
        }
      }
      if(name.includes('cap')||name==='Emergency stop mushroom') {
        const old=Array.isArray(node.material)?node.material[0]:node.material;
        node.material=old.clone();node.material.emissiveIntensity=0;
        node.material.roughness=.28;node.material.metalness=.13;
        const lampType={'Upper left pilot light cap':'pump','Upper green button cap':'auto','Upper white button cap':'manual','Lower red button cap':'fault','Lower amber indicator cap':'alarm'}[name];
        if(lampType) lamps.push({mesh:node,type:lampType,color:node.material.color.clone()});
      }
    }
    if(['grow_tray','lower_reservoir'].includes(node.userData.part)) {
      const original=Array.isArray(node.material)?node.material:[node.material];
      const materials=original.map(material=>{
        const copy=material.clone();
        copy.transparent=false;copy.opacity=1;copy.depthWrite=true;copy.side=THREE.DoubleSide;
        trayMaterials.push({material:copy,target:1});return copy;
      });
      node.material=Array.isArray(node.material)?materials:materials[0];
      node.userData.materials=materials; node.userData.seeThrough=false;
      trays.push(node);
      const target=document.createElement('button');
      target.className='model-tray';
      target.setAttribute('aria-label',node.userData.part==='grow_tray'?'แตะถาดเพาะเลี้ยงเพื่อดูน้ำภายใน':'แตะถาดล่างเพื่อดูน้ำภายใน');
      target.setAttribute('aria-pressed','false');
      target.title='แตะถาด · สลับโปร่งใส';
      target.addEventListener('click',()=>{toggleTray(node);target.setAttribute('aria-pressed',String(node.userData.seeThrough));});
      viewport.append(target);trayTargets.push({node,target});
    }
  });
  machine.add(model);
  model.updateMatrixWorld(true);
  // Add a domed face and a machined collar in world coordinates; attach them to
  // each authored cap so press depth and status colour remain synchronized.
  model.traverse(node=>{
    if(!node.isMesh||!node.userData.part?.startsWith('control:'))return;
    const name=node.userData.part;
    if(!name.includes('button cap')&&!name.includes('pilot light cap')&&!name.includes('indicator cap')&&!name.includes('Emergency stop mushroom'))return;
    const bounds=new THREE.Box3().setFromObject(node),center=bounds.getCenter(new THREE.Vector3());
    const size=bounds.getSize(new THREE.Vector3()),r=Math.min(size.y,size.z)*.48;
    if(r<=0)return;
    const collar=new THREE.Mesh(new THREE.TorusGeometry(r*.97,r*.10,12,48),new THREE.MeshStandardMaterial({color:'#63716e',metalness:.8,roughness:.24}));
    collar.rotation.y=Math.PI/2;collar.position.set(bounds.max.x+.001,center.y,center.z);
    scene.add(collar);node.attach(collar);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(1,32,20),node.material);
    dome.scale.set(r*.36,r*.88,r*.88);dome.position.set(bounds.max.x+r*.08,center.y,center.z);
    dome.castShadow=true;scene.add(dome);node.attach(dome);
    const shine=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.19,depthWrite:false}));
    shine.scale.set(r*.035,r*.12,r*.34);shine.position.set(bounds.max.x+r*.40,center.y+r*.30,center.z);
    scene.add(shine);node.attach(shine);
  });
  selectorGroup=new THREE.Group();selectorGroup.position.set(.731,.778,.015);machine.add(selectorGroup);
  for(const part of selectorParts) selectorGroup.attach(part);
  modelBounds.setFromObject(model); modelBounds.getCenter(center); updateCorners(); fitCamera();
  leftStage.position.y=-modelBounds.min.y;rightStage.position.y=-modelBounds.min.y;
  floor.position.y=0;grid.visible=false;
  loaded=true; status.hidden=true;renderer.shadowMap.needsUpdate=true;secondRenderer.shadowMap.needsUpdate=true;
},undefined,()=>{status.textContent='โหลดโมเดลไม่สำเร็จ กรุณารีเฟรชเพื่อลองอีกครั้ง';});

// Water remains still until the operating signals and reference sequence are confirmed.
function addTrayLabel(text,y){
 const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');
 ctx.fillStyle='#f8faf7';ctx.fillRect(0,0,512,96);ctx.fillStyle='#39574c';ctx.font='bold 42px Tahoma,Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 const label=new THREE.Mesh(new THREE.PlaneGeometry(.25,.047),new THREE.MeshBasicMaterial({map:texture}));label.position.set(.18,y,.172);machine.add(label);
}
addTrayLabel('ถาดเพาะเลี้ยง',.715);addTrayLabel('ถาดเก็บเกี่ยว',.25);
const waterMaterial=new THREE.MeshPhysicalMaterial({color:0x2facc7,transparent:true,opacity:.65,roughness:.18,metalness:0,side:THREE.DoubleSide,depthWrite:false});
const waterVolumes=[];
for(const [base,kind] of [[.213,'source'],[.673,'destination']]) {
  const volume=new THREE.Mesh(new THREE.BoxGeometry(1.055,1,.325),waterMaterial);
  const geometry=new THREE.PlaneGeometry(1.055,.325,44,14);
  const surface=new THREE.Mesh(geometry,new THREE.MeshPhysicalMaterial({color:0x239cb9,roughness:.24,metalness:.08,transparent:true,opacity:.82,side:THREE.DoubleSide,depthWrite:false}));
  surface.rotation.x=-Math.PI/2;
  machine.add(volume,surface);waterVolumes.push({volume,surface,base,kind});
}
const waterEffects=createWaterEffects(machine);
const ripples=[];
for(let i=0;i<4;i++) {
  const ripple=new THREE.Mesh(new THREE.RingGeometry(.018,.022,32),new THREE.MeshBasicMaterial({color:0xd9ffff,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  ripple.rotation.x=-Math.PI/2;machine.add(ripple);ripples.push(ripple);
}
const bubbles=[];
for(let i=0;i<7;i++) {
  const bubble=new THREE.Mesh(new THREE.SphereGeometry(.004,8,8),new THREE.MeshBasicMaterial({color:0xdbf9fc,transparent:true,opacity:0}));
  machine.add(bubble);bubbles.push(bubble);
}
let pointerOrigin=null,dragged=false;
renderer.domElement.addEventListener('pointerdown',event=>{pointerOrigin=[event.clientX,event.clientY];dragged=false;});
renderer.domElement.addEventListener('pointermove',event=>{if(pointerOrigin&&Math.hypot(event.clientX-pointerOrigin[0],event.clientY-pointerOrigin[1])>5)dragged=true;});
function pick(event) {
  if(dragged&&event.type==='click')return null;
  const bounds=renderer.domElement.getBoundingClientRect();
  pointer.set((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2);
  raycaster.setFromCamera(pointer,camera);
  const hits=raycaster.intersectObjects([machine,...(secondMachine?[secondMachine]:[])],true);
  for(const hit of hits){
    let object=sourceFor.get(hit.object)||hit.object;
    while(object&&object!==machine){
      if(object.userData.action||trays.includes(object))return object;
      object=object.parent;
    }
  }
  return null;
}
renderer.domElement.addEventListener('pointermove',event=>{
  const object=pick(event);
  renderer.domElement.style.cursor=object?'pointer':'default';
  tip.hidden=!object;
  if(object) {
    tip.textContent=object.userData.label||'แตะถาด · สลับโปร่งใส';
    const box=viewport.getBoundingClientRect();
    tip.style.left=Math.min(event.clientX-box.left+12,viewport.clientWidth-190)+'px';
    tip.style.top=Math.max(70,event.clientY-box.top-38)+'px';
  }
});
renderer.domElement.addEventListener('pointerleave',()=>{tip.hidden=true;});
function toggleTray(object) {
  object.userData.seeThrough=!object.userData.seeThrough;
  for(const entry of trayMaterials) {
    if(object.userData.materials.includes(entry.material)) entry.target=object.userData.seeThrough?.17:1;
  }
}
renderer.domElement.addEventListener('click',event=>{
  const object=pick(event); if(!object) return;

  if(object.userData.action) {
    performAction(object.userData.action,object);
    return;
  }
  toggleTray(object);
  const target=trayTargets.find(item=>item.node===object)?.target;
  target?.setAttribute('aria-pressed',String(object.userData.seeThrough));
});
// Both hose stages run from their upper connector to their lower connector.
// A shared negative texture offset moves the colour bands along that direction.
const flowCanvas=document.createElement('canvas');flowCanvas.width=512;flowCanvas.height=16;
const flowContext=flowCanvas.getContext('2d');
for(let x=0;x<512;x++) {
  const blend=(Math.sin(x/512*Math.PI*6)+1)/2;
  flowContext.fillStyle=`rgb(${Math.round(36+blend*133)},${Math.round(153+blend*84)},${Math.round(212+blend*43)})`;
  flowContext.fillRect(x,0,1,16);
}
const flowTexture=new THREE.CanvasTexture(flowCanvas);
flowTexture.colorSpace=THREE.SRGBColorSpace;flowTexture.wrapS=THREE.RepeatWrapping;
flowTexture.wrapT=THREE.RepeatWrapping;flowTexture.repeat.set(1,1);
const streamMaterial=new THREE.MeshPhysicalMaterial({map:flowTexture,color:'#e9fbff',transparent:true,opacity:.88,transmission:.08,ior:1.333,roughness:.13,clearcoat:.7,depthWrite:false});
const streams=[];
for(const hose of hosePaths) {
  const points=hoseRoute(hose);
  const curve=new THREE.CurvePath();let cursor=points[0];
  for(let i=1;i<points.length-1;i++){
    const corner=points[i],r=Math.min(.009,corner.distanceTo(points[i-1])*.25,corner.distanceTo(points[i+1])*.25);
    const before=corner.clone().add(points[i-1].clone().sub(corner).normalize().multiplyScalar(r));
    const after=corner.clone().add(points[i+1].clone().sub(corner).normalize().multiplyScalar(r));
    curve.add(new THREE.LineCurve3(cursor,before));curve.add(new THREE.QuadraticBezierCurve3(before,corner,after));cursor=after;
  }
  curve.add(new THREE.LineCurve3(cursor,points.at(-1)));
  const casing=new THREE.Mesh(new THREE.TubeGeometry(curve,100,.007,12,false),new THREE.MeshPhysicalMaterial({color:'#b5d9df',transparent:true,opacity:.15,roughness:.16,ior:1.46,depthWrite:false}));machine.add(casing);
  const stream=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(80,points.length),.0048,10,false),streamMaterial);
  stream.renderOrder=2;machine.add(stream);streams.push(stream);
}
// Short outlet branches meet the uninterrupted main hose inside the existing tray.
for(const outlet of waterEffects.outlets){
 const from=new THREE.Vector3(outlet.x-.025,.738,.15);
 const bend=new THREE.Vector3(outlet.x,.738,outlet.z);
 const path=new THREE.CurvePath();
 const before=bend.clone().add(from.clone().sub(bend).normalize().multiplyScalar(.006));
 const after=bend.clone().add(outlet.clone().sub(bend).normalize().multiplyScalar(.006));
 path.add(new THREE.LineCurve3(from,before));path.add(new THREE.QuadraticBezierCurve3(before,bend,after));path.add(new THREE.LineCurve3(after,outlet));
 const skin=new THREE.Mesh(new THREE.TubeGeometry(path,20,.007,12,false),new THREE.MeshPhysicalMaterial({color:'#b5d9df',transparent:true,opacity:.18,roughness:.2,depthWrite:false}));machine.add(skin);
 const liquid=new THREE.Mesh(new THREE.TubeGeometry(path,20,.0048,10,false),streamMaterial);machine.add(liquid);
}
for(const button of root.querySelectorAll('[data-view]')) {
  button.addEventListener('click',()=>{
    view=button.dataset.view;secondClose=false;fitCamera();
    root.querySelectorAll('[data-view]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.view===view)));
  });
}
root.querySelector('#reset-cycle').addEventListener('click',()=>{operator?.cancel();cycle=createCycle();});
for(const [kind,anchor,label] of [['fan',deviceEffects.fanCenter,'พัดลม · เปิด/ปิดลมร่วมกับเครื่อง'],['light',deviceEffects.lampCenter,'โคมไฟ · แตะเปิด/ปิดแสงลงถาด']]) {
  for(const [element,viewCamera,isSecond] of [[viewport,camera,false],[secondViewport,secondCamera,true]]) {
    const button=document.createElement('button');button.className='device-switch';
    button.textContent='';button.style.display='none';
    button.setAttribute('aria-label',(isSecond?'ด้านข้าง: ':'')+label);
    button.title=label;
    button.addEventListener('click',()=>{
      if(kind==='fan') {
        const enabled=deviceEffects.inspectFan();
        feedback.textContent=enabled?'เปิดฝาครอบโปร่งใส · ใบพัดหมุนและส่งลมลงถาด':'ปิดพัดลม · ลมค่อย ๆ สงบ';
      } else {
        const enabled=deviceEffects.toggleLight();
        feedback.textContent=enabled?'เปิดโคมไฟ · แสงส่องลงถาด':'ปิดโคมไฟ';
      }
    });
    element.append(button);deviceTargets.push({kind,anchor,button,element,viewCamera,isSecond});
  }
}
for(const [canvas,viewCamera] of [[renderer.domElement,camera]]) {
  canvas.addEventListener('click',event=>{
    if(dragged)return;
    const bounds=canvas.getBoundingClientRect();
    pointer.set((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2);
    raycaster.setFromCamera(pointer,viewCamera);
    const hit=raycaster.intersectObjects([machine,...(secondMachine?[secondMachine]:[])],true).find(hit=>hit.object.userData.deviceKind);
    if(!hit)return;
    const kind=hit.object.userData.deviceKind;
    const enabled=kind==='fan'?deviceEffects.inspectFan():deviceEffects.toggleLight();
    feedback.textContent=kind==='fan'?(enabled?'ฝาครอบโปร่งใส · ใบพัดหมุน ส่งลมลงถาด':'ปิดพัดลม'):(enabled?'โคมโปร่งใส · เปิดแสงลงถาด':'ปิดโคมไฟ');
  });
}
const projected=new THREE.Vector3();
operator=createOperator(scene,()=>{
 const startButton=controls.find(node=>node.userData.action==='start');performAction('start',startButton);
});
const demoButton=root.querySelector('[data-operator-demo]');
demoButton.addEventListener('click',()=>{operator.start();feedback.textContent='ผู้ดูแลเดินไปกด Start · ปุ่ม Stop ยังกดหยุดได้ทันที';});
const ambientButton=root.querySelector('[data-room-motion]');
ambientButton.addEventListener('click',()=>{ambientPaused=!ambientPaused;ambientButton.setAttribute('aria-pressed',String(!ambientPaused));ambientButton.querySelector('[data-room-motion-label]').textContent=ambientPaused?'เล่นฉาก':'พักฉาก';});
const clock=new THREE.Clock();
renderer.setAnimationLoop(()=>{
  const realDelta=clock.getDelta();
  const delta=Math.min(realDelta,.10);
  const time=clock.elapsedTime;
  backdrop.update(ambientPaused?0:Math.min(realDelta,.5),reducedMotion.matches);
  operator.update(delta,reducedMotion.matches);
  demoButton.disabled=operator.active;
  advance(cycle,delta);
  deviceEffects.update(delta,cycle.pump,cycle.fault,lightMeshes,cycle.destination);
  stepMotion(motion,cycle.pump,delta);
  flowSpeed=motion.flow;flowProgress=motion.phase;disturbance=motion.ripple;
  waterEffects.update(flowSpeed,disturbance,motion.waterTime,cycle.destination);
  machine.position.y=reducedMotion.matches?0:Math.sin(motion.motorTime*23)*.00065*flowSpeed;
  machine.rotation.z=reducedMotion.matches?0:Math.sin(motion.motorTime*19)*.0006*flowSpeed;
  for(const water of waterVolumes) {
    const level=cycle[water.kind];const capacity=water.kind==='source'?.065:.04;
    const height=Math.max(.001,capacity*level);
    water.volume.scale.y=height;water.volume.position.set(0,water.base+height/2,0);
    water.volume.visible=level>.005;
    water.surface.visible=level>.005;water.surface.position.set(0,water.base+height+.0008,0);
    const vertices=water.surface.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++) {
      const x=vertices.getX(i),z=-vertices.getY(i);
      const distance=Math.min(Math.hypot(x+.485,z-.125),Math.hypot(x+.463,z-.125));
      const wave=Math.sin(distance*38-motion.waterTime*6)*Math.exp(-distance*9)*.0022;
      const secondary=Math.sin(x*14+motion.waterTime*2.2)*Math.cos(z*22-motion.waterTime*3)*.00045*Math.exp(-distance*5);
      const airWave=Math.sin(Math.hypot(x+.22,z)*52-deviceEffects.airTime*9)*Math.exp(-Math.hypot(x+.22,z)*9)*.0012*deviceEffects.airStrength;
      const dent=-.0012*Math.exp(-distance*distance/.00012)*flowSpeed;
      vertices.setZ(i,(wave+secondary)*disturbance+airWave+dent);
    }
    vertices.needsUpdate=true;water.surface.geometry.computeVertexNormals();
  }
  for(let i=0;i<ripples.length;i++) {
    const progress=(motion.waterTime*.6+i/ripples.length)%1;
    const mesh=ripples[i];mesh.position.set(-.49,.675+.04*cycle.destination,.14);
    mesh.scale.setScalar(1+progress*4);
    mesh.material.opacity=0;
    mesh.visible=disturbance>.003&&cycle.destination>.01;
  }
  for(let i=0;i<bubbles.length;i++) {
    const bubble=bubbles[i];const progress=(motion.waterTime*.8+i/bubbles.length)%1;
    bubble.position.set(-.474+Math.sin(i*7)*.008,.674+.04*cycle.destination+.008*progress,.125+Math.cos(i*3)*.006);
    bubble.material.opacity=disturbance*(1-progress)*.10;
    bubble.visible=disturbance>.01&&cycle.destination>.01;
  }
  for(const lamp of lamps) {
    const on={manual:cycle.mode==='manual'&&!cycle.fault,auto:cycle.mode==='auto'&&!cycle.fault,pump:cycle.pump,alarm:cycle.alarm,fault:cycle.fault}[lamp.type];
    // Solid indicator for each confirmed state; Alarm is lit for its active interval.
    lamp.mesh.material.emissive.copy(lamp.color);
    lamp.mesh.material.emissiveIntensity=on?1.6:0;
    lamp.mesh.material.color.copy(lamp.color).multiplyScalar(on?1:.42);
  }
  for(let i=pressAnimations.length-1;i>=0;i--) {
    const press=pressAnimations[i];const age=(performance.now()-press.start)/550;
    const depth=Math.sin(Math.min(1,age)*Math.PI);
    press.object.position.x=press.x-depth*.0045;
    // Orthographic front view hides depth, so the cap also compresses visibly into its bezel.
    press.object.scale.copy(press.scale).multiplyScalar(1-depth*.14);
    if(age>=1){press.object.position.x=press.x;press.object.scale.copy(press.scale);pressAnimations.splice(i,1);}
  }
  if(selectorGroup) {
    const target=cycle.mode==='auto'?Math.PI/4:-Math.PI/4;
    selectorGroup.rotation.x=THREE.MathUtils.damp(selectorGroup.rotation.x,target,9,delta);
    if(Math.abs(selectorGroup.rotation.x-target)<.0001) selectorGroup.rotation.x=target;
  }
  for(const {node,target} of [...controlTargets,...secondTargets]) {
    const action=node.userData.action;
    target.setAttribute('aria-pressed',String(action===cycle.mode||(action==='start'&&cycle.pump)||(action==='stop'&&!cycle.pump)||(action==='fault'&&cycle.fault)));
  }
  hud.textContent=`${cycle.mode.toUpperCase()} · ${phaseText(cycle)}`;
  const lcdText=`${cycle.mode.toUpperCase()} / ${cycle.pump?'RUN':cycle.fault?'FAULT':'STOP'}`;
  if(lcdContext&&lcdText!==lastLcdText) {
    lcdContext.fillStyle='#b7dce1';lcdContext.fillRect(0,0,512,192);
    lcdContext.fillStyle='#264e50';lcdContext.font='bold 37px monospace';
    lcdContext.fillText('pH 5.8  EC 1.4',15,57);
    lcdContext.font='30px monospace';lcdContext.fillText(lcdText,15,112);
    lcdContext.font='24px monospace';lcdContext.fillText('DEMO / WATER LEVEL',15,165);
    lcdTexture.needsUpdate=true;lastLcdText=lcdText;
  }
  hud.dataset.state=cycle.fault?'fault':cycle.pump?'running':'idle';
  direction.lerp(directions[view],reducedMotion.matches?1:1-Math.exp(-3*delta)).normalize();
  orbit.target.x=THREE.MathUtils.clamp(orbit.target.x,-1.25,1.3);orbit.target.y=THREE.MathUtils.clamp(orbit.target.y,.25,1.5);orbit.target.z=THREE.MathUtils.clamp(orbit.target.z,-.65,.55);
  orbit.update();camera.position.y=Math.max(.12,camera.position.y);
  if(loaded)for(const object of [machine,secondMachine].filter(Boolean)){
    const box=new THREE.Box3().setFromObject(object).expandByScalar(.08);
    if(box.containsPoint(camera.position)){
      const faces=[['x',box.min.x],['x',box.max.x],['z',box.min.z],['z',box.max.z],['y',box.max.y]];
      faces.sort((a,b)=>Math.abs(camera.position[a[0]]-a[1])-Math.abs(camera.position[b[0]]-b[1]));
      camera.position[faces[0][0]]=faces[0][1]+(faces[0][1]===box.min[faces[0][0]]?-.01:.01);
    }
  }
  backdrop.setCamera(camera);
  for(const {material,target} of trayMaterials) {
    if(target<1 && !material.transparent){material.transparent=true;material.needsUpdate=true;}
    material.opacity=THREE.MathUtils.damp(material.opacity,target,7,delta);
    if(target===1&&material.opacity>.999){material.opacity=1;if(material.transparent){material.transparent=false;material.needsUpdate=true;}}
    material.depthWrite=material.opacity>.98;
  }
  // A very gentle push-in, within the fit margin. No free spin or model movement.
  camera.zoom=1;
  camera.updateProjectionMatrix();
  flowTexture.offset.x=-flowProgress;
  streamMaterial.opacity=.78+.14*flowSpeed;
  if(loaded)mirrorMachine();
  renderer.render(scene,camera);
  for(const {node,target} of secondTargets) {
    target.hidden=false;
    new THREE.Box3().setFromObject(copyFor.get(node)||node).getCenter(projected).project(camera);
    const pixels=Math.max(secondClose?28:16,Math.min(90,projectedPixels(copyFor.get(node)||node,.029)));
    target.style.width=pixels+'px';target.style.height=pixels+'px';
    target.style.left=((projected.x*.5+.5)*secondViewport.clientWidth-pixels/2)+'px';
    target.style.top=((-projected.y*.5+.5)*secondViewport.clientHeight-pixels/2)+'px';
  }
  for(const {kind,anchor,button,element,viewCamera,isSecond} of deviceTargets) {
    projected.copy(anchor).applyMatrix4(machine.matrixWorld).project(viewCamera);
    button.hidden=(isSecond?secondClose:view==='panel')||projected.z>1||projected.z<-1;
    button.setAttribute('aria-pressed',String(kind==='fan'?deviceEffects.fanEnabled:deviceEffects.lightEnabled));
    const x=(projected.x*.5+.5)*element.clientWidth+(kind==='fan'?-42:12);
    const y=(-projected.y*.5+.5)*element.clientHeight+(kind==='fan'?-22:12);
    button.style.left=THREE.MathUtils.clamp(x,5,element.clientWidth-52)+'px';
    button.style.top=THREE.MathUtils.clamp(y,45,element.clientHeight-45)+'px';
  }
  for(const {node,target} of trayTargets) {
    target.hidden=true;
    if(view==='panel') continue;
    const box=new THREE.Box3().setFromObject(node);
    let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
    for(const x of [box.min.x,box.max.x]) for(const y of [box.min.y,box.max.y]) for(const z of [box.min.z,box.max.z]) {
      projected.set(x,y,z).project(camera);
      const px=(projected.x*.5+.5)*viewport.clientWidth;
      const py=(-projected.y*.5+.5)*viewport.clientHeight;
      left=Math.min(left,px);right=Math.max(right,px);top=Math.min(top,py);bottom=Math.max(bottom,py);
    }
    target.style.left=left+'px';target.style.top=top+'px';target.style.width=(right-left)+'px';target.style.height=(bottom-top)+'px';
  }
  for(const {node,target} of controlTargets) {
    target.hidden=false;
    if(true) {
      const box=new THREE.Box3().setFromObject(node);
      box.getCenter(projected).project(camera);
      const pixels=Math.max(24,Math.min(90,projectedPixels(node,.025)));
      target.style.width=pixels+'px';target.style.height=pixels+'px';
      target.style.left=((projected.x*.5+.5)*viewport.clientWidth-pixels/2)+'px';
      target.style.top=((-projected.y*.5+.5)*viewport.clientHeight-pixels/2)+'px';
    }
  }
  }
);
return ()=>{
 disposed=true;renderer.setAnimationLoop(null);orbit.dispose();layoutObserver.disconnect();renderer.dispose();reflectionTarget.dispose();
 const geometries=new Set(),materials=new Set();scene.traverse(node=>{if(node.geometry)geometries.add(node.geometry);if(node.material)for(const m of Array.isArray(node.material)?node.material:[node.material])materials.add(m);});
 geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());flowTexture.dispose();contactTexture.dispose();lcdTexture?.dispose();
 root.querySelectorAll('canvas,.model-button,.model-tray,.device-switch,.machine-state,.part-tip,.action-feedback').forEach(node=>node.remove());
};
}
