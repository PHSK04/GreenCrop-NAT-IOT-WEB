import { OTPInput, REGEXP_ONLY_DIGITS } from 'input-otp';
import { AuthErrorPopup } from './AuthErrorPopup';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, Eye, EyeOff, KeyRound, Mail, ShieldCheck, Loader2, X } from 'lucide-react';
import { authService } from '../services/authService';
import { reportAuthError } from '../services/authError';

type Props = { token?: string; onClose: () => void; onLogin: () => void; onRequestNew: () => void };
export function PasswordRecovery({ token, onClose, onLogin }: Props) {
  const [step, setStep] = useState<'request' | 'otp' | 'password' | 'success'>(token ? 'password' : window.location.hash === '#recovery-demo' ? 'otp' : 'request');
  const [email, setEmail] = useState(window.location.hash === '#recovery-demo' ? 'demo@example.com' : '');
  const [preview, setPreview] = useState(window.location.hash === '#recovery-demo');
  const [challenge, setChallenge] = useState('');
  const [resetToken, setResetToken] = useState(token || '');
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState('');
  const pending = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => { cardRef.current?.scrollTo({ top: 0 }); setOtp(''); }, [step]);
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    if (step === 'password' && password !== form.get('confirmPassword')) {
      reportAuthError('ตั้งรหัสผ่านไม่สำเร็จ', { description: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน', fields: ['password', 'confirmPassword'] });
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      if (preview && step === 'otp') {
        if (String(form.get('code') || '') !== '123456') { reportAuthError('กรุณาตรวจสอบ OTP', { description: 'โหมดตัวอย่างใช้รหัส OTP 123456 หรือกดข้ามขั้นตอน', fields: ['code'] }); return; }
        setStep('password');
      } else if (preview && step === 'password') {
        setStep('success');
      } else if (step === 'request') {
        const address = String(form.get('email') || '').trim();
        const result = await authService.requestPasswordOtp(address);
        setEmail(address); setChallenge(result.challenge); setStep('otp');
      } else if (step === 'otp') {
        const verified = await authService.verifyPasswordOtp(challenge, String(form.get('code') || ''));
        setResetToken(verified); setChallenge(''); setStep('password');
      } else if (step === 'password') {
        await authService.passwordRecovery({ token: resetToken, password });
        setResetToken(''); setStep('success');
      }
    } catch (error) {
      reportAuthError('กู้คืนบัญชีไม่สำเร็จ', { description: error instanceof Error ? error.message : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่ภายหลัง', fields: step === 'otp' ? ['code'] : undefined });
    } finally { pending.current = false; setBusy(false); }
  };
  const startAgain = () => { setChallenge(''); setResetToken(''); setPreview(false); setStep('request'); };
  const startPreview = () => { setPreview(true); setEmail('demo@example.com'); setChallenge(''); setResetToken(''); setStep('otp'); };
  const inputClass = 'recovery-input';
  const activeStep = step === 'success' ? 3 : ['request', 'otp', 'password'].indexOf(step);
  const title = step === 'request' ? 'ลืมรหัสผ่าน?' : step === 'otp' ? 'ยืนยันรหัส OTP' : step === 'password' ? 'ตั้งรหัสผ่านใหม่' : preview ? 'ตัวอย่างเสร็จสมบูรณ์' : 'ตั้งรหัสผ่านใหม่แล้ว';
  return <div ref={cardRef} className="recovery-card">
    <button type="button" onClick={onClose} aria-label="ปิดหน้าต่างกู้คืนบัญชี" className="recovery-close"><X aria-hidden="true" /></button>
    <div className="recovery-brand-row">
      <div className="recovery-brand"><img src={`${import.meta.env.BASE_URL}favicon.png`} alt="" /><span>GreenCrop<span className="recovery-brand-nat"> NAT</span></span></div>
      {preview && <span className="recovery-demo-badge">โหมดตัวอย่าง</span>}
    </div>
    <nav className="recovery-progress" aria-label="ขั้นตอนตั้งรหัสผ่านใหม่">
      <ol className="recovery-steps">{['อีเมล', 'ยืนยัน OTP', 'รหัสผ่านใหม่'].map((label, index) => {
        const state = index < activeStep ? 'complete' : index === activeStep ? 'current' : 'upcoming';
        return <li key={label} data-step-state={state} aria-current={state === 'current' ? 'step' : undefined}><span className="recovery-step-label">{state === 'complete' ? <Check aria-hidden="true" /> : <span className="recovery-step-number">{index + 1}</span>}{label}</span></li>;
      })}</ol>
    </nav>
    <header className="recovery-heading">
      {step === 'success' && <span className="recovery-success-mark"><Check aria-hidden="true" /></span>}
      <h2 className="recovery-heading-title">{title}</h2>
      <p>{step === 'request' ? 'กรอกอีเมลที่ลงทะเบียน เพื่อเริ่มตั้งรหัสผ่านใหม่' : step === 'otp' ? preview ? 'กรอกรหัสตัวอย่างเพื่อไปยังขั้นตอนตั้งรหัสผ่านใหม่' : `หากอีเมลนี้มีบัญชีในระบบ กรุณาตรวจสอบรหัสที่ ${email}` : step === 'password' ? 'ใช้รหัสผ่านอย่างน้อย 8 ตัวอักษร และกรอกยืนยันให้ตรงกัน' : preview ? 'คุณดูขั้นตอนครบแล้ว ไม่มีการเปลี่ยนรหัสผ่านบัญชีจริง' : 'เข้าสู่ระบบอีกครั้งด้วยรหัสผ่านใหม่ของคุณ'}</p>
    </header>
    {step !== 'success' && <form key={step} onSubmit={submit} aria-busy={busy} className="recovery-form" onInvalidCapture={event => { event.preventDefault(); reportAuthError('กรุณาตรวจสอบข้อมูล', { fields: [(event.target as HTMLInputElement).name] }); }}>
      <AuthErrorPopup />
      {step === 'request' && <label className="recovery-field"><span>อีเมลที่ลงทะเบียน</span><input type="email" name="email" defaultValue={email} required maxLength={254} autoComplete="email" placeholder="name@example.com" className={inputClass} /></label>}
      {step === 'otp' && <div className="recovery-otp">
        <label htmlFor="recovery-code" className="recovery-field-label">รหัสยืนยัน 6 หลัก</label>
        <OTPInput id="recovery-code" name="code" value={otp} onChange={setOtp} maxLength={6} minLength={6} pattern={REGEXP_ONLY_DIGITS} required inputMode="numeric" autoComplete="one-time-code" aria-describedby="recovery-code-hint" containerClassName="recovery-otp-container" render={({ slots }) => <div className="recovery-otp-slots" aria-hidden="true">{slots.map((slot, index) => <span key={index} data-active={slot.isActive} data-filled={!!slot.char} className="recovery-otp-slot">{slot.char || (slot.hasFakeCaret ? <i /> : <span className="recovery-otp-placeholder">·</span>)}</span>)}</div>} />
        <p id="recovery-code-hint" className="recovery-field-hint">{preview ? <>รหัสสำหรับนำเสนอ <strong>123456</strong></> : 'รหัสใช้ได้ 15 นาที ตรวจสอบโฟลเดอร์สแปมหากไม่พบอีเมล'}</p>
      </div>}
      {step === 'password' && <>
        <label className="recovery-field"><span>รหัสผ่านใหม่</span><span className="recovery-password"><input type={visible ? 'text' : 'password'} name="password" required minLength={8} autoComplete="new-password" placeholder="อย่างน้อย 8 ตัวอักษร" className={inputClass} /><button type="button" className="auth-eye" aria-label={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <Eye /> : <EyeOff />}</button></span></label>
        <label className="recovery-field"><span>ยืนยันรหัสผ่านใหม่</span><span className="recovery-password"><input type={confirmVisible ? 'text' : 'password'} name="confirmPassword" required minLength={8} autoComplete="new-password" placeholder="กรอกรหัสผ่านอีกครั้ง" className={inputClass} /><button type="button" className="auth-eye" aria-label={confirmVisible ? 'ซ่อนการยืนยันรหัสผ่าน' : 'แสดงการยืนยันรหัสผ่าน'} aria-pressed={confirmVisible} onClick={() => setConfirmVisible(!confirmVisible)}>{confirmVisible ? <Eye /> : <EyeOff />}</button></span></label>
      </>}
      <button type="submit" disabled={busy} className="recovery-primary">{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}{busy ? 'กำลังดำเนินการ...' : step === 'request' ? 'ส่งรหัสยืนยัน' : step === 'otp' ? 'ยืนยันและดำเนินการต่อ' : 'บันทึกรหัสผ่านใหม่'}{!busy && <span aria-hidden="true">→</span>}</button>
      {step === 'otp' && <div className="recovery-resend"><span>ไม่ได้รับรหัส?</span><button type="button" disabled={busy} onClick={preview ? startPreview : startAgain}>ส่งรหัสอีกครั้ง</button></div>}
      {step === 'password' && !preview && <button type="button" disabled={busy} onClick={startAgain} className="recovery-text-action">ลิงก์ใช้งานไม่ได้? ขอรหัสใหม่</button>}
    </form>}
    {preview && step === 'otp' && <button type="button" disabled={busy} onClick={() => setStep('password')} className="recovery-text-action recovery-skip">ข้ามขั้นตอนเพื่อดูตัวอย่าง <span aria-hidden="true">→</span></button>}
    {step === 'request' && <button type="button" disabled={busy} onClick={startPreview} className="recovery-text-action">ดูตัวอย่างสำหรับนำเสนอ</button>}
    {step === 'success' && <button type="button" onClick={onLogin} className="recovery-primary">กลับไปเข้าสู่ระบบ <span aria-hidden="true">→</span></button>}
    <footer className="recovery-footer">
      {step !== 'success' && <button type="button" disabled={busy} onClick={onLogin}><ArrowLeft aria-hidden="true" />กลับไปเข้าสู่ระบบ</button>}
      {preview && <p>การสาธิตเท่านั้น · ไม่ส่งอีเมลหรือเปลี่ยนรหัสผ่านจริง</p>}
    </footer>
  </div>;
}
