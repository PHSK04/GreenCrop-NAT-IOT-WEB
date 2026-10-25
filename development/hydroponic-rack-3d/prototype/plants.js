import * as THREE from 'three';

export function addLivingPlanters(room){
 const crowns=[];
 const greens=['#72ac39','#88be47','#5c9537','#a0cb58'];
 for(const [x,z] of [[1.96,-1.13],[-1.48,-1.05]]){
  const planter=new THREE.Group();planter.position.set(x,0,z);room.add(planter);
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.18,.145,.19,40),new THREE.MeshStandardMaterial({color:'#e9eddf',roughness:.62}));pot.position.y=.095;pot.castShadow=true;pot.receiveShadow=true;planter.add(pot);
  const soil=new THREE.Mesh(new THREE.CircleGeometry(.167,40),new THREE.MeshStandardMaterial({color:'#424735',roughness:1}));soil.rotation.x=-Math.PI/2;soil.position.y=.191;planter.add(soil);
  for(let plant=0;plant<3;plant++){
   const crown=new THREE.Group();crown.position.set(Math.cos(plant*2.4)*.065,.19,Math.sin(plant*2.4)*.065);planter.add(crown);crowns.push(crown);
   for(let leafIndex=0;leafIndex<11;leafIndex++){
    const length=.10+(leafIndex%3)*.017,vertices=[],indices=[];
    for(let j=0;j<=16;j++){
     const t=j/16,width=Math.sin(Math.PI*t)*.037*(1+.08*Math.sin(t*25));
     for(let k=0;k<5;k++){
      const side=(k-2)/2;
      vertices.push(side*width,length*(t-.26*t*t)+Math.abs(side)*.006*Math.sin(t*12),t*length*.65-side*side*.014*Math.sin(Math.PI*t));
     }
     if(j<16)for(let k=0;k<4;k++){const n=j*5+k;indices.push(n,n+5,n+1,n+1,n+5,n+6);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const leaf=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:greens[leafIndex%4],roughness:.52,side:THREE.DoubleSide}));leaf.rotation.y=leafIndex*2.39996;leaf.rotation.x=(leafIndex%3)*.11;leaf.castShadow=true;leaf.receiveShadow=true;crown.add(leaf);
    const veinPoints=[];for(let j=0;j<=12;j++){const t=j/12;veinPoints.push(new THREE.Vector3(0,length*(t-.26*t*t)+.001,t*length*.65));}
    const vein=new THREE.Line(new THREE.BufferGeometry().setFromPoints(veinPoints),new THREE.LineBasicMaterial({color:'#b6d580',transparent:true,opacity:.52}));vein.rotation.copy(leaf.rotation);crown.add(vein);
   }
  }
 }
 return time=>crowns.forEach((crown,i)=>{crown.rotation.z=Math.sin(time*.9+i)*.025;crown.rotation.x=Math.sin(time*.7+i*.9)*.016;});
}
