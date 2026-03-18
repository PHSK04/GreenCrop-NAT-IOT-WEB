import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";

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

const brandWordmarkStyle = {
  fontFamily: '"Montserrat", "Inter", sans-serif',
  fontWeight: 650,
  letterSpacing: "0.025em",
} as const;

export function Login({ onSwitchToRegister, onLogin }: LoginProps) {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      if (onLogin) onLogin();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[#f1f0ee] text-slate-900 transition-colors duration-500 dark:bg-[#04111d] dark:text-slate-100">
      <style>{`
        @keyframes gcSweep {
          0% { transform: translateX(-130%); opacity: 0; }
          38% { opacity: .95; }
          100% { transform: translateX(190%); opacity: 0; }
        }
        @keyframes gcPulse {
          0%, 100% { transform: scale(1); opacity: .5; }
          50% { transform: scale(1.1); opacity: .9; }
        }
        @keyframes gcFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-9px); }
        }
        @keyframes gcOrbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gcFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gcSparkA {
          0%,100% { transform: translateY(0) scale(1); opacity: .45; }
          50% { transform: translateY(-8px) scale(1.08); opacity: .95; }
        }
        @keyframes gcSparkB {
          0%,100% { transform: translateY(0) scale(1); opacity: .38; }
          50% { transform: translateY(10px) scale(.92); opacity: .8; }
        }
        @keyframes gcLinkPulse {
          0%, 100% { transform: scale(1); opacity: .45; }
          50% { transform: scale(1.25); opacity: .95; }
        }
        @keyframes gcLinkFlow {
          0% { transform: translateY(-120%); opacity: 0; }
          30% { opacity: .9; }
          100% { transform: translateY(210%); opacity: 0; }
        }
        @keyframes gcLightSheen {
          0% { transform: translateX(-130%); opacity: 0; }
          20% { opacity: .8; }
          100% { transform: translateX(220%); opacity: 0; }
        }
        @keyframes gcLightBreathe {
          0%, 100% { opacity: .45; transform: scale(1); }
          50% { opacity: .9; transform: scale(1.04); }
        }
        @keyframes gcDrift {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(18px, -12px, 0) rotate(6deg); }
        }
        @keyframes gcBloom {
          0%, 100% { transform: scale(0.96); opacity: .45; }
          50% { transform: scale(1.05); opacity: .85; }
        }
        @keyframes gcSpinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gcWave {
          0% { transform: translateX(-6%) skewX(-4deg); opacity: .25; }
          50% { transform: translateX(4%) skewX(2deg); opacity: .55; }
          100% { transform: translateX(-6%) skewX(-4deg); opacity: .25; }
        }
        @keyframes gcCardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes gcBgShift {
          0% { transform: translate3d(-2%, -1%, 0); }
          50% { transform: translate3d(2%, 1%, 0); }
          100% { transform: translate3d(-2%, -1%, 0); }
        }
        @keyframes gcGridDrift {
          0% { background-position: 0 0, 0 0; }
          50% { background-position: 40px 20px, 20px 40px; }
          100% { background-position: 0 0, 0 0; }
        }
        @keyframes gcOrbFloat {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: .55; }
          50% { transform: translate3d(14px, -10px, 0); opacity: .85; }
        }
        @keyframes gcAurora {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gc-sweep { animation: gcSweep 4.6s ease-in-out infinite; }
        .gc-pulse { animation: gcPulse 3s ease-in-out infinite; }
        .gc-float { animation: gcFloat 6.2s ease-in-out infinite; }
        .gc-orbit { animation: gcOrbit 22s linear infinite; }
        .gc-fade-up { animation: gcFadeUp .7s cubic-bezier(.2,.8,.2,1) both; }
        .gc-spark-a { animation: gcSparkA 5.3s ease-in-out infinite; }
        .gc-spark-b { animation: gcSparkB 6.1s ease-in-out infinite; }
        .gc-link-pulse { animation: gcLinkPulse 2.7s ease-in-out infinite; }
        .gc-link-flow { animation: gcLinkFlow 4.8s ease-in-out infinite; }
        .gc-light-sheen { animation: gcLightSheen 6.8s ease-in-out 1s infinite; }
        .gc-light-breathe { animation: gcLightBreathe 5.4s ease-in-out infinite; }
        .gc-drift { animation: gcDrift 12s ease-in-out infinite; }
        .gc-bloom { animation: gcBloom 8s ease-in-out infinite; }
        .gc-spin-slow { animation: gcSpinSlow 26s linear infinite; }
        .gc-wave { animation: gcWave 10s ease-in-out infinite; }
        .gc-card-float { animation: gcCardFloat 10s ease-in-out infinite; }
        .gc-bg-shift { animation: gcBgShift 18s ease-in-out infinite; }
        .gc-grid-drift { animation: gcGridDrift 24s ease-in-out infinite; }
        .gc-orb { animation: gcOrbFloat 12s ease-in-out infinite; }
        .gc-aurora { animation: gcAurora 22s ease-in-out infinite; background-size: 220% 220%; }
        @media (prefers-reduced-motion: reduce) {
          .gc-sweep, .gc-pulse, .gc-float, .gc-orbit, .gc-fade-up, .gc-spark-a, .gc-spark-b, .gc-link-pulse, .gc-link-flow, .gc-light-sheen, .gc-light-breathe, .gc-drift, .gc-bloom, .gc-spin-slow, .gc-wave, .gc-card-float, .gc-bg-shift, .gc-grid-drift, .gc-orb, .gc-aurora { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute -left-24 top-8 h-72 w-72 rounded-full bg-emerald-300/28 blur-3xl dark:bg-emerald-500/18 gc-orb" />
      <div className="pointer-events-none absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-purple-200/45 blur-3xl dark:bg-cyan-500/16 gc-orb" style={{ animationDelay: "1.5s" }} />
      <div className="pointer-events-none absolute inset-0 gc-aurora opacity-50 mix-blend-soft-light dark:opacity-35" style={{ backgroundImage: "linear-gradient(120deg, rgba(16,185,129,0.16), rgba(59,130,246,0.12), rgba(236,72,153,0.12), rgba(16,185,129,0.16))" }} />
      <div className="pointer-events-none absolute inset-0 dark:hidden bg-[radial-gradient(circle_at_18%_18%,rgba(214,201,187,0.55),transparent_38%),radial-gradient(circle_at_84%_12%,rgba(199,210,254,0.36),transparent_32%),radial-gradient(circle_at_78%_88%,rgba(16,185,129,0.1),transparent_34%)] gc-bg-shift" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:34px_34px] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)] gc-grid-drift" />
      <div className="pointer-events-none absolute left-[8%] top-[22%] h-4 w-4 rounded-full bg-emerald-300/80 shadow-[0_0_24px_rgba(16,185,129,0.35)] gc-orb" style={{ animationDelay: "2.2s" }} />
      <div className="pointer-events-none absolute left-[56%] top-[38%] h-3 w-3 rounded-full bg-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] gc-orb" style={{ animationDelay: "3.4s" }} />
      <div className="pointer-events-none absolute left-[84%] top-[28%] h-2.5 w-2.5 rounded-full bg-emerald-300/80 shadow-[0_0_16px_rgba(16,185,129,0.28)] gc-orb" style={{ animationDelay: "1.1s" }} />
      <div className="pointer-events-none absolute left-[47%] top-0 hidden h-full w-px xl:block">
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-300/55 to-transparent dark:via-emerald-400/35" />
        <span className="gc-link-flow absolute left-1/2 top-0 h-24 w-2 -translate-x-1/2 rounded-full bg-gradient-to-b from-transparent via-emerald-400/90 to-transparent blur-[1px]" />
        <span className="gc-link-pulse absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.75)]" />
      </div>

      <aside className="relative hidden w-[47%] items-center justify-center overflow-hidden border-r border-slate-200/70 bg-transparent xl:flex dark:border-slate-800/70">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.55),transparent_36%),radial-gradient(circle_at_88%_24%,rgba(232,221,207,0.65),transparent_40%),radial-gradient(circle_at_75%_82%,rgba(165,208,195,0.28),transparent_35%)] dark:bg-[radial-gradient(circle_at_20%_18%,rgba(15,23,42,0.6),transparent_36%),radial-gradient(circle_at_88%_24%,rgba(30,41,59,0.7),transparent_40%),radial-gradient(circle_at_75%_82%,rgba(16,185,129,0.12),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-70 dark:opacity-40">
          <div className="gc-wave absolute left-[-10%] top-[12%] h-52 w-[120%] rounded-[40%] bg-gradient-to-r from-transparent via-white/70 to-transparent blur-2xl dark:via-slate-700/70" />
          <div className="gc-wave absolute bottom-[8%] left-[-12%] h-44 w-[130%] rounded-[40%] bg-gradient-to-r from-transparent via-emerald-200/65 to-transparent blur-2xl dark:via-emerald-500/30" />
        </div>

        <div className="relative z-10 flex h-full w-full flex-col justify-between px-12 py-12">
          <div className="gc-fade-up flex items-center gap-3" style={{ animationDelay: "60ms" }}>
            <img src={appLogoGreen} alt="GreenCropNAT logo" className="h-9 w-9 object-contain" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-700/80 dark:text-emerald-300/80">
                GreenCropNAT
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Precision command portal</div>
            </div>
          </div>

          <div className="grid w-full items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="gc-fade-up" style={{ animationDelay: "160ms" }}>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-white/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 backdrop-blur dark:border-emerald-400/30 dark:bg-slate-900/50 dark:text-emerald-200">
                Bio-Precision
              </div>
              <h2 className="text-[2.6rem] font-semibold leading-[1.05] text-slate-900 dark:text-slate-100">
                The Smarter,
                <br />
                Greener Farm
                <br />
                Intelligence Mesh
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-300">
                Monitor, automate, and optimize every node. GreenCropNAT keeps your farm command surface calm,
                responsive, and deeply connected.
              </p>
              <div className="mt-6 h-px w-32 bg-gradient-to-r from-emerald-500/70 via-teal-400/60 to-transparent" />
            </div>

            <div className="relative h-[360px] w-full gc-fade-up" style={{ animationDelay: "220ms" }}>
              <div className="gc-bloom absolute inset-6 rounded-[44px] bg-gradient-to-br from-white/80 via-emerald-100/60 to-purple-200/50 blur-2xl dark:from-slate-800/70 dark:via-slate-900/70 dark:to-emerald-900/30" />
              <div className="gc-spin-slow absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-[40%] bg-[conic-gradient(from_160deg,rgba(16,185,129,0.14),rgba(168,85,247,0.18),rgba(14,165,233,0.16),rgba(16,185,129,0.14))] blur-2xl" />
              <div className="gc-drift absolute left-[8%] top-[12%] h-24 w-24 rounded-[30%] bg-gradient-to-br from-emerald-200/70 to-white/40 blur-xl dark:from-emerald-500/25 dark:to-slate-700/40" />
              <div className="gc-drift absolute right-[12%] bottom-[18%] h-28 w-28 rounded-[32%] bg-gradient-to-br from-purple-200/60 to-white/50 blur-xl dark:from-purple-500/20 dark:to-slate-700/40" />
              <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-[34%] border border-white/70 bg-white/50 shadow-[0_30px_80px_rgba(99,102,241,0.18)] backdrop-blur-xl dark:border-slate-600/40 dark:bg-slate-900/40" />
              <div className="absolute left-1/2 top-1/2 h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-[28%] bg-gradient-to-br from-emerald-400/35 via-white/70 to-purple-300/35 blur-md" />
              <div className="gc-float absolute left-1/2 top-1/2 h-[110px] w-[110px] -translate-x-1/2 -translate-y-1/2 rounded-[26%] bg-gradient-to-br from-emerald-200/80 via-white/70 to-cyan-200/60 shadow-[0_20px_60px_rgba(16,185,129,0.25)]" />
            </div>
          </div>

          <div className="gc-fade-up flex items-center gap-4 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400" style={{ animationDelay: "300ms" }}>
            Connected sensors
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            Adaptive climate
            <span className="h-1 w-1 rounded-full bg-teal-400" />
            AI forecast
          </div>
        </div>
      </aside>

      <main className="relative flex w-full flex-1 items-center justify-center p-4 sm:p-8 xl:w-[53%]">
        <div className="absolute right-4 top-4 z-20 flex items-center gap-3 sm:right-6 sm:top-6">
          <div className="rounded-full border border-emerald-500/30 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 backdrop-blur-sm dark:border-emerald-400/40 dark:bg-slate-900/70 dark:text-emerald-300">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 gc-pulse" />
            NODE SECURE
          </div>
          <ModeToggle />
        </div>

        <section
          className={`gc-card-float relative w-full max-w-[620px] overflow-hidden rounded-[34px] border border-slate-200/85 bg-white/92 p-6 shadow-[0_26px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-all duration-700 dark:border-slate-800/80 dark:bg-slate-900/76 dark:shadow-[0_22px_62px_rgba(2,8,18,0.72)] sm:p-8 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <span className="pointer-events-none absolute inset-0 rounded-[34px] border border-emerald-200/70 dark:hidden" />
          <span className="gc-light-sheen pointer-events-none absolute -top-8 left-0 h-14 w-1/3 rounded-full bg-gradient-to-r from-transparent via-emerald-200/75 to-transparent blur-sm dark:hidden" />
          <span className="gc-sweep pointer-events-none absolute -top-9 left-0 h-14 w-1/3 rounded-full bg-gradient-to-r from-transparent via-emerald-300/65 to-transparent blur-sm dark:via-emerald-400/45" />
          <div className="gc-fade-up mb-4 inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-50/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300" style={{ animationDelay: "120ms" }}>
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 gc-pulse" />
            PORTAL ACCESS
          </div>

          <div className="gc-fade-up mb-8 text-center" style={{ animationDelay: "200ms" }}>
            <img
              src={appLogoGreen}
              alt="GreenCropNAT logo"
              className="gc-float mx-auto mb-4 w-[320px] max-w-full object-contain brightness-110 contrast-125 saturate-125 drop-shadow-[0_12px_24px_rgba(16,185,129,0.30)] sm:w-[360px]"
              draggable={false}
            />
            <h2
              className="px-2 text-[2.05rem] leading-tight text-slate-900 dark:text-slate-100 sm:text-[2.5rem]"
              style={brandWordmarkStyle}
            >
              GreenCropNAT
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-700 dark:text-slate-300">
              Sign in to open your secure farm command surface.
            </p>
            <p className="mt-1.5 text-sm font-medium text-emerald-700/85 dark:text-emerald-300/85">
              Precision command portal
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="gc-fade-up space-y-5" style={{ animationDelay: "320ms" }} autoComplete="off">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="ml-0.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Email
                    </FormLabel>
                    <FormControl>
                      <div className="group relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                        <Input
                          placeholder="Username"
                          className="h-12 rounded-2xl border-slate-200/80 bg-slate-100/65 pl-12 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700/80 dark:bg-slate-950/65 dark:text-slate-100 dark:placeholder:text-slate-500"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <div className="ml-0.5 flex items-center justify-between">
                      <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Password
                      </FormLabel>
                      <button
                        type="button"
                        className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
                      >
                        Reset
                      </button>
                    </div>
                    <FormControl>
                      <div className="group relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-12 rounded-2xl border-slate-200/80 bg-slate-100/65 pl-12 pr-12 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700/80 dark:bg-slate-950/65 dark:text-slate-100 dark:placeholder:text-slate-500"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-emerald-500"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="group relative h-12 w-full overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 font-bold text-white shadow-[0_0_26px_rgba(16,185,129,0.35)] transition-all hover:brightness-105"
              >
                <span className="gc-sweep pointer-events-none absolute inset-y-0 left-[-45%] w-[40%] bg-gradient-to-r from-transparent via-white/55 to-transparent" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ShieldCheck className="h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110" />
                    </>
                  )}
                </span>
              </Button>
            </form>
          </Form>

          <div className="gc-fade-up mt-7 space-y-4" style={{ animationDelay: "420ms" }}>
            <SocialAuth onLoginSuccess={onLogin} actionText="sign in" />

            <div className="pt-1 text-center text-sm text-slate-600 dark:text-slate-400">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-semibold text-emerald-600 underline decoration-emerald-400/70 underline-offset-4 transition-colors hover:text-emerald-500 dark:text-emerald-400"
              >
                Create Account
              </button>
            </div>
          </div>

          <div className="gc-fade-up mt-7 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400" style={{ animationDelay: "520ms" }}>
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Secured by edge-grade quantum-256 encryption
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </section>
      </main>
    </div>
  );
}
