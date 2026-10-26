import { AuthErrorPopup } from './AuthErrorPopup';
import { useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Mail, ShieldCheck, Loader2, X } from 'lucide-react';
import { authService } from '../services/authService';
import { reportAuthError } from '../services/authError';

export function PasswordRecovery({ token, onClose, onLogin, onRequestNew }: { token?: string; onClose: () => void; onLogin: () => void; onRequestNew: () => void }) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    if (token && password !== form.get('confirmPassword')) {
      reportAuthError('ตั้งรหัสผ่านไม่สำเร็จ', { description: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      setMessage(await authService.passwordRecovery(token ? { token, password } : { email: String(form.get('email') || '').trim() }));
    } catch (error) {
      reportAuthError('กู้คืนบัญชีไม่สำเร็จ', { description: error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่ภายหลัง' });
    } finally { pending.current = false; setBusy(false); }
  };
  const inputClass = 'h-[60px] w-full rounded-xl border border-slate-200 bg-white pl-16 pr-4 text-base text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10';
  return (
    <div className="relative mx-auto max-h-[calc(100dvh-3rem)] w-full max-w-[640px] overflow-y-auto rounded-2xl border border-emerald-100 bg-white p-6 text-slate-900 shadow-2xl sm:p-10">
      <button type="button" onClick={onClose} aria-label="ปิดหน้าต่างกู้คืนบัญชี" className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
      <div className="mb-7 text-center">
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-3xl bg-emerald-100 text-emerald-700">{message ? <CheckCircle2 className="h-10 w-10" /> : <KeyRound className="h-10 w-10" />}</div>
        <h2 className="text-3xl font-bold sm:text-4xl">{message ? token ? 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว' : 'รับคำขอแล้ว' : token ? 'ตั้งรหัสผ่านใหม่' : 'ขอตั้งรหัสผ่านใหม่'}</h2>
        <p className="mt-3 text-base leading-relaxed text-slate-500">{message || (token ? 'สร้างรหัสผ่านใหม่สำหรับบัญชีของคุณ' : 'ระบุอีเมลที่ลงทะเบียน เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ')}</p>
      </div>
      {!message && <form onSubmit={submit} className="space-y-5" onInvalidCapture={(event) => { event.preventDefault(); reportAuthError("กรุณาตรวจสอบข้อมูล", { fields: [(event.target as HTMLInputElement).name] }); }}>
        <AuthErrorPopup />
        {!token ? <label className="block"><span className="mb-2 block font-medium">อีเมลที่ลงทะเบียน</span><span className="relative block"><span className="auth-input-icon"><Mail aria-hidden="true" /></span><input type="email" name="email" required maxLength={254} autoComplete="email" placeholder="name@example.com" className={inputClass} /></span></label> : <>
          <label className="block"><span className="mb-2 block font-medium">รหัสผ่านใหม่</span><div className="relative"><span className="auth-input-icon"><KeyRound aria-hidden="true" /></span><input type={visible ? 'text' : 'password'} name="password" required minLength={8} autoComplete="new-password" placeholder="อย่างน้อย 8 ตัวอักษร" className={`${inputClass} pr-14`} /><button type="button" aria-label={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} onClick={() => setVisible(!visible)} className="auth-eye" aria-pressed={visible}>{visible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button></div></label>
          <label className="block"><span className="mb-2 block font-medium">ยืนยันรหัสผ่านใหม่</span><span className="relative block"><span className="auth-input-icon"><ShieldCheck aria-hidden="true" /></span><input type={confirmVisible ? 'text' : 'password'} name="confirmPassword" required minLength={8} autoComplete="new-password" placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" className={`${inputClass} pr-14`} /><button type="button" className="auth-eye" aria-label={confirmVisible ? 'ซ่อนการยืนยันรหัสผ่าน' : 'แสดงการยืนยันรหัสผ่าน'} aria-pressed={confirmVisible} onClick={() => setConfirmVisible(!confirmVisible)}>{confirmVisible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button></span></label>
        </>}
        <button disabled={busy} className="flex min-h-[60px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{busy && <Loader2 className="h-5 w-5 animate-spin" />}{busy ? 'กำลังดำเนินการ...' : token ? 'บันทึกรหัสผ่านใหม่' : 'ขอลิงก์ตั้งรหัสผ่านใหม่'}</button>
        {!token && <p className="text-center text-sm text-slate-500">ลิงก์ใช้งานได้ 15 นาที หากไม่พบอีเมล กรุณาตรวจสอบโฟลเดอร์จดหมายขยะ</p>}
      </form>}
      {token && !message && <button type="button" onClick={onRequestNew} className="mt-5 min-h-11 w-full text-sm font-semibold text-emerald-700">ลิงก์หมดอายุหรือใช้งานไม่ได้? ขอลิงก์ใหม่</button>}
      <button type="button" onClick={onLogin} className="mt-7 flex w-full items-center justify-center gap-2 border-t border-slate-200 pt-5 font-semibold text-emerald-700"><ArrowLeft className="h-4 w-4" />กลับไปเข้าสู่ระบบ</button>
    </div>
  );
}
