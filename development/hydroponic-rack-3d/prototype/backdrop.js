import * as THREE from 'three';
import {addLivingPlanters} from './plants.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// A modelled room, shared by both views. No flat photographic backdrop.
export function createBackdrop(scene) {
  const room=new THREE.Group();room.name='living-lab-room';scene.add(room);
  const ivory=new THREE.MeshStandardMaterial({color:'#f2f1e9',roughness:.72});
  const seam=new THREE.MeshStandardMaterial({color:'#b9c7bf',roughness:.6});
  const mint=new THREE.MeshStandardMaterial({color:'#5fe8ba',emissive:'#75edc4',emissiveIntensity:1.15,roughness:.3});
  const cyan=new THREE.MeshStandardMaterial({color:'#8fe1df',emissive:'#72dae7',emissiveIntensity:1.15,roughness:.3});
  const warm=new THREE.MeshStandardMaterial({color:'#fff5dc',emissive:'#ffe7bf',emissiveIntensity:.8});
  const animated=[];const leaves=[];const displays=[];const walls=[];const ceilings=[];
  function box(parent,position,size,material,radius=.025){
    const mesh=new THREE.Mesh(new RoundedBoxGeometry(...size,3,Math.min(radius,...size.map(v=>v/2))),material);
    mesh.position.set(...position);parent.add(mesh);return mesh;
  }
  // Two perpendicular walls keep the room coherent for the two machine cameras.
  for(let wallIndex=0;wallIndex<2;wallIndex++) {
    const wall=new THREE.Group();
    if(wallIndex===1)wall.rotation.y=Math.PI/2;
    room.add(wall);walls.push(wall);
    box(wall,[0,1.25,-1.85],[5.8,2.5,.08],seam,.04);
    for(let i=0;i<6;i++) {
      const x=(i-2.5)*.95;
      box(wall,[x,1.25,-1.79],[.942,2.46,.055],ivory,.06);
      const strip=box(wall,[x,1.67,-1.748],[.925,.034,.018],mint.clone(),.009);
      animated.push({material:strip.material,phase:i*.42+wallIndex});
    }
    box(wall,[0,.035,-1.70],[5.75,.018,.025],cyan,.007);
    box(wall,[0,2.43,-1.62],[5.7,.018,.025],warm,.007);
    // Framed translucent window with layered botanical silhouettes beyond it.
    box(wall,[-1.87,1.10,-1.70],[.72,1.67,.065],new THREE.MeshStandardMaterial({color:'#eaf1e9',roughness:.35}),.09);
    const glass=new THREE.MeshPhysicalMaterial({color:'#bfdfd5',transparent:true,opacity:.32,roughness:.2,metalness:.05,depthWrite:false});
    box(wall,[-1.87,1.10,-1.65],[.64,1.57,.016],glass,.08);
    const plant=new THREE.Group();plant.position.set(-1.87,.33,-1.675);wall.add(plant);
    for(let i=0;i<11;i++) {
      const pivot=new THREE.Group();pivot.position.set(Math.sin(i*2.4)*.19,0,0);pivot.rotation.z=(i-5)*.085;plant.add(pivot);
      const length=.38+(i%4)*.14;
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.002,.003,length,6),new THREE.MeshStandardMaterial({color:'#829d79'}));stem.position.y=length/2;pivot.add(stem);
      const shape=new THREE.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.13,.13,-.12,.36,0,.47);shape.bezierCurveTo(.10,.34,.12,.14,0,0);
      const leaf=new THREE.Mesh(new THREE.ShapeGeometry(shape,18),new THREE.MeshStandardMaterial({color:i%2?'#8eb68a':'#a6c29b',side:THREE.DoubleSide,roughness:.9}));
      leaf.position.y=length*.55;leaf.scale.setScalar(.65+(i%3)*.12);pivot.add(leaf);
      leaves.push({pivot,rest:pivot.rotation.z,phase:i*.73+wallIndex});
    }
    // Small live telemetry display, drawn as actual geometry.
    const monitor=new THREE.Group();monitor.position.set(1.55,1.77,-1.70);wall.add(monitor);
    box(monitor,[0,0,0],[.36,.23,.035],new THREE.MeshStandardMaterial({color:'#bccbc7',metalness:.3,roughness:.4}),.025);
    box(monitor,[0,0,.021],[.325,.193,.01],new THREE.MeshStandardMaterial({color:'#335660',emissive:'#28444b',emissiveIntensity:.3}),.016);
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(48*3),3));
    const graph=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#a3f3e4'}));graph.name='room-telemetry-graph';monitor.add(graph);displays.push(graph);
    for(let i=0;i<3;i++){
      const dot=new THREE.Mesh(new THREE.CircleGeometry(.006,12),new THREE.MeshBasicMaterial({color:'#a2f4e6'}));dot.position.set(.135,.052-i*.045,.029);monitor.add(dot);
    }
  }
  // A softly lit ceiling and recessed rounded luminaire.
  ceilings.push(box(room,[0,2.52,0],[5.8,.08,5.8],ivory,.07));
  ceilings.push(box(room,[0,2.465,0],[1.6,.018,.36],warm,.08));
  const ceilingLight=new THREE.PointLight('#fff1d7',.7,5,2);ceilingLight.position.set(0,2.2,0);room.add(ceilingLight);
  const lightTraces=[];const wallTraces=[];
  for(let i=0;i<3;i++){
    const trace=box(room,[-2+i*1.6,.045,-1.68],[.5,.018,.02],new THREE.MeshBasicMaterial({color:'#b5ffed',transparent:true,opacity:0,depthWrite:false}),.005);
    lightTraces.push(trace);
  }
  for(let i=0;i<2;i++){
    const trace=box(room,[-2+i*2,1.67,-1.73],[.65,.04,.016],new THREE.MeshBasicMaterial({color:'#6cf2c4',transparent:true,opacity:1}),.008);wallTraces.push(trace);
  }
  const ventilation=new THREE.Group();ventilation.name='room-ventilation';ventilation.position.set(2.02,.60,-1.70);room.add(ventilation);
  box(ventilation,[0,0,0],[.33,.33,.035],new THREE.MeshStandardMaterial({color:'#405950',roughness:.57}),.035);
  const opening=new THREE.Mesh(new THREE.CircleGeometry(.142,48),new THREE.MeshStandardMaterial({color:'#263e37',roughness:.7}));opening.position.z=.022;ventilation.add(opening);
  const ventRotor=new THREE.Group();ventRotor.name='room-vent-rotor';ventRotor.position.z=.031;ventilation.add(ventRotor);
  const bladeShape=new THREE.Shape();bladeShape.moveTo(.018,-.012);bladeShape.bezierCurveTo(.055,-.065,.13,-.055,.13,-.014);bladeShape.bezierCurveTo(.125,.02,.065,.038,.018,.014);bladeShape.closePath();
  const bladeGeometry=new THREE.ExtrudeGeometry(bladeShape,{depth:.004,bevelEnabled:true,bevelSize:.002,bevelThickness:.001,bevelSegments:2,steps:1,curveSegments:18});
  const bladeMaterial=new THREE.MeshStandardMaterial({color:'#e6f0e6',roughness:.36,metalness:.08});
  for(let i=0;i<5;i++){const blade=new THREE.Mesh(bladeGeometry,bladeMaterial);blade.rotation.z=i*Math.PI*2/5;ventRotor.add(blade);}
  const hub=new THREE.Mesh(new THREE.SphereGeometry(.028,24,16),bladeMaterial);hub.scale.z=.45;hub.position.z=.008;ventRotor.add(hub);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.145,.004,8,64),new THREE.MeshStandardMaterial({color:'#a9c2b2',metalness:.35,roughness:.4}));rim.position.z=.045;ventilation.add(rim);
  const air=[];
  for(let i=0;i<4;i++){
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(24*3),3));
    const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#8fbfb5',transparent:true,opacity:0,depthWrite:false}));room.add(line);air.push(line);
  }
  // A readable, animated wall instrument creates a focal point beside the machines.
  const livePanel=new THREE.Group();livePanel.name='room-live-panel';livePanel.position.set(2.04,1.15,-1.68);room.add(livePanel);
  box(livePanel,[0,0,0],[.44,.60,.035],new THREE.MeshStandardMaterial({color:'#416d63',roughness:.5,metalness:.2}),.035);
  box(livePanel,[0,0,.024],[.385,.535,.012],new THREE.MeshStandardMaterial({color:'#163f3c',emissive:'#163f3c',emissiveIntensity:.25}),.025);
  const bars=[];
  for(let i=0;i<7;i++){
    const bar=box(livePanel,[-.135+i*.045,-.1,.037],[.024,.12,.006],new THREE.MeshBasicMaterial({color:i%2?'#78dfc0':'#5fc4d9'}),.006);bars.push(bar);
  }
  const signalLight=new THREE.PointLight('#71dac6',.4,3.2,2);signalLight.position.set(1.8,1.4,-1.1);room.add(signalLight);
  const swayPlants=addLivingPlanters(room);
  let elapsed=0;
  return {
    setCamera(camera){walls[0].visible=camera.position.z> -1.5;walls[1].visible=camera.position.x> -1.5;ceilings.forEach(mesh=>mesh.visible=camera.position.y<2.3);},
    update(dt,reducedMotion=false){
      if(!reducedMotion)elapsed+=dt;
      bars.forEach((bar,i)=>{const height=.08+(Math.sin(elapsed*2.2-i*.72)+1)*.075;bar.scale.y=height/.12;bar.position.y=-.14+height/2;});
      signalLight.intensity=.45+.25*Math.sin(elapsed*1.1);
      ventRotor.rotation.z=-elapsed*6.5;
      swayPlants(elapsed);
      wallTraces.forEach((trace,i)=>{trace.position.x=-2.8+((elapsed*.24+i*.5)%1)*5.6;trace.material.opacity=.55+.2*Math.sin(elapsed+i);});
      lightTraces.forEach((trace,i)=>{
        const progress=(elapsed*.20+i/3)%1;
        trace.position.x=-2.8+progress*5.6;
        trace.material.opacity=reducedMotion?0:Math.sin(progress*Math.PI)*.95;
      });
      air.forEach((line,i)=>{
        const phase=(elapsed*.17+i*.23)%1;
        const attribute=line.geometry.attributes.position;
        for(let j=0;j<attribute.count;j++){
          const t=j/(attribute.count-1);
          attribute.setXYZ(j,1.91+t*.22+Math.sin(t*5+elapsed*1.2+i)*.015,.60+Math.sin(t*5+elapsed+i)*.012+(i-1.5)*.025,-1.62+phase*.58);
        }
        attribute.needsUpdate=true;line.geometry.computeBoundingSphere();
        line.material.opacity=reducedMotion?0:Math.sin(phase*Math.PI)*.38;
      });
      for(const item of animated)item.material.emissiveIntensity=.65+Math.sin(elapsed*1.1-item.phase)*.22;
      for(const item of leaves)item.pivot.rotation.z=item.rest+(reducedMotion?0:Math.sin(elapsed*.85+item.phase)*.045);
      for(const graph of displays){
        const attribute=graph.geometry.attributes.position;
        for(let i=0;i<attribute.count;i++){
          const t=i/(attribute.count-1);
          attribute.setXYZ(i,-.135+t*.24,-.045+t*.075+Math.sin(t*9-elapsed*.6)*.016,.029);
        }
        attribute.needsUpdate=true;graph.geometry.computeBoundingSphere();
      }
    },
  };
}
