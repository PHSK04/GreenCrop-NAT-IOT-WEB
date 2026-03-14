import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Thermometer, Droplets, Activity, AlertTriangle, FileText, CloudRain } from "lucide-react";
import { useTheme } from "next-themes";
import { useDeviceSeed } from "@/hooks/useActiveDeviceId";
import { seededNumber } from "@/utils/deviceData";

// Mock Data: 24h Water Temperature Trends
const tempHistory = [
  { time: "00:00", water: 24.5 },
  { time: "04:00", water: 24.2 },
  { time: "08:00", water: 25.1 },
  { time: "12:00", water: 26.8 },
  { time: "16:00", water: 26.5 },
  { time: "20:00", water: 25.4 },
  { time: "23:59", water: 24.8 },
];

// Mock Data: Water Quality Trends
const waterQualityHistory = [
  { time: "Mon", ph: 6.8, ec: 1.2, oxygen: 6.5 },
  { time: "Tue", ph: 6.9, ec: 1.3, oxygen: 6.4 },
  { time: "Wed", ph: 7.0, ec: 1.2, oxygen: 6.6 },
  { time: "Thu", ph: 7.2, ec: 1.4, oxygen: 6.8 },
  { time: "Fri", ph: 7.1, ec: 1.3, oxygen: 6.7 },
  { time: "Sat", ph: 6.9, ec: 1.2, oxygen: 6.5 },
  { time: "Sun", ph: 6.8, ec: 1.1, oxygen: 6.6 },
];

// Detailed Sensor Status List
const currentSensorReadings = [
  { id: "S-TMP-W1", name: "Water Temperature (Pond A)", value: "25.2 °C", status: "Normal", lastUpdate: "1 min ago" },
  { id: "S-PH-01", name: "Water pH (Tank 1)", value: "7.2", status: "Normal", lastUpdate: "2 mins ago" },
  { id: "S-EC-01", name: "Water EC (Tank 1)", value: "1.4 mS/cm", status: "Normal", lastUpdate: "2 mins ago" },
  { id: "S-DO-01", name: "Dissolved Oxygen (Tank 1)", value: "6.1 mg/L", status: "Low Warning", lastUpdate: "2 mins ago" },
  { id: "S-LGT-01", name: "Light Intensity (Zone A)", value: "450 PPFD", status: "Normal", lastUpdate: "1 min ago" },
  { id: "S-CO2-01", name: "CO2 Level (Greenhouse)", value: "800 ppm", status: "Optimal", lastUpdate: "10 mins ago" },
];

export function WeatherDataPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { deviceId, seed } = useDeviceSeed();
  const deviceLabel = deviceId ? `Device ${deviceId}` : "All Devices";

  const adjustValue = (
    value: string,
    index: number,
    step: number,
    min: number,
    max: number,
    precision: number,
  ) => {
    const match = value.match(/-?\d+(\.\d+)?/);
    if (!match) return value;
    const base = Number(match[0]);
    if (!Number.isFinite(base)) return value;
    const adjusted = seededNumber(base, seed, index, step, min, max, precision);
    const fixed =
      precision === 0 ? `${Math.round(adjusted)}` : adjusted.toFixed(precision);
    return value.replace(match[0], fixed);
  };

  const tempHistoryDevice = useMemo(
    () =>
      tempHistory.map((row, index) => ({
        ...row,
        water: seededNumber(row.water, seed, index, 0.2, 22.0, 28.8, 1),
      })),
    [seed],
  );

  const waterQualityHistoryDevice = useMemo(
    () =>
      waterQualityHistory.map((row, index) => ({
        ...row,
        ph: seededNumber(row.ph, seed, index, 0.05, 6.4, 7.8, 2),
        ec: seededNumber(row.ec, seed, index, 0.05, 1.0, 2.4, 2),
        oxygen: seededNumber(row.oxygen, seed, index, 0.07, 5.5, 8.6, 2),
      })),
    [seed],
  );

  const currentSensorReadingsDevice = useMemo(
    () =>
      currentSensorReadings.map((row, index) => {
        const label = row.name.toLowerCase();
        let nextValue = row.value;
        if (label.includes("temperature")) {
          nextValue = adjustValue(row.value, index, 0.2, 22.0, 28.8, 1);
        } else if (label.includes("ph")) {
          nextValue = adjustValue(row.value, index, 0.05, 6.4, 7.8, 2);
        } else if (label.includes("ec")) {
          nextValue = adjustValue(row.value, index, 0.05, 1.0, 2.4, 2);
        } else if (label.includes("oxygen")) {
          nextValue = adjustValue(row.value, index, 0.07, 5.5, 8.6, 2);
        } else if (label.includes("co2")) {
          nextValue = adjustValue(row.value, index, 20, 600, 1200, 0);
        } else if (label.includes("light")) {
          nextValue = adjustValue(row.value, index, 15, 300, 800, 0);
        } else {
          const numeric = row.value.match(/-?\d+(\.\d+)?/);
          if (numeric) {
            nextValue = adjustValue(row.value, index, 1, 0, 9999, 0);
          }
        }
        return { ...row, value: nextValue };
      }),
    [seed],
  );

  return (
    <>
      <header className="bg-card/50 border-b border-border px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-500" />
              Sensor Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Detailed real-time analytics and historical sensor data</p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/40">
                {deviceLabel}
              </Badge>
            </div>
          </div>
          <Button variant="outline" className="gap-2 border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground">
            <FileText className="w-4 h-4" />
            Export Data Logs
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 ">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 max-w-xl bg-muted border border-border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Overview</TabsTrigger>
            <TabsTrigger value="weather" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Atmosphere</TabsTrigger>
            <TabsTrigger value="water" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">Water Quality</TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">System Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Temperature Chart */}
              <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Thermometer className="w-5 h-5 text-blue-400" />
                      Water Temperature (24h)
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">Monitor pond thermal stability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={tempHistoryDevice} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis 
                          dataKey="time" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))", 
                              borderColor: "hsl(var(--border))", 
                              color: "hsl(var(--foreground))",
                              borderRadius: "0.5rem"
                            }} 
                           itemStyle={{ color: "hsl(var(--foreground))" }}
                           labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "20px" }}/>
                        <Area type="monotone" dataKey="water" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWater)" name="Water Temp (°C)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Water Quality Chart */}
              <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Droplets className="w-5 h-5 text-cyan-500" />
                      Water Quality Trends (7 Days)
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">pH, Oxygen, and EC stability</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={waterQualityHistoryDevice} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis 
                          dataKey="time" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={12} 
                          tickLine={false} 
                          axisLine={false} 
                        />
                        <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))", 
                              borderColor: "hsl(var(--border))", 
                              color: "hsl(var(--foreground))",
                              borderRadius: "0.5rem"
                            }} 
                           itemStyle={{ color: "hsl(var(--foreground))" }}
                           labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                        />
                        <Legend wrapperStyle={{ paddingTop: "20px" }}/>
                        <Line type="monotone" dataKey="ph" stroke="#10b981" strokeWidth={2} name="pH Level" />
                        <Line type="monotone" dataKey="oxygen" stroke="#0ea5e9" strokeWidth={2} name="Oxygen (mg/L)" />
                        <Line type="monotone" dataKey="ec" stroke="#eab308" strokeWidth={2} name="EC (mS/cm)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Sensor Table */}
            <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
               <CardHeader>
                 <CardTitle className="text-foreground">Detailed Sensor Readings</CardTitle>
                 <CardDescription className="text-muted-foreground">Real-time values from all active field nodes</CardDescription>
               </CardHeader>
               <CardContent>
                 <Table>
                   <TableHeader>
                     <TableRow className="border-border hover:bg-muted/50">
                       <TableHead className="font-semibold text-muted-foreground">Sensor Name</TableHead>
                       <TableHead className="font-semibold text-muted-foreground">Sensor ID</TableHead>
                       <TableHead className="font-semibold text-muted-foreground">Current Value</TableHead>
                       <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                       <TableHead className="font-semibold text-muted-foreground text-right">Last Update</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                    {currentSensorReadingsDevice.map((sensor, i) => (
                       <TableRow key={i} className="border-border hover:bg-muted/50 transition-colors">
                         <TableCell className="font-medium text-foreground">{sensor.name}</TableCell>
                         <TableCell className="text-muted-foreground font-mono text-xs">{sensor.id}</TableCell>
                         <TableCell className="text-foreground font-bold">{sensor.value}</TableCell>
                         <TableCell>
                           <Badge variant="outline" className={`
                             ${sensor.status === 'Normal' || sensor.status === 'Optimal' ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 
                               sensor.status.includes('Warning') ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10' : 'border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10'}
                           `}>
                             {sensor.status}
                           </Badge>
                         </TableCell>
                         <TableCell className="text-right text-muted-foreground text-sm">{sensor.lastUpdate}</TableCell>
                       </TableRow>
                     ))}
                   </TableBody>
                 </Table>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weather">
            <div className="p-12 text-center border border-dashed border-border rounded-xl">
               <CloudRain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
               <h3 className="text-lg font-medium text-foreground">Weather History Module</h3>
               <p className="text-muted-foreground">Historical precipitation and forecast data integration.</p>
            </div>
          </TabsContent>
          <TabsContent value="water">
             <div className="p-12 text-center border border-dashed border-border rounded-xl">
               <Droplets className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
               <h3 className="text-lg font-medium text-foreground">Water Quality Detailed Logs</h3>
               <p className="text-muted-foreground">Granular minute-by-minute water parameter logs.</p>
            </div>
          </TabsContent>
          <TabsContent value="alerts">
             <div className="p-12 text-center border border-dashed border-border rounded-xl">
               <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
               <h3 className="text-lg font-medium text-foreground">System Alert History</h3>
               <p className="text-muted-foreground">Log of all sensor threshold breaches and automated responses.</p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
