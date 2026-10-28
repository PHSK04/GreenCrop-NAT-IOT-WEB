import { Check, ArrowRight, X, Mail, Droplets, Thermometer, Bell, Sprout } from 'lucide-react';

export function RegistrationSuccess({ email, onLogin, onClose, demo = false }: { demo?: boolean; email?: string; onLogin: () => void; onClose?: () => void }) {
  return <section className="recovery-card registration-success" aria-labelledby="registration-success-title">
    <header className="registration-canopy">
      <div className="registration-wordmark"><Sprout aria-hidden="true" /><span>GreenCrop <b>NAT</b></span></div>
      <span className="registration-canopy-caption">เติบโตไปด้วยกันอย่างชาญฉลาด</span>
      <div className="registration-leaves" aria-hidden="true"><i /><i /><i /><i /><i /></div>
      {onClose && <button type="button" className="recovery-close" onClick={onClose} aria-label="ปิดหน้าต่างสมัครสมาชิก"><X aria-hidden="true" /></button>}
    </header>
    <div className="registration-welcome">
      <span className="registration-check"><Check aria-hidden="true" /></span>
      <div role="status" aria-live="polite">
        <span className="registration-eyebrow">สมัครสมาชิกสำเร็จ</span>
        <h2 id="registration-success-title">ยินดีต้อนรับสู่ GreenCrop</h2>
        <p>{demo ? 'ตัวอย่างการสมัครเสร็จสมบูรณ์' : 'บัญชีของคุณพร้อมแล้ว'}<br />เริ่มต้นดูแลฟาร์มผำในแบบของคุณ</p>
      </div>
      {email && <div className="registration-email"><Mail aria-hidden="true" /><span>{email}</span></div>}
      <div className="registration-features" aria-label="สิ่งที่คุณสามารถดูแลได้"><div><Droplets aria-hidden="true" /><span>คุณภาพน้ำ</span></div><div><Thermometer aria-hidden="true" /><span>อุณหภูมิ</span></div><div><Bell aria-hidden="true" /><span>การแจ้งเตือน</span></div></div>
      <button type="button" className="recovery-primary" onClick={onLogin}>กลับไปเข้าสู่ระบบ<ArrowRight aria-hidden="true" /></button>
      <p className="registration-success-note">{demo ? 'โหมดตัวอย่าง · ยังไม่ได้สร้างบัญชีจริง' : 'ใช้บัญชีที่เพิ่งสมัครเพื่อเข้าสู่ระบบ'}</p>
    </div>
  </section>;
}
