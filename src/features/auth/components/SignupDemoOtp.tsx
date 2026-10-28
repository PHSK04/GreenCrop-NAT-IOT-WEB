import { useState } from 'react';
import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp';
import { ArrowLeft, Mail, X, CircleAlert } from 'lucide-react';
export function SignupDemoOtp({ email, onComplete, onBack, onClose }: { email: string; onComplete: () => void; onBack: () => void; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  return <section className={`recovery-card ${error ? 'signup-otp-invalid' : ''}`} aria-labelledby="signup-otp-title">
    <button type="button" className="recovery-close" onClick={onClose} aria-label="ปิดหน้าต่าง"><X /></button>
    <div className="recovery-brand-row"><div className="recovery-brand">GreenCrop NAT</div><span className="recovery-demo-badge">DEMO</span></div>
    <div className="recovery-heading"><h2 id="signup-otp-title" className="recovery-heading-title">ยืนยันอีเมลของคุณ</h2><p>ขั้นตอนที่ 2 จาก 3 · ยืนยัน OTP ก่อนเข้าสู่หน้าต้อนรับ</p></div>
    <div className="registration-email"><Mail aria-hidden="true" /><span>{email}</span></div>
    <form onSubmit={event => { event.preventDefault(); if (code === '123456') onComplete(); else { setError('รหัสไม่ถูกต้อง กรุณาใช้รหัสตัวอย่าง 123456'); navigator.vibrate?.([80,60,80]); } }}>
      {error && <div role="alert" className="signup-demo-error" id="signup-otp-error"><CircleAlert size={18} aria-hidden="true" />{error}</div>}
      <label htmlFor="signup-otp">รหัส OTP 6 หลัก</label>
      <OTPInput id="signup-otp" value={code} onChange={value => { setCode(value); setError(''); }} maxLength={6} minLength={6} required pattern={REGEXP_ONLY_DIGITS} inputMode="numeric" autoComplete="one-time-code" aria-invalid={!!error} aria-describedby={error ? 'signup-otp-error signup-otp-hint' : 'signup-otp-hint'} containerClassName="recovery-otp-container" render={({ slots }) => <div className="recovery-otp-slots" aria-hidden="true">{slots.map((slot, index) => <span key={index} data-active={slot.isActive} className="recovery-otp-slot">{slot.char || '·'}</span>)}</div>} />
      <p id="signup-otp-hint" className="signup-demo-hint">ใช้รหัสตัวอย่าง <strong>123456</strong> · ไม่มีการส่งอีเมลจริง</p>
      <button className="recovery-primary" type="submit">ยืนยัน OTP</button>
    </form>
    <div className="signup-demo-actions"><button type="button" onClick={() => { setCode(''); setError(''); setResent(true); }}>ขอรหัสตัวอย่างอีกครั้ง</button><button type="button" onClick={onComplete}>ข้ามเพื่อดูหน้าสมัครสำเร็จ</button></div>
    {resent && <p role="status" className="signup-demo-hint">รหัสตัวอย่างพร้อมใช้งาน: 123456</p>}
    <button type="button" className="signup-demo-back" onClick={onBack}><ArrowLeft size={16} />กลับไปแก้ไขข้อมูล</button>
  </section>;
}
