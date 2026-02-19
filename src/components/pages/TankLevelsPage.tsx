import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { 
  Droplets, 
  Activity, 
  Settings, 
  RefreshCw,
  ArrowRight,
  Waves,
  Gauge,
  Power,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertCircle,
  Sun,
  Leaf
} from "lucide-react";

// Generic Tank Card Component (used for Tank 3)
const TankCard = ({ name, type, capacity, currentLevel, status, flowRate, pressure, sensors, isFilling, onToggle }: any) => {
  return (
    <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md overflow-hidden relative">
      {/* Water Level Visual Background */}
      <div 
        className="absolute bottom-0 left-0 w-full bg-blue-500/10 transition-all duration-1000 ease-in-out z-0" 
        style={{ height: `${currentLevel}%` }}
      />
      <div 
        className="absolute bottom-0 left-0 w-full h-2 bg-blue-500/20 animate-pulse z-0" 
        style={{ bottom: `${currentLevel}%` }}
      />
      
      <CardHeader className="relative z-10 pb-4">
        <div className="flex justify-between items-start">
          <div>
             <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">{type}</Badge>
                {status === 'Filling' && <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50 animate-pulse">Filling</Badge>}
                {status === 'Draining' && <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50">Draining</Badge>}
                {status === 'Stable' && <Badge className="bg-muted/20 text-muted-foreground border-muted-foreground/50">Stable</Badge>}
             </div>
             <CardTitle className="text-xl text-foreground">{name}</CardTitle>
          </div>
          <div className="text-right">
             <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{currentLevel}%</div>
             <div className="text-xs text-muted-foreground">{Math.round((currentLevel / 100) * capacity)}L / {capacity}L</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10 space-y-6">
        {/* Progress Bar */}
        <div className="space-y-1">
           <Progress value={currentLevel} className="h-2 bg-secondary" indicatorClassName={status === 'Filling' ? 'bg-emerald-500' : 'bg-blue-500'} />
           <div className="flex justify-between text-xs text-muted-foreground">
              <span>Empty</span>
              <span>Full</span>
           </div>
        </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 gap-4">
               <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                     <Waves className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                     <span className="text-xs text-muted-foreground">Water Level</span>
                  </div>
                  <div className="text-lg font-semibold text-foreground">{flowRate} <span className="text-xs text-muted-foreground">cm</span></div>
               </div>
            </div>

        {/* Detailed Sensors */}
        <div className="space-y-2">
           <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Water Quality</h4>
           <div className="grid grid-cols-3 gap-2">
              {sensors.map((sensor: any, i: number) => (
                 <div key={i} className="px-2 py-1 rounded bg-muted/30 border border-border text-center">
                    <div className="text-xs text-muted-foreground">{sensor.name}</div>
                    <div className="text-sm font-medium text-foreground">{sensor.value}</div>
                 </div>
              ))}
           </div>
        </div>

        {/* Controls */}
        <div className="flex gap-2 pt-2">
           <Button 
             variant={isFilling ? "destructive" : "default"} 
             className={`w-full gap-2 ${isFilling ? 'bg-red-500/10 text-red-600 dark:text-red-500 hover:bg-red-500/20' : 'bg-blue-600 hover:bg-blue-700'}`}
             onClick={onToggle}
           >
              <Power className="w-4 h-4" />
              {isFilling ? "Stop Pump" : "Start Fill"}
           </Button>
           <Button variant="outline" className="w-full gap-2 border-border hover:bg-muted text-muted-foreground hover:text-foreground">
              <Settings className="w-4 h-4" />
              Config
           </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface MachineControlPageProps {
  tank2On: boolean;
  setTank2On: (value: boolean) => void;
  tank3On: boolean;
  setTank3On: (value: boolean) => void;
  language: string;
}

const translations = {
  EN: {
    tank1: "Raw Water Tank (1)",
    sourceRain: "Source: Rainwater",
    monitoring: "Monitoring",
    systemStatus: "System Status",
    resting: "Resting",
    autoMode: "Auto Mode",
    restingProgress: "Water Resting Progress",
    timeRemaining: "Time Remaining",
    waterLevel: "Water Level",
    pumpToT2: "Pump to Tank 2",
    distributionTank: "Distribution Tank (3)",
    cultivationPond: "Wolffia Cultivation Pond (4)",
    waterDepth: "Water Depth",
    totalVolume: "Total Volume",
    optimalGrowthZone: "Optimal Growth Zone",
    harvestStatus: "Harvest Status",
    ready: "Ready",
    biomassDensity: "Biomass density optimal",
    startHarvest: "Start Harvest",
    readiness: "Readiness"
  },
  TH: {
    tank1: "ถังน้ำดิบ (1)",
    sourceRain: "แหล่ง: น้ำฝน",
    monitoring: "กำลังตรวจสอบ",
    systemStatus: "สถานะระบบ",
    resting: "กำลังพักน้ำ",
    autoMode: "โหมดอัตโนมัติ",
    restingProgress: "ความคืบหน้าการพักน้ำ",
    timeRemaining: "เวลาที่เหลือ",
    waterLevel: "ระดับน้ำ",
    pumpToT2: "สูบไปถัง 2",
    distributionTank: "ถังจ่ายน้ำ (3)",
    cultivationPond: "บ่อเพาะเลี้ยงไข่น้ำ (4)",
    waterDepth: "ระดับความลึก",
    totalVolume: "ปริมาตรทั้งหมด",
    optimalGrowthZone: "โซนการเจริญเติบโตที่เหมาะสม",
    harvestStatus: "สถานะการเก็บเกี่ยว",
    ready: "พร้อมเก็บเกี่ยว",
    biomassDensity: "ความหนาแน่นเหมาะสม",
    startHarvest: "เริ่มเก็บเกี่ยว",
    readiness: "ความพร้อม"
  }
};

export function TankLevelsPage({ tank2On, setTank2On, tank3On, setTank3On, language }: MachineControlPageProps) {
  const t = translations[language as keyof typeof translations] || translations.EN;
  // Safe defaults if props not passed (e.g. before Dashboard update)
  const t2State = tank2On ?? false; // Default false for "Auto-Dose"
  const t3State = tank3On ?? false; // Default false for "Start Fill"
  
  const toggleT2 = () => setTank2On && setTank2On(!t2State);
  const toggleT3 = () => setTank3On && setTank3On(!t3State);

  return (
    <>
      <header className="bg-card/50 border-b border-border px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Droplets className="w-6 h-6 text-primary" />
              Tank Levels & Flow Control
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time water management and pump status</p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <span className="text-xs font-medium text-primary">System Nominal</span>
             </div>
             <Button variant="outline" className="border-border hover:bg-muted text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
             </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 ">
        
        {/* Metric Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           <Card className="rounded-xl border border-border bg-card/50 p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400"><Droplets className="w-6 h-6" /></div>
              <div>
                 <p className="text-sm text-muted-foreground">Total Reserve</p>
                 <p className="text-2xl font-bold text-foreground">4,250 <span className="text-sm font-normal text-muted-foreground">L</span></p>
              </div>
           </Card>
           <Card className="rounded-xl border border-border bg-card/50 p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-500 dark:text-cyan-400"><Waves className="w-6 h-6" /></div>
              <div>
                 <p className="text-sm text-muted-foreground">Net Flow In</p>
                 <p className="text-2xl font-bold text-foreground">24.5 <span className="text-sm font-normal text-muted-foreground">L/min</span></p>
              </div>
           </Card>
           <Card className="rounded-xl border border-border bg-card/50 p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-purple-500/10 text-purple-500 dark:text-purple-400"><Gauge className="w-6 h-6" /></div>
              <div>
                 <p className="text-sm text-muted-foreground">Sys Pressure</p>
                 <p className="text-2xl font-bold text-foreground">42 <span className="text-sm font-normal text-muted-foreground">PSI</span></p>
              </div>
           </Card>
           <Card className="rounded-xl border border-border bg-card/50 p-4 flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400"><AlertCircle className="w-6 h-6" /></div>
              <div>
                 <p className="text-sm text-muted-foreground">Alerts</p>
                 <p className="text-2xl font-bold text-foreground">0 <span className="text-sm font-normal text-muted-foreground">Active</span></p>
              </div>
           </Card>
        </div>

        {/* Tanks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           
           {/* Tank 1: Raw Water - Updated Logic with Countdown */}
           <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md overflow-hidden relative">
              {/* Water Level Visual Background */}
              <div 
                className="absolute bottom-0 left-0 w-full bg-blue-500/10 transition-all duration-1000 ease-in-out z-0" 
                style={{ height: '85%' }}
              />
              <div 
                className="absolute bottom-0 left-0 w-full h-2 bg-blue-500/20 animate-pulse z-0" 
                style={{ bottom: '85%' }}
              />
              
              <CardHeader className="relative z-10 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">{t.sourceRain}</Badge>
                        <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 animate-pulse">{t.monitoring}</Badge>
                     </div>
                     <CardTitle className="text-xl text-foreground">{t.tank1}</CardTitle>
                  </div>
                  <div className="text-right">
                     <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">85%</div>
                     <div className="text-xs text-muted-foreground">85L / 100L</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10 space-y-6">
                {/* Status Indicators */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                        <span className="text-sm font-medium text-muted-foreground">{t.systemStatus}: <span className="text-amber-600 dark:text-amber-400">{t.resting}</span></span>
                    </div>
                    <Badge variant="secondary" className="bg-secondary text-secondary-foreground">{t.autoMode}</Badge>
                </div>

                {/* Resting Timer Progress */}
                <div className="space-y-2">
                   <div className="flex justify-between items-end">
                      <span className="text-xs text-muted-foreground">{t.restingProgress}</span>
                      <span className="text-sm font-bold text-muted-foreground">18h 45m / 20h</span>
                   </div>
                   <Progress value={93.75} className="h-2 bg-secondary" indicatorClassName="bg-amber-500" />
                   
                   {/* TIME REMAINING DISPLAY */}
                   <div className="flex items-center justify-between bg-card p-2 rounded border border-border mt-2">
                      <span className="text-xs text-muted-foreground">{t.timeRemaining}:</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400 animate-pulse">1 hr 15 mins</span>
                   </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-1 gap-4">
                   <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="flex items-center gap-2 mb-1">
                         <Waves className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
                         <span className="text-xs text-muted-foreground">{t.waterLevel}</span>
                      </div>
                      <div className="text-lg font-semibold text-foreground">85 <span className="text-xs text-muted-foreground">cm</span></div>
                   </div>
                </div>

                {/* Controls */}
                <div className="pt-2">
                   <Button 
                     variant="ghost"
                     className="w-full gap-2 text-muted-foreground border border-border cursor-not-allowed hover:bg-transparent"
                   >
                      <RefreshCw className="w-4 h-4" />
                      Waiting for Timer...
                   </Button>
                </div>
              </CardContent>
            </Card>

           {/* Tank 2: Preparation Tank - Capacity 100L Logic */}
           <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md overflow-hidden relative">
              {/* Water Level Visual Background */}
              <div 
                className="absolute bottom-0 left-0 w-full bg-blue-500/10 transition-all duration-1000 ease-in-out z-0" 
                style={{ height: '45%' }}
              />
              <div 
                className="absolute bottom-0 left-0 w-full h-2 bg-blue-500/20 animate-pulse z-0" 
                style={{ bottom: '45%' }}
              />
              
              <CardHeader className="relative z-10 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                     <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">Process: pH & Nutrient Mix</Badge>
                        <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 animate-pulse">Holding (Adjusting)</Badge>
                     </div>
                     <CardTitle className="text-xl text-foreground">Preparation Tank (2)</CardTitle>
                  </div>
                  <div className="text-right">
                     <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">45%</div>
                     <div className="text-xs text-muted-foreground">45L / 100L</div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="relative z-10 space-y-6">
                
                 {/* Logic Flow Indicator */}
                 <div className="flex items-center justify-between p-2 bg-muted/80 rounded border border-border">
                    <div className="text-xs">
                       <span className="text-muted-foreground block">Next Operation:</span>
                       <span className="text-foreground font-medium flex items-center gap-1">
                          Transfer to Tank 3 <ArrowRight className="w-3 h-3 text-muted-foreground" />
                       </span>
                    </div>
                    <Badge variant="outline" className="border-red-500/50 text-red-600 dark:text-red-400 bg-red-500/10">
                       Paused: Abnormal Values
                    </Badge>
                 </div>

                {/* Detailed Sensors Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="p-2 rounded bg-muted/40 border border-border">
                        <p className="text-xs text-muted-foreground">pH Level</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">7.8</p>
                        <p className="text-[10px] text-red-600/80 dark:text-red-400/80">Basic (High)</p>
                    </div>

                    <div className="p-2 rounded bg-muted/40 border border-border">
                        <p className="text-xs text-muted-foreground">EC</p>
                        <p className="text-lg font-bold text-foreground">1.8 <span className="text-xs font-normal">mS/cm</span></p>
                    </div>
                </div>

                {/* Analysis & Recommendation Engine */}
                <div className="bg-muted/60 rounded-lg p-3 border border-border space-y-3">
                   <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                      <span className="text-sm font-semibold text-foreground">Smart Analysis Recommendation</span>
                   </div>
                   
                   {/* pH Analysis */}
                   <div className="flex items-start gap-3 p-2 bg-red-500/10 rounded border border-red-500/20">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                      <div>
                         <p className="text-xs font-bold text-red-600 dark:text-red-400">pH High (7.8 &gt; 7.0)</p>
                         <p className="text-xs text-muted-foreground mt-1">Status: Basic/Alkaline</p>
                         <div className="mt-2 flex gap-2">
                            <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 border-red-200 dark:border-red-800 text-[10px]">Add Acid (HCl)</Badge>
                            <span className="text-[10px] text-muted-foreground self-center">to lower pH</span>
                         </div>
                      </div>
                   </div>

                   {/* Buffer Recommendation (General) */}
                   <div className="flex justify-between items-center pt-1 border-t border-border/50">
                      <span className="text-[10px] text-muted-foreground">pH Stability Control</span>
                      <span className="text-[10px] text-blue-500 dark:text-blue-400">Add Buffer Solution recommended</span>
                   </div>
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                   <Button 
                     className={`flex-1 gap-2 ${t2State ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                     onClick={toggleT2}
                   >
                      <Power className="w-4 h-4" />
                      {t2State ? "Stop Dosing" : "Auto-Dose Acid"}
                   </Button>
                   <Button variant="outline" className="flex-1 gap-2 border-border hover:bg-muted text-foreground">
                      <Settings className="w-4 h-4" />
                      Manual Mix
                   </Button>
                </div>
              </CardContent>
            </Card>

           {/* Tank 3: Distribution (Capacity Updated) */}
           <TankCard 
              name="Distribution Tank (3)" 
              type="Output: Feed Lines"
              capacity={100} 
              currentLevel={30} 
              status="Stable" 
              flowRate={30} 
              sensors={[{name: 'Status', value: 'Standby'}, {name: 'Source', value: 'Wait for Tank 2'}]}
              isFilling={t3State}
              onToggle={toggleT3}
           />

           {/* Tank 4: Cultivation Pond (New Horizontal Layout) - Volume Updated to 500L */}
           <Card className="col-span-1 md:col-span-2 lg:col-span-3 rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md overflow-hidden">
              <CardHeader className="pb-4 border-b border-border/50">
                 <div className="flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                           <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Final Stage: Cultivation</Badge>
                           <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/50">Optimal Depth</Badge>
                        </div>
                        <CardTitle className="text-xl text-foreground">{t.cultivationPond}</CardTitle>
                    </div>
                    <div className="text-right flex gap-6">
                        <div>
                           <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">25 <span className="text-lg text-muted-foreground font-normal">cm</span></div>
                           <div className="text-xs text-muted-foreground">{t.waterDepth}</div>
                        </div>
                        <div className="border-l border-border pl-6">
                           <div className="text-3xl font-bold text-foreground">60 <span className="text-lg text-muted-foreground font-normal">L</span></div>
                           <div className="text-xs text-muted-foreground">{t.totalVolume}</div>
                        </div>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-8">
                 
                 {/* Visual Depth Indicator */}
                 <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground mb-2">
                       <span>Pond Cross-Section</span>
                       <span>Target: <span className="text-emerald-600 dark:text-emerald-400">20 - 30 cm</span></span>
                    </div>
                    <div className="h-24 w-full bg-secondary rounded-lg relative overflow-hidden border border-border">
                       {/* Water Body */}
                       <div className="absolute bottom-0 left-0 w-full bg-blue-500/30 border-t border-blue-500/50 transition-all duration-1000 ease-in-out" style={{ height: '70%' }}>
                          {/* Surface Ripple Effect */}
                          <div className="absolute top-0 left-0 w-full h-1 bg-blue-400/50 animate-pulse"></div>
                       </div>
                       
                       {/* Target Zone Lines */}
                       <div className="absolute bottom-[60%] left-0 w-full h-[30%] bg-emerald-500/5 border-y border-dashed border-emerald-500/30 pointer-events-none flex items-center justify-center">
                          <span className="text-[10px] text-emerald-600/50 dark:text-emerald-500/50 uppercase tracking-widest font-semibold">{t.optimalGrowthZone}</span>
                       </div>
                       
                       {/* Current Level Indicator Line */}
                       <div className="absolute bottom-[70%] right-4 flex items-center gap-2">
                          <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-background/80 px-2 py-0.5 rounded">25 cm</span>
                          <div className="w-16 h-px bg-blue-700 dark:bg-blue-300"></div>
                       </div>
                    </div>

                     {/* Volume Alert (>= 50L) */}
                     <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-300 text-xs">
                        <AlertCircle className="w-4 h-4" />
                        <span>{language === 'TH' ? "น้ำถึงพอสมควรแล้ว (≥ 50 ลิตร)" : "Water level is sufficient (≥ 50 L)."}</span>
                     </div>
                 </div>

                 {/* Sensor Stats */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col justify-center">
                       <div className="flex items-center gap-2 mb-1">
                          <Activity className="w-5 h-5 text-blue-500" />
                          <span className="text-sm text-muted-foreground">Water Temp</span>
                       </div>
                       <div className="text-2xl font-bold text-foreground">28.0 <span className="text-xs text-muted-foreground font-normal">°C</span></div>
                    </div>

                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col justify-center">
                       <div className="flex items-center gap-2 mb-1">
                          <Waves className="w-5 h-5 text-cyan-500" />
                          <span className="text-sm text-muted-foreground">Oxygen (DO)</span>
                       </div>
                       <div className="text-2xl font-bold text-foreground">6.5 <span className="text-xs text-muted-foreground font-normal">mg/L</span></div>
                    </div>

                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-col justify-center">
                       <div className="flex items-center gap-2 mb-1">
                          <Sun className="w-5 h-5 text-orange-500" />
                          <span className="text-sm text-muted-foreground">Light Intensity</span>
                       </div>
                       <div className="text-2xl font-bold text-foreground">4,500 <span className="text-xs text-muted-foreground font-normal">Lux</span></div>
                    </div>

                 {/* Harvest Readiness - Balanced Size */}
                 <div className="md:col-span-3 p-3 rounded-xl bg-muted/40 border border-border/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Leaf className="w-5 h-5" />
                       </div>
                       <div>
                          <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                             {t.harvestStatus}
                             <Badge className="bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600 text-[10px] px-1.5 py-0">{t.ready}</Badge>
                          </h4>
                          <p className="text-xs text-muted-foreground">{t.biomassDensity} ({t.readiness} 95%)</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="text-right hidden sm:block">
                          <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">95%</div>
                          <div className="text-[10px] text-muted-foreground">{t.readiness}</div>
                       </div>
                       <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] h-8 text-xs">
                          {t.startHarvest}
                       </Button>
                    </div>
                 </div>
                 </div>

              </CardContent>
           </Card>

        </div>

        {/* Flow Diagram (Visual Placeholder) */}
        <div className="mt-8 rounded-xl border border-border bg-card/50 p-8 text-center text-muted-foreground">
           <div className="flex items-center justify-center gap-4 mb-4">
              <ArrowDownToLine className="w-6 h-6 text-muted-foreground" />
              <div className="h-0.5 w-16 bg-muted"></div>
              <div className="w-12 h-12 rounded border-2 border-border flex items-center justify-center"><span className="text-xs">Filter</span></div>
              <div className="h-0.5 w-16 bg-muted"></div>
              <ArrowUpFromLine className="w-6 h-6 text-muted-foreground" />
           </div>
           <p className="text-sm">System Flow Schematic & Valve States (Interactive View Needed)</p>
        </div>
      </main>
    </>
  );
}
