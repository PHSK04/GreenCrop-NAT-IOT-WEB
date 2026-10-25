import * as THREE from 'three';

export function createWaterEffects(machine){
 const group=new THREE.Group();group.name='continuous-water-jets';machine.add(group);
 const water=new THREE.MeshPhysicalMaterial({color:'#e9fbff',vertexColors:true,transparent:true,opacity:.88,transmission:.08,ior:1.333,thickness:.009,roughness:.10,envMapIntensity:.85,metalness:0,clearcoat:.8,side:THREE.DoubleSide,depthWrite:false});
 const outlets=[new THREE.Vector3(-.485,.720,.125),new THREE.Vector3(-.463,.720,.125)];
 const jets=outlets.map(outlet=>{
  const geometry=new THREE.BufferGeometry(),vertices=new Float32Array(25*11*3),indices=[];
  for(let j=0;j<24;j++)for(let k=0;k<10;k++){const n=j*11+k;indices.push(n,n+11,n+1,n+1,n+11,n+12);}
  geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(vertices.length),3));geometry.setIndex(indices);
  const mesh=new THREE.Mesh(geometry,water);mesh.frustumCulled=false;group.add(mesh);return {mesh,outlet};
 });
 const impacts=[];
 for(const outlet of outlets)for(let i=0;i<4;i++){
  const ring=new THREE.Mesh(new THREE.RingGeometry(.005,.006,48),new THREE.MeshBasicMaterial({color:'#d2f0f0',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;group.add(ring);impacts.push({ring,outlet,phase:i/4});
 }
 return {
  outlets,
  update(flow,ripple,time,level){
   const surface=.673+.04*level+.0008;
   jets.forEach(({mesh,outlet},index)=>{
    mesh.visible=flow>.002;
    const attribute=mesh.geometry.attributes.position,colors=mesh.geometry.attributes.color;
    for(let j=0;j<=24;j++){
      const t=j/24,drop=Math.max(.001,outlet.y-surface),velocity=Math.sqrt(.18*.18+2*9.81*drop*t);
      const radius=.0048*Math.sqrt(Math.max(.001,flow)) *Math.sqrt(.18/velocity);
      const flutter=Math.sin(time*9-t*12+index)*.00028*t*flow;
      for(let k=0;k<=10;k++){
       const angle=k/10*Math.PI*2;
       const band=(Math.sin(t*8*Math.PI-time*5)+1)/2;
       colors.setXYZ(j*11+k,.12+band*.48,.50+band*.38,.76+band*.22);
       const r=radius*(1+.035*t*Math.sin(time*7-t*17+angle*2));
       attribute.setXYZ(j*11+k,outlet.x+Math.cos(angle)*r+flutter,outlet.y-drop*t,outlet.z+Math.sin(angle)*r);
      }
    }
    attribute.needsUpdate=true;colors.needsUpdate=true;mesh.geometry.computeVertexNormals();
   });
   impacts.forEach(({ring,outlet,phase})=>{
    const progress=(time*.7+phase)%1;
    ring.position.set(outlet.x,surface+.0007,outlet.z);ring.scale.setScalar(1+progress*5);
    ring.material.opacity=ripple*(1-progress)*.24;ring.visible=ripple>.001&&level>.005;
   });
  },
 };
}
