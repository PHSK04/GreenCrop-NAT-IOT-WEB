import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  Lock,
  Mail,
  MonitorCog,
  ShieldCheck,
  Sprout,
} from "lucide-react";

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
import loginBg from "@/assets/images/login_bg.png";

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

const platformHighlights = [
  "Centralized sensor and device monitoring",
  "Role-based access for farm operators and admins",
  "Operational dashboards built for real-time decisions",
];

const trustMetrics = [
  { value: "24/7", label: "System visibility" },
  { value: "Live", label: "Device telemetry" },
  { value: "Secure", label: "Access control" },
];

export function Login({ onSwitchToRegister, onLogin }: LoginProps) {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef5ef] text-slate-900 dark:bg-[#07110d] dark:text-slate-100">
      <style>{`
        @keyframes authFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes authFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .auth-fade-up {
          animation: authFadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .auth-float {
          animation: authFloat 7s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .auth-fade-up, .auth-float {
            animation: none !important;
          }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.14),transparent_28%)]" />
      <div className="absolute inset-y-0 left-0 hidden w-[46%] bg-[linear-gradient(180deg,rgba(6,78,59,0.98),rgba(3,47,36,0.98))] lg:block" />

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        <section className="relative hidden lg:flex lg:w-[46%] lg:flex-col lg:justify-between lg:overflow-hidden lg:px-10 lg:py-10 xl:px-14">
          <div
            className="absolute inset-0 opacity-20"
            style={{ backgroundImage: `url(${loginBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,44,34,0.2),rgba(16,185,129,0.08))]" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)", backgroundSize: "34px 34px" }} />

          <div className="auth-fade-up relative z-10 flex items-center justify-between" style={{ animationDelay: "40ms" }}>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/12 p-2.5 ring-1 ring-white/20 backdrop-blur-sm">
                <img src={appLogoGreen} alt="GreenCropNAT logo" className="h-10 w-10 object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100/90">
                  GreenCrop NATIOT
                </p>
                <p className="text-sm text-emerald-50/70">Farm Operations Control Center</p>
              </div>
            </div>
            <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-medium text-emerald-50/85 backdrop-blur-sm">
              Production access
            </div>
          </div>

          <div className="relative z-10 flex flex-1 items-center">
            <div className="w-full max-w-xl">
              <div className="auth-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50/85 backdrop-blur-sm" style={{ animationDelay: "120ms" }}>
                <Sprout className="h-4 w-4" />
                Smart farming platform
              </div>

              <h1 className="auth-fade-up mt-6 max-w-lg text-5xl font-semibold leading-[1.05] tracking-tight text-white xl:text-6xl" style={{ animationDelay: "180ms" }}>
                Run your farm systems from one clean control surface.
              </h1>

              <p className="auth-fade-up mt-6 max-w-xl text-base leading-7 text-emerald-50/72 xl:text-lg" style={{ animationDelay: "240ms" }}>
                Monitor equipment, review operations, and keep your team aligned with a calmer and more reliable admin experience.
              </p>

              <div className="auth-fade-up mt-10 grid gap-3" style={{ animationDelay: "300ms" }}>
                {platformHighlights.map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/8 px-4 py-4 backdrop-blur-sm"
                  >
                    <div className="mt-0.5 rounded-full bg-emerald-300/18 p-1.5 text-emerald-100">
                      <Leaf className="h-4 w-4" />
                    </div>
                    <p className="text-sm leading-6 text-emerald-50/88">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="auth-fade-up relative z-10 grid grid-cols-3 gap-3" style={{ animationDelay: "360ms" }}>
            {trustMetrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-3xl border border-white/12 bg-white/10 px-4 py-5 backdrop-blur-sm"
              >
                <div className="text-2xl font-semibold text-white">{metric.value}</div>
                <div className="mt-1 text-sm text-emerald-50/65">{metric.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative flex flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
          <div className="absolute right-5 top-5 sm:right-8 sm:top-8">
            <ModeToggle />
          </div>

          <div className="w-full max-w-[560px]">
            <div className="auth-fade-up rounded-[2rem] border border-white/70 bg-white/88 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-[#08130f]/82 dark:shadow-[0_28px_90px_rgba(0,0,0,0.45)] sm:p-8" style={{ animationDelay: "60ms" }}>
              <div className="mb-8 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Secure sign in
                  </div>
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                    Welcome back
                  </h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-[15px]">
                    Sign in to manage devices, crop operations, and your GreenCrop dashboard.
                  </p>
                </div>

                <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 sm:block">
                  <MonitorCog className="h-5 w-5" />
                </div>
              </div>

              <div className="mb-6 rounded-3xl border border-emerald-100 bg-[linear-gradient(135deg,#f6fff9,#eefaf5)] p-4 dark:border-emerald-500/10 dark:bg-[linear-gradient(135deg,rgba(5,28,21,0.95),rgba(7,37,28,0.82))]">
                <div className="flex items-center gap-4">
                  <div className="auth-float hidden rounded-2xl bg-white/80 p-3 shadow-[0_16px_40px_rgba(16,185,129,0.14)] dark:bg-emerald-500/10 sm:block">
                    <img src={machineHero} alt="GreenCrop device" className="h-16 w-16 object-contain" draggable={false} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                      Operations ready
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      Access your production environment, review machine status, and continue from the latest session state.
                    </p>
                  </div>
                </div>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          Email
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail
                              className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
                                focusedField === "email" ? "text-emerald-600" : "text-slate-400"
                              }`}
                            />
                            <Input
                              placeholder="you@example.com"
                              className="h-14 rounded-2xl border-slate-200 bg-slate-50 pl-11 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
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

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                          <FormLabel className="text-[13px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            Password
                          </FormLabel>
                          <button
                            type="button"
                            className="text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-600 dark:text-emerald-300"
                          >
                            Forgot password?
                          </button>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock
                              className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors ${
                                focusedField === "password" ? "text-emerald-600" : "text-slate-400"
                              }`}
                            />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-14 rounded-2xl border-slate-200 bg-slate-50 pl-11 pr-12 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
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
                              onClick={() => setShowPassword((prev) => !prev)}
                              disabled={isLoading}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-emerald-600"
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

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="mt-2 h-14 w-full rounded-2xl bg-[linear-gradient(135deg,#047857,#10b981)] text-[15px] font-semibold text-white shadow-[0_16px_36px_rgba(16,185,129,0.28)] transition-all hover:translate-y-[-1px] hover:shadow-[0_20px_42px_rgba(16,185,129,0.34)]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-7 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/5">
                <SocialAuth onLoginSuccess={onLogin} actionText="sign in" />

                <div className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={onSwitchToRegister}
                    className="font-semibold text-emerald-700 underline decoration-emerald-400/60 underline-offset-4 transition-colors hover:text-emerald-600 dark:text-emerald-300"
                  >
                    Create Account
                  </button>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white/65 px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  Protected access for GreenCrop platform users
                </div>
                <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                  Support: admin@greencropnatiot.com
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
