import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";

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

export function Login({ onSwitchToRegister, onLogin }: LoginProps) {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [heroRotation, setHeroRotation] = useState({ x: 0, y: 0 });

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

  function handleHeroMove(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 18;
    const rotateX = (0.5 - py) * 14;
    setHeroRotation({ x: rotateX, y: rotateY });
  }

  function resetHeroRotation() {
    setHeroRotation({ x: 0, y: 0 });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-slate-900 dark:bg-[#071319] dark:text-slate-100">
      <style>{`
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .login-fade-up { animation: loginFadeUp .7s cubic-bezier(.2,.8,.2,1) both; }
        .hero-float { animation: heroFloat 7s ease-in-out infinite; transform-style: preserve-3d; }
        @media (prefers-reduced-motion: reduce) {
          .login-fade-up, .hero-float { animation: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.06),transparent_18%),radial-gradient(circle_at_92%_88%,rgba(148,163,184,0.06),transparent_20%)]" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1900px] flex-col px-5 py-5 sm:px-8 sm:py-8 xl:px-10">
        <header className="mb-4 flex items-start justify-between gap-4 lg:mb-8">
          <div className="login-fade-up flex items-center gap-4" style={{ animationDelay: "40ms" }}>
            <img src={appLogoGreen} alt="GreenCropNAT logo" className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
            <div>
              <div className="text-lg font-semibold uppercase tracking-[0.02em] text-emerald-700 dark:text-emerald-300 sm:text-[2.1rem]">
                GREENCROPNATIOT
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
                Precision farming command system
              </div>
            </div>
          </div>

          <div className="login-fade-up" style={{ animationDelay: "90ms" }}>
            <ModeToggle />
          </div>
        </header>

        <section className="grid flex-1 gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(440px,0.72fr)] xl:gap-14">
          <div className="order-2 flex min-h-full flex-col lg:order-1">
            <div className="login-fade-up pt-4 sm:pt-8 lg:pt-20" style={{ animationDelay: "140ms" }}>
              <h1 className="max-w-[1200px] text-[3rem] font-semibold uppercase leading-[0.9] tracking-tight text-emerald-600 sm:text-[4.7rem] lg:text-[6.15rem] xl:text-[7.35rem] dark:text-emerald-400">
                GREENCROP NAT
              </h1>
              <p className="mt-8 max-w-[1100px] text-xl leading-tight text-slate-700 sm:text-[1.9rem] lg:text-[2.15rem] dark:text-slate-200">
                THE SMARTER GREENER FARM INTELLIGENCE MESH
              </p>
            </div>

            <div className="login-fade-up mt-10 grid max-w-[1180px] gap-5 md:grid-cols-2 xl:mt-16 xl:gap-8" style={{ animationDelay: "220ms" }}>
              <div className="space-y-4">
                <div
                  className={`rounded-[26px] border border-slate-200 bg-slate-50/90 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)] transition-all duration-700 dark:border-slate-800/80 dark:bg-slate-950/72 ${
                    mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                  }`}
                >
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</div>

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormControl>
                              <div className="group relative">
                                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-emerald-500" />
                                <Input
                                  placeholder="Username"
                                  className="h-12 rounded-2xl border-slate-200 bg-white pl-11 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                                  className="h-12 rounded-2xl border-slate-200 bg-white pl-11 pr-11 text-[15px] text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  onClick={form.handleSubmit(onSubmit)}
                  className="h-[68px] w-full rounded-[18px] bg-gradient-to-r from-emerald-600 to-teal-500 text-lg font-semibold text-white shadow-[0_18px_38px_rgba(16,185,129,0.28)] transition-all hover:brightness-105"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4.5 w-4.5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ShieldCheck className="ml-2 h-4.5 w-4.5" />
                    </>
                  )}
                </Button>
              </div>

              <div
                className={`rounded-[26px] border border-slate-200 bg-slate-50/90 p-5 shadow-[0_18px_46px_rgba(15,23,42,0.06)] transition-all duration-700 dark:border-slate-800/80 dark:bg-slate-950/72 ${
                  mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                }`}
                style={{ transitionDelay: "80ms" }}
              >
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

                <div className="mt-5 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Secured by edge-grade quantum-256 encryption
                </div>
              </div>
            </div>

            <div className="mt-12 pb-2 text-[clamp(1.5rem,3vw,3rem)] font-medium tracking-tight text-slate-700 dark:text-slate-300">
              WWW.GREENCROPNATIOT.COM
            </div>
          </div>

          <div className="order-1 flex items-start justify-center lg:order-2 lg:pt-2">
            <div className="login-fade-up relative w-full max-w-[620px]" style={{ animationDelay: "180ms" }}>
              <div className="absolute inset-0 rounded-[2px] border-[4px] border-black bg-white dark:border-slate-200 dark:bg-slate-950/55" />
              <div className="relative flex min-h-[420px] flex-col items-center px-4 pb-6 pt-7 sm:min-h-[560px] sm:px-6 lg:min-h-[950px] lg:px-8 lg:pb-10 lg:pt-8">
                <div className="text-center text-[1.15rem] font-medium tracking-tight text-slate-700 sm:text-[1.55rem] lg:text-[2.05rem] dark:text-slate-200">

                </div>

                <div
                  className="mt-4 flex flex-1 items-center justify-center sm:mt-6 [perspective:1600px]"
                  onMouseMove={handleHeroMove}
                  onMouseLeave={resetHeroRotation}
                >
                  <div
                    className="hero-float flex h-full w-full items-center justify-center transition-transform duration-200 ease-out"
                    style={{
                      transform: `rotateX(${heroRotation.x}deg) rotateY(${heroRotation.y}deg)`,
                    }}
                  >
                    <img
                      src={machineHero}
                      alt="GreenCropNAT farm unit"
                      className="h-auto max-h-[360px] w-full max-w-[270px] object-contain sm:max-h-[500px] sm:max-w-[360px] lg:max-h-[820px] lg:max-w-[520px]"
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
