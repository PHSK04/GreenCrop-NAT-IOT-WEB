import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Cpu,
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  Lock,
  Mail,
  Radio,
  ShieldCheck,
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

const platformSignals = [
  {
    icon: Radio,
    label: "Sensor Network",
    value: "Always Connected",
    detail: "Realtime device telemetry and environmental monitoring",
  },
  {
    icon: Cpu,
    label: "Operations Core",
    value: "Centralized Control",
    detail: "Manage irrigation, tanks, crops, and machine status in one place",
  },
  {
    icon: ShieldCheck,
    label: "Security Layer",
    value: "Protected Access",
    detail: "Verified sign-in for operators, admins, and farm stakeholders",
  },
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-900">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes logoReveal {
          0% { opacity: 0; transform: translateY(18px) scale(0.86); filter: blur(10px); }
          58% { opacity: 1; transform: translateY(-4px) scale(1.04); filter: blur(0); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }

        @keyframes logoGlow {
          0%, 100% { box-shadow: 0 24px 70px rgba(16,185,129,0.20), 0 0 0 rgba(52,211,153,0); }
          50% { box-shadow: 0 28px 90px rgba(16,185,129,0.34), 0 0 42px rgba(52,211,153,0.28); }
        }

        @keyframes logoSweep {
          0% { transform: translateX(-160%) rotate(16deg); opacity: 0; }
          26% { opacity: 0.85; }
          62% { opacity: 0.35; }
          100% { transform: translateX(170%) rotate(16deg); opacity: 0; }
        }

        @keyframes logoFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }

        .fade-up {
          animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .brand-logo-stage {
          animation: logoReveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) both, logoGlow 4.2s ease-in-out 0.9s infinite;
        }

        .brand-logo-mark {
          animation: logoFloat 5.6s ease-in-out 1s infinite;
        }

        .brand-logo-stage::after {
          content: "";
          position: absolute;
          inset: -24%;
          width: 44%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.72), transparent);
          animation: logoSweep 1.35s ease-out 0.45s both;
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .fade-up,
          .brand-logo-stage,
          .brand-logo-mark,
          .brand-logo-stage::after {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(15,23,42,0.86)_46%,rgba(241,245,249,0.88)_46%,rgba(248,250,252,0.96)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,185,129,0.12),transparent_32%,rgba(37,99,235,0.12))]" />

      <div className="relative z-10 min-h-screen px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1280px] overflow-hidden rounded-[28px] border border-white/18 bg-white/10 shadow-[0_30px_90px_rgba(2,6,23,0.34)] backdrop-blur-md lg:min-h-[calc(100vh-3rem)]">
          <section className="relative hidden w-[56%] overflow-hidden lg:flex">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(2,6,23,0.90)_0%,rgba(15,23,42,0.70)_62%,rgba(15,118,110,0.18)_100%)]" />
            <div className="relative z-10 flex w-full flex-col justify-between p-8 xl:p-10">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-white/14 bg-white/10 py-2 pl-2 pr-5 backdrop-blur">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/95 shadow-sm">
                    <img src={appLogoGreen} alt="GreenCrop NATIOT logo" className="h-9 w-9 object-contain" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/90">
                      GreenCrop NATIOT
                    </div>
                    <div className="text-sm text-slate-300">Smart Farm Control Platform</div>
                  </div>
                </div>

                <div className="rounded-full border border-emerald-300/24 bg-emerald-400/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  Secure Access
                </div>
              </div>

              <div className="fade-up flex max-w-2xl flex-col items-start pb-6">
                <div className="brand-logo-stage relative mb-8 grid h-40 w-40 place-items-center overflow-hidden rounded-[32px] border border-emerald-300/20 bg-white/92 xl:h-48 xl:w-48">
                  <img
                    src={appLogoGreen}
                    alt="GreenCrop NATIOT logo"
                    className="brand-logo-mark h-32 w-32 object-contain xl:h-40 xl:w-40"
                  />
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                  <Leaf className="h-3.5 w-3.5 text-emerald-300" />
                  Professional IoT Operations
                </div>
                <h1 className="mt-6 max-w-xl font-['Montserrat'] text-5xl font-semibold leading-[1.04] text-white xl:text-6xl">
                  Command your farm from one secure console.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
                  Monitor crops, tanks, devices, and machine performance through a focused control room built
                  for daily operation, not decoration.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {platformSignals.map(({ icon: Icon, label, value, detail }, index) => (
                  <div
                    key={label}
                    className="fade-up rounded-2xl border border-white/12 bg-white/10 p-5 backdrop-blur-sm"
                    style={{ animationDelay: `${160 + index * 110}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="rounded-2xl bg-emerald-400/12 p-3">
                        <Icon className="h-5 w-5 text-emerald-200" />
                      </div>
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.55)]" />
                    </div>
                    <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {label}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">{value}</div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="relative flex w-full flex-1 items-center justify-center bg-slate-50/96 px-4 py-8 sm:px-6 lg:w-[44%] lg:px-10 xl:px-12">
            <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
              <ModeToggle />
            </div>

            <div className="fade-up relative z-10 w-full max-w-[460px]">
              <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_22px_60px_rgba(15,23,42,0.12)] sm:p-8">
                <div className="lg:hidden">
                  <div className="inline-flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 py-2 pl-2 pr-4">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-white shadow-sm">
                      <img src={appLogoGreen} alt="GreenCrop NATIOT logo" className="h-8 w-8 object-contain" />
                    </div>
                    <div className="text-left">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700">
                        GreenCrop NATIOT
                      </div>
                      <div className="text-xs text-slate-500">Smart Farm Control Platform</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 sm:mt-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Operator Login
                  </div>
                  <h2 className="mt-5 font-['Montserrat'] text-3xl font-semibold tracking-[-0.04em] text-slate-900 sm:text-[2.55rem]">
                    Sign in
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-[15px]">
                    Use your GreenCrop account to enter the operational dashboard and manage your IoT farm
                    environment securely.
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4" autoComplete="off">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Email
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail
                                className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                                  focusedField === "email" ? "text-emerald-700" : "text-slate-400"
                                }`}
                              />
                              <Input
                                placeholder="you@example.com"
                                className="h-14 rounded-[1.15rem] border-slate-200 bg-slate-50/80 pl-11 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-emerald-100"
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
                            <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                              Password
                            </FormLabel>
                            <button
                              type="button"
                              className="text-sm font-medium text-slate-500 transition-colors hover:text-emerald-800"
                            >
                              Forgot password?
                            </button>
                          </div>
                          <FormControl>
                            <div className="relative">
                              <Lock
                                className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                                  focusedField === "password" ? "text-emerald-700" : "text-slate-400"
                                }`}
                              />
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••"
                                className="h-14 rounded-[1.15rem] border-slate-200 bg-slate-50/80 pl-11 pr-12 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-emerald-100"
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
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-emerald-700"
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
                      className="mt-2 h-14 w-full rounded-[1.2rem] bg-[linear-gradient(180deg,#1e4535,#173527)] text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(23,53,39,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,#255240,#1b3d2e)]"
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

                <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50/85 p-5">
                  <SocialAuth onLoginSuccess={onLogin} actionText="sign in" />

                  <div className="mt-5 text-center text-sm text-slate-500">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={onSwitchToRegister}
                      className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-4 transition-colors hover:text-emerald-900"
                    >
                      Create Account
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2 font-medium text-slate-700">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      Protected access
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500">
                      Trusted entry point for operators and administrators.
                    </p>
                  </div>

                  <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm text-slate-600">
                    <div className="font-medium text-slate-700">Support Contact</div>
                    <p className="mt-2 text-xs leading-6 text-slate-500">admin@greencropnatiot.com</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
