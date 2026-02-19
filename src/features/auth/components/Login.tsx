import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowUpRight,
  Cpu,
  Leaf,
  Loader2,
  Lock,
  Mail,
  Radar,
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
import loginBg from "@/assets/images/login_bg.png";
import appLogo from "@/assets/images/3_transparent_logo_green.png";

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

const metrics = [
  { label: "Node Uptime", value: "99.98%", tone: "from-emerald-500/25 to-emerald-500/0" },
  { label: "Irrigation Sync", value: "24 / 24", tone: "from-cyan-500/25 to-cyan-500/0" },
  { label: "Latency Window", value: "11ms", tone: "from-lime-500/25 to-lime-500/0" },
];

const brandWordmarkStyle = {
  fontFamily: '"Montserrat", "Inter", sans-serif',
  fontWeight: 500,
  letterSpacing: "0.08em",
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
    <div className="relative flex min-h-screen w-full overflow-hidden bg-[#edf4fb] text-slate-900 transition-colors duration-500 dark:bg-[#030c15] dark:text-slate-100">
      <style>{`
        @keyframes gcFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes gcSweep {
          0% { transform: translateX(-100%); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateX(180%); opacity: 0; }
        }
        @keyframes gcPulse {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.08); opacity: 0.82; }
        }
        .gc-float { animation: gcFloat 7s ease-in-out infinite; }
        .gc-float-delay { animation: gcFloat 9s ease-in-out infinite; animation-delay: 1.2s; }
        .gc-sweep { animation: gcSweep 4.2s ease-in-out infinite; }
        .gc-pulse { animation: gcPulse 3s ease-in-out infinite; }
      `}</style>

      <div className="pointer-events-none absolute -left-28 top-16 h-72 w-72 rounded-full bg-emerald-300/35 blur-3xl dark:bg-emerald-500/20" />
      <div className="pointer-events-none absolute -right-24 bottom-14 h-72 w-72 rounded-full bg-cyan-300/40 blur-3xl dark:bg-cyan-500/20" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:34px_34px] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)]" />

      <aside className="relative hidden w-[58%] flex-col justify-between overflow-hidden border-r border-slate-200/70 px-12 py-10 xl:flex dark:border-slate-800/70">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-[0.14] dark:opacity-[0.25]"
          style={{ backgroundImage: `url(${loginBg})` }}
        />
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/25 bg-emerald-100/70 px-3 py-1.5 text-[11px] font-bold tracking-[0.18em] text-emerald-700 dark:border-emerald-400/35 dark:bg-emerald-500/10 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 gc-pulse" />
            WEB PORTAL 2026
          </div>
          <div className="rounded-full border border-slate-300/70 bg-white/65 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
            SYSTEM: AZURE SQL EDGE
          </div>
        </div>

        <div className="relative z-10 mt-8">
          <h1 className="text-6xl leading-[0.92] text-slate-900 dark:text-white" style={brandWordmarkStyle}>
            GreenCrop NAT IOT
          </h1>
          <p className="mt-6 max-w-xl text-[19px] leading-relaxed text-slate-600 dark:text-slate-300">
            Precision-agri command web, rebuilt for 2026 operations. Same mission,
            sharper interface, faster control loops.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-5">
            {metrics.map((item) => (
              <div
                key={item.label}
                className="rounded-3xl border border-slate-200/80 bg-white/75 p-5 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/65"
              >
                <div className={`mb-3 h-1.5 rounded-full bg-gradient-to-r ${item.tone}`} />
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{item.value}</div>
                <div className="mt-2 text-sm font-medium uppercase tracking-[0.11em] text-slate-500 dark:text-slate-400">
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 p-1">
            <img
              src={appLogo}
              alt="GreenCrop NAT logo"
              className="mx-auto w-full max-w-[680px] object-contain"
              draggable={false}
            />
          </div>

          <div className="mt-10 grid grid-cols-2 gap-5">
            <div className="gc-float rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-5 backdrop-blur-sm">
              <div className="mb-3 inline-flex rounded-xl bg-emerald-500/20 p-2.5 text-emerald-700 dark:text-emerald-300">
                <Radar className="h-5 w-5" />
              </div>
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Live Sensor Mesh</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Stream pulse from every farm node in realtime.</p>
            </div>
            <div className="gc-float-delay rounded-3xl border border-cyan-500/25 bg-cyan-500/10 p-5 backdrop-blur-sm">
              <div className="mb-3 inline-flex rounded-xl bg-cyan-500/20 p-2.5 text-cyan-700 dark:text-cyan-300">
                <Cpu className="h-5 w-5" />
              </div>
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Edge AI Assist</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Predictive alerts tuned for crop and tank health.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          <Leaf className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          Built for connected agriculture teams
        </div>
      </aside>

      <main className="relative flex w-full flex-1 items-center justify-center p-6 sm:p-10 xl:w-[42%]">
        <div className="absolute right-5 top-5 z-20 flex items-center gap-3">
          <div className="hidden rounded-full border border-emerald-500/25 bg-white/75 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700 backdrop-blur-sm sm:flex dark:border-emerald-400/30 dark:bg-slate-900/70 dark:text-emerald-300">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500 gc-pulse" />
            NODE SECURE
          </div>
          <ModeToggle />
        </div>

        <section
          className={`relative w-full max-w-[560px] rounded-[30px] border border-slate-200/80 bg-white/80 p-7 shadow-[0_24px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-all duration-700 dark:border-slate-800/80 dark:bg-slate-900/72 dark:shadow-[0_24px_70px_rgba(2,8,18,0.7)] sm:p-10 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          <div className="mb-8 text-center">
            <img
              src={appLogo}
              alt="GreenCrop NAT logo"
              className="mx-auto mb-5 w-[360px] max-w-full object-contain"
              draggable={false}
            />
            <h2 className="text-4xl text-slate-900 dark:text-slate-100" style={brandWordmarkStyle}>
              GreenCrop NAT IOT
            </h2>
            <p className="mt-3 text-base text-slate-600 dark:text-slate-400">
              Sign in to open your secure farm command surface.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="ml-0.5 text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                      Identity
                    </FormLabel>
                    <FormControl>
                      <div className="group relative">
                        <Mail className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                        <Input
                          placeholder="name@example.com"
                          className="h-14 rounded-xl border-slate-200/80 bg-slate-100/65 pl-12 text-base text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700/80 dark:bg-slate-950/65 dark:text-slate-100 dark:placeholder:text-slate-500"
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
                      <FormLabel className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                        Passcode
                      </FormLabel>
                      <button
                        type="button"
                        className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
                      >
                        Reset
                      </button>
                    </div>
                    <FormControl>
                      <div className="group relative">
                        <Lock className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                        <Input
                          type="password"
                          placeholder="••••••••"
                          className="h-14 rounded-xl border-slate-200/80 bg-slate-100/65 pl-12 tracking-[0.32em] text-base text-slate-900 placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 dark:border-slate-700/80 dark:bg-slate-950/65 dark:text-slate-100 dark:placeholder:text-slate-500"
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
                className="group relative h-14 w-full overflow-hidden rounded-xl border border-white/20 bg-gradient-to-r from-emerald-600 via-green-500 to-teal-500 text-base font-bold text-white shadow-[0_0_26px_rgba(16,185,129,0.35)] transition-all hover:brightness-105"
              >
                <span className="gc-sweep pointer-events-none absolute inset-y-0 left-[-45%] w-[40%] bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      LINKING NODES...
                    </>
                  ) : (
                    <>
                      AUTHENTICATE
                      <ShieldCheck className="h-4.5 w-4.5 transition-transform duration-300 group-hover:scale-110" />
                    </>
                  )}
                </span>
              </Button>
            </form>
          </Form>

          <div className="mt-7 space-y-4">
            <SocialAuth onLoginSuccess={onLogin} actionText="sign in" />

            <div className="pt-1 text-center text-base text-slate-600 dark:text-slate-400">
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

          <div className="mt-7 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Secured by edge-grade quantum-256 encryption
            <ArrowUpRight className="h-3.5 w-3.5" />
          </div>
        </section>
      </main>
    </div>
  );
}
