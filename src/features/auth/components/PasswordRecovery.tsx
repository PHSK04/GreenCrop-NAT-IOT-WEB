import { AuthErrorPopup } from './AuthErrorPopup';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck, Loader2, X } from 'lucide-react';
import { authService } from '../services/authService';
import { reportAuthError } from '../services/authError';

type Props = { token?: string; onClose: () => void; onLogin: () => void; onRequestNew: () => void };
export function PasswordRecovery({ token, onClose, onLogin }: Props) {
  const [step, setStep] = useState<'request' | 'otp' | 'password' | 'success'>(token ? 'password' : 'request');
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState('');
  const [resetToken, setResetToken] = useState(token || '');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
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
      if (step === 'request') {
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
  const startAgain = () => { setChallenge(''); setResetToken(''); setStep('request'); };
  const inputClass = 'h-[60px] w-full rounded-xl border border-slate-200 bg-white pl-16 pr-16 text-base text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';
  const activeStep = step === 'success' ? 3 : ['request', 'otp', 'password'].indexOf(step);
  const title = step === 'request' ? 'ขอตั้งรหัสผ่านใหม่' : step === 'otp' ? 'ยืนยันรหัส OTP' : step === 'password' ? 'ตั้งรหัสผ่านใหม่' : 'เปลี่ยนรหัสผ่านสำเร็จ';
  return <div className="relative mx-auto max-h-[calc(100dvh-3rem)] w-full max-w-[640px] overflow-y-auto rounded-2xl border border-emerald-100 bg-white p-6 text-slate-900 shadow-2xl sm:p-10">
    <button type="button" onClick={onClose} aria-label="ปิดหน้าต่างกู้คืนบัญชี" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
    <div className="mb-7 text-center">
      <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl border border-emerald-200 bg-emerald-50 text-emerald-700">{step === 'success' ? <CheckCircle2 className="h-10 w-10" /> : step === 'otp' ? <ShieldCheck className="h-10 w-10" /> : <KeyRound className="h-10 w-10" />}</div>
      <h2 className="text-3xl font-bold sm:text-4xl">{title}</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-500">{step === 'request' ? 'กรอกอีเมลที่ลงทะเบียนเพื่อขอรหัส OTP สำหรับตั้งรหัสผ่านใหม่' : step === 'otp' ? `หากอีเมล ${email} มีบัญชีในระบบ กรุณาตรวจสอบ OTP 6 หลักในกล่องจดหมายหรือสแปม` : step === 'password' ? 'กรอกรหัสผ่านใหม่ และกรอกอีกครั้งเพื่อยืนยันให้ตรงกัน' : 'บันทึกรหัสผ่านใหม่เรียบร้อยแล้ว เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย'}</p>
    </div>
    <nav className="recovery-progress" aria-label="ขั้นตอนตั้งรหัสผ่านใหม่">
      <div className="recovery-progress-heading"><span>{step === 'success' ? 'ดำเนินการครบแล้ว' : `ขั้นตอนที่ ${activeStep + 1} จาก 3`}</span><span>{step === 'success' ? 'พร้อมเข้าสู่ระบบ' : 'กู้คืนบัญชีของคุณ'}</span></div>
      <ol className="recovery-steps">
        {['ระบุอีเมล', 'ยืนยัน OTP', 'รหัสผ่านใหม่'].map((label, index) => {
          const state = index < activeStep ? 'complete' : index === activeStep ? 'current' : 'upcoming';
          return <li key={label} data-step-state={state} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="recovery-step-marker" aria-hidden="true">{state === 'complete' ? <Check /> : String(index + 1).padStart(2, '0')}</span>
            <span className="recovery-step-label">{label}</span>
            <span className="recovery-step-description">{state === 'complete' ? 'เสร็จแล้ว' : state === 'current' ? 'ขั้นตอนปัจจุบัน' : 'ขั้นตอนถัดไป'}</span>
          </li>;
        })}
      </ol>
    </nav>
    {step !== 'success' && <form key={step} onSubmit={submit} aria-busy={busy} className="space-y-5" onInvalidCapture={event => { event.preventDefault(); reportAuthError('กรุณาตรวจสอบข้อมูล', { fields: [(event.target as HTMLInputElement).name] }); }}>
      <AuthErrorPopup />
      {step === 'request' && <label className="block"><span className="mb-2 block font-medium">อีเมลที่ลงทะเบียน</span><span className="relative block"><span className="auth-input-icon"><Mail aria-hidden="true" /></span><input type="email" name="email" defaultValue={email} required maxLength={254} autoComplete="email" placeholder="name@example.com" className={inputClass} /></span></label>}
      {step === 'otp' && <label className="block"><span className="mb-2 block font-medium">รหัส OTP 6 หลัก</span><input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="000000" className="h-[60px] w-full rounded-xl border border-slate-200 bg-white px-4 text-center font-mono text-2xl tracking-[.4em] text-slate-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" /><span className="mt-2 block text-sm text-slate-500">OTP ใช้ได้ 15 นาที และใช้ได้ครั้งเดียว</span></label>}
      {step === 'password' && <>
        <label className="block"><span className="mb-2 block font-medium">รหัสผ่านใหม่</span><span className="relative block"><span className="auth-input-icon"><KeyRound aria-hidden="true" /></span><input type={visible ? 'text' : 'password'} name="password" required minLength={8} autoComplete="new-password" placeholder="อย่างน้อย 8 ตัวอักษร" className={inputClass} /><button type="button" className="auth-eye" aria-label={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <Eye /> : <EyeOff />}</button></span></label>
        <label className="block"><span className="mb-2 block font-medium">ยืนยันรหัสผ่านใหม่</span><span className="relative block"><span className="auth-input-icon"><ShieldCheck aria-hidden="true" /></span><input type={confirmVisible ? 'text' : 'password'} name="confirmPassword" required minLength={8} autoComplete="new-password" placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" className={inputClass} /><button type="button" className="auth-eye" aria-label={confirmVisible ? 'ซ่อนการยืนยันรหัสผ่าน' : 'แสดงการยืนยันรหัสผ่าน'} aria-pressed={confirmVisible} onClick={() => setConfirmVisible(!confirmVisible)}>{confirmVisible ? <Eye /> : <EyeOff />}</button></span></label>
      </>}
      <button disabled={busy} className="flex h-[60px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{busy && <Loader2 className="h-5 w-5 animate-spin" />}{busy ? 'กำลังดำเนินการ...' : step === 'request' ? 'ขอรหัส OTP' : step === 'otp' ? 'ยืนยัน OTP' : 'ยืนยันและบันทึกรหัสผ่านใหม่'}</button>
      {step !== 'request' && <button type="button" disabled={busy} onClick={startAgain} className="min-h-11 w-full font-semibold text-emerald-700">{step === 'otp' ? 'ไม่ได้รับ OTP หรือรหัสหมดอายุ? ขอรหัสใหม่' : 'ลิงก์หมดอายุหรือใช้งานไม่ได้? ขอลิงก์หรือ OTP ใหม่'}</button>}
    </form>}
    <button type="button" disabled={busy} onClick={onLogin} className="mt-7 flex min-h-11 w-full items-center justify-center gap-2 border-t border-slate-200 pt-5 font-semibold text-emerald-700"><ArrowLeft className="h-4 w-4" />กลับไปเข้าสู่ระบบ</button>
  </div>;
}
