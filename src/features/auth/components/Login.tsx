import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Leaf, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";

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

const heroStats = [
  "Precision nutrient control",
  "Live sensor monitoring",
  "Farm automation ready",
];

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
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fbf9_0%,#f3f7f5_100%)] text-slate-900 dark:bg-[#071319] dark:text-slate-100">
      <style>{`
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .login-fade-up { animation: loginFadeUp .7s cubic-bezier(.2,.8,.2,1) both; }
        .hero-float { animation: heroFloat 7s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .login-fade-up, .hero-float { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(148,163,184,0.12),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:38px_38px] opacity-30 dark:opacity-10" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-5 py-5 sm:px-8 sm:py-8 xl:px-10">
        <div className="mb-6 flex items-start justify-between gap-4 lg:mb-10">
          <div className="login-fade-up flex items-center gap-3" style={{ animationDelay: "60ms" }}>
            <img src={appLogoGreen} alt="GreenCropNAT logo" className="h-12 w-12 object-contain sm:h-14 sm:w-14" />
            <div>
              <div className="text-lg font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300 sm:text-xl">
                GREENCROPNATIOT
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Precision farming command system
              </div>
            </div>
          </div>

          <div className="login-fade-up" style={{ animationDelay: "120ms" }}>
            <ModeToggle />
          </div>
        </div>

        <div className="grid flex-1 items-stretch gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,520px)] xl:gap-10">
          <section className="order-2 flex flex-col justify-between rounded-[32px] border border-white/70 bg-white/70 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.07)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/50 lg:order-1 lg:p-10 xl:p-12">
            <div>
              <div className="login-fade-up inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" style={{ animationDelay: "140ms" }}>
                <Leaf className="h-3.5 w-3.5" />
                Smart Farm Portal
              </div>

              <div className="login-fade-up mt-6 max-w-[760px]" style={{ animationDelay: "220ms" }}>
                <h1 className="text-[2.8rem] font-semibold leading-[0.92] tracking-tight text-emerald-600 sm:text-[4rem] xl:text-[5.6rem] dark:text-emerald-400">
                  GreenCrop NAT
                </h1>
                <p className="mt-5 max-w-[760px] text-xl leading-tight text-slate-700 sm:text-[1.9rem] xl:text-[2.15rem] dark:text-slate-200">
                  The smarter greener farm intelligence mesh
                </p>
                <p className="mt-6 max-w-[640px] text-sm leading-7 text-slate-600 sm:text-base dark:text-slate-300">
                  A clean, focused control surface for monitoring growth systems, coordinating devices,
                  and keeping the entire farm environment responsive in real time.
                </p>
              </div>

              <div className="login-fade-up mt-8 flex flex-wrap gap-3" style={{ animationDelay: "300ms" }}>
                {heroStats.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900/65 dark:text-slate-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="login-fade-up mt-10 grid items-end gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,460px)]" style={{ animationDelay: "380ms" }}>
              <div className="space-y-6">
                <div className="max-w-[440px]">
                  <div className="text-[clamp(1.3rem,2.4vw,2.4rem)] font-medium tracking-tight text-slate-700 dark:text-slate-200">
                    www.greencropnatiot.com
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Purpose-built for clean visibility, reliable access, and a calmer farm operations workflow.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Secured command access
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-[430px]">
                <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.14),transparent_62%)] blur-2xl" />
                <div className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-gradient-to-b from-white to-slate-50 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
                  <img
                    src={machineHero}
                    alt="GreenCropNAT farm unit"
                    className="hero-float mx-auto h-auto max-h-[540px] w-full object-contain"
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="order-1 flex items-center justify-center lg:order-2">
            <div
              className={`w-full max-w-[520px] rounded-[32px] border border-white/80 bg-white/88 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-all duration-700 dark:border-slate-800/80 dark:bg-slate-950/72 sm:p-8 ${
                mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
              }`}
            >
              <div className="mb-8 text-center">
                <img src={appLogoGreen} alt="GreenCropNAT logo" className="mx-auto mb-4 h-16 w-16 object-contain sm:h-20 sm:w-20" />
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-4xl">
                  Sign in
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                  Open your secure GreenCropNAT dashboard and continue managing your farm system.
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Email
                        </FormLabel>
                        <FormControl>
                          <div className="group relative">
                            <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                            <Input
                              placeholder="you@example.com"
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                      <FormItem className="space-y-2">
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
                              className="h-12 rounded-2xl border-slate-200 bg-slate-50 pl-11 pr-11 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-semibold text-white shadow-[0_18px_40px_rgba(16,185,129,0.28)] transition-all hover:brightness-105"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4.5 w-4.5 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-4.5 w-4.5" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-7">
                <SocialAuth onLoginSuccess={onLogin} actionText="sign in" />
              </div>

              <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
                Don&apos;t have an account?{" "}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="font-semibold text-emerald-600 underline decoration-emerald-400/70 underline-offset-4 transition-colors hover:text-emerald-500 dark:text-emerald-400"
                >
                  Create Account
                </button>
              </div>

              <div className="mt-6 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Protected access for registered operators
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
