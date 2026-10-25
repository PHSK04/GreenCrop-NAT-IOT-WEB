import React, {useEffect, useRef} from 'react';
import {Home,Focus,Pause,UserRound,RotateCcw} from 'lucide-react';
import './style.css';

/** SSR-safe: WebGL is loaded only after mounting in the browser (including Gatsby). */
export default function HydroponicRoom({className=''}) {
  const host=useRef(null);
  useEffect(()=>{
    let cancelled=false,dispose;
    import('./rack-scene.js').then(({createRackScene})=>{
      if(!cancelled)dispose=createRackScene(host.current);
    }).catch(()=>{
      // Usually no WebGL (old device, GPU off). Collapse the stage and offer a retry instead of an empty box.
      if(cancelled||!host.current)return;
      host.current.classList.add('room-failed');
      const status=host.current.querySelector('#status');
      if(!status)return;
      status.textContent='เปิดภาพสามมิติไม่สำเร็จ อุปกรณ์หรือเบราว์เซอร์นี้อาจไม่รองรับ WebGL';
      const retry=document.createElement('button');
      retry.type='button';retry.className='room-retry';retry.textContent='ลองโหลดอีกครั้ง';
      retry.addEventListener('click',()=>window.location.reload());
      status.append(retry);
    });
    return ()=>{cancelled=true;dispose?.();};
  },[]);
  return <div ref={host} className={`hydroponic-room ${className}`}>
    <main className="machine-scene" aria-label="เครื่องสองมุมในห้องทดลองเดียวกัน">
      <div id="viewport" />
      <div id="second-viewport" />
      <header><span className="wordmark">GreenCrop<span className="brand-dot">.</span></span><span className="demo-label"><i /> CLEAN TECH LAB <span>ห้องทดลองจำลอง</span></span></header>
      <div id="status" role="status">กำลังโหลดเครื่อง…</div>
      <div className="camera-hint">ลากหมุน 360° · เลื่อนล้อเพื่อซูม · คลิกขวาลากเพื่อเลื่อน</div><div className="stage-labels"><span>01 / ภาพรวมเครื่อง</span><span>02 / แผงควบคุม</span></div>
      <button id="second-focus" aria-pressed="false">ขยายแผงควบคุม</button>
      <nav aria-label="มุมมองเครื่อง">
        <div className="room-toolbar-group" role="group" aria-label="มุมมอง">
          <button type="button" data-view="full" aria-pressed="true" title="กลับไปเห็นเครื่องทั้งสองมุม"><Home size={15}/><span>มุมเริ่มต้น</span></button>
          <button type="button" data-view="panel" aria-pressed="false" title="ขยายเพื่อดูปุ่มบนแผงควบคุม"><Focus size={15}/><span>ดูแผงใกล้ ๆ</span></button>
        </div>
        <div className="room-toolbar-group" role="group" aria-label="การสาธิต">
          <button type="button" data-room-motion aria-pressed="true" title="เล่นหรือพักแอนิเมชันบรรยากาศห้อง"><Pause size={15}/><span data-room-motion-label>พักฉาก</span></button>
          <button type="button" data-operator-demo title="ให้ผู้ดูแลเดินมากดปุ่มเริ่มในฉากจำลอง"><UserRound size={15}/><span>สาธิตผู้ดูแล</span></button>
          <button type="button" id="reset-cycle" title="เริ่มลำดับจำลองรอบใหม่"><RotateCcw size={15}/><span>เริ่มรอบใหม่</span></button>
        </div>
      </nav>
    </main>
  </div>;
}
