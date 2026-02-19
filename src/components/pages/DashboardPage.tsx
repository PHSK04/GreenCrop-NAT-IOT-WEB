import { useMachine } from "../../contexts/MachineContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { 
  Power, 
  Activity, 
  Droplets, 
  Gauge, 
  Wind, 
  Beaker, 
  Zap, 
  Database,
  Cpu
} from "lucide-react";
import machineModel from "@/assets/images/machine_model.png";
import { MetricsChart } from "../MetricsChart";


interface DashboardPageProps {
  language?: string;
}

const translations = {
  EN: {
    title: "Smart Farm Dashboard",
    subtitle: "Real-time machine control and analytics",
    online: "System Online",
    offline: "System Offline",
    visualizer: "System Visualizer",
    visualizerDesc: "Real-time digital twin representation",
    masterControl: "Master Control",
    running: "Running",
    stopped: "Stopped",
    autoSeq: "Automatic Sequence",
    manualMode: "Manual Mode",
    uptime: "Uptime",
    pumpStatus: "Pump Status",
    tankLevels: "Tank Levels & Flow",
    filling: "Filling Tank",
    idle: "Idle",
    sensorNetwork: "Sensor Network",
    sensorsOk: "All sensors communicating",
    standby: "Standby Mode",
    statusOnline: "ONLINE",
    statusSleep: "SLEEP",
    metrics: {
      ph: { title: "pH Balance", desc: "Acidity Level" },
      do: { title: "Dissolved Oxygen", desc: "Oxygen Saturation" },
      ec: { title: "Conductivity (EC)", desc: "Nutrient Concentration" },
      pressure: { title: "Pressure", desc: "System Pressure" },
      flow: { title: "Flow Rate", desc: "Water Movement" }
    },
    pumpNames: ["Water Pump", "Water Pump", "Solid pump", "Water Pump", "Air Pump"]
  },
  TH: {
    title: "แดชบอร์ดสมาร์ทฟาร์ม",
    subtitle: "การควบคุมเครื่องจักรและวิเคราะห์ผลแบบเรียลไทม์",
    online: "ระบบออนไลน์",
    offline: "ระบบออฟไลน์",
    visualizer: "แบบจำลองระบบ",
    visualizerDesc: "แบบจำลองดิจิทัลทวินแบบเรียลไทม์",
    masterControl: "การควบคุมหลัก",
    running: "กำลังทำงาน",
    stopped: "หยุดทำงาน",
    autoSeq: "ลำดับอัตโนมัติ",
    manualMode: "โหมดควบคุมเอง",
    uptime: "เวลาทำงานต่อเนื่อง",
    pumpStatus: "สถานะปั๊ม",
    tankLevels: "ระดับน้ำและการไหล",
    filling: "กำลังเติมน้ำถัง",
    idle: "ว่าง",
    sensorNetwork: "เครือข่ายเซนเซอร์",
    sensorsOk: "เซนเซอร์ทั้งหมดสื่อสารปกติ",
    standby: "โหมดสแตนด์บาย",
    statusOnline: "ออนไลน์",
    statusSleep: "สถานะหลับ",
    metrics: {
      ph: { title: "ค่าความเป็นกรดด่าง (pH)", desc: "ระดับความเป็นกรด" },
      do: { title: "ออกซิเจนในน้ำ (DO)", desc: "ความอิ่มตัวของออกซิเจน" },
      ec: { title: "ค่าการนำไฟฟ้า (EC)", desc: "ความเข้มข้นของสารอาหาร" },
      pressure: { title: "แรงดันน้ำ", desc: "แรงดันในระบบ" },
      flow: { title: "อัตราการไหล", desc: "การเคลื่อนที่ของน้ำ" }
    },
    pumpNames: ["น้ำ", "ปั้มน้ำ", "ปั้มฉีดสารละลาย", "น้ำ", "ปั้มลม"]
  }
};

export function DashboardPage({ language = "EN" }: DashboardPageProps) {
  const t = translations[language as keyof typeof translations] || translations.EN;
  const { 
    isOn, 
    toggleMachine, 
    resetUptime,
    uptimeSeconds,
    pressure, 
    flowRate, 
    pumps, 
    activeTank, 
    ecValue 
  } = useMachine();

  const hasAnyPumpSignal = pumps.some(Boolean);

  const formatUptime = (seconds: number) => {
    const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    return hh + ":" + mm + ":" + ss;
  };

  return (
    <>
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b border-border px-4 py-4 md:px-8 md:py-6 z-10 sticky top-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-3 tracking-tight">
              <Activity className="w-6 h-6 text-primary" />
              {t.title}
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm font-medium mt-1">{t.subtitle}</p>
          </div>
          <Badge 
            variant={isOn ? "default" : "secondary"}
            className={`px-4 py-1.5 text-xs font-mono border self-end sm:self-auto ${isOn ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" : "bg-muted text-muted-foreground border-border"}`}
          >
            {isOn ? (
              <span className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {t.online.toUpperCase()}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-muted-foreground"></span>
                {t.offline.toUpperCase()}
              </span>
            )}
          </Badge>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-8 relative z-10">
        {/* Machine Control Section (Hero) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          
          {/* Left Column: Visual Model */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="bg-card/50 border-border backdrop-blur-xl overflow-hidden h-full min-h-[500px] shadow-lg">
              <CardHeader>
                <CardTitle className="text-foreground">{t.visualizer}</CardTitle>
                <CardDescription className="text-muted-foreground">{t.visualizerDesc}</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center p-8 bg-gradient-to-b from-transparent to-background/30 rounded-b-xl h-full">
                <div className="relative w-full h-full flex items-center justify-center">
                   {/* Glow effect */}
                   {isOn && <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full transition-all duration-1000"></div>}
                  
                   <img 
                    src={machineModel} 
                    alt="Water System Model" 
                    className="max-h-[500px] w-auto object-contain drop-shadow-2xl transition-all duration-700"
                    style={{ 
                      filter: isOn ? 'brightness(1.1) contrast(1.05)' : 'grayscale(1)',
                      transform: isOn ? 'scale(1.02)' : 'scale(1)'
                    }}
                   />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Controls & Pumps */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Master Control */}
            <Card className="bg-card/80 border-border shadow-xl backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Power className="w-5 h-5" />
                  {t.masterControl}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                   <div className="flex items-center gap-4">
                     <div 
                       onClick={toggleMachine}
                       className={`
                         cursor-pointer w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300
                         ${isOn 
                           ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
                           : "bg-muted border-border text-muted-foreground hover:border-muted-foreground/50"
                         }
                       `}
                     >
                       <Power className={`w-8 h-8 ${isOn ? "scale-110" : "scale-100"}`} />
                     </div>
                      <div>
                        <h3 className="text-lg font-medium text-foreground">
                          {isOn ? t.running : t.stopped}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {isOn ? t.autoSeq : t.manualMode}
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-xs text-muted-foreground">{t.uptime}</p>
                      <p className="font-mono text-primary">{formatUptime(uptimeSeconds)}</p>
                      <button
                        onClick={resetUptime}
                        className="mt-1 inline-flex h-9 w-28 items-center justify-center gap-1 rounded-md border border-red-400/30 bg-red-600 text-[11px] font-bold text-white transition-colors hover:bg-red-500"
                      >
                        <span>↺</span>
                        {language === "TH" ? "รีเซ็ตเวลา" : "RESET"}
                      </button>
                    </div>
                </div>

                {/* 4 Pump Status Grid */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">{t.pumpStatus}</h4>
                  <div className="grid grid-cols-2 min-[450px]:grid-cols-3 md:grid-cols-5 gap-2">
                    {pumps.map((isActive, idx) => {
                      const active = isOn && (isActive || (!hasAnyPumpSignal && idx === 0));
                      return (
                      <div key={idx} className={`
                        flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-300 min-h-[80px]
                        ${active 
                          ? "bg-blue-500/10 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.1)]" 
                          : "bg-muted/50 border-border opacity-70"
                        }
                      `}>
                         <div className={`w-1.5 h-1.5 rounded-full mb-1.5 ${active ? "bg-blue-500 animate-pulse" : "bg-muted-foreground"}`}></div>
                         <Cpu className={`w-4 h-4 mb-1 ${active ? "text-blue-500 dark:text-blue-400" : "text-muted-foreground"}`} />
                         <span className="text-[9px] text-muted-foreground font-medium text-center leading-tight line-clamp-2 h-6 flex items-center">{t.pumpNames[idx]}</span>
                         <span className="text-[8px] text-muted-foreground font-mono mt-0.5">P{idx + 1}</span>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tank Status Visualizer */}
            <Card className="bg-card/50 border-border shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  <span>{t.tankLevels}</span>
                  <Badge variant="outline" className="border-border text-muted-foreground text-[10px]">
                    {isOn && activeTank ? `${t.filling} ${activeTank}` : t.idle}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[1, 2, 3].map((tankId) => {
                    const isFilled = isOn && !!activeTank && activeTank >= tankId;
                    const isCurrent = isOn && activeTank === tankId;
                    return (
                      <div key={tankId} className="flex flex-col items-center gap-2 group w-full">
                        <div className={`
                          relative w-full h-20 sm:h-24 rounded-lg border-2 flex items-end justify-center overflow-hidden transition-all duration-500
                          ${isCurrent ? "border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]" : "border-border bg-muted/30"}
                        `}>
                          {/* Water Level Animation */}
                          <div className={`
                            absolute bottom-0 left-0 right-0 bg-cyan-500/20 transition-all duration-1000
                            ${(isFilled || isCurrent) ? (isCurrent ? "h-3/4 animate-pulse" : "h-full") : "h-1/4"}
                          `}></div>
                          
                          <Database className={`relative z-10 w-5 h-5 sm:w-6 sm:h-6 mb-6 sm:mb-8 transition-colors ${(isFilled || isCurrent) ? "text-cyan-600 dark:text-cyan-200" : "text-muted-foreground"}`} />
                          <span className="absolute bottom-1 sm:bottom-2 text-[10px] sm:text-xs font-bold text-muted-foreground">T{tankId}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Sensor Health Status */}
            <Card className="bg-card/50 border-border shadow-lg">
               <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isOn ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"}`}>
                       <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{t.sensorNetwork}</h4>
                      <p className="text-xs text-muted-foreground">{isOn ? t.sensorsOk : t.standby}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <span className={`text-xs font-bold px-2 py-1 rounded bg-muted border border-border ${isOn ? "text-emerald-500" : "text-muted-foreground"}`}>
                       {isOn ? t.statusOnline : t.statusSleep}
                     </span>
                  </div>
               </CardContent>
            </Card>

          </div>
        </div>
        
        {/* Water Quality & Analytics Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          {[
            {
              title: t.metrics.ph.title,
              value: "7.2",
              status: "Optimal", 
              desc: t.metrics.ph.desc,
              icon: Beaker,
              color: "text-blue-500 dark:text-blue-400",
              bgColor: "bg-blue-500/10",
            },
            {
              title: t.metrics.do.title,
              value: "6.8",
              unit: "mg/L", 
              status: "Good",
              desc: t.metrics.do.desc,
              icon: Wind,
              color: "text-cyan-600 dark:text-cyan-400",
              bgColor: "bg-cyan-500/10",
            },
            {
              title: t.metrics.ec.title,
              value: isOn ? ecValue.toFixed(1) : "0.0",
              unit: "mS/cm",
              status: "Normal",
              desc: t.metrics.ec.desc,
              icon: Zap,
              color: "text-yellow-600 dark:text-yellow-400", 
              bgColor: "bg-yellow-500/10",
              detail: "Current capability to conduct electrical current."
            },
             {
              title: t.metrics.pressure.title,
              value: pressure.toFixed(1),
              unit: "BAR",
              status: "Stable",
              desc: t.metrics.pressure.desc,
              icon: Gauge,
              color: "text-purple-600 dark:text-purple-400",
              bgColor: "bg-purple-500/10",
            },
            {
              title: t.metrics.flow.title,
              value: flowRate.toFixed(1),
              unit: "L/min",
              status: "Active",
              desc: t.metrics.flow.desc,
              icon: Droplets,
              color: "text-green-600 dark:text-green-400",
              bgColor: "bg-green-500/10",
            }
          ].map((metric) => (
            <Card key={metric.title} className="bg-card/50 border-border hover:border-border transition-all duration-300 shadow-lg backdrop-blur-sm">
              <CardHeader className="pb-2 p-4">
                <div className="flex justify-between items-start">
                  <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                    <metric.icon className={`w-5 h-5 ${metric.color}`} />
                  </div>
                  {metric.status && (
                    <Badge variant="outline" className="bg-muted/50 border-border text-muted-foreground text-[10px] uppercase tracking-wider">
                      {metric.status}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-foreground">{metric.value}</span>
                  {metric.unit && <span className="text-xs text-muted-foreground font-medium">{metric.unit}</span>}
                </div>
                <h3 className="text-sm font-semibold text-foreground">{metric.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {metric.desc}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="mb-10">
            <MetricsChart />
        </div>


      </main>
    </>
  );
}