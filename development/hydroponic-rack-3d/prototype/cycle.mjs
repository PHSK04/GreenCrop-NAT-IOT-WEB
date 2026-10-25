export function createCycle() {
  return {mode:'manual',phase:'stabilizing',elapsed:0,source:.85,destination:0,armed:false,pump:false,alarm:false,fault:false,pumpTime:0};
}
export function act(s,action) {
  if(action==='stop') {s.phase='idle';s.pump=false;s.alarm=false;s.fault=false;s.armed=false;s.elapsed=0;return;}
  if(action==='fault') {s.phase='fault';s.pump=false;s.alarm=true;s.fault=true;s.armed=false;return;}
  if(s.fault) return;
  if(action==='manual'||action==='auto'||action==='mode') {
    s.mode=action==='mode'?(s.mode==='manual'?'auto':'manual'):action;
    s.armed=false;s.pump=false;s.alarm=false;
    if(s.phase!=='stabilizing') s.phase=s.source>=.2?'ready':'idle';return;
  }
  if(action==='start') {
    if(s.mode==='auto') s.armed=true;
    if(['ready','idle'].includes(s.phase)&&s.source>=.2&&s.destination<1) {
      s.phase='running';s.pump=true;s.alarm=false;s.pumpTime=0;s.elapsed=0;
    }
  }
}
export function advance(s,dt) {
  if(s.fault) return;
  s.elapsed+=dt;
  if(s.phase==='stabilizing'&&s.elapsed>=5) {
    s.phase='ready';s.elapsed=0;
    if(s.mode==='auto'&&s.armed) act(s,'start');
  }
  if(s.phase==='running') {
    if(s.source<.2) {act(s,'fault');return;}
    s.pumpTime+=dt;
    if(s.pumpTime>=600) {act(s,'fault');return;}
    s.destination=Math.min(1,s.destination+dt/24);
    s.source=Math.max(.25,s.source-dt/48);
    if(s.destination>=1) {s.phase='complete';s.pump=false;s.alarm=true;s.armed=false;s.elapsed=0;}
  } else if(s.phase==='complete'&&s.elapsed>=5) {s.alarm=false;s.phase='idle';s.elapsed=0;}
}
export function phaseText(s) {
  if(s.fault) return 'FAULT · หยุดปั๊ม / Alarm ค้าง';
  return {stabilizing:`ระดับน้ำคงที่ ${Math.max(0,5-s.elapsed).toFixed(0)} s`,ready:'พร้อม · กด Start ที่แผง',running:'กำลังสูบน้ำ',complete:'ปลายทางเต็ม · Alarm 5 s',idle:s.destination>=1?'เสร็จสิ้น · กดรอบใหม่':'หยุด · รอ Start'}[s.phase];
}
