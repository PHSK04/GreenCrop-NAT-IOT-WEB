import * as THREE from 'three';

export function createDeviceEffects(machine) {
  let fanEnabled=true, lightEnabled=false, fanSpeed=0, brightness=0, airTime=0, fanInspect=false;
  const covers=[];
  const fanCenter=new THREE.Vector3(-.22,.947,0);
  const lampCenter=new THREE.Vector3(.16,.971,0);
  const rotor=new THREE.Group();rotor.name='fan-rotor';rotor.position.copy(fanCenter);machine.add(rotor);
  const bladeMaterial=new THREE.MeshStandardMaterial({color:'#e1eee5',metalness:.1,roughness:.36});
  const shape=new THREE.Shape();shape.moveTo(.008,-.006);shape.bezierCurveTo(.027,-.023,.056,-.020,.054,.002);shape.bezierCurveTo(.050,.017,.027,.020,.008,.006);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.002,bevelEnabled:true,bevelSize:.001,bevelThickness:.0006,bevelSegments:2,curveSegments:16,steps:1});
  for(let i=0;i<5;i++) {
    const holder=new THREE.Group();holder.rotation.y=i*Math.PI*2/5;
    const blade=new THREE.Mesh(geometry,bladeMaterial);blade.rotation.x=Math.PI/2;holder.add(blade);rotor.add(holder);
  }
  const airLines=[];
  for(let i=0;i<7;i++) {
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(18*3),3));
    const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:'#90cad0',transparent:true,opacity:0,depthWrite:false}));
    line.name='fan-air-'+i;machine.add(line);airLines.push(line);
  }
  const target=new THREE.Object3D();target.position.set(.16,.68,0);machine.add(target);
  const spotlight=new THREE.SpotLight('#fff1bd',0,.8,.57,.85,1.4);
  spotlight.name='grow-spotlight';spotlight.position.copy(lampCenter);spotlight.target=target;machine.add(spotlight);
  const shaftMaterial=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,
    uniforms:{strength:{value:0}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 vUv;uniform float strength;void main(){float fade=smoothstep(0.0,0.3,vUv.y);gl_FragColor=vec4(1.0,0.90,0.59,strength*0.09*fade);}',
  });
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.085,.22,.28,40,1,true),shaftMaterial);
  shaft.position.set(.16,.827,0);machine.add(shaft);
  const glow=new THREE.Mesh(new THREE.PlaneGeometry(.29,.164),new THREE.MeshBasicMaterial({color:'#fff0bc',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  glow.rotation.x=Math.PI/2;glow.position.copy(lampCenter);machine.add(glow);
  const pool=new THREE.Mesh(new THREE.CircleGeometry(.20,40),new THREE.MeshBasicMaterial({color:'#fff5c8',transparent:true,opacity:0,depthWrite:false}));
  pool.rotation.x=-Math.PI/2;pool.scale.y=.65;pool.position.set(.16,.758,0);machine.add(pool);
  return {
    fanCenter,lampCenter,
    registerCover(mesh,kind) {
      const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      covers.push({materials,kind,opacity:1});
      mesh.userData.deviceKind=kind;
    },
    inspectFan(){fanInspect=!fanInspect;fanEnabled=fanInspect;return fanInspect;},
    get airStrength(){return fanSpeed;},
    get airTime(){return airTime;},
    stopFan(){fanInspect=false;},
    get fanEnabled(){return fanEnabled;}, get lightEnabled(){return lightEnabled;},
    toggleFan(){fanEnabled=!fanEnabled;return fanEnabled;},
    toggleLight(){lightEnabled=!lightEnabled;return lightEnabled;},
    update(dt,running,fault,lightMeshes,destination=0) {
      fanSpeed=THREE.MathUtils.damp(fanSpeed,(running||fanInspect)&&fanEnabled&&!fault?1:0,4,dt);
      if(fanSpeed<.001) fanSpeed=0;
      const lightTarget=lightEnabled&&!fault?1:0;
      brightness=THREE.MathUtils.damp(brightness,lightTarget,6,dt);
      if(brightness<.001) brightness=0;
      if(fanSpeed>0){airTime+=dt*fanSpeed;rotor.rotation.y+=dt*fanSpeed*18;}
      rotor.visible=fanSpeed>0||fanInspect;
      for(const cover of covers) {
        const open=cover.kind==='fan'?(fanInspect||fanSpeed>.03):lightEnabled;
        cover.opacity=THREE.MathUtils.damp(cover.opacity,open?(cover.kind==='fan'&&!fanInspect?.32:.14):1,8,dt);
        for(const material of cover.materials) {
          material.transparent=cover.opacity<.999;material.opacity=cover.opacity;
          material.depthWrite=!material.transparent;
        }
      }
      airLines.forEach((line,index)=>{
        line.visible=fanSpeed>0;
        const phase=(airTime*.65+index/airLines.length)%1;
        const attribute=line.geometry.attributes.position;
        for(let j=0;j<attribute.count;j++) {
          const t=j/(attribute.count-1), spread=(index-3)*.012;
          attribute.setXYZ(j,-.22+spread+Math.sin(t*4+index*.8)*.007,.925-phase*.19-t*.065,(index%3-1)*.014+Math.sin(t*3+airTime)*.004);
        }
        attribute.needsUpdate=true;
        line.material.opacity=fanSpeed*Math.sin(phase*Math.PI)*.55;
      });
      pool.position.y=.682+.04*destination;
      spotlight.intensity=brightness*1.5;
      shaftMaterial.uniforms.strength.value=brightness;
      shaft.visible=brightness>0;glow.material.opacity=brightness*.85;pool.material.opacity=brightness*.11;
      for(const mesh of lightMeshes) {
        const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
        for(const material of materials) {
          if(material.name.includes('diffuser')||material.name.includes('Warm LED')) {
            material.emissive.set('#ffe7a8');material.emissiveIntensity=brightness*2;
          }
        }
      }
    },
  };
}
