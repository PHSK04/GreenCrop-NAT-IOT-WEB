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
import machineModel from "@/assets/images/machine_model.png";

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
  fontWeight: 700,
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
      onLogin?.();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900 transition-colors duration-500 dark:bg-[#05131a] dark:text-slate-100">
      <style>{`
        @keyframes gcFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gcGlowFloat {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .42; }
          50% { transform: translate3d(18px, -16px, 0) scale(1.08); opacity: .78; }
        }
        @keyframes gcMachineSpin {
          0% { transform: perspective(1200px) rotateY(-10deg) rotateZ(-1deg) translateY(0); }
          50% { transform: perspective(1200px) rotateY(10deg) rotateZ(1deg) translateY(-10px); }
          100% { transform: perspective(1200px) rotateY(-10deg) rotateZ(-1deg) translateY(0); }
        }
        @keyframes gcRingSpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes gcSheen {
          0% { transform: translateX(-160%); opacity: 0; }
          30% { opacity: .7; }
          100% { transform: translateX(220%); opacity: 0; }
        }
        @keyframes gcPulse {
          0%, 100% { transform: scale(1); opacity: .55; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        .gc-fade-up { animation: gcFadeUp .8s cubic-bezier(.2,.8,.2,1) both; }
        .gc-glow-float { animation: gcGlowFloat 10s ease-in-out infinite; }
        .gc-machine-spin { animation: gcMachineSpin 12s ease-in-out infinite; transform-style: preserve-3d; }
        .gc-ring-spin { animation: gcRingSpin 22s linear infinite; }
        .gc-sheen { animation: gcSheen 5.8s ease-in-out infinite; }
        .gc-pulse { animation: gcPulse 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gc-fade-up, .gc-glow-float, .gc-machine-spin, .gc-ring-spin, .gc-sheen, .gc-pulse { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute left-[-4rem] top-10 h-52 w-52 rounded-full bg-emerald-200/20 blur-3xl gc-glow-float dark:bg-emerald-500/15" />
      <div className="pointer-events-none absolute bottom-0 right-[-5rem] h-72 w-72 rounded-full bg-slate-200/25 blur-3xl gc-glow-float dark:bg-cyan-500/12" style={{ animationDelay: "1.5s" }} />

      <div className="relative z-10 grid min-h-screen lg:grid-cols-[minmax(0,1.28fr)_minmax(420px,0.72fr)]">
        <section className="flex min-h-screen flex-col justify-between px-6 pb-10 pt-8 sm:px-10 lg:px-16 lg:pb-12 lg:pt-10">
          <div className="flex items-start justify-between gap-4">
            <div className="gc-fade-up flex items-center gap-3" style={{ animationDelay: "60ms" }}>
              <img src={appLogoGreen} alt="GreenCropNAT logo" className="h-14 w-14 object-contain sm:h-20 sm:w-20" />
              <div>
                <div className="text-base font-semibold uppercase tracking-[0.04em] text-emerald-700 dark:text-emerald-300 sm:text-[2rem] sm:leading-none">
                  GREENCROPNATIOT
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 sm:hidden">Precision farming command system</div>
              </div>
            </div>

            <div className="gc-fade-up flex items-center gap-3" style={{ animationDelay: "140ms" }}>
              <ModeToggle />
            </div>
          </div>

          <div className="grid flex-1 items-center gap-10 py-10 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] xl:gap-8">
            <div className="max-w-5xl">
              <div className="gc-fade-up mt-2 max-w-[1040px]" style={{ animationDelay: "200ms" }}>
                <h1 className="text-[3.4rem] leading-[0.95] text-emerald-600 sm:text-[4.8rem] lg:text-[6rem] xl:text-[7.4rem]" style={brandWordmarkStyle}>
                  GREENCROP NAT
                </h1>
                <p className="mt-7 max-w-5xl text-xl leading-tight text-slate-700 sm:text-2xl lg:text-[2.25rem] dark:text-slate-200">
                  THE SMARTER GREENER FARM INTELLIGENCE MESH
                </p>
              </div>

              <div className="gc-fade-up mt-16 grid max-w-[780px] gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" style={{ animationDelay: "280ms" }}>
                <div className="space-y-4">
                  <section className="relative overflow-hidden rounded-none border border-slate-200 bg-slate-50/85 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] dark:border-slate-800/80 dark:bg-slate-900/70">
                    <div className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Email
                    </div>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="space-y-1.5">
                              <FormControl>
                                <div className="group relative">
                                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                                  <Input
                                    placeholder="Username"
                                    className="h-12 rounded-2xl border-slate-200/80 bg-white pl-11 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-100"
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
                              <div className="flex items-center justify-between">
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
                                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                                  <Input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="h-12 rounded-2xl border-slate-200/80 bg-white pl-11 pr-11 text-[15px] text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-100"
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
                                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                  </button>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </form>
                    </Form>
                  </section>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    onClick={form.handleSubmit(onSubmit)}
                    className="group relative h-[68px] w-full overflow-hidden rounded-none border border-white/20 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 text-lg font-bold text-white shadow-[0_16px_34px_rgba(16,185,129,0.3)] transition-all hover:brightness-105"
                  >
                    <span className="gc-sheen pointer-events-none absolute inset-y-0 left-[-35%] w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
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
                </div>

                <section className="rounded-none border border-slate-200 bg-slate-50/85 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] dark:border-slate-800/80 dark:bg-slate-900/70">
                  <SocialAuth onLoginSuccess={onLogin} actionText="sign in" />

                  <div className="mt-5 text-center text-sm text-slate-600 dark:text-slate-400">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={onSwitchToRegister}
                      className="font-semibold text-emerald-600 underline decoration-emerald-400/70 underline-offset-4 transition-colors hover:text-emerald-500 dark:text-emerald-400"
                    >
                      Create Account
                    </button>
                  </div>

                  <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    Secured by edge-grade quantum-256 encryption
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                </section>
              </div>
            </div>

            <aside className="gc-fade-up relative flex min-h-[520px] items-center justify-center" style={{ animationDelay: "360ms" }}>
              <div className="absolute inset-x-[6%] inset-y-[3%] border-[4px] border-slate-900 bg-white dark:border-slate-200 dark:bg-slate-950/35" />
              <div className="absolute left-1/2 top-1/2 h-[80%] w-[80%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-slate-100 via-white to-slate-100/80 blur-3xl dark:from-slate-900/10 dark:via-slate-900/5 dark:to-slate-900/10" />
              <div className="absolute left-1/2 top-1/2 h-[86%] w-[86%]">
                <div className="gc-ring-spin absolute left-1/2 top-1/2 h-[88%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-emerald-200/40 dark:border-emerald-500/18" />
              </div>

              <div className="absolute top-[8%] z-10 px-5 py-2 text-center text-[2rem] font-medium text-slate-700 dark:text-slate-200">
                อยากได้โมเดล แบบหมุนอัตโนมัติ
              </div>

              <div className="relative z-10 flex h-full w-full items-center justify-center px-8 py-14">
                <img
                  src={machineModel}
                  alt="GreenCropNAT machine showcase"
                  className="gc-machine-spin relative z-10 h-auto max-h-[660px] w-full max-w-[470px] object-contain drop-shadow-[0_40px_50px_rgba(15,23,42,0.18)] dark:drop-shadow-[0_40px_60px_rgba(0,0,0,0.5)]"
                  draggable={false}
                />
              </div>
            </aside>
          </div>

          <div className="gc-fade-up pt-4 text-[clamp(1.8rem,4vw,3rem)] font-medium tracking-tight text-slate-700 dark:text-slate-300" style={{ animationDelay: "420ms" }}>
            WWW.GREENCROPNATIOT.COM
          </div>
        </section>
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-500/75 to-transparent" />
      <div
        className={`pointer-events-none absolute inset-0 bg-white/55 transition-opacity duration-700 dark:bg-slate-950/40 ${
          mounted ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}
