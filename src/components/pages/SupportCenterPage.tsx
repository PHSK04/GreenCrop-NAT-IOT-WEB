import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Headset,
  LifeBuoy,
  Radio,
  Search,
  ShieldAlert,
  Smartphone,
  UserRoundX,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type SupportCenterPageProps = {
  language?: string;
};

type IssueCategory = "all" | "device" | "account" | "data" | "urgent";

type IssueItem = {
  id: string;
  category: Exclude<IssueCategory, "all">;
  icon: typeof WifiOff;
  title: { TH: string; EN: string };
  summary: { TH: string; EN: string };
  symptoms: { TH: string[]; EN: string[] };
  steps: { TH: string[]; EN: string[] };
  response: { TH: string; EN: string };
  escalate: { TH: string; EN: string };
};

const issueCategories: Array<{ id: IssueCategory; label: { TH: string; EN: string } }> = [
  { id: "all", label: { TH: "ทั้งหมด", EN: "All" } },
  { id: "device", label: { TH: "อุปกรณ์", EN: "Device" } },
  { id: "account", label: { TH: "บัญชีผู้ใช้", EN: "Account" } },
  { id: "data", label: { TH: "ข้อมูลระบบ", EN: "Data" } },
  { id: "urgent", label: { TH: "เร่งด่วน", EN: "Urgent" } },
];

const supportIssues: IssueItem[] = [
  {
    id: "device-offline",
    category: "device",
    icon: WifiOff,
    title: { TH: "อุปกรณ์ไม่ออนไลน์", EN: "Device Offline" },
    summary: {
      TH: "ลูกค้ามองไม่เห็นสถานะเครื่องหรือเครื่องหยุดส่งข้อมูล",
      EN: "The customer cannot see device status or data stopped syncing.",
    },
    symptoms: {
      TH: ["สถานะขึ้น offline", "ข้อมูลไม่อัปเดตเกิน 10 นาที", "เข้า dashboard แล้วค่าเดิมค้าง"],
      EN: ["Status shows offline", "No updates for more than 10 minutes", "Dashboard values appear frozen"],
    },
    steps: {
      TH: [
        "ให้ลูกค้าตรวจไฟเลี้ยงอุปกรณ์และไฟสถานะบนตัวเครื่อง",
        "ตรวจว่า Wi-Fi หรือเครือข่ายที่อุปกรณ์ใช้ยังเชื่อมต่อได้",
        "ให้ลูกค้าลองรีสตาร์ตอุปกรณ์ 1 ครั้ง แล้วรอ 2-3 นาที",
        "ถ้ายังไม่กลับมา ให้เช็กหน้า Device Pairing หรือ Farm Settings ว่าอุปกรณ์ยังถูกผูกกับบัญชีอยู่",
      ],
      EN: [
        "Ask the customer to check device power and status lights.",
        "Verify the Wi-Fi or network used by the device is still available.",
        "Have them restart the device once, then wait 2-3 minutes.",
        "If it does not recover, check Device Pairing or Farm Settings to confirm it is still linked to the account.",
      ],
    },
    response: {
      TH: "เบื้องต้นระบบพบว่าอุปกรณ์ยังไม่ส่งข้อมูลเข้ามา แนะนำให้ตรวจไฟเลี้ยงและเครือข่ายก่อน หากรีสตาร์ตแล้วสถานะยังไม่กลับมา ทีมงานจะช่วยตรวจต่อให้ทันทีครับ",
      EN: "At the moment the system is not receiving device data. Please check power and network first. If the device stays offline after a restart, our team will continue the investigation right away.",
    },
    escalate: {
      TH: "ส่งต่อทีมเทคนิคทันที ถ้า offline เกิน 30 นาทีหลังรีสตาร์ต หรือมีหลายเครื่องดับพร้อมกัน",
      EN: "Escalate immediately if the device stays offline for over 30 minutes after restart, or if multiple devices fail together.",
    },
  },
  {
    id: "login-problem",
    category: "account",
    icon: UserRoundX,
    title: { TH: "เข้าสู่ระบบไม่ได้", EN: "Cannot Log In" },
    summary: {
      TH: "ลูกค้าไม่สามารถเข้าใช้งานระบบด้วยอีเมลหรือรหัสผ่านเดิม",
      EN: "The customer cannot access the platform with their usual email or password.",
    },
    symptoms: {
      TH: ["รหัสผ่านไม่ถูกต้อง", "ไม่พบผู้ใช้งาน", "เข้าระบบแล้วเด้งกลับหน้า login"],
      EN: ["Incorrect password", "User not found", "Login succeeds then returns to the login page"],
    },
    steps: {
      TH: [
        "ตรวจสอบว่าใช้อีเมลถูกบัญชีและไม่มีช่องว่างเกิน",
        "ให้ลูกค้าลองเข้าสู่ระบบใหม่ในเบราว์เซอร์อื่นหรือโหมดไม่ระบุตัวตน",
        "ถ้ามีหลาย tenant ให้ยืนยันว่าลูกค้าเข้าบัญชีของฟาร์มที่ถูกต้อง",
        "ถ้ายังเข้าไม่ได้ ให้เตรียมอีเมลผู้ใช้และเวลาที่เกิดปัญหาเพื่อให้ทีมตรวจ log",
      ],
      EN: [
        "Confirm the email is correct and does not include extra spaces.",
        "Ask the customer to retry in another browser or private mode.",
        "If multiple tenants exist, make sure they are using the correct farm account.",
        "If the issue remains, collect the user email and time of failure so the team can inspect logs.",
      ],
    },
    response: {
      TH: "รบกวนตรวจสอบอีเมลและลองเข้าสู่ระบบอีกครั้งผ่านเบราว์เซอร์อื่นก่อนนะครับ หากยังเข้าไม่ได้ ทีมงานขออีเมลที่ใช้และเวลาที่พบปัญหาเพื่อเช็กระบบให้ต่อทันที",
      EN: "Please verify the email and try again from another browser first. If login still fails, send us the email address and the time the issue occurred so we can inspect the system immediately.",
    },
    escalate: {
      TH: "ส่งต่อทีมเทคนิคถ้าลูกค้า reset แล้วไม่ได้ผล หรือมีผู้ใช้หลายคนเข้าไม่ได้พร้อมกัน",
      EN: "Escalate if password reset does not help or if multiple users are locked out at the same time.",
    },
  },
  {
    id: "sensor-delay",
    category: "data",
    icon: Radio,
    title: { TH: "ข้อมูลเซนเซอร์อัปเดตช้า", EN: "Sensor Data Delay" },
    summary: {
      TH: "ค่าที่แสดงบน dashboard ไม่ตรงกับสถานะจริงหรือมาเป็นช่วง ๆ",
      EN: "Dashboard values do not match the live environment or arrive intermittently.",
    },
    symptoms: {
      TH: ["กราฟขยับช้า", "ค่าคงที่นานผิดปกติ", "บางเซนเซอร์อัปเดต บางตัวไม่อัปเดต"],
      EN: ["Charts update slowly", "Values remain fixed too long", "Some sensors update while others do not"],
    },
    steps: {
      TH: [
        "เช็กว่าเลือก active device ถูกตัวในระบบ",
        "ให้ลูกค้ารอ 1 รอบการ sync แล้วรีเฟรชหน้า dashboard",
        "ตรวจสอบว่าปัญหาเกิดทุกค่า หรือเฉพาะ sensor บางตัว",
        "ถ้าพบเฉพาะบางตัว ให้ส่งชื่อ sensor และเวลาที่พบปัญหาให้ทีมตรวจฐานข้อมูล",
      ],
      EN: [
        "Confirm the correct active device is selected.",
        "Wait for one sync cycle, then refresh the dashboard.",
        "Check whether all values are affected or only certain sensors.",
        "If only specific sensors are delayed, share the sensor names and timestamp with the technical team.",
      ],
    },
    response: {
      TH: "ตอนนี้แนะนำให้ตรวจว่าเลือกอุปกรณ์ถูกเครื่องและรีเฟรชหน้าอีกครั้งก่อนนะครับ หากค่าบางตัวค้างต่อเนื่อง รบกวนส่งชื่อเซนเซอร์และเวลาที่พบปัญหาเพื่อให้ทีมงานตรวจเช็กเชิงลึกต่อครับ",
      EN: "Please confirm the correct device is selected and refresh the page once more. If specific values remain stale, send the sensor names and the time observed so our team can investigate further.",
    },
    escalate: {
      TH: "ส่งต่อเมื่อข้อมูลขาดหายเกิน 3 รอบการ sync หรือค่าที่ผิดปกติกระทบการตัดสินใจของลูกค้า",
      EN: "Escalate if data is missing for more than three sync cycles or if the incorrect values affect customer operations.",
    },
  },
  {
    id: "pairing-fail",
    category: "device",
    icon: Smartphone,
    title: { TH: "เชื่อมต่ออุปกรณ์ไม่สำเร็จ", EN: "Device Pairing Failed" },
    summary: {
      TH: "ลูกค้าเพิ่มอุปกรณ์ใหม่ไม่ได้ หรือผูกกับบัญชีแล้วไม่แสดงผล",
      EN: "The customer cannot pair a new device, or the linked device does not appear afterward.",
    },
    symptoms: {
      TH: ["สแกน QR แล้วไม่ผ่าน", "ขึ้นว่า device ถูกใช้งานแล้ว", "pair เสร็จแต่ไม่ขึ้นในระบบ"],
      EN: ["QR scan fails", "The system says the device is already assigned", "Pairing completes but the device does not show up"],
    },
    steps: {
      TH: [
        "ยืนยันรหัส device และบัญชีผู้ใช้ที่กำลังล็อกอินอยู่",
        "ให้ลูกค้าลอง pair ใหม่อีกครั้งเมื่อสัญญาณเน็ตเสถียร",
        "ตรวจว่ามี device เดิมถูกตั้งเป็น primary อยู่หรือไม่",
        "หากติดข้อความว่า device ถูกใช้งานแล้ว ให้ทีมตรวจ mapping ในฐานข้อมูล",
      ],
      EN: [
        "Confirm the device ID and the currently signed-in account.",
        "Retry pairing once more on a stable network.",
        "Check whether another device is already marked as primary.",
        "If the message says the device is already assigned, the team should inspect the database mapping.",
      ],
    },
    response: {
      TH: "รบกวนยืนยันรหัสอุปกรณ์และลองเชื่อมต่ออีกครั้งบนเครือข่ายที่เสถียรนะครับ หากระบบแจ้งว่าอุปกรณ์ถูกใช้งานแล้ว ทีมงานจะช่วยตรวจการผูกอุปกรณ์ให้ต่อครับ",
      EN: "Please confirm the device ID and try pairing again on a stable network. If the system reports the device is already assigned, our team will verify the device linkage for you.",
    },
    escalate: {
      TH: "ส่งต่อทันทีเมื่อ pair ไม่ได้ทั้งที่ device ใหม่ หรือมีข้อความ device ถูกผูกผิดบัญชี",
      EN: "Escalate immediately when a new device cannot be paired, or when the system suggests it is linked to the wrong account.",
    },
  },
  {
    id: "critical-alert",
    category: "urgent",
    icon: ShieldAlert,
    title: { TH: "ระบบแจ้งเตือนค่าผิดปกติรุนแรง", EN: "Critical System Alert" },
    summary: {
      TH: "ลูกค้าแจ้งว่ามี alert รุนแรงเกี่ยวกับน้ำ, ปั๊ม, หรือระบบหลัก",
      EN: "The customer reports a severe alert related to water, pumps, or another critical system.",
    },
    symptoms: {
      TH: ["มี alert สีแดง", "เครื่องหยุดทำงาน", "ค่าที่วัดได้กระทบการเพาะเลี้ยง"],
      EN: ["A red alert is shown", "The machine stopped working", "Measured values are affecting production"],
    },
    steps: {
      TH: [
        "ให้ลูกค้าหยุดใช้งานส่วนที่เสี่ยงทันทีถ้ากระทบความปลอดภัย",
        "ขอรูปหน้าจอ alert, ชื่ออุปกรณ์, และเวลาที่เกิดปัญหา",
        "ตรวจหน้า Maintenance หรือ Dashboard ว่ามี incident ต่อเนื่องหรือไม่",
        "แจ้งทีมเทคนิคพร้อมข้อมูลครบถ้วนโดยไม่รอให้ลูกค้าทดสอบหลายรอบ",
      ],
      EN: [
        "Ask the customer to stop using the affected part immediately if safety may be impacted.",
        "Collect a screenshot of the alert, the device name, and the incident time.",
        "Review Maintenance or Dashboard to confirm whether the incident is ongoing.",
        "Notify the technical team with complete details without delaying on repeated customer testing.",
      ],
    },
    response: {
      TH: "ได้รับแจ้งเหตุแล้วครับ กรณีนี้เป็นการแจ้งเตือนระดับสำคัญ รบกวนส่งรูปหน้าจอพร้อมชื่ออุปกรณ์และเวลาที่เกิดเหตุ ทีมเทคนิคจะเข้าตรวจสอบต่อให้เร่งด่วนทันทีครับ",
      EN: "We have received the incident. This is a critical alert, so please send a screenshot, the device name, and the exact time. Our technical team will handle it as an urgent case immediately.",
    },
    escalate: {
      TH: "เคสนี้ถือว่าเร่งด่วน ต้องส่งต่อทันที",
      EN: "This case is urgent and should be escalated immediately.",
    },
  },
];

export function SupportCenterPage({ language = "TH" }: SupportCenterPageProps) {
  const isTH = language === "TH";
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<IssueCategory>("all");

  const filteredIssues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return supportIssues.filter((issue) => {
      const matchCategory = activeCategory === "all" || issue.category === activeCategory;
      const haystack = [
        issue.title.TH,
        issue.title.EN,
        issue.summary.TH,
        issue.summary.EN,
        ...issue.symptoms.TH,
        ...issue.symptoms.EN,
      ]
        .join(" ")
        .toLowerCase();

      const matchQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchCategory && matchQuery;
    });
  }, [activeCategory, query]);

  const quickStats = [
    {
      icon: LifeBuoy,
      value: supportIssues.length,
      label: isTH ? "เคสตัวอย่างพร้อมตอบ" : "Ready-to-use Cases",
      tone: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Headset,
      value: isTH ? "5 ขั้น" : "5 Steps",
      label: isTH ? "ลำดับตรวจสอบหลัก" : "Core Troubleshooting Flow",
      tone: "text-sky-600 dark:text-sky-400",
      bg: "bg-sky-500/10",
    },
    {
      icon: AlertCircle,
      value: "24/7",
      label: isTH ? "พร้อมส่งต่อเคสด่วน" : "Urgent Escalation Ready",
      tone: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="flex-1 overflow-auto bg-background">
      <header className="border-b border-border bg-card/70 px-4 py-5 backdrop-blur-md sm:px-6 sm:py-6 lg:px-8 lg:py-7">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">
                <Headset className="h-3.5 w-3.5" />
                Customer Support Playbook
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {isTH ? "ศูนย์ช่วยตอบปัญหาลูกค้า" : "Customer Help Center"}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isTH
                  ? "รวมปัญหาที่พบบ่อย วิธีตอบลูกค้าแบบสุภาพ และจุดตัดสินใจว่าเมื่อไรควรส่งต่อทีมเทคนิค"
                  : "A practical library of common issues, response templates, and clear handoff rules for technical escalation."}
              </p>
            </div>

            <div className="w-full max-w-md">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={isTH ? "ค้นหาปัญหา เช่น offline, login, sensor" : "Search issues like offline, login, sensor"}
                  className="h-11 rounded-xl border-border bg-background pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:space-y-8 sm:p-6 lg:p-8">
        <section className="grid gap-4 md:grid-cols-3">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="border-border bg-card/80 shadow-sm">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className={`rounded-2xl p-3 ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.tone}`} />
                  </div>
                  <div>
                    <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)] xl:gap-8">
          <div className="space-y-6">
            <Card className="border-border bg-card/80">
              <CardHeader>
                <CardTitle>{isTH ? "เลือกหมวดปัญหา" : "Issue Categories"}</CardTitle>
                <CardDescription>
                  {isTH ? "เลือกหัวข้อเพื่อดูคำตอบที่ใช้งานได้เร็วขึ้น" : "Filter by category to reach the right response faster."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {issueCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant="ghost"
                    className={
                      activeCategory === category.id
                        ? "w-full justify-between rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-400 to-teal-400 px-5 py-6 text-base font-semibold text-white shadow-[0_14px_30px_rgba(45,212,191,0.24)] hover:from-emerald-400 hover:to-teal-400"
                        : "w-full justify-between rounded-2xl border border-slate-200 bg-white px-5 py-6 text-base font-semibold text-slate-800 shadow-sm hover:border-emerald-200 hover:bg-emerald-50/70 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:hover:border-emerald-900 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300"
                    }
                    onClick={() => setActiveCategory(category.id)}
                  >
                    <span>{isTH ? category.label.TH : category.label.EN}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/80">
              <CardHeader>
                <CardTitle>{isTH ? "ขั้นตอนตอบลูกค้าแนะนำ" : "Recommended Response Flow"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  isTH ? "รับปัญหาและสรุปอาการให้ตรงกันก่อน" : "Acknowledge the issue and restate the symptoms.",
                  isTH ? "ขอข้อมูลพื้นฐาน เช่น อุปกรณ์ เวลา และภาพหน้าจอ" : "Collect basics like device name, timestamp, and screenshots.",
                  isTH ? "นำลูกค้าตรวจจุดง่ายก่อน เช่น ไฟเลี้ยง, เน็ต, บัญชี" : "Start with simple checks like power, network, and account.",
                  isTH ? "หากยังไม่หาย ให้ใช้ข้อความตอบพร้อมส่งต่อ" : "If unresolved, use the prepared response and escalate.",
                  isTH ? "ปิดเคสด้วยสรุปสิ่งที่ทำไปและขั้นตอนถัดไป" : "Close with a summary of what was checked and what happens next.",
                ].map((step, index) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {index + 1}
                    </div>
                    <p className="text-sm text-muted-foreground">{step}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            {filteredIssues.length === 0 ? (
              <Card className="border-dashed border-border bg-card/80">
                <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-3 p-10 text-center">
                  <Search className="h-10 w-10 text-muted-foreground/60" />
                  <div className="text-lg font-medium text-foreground">
                    {isTH ? "ยังไม่พบหัวข้อที่ค้นหา" : "No matching issue found"}
                  </div>
                  <p className="max-w-md text-sm text-muted-foreground">
                    {isTH
                      ? "ลองเปลี่ยนคำค้น หรือเลือกหมวดใหม่ เช่น อุปกรณ์, บัญชี, หรือข้อมูลระบบ"
                      : "Try another keyword or switch categories such as Device, Account, or Data."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredIssues.map((issue) => {
                const Icon = issue.icon;

                return (
                  <Card key={issue.id} className="overflow-hidden border-border bg-card/90 shadow-sm">
                    <CardHeader className="border-b border-border/70 bg-muted/20">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="rounded-2xl bg-emerald-500/10 p-3">
                            <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <CardTitle className="text-xl">{isTH ? issue.title.TH : issue.title.EN}</CardTitle>
                            <CardDescription className="mt-1">{isTH ? issue.summary.TH : issue.summary.EN}</CardDescription>
                          </div>
                        </div>
                        <Badge variant="outline" className="w-fit border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          {isTH
                            ? issueCategories.find((category) => category.id === issue.category)?.label.TH
                            : issueCategories.find((category) => category.id === issue.category)?.label.EN}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-5 p-4 sm:p-5 lg:space-y-6 lg:p-6">
                      <div className="grid gap-5 xl:grid-cols-2 lg:gap-6">
                        <div>
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                            {isTH ? "อาการที่มักพบ" : "Common Symptoms"}
                          </h3>
                          <div className="space-y-2">
                            {(isTH ? issue.symptoms.TH : issue.symptoms.EN).map((symptom) => (
                              <div key={symptom} className="rounded-xl border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                                {symptom}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            {isTH ? "ขั้นตอนตรวจสอบ" : "Troubleshooting Steps"}
                          </h3>
                          <div className="space-y-2">
                            {(isTH ? issue.steps.TH : issue.steps.EN).map((step, index) => (
                              <div key={step} className="flex gap-3 rounded-xl border border-border bg-background/70 px-4 py-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                                  {index + 1}
                                </span>
                                <p className="text-sm text-muted-foreground">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-5">
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-700 dark:text-sky-300">
                            <Headset className="h-4 w-4" />
                            {isTH ? "ข้อความตอบลูกค้าพร้อมใช้" : "Ready-to-send Customer Reply"}
                          </div>
                          <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                            {isTH ? issue.response.TH : issue.response.EN}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
                          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                            <ShieldAlert className="h-4 w-4" />
                            {isTH ? "เกณฑ์การส่งต่อ" : "Escalation Rule"}
                          </div>
                          <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
                            {isTH ? issue.escalate.TH : issue.escalate.EN}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </section>
      </main>

    </div>
  );
}
