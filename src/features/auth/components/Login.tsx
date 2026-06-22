import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Cpu,
  Eye,
  EyeOff,
  Factory,
  Leaf,
  Loader2,
  Lock,
  Mail,
  Radio,
  Sprout,
  Wifi,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

import { SocialAuth } from "./SocialAuth";

const loginSchema = z.object({
  email: z.string().email({ message: "กรุณากรอกอีเมลให้ถูกต้อง" }),
  password: z.string().min(6, { message: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginProps {
  onSwitchToRegister: () => void;
  onLogin?: () => void;
}

const featureIcons = [
  { icon: Factory, label: "โรงงาน" },
  { icon: Wifi, label: "เครือข่าย" },
  { icon: Sprout, label: "ฟาร์ม" },
];

const networkPoints = Array.from({ length: 118 }, (_, index) => {
  const x = (index * 83 + (index % 7) * 41) % 1440;
  const y = (index * 59 + (index % 11) * 53) % 900;
  return {
    id: index,
    x: x + ((index % 5) - 2) * 8,
    y: y + ((index % 3) - 1) * 10,
  };
});

const networkLines = networkPoints
  .flatMap((point, pointIndex) =>
    networkPoints.slice(pointIndex + 1).flatMap((target) => {
      const distance = Math.hypot(point.x - target.x, point.y - target.y);
      if (distance > 128 || (point.id + target.id) % 4 === 0) return [];
      return [{ x1: point.x, y1: point.y, x2: target.x, y2: target.y, opacity: 0.1 + (128 - distance) / 700 }];
    }),
  )
  .slice(0, 230);

function NetworkBackdrop() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="login-node-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="900" fill="#f8fbfa" />
      {networkLines.map((line, index) => (
        <line
          key={`${line.x1}-${line.y1}-${index}`}
          className="login-network-line"
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#10b981"
          strokeWidth="1"
          opacity={line.opacity}
          style={{ animationDelay: `${(index % 14) * 0.16}s` }}
        />
      ))}
      {networkPoints.map((point) => (
        <g key={point.id}>
          <circle cx={point.x} cy={point.y} r="7" fill="url(#login-node-glow)" opacity="0.45" />
          <circle
            className="login-network-node"
            cx={point.x}
            cy={point.y}
            r="2.1"
            fill="#34d399"
            opacity="0.7"
            style={{ animationDelay: `${(point.id % 16) * 0.2}s` }}
          />
        </g>
      ))}
    </svg>
  );
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
    <div className="relative min-h-screen overflow-hidden bg-[#f8fbfa] text-slate-900">
      <style>{`
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes loginNetworkDrift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-10px, 8px, 0) scale(1.015); }
        }

        @keyframes loginNodePulse {
          0%, 100% { opacity: 0.36; r: 1.8px; }
          45% { opacity: 0.95; r: 3px; }
        }

        @keyframes loginLinePulse {
          0%, 100% { opacity: 0.08; }
          50% { opacity: 0.28; }
        }

        @keyframes loginScan {
          0% { transform: translateX(-18%) rotate(8deg); opacity: 0; }
          18% { opacity: 0.42; }
          58% { opacity: 0.22; }
          100% { transform: translateX(118%) rotate(8deg); opacity: 0; }
        }

        @keyframes loginFloatOrb {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.55; }
          50% { transform: translate3d(18px, -22px, 0) scale(1.08); opacity: 0.85; }
        }

        .login-fade-up {
          animation: loginFadeUp 0.72s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .login-network {
          animation: loginNetworkDrift 13s ease-in-out infinite;
        }

        .login-network-node {
          animation: loginNodePulse 3.8s ease-in-out infinite;
        }

        .login-network-line {
          animation: loginLinePulse 5.6s ease-in-out infinite;
        }

        .login-scan {
          animation: loginScan 8.5s ease-in-out infinite;
        }

        .login-orb {
          animation: loginFloatOrb 9s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .login-fade-up,
          .login-network,
          .login-network-node,
          .login-network-line,
          .login-scan,
          .login-orb {
            animation: none !important;
          }
        }
      `}</style>

      <div className="login-network absolute inset-[-2%] opacity-95">
        <NetworkBackdrop />
      </div>
      <div className="login-scan pointer-events-none absolute inset-y-0 left-0 w-[34%] bg-[linear-gradient(90deg,transparent,rgba(16,185,129,0.14),transparent)] blur-sm" />
      <div className="login-orb pointer-events-none absolute left-[11%] top-[14%] h-44 w-44 rounded-full bg-emerald-200/30 blur-3xl" />
      <div className="login-orb pointer-events-none absolute bottom-[12%] right-[18%] h-56 w-56 rounded-full bg-teal-200/24 blur-3xl [animation-delay:2.8s]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_53%,rgba(16,185,129,0.11),transparent_22%),linear-gradient(90deg,rgba(255,255,255,0.5),rgba(255,255,255,0.78))]" />

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <div className="grid w-full max-w-[980px] items-center gap-8 lg:grid-cols-[1.03fr_0.97fr] lg:gap-14 xl:max-w-[1060px]">
          <section className="login-fade-up mx-auto flex w-full max-w-[430px] flex-col items-center text-center lg:items-start lg:text-left">
            <div className="inline-flex items-center gap-3 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-5 py-3 text-sm font-medium text-emerald-700 shadow-[0_10px_32px_rgba(16,185,129,0.13)] backdrop-blur-md">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
              System Online
            </div>

            <div className="mt-9">
              <h1 className="font-['Montserrat'] text-[3.35rem] font-bold leading-none tracking-[-0.05em] text-slate-950 drop-shadow-[0_8px_18px_rgba(15,23,42,0.13)] sm:text-[4.2rem]">
                Smart IoT
              </h1>
              <div className="mt-1 font-['Montserrat'] text-[2.55rem] font-medium leading-none tracking-[0.19em] text-emerald-600 sm:text-[3.35rem]">
                PLATFORM
              </div>
            </div>

            <div className="mt-7 border-l-2 border-emerald-300/80 pl-6 text-left text-lg leading-8 text-slate-500">
              ท่องไปในจักรวาลแห่งข้อมูล
              <br />
              ควบคุมทุกอุปกรณ์จากทุกมุมโลก
            </div>

            <div className="mt-9 flex items-center gap-4">
              {featureIcons.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-100 bg-white/90 text-emerald-600 shadow-[0_10px_25px_rgba(15,23,42,0.08)] backdrop-blur-sm"
                  title={label}
                >
                  <Icon className="h-5 w-5" />
                </div>
              ))}
            </div>
          </section>

          <section className="login-fade-up mx-auto w-full max-w-[390px] lg:max-w-[414px]" style={{ animationDelay: "90ms" }}>
            <div className="relative rounded-[24px] border border-emerald-200/70 bg-emerald-50/70 p-5 shadow-[0_24px_58px_rgba(15,118,110,0.26),0_0_34px_rgba(16,185,129,0.23)] backdrop-blur-xl sm:p-6">
              <div className="absolute right-5 top-5">
                <ModeToggle />
              </div>

              <div className="pr-12 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-white/70 text-emerald-600 shadow-sm">
                  <Leaf className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-2xl font-bold text-slate-800">ยินดีต้อนรับ</h2>
                <p className="mt-2 text-sm text-slate-500">เข้าสู่ระบบเพื่อจัดการฟาร์มและโรงงานของคุณ</p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" autoComplete="off">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel className="text-xs font-semibold text-slate-600">ชื่อผู้ใช้ / อีเมล</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail
                              className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                                focusedField === "email" ? "text-emerald-700" : "text-slate-400"
                              }`}
                            />
                            <Input
                              placeholder="กรอกชื่อผู้ใช้ หรือ อีเมล"
                              className="h-12 rounded-[13px] border-slate-200 !bg-white/90 pl-11 text-[15px] !text-slate-800 shadow-[0_6px_16px_rgba(15,23,42,0.08)] placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:!bg-white focus-visible:ring-4 focus-visible:ring-emerald-100 dark:!bg-white/90 dark:!text-slate-800"
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
                        <FormLabel className="text-xs font-semibold text-slate-600">รหัสผ่าน</FormLabel>
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
                              className="h-12 rounded-[13px] border-slate-200 !bg-white/90 pl-11 pr-12 text-[15px] !text-slate-800 shadow-[0_6px_16px_rgba(15,23,42,0.08)] placeholder:text-slate-400 focus-visible:border-emerald-400 focus-visible:!bg-white focus-visible:ring-4 focus-visible:ring-emerald-100 dark:!bg-white/90 dark:!text-slate-800"
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
                              aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center justify-between gap-4 text-sm">
                    <label className="flex cursor-pointer items-center gap-2 text-slate-500">
                      <Checkbox className="border-slate-300 !bg-white dark:!bg-white" />
                      จดจำฉันในระบบ
                    </label>
                    <button
                      type="button"
                      className="font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-[13px] !bg-[#079b78] text-[15px] font-bold !text-white shadow-[0_14px_24px_rgba(5,150,105,0.25)] transition-all hover:-translate-y-0.5 hover:!bg-[#07896e]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        กำลังเข้าสู่ระบบ...
                      </>
                    ) : (
                      <>
                        เข้าสู่ระบบ
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              <div className="mt-5">
                <SocialAuth
                  onLoginSuccess={onLogin}
                  actionText="sign in"
                  dividerLabel="หรือ เข้าสู่ระบบด้วย"
                  providers={["Google", "Microsoft", "LINE", "Facebook"]}
                  tone="light"
                />
              </div>

              <div className="mt-5 border-t border-emerald-100 pt-5 text-center text-sm text-slate-500">
                ยังไม่มีบัญชีใช่ไหม?{" "}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="font-bold text-emerald-700 transition-colors hover:text-emerald-900"
                >
                  สมัครสมาชิกใหม่
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-emerald-100 bg-white/70 px-4 py-2 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur sm:flex">
          <Radio className="h-3.5 w-3.5" />
          GreenCrop NATIOT secure access
        </div>
      </main>
    </div>
  );
}
