export function createMotion(){return {flow:0,ripple:0,phase:0,waterTime:0,motorTime:0};}
export function stepMotion(s,running,dt){
 const ease=(a,b,k)=>a+(b-a)*(1-Math.exp(-k*dt));
 s.flow=ease(s.flow,running?1:0,3.5);
 s.ripple=ease(s.ripple,s.flow,2.2);
 if(!running&&s.flow<.001) s.flow=0;
 if(!running&&s.ripple<.001) s.ripple=0;
 s.phase+=dt*.25*s.flow;
 if(s.ripple>0) s.waterTime+=dt*Math.max(s.flow,s.ripple);
 if(s.flow>0) s.motorTime+=dt*s.flow;
 return s;
}
