import { SignupDemoOtp } from '@/features/auth/components/SignupDemoOtp';
import { RegistrationSuccess } from '@/features/auth/components/RegistrationSuccess';
import * as Dialog from "@radix-ui/react-dialog";
import "@/features/auth/components/auth.css";
import { PasswordRecovery } from '@/features/auth/components/PasswordRecovery';
import { reportAuthError } from '@/features/auth/services/authError';
import { AuthErrorPopup } from '@/features/auth/components/AuthErrorPopup';
import { FormEvent, useEffect, useRef, useState } from "react";
import { Activity, UserRound, Phone, Loader2, ArrowRight, Cpu, Eye, EyeOff, Lock, Mail, Moon, Play, Radio, ShieldCheck, Sun, Volume2, VolumeX, X } from "lucide-react";
import { AuthProvider, useAuth } from "@/features/auth/contexts/AuthContext";
import { AppRouter } from "@/features/auth/components/AppRouter";
import { SocialAuth } from "@/features/auth/components/SocialAuth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "next-themes";
import { ProductShowcase } from "@/components/ProductShowcase";

const DAY_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204103_f607742e-09da-4cf5-bb06-4e67b0a531de.mp4";
const NIGHT_VIDEO_URL = `${import.meta.env.BASE_URL}videos/greencrop-night.mp4`;
const BRAND_LOGO_URL = `${import.meta.env.BASE_URL}favicon.png`;

function LoginForm({ onClose, onRegister, onForgot }: { onClose: () => void; onRegister: () => void; onForgot: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending = useRef(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || socialBusy) return;
    const form = new FormData(event.currentTarget);
    pending.current = true;
    setIsSubmitting(true);
    try {
      await login(String(form.get("email") || "").trim(), String(form.get("password") || ""), form.get("remember") === "on");
      onClose();
    } catch {
      // AuthContext displays the error inside the open form.
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto max-h-[calc(100dvh-3rem)] w-full max-w-[640px] overflow-y-auto rounded-2xl border border-emerald-100 !bg-white p-5 !text-slate-900 shadow-[0_24px_70px_-34px_rgba(6,78,59,0.45)] sm:p-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
        aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative mb-6 text-center">
        <div className="auth-brand mx-auto mb-4 flex h-24 w-24 items-center justify-center">
          <img src={BRAND_LOGO_URL} alt="GreenCrop NAT" className="h-[72px] w-[72px] object-contain" />
        </div>
        <p className="mb-1 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">GreenCrop NAT IoT</p>
        <h2 className="text-[40px] sm:text-5xl font-semibold leading-none tracking-tight text-slate-900">Login</h2>
        <p className="mt-2 text-base font-normal text-slate-500">เข้าสู่ระบบเพื่อจัดการฟาร์มและอุปกรณ์ของคุณ</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} onInvalidCapture={(event) => { event.preventDefault(); reportAuthError("กรุณาตรวจสอบข้อมูล", { fields: [(event.target as HTMLInputElement).name] }); }}>
        <AuthErrorPopup />
        <label className="block">
          <span className="mb-1.5 block text-base font-medium text-slate-600">ชื่อผู้ใช้ / อีเมล</span>
          <span className="relative block">
            <span className="auth-input-icon"><Mail aria-hidden="true" /></span>
            <input
              type="text"
              name="email"
              autoComplete="username"
              required
              placeholder="กรอกชื่อผู้ใช้ หรือ อีเมล"
              className="h-[60px] w-full rounded-xl border border-slate-200 bg-white/85 pl-16 pr-4 text-base sm:text-lg text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-base font-medium text-slate-600">รหัสผ่าน</span>
          <span className="relative block">
            <span className="auth-input-icon"><Lock aria-hidden="true" /></span>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="h-[60px] w-full rounded-xl border border-slate-200 bg-white/85 pl-16 pr-16 text-base sm:text-lg text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="auth-eye"
              aria-pressed={showPassword}
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 text-base">
          <label className="flex cursor-pointer items-center gap-2 text-slate-500">
            <input type="checkbox" name="remember" className="h-4 w-4 accent-emerald-600" />
            จดจำฉันในระบบ
          </label>
          <a href="#forgot-password" onClick={(event) => { event.preventDefault(); onForgot(); }} className="relative z-10 inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 py-2 font-semibold text-emerald-700 underline-offset-4 transition-colors hover:bg-emerald-50 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
            ลืมรหัสผ่าน?
          </a>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || socialBusy}
          className="group flex h-[60px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-sm text-slate-400">หรือเข้าสู่ระบบด้วย</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="[&_button]:h-[60px] [&_button_span]:text-base sm:[&_button_span]:text-lg">
        <SocialAuth disabled={isSubmitting} onBusyChange={setSocialBusy} showDivider={false} actionText="เข้าสู่ระบบ" tone="light" />
      </div>

      <p className="mt-4 border-t border-slate-200 pt-4 text-center text-base text-slate-500">
        ยังไม่มีบัญชี?{" "}
        <button type="button" onClick={onRegister} className="font-semibold text-emerald-700 hover:text-emerald-800">
          สมัครสมาชิกใหม่
        </button>
      </p>
    </div>
  );
}

function RegisterForm({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [demoOtp, setDemoOtp] = useState(false);
  const isDemo = window.location.hash === '#signup-demo';
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending = useRef(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const { register } = useAuth();
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending.current || socialBusy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    const phone = String(form.get("phone") || "").replace(/\D/g, "");
    if (!String(form.get("name") || "").trim()) {
      reportAuthError('กรุณาตรวจสอบข้อมูล', { fields: ['name'] });
      return;
    }
    if (password !== confirmPassword) {
      reportAuthError('สมัครสมาชิกไม่สำเร็จ', { description: 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }
    if (phone.length < 10) {
      reportAuthError('สมัครสมาชิกไม่สำเร็จ', { description: 'กรุณากรอกเบอร์โทรศัพท์อย่างน้อย 10 หลัก' });
      return;
    }
    if (isDemo) {
      setRegisteredEmail(String(form.get('email') || '').trim());
      setDemoOtp(true);
      return;
    }
    pending.current = true;
    setIsSubmitting(true);
    try {
      await register(String(form.get("email") || "").trim(), password, String(form.get("name") || "").trim(), phone);
      setRegisteredEmail(String(form.get("email") || "").trim());
      setRegistrationComplete(true);
    } catch {
      // AuthContext displays the error inside the open form.
    } finally {
      pending.current = false;
      setIsSubmitting(false);
    }
  };

  if (demoOtp && !registrationComplete) return <SignupDemoOtp email={registeredEmail} onComplete={() => setRegistrationComplete(true)} onBack={() => setDemoOtp(false)} onClose={onClose} />;
  if (registrationComplete) return <RegistrationSuccess demo={isDemo} email={registeredEmail} onLogin={onLogin} onClose={onClose} />;

  return (
    <div className="relative mx-auto max-h-[calc(100dvh-3rem)] w-full max-w-[640px] overflow-y-auto rounded-2xl border border-emerald-100 !bg-white p-5 !text-slate-900 shadow-[0_24px_70px_-34px_rgba(6,78,59,0.45)] sm:p-10">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
        aria-label="ปิดหน้าต่างสมัครสมาชิก"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative mb-6 text-center">
        <div className="auth-brand mx-auto mb-4 flex h-24 w-24 items-center justify-center">
          <img src={BRAND_LOGO_URL} alt="GreenCrop NAT" className="h-[72px] w-[72px] object-contain" />
        </div>
        <p className="mb-1 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">GreenCrop NAT IoT</p>
        <h2 className="text-[40px] sm:text-5xl font-semibold leading-none tracking-tight text-slate-900">สมัครสมาชิก</h2>
        {isDemo && <p className="text-sm text-emerald-700">โหมดตัวอย่าง · ไม่สร้างบัญชีหรือส่งอีเมลจริง</p>}
        <p className="mt-2 text-base text-slate-500">สร้างบัญชีเพื่อเริ่มจัดการฟาร์มอัจฉริยะ</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" onInvalidCapture={(event) => { event.preventDefault(); reportAuthError("กรุณาตรวจสอบข้อมูล", { fields: [(event.target as HTMLInputElement).name] }); }}>
        <AuthErrorPopup />
        {[
          { name: "name", label: "ชื่อผู้ใช้งาน", type: "text", placeholder: "กรอกชื่อผู้ใช้งาน", autoComplete: "name" },
          { name: "email", label: "อีเมล", type: "email", placeholder: "name@example.com", autoComplete: "email" },
          { name: "phone", label: "เบอร์โทรศัพท์", type: "tel", placeholder: "0812345678", autoComplete: "tel" },
          { name: "password", label: "รหัสผ่าน", type: "password", placeholder: "อย่างน้อย 8 ตัวอักษร", autoComplete: "new-password" },
          { name: "confirmPassword", label: "ยืนยันรหัสผ่าน", type: "password", placeholder: "กรอกรหัสผ่านอีกครั้ง", autoComplete: "new-password" },
        ].map((field) => (
          <label key={field.label} className="block">
            <span className="mb-1.5 block text-base font-medium text-slate-600">{field.label}</span>
            <span className="relative block"><span className="auth-input-icon">{field.name === "name" ? <UserRound aria-hidden="true" /> : field.name === "email" ? <Mail aria-hidden="true" /> : field.name === "phone" ? <Phone aria-hidden="true" /> : <Lock aria-hidden="true" />}</span><input
              type={field.type === "password" && visiblePasswords[field.name] ? "text" : field.type}
              name={field.name}
              required
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              inputMode={field.name === "phone" ? "numeric" : undefined}
              minLength={field.type === "password" ? 8 : field.name === "phone" ? 10 : undefined}
              maxLength={field.name === "email" ? 254 : undefined}
              className="h-[60px] w-full rounded-xl border border-slate-200 bg-white/85 pl-16 pr-16 text-base sm:text-lg text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
            {field.type === "password" && <button type="button" className="auth-eye" aria-label={`${visiblePasswords[field.name] ? "ซ่อน" : "แสดง"}${field.label}`} aria-pressed={!!visiblePasswords[field.name]} onClick={() => setVisiblePasswords(current => ({...current, [field.name]: !current[field.name]}))}>{visiblePasswords[field.name] ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}</button>}
            </span>
          </label>
        ))}
        <button type="submit" disabled={isSubmitting || socialBusy} className="mt-1 flex h-[60px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60">
          {isSubmitting ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-5 w-5" aria-hidden="true" />}
        </button>
      </form>

      {!isDemo && <>
      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-sm text-slate-400">หรือสมัครสมาชิกด้วย</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <div className="[&_button]:h-[60px] [&_button_span]:text-base sm:[&_button_span]:text-lg">
        <SocialAuth registration onLoginSuccess={() => setRegistrationComplete(true)} disabled={isSubmitting} onBusyChange={setSocialBusy} showDivider={false} actionText="สมัครสมาชิก" tone="light" />
      </div>
      </>}

      <p className="mt-4 border-t border-slate-200 pt-4 text-center text-base text-slate-500">
        มีบัญชีอยู่แล้ว?{" "}
        <button type="button" onClick={onLogin} className="font-semibold text-emerald-700 hover:text-emerald-800">
          กลับไปหน้า Login
        </button>
      </p>
    </div>
  );
}

function GreenCropLanding() {
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [resetToken] = useState(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    return params.get('reset_token') || '';
  });
  const [loginOpen, setLoginOpen] = useState(window.location.hash === '#signup-demo' || Boolean(resetToken) || (window.location.hash === '#forgot-password' || window.location.hash === '#recovery-demo') || new URLSearchParams(window.location.search).has("code"));
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot" | "reset">(window.location.hash === '#signup-demo' ? 'register' : resetToken ? 'reset' : (window.location.hash === '#forgot-password' || window.location.hash === '#recovery-demo') ? 'forgot' : new URLSearchParams(window.location.search).has('code') && sessionStorage.getItem('greencrop:auth-intent') === 'register' ? 'register' : 'login');
  useEffect(() => {
    if (resetToken) window.history.replaceState({}, '', window.location.pathname + window.location.search);
  }, [resetToken]);
  const [themeReady, setThemeReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = themeReady && resolvedTheme === "dark";

  useEffect(() => setThemeReady(true), []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = 0.2;
  }, []);

  const toggleAudio = async () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    video.volume = 0.2;
    setIsMuted(nextMuted);
    if (!nextMuted) {
      try {
        await video.play();
      } catch {
        video.muted = true;
        setIsMuted(true);
      }
    }
  };

  const openLogin = () => {
    setAuthMode("login");
    setLoginOpen(true);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLoginOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = loginOpen ? "hidden" : "";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [loginOpen]);

  if (showcaseOpen) {
    return <ProductShowcase onBack={() => setShowcaseOpen(false)} />;
  }

  return (
    <main className="relative isolate min-h-screen w-full overflow-hidden bg-[#020817] font-sans">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover opacity-100 transition-opacity duration-700"
        src={isDark ? NIGHT_VIDEO_URL : DAY_VIDEO_URL}
        autoPlay
        muted={isMuted}
        loop
        playsInline
        aria-hidden="true"
      />
      <div className={`absolute inset-0 transition-colors duration-700 ${isDark ? "bg-[linear-gradient(to_bottom,rgba(1,6,18,.12),rgba(2,12,28,.02)_45%,rgba(1,7,20,.18))]" : "bg-[linear-gradient(to_bottom,rgba(1,79,157,.1),rgba(0,82,165,.04)_45%,rgba(3,91,169,.18))]"}`} />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-[1680px] items-center justify-between px-6 py-5 sm:px-10 md:py-7 lg:px-16">
          <a href="#" className="flex items-center gap-3 text-white" aria-label="GreenCrop หน้าหลัก">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/90 shadow-sm backdrop-blur-md">
              <img src={BRAND_LOGO_URL} alt="" className="h-7 w-7 object-contain" />
            </span>
            <span>
              <span className="block text-[15px] font-semibold leading-none">GreenCrop</span>
              <span className="mt-1 block text-[9px] uppercase tracking-[0.22em] text-emerald-100/80">NAT IoT Platform</span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleAudio}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-slate-950/15 text-white backdrop-blur-md transition-colors hover:bg-white/15"
              aria-label={isMuted ? "เปิดเสียงบรรยากาศ" : "ปิดเสียงบรรยากาศ"}
              aria-pressed={!isMuted}
              title={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/40 bg-slate-950/15 text-white backdrop-blur-md transition-colors hover:bg-white/15"
              aria-label={isDark ? "เปลี่ยนเป็นโหมดกลางวัน" : "เปลี่ยนเป็นโหมดกลางคืน"}
              title={isDark ? "โหมดกลางวัน" : "โหมดกลางคืน"}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={openLogin}
              className="group flex items-center gap-2 rounded-xl border border-white/50 bg-white/95 px-5 py-2.5 text-[13px] font-semibold text-slate-900 shadow-sm transition-colors hover:bg-white"
            >
              Login
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <section className={`relative mx-auto flex w-full max-w-[1240px] flex-1 flex-col items-center justify-start px-5 pt-[7vh] text-center sm:pt-[8vh] ${isDark ? "landing-night-content" : ""}`}>
          <div className="flex items-center gap-3">
            <span className={`h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,.9)] ${isDark ? "landing-night-pulse" : ""}`} />
            <p className="text-[10px] font-bold uppercase tracking-[0.34em] text-emerald-100 sm:text-xs">Smart agriculture ecosystem</p>
          </div>
          <h1 className={`mt-5 max-w-[1120px] text-[clamp(2.65rem,5.35vw,5.9rem)] font-semibold leading-[0.92] tracking-[-0.05em] text-white drop-shadow-[0_12px_34px_rgba(2,6,23,0.2)] ${isDark ? "landing-night-title" : ""}`}>
            SMART IoT FOR<br />
            EVERY <span className="text-emerald-200">GREEN</span> FUTURE
          </h1>
          <p className="mt-7 max-w-md text-base font-normal leading-7 text-white/85 drop-shadow-[0_3px_12px_rgba(2,8,23,.7)] sm:text-lg">
            เชื่อมต่อทุกแปลงเกษตร เข้าถึงทุกข้อมูล<br />และควบคุมอุปกรณ์ได้จากทุกมุมโลก
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={openLogin}
                className="group flex h-12 items-center gap-3 rounded-xl border border-white bg-white px-6 text-sm font-semibold text-slate-950 shadow-[0_14px_40px_-20px_rgba(255,255,255,0.75)] transition-all hover:-translate-y-0.5"
              >
                Login
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={() => setShowcaseOpen(true)}
                className="flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-slate-950/15 px-5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/10"
              >
                <Play className="h-4 w-4 fill-current" />
                ดูแพลตฟอร์ม
              </button>
          </div>
        </section>
      </div>

      <Dialog.Root open={loginOpen} onOpenChange={setLoginOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md" />
          <Dialog.Content aria-describedby="auth-dialog-description" className="auth-dialog fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 outline-none">
            <Dialog.Title className="sr-only">{authMode === 'login' ? 'เข้าสู่ระบบ' : authMode === 'register' ? 'สมัครสมาชิก' : 'ตั้งรหัสผ่านใหม่'}</Dialog.Title>
            <Dialog.Description id="auth-dialog-description" className="sr-only">GreenCrop NAT IoT — จัดการบัญชีของคุณ</Dialog.Description>
          {authMode === "forgot" || authMode === "reset" ? (
            <PasswordRecovery key={authMode} token={authMode === 'reset' ? resetToken : undefined} onClose={() => setLoginOpen(false)} onLogin={() => setAuthMode('login')} onRequestNew={() => setAuthMode('forgot')} />
          ) : authMode === "login" ? (
            <LoginForm onClose={() => setLoginOpen(false)} onRegister={() => setAuthMode("register")} onForgot={() => setAuthMode("forgot")} />
          ) : (
            <RegisterForm onClose={() => setLoginOpen(false)} onLogin={() => setAuthMode("login")} />
          )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-emerald-950 text-sm text-white/70">กำลังตรวจสอบเซสชัน...</div>;
  }

  const recoveryLink = window.location.hash === "#signup-demo" || new URLSearchParams(window.location.hash.slice(1)).has("reset_token") || (window.location.hash === "#forgot-password" || window.location.hash === "#recovery-demo");
  return user && !recoveryLink ? <AppRouter /> : <GreenCropLanding />;
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme" attribute="class">
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
      <Toaster />
    </ThemeProvider>
  );
}
