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
    <div className="relative min-h-screen overflow-hidden bg-[#7f8784] text-white">
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

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(134,239,172,0.22),transparent_22%),radial-gradient(circle_at_82%_82%,rgba(74,222,128,0.18),transparent_20%),linear-gradient(180deg,#8b9390_0%,#767d7b_100%)]" />
      <div className="absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)", backgroundSize: "52px 52px" }} />

      <div className="relative z-10 min-h-screen px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1120px] flex-col overflow-hidden rounded-[2.1rem] border border-black/70 bg-[#050706] shadow-[0_35px_90px_rgba(0,0,0,0.45)] lg:min-h-[calc(100vh-5rem)]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff605c]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd44]" />
              <span className="h-3 w-3 rounded-full bg-[#00ca4e]" />
            </div>
            <div className="hidden min-w-[260px] rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-center text-[11px] font-medium tracking-[0.18em] text-white/50 sm:block">
              https://dashboard.greencropnatiot.com/login
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/90">
                Live
              </div>
              <ModeToggle />
            </div>
          </div>

          <section className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-8 lg:px-16">
            <div className="absolute left-[12%] top-[10%] h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute right-[8%] top-[12%] h-72 w-72 rounded-full bg-lime-300/14 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(187,247,208,0.34),transparent_18%),radial-gradient(circle_at_48%_18%,rgba(74,222,128,0.24),transparent_22%),linear-gradient(180deg,rgba(6,78,59,0.08),transparent_40%)]" />
            <div className="absolute inset-y-0 left-0 w-[42%] bg-[linear-gradient(90deg,rgba(34,197,94,0.18),transparent)]" />

            <div className="panel-enter relative z-10 w-full max-w-[480px]" style={{ animationDelay: "160ms" }}>
              <div className="absolute inset-0 scale-[0.97] rounded-[2rem] bg-emerald-300/18 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(3,8,6,0.92),rgba(4,10,7,0.96))] p-5 text-white shadow-[0_22px_65px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.06] p-3 shadow-[0_0_35px_rgba(74,222,128,0.15)]">
                      <img src={appLogoGreen} alt="GreenCropNAT logo" className="h-9 w-9 object-contain" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-100">
                        GreenCrop NATIOT
                      </div>
                      <div className="mt-1 text-xs text-white/45">Operations Platform</div>
                    </div>
                  </div>

                  <div className="hidden rounded-[1.2rem] border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-right sm:block">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-emerald-200/70">Status</div>
                    <div className="mt-1 text-sm font-semibold text-white">Operational</div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/90">
                    <Sparkles className="h-3.5 w-3.5 text-lime-200" />
                    Bright access layer
                  </div>
                  <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-[2.85rem]">
                    Sign in to continue
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-7 text-white/60 sm:text-[15px]">
                    Enter your GreenCrop account to access the live operations dashboard and machine controls.
                  </p>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-4" autoComplete="off">
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">
                              Email
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Mail
                                  className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                                    focusedField === "email" ? "text-emerald-200" : "text-white/30"
                                  }`}
                                />
                                <Input
                                  placeholder="you@example.com"
                                  className="h-14 rounded-[1.2rem] border-white/10 bg-white/[0.06] pl-11 text-[15px] text-white placeholder:text-white/28 focus-visible:border-emerald-300 focus-visible:bg-white/[0.08] focus-visible:ring-4 focus-visible:ring-emerald-400/10"
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
                              <FormLabel className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">
                                Password
                              </FormLabel>
                              <button
                                type="button"
                                className="text-sm font-medium text-emerald-200 transition-colors hover:text-lime-200"
                              >
                                Forgot password?
                              </button>
                            </div>
                            <FormControl>
                              <div className="relative">
                                <Lock
                                  className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                                    focusedField === "password" ? "text-emerald-200" : "text-white/30"
                                  }`}
                                />
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="••••••••"
                                  className="h-14 rounded-[1.2rem] border-white/10 bg-white/[0.06] pl-11 pr-12 text-[15px] text-white placeholder:text-white/28 focus-visible:border-emerald-300 focus-visible:bg-white/[0.08] focus-visible:ring-4 focus-visible:ring-emerald-400/10"
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
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-emerald-200"
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
                      className="mt-2 h-14 w-full rounded-[1.25rem] bg-[linear-gradient(180deg,#b9ffcf,#58d479)] text-[15px] font-semibold text-slate-950 shadow-[0_18px_36px_rgba(74,222,128,0.28)] transition-all hover:translate-y-[-1px] hover:bg-[linear-gradient(180deg,#c8ffd8,#6ee787)]"
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

                <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <SocialAuth onLoginSuccess={onLogin} actionText="sign in" />

                  <div className="mt-5 text-center text-sm text-white/50">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={onSwitchToRegister}
                      className="font-semibold text-emerald-200 underline decoration-emerald-300/50 underline-offset-4 transition-colors hover:text-lime-200"
                    >
                      Create Account
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm text-white/58 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-200" />
                    Protected access for GreenCrop users
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/32">
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
