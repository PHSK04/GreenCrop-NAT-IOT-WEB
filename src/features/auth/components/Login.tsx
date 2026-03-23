import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ModeToggle } from "@/components/mode-toggle";
import { useAuth } from "../contexts/AuthContext";
import appLogoGreen from "@/assets/images/3_transparent_logo_green.png";
import machineHero from "@/assets/images/machine_hero.png";

import { SocialAuth } from "./SocialAuth";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginProps {
  onSwitchToRegister: () => void;
  onLogin?: () => void;
}

export function Login({ onSwitchToRegister, onLogin }: LoginProps) {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [heroRotation, setHeroRotation] = useState({ x: 0, y: 0 });
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginFormValues) {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      onLogin?.();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  function handleHeroMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setHeroRotation({ x: (0.5 - py) * 12, y: (px - 0.5) * 16 });
  }

  function resetHeroRotation() {
    setHeroRotation({ x: 0, y: 0 });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8faf9] text-slate-900 dark:bg-[#060e0c] dark:text-slate-100">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

        * { font-family: 'Inter', sans-serif; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-10px) rotate(0.5deg); }
          66%       { transform: translateY(-5px) rotate(-0.3deg); }
        }
        @keyframes shimmer {
          from { background-position: -200% center; }
          to   { background-position: 200% center; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes bgDrift {
          0%   { transform: translateX(0)   translateY(0); }
          50%  { transform: translateX(20px) translateY(-15px); }
          100% { transform: translateX(0)   translateY(0); }
        }
        @keyframes scanLine {
          from { transform: translateY(-100%); }
          to   { transform: translateY(100vh); }
        }

        .fade-up { animation: fadeUp 0.65s cubic-bezier(0.16,1,0.3,1) both; }

        .btn-shimmer {
          background: linear-gradient(105deg,
            #059669 0%, #10b981 30%, #34d399 50%, #10b981 70%, #059669 100%
          );
          background-size: 200% auto;
          animation: shimmer 3s linear infinite;
        }
        .btn-shimmer:hover {
          animation: shimmer 1.5s linear infinite;
          filter: brightness(1.08);
        }

        .hero-float {
          animation: heroFloat 8s ease-in-out infinite;
          transform-style: preserve-3d;
        }

        .glow-orb {
          animation: pulseGlow 4s ease-in-out infinite;
        }
        .bg-drift {
          animation: bgDrift 18s ease-in-out infinite;
        }

        .input-field {
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .input-field:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16,185,129,0.15);
        }

        .social-btn {
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.18s ease, border-color 0.18s ease;
        }
        .social-btn:hover {
          transform: translateY(-2px);
        }
        .social-btn:active {
          transform: translateY(0);
        }

        @media (prefers-reduced-motion: reduce) {
          .fade-up, .btn-shimmer, .hero-float, .glow-orb, .bg-drift { animation: none !important; }
        }
      `}</style>

      {/* ── Left panel (Form) ── */}
      <div className="flex min-h-screen flex-col lg:flex-row-reverse">
        <div className="relative flex flex-1 flex-col justify-between px-6 py-8 sm:px-10 lg:max-w-[52%] lg:px-14 lg:py-10 xl:px-20">

          {/* Subtle background texture */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_0%_0%,rgba(16,185,129,0.07),transparent_55%),radial-gradient(ellipse_at_100%_100%,rgba(52,211,153,0.05),transparent_50%)]" />

          {/* Header */}
          <header className="fade-up relative z-10 flex items-center justify-between" style={{ animationDelay: "0ms" }}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-md" />
                <img src={appLogoGreen} alt="GreenCropNAT logo" className="relative h-11 w-11 object-contain" />
              </div>
              <div>
                <div className="text-[0.95rem] font-bold uppercase tracking-[0.06em] text-emerald-700 dark:text-emerald-400">
                  GreenCrop<span className="text-slate-500 dark:text-slate-400">NATIOT</span>
                </div>
                <div className="text-[0.65rem] font-medium uppercase tracking-[0.12em] text-slate-400">
                  Precision Farming
                </div>
              </div>
            </div>
            <ModeToggle />
          </header>

          {/* Main form area */}
          <main className="relative z-10 flex flex-1 flex-col justify-center py-10 lg:py-0" style={{ maxWidth: "480px" }}>
            {/* Title */}
            <div className="fade-up mb-8" style={{ animationDelay: "80ms" }}>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 dark:border-emerald-800/60 dark:bg-emerald-950/60">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">
                  Secure Access
                </span>
              </div>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                Welcome back
              </h1>
              <p className="mt-2 text-[1rem] text-slate-500 dark:text-slate-400">
                Sign in to your GreenCrop dashboard
              </p>
            </div>

            {/* Form card */}
            <div
              className="fade-up rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/60"
              style={{ animationDelay: "160ms" }}
            >
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
                  {/* Email */}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                          Email
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail
                              className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200 ${
                                focusedField === "email"
                                  ? "text-emerald-500"
                                  : "text-slate-400"
                              }`}
                            />
                                <Input
                                  placeholder="you@example.com"
                                  className="input-field h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 text-[0.925rem] text-slate-900 placeholder:text-slate-300 focus-visible:ring-0 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-600"
                                  disabled={isLoading}
                                  autoComplete="off"
                              autoCorrect="off"
                              autoCapitalize="none"
                              spellCheck={false}
                              onFocus={() => setFocusedField("email")}
                              onBlur={() => setFocusedField(null)}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Password */}
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                            Password
                          </FormLabel>
                          <button
                            type="button"
                            className="text-[0.78rem] font-semibold text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock
                              className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200 ${
                                focusedField === "password"
                                  ? "text-emerald-500"
                                  : "text-slate-400"
                              }`}
                            />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="input-field h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 pr-11 text-[0.925rem] text-slate-900 placeholder:text-slate-300 focus-visible:ring-0 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:placeholder:text-slate-600"
                                  disabled={isLoading}
                                  autoComplete="off"
                              autoCorrect="off"
                              autoCapitalize="none"
                              spellCheck={false}
                              onFocus={() => setFocusedField("password")}
                              onBlur={() => setFocusedField(null)}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((p) => !p)}
                              disabled={isLoading}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-emerald-500"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="btn-shimmer mt-2 h-12 w-full rounded-xl text-[1rem] font-bold text-white shadow-[0_8px_24px_rgba(16,185,129,0.35)] transition-all hover:shadow-[0_12px_32px_rgba(16,185,129,0.45)] disabled:opacity-70"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </div>

            {/* Social Auth */}
            <div
              className="fade-up mt-4 rounded-2xl border border-slate-200/80 bg-white/60 p-5 shadow-[0_4px_16px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/40"
              style={{ animationDelay: "240ms" }}
            >
              <SocialAuth onLoginSuccess={onLogin} actionText="sign in" />

              <div className="mt-4 text-center text-[0.85rem] text-slate-500 dark:text-slate-400">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="font-semibold text-emerald-600 underline decoration-emerald-400/50 underline-offset-4 transition-colors hover:text-emerald-500 dark:text-emerald-400"
                >
                  Create Account
                </button>
              </div>
            </div>

            {/* Security badge */}
            <div className="fade-up mt-5 flex items-center justify-center gap-2" style={{ animationDelay: "300ms" }}>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Secured by edge-grade quantum-256 encryption
              </span>
            </div>
          </main>

          {/* Footer */}
          <footer className="fade-up relative z-10 flex items-center justify-between" style={{ animationDelay: "350ms" }}>
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
              www.greencropnatiot.com
            </span>
            <span className="text-[0.65rem] text-slate-300 dark:text-slate-600">© 2025 GreenCrop</span>
          </footer>
        </div>

        {/* ── Right panel (Hero) ── */}
        <div className="relative hidden flex-1 overflow-hidden lg:flex lg:items-center lg:justify-center">
          {/* Deep emerald gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#022c22] via-[#064e3b] to-[#065f46]" />

          {/* Animated background orbs */}
          <div className="bg-drift absolute -left-20 -top-20 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="bg-drift absolute -bottom-20 -right-16 h-96 w-96 rounded-full bg-teal-300/10 blur-3xl" style={{ animationDelay: "-9s" }} />
          <div className="glow-orb absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/8 blur-2xl" />

          {/* Mesh grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(110,231,183,1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(110,231,183,1) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />

          {/* Corner accents */}
          <div className="absolute left-6 top-6 h-10 w-10 rounded-tl-xl border-l-2 border-t-2 border-emerald-400/40" />
          <div className="absolute bottom-6 right-6 h-10 w-10 rounded-br-xl border-b-2 border-r-2 border-emerald-400/40" />

          {/* Machine hero */}
          <div
            className="relative z-10 flex flex-col items-center px-10"
            onMouseMove={handleHeroMove}
            onMouseLeave={resetHeroRotation}
            style={{ perspective: "1400px" }}
          >
            {/* Top label */}
            <div className="fade-up mb-6 text-center" style={{ animationDelay: "200ms" }}>
              <div className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-emerald-400/70">
                GreenCrop NAT Series
              </div>
              <div className="mt-1 text-2xl font-extrabold uppercase tracking-tight text-white">
                The Smarter Greener
              </div>
              <div className="text-2xl font-extrabold uppercase tracking-tight text-emerald-400">
                Farm Intelligence Mesh
              </div>
            </div>

            {/* Machine image with 3D tilt */}
            <div
              className="hero-float transition-transform duration-200 ease-out"
              style={{
                transform: `rotateX(${heroRotation.x}deg) rotateY(${heroRotation.y}deg)`,
                transformStyle: "preserve-3d",
              }}
            >
              {/* Glow beneath machine */}
              <div className="mx-auto mb-[-20px] h-10 w-48 rounded-full bg-emerald-400/25 blur-xl" />
              <img
                src={machineHero}
                alt="GreenCropNAT farm unit"
                className="relative z-10 h-auto max-h-[480px] w-auto max-w-[360px] object-contain drop-shadow-2xl xl:max-h-[580px] xl:max-w-[440px]"
                draggable={false}
              />
            </div>

            {/* Bottom stats strip */}
            <div className="fade-up mt-8 flex items-center gap-6" style={{ animationDelay: "280ms" }}>
              {[
                { label: "Uptime", value: "99.9%" },
                { label: "Sensors", value: "24/7" },
                { label: "AI-Powered", value: "✓" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-lg font-extrabold text-white">{stat.value}</div>
                  <div className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-emerald-400/70">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
