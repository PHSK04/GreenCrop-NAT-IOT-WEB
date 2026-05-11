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
    <div className="relative min-h-screen overflow-hidden bg-[#f4f7f1] text-slate-900">
      <style>{`
        @keyframes softFloat {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -14px, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .soft-float {
          animation: softFloat 14s ease-in-out infinite;
        }

        .fade-up {
          animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @media (prefers-reduced-motion: reduce) {
          .soft-float,
          .fade-up {
            animation: none !important;
          }
        }
      `}</style>

      <div className="absolute inset-0 bg-[linear-gradient(180deg,#fbfcf8_0%,#f0f5ee_58%,#edf2ea_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(167,243,208,0.22),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(187,247,208,0.16),transparent_28%)]" />
      <div
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,23,42,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.9) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="soft-float absolute left-[-8%] top-[10%] h-72 w-72 rounded-full bg-emerald-200/20 blur-3xl" />
      <div className="soft-float absolute bottom-[-8%] right-[-6%] h-80 w-80 rounded-full bg-lime-100/30 blur-3xl [animation-delay:-7s]" />

      <div className="relative z-10 min-h-screen px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1240px] overflow-hidden rounded-[2rem] border border-white/70 bg-white/82 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl lg:min-h-[calc(100vh-4rem)]">
          <section className="relative hidden w-[54%] overflow-hidden border-r border-slate-200/70 lg:flex">
            <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(15,23,42,0.96)_0%,rgba(20,43,35,0.94)_52%,rgba(33,77,57,0.88)_100%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(110,231,183,0.18),transparent_20%),radial-gradient(circle_at_80%_24%,rgba(255,255,255,0.08),transparent_20%),radial-gradient(circle_at_70%_78%,rgba(134,239,172,0.16),transparent_22%)]" />
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
                backgroundSize: "52px 52px",
              }}
            />

            <div className="relative z-10 flex w-full flex-col justify-between p-8 xl:p-10">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/6 px-4 py-2 backdrop-blur">
                  <div className="rounded-full bg-white/10 p-2">
                    <img src={appLogoGreen} alt="GreenCrop NATIOT logo" className="h-8 w-8 object-contain" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/90">
                      GreenCrop NATIOT
                    </div>
                    <div className="text-sm text-slate-300">Smart Farm Control Platform</div>
                  </div>
                </div>

                <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">
                  Secure Access
                </div>
              </div>

              <div className="fade-up max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-200">
                  <Leaf className="h-3.5 w-3.5 text-emerald-300" />
                  Professional IoT Operations
                </div>
                <h1 className="mt-6 max-w-xl font-['Montserrat'] text-5xl font-semibold leading-[1.05] tracking-[-0.05em] text-white xl:text-6xl">
                  Formal access to your modern farm command center.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-slate-300">
                  Monitor crop systems, tank levels, machine performance, and live telemetry through a clean
                  and secure interface built for day-to-day operations.
                </p>
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                {platformSignals.map(({ icon: Icon, label, value, detail }, index) => (
                  <div
                    key={label}
                    className="fade-up rounded-[1.6rem] border border-white/10 bg-white/8 p-5 backdrop-blur-sm"
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

          <section className="relative flex w-full flex-1 items-center justify-center px-4 py-8 sm:px-6 lg:w-[46%] lg:px-10 xl:px-12">
            <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
              <ModeToggle />
            </div>

            <div className="fade-up relative z-10 w-full max-w-[460px]">
              <div className="rounded-[1.9rem] border border-slate-200/90 bg-white/92 p-5 shadow-[0_20px_55px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
                <div className="lg:hidden">
                  <div className="inline-flex items-center gap-3 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2">
                    <img src={appLogoGreen} alt="GreenCrop NATIOT logo" className="h-8 w-8 object-contain" />
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
