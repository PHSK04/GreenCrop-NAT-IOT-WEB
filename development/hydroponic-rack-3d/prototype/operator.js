import * as THREE from 'three';

// Optional one-shot demonstration. It never runs continuously over the machine.
export function createOperator(scene,onPress){
 const person=new THREE.Group();person.name='lab-operator';person.visible=false;scene.add(person);
 const coat=new THREE.MeshStandardMaterial({color:'#c9dad4',roughness:.85});
 const skin=new THREE.MeshStandardMaterial({color:'#c9a98e',roughness:.9});
 const dark=new THREE.MeshStandardMaterial({color:'#52635e',roughness:.85});
 const joints={};
 function part(parent,geometry,material,x,y,z){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;}
 part(person,new THREE.CapsuleGeometry(.095,.27,6,16),coat,0,.61,0);
 part(person,new THREE.SphereGeometry(.078,20,16),skin,0,.91,0);
 const hair=part(person,new THREE.SphereGeometry(.079,20,12,0,Math.PI*2,0,Math.PI*.53),dark,0,.93,0);
 for(const side of [-1,1]){
  const leg=new THREE.Group();leg.position.set(side*.047,.43,0);person.add(leg);joints['leg'+side]=leg;
  part(leg,new THREE.CapsuleGeometry(.032,.32,4,12),dark,0,-.20,0);
  part(leg,new THREE.BoxGeometry(.065,.04,.105),dark,0,-.41,-.023);
  const arm=new THREE.Group();arm.position.set(side*.105,.75,0);person.add(arm);joints['arm'+side]=arm;
  part(arm,new THREE.CapsuleGeometry(.026,.21,4,12),coat,0,-.12,0);
  part(arm,new THREE.SphereGeometry(.029,12,8),skin,0,-.255,0);
 }
 const contact=new THREE.Mesh(new THREE.CircleGeometry(.15,32),new THREE.MeshBasicMaterial({color:'#4b5952',transparent:true,opacity:.10,depthWrite:false}));contact.rotation.x=-Math.PI/2;contact.scale.y=.55;contact.position.y=.002;person.add(contact);
 let elapsed=0,active=false,pressed=false;
 const start=new THREE.Vector3(1.72,0,.68),end=new THREE.Vector3(1.16,0,.62);
 function ease(t){return t*t*(3-2*t);}
 return {
  get active(){return active;},
  start(){if(active)return;active=true;elapsed=0;pressed=false;person.visible=true;},
  cancel(){active=false;person.visible=false;},
  update(dt,reducedMotion=false){
   if(!active)return;elapsed+=dt;
   const approach=2.2,hold=1.6,exit=2.2;
   if(elapsed>approach+hold+exit){active=false;person.visible=false;return;}
   const returning=elapsed>approach+hold;
   const travel=elapsed<approach?elapsed/approach:returning?1-(elapsed-approach-hold)/exit:1;
   person.position.lerpVectors(start,end,ease(THREE.MathUtils.clamp(travel,0,1)));
   person.rotation.y=returning?-Math.PI/2:Math.PI/2;
   const walking=elapsed<approach||returning;
   const stride=walking&&!reducedMotion?Math.sin(elapsed*8)*.35:0;
   joints['leg-1'].rotation.x=stride;joints.leg1.rotation.x=-stride;
   joints['arm-1'].rotation.x=-stride*.5;joints.arm1.rotation.x=stride*.5;
   if(!walking){
    const reach=Math.sin(Math.min(1,(elapsed-approach)/hold)*Math.PI);
    joints['arm-1'].rotation.x=reach*1.7;
    if(!pressed&&elapsed>approach+hold*.5){pressed=true;onPress();}
   }
  },
 };
}
