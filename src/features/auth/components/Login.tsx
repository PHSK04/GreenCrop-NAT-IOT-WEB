import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  BarChart3,
  Droplets,
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  Lock,
  Mail,
  Play,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  Sun,
  Thermometer,
  Wifi,
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

const navItems = ["หน้าแรก", "เกี่ยวกับเรา", "เทคโนโลยี", "การเลี้ยง", "สินค้า", "บทความ", "ติดต่อเรา"];

const floatingMetrics = [
  { icon: Droplets, label: "pH", value: "6.5", position: "left-[3%] top-[22%]" },
  { icon: Sprout, label: "DO", value: "6.2 mg/L", position: "left-[-2%] bottom-[18%]" },
  { icon: Thermometer, label: "อุณหภูมิ", value: "25.8°C", position: "right-[1%] top-[30%]" },
  { icon: Sun, label: "แสง", value: "220", position: "right-[-2%] bottom-[12%]" },
];

const featureItems = [
  {
    icon: Wifi,
    title: "ควบคุมอัจฉริยะ",
    detail: "ติดตามคุณภาพน้ำแบบเรียลไทม์ผ่าน IoT",
  },
  {
    icon: BarChart3,
    title: "เพิ่มประสิทธิภาพผลผลิต",
    detail: "วิเคราะห์ข้อมูล pH, EC, DO และอุณหภูมิ",
  },
  {
    icon: ShieldCheck,
    title: "ปลอดภัย ไร้สารตกค้าง",
    detail: "ควบคุมสภาพแวดล้อมให้เหมาะกับไข่ผำ",
  },
  {
    icon: Leaf,
    title: "ยั่งยืน เป็นมิตรต่อสิ่งแวดล้อม",
    detail: "ใช้น้ำน้อย ลดของเสีย และดูแลง่าย",
  },
  {
    icon: ShoppingBasket,
    title: "จัดการผลผลิต",
    detail: "บันทึกและส่งออกรายงานรายวันได้ทันที",
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
    <div className="relative min-h-screen overflow-hidden bg-[#f8faf6] text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_36%,rgba(159,190,137,0.22),transparent_30%),radial-gradient(circle_at_18%_8%,rgba(255,255,255,0.95),transparent_28%)]" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(21,58,35,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(21,58,35,0.8) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <header className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 py-6 lg:px-10">
        <button type="button" className="flex items-center gap-4 text-left" onClick={onSwitchToRegister}>
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100">
            <img src={appLogoGreen} alt="GreenCrop NATIOT logo" className="h-8 w-8 object-contain" />
          </div>
          <div>
            <div className="font-['Montserrat'] text-3xl font-semibold leading-none tracking-[-0.04em] text-[#244f2f]">
              ไข่ผำ
            </div>
            <div className="mt-1 text-xs font-medium text-slate-500">เทคโนโลยีเพื่อการเลี้ยงที่ยั่งยืน</div>
          </div>
        </button>

        <nav className="hidden items-center gap-9 text-sm font-medium text-slate-600 lg:flex">
          {navItems.map((item, index) => (
            <span key={item} className={index === 0 ? "relative text-[#244f2f]" : ""}>
              {item}
              {index === 0 && <span className="absolute -bottom-5 left-0 h-0.5 w-full rounded-full bg-[#2e6b3d]" />}
            </span>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ModeToggle />
          <Button
            type="button"
            onClick={() => document.getElementById("login-panel")?.scrollIntoView({ behavior: "smooth" })}
            className="hidden rounded-full bg-[#2e6b3d] px-6 py-6 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(46,107,61,0.22)] hover:bg-[#255b34] sm:inline-flex"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            ระบบจัดการฟาร์ม
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-116px)] w-full max-w-[1440px] grid-cols-1 items-center gap-10 px-6 pb-10 pt-4 lg:grid-cols-[0.88fr_1.12fr] lg:px-10">
        <section className="max-w-[560px]">
          <h1 className="font-['Montserrat'] text-[5.5rem] font-semibold leading-[0.95] tracking-[-0.08em] text-[#1f4d2c] sm:text-[7rem]">
            ไข่ผำ
          </h1>
          <p className="mt-8 text-3xl font-medium leading-[1.35] text-slate-600">
            อาหารธรรมชาติคุณภาพสูง
            <br />
            ด้วยเทคโนโลยี
            <span className="text-[#2e6b3d]">การเลี้ยงอัจฉริยะ</span>
          </p>
          <div className="mt-10 h-0.5 w-20 rounded-full bg-[#80a94b]" />
          <p className="mt-8 max-w-lg text-lg leading-9 text-slate-500">
            ควบคุมคุณภาพน้ำ อุณหภูมิ แสง และผลผลิตอย่างแม่นยำ เพื่อการเพาะเลี้ยงไข่ผำที่สม่ำเสมอและยั่งยืน
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Button
              type="button"
              onClick={() => document.getElementById("login-panel")?.scrollIntoView({ behavior: "smooth" })}
              className="h-14 rounded-full bg-[#2e6b3d] px-8 text-base font-semibold text-white shadow-[0_18px_38px_rgba(46,107,61,0.22)] hover:bg-[#255b34]"
            >
              เข้าสู่ระบบจัดการ
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-14 rounded-full border-[#b8c9b6] bg-white/80 px-6 text-base font-semibold text-[#2e6b3d] hover:bg-white"
            >
              <Play className="mr-2 h-4 w-4" />
              ดูวิดีโอแนะนำ
            </Button>
          </div>
        </section>

        <section className="relative min-h-[660px]">
          <div className="absolute left-[10%] top-[9%] h-[540px] w-[540px] rounded-full border border-emerald-900/5 bg-white/35 shadow-[inset_0_0_0_12px_rgba(255,255,255,0.55)]" />
          <div className="absolute left-[2%] top-[4%] h-[620px] w-[620px] rounded-full border border-dashed border-emerald-900/12" />
          <div className="absolute left-[16%] top-[16%] h-[430px] w-[430px] rounded-full bg-[radial-gradient(circle_at_42%_35%,#d7f19f_0_2px,#7daa22_3px_5px,#4f7618_6px_7px,transparent_8px)] bg-[length:18px_18px] shadow-[0_24px_80px_rgba(53,91,37,0.24),inset_0_0_0_16px_rgba(255,255,255,0.8),inset_0_0_0_24px_rgba(169,191,153,0.35)] ring-1 ring-emerald-900/10" />
          <div className="absolute left-[13%] top-[13%] h-[470px] w-[470px] rounded-full border-[12px] border-white/80 shadow-[0_18px_60px_rgba(47,78,53,0.12)]" />

          {floatingMetrics.map(({ icon: Icon, label, value, position }) => (
            <div
              key={label}
              className={`absolute ${position} rounded-3xl border border-white/80 bg-white/82 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur-xl`}
            >
              <Icon className="h-9 w-9 text-[#2e6b3d]" />
              <div className="mt-4 text-sm font-semibold text-slate-600">{label}</div>
              <div className="mt-1 text-2xl font-semibold text-[#244f2f]">{value}</div>
              <div className="mt-4 h-3 w-24 rounded-full bg-[linear-gradient(135deg,transparent_0_18%,#90b45b_18%_24%,transparent_24%_42%,#90b45b_42%_48%,transparent_48%_66%,#90b45b_66%_72%,transparent_72%)] opacity-70" />
            </div>
          ))}

          <div
            id="login-panel"
            className="absolute bottom-0 right-0 w-full max-w-[430px] rounded-[2rem] border border-emerald-900/10 bg-white/90 p-6 shadow-[0_28px_80px_rgba(36,79,47,0.14)] backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2e6b3d]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Operator Login
                </div>
                <h2 className="mt-4 font-['Montserrat'] text-3xl font-semibold tracking-[-0.04em] text-slate-900">
                  เข้าสู่ระบบ
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">สำหรับจัดการบ่อไข่ผำ เซนเซอร์ และรายงานผลผลิต</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" autoComplete="off">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Email
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail
                            className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                              focusedField === "email" ? "text-[#2e6b3d]" : "text-slate-400"
                            }`}
                          />
                          <Input
                            placeholder="you@example.com"
                            className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 pl-11 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-emerald-100"
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
                        <FormLabel className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Password
                        </FormLabel>
                        <button type="button" className="text-xs font-medium text-slate-500 hover:text-[#2e6b3d]">
                          Forgot password?
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock
                            className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
                              focusedField === "password" ? "text-[#2e6b3d]" : "text-slate-400"
                            }`}
                          />
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            className="h-12 rounded-2xl border-slate-200 bg-slate-50/80 pl-11 pr-12 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-emerald-100"
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
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#2e6b3d]"
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
                  className="h-12 w-full rounded-2xl bg-[#244f2f] text-[15px] font-semibold text-white shadow-[0_14px_30px_rgba(36,79,47,0.18)] hover:bg-[#1c4026]"
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

            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
              <SocialAuth onLoginSuccess={onLogin} actionText="sign in" />
              <div className="mt-4 text-center text-sm text-slate-500">
                ยังไม่มีบัญชี?{" "}
                <button
                  type="button"
                  onClick={onSwitchToRegister}
                  className="font-semibold text-[#2e6b3d] underline decoration-emerald-300 underline-offset-4 hover:text-[#1f4d2c]"
                >
                  สร้างบัญชี
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <section className="relative z-10 mx-auto mb-8 grid w-[calc(100%-3rem)] max-w-[1320px] grid-cols-1 rounded-[2rem] border border-white bg-white/82 px-6 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-5">
        {featureItems.map(({ icon: Icon, title, detail }, index) => (
          <div
            key={title}
            className={`flex flex-col items-center px-5 py-4 text-center ${
              index > 0 ? "lg:border-l lg:border-slate-200" : ""
            }`}
          >
            <Icon className="h-10 w-10 text-[#2e6b3d]" />
            <h3 className="mt-4 text-base font-semibold text-[#244f2f]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
