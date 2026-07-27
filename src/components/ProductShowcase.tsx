import { ArrowLeft, ArrowRight, ChevronDown, Droplets, Gauge, Radio, Sparkles } from "lucide-react";
import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import machineImage from "@/assets/images/generated/water_system_model_tall.png";
import { ImportedProductMachine3D } from "@/components/ImportedProductMachine3D";

type Props = { onBack: () => void };

type Chapter = {
  index: string;
  kicker: string;
  title: string;
  body: string;
  metric: string;
  metricLabel: string;
  side: "left" | "right";
  icon: typeof Sparkles;
  camera: { x: number; y: number; scale: number; rotateX: number; rotateY: number; rotateZ: number };
  hotspot: { x: number; y: number; label: string };
};

const chapters: Chapter[] = [
  {
    index: "01",
    kicker: "GREEN CROP NAT · NAT–01",
    title: "ระบบปลูกพืช\nที่คิดเป็นระบบ",
    body: "สถาปัตยกรรมฟาร์มอัจฉริยะขนาดกะทัดรัด รวมรางปลูก ระบบน้ำ เซนเซอร์ และชุดควบคุมไว้ในเครื่องเดียว",
    metric: "1",
    metricLabel: "ระบบที่เชื่อมต่อกันทั้งหมด",
    side: "left",
    icon: Sparkles,
    camera: { x: 13, y: 1, scale: 0.98, rotateX: 0, rotateY: 0, rotateZ: 0 },
    hotspot: { x: 49, y: 43, label: "NAT–01 SYSTEM" },
  },
  {
    index: "02",
    kicker: "PRECISION IRRIGATION",
    title: "ให้น้ำตรงจังหวะ\nที่พืชต้องการ",
    body: "น้ำถูกหมุนเวียนจากถังพัก ผ่านปั๊มและวาล์ว ไปยังรางปลูกอย่างแม่นยำ พร้อมนำกลับมาใช้ใหม่ในทุกวงจร",
    metric: "3×",
    metricLabel: "จุดควบคุมการไหลอิสระ",
    side: "right",
    icon: Droplets,
    camera: { x: -13, y: 13, scale: 1.28, rotateX: -3, rotateY: 9, rotateZ: 1 },
    hotspot: { x: 54, y: 37, label: "GROW BED" },
  },
  {
    index: "03",
    kicker: "REAL-TIME SENSING",
    title: "มองเห็นทุกการ\nเปลี่ยนแปลง",
    body: "เซนเซอร์ระดับน้ำและสถานะปั๊มส่งข้อมูลเข้าสู่แพลตฟอร์มแบบเรียลไทม์ ช่วยให้ตรวจพบความผิดปกติก่อนกระทบผลผลิต",
    metric: "24/7",
    metricLabel: "ติดตามสถานะอย่างต่อเนื่อง",
    side: "left",
    icon: Gauge,
    camera: { x: 15, y: -12, scale: 1.34, rotateX: 4, rotateY: -10, rotateZ: -1 },
    hotspot: { x: 41, y: 73, label: "WATER SENSOR" },
  },
  {
    index: "04",
    kicker: "NAT IoT PLATFORM",
    title: "ฟาร์มของคุณ\nอยู่ใกล้แค่ปลายนิ้ว",
    body: "ดูข้อมูล วิเคราะห์แนวโน้ม และควบคุมอุปกรณ์จากทุกที่ ผ่านแพลตฟอร์ม GreenCrop NAT ที่ออกแบบเพื่อการใช้งานจริง",
    metric: "LIVE",
    metricLabel: "ข้อมูลจากอุปกรณ์ถึงหน้าจอ",
    side: "right",
    icon: Radio,
    camera: { x: -16, y: -1, scale: 1.12, rotateX: 1, rotateY: 9, rotateZ: 0 },
    hotspot: { x: 76, y: 59, label: "IoT CONTROLLER" },
  },
];

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const smooth = (value: number) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export function ProductShowcase({ onBack }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>();
  const [progress, setProgress] = useState(0);
  const [finePointer, setFinePointer] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setFinePointer(window.matchMedia("(pointer: fine)").matches);
    const root = scrollRef.current;
    if (!root) return;

    const update = () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const max = Math.max(1, root.scrollHeight - root.clientHeight);
        setProgress(clamp(root.scrollTop / max));
      });
    };

    update();
    root.addEventListener("scroll", update, { passive: true });
    return () => {
      root.removeEventListener("scroll", update);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const chapterFloat = progress * (chapters.length - 1);
  const activeIndex = Math.min(chapters.length - 1, Math.round(chapterFloat));
  const fromIndex = Math.floor(chapterFloat);
  const toIndex = Math.min(chapters.length - 1, fromIndex + 1);
  const between = smooth(chapterFloat - fromIndex);
  const from = chapters[fromIndex];
  const to = chapters[toIndex];
  const interpolate = (key: "x" | "y" | "scale" | "rotateX" | "rotateY" | "rotateZ") => from.camera[key] + (to.camera[key] - from.camera[key]) * between;
  const camera = {
    x: interpolate("x"), y: interpolate("y"), scale: interpolate("scale"),
    rotateX: interpolate("rotateX"), rotateY: interpolate("rotateY"), rotateZ: interpolate("rotateZ"),
  };
  const active = chapters[activeIndex];
  const finalScene = activeIndex === chapters.length - 1;
  // The Blender-prepared GLB preserves the source machine geometry and now
  // carries web-ready normals, bevels, and physically based material response.
  const modelBlend = 1;

  const scrollToChapter = (index: number) => {
    const root = scrollRef.current;
    if (!root) return;
    root.scrollTo({ top: index * root.clientHeight, behavior: "smooth" });
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!finePointer) return;
    setTilt({
      x: (event.clientY / window.innerHeight - 0.5) * -3,
      y: (event.clientX / window.innerWidth - 0.5) * 5,
    });
  };

  return (
    <div
      ref={scrollRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
      className={`product-showcase relative h-[100svh] snap-y snap-mandatory overflow-y-auto overscroll-y-contain font-sans transition-colors duration-700 ${finalScene ? "bg-[#07110e] text-white" : "bg-[#f4f3ee] text-[#0a1511]"}`}
    >
      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <button
          type="button"
          onClick={onBack}
          className={`group flex h-11 items-center gap-2 rounded-full border px-4 text-xs font-semibold backdrop-blur-xl transition-all ${finalScene ? "border-white/15 bg-white/10 hover:bg-white/15" : "border-black/10 bg-white/70 hover:bg-white"}`}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          กลับหน้าหลัก
        </button>
        <div className="flex items-center gap-3">
          <span className={`hidden text-[9px] font-bold tracking-[.26em] sm:block ${finalScene ? "text-white/50" : "text-black/40"}`}>SMART AGRICULTURE SYSTEM</span>
          <span className={`rounded-full border px-4 py-2 text-[10px] font-black tracking-[.24em] backdrop-blur-xl ${finalScene ? "border-white/15 bg-white/10" : "border-black/10 bg-white/70"}`}>GREENCROP NAT</span>
        </div>
      </header>

      <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
        <div className={`absolute inset-0 transition-opacity duration-700 ${finalScene ? "opacity-0" : "opacity-100"} bg-[linear-gradient(rgba(9,21,17,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(9,21,17,.045)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(circle_at_center,black,transparent_84%)]`} />
        <div className={`absolute left-1/2 top-1/2 h-[min(82vw,900px)] w-[min(82vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-700 ${finalScene ? "border-emerald-300/10 bg-[radial-gradient(circle,rgba(16,185,129,.18),transparent_68%)]" : "border-black/[.035] bg-[radial-gradient(circle,rgba(190,242,100,.3),rgba(255,255,255,.08)_49%,transparent_70%)]"}`} />
        <p className={`absolute bottom-[-3vw] left-1/2 -translate-x-1/2 whitespace-nowrap text-[clamp(8rem,22vw,22rem)] font-black leading-none tracking-[-0.09em] transition-colors duration-700 ${finalScene ? "text-white/[.025]" : "text-black/[.025]"}`}>NAT·01</p>

        <div
          className="showcase-product-enter absolute left-1/2 top-1/2 hidden h-[72vh] max-h-[760px] min-h-[420px] w-[54vh] max-w-[570px] min-w-[315px] will-change-transform sm:block"
          style={{
            transform: `perspective(1200px) translate(calc(-50% + ${camera.x}vw), calc(-50% + ${camera.y}vh)) scale(${camera.scale}) rotateX(${camera.rotateX + tilt.x}deg) rotateY(${camera.rotateY + tilt.y}deg) rotateZ(${camera.rotateZ}deg)`,
            transition: "transform 100ms cubic-bezier(.2,.7,.2,1)",
            transformStyle: "preserve-3d",
          }}
        >
          <div className="absolute bottom-[2%] left-[7%] h-[9%] w-[86%] rounded-[50%] bg-black/20 blur-2xl" />
          {modelBlend > 0 && (
            <div className={`relative h-full w-full transition-[filter,opacity] duration-500 ${finalScene ? "brightness-[.88] contrast-[1.08]" : ""}`} style={{ opacity: modelBlend }}>
              <ImportedProductMachine3D progress={progress} activeIndex={activeIndex} />
            </div>
          )}
          <img
            src={machineImage}
            alt="ระบบปลูกพืชน้ำหมุนเวียน GreenCrop NAT รุ่น NAT-01"
            className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_38px_34px_rgba(5,15,12,.2)] transition-opacity duration-500"
            style={{ opacity: 1 - modelBlend }}
          />

          {activeIndex === 1 && (
            <svg viewBox="0 0 100 140" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
              <path d="M30 108 L30 78 L25 78 L25 50 L74 50 L74 82 L64 82 L64 108" fill="none" stroke="rgba(14,165,233,.16)" strokeWidth="3.2" strokeLinecap="round" />
              <path d="M30 108 L30 78 L25 78 L25 50 L74 50 L74 82 L64 82 L64 108" className="showcase-flow" fill="none" stroke="#38bdf8" strokeWidth="1.25" strokeLinecap="round" strokeDasharray="4 8" />
            </svg>
          )}

          {activeIndex === 2 && (
            <div className="absolute inset-[10%] overflow-hidden rounded-[2rem] border border-emerald-500/15">
              <span className="showcase-scan absolute inset-x-0 top-0 h-px bg-emerald-400 shadow-[0_0_24px_5px_rgba(52,211,153,.42)]" />
              <span className="absolute left-[13%] top-[65%] rounded-full border border-emerald-500/20 bg-white/90 px-3 py-1.5 text-[7px] font-black tracking-[.14em] text-emerald-900 shadow-xl backdrop-blur-md">LEVEL · 72%</span>
              <span className="absolute right-[3%] top-[50%] rounded-full border border-emerald-500/20 bg-emerald-950 px-3 py-1.5 text-[7px] font-black tracking-[.14em] text-lime-300 shadow-xl">PUMP · ACTIVE</span>
              <span className="absolute left-[38%] top-[36%] rounded-full border border-emerald-500/20 bg-white/90 px-3 py-1.5 text-[7px] font-black tracking-[.14em] text-emerald-900 shadow-xl backdrop-blur-md">FLOW · NORMAL</span>
            </div>
          )}

          <div className="absolute z-20 transition-all duration-500" style={{ left: `${active.hotspot.x}%`, top: `${active.hotspot.y}%` }}>
            <span className={`absolute -left-4 -top-4 h-8 w-8 animate-ping rounded-full border ${finalScene ? "border-lime-300/60" : "border-emerald-600/50"}`} />
            <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-[5px] border-white bg-emerald-500 shadow-[0_0_0_1px_rgba(15,23,42,.2),0_0_24px_rgba(16,185,129,.9)]" />
            <span className={`absolute left-5 top-[-1px] h-px w-12 ${finalScene ? "bg-white/50" : "bg-black/35"}`} />
            <span className={`absolute left-[68px] top-[-12px] whitespace-nowrap rounded-full px-3 py-1.5 text-[8px] font-black tracking-[.18em] shadow-xl ${finalScene ? "bg-lime-300 text-emerald-950" : "bg-[#081510] text-white"}`}>{active.hotspot.label}</span>
          </div>

          {activeIndex === 1 && [0, 1, 2, 3, 4].map((item) => (
            <span key={item} className="absolute top-[37%] h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400 shadow-[0_0_14px_#0ea5e9]" style={{ left: `${39 + item * 7}%`, animationDelay: `${item * 140}ms` }} />
          ))}
        </div>

        <div className="absolute inset-x-0 top-[9%] h-[42vh] sm:hidden">
          <div className={`absolute left-1/2 top-1/2 h-[72vw] w-[72vw] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl ${finalScene ? "bg-emerald-500/10" : "bg-lime-200/25"}`} />
          <img
            src={machineImage}
            alt="ระบบปลูกพืชน้ำหมุนเวียน GreenCrop NAT รุ่น NAT-01"
            className={`relative mx-auto h-full w-[88%] object-contain drop-shadow-[0_24px_22px_rgba(5,15,12,.2)] ${finalScene ? "brightness-[.88] contrast-[1.08]" : ""}`}
          />
          <div className="absolute bottom-[9%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#081510] px-3 py-1.5 text-[8px] font-black tracking-[.16em] text-white shadow-lg">
            {active.hotspot.label}
          </div>
        </div>
      </div>

      <div className="pointer-events-none fixed inset-0 z-20">
        {chapters.map((chapter, index) => {
          const Icon = chapter.icon;
          const distance = Math.abs(chapterFloat - index);
          const visible = clamp(1 - distance * 2.1);
          const offset = (index - chapterFloat) * 52;
          const isRight = chapter.side === "right";
          return (
            <article
              key={chapter.index}
              className={`absolute top-[72%] w-[calc(100%-2rem)] max-w-[440px] rounded-[1.75rem] border border-white/50 bg-[#f4f3ee]/90 px-5 py-5 text-left shadow-[0_24px_70px_-42px_rgba(5,15,12,.65)] backdrop-blur-md sm:top-1/2 sm:w-[37vw] sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none sm:backdrop-blur-none ${isRight ? "left-4 sm:left-auto sm:right-10 sm:text-right lg:right-16" : "left-4 sm:left-10 lg:left-16"} ${finalScene ? "border-white/10 bg-[#07110e]/90" : ""}`}
              style={{ opacity: visible, transform: `translateY(calc(-50% + ${offset}px))`, visibility: distance < 0.75 ? "visible" : "hidden" }}
            >
              <div className={`mb-3 flex items-center gap-3 sm:mb-5 ${isRight ? "sm:justify-end" : "justify-start"}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full sm:h-11 sm:w-11 ${finalScene ? "bg-lime-300 text-emerald-950" : "bg-[#081510] text-lime-300"}`}><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></span>
                <span className={`text-[10px] font-black tracking-[.25em] ${finalScene ? "text-lime-200/70" : "text-emerald-700"}`}>{chapter.kicker}</span>
              </div>
              <h1 className="whitespace-pre-line text-[2.2rem] font-semibold leading-[.86] tracking-[-.062em] sm:text-[clamp(2.55rem,5vw,5.8rem)]">{chapter.title}</h1>
              <p className={`mt-4 max-w-[350px] text-xs leading-5 sm:mt-6 sm:text-base sm:leading-7 ${isRight ? "sm:ml-auto" : "mr-auto"} ${finalScene ? "text-white/60" : "text-slate-600"}`}>{chapter.body}</p>
              <div className={`mt-4 flex items-end gap-3 sm:mt-7 ${isRight ? "sm:justify-end" : "justify-start"}`}>
                <strong className="text-2xl font-semibold tracking-[-.05em] sm:text-3xl">{chapter.metric}</strong>
                <span className={`mb-1 max-w-[130px] text-[10px] font-semibold leading-4 ${finalScene ? "text-white/45" : "text-slate-500"}`}>{chapter.metricLabel}</span>
              </div>
              {index === chapters.length - 1 && (
                <button type="button" onClick={onBack} className="pointer-events-auto mt-4 inline-flex items-center gap-2 rounded-full bg-lime-300 px-5 py-2.5 text-xs font-bold text-emerald-950 shadow-[0_18px_50px_-20px_rgba(190,242,100,.8)] transition hover:-translate-y-0.5 hover:bg-lime-200 sm:mt-8 sm:px-6 sm:py-3 sm:text-sm">
                  เข้าสู่แพลตฟอร์ม <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </article>
          );
        })}
      </div>

      <nav className="fixed bottom-7 right-6 z-40 hidden items-end gap-2 sm:flex sm:flex-col" aria-label="เลือกส่วนการนำเสนอ">
        {chapters.map((chapter, index) => (
          <button key={chapter.index} type="button" onClick={() => scrollToChapter(index)} aria-label={`ไปยังส่วนที่ ${index + 1}`} className={`pointer-events-auto block h-3 border-0 bg-transparent p-0 transition-all ${activeIndex === index ? "w-14" : "w-7"}`}>
            <span className={`block h-px w-full ${activeIndex === index ? finalScene ? "bg-lime-300" : "bg-emerald-700" : finalScene ? "bg-white/25" : "bg-black/20"}`} />
          </button>
        ))}
        <span className={`mt-1 text-[9px] font-black tracking-[.22em] ${finalScene ? "text-white/50" : "text-black/40"}`}>{active.index} / 0{chapters.length}</span>
      </nav>

      {progress < 0.08 && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[#081510] px-4 py-2 text-[9px] font-bold tracking-[.12em] text-white shadow-xl">
          เลื่อนเพื่อสำรวจ <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
        </div>
      )}
      <div className="fixed bottom-0 left-0 z-50 h-[3px] bg-lime-300 transition-[width] duration-100" style={{ width: `${progress * 100}%` }} />

      {chapters.map((chapter, index) => <section key={chapter.index} className="h-[100svh] snap-start" aria-label={`ส่วนที่ ${index + 1}: ${chapter.title.replace("\n", " ")}`} />)}
      <span className="sr-only">ส่วนที่ {activeIndex + 1} จาก {chapters.length}</span>
      {!finePointer && <span className="sr-only">เลื่อนหน้าจอเพื่อดูเนื้อหาส่วนถัดไป</span>}
    </div>
  );
}
