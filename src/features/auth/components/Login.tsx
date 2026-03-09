import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowUpRight, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";

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
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[#eaf0f7] text-slate-900 transition-colors duration-500 dark:bg-[#04111d] dark:text-slate-100">
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
        @media (prefers-reduced-motion: reduce) {
          .gc-sweep, .gc-pulse, .gc-float, .gc-orbit, .gc-fade-up, .gc-spark-a, .gc-spark-b, .gc-link-pulse, .gc-link-flow, .gc-light-sheen, .gc-light-breathe { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-emerald-300/35 blur-3xl dark:bg-emerald-500/18" />
      <div className="pointer-events-none absolute -right-24 bottom-12 h-72 w-72 rounded-full bg-cyan-300/35 blur-3xl dark:bg-cyan-500/16" />
      <div className="pointer-events-none absolute inset-0 dark:hidden bg-[radial-gradient(circle_at_20%_18%,rgba(74,181,110,0.18),transparent_35%),radial-gradient(circle_at_84%_14%,rgba(56,189,248,0.14),transparent_30%),radial-gradient(circle_at_82%_88%,rgba(16,185,129,0.12),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:34px_34px] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute left-[47%] top-0 hidden h-full w-px xl:block">
        <span className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-300/55 to-transparent dark:via-emerald-400/35" />
        <span className="gc-link-flow absolute left-1/2 top-0 h-24 w-2 -translate-x-1/2 rounded-full bg-gradient-to-b from-transparent via-emerald-400/90 to-transparent blur-[1px]" />
        <span className="gc-link-pulse absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.75)]" />
      </div>

      <aside className="relative hidden w-[47%] items-center justify-center overflow-hidden border-r border-slate-200/70 bg-transparent xl:flex dark:border-slate-800/70">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(74,181,110,0.12),transparent_38%),radial-gradient(circle_at_84%_82%,rgba(56,189,248,0.1),transparent_36%)] dark:bg-[radial-gradient(circle_at_18%_22%,rgba(16,185,129,0.16),transparent_38%),radial-gradient(circle_at_84%_82%,rgba(56,189,248,0.12),transparent_36%)]" />
        <div className="absolute left-8 top-8 rounded-full border border-emerald-500/30 bg-emerald-100/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-300">
          NODE SECURE
        </div>
        <div className="pointer-events-none absolute left-[14%] top-[18%] h-5 w-5 rounded-md bg-emerald-300/50 gc-spark-a dark:bg-emerald-400/30" />
        <div className="pointer-events-none absolute left-[22%] top-[30%] h-3.5 w-3.5 rounded bg-emerald-300/45 gc-spark-b dark:bg-emerald-400/25" />
        <div className="pointer-events-none absolute right-[18%] top-[24%] h-4 w-4 rounded-sm bg-cyan-300/45 gc-spark-a dark:bg-cyan-400/25" />
        <div className="pointer-events-none absolute right-[14%] bottom-[24%] h-6 w-6 rounded-lg bg-emerald-300/35 gc-spark-b dark:bg-emerald-400/20" />

        <div className="gc-fade-up relative z-10 w-full max-w-[560px] px-10">
          <div className="relative overflow-hidden rounded-[34px] border border-white/65 bg-white/62 p-10 shadow-[0_22px_56px_rgba(15,23,42,0.14)] backdrop-blur-sm dark:border-slate-700/70 dark:bg-slate-900/52 dark:shadow-[0_20px_56px_rgba(2,8,18,0.6)]">
            <span className="gc-light-sheen pointer-events-none absolute -top-10 left-0 h-16 w-1/3 rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent blur-sm dark:hidden" />
            <span className="gc-light-breathe pointer-events-none absolute right-8 top-8 h-14 w-14 rounded-full bg-emerald-300/35 blur-2xl dark:hidden" />
            <div className="relative mx-auto mb-6 grid h-[300px] w-[300px] place-items-center">
              <span className="pointer-events-none absolute h-[300px] w-[300px] rounded-full border border-slate-300/55 dark:border-slate-500/28" />
              <span className="gc-orbit pointer-events-none absolute h-[236px] w-[236px] rounded-full border border-emerald-400/28 dark:border-emerald-400/22" />
              <span className="pointer-events-none absolute h-[132px] w-[132px] rounded-full bg-emerald-400/15 blur-2xl dark:bg-emerald-400/12" />
              <span className="pointer-events-none absolute h-[190px] w-[190px] rounded-full bg-white/80 blur-xl dark:bg-emerald-100/12" />
              <img
                src={appLogoGreen}
                alt="GreenCropNAT logo"
                className="gc-float relative w-[300px] max-w-[92%] object-contain brightness-110 contrast-125 saturate-125 drop-shadow-[0_14px_30px_rgba(16,185,129,0.34)]"
                draggable={false}
              />
            </div>

            <h3
              className="text-center text-[2rem] leading-tight text-slate-900 dark:text-slate-100"
              style={brandWordmarkStyle}
            >
              GreenCropNAT
            </h3>
            <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Precision command portal
            </p>
            <div className="mx-auto mt-6 h-px w-44 bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent dark:via-emerald-400/45" />
            <div className="mx-auto mt-4 h-2 w-40 rounded-full bg-gradient-to-r from-emerald-500/70 via-green-400/70 to-teal-400/70" />
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
          className={`relative w-full max-w-[620px] overflow-hidden rounded-[34px] border border-slate-200/85 bg-white/92 p-6 shadow-[0_26px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-all duration-700 dark:border-slate-800/80 dark:bg-slate-900/76 dark:shadow-[0_22px_62px_rgba(2,8,18,0.72)] sm:p-8 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <span className="pointer-events-none absolute inset-0 rounded-[34px] border border-emerald-200/70 dark:hidden" />
          <span className="gc-light-sheen pointer-events-none absolute -top-8 left-0 h-14 w-1/3 rounded-full bg-gradient-to-r from-transparent via-emerald-200/75 to-transparent blur-sm dark:hidden" />
          <span className="gc-sweep pointer-events-none absolute -top-9 left-0 h-14 w-1/3 rounded-full bg-gradient-to-r from-transparent via-emerald-300/65 to-transparent blur-sm dark:via-emerald-400/45" />
          <div className="mb-4 inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-50/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 gc-pulse" />
            PORTAL ACCESS
          </div>

          <div className="gc-fade-up mb-8 text-center">
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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
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
                          placeholder="name@example.com"
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
                          type="password"
                          placeholder="••••••••"
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

          <div className="mt-7 space-y-4">
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

          <div className="mt-7 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Secured by edge-grade quantum-256 encryption
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </section>
      </main>
    </div>
  );
}
