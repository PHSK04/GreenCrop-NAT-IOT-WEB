import {Vector3} from 'three';

// Authored fitting centres, measured from Control v2: X=-.510/-.488,
// depth=.150, heights=1.020/.700/.390/.290 in web coordinates.
export function hoseRoute(hose){
 const [x,y,z]=hose.points[0],depth=.15;
 if(hose.name.startsWith('Blue'))return [new Vector3(x,z,-y),new Vector3(x,z,depth),new Vector3(x,.700,depth)];
 return [new Vector3(x,.700,depth),new Vector3(x,.218,depth)];
}
