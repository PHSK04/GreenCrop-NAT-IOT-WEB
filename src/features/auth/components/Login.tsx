import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
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

const detailPills = ["Real-time monitoring", "Clean control center", "Protected access"];

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
    <div className="relative min-h-screen overflow-hidden bg-[#f4f8f3] text-slate-900">
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

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_8%_16%,rgba(16,185,129,0.10),transparent_20%),radial-gradient(circle_at_100%_0%,rgba(14,165,233,0.08),transparent_16%),linear-gradient(180deg,#fbfdfb_0%,#f4f8f4_52%,#edf4ef_100%)]" />
      <div className="soft-drift absolute -left-24 top-20 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="soft-drift absolute -right-10 bottom-0 h-80 w-80 rounded-full bg-cyan-100/40 blur-3xl" style={{ animationDelay: "-7s" }} />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(15,23,42,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.5) 1px, transparent 1px)", backgroundSize: "56px 56px" }} />

      <div className="relative z-10 min-h-screen px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1420px] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/70 shadow-[0_28px_90px_rgba(148,163,184,0.14)] backdrop-blur-xl lg:min-h-[calc(100vh-4rem)] lg:flex-row lg:rounded-[2.5rem]">
          <section className="relative flex min-h-[360px] flex-col justify-between overflow-hidden border-b border-slate-200/60 px-5 py-5 sm:px-7 sm:py-7 lg:min-h-0 lg:w-[52%] lg:border-b-0 lg:border-r lg:px-12 lg:py-12 xl:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.9),rgba(255,255,255,0.55),transparent_72%)]" />

            <header className="panel-enter relative z-10 flex items-start justify-between gap-4" style={{ animationDelay: "60ms" }}>
              <div className="flex items-center gap-3">
                <div className="rounded-[1.8rem] border border-white/90 bg-white/95 p-3 shadow-[0_10px_30px_rgba(148,163,184,0.16)] backdrop-blur-md">
                  <img src={appLogoGreen} alt="GreenCropNAT logo" className="h-10 w-10 object-contain" />
                </div>
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-800">
                    GreenCrop NATIOT
                  </div>
                  <div className="mt-1 text-sm text-slate-500">Operations Platform</div>
                </div>
              </div>

              <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Live environment
              </div>
            </header>

            <div className="relative z-10 flex flex-1 flex-col justify-center py-12 lg:py-0">
              <div className="panel-enter inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm backdrop-blur-md" style={{ animationDelay: "140ms" }}>
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Clean access experience
              </div>

              <h1 className="panel-enter mt-7 max-w-[10ch] text-5xl font-semibold leading-[0.9] tracking-[-0.06em] text-slate-950 sm:text-6xl xl:text-[5.6rem]" style={{ animationDelay: "220ms" }}>
                Sign in with
                <br />
                less noise.
              </h1>

              <p className="panel-enter mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-xl" style={{ animationDelay: "300ms" }}>
                A calmer sign-in surface for checking device health, farm activity, and system updates in one clear place.
              </p>

              <div className="panel-enter mt-8 flex flex-wrap gap-3" style={{ animationDelay: "380ms" }}>
                {detailPills.map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="panel-enter relative mt-10 flex min-h-[260px] items-center justify-center overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(245,249,246,0.88))] shadow-[0_20px_50px_rgba(148,163,184,0.10)]" style={{ animationDelay: "460ms" }}>
                <div className="absolute inset-x-16 bottom-8 h-10 rounded-full bg-emerald-200/80 blur-2xl" />
                <div className="absolute right-6 top-6 rounded-full border border-slate-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  GreenCrop unit
                </div>
                <img
                  src={machineHero}
                  alt="GreenCrop machine"
                  className="soft-float relative z-10 h-full max-h-[310px] w-auto object-contain drop-shadow-[0_26px_45px_rgba(148,163,184,0.18)]"
                  draggable={false}
                />
              </div>
            </div>
          </section>

          <section className="relative flex flex-1 items-center justify-center px-4 py-5 sm:px-6 lg:px-8 lg:py-10 xl:px-10">
            <div className="absolute right-5 top-5 z-20">
              <ModeToggle />
            </div>

            <div className="panel-enter relative w-full max-w-[500px]" style={{ animationDelay: "180ms" }}>
              <div className="absolute inset-0 scale-[0.97] rounded-[2.4rem] bg-emerald-200/35 blur-3xl" />
              <div className="relative rounded-[2.4rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,249,0.97))] p-5 text-slate-900 shadow-[0_24px_70px_rgba(148,163,184,0.18)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,249,0.97))] sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-800">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Secure sign in
                    </div>
                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.85rem]">
                      Welcome back
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-7 text-slate-500 sm:text-[15px]">
                      Use your account to continue to the GreenCrop operations dashboard.
                    </p>
                  </div>

                  <div className="hidden rounded-[1.35rem] border border-slate-200 bg-slate-50 px-3 py-2 text-right text-slate-900 shadow-sm sm:block">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-700">Status</div>
                    <div className="mt-1 text-sm font-semibold">Operational</div>
                  </div>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4" autoComplete="off">
                    <div className="space-y-4">
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
                                  className="h-14 rounded-[1.35rem] border-slate-200 bg-slate-50 pl-11 text-[15px] text-slate-950 placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-emerald-500/10"
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
                                  className="h-14 rounded-[1.35rem] border-slate-200 bg-slate-50 pl-11 pr-12 text-[15px] text-slate-950 placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-emerald-500/10"
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
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="mt-2 h-14 w-full rounded-[1.45rem] bg-emerald-600 text-[15px] font-semibold text-white shadow-[0_16px_30px_rgba(16,185,129,0.20)] transition-all hover:translate-y-[-1px] hover:bg-emerald-700"
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

                <div className="mt-6 rounded-[1.9rem] border border-slate-200/80 bg-slate-50/90 p-5 shadow-sm">
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

                <div className="mt-5 flex flex-col gap-3 rounded-[1.6rem] border border-slate-200/80 bg-slate-50 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    Protected access for GreenCrop users
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
