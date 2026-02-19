import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  Zap, 
  Sun, 
  Battery, 
  Plug, 
  TrendingDown, 
  Leaf, 
  DollarSign,
  BarChart3,
  Lightbulb
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell, PieChart, Pie } from "recharts";

const solarData = [
  { time: "06:00", production: 0, usage: 120 },
  { time: "08:00", production: 450, usage: 340 },
  { time: "10:00", production: 1200, usage: 890 },
  { time: "12:00", production: 1800, usage: 1100 },
  { time: "14:00", production: 1650, usage: 1250 },
  { time: "16:00", production: 900, usage: 950 },
  { time: "18:00", production: 120, usage: 600 },
];

const consumptionData = [
  { name: 'Pumps', value: 45, color: '#3b82f6' },
  { name: 'Grow Lights', value: 35, color: '#eab308' },
  { name: 'HVAC', value: 15, color: '#ef4444' },
  { name: 'Sensors/Control', value: 5, color: '#10b981' },
];

export function LLMTrafficPage() {
  return (
    <>
      <header className="bg-slate-900/50 border-b border-slate-800 px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-400 flex items-center gap-2">
              <Zap className="w-6 h-6 text-yellow-400" />
              Energy & Utilities Manager
            </h1>
            <p className="text-sm text-slate-400 mt-1">Smart Grid Monitor: Solar, Battery, and Grid Consumption</p>
          </div>
          <div className="flex items-center gap-2">
             <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex gap-1">
                <Leaf className="w-3 h-3" />
                Carbon Neutral Mode
             </Badge>
             <Button variant="outline" className="border-slate-800 hover:bg-slate-800">
                Download Report
             </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 ">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
           <Card className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-full bg-yellow-500/10 text-yellow-400"><Sun className="w-6 h-6" /></div>
                 <div>
                    <p className="text-sm text-slate-400">Solar Output</p>
                    <p className="text-2xl font-bold text-slate-400">1.8 <span className="text-sm font-normal text-slate-400">kW</span></p>
                 </div>
              </div>
           </Card>
           <Card className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400"><Battery className="w-6 h-6" /></div>
                 <div>
                    <p className="text-sm text-slate-400">Battery Level</p>
                    <p className="text-2xl font-bold text-slate-400">92 <span className="text-sm font-normal text-slate-400">%</span></p>
                 </div>
              </div>
           </Card>
           <Card className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-full bg-blue-500/10 text-blue-400"><Plug className="w-6 h-6" /></div>
                 <div>
                    <p className="text-sm text-slate-400">Grid Usage</p>
                    <p className="text-2xl font-bold text-slate-400">0.2 <span className="text-sm font-normal text-slate-400">kW</span></p>
                 </div>
              </div>
           </Card>
           <Card className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <div className="flex items-center gap-4">
                 <div className="p-3 rounded-full bg-purple-500/10 text-purple-400"><DollarSign className="w-6 h-6" /></div>
                 <div>
                    <p className="text-sm text-slate-400">Daily Cost</p>
                    <p className="text-2xl font-bold text-slate-400">$2.45 <span className="text-sm font-normal text-slate-400">est</span></p>
                 </div>
              </div>
           </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
           
           {/* Solar Production vs Usage Graph */}
           <Card className="lg:col-span-2 rounded-xl border border-slate-800 shadow-lg bg-slate-900/50 backdrop-blur-md">
              <CardHeader>
                 <CardTitle className="text-slate-400">Energy Balance</CardTitle>
                 <CardDescription className="text-slate-400">Solar Production vs. Farm Consumption (Today)</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={solarData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                             <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#fbbf24" stopOpacity={0}/>
                             </linearGradient>
                             <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                             </linearGradient>
                          </defs>
                          <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Watts', position: 'insideLeft', angle: -90, fill: '#64748b' }} />
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", color: "#f8fafc" }} />
                          <Area type="monotone" dataKey="production" stroke="#fbbf24" fillOpacity={1} fill="url(#colorProd)" name="Solar Production" />
                          <Area type="monotone" dataKey="usage" stroke="#3b82f6" fillOpacity={1} fill="url(#colorUsage)" name="Consumption" />
                          <Legend wrapperStyle={{ paddingTop: '20px' }} />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </CardContent>
           </Card>

           {/* Consumption Breakdown */}
           <Card className="rounded-xl border border-slate-800 shadow-lg bg-slate-900/50 backdrop-blur-md">
              <CardHeader>
                 <CardTitle className="text-slate-400">Usage Breakdown</CardTitle>
                 <CardDescription className="text-slate-400">Where is power going?</CardDescription>
              </CardHeader>
              <CardContent>
                 <div className="h-64 relative">
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                             data={consumptionData}
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                             dataKey="value"
                             stroke="none"
                          >
                             {consumptionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                             ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", color: "#f8fafc" }} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                       </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-8">
                       <Zap className="w-8 h-8 text-slate-400" />
                    </div>
                 </div>
                 <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                       <span className="text-slate-400">Target Efficiency</span>
                       <span className="text-emerald-400">On Track</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                       <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                 </div>
              </CardContent>
           </Card>
        </div>

        {/* Action Tips */}
        <div className="rounded-xl bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/20 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10 border border-yellow-500/20">
                 <Lightbulb className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                 <h4 className="font-semibold text-yellow-500">Optimization Tip</h4>
                 <p className="text-sm text-yellow-200/70">Shift "Water Circulation - Tank 2" to 11:00 AM - 2:00 PM to utilize peak solar reduction.</p>
              </div>
           </div>
           <Button className="bg-yellow-600 hover:bg-yellow-700 text-white border-0">
              Apply Schedule
           </Button>
        </div>

      </main>
    </>
  );
}