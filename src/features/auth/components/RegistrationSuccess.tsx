import { Check, ArrowRight, X } from 'lucide-react';

export function RegistrationSuccess({ email, onLogin, onClose }: { email?: string; onLogin: () => void; onClose?: () => void }) {
  return <section className="recovery-card registration-success" aria-labelledby="registration-success-title">
    {onClose && <button type="button" className="recovery-close" onClick={onClose} aria-label="ปิดหน้าต่างสมัครสมาชิก"><X aria-hidden="true" /></button>}
    <div className="recovery-brand-row"><div className="recovery-brand"><img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" /><span>GreenCrop<span className="recovery-brand-nat"> NAT</span></span></div></div>
    <div className="recovery-heading" role="status" aria-live="polite">
      <span className="recovery-success-mark"><Check aria-hidden="true" /></span>
      <h2 id="registration-success-title" className="recovery-heading-title">สมัครสมาชิกสำเร็จ</h2>
      <p>ยินดีต้อนรับสู่ GreenCrop NAT<br />บัญชีสมาชิกของคุณพร้อมใช้งานแล้ว</p>
    </div>
    {email && <div className="registration-account"><span>อีเมลสำหรับเข้าสู่ระบบ</span><strong>{email}</strong></div>}
    <button type="button" className="recovery-primary" onClick={onLogin}>กลับไปเข้าสู่ระบบ<ArrowRight aria-hidden="true" /></button>
    <p className="registration-success-note">เข้าสู่ระบบด้วยบัญชีที่เพิ่งสมัครเพื่อเริ่มใช้งาน</p>
  </section>;
}
