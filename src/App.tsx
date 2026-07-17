import { FormEvent, useEffect, useRef, useState } from "react";
import { Activity, ArrowRight, Cpu, Eye, EyeOff, Lock, Mail, Moon, Play, Radio, ShieldCheck, Sun, Volume2, VolumeX, X } from "lucide-react";
import { AuthProvider, useAuth } from "@/features/auth/contexts/AuthContext";
import { AppRouter } from "@/features/auth/components/AppRouter";
import { SocialAuth } from "@/features/auth/components/SocialAuth";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "next-themes";

const DAY_VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204103_f607742e-09da-4cf5-bb06-4e67b0a531de.mp4";
const NIGHT_VIDEO_URL = `${import.meta.env.BASE_URL}videos/greencrop-night.mp4`;
const BRAND_LOGO_URL = `${import.meta.env.BASE_URL}favicon.png`;

function SocialLogo({ provider }: { provider: "Google" | "Microsoft" | "LINE" | "Facebook" }) {
  if (provider === "Google") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#4285F4" d="M21.35 12.2c0-.7-.06-1.2-.2-1.72H12v3.3h5.37a4.6 4.6 0 0 1-2 2.94v2.14h3.25c1.9-1.75 2.73-4.34 2.73-6.66Z" />
        <path fill="#34A853" d="M12 21.7c2.72 0 5-.9 6.62-2.44l-3.25-2.54c-.9.6-2.06.96-3.37.96-2.62 0-4.84-1.77-5.64-4.15H3v2.2A10 10 0 0 0 12 21.7Z" />
        <path fill="#FBBC05" d="M6.36 13.53A6 6 0 0 1 6.05 12c0-.53.1-1.04.3-1.53v-2.2H3A10 10 0 0 0 2 12c0 1.35.32 2.62 1 3.73l3.36-2.2Z" />
        <path fill="#EA4335" d="M12 6.32c1.48 0 2.8.5 3.84 1.5l2.86-2.87A9.6 9.6 0 0 0 12 2.3a10 10 0 0 0-9 5.97l3.36 2.2C7.16 8.09 9.38 6.32 12 6.32Z" />
      </svg>
    );
  }
  if (provider === "Microsoft") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <path fill="#F25022" d="M2 2h9v9H2z" /><path fill="#7FBA00" d="M13 2h9v9h-9z" />
        <path fill="#00A4EF" d="M2 13h9v9H2z" /><path fill="#FFB900" d="M13 13h9v9h-9z" />
      </svg>
    );
  }
  if (provider === "LINE") {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#06C755" />
        <path fill="white" d="M18.6 11.1c0-3-3-5.4-6.6-5.4s-6.6 2.4-6.6 5.4c0 2.7 2.4 4.9 5.7 5.3.2 0 .5.2.6.4.1.2 0 .5 0 .7l-.1.7c0 .2-.2.8.7.4.9-.4 4.7-2.8 6-4.8.9-.9 1.3-1.8 1.3-2.7Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path fill="white" d="M13.7 20v-7h2.4l.36-2.73H13.7V8.53c0-.79.22-1.33 1.4-1.33h1.5V4.76c-.26-.04-1.15-.11-2.18-.11-2.16 0-3.64 1.32-3.64 3.74v1.88H8.33V13h2.45v7h2.92Z" />
    </svg>
  );
}

function SocialButtons({ action }: { action: "เข้าสู่ระบบ" | "สมัครสมาชิก" }) {
  const providers = ["Google", "Microsoft", "LINE", "Facebook"] as const;
  return (
    <div className="grid grid-cols-4 gap-2">
      {providers.map((provider) => (
        <button
          key={provider}
          type="button"
          title={provider}
          aria-label={`${action}ด้วย ${provider}`}
          className="flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white/80 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-white hover:shadow-sm"
        >
          <SocialLogo provider={provider} />
        </button>
      ))}
    </div>
  );
}

function LoginForm({ onClose, onRegister }: { onClose: () => void; onRegister: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    try {
      await login(String(form.get("email") || ""), String(form.get("password") || ""));
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto max-h-[92vh] w-full max-w-[390px] overflow-y-auto rounded-2xl border border-emerald-100 !bg-[#f8fbf9] p-5 !text-slate-900 shadow-[0_24px_70px_-34px_rgba(6,78,59,0.45)] sm:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
        aria-label="ปิดหน้าต่างเข้าสู่ระบบ"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative mb-5 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100">
          <img src={BRAND_LOGO_URL} alt="GreenCrop NAT" className="h-6 w-6 object-contain" />
        </div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">GreenCrop NAT IoT</p>
        <h2 className="text-3xl font-semibold leading-none tracking-tight text-slate-900">Login</h2>
        <p className="mt-2 text-[12px] font-normal text-slate-500">เข้าสู่ระบบเพื่อจัดการฟาร์มและอุปกรณ์ของคุณ</p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-slate-600">ชื่อผู้ใช้ / อีเมล</span>
          <span className="relative block">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="email"
              autoComplete="username"
              required
              placeholder="กรอกชื่อผู้ใช้ หรือ อีเมล"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white/85 pl-10 pr-4 text-[13px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-slate-600">รหัสผ่าน</span>
          <span className="relative block">
            <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white/85 pl-10 pr-11 text-[13px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-700"
              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>

        <div className="flex items-center justify-between pb-1 text-[11px]">
          <label className="flex cursor-pointer items-center gap-2 text-slate-500">
            <input type="checkbox" className="h-3.5 w-3.5 accent-emerald-600" />
            จดจำฉันในระบบ
          </label>
          <button type="button" className="font-medium text-emerald-700 hover:text-emerald-800">
            ลืมรหัสผ่าน?
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] text-slate-400">หรือเข้าสู่ระบบด้วย</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <SocialAuth showDivider={false} actionText="เข้าสู่ระบบ" tone="light" />

      <p className="mt-4 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-500">
        ยังไม่มีบัญชี?{" "}
        <button type="button" onClick={onRegister} className="font-semibold text-emerald-700 hover:text-emerald-800">
          สมัครสมาชิกใหม่
        </button>
      </p>
    </div>
  );
}

function RegisterForm({ onClose, onLogin }: { onClose: () => void; onLogin: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmPassword = String(form.get("confirmPassword") || "");
    const phone = String(form.get("phone") || "").replace(/\D/g, "");
    if (password !== confirmPassword) return;
    if (phone.length < 10) return;
    setIsSubmitting(true);
    try {
      await register(String(form.get("email") || ""), password, String(form.get("name") || ""), phone);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative mx-auto max-h-[92vh] w-full max-w-[390px] overflow-y-auto rounded-2xl border border-emerald-100 !bg-[#f8fbf9] p-5 !text-slate-900 shadow-[0_24px_70px_-34px_rgba(6,78,59,0.45)] sm:p-7">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200/80 bg-white/70 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
        aria-label="ปิดหน้าต่างสมัครสมาชิก"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative mb-5 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-emerald-200 bg-emerald-100">
          <img src={BRAND_LOGO_URL} alt="GreenCrop NAT" className="h-6 w-6 object-contain" />
        </div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-700">GreenCrop NAT IoT</p>
        <h2 className="text-3xl font-semibold leading-none tracking-tight text-slate-900">สมัครสมาชิก</h2>
        <p className="mt-2 text-[12px] text-slate-500">สร้างบัญชีเพื่อเริ่มจัดการฟาร์มอัจฉริยะ</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { name: "name", label: "ชื่อผู้ใช้งาน", type: "text", placeholder: "กรอกชื่อผู้ใช้งาน", autoComplete: "name" },
          { name: "email", label: "อีเมล", type: "email", placeholder: "name@example.com", autoComplete: "email" },
          { name: "phone", label: "เบอร์โทรศัพท์", type: "tel", placeholder: "0812345678", autoComplete: "tel" },
          { name: "password", label: "รหัสผ่าน", type: "password", placeholder: "อย่างน้อย 8 ตัวอักษร", autoComplete: "new-password" },
          { name: "confirmPassword", label: "ยืนยันรหัสผ่าน", type: "password", placeholder: "กรอกรหัสผ่านอีกครั้ง", autoComplete: "new-password" },
        ].map((field) => (
          <label key={field.label} className="block">
            <span className="mb-1.5 block text-[11px] font-medium text-slate-600">{field.label}</span>
            <input
              type={field.type}
              name={field.name}
              required
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              inputMode={field.name === "phone" ? "numeric" : undefined}
              minLength={field.name === "phone" ? 10 : undefined}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 px-4 text-[13px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
            />
          </label>
        ))}
        <button type="submit" disabled={isSubmitting} className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-60">
          {isSubmitting ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] text-slate-400">หรือสมัครสมาชิกด้วย</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>
      <SocialAuth showDivider={false} actionText="สมัครสมาชิก" tone="light" />

      <p className="mt-4 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-500">
        มีบัญชีอยู่แล้ว?{" "}
        <button type="button" onClick={onLogin} className="font-semibold text-emerald-700 hover:text-emerald-800">
          กลับไปหน้า Login
        </button>
      </p>
    </div>
  );
}

function GreenCropLanding() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
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
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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
              <button className="flex h-12 items-center gap-2 rounded-xl border border-white/25 bg-slate-950/15 px-5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/10">
                <Play className="h-4 w-4 fill-current" />
                ดูแพลตฟอร์ม
              </button>
          </div>
        </section>
      </div>

      <div
        className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5 py-6 backdrop-blur-sm transition-all duration-300 ${
          loginOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setLoginOpen(false);
        }}
        role="dialog"
        aria-modal="true"
        aria-label={authMode === "login" ? "Login" : "สมัครสมาชิก"}
      >
        <div className={`w-full transition-all duration-300 ${loginOpen ? "translate-y-0 scale-100" : "translate-y-5 scale-95"}`}>
          {authMode === "login" ? (
            <LoginForm onClose={() => setLoginOpen(false)} onRegister={() => setAuthMode("register")} />
          ) : (
            <RegisterForm onClose={() => setLoginOpen(false)} onLogin={() => setAuthMode("login")} />
          )}
        </div>
      </div>
    </main>
  );
}

function AuthGate() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-emerald-950 text-sm text-white/70">กำลังตรวจสอบเซสชัน...</div>;
  }

  return user ? <AppRouter /> : <GreenCropLanding />;
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
