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
  ShieldCheck,
  Sparkles,
  Waves,
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

const signalCards = [
  { label: "Water Flow", value: "Normal", tone: "text-emerald-300" },
  { label: "Nutrient Mix", value: "Balanced", tone: "text-cyan-300" },
  { label: "Active Devices", value: "12 Online", tone: "text-amber-300" },
];

const loginNotes = [
  "Built for day-to-day operators and admin oversight",
  "Live system status, history, and device management in one place",
  "Consistent access across farm floor and back-office workflows",
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
    <div className="relative min-h-screen overflow-hidden bg-[#081411] text-slate-100">
      <style>{`
        @keyframes panelEnter {
          from { opacity: 0; transform: translateY(24px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes softFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }

        @keyframes drift {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(18px, -14px, 0); }
        }

        .panel-enter {
          animation: panelEnter 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .soft-float {
          animation: softFloat 7s ease-in-out infinite;
        }

        .soft-drift {
          animation: drift 14s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .panel-enter, .soft-float, .soft-drift {
            animation: none !important;
          }
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.24),transparent_25%),radial-gradient(circle_at_88%_22%,rgba(34,197,94,0.14),transparent_20%),radial-gradient(circle_at_70%_78%,rgba(14,165,233,0.14),transparent_24%),linear-gradient(160deg,#081411_0%,#0b1c17_45%,#0a1412_100%)]" />
      <div className="soft-drift absolute -left-24 top-16 h-72 w-72 rounded-full bg-emerald-500/12 blur-3xl" />
      <div className="soft-drift absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" style={{ animationDelay: "-7s" }} />
      <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "44px 44px" }} />

      <div className="relative z-10 min-h-screen px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1500px] flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] shadow-[0_32px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm lg:min-h-[calc(100vh-4rem)] lg:flex-row lg:rounded-[2.5rem]">
          <section className="relative flex min-h-[360px] flex-col justify-between overflow-hidden border-b border-white/10 px-5 py-5 sm:px-7 sm:py-7 lg:min-h-0 lg:w-[54%] lg:border-b-0 lg:border-r lg:px-10 lg:py-10 xl:px-14">
            <div
              className="absolute inset-0 opacity-20"
              style={{ backgroundImage: `url(${loginBg})`, backgroundPosition: "center", backgroundSize: "cover" }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(3,26,20,0.85),rgba(4,40,31,0.55),rgba(7,18,15,0.95))]" />

            <header className="panel-enter relative z-10 flex items-start justify-between gap-4" style={{ animationDelay: "60ms" }}>
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-2.5 backdrop-blur-md">
                  <img src={appLogoGreen} alt="GreenCropNAT logo" className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-100/90">
                    GreenCrop NATIOT
                  </div>
                  <div className="mt-1 text-sm text-slate-300/80">Operations Platform</div>
                </div>
              </div>

              <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100/90">
                Live environment
              </div>
            </header>

            <div className="relative z-10 py-10 lg:py-0">
              <div className="panel-enter inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200/90 backdrop-blur-md" style={{ animationDelay: "140ms" }}>
                <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                Designed for real operations
              </div>

              <h1 className="panel-enter mt-6 max-w-2xl text-4xl font-semibold leading-[1] tracking-[-0.04em] text-white sm:text-5xl xl:text-[4.5rem]" style={{ animationDelay: "220ms" }}>
                Better control.
                <br />
                Less dashboard noise.
              </h1>

              <p className="panel-enter mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg" style={{ animationDelay: "300ms" }}>
                A calmer login surface for a system that manages devices, crop workflows, and farm operations in real time.
              </p>

              <div className="panel-enter mt-8 grid gap-3 sm:grid-cols-3" style={{ animationDelay: "380ms" }}>
                {signalCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-[1.6rem] border border-white/10 bg-black/20 p-4 backdrop-blur-md"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {card.label}
                    </div>
                    <div className={`mt-3 text-xl font-semibold ${card.tone}`}>{card.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-enter relative z-10 mt-8 grid gap-4 lg:mt-0 lg:grid-cols-[1.15fr_0.85fr]" style={{ animationDelay: "460ms" }}>
              <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md">
                <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200/85">
                  <Waves className="h-4 w-4" />
                  Why this feels better
                </div>
                <div className="space-y-3">
                  {loginNotes.map((note) => (
                    <div key={note} className="flex gap-3 text-sm leading-6 text-slate-200/90">
                      <div className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-300" />
                      <p>{note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[220px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-4 backdrop-blur-md">
                <div className="absolute inset-x-6 bottom-6 h-10 rounded-full bg-emerald-400/30 blur-2xl" />
                <img
                  src={machineHero}
                  alt="GreenCrop machine"
                  className="soft-float relative z-10 mx-auto h-full max-h-[240px] w-auto object-contain drop-shadow-[0_28px_60px_rgba(0,0,0,0.45)]"
                  draggable={false}
                />
              </div>
            </div>
          </section>

          <section className="relative flex flex-1 items-center justify-center px-4 py-5 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
            <div className="absolute right-5 top-5 z-20">
              <ModeToggle />
            </div>

            <div className="panel-enter w-full max-w-[520px]" style={{ animationDelay: "180ms" }}>
              <div className="rounded-[2rem] border border-white/10 bg-[#f7fbf6] p-5 text-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.28)] dark:bg-[#f7fbf6] sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Secure sign in
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[2.5rem]">
                      Welcome back
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-[15px]">
                      Sign in to continue to your control center and review the latest farm activity.
                    </p>
                  </div>

                  <div className="hidden rounded-2xl bg-slate-900 px-3 py-2 text-right text-white sm:block">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-300">Status</div>
                    <div className="mt-1 text-sm font-semibold">Operational</div>
                  </div>
                </div>

                <div className="mt-6 rounded-[1.6rem] border border-emerald-100 bg-white p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-950 px-4 py-3 text-white">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Access</div>
                      <div className="mt-2 text-base font-semibold">Farm Core</div>
                    </div>
                    <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-700">Telemetry</div>
                      <div className="mt-2 text-base font-semibold text-slate-900">Streaming</div>
                    </div>
                    <div className="rounded-2xl bg-cyan-50 px-4 py-3">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-cyan-700">Security</div>
                      <div className="mt-2 text-base font-semibold text-slate-900">Verified</div>
                    </div>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" autoComplete="off">
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
                                className="h-14 rounded-2xl border-slate-200 bg-white pl-11 text-[15px] text-slate-950 placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-500/10"
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
                              className="text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-600"
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
                                className="h-14 rounded-2xl border-slate-200 bg-white pl-11 pr-12 text-[15px] text-slate-950 placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-500/10"
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
                      className="mt-2 h-14 w-full rounded-2xl bg-slate-950 text-[15px] font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] transition-all hover:translate-y-[-1px] hover:bg-slate-900"
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

                <div className="mt-6 rounded-[1.75rem] border border-slate-200 bg-white p-5">
                  <SocialAuth onLoginSuccess={onLogin} actionText="sign in" />

                  <div className="mt-5 text-center text-sm text-slate-500">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={onSwitchToRegister}
                      className="font-semibold text-emerald-700 underline decoration-emerald-400/60 underline-offset-4 transition-colors hover:text-emerald-600"
                    >
                      Create Account
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 rounded-[1.5rem] bg-slate-950 px-4 py-3 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                    Protected access for GreenCrop users
                  </div>
                  <div className="hidden text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400 sm:block">
                    admin@greencropnatiot.com
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
