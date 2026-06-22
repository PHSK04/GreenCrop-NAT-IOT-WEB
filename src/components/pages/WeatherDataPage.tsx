import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Thermometer, Droplets, Activity, AlertTriangle, Download, FileText, CloudRain, Database } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useDeviceSeed } from "@/hooks/useActiveDeviceId";
import { downloadSimplePdf, downloadTextFile } from "@/utils/download";
import { useMachine } from "@/contexts/MachineContext";
import { MinimalDatePicker } from "../ui/minimal-date-picker";
import { MinimalMonthPicker } from "../ui/minimal-month-picker";

type WeatherDataPageProps = {
  language?: string;
};

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return date.toLocaleString();
};

const sensorStatusClass = (status: string) => {
  if (status === "Normal" || status === "Optimal") {
    return "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10";
  }
  if (status.includes("Warning")) {
    return "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10";
  }
  return "border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/10";
};

export function WeatherDataPage({ language = "TH" }: WeatherDataPageProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { deviceId } = useDeviceSeed();
  const { telemetryHistory } = useMachine();
  const isTH = language === "TH";
  const deviceLabel = deviceId ? `${isTH ? "อุปกรณ์" : "Device"} ${deviceId}` : (isTH ? "ทุกอุปกรณ์" : "All Devices");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dismissedEmptyDataKey, setDismissedEmptyDataKey] = useState<string | null>(null);

  const filteredTelemetry = useMemo(() => {
    return telemetryHistory.filter((row) => {
      const date = new Date(row.timestamp);
      if (Number.isNaN(date.getTime())) return false;
      const day = date.toISOString().slice(0, 10);
      if (selectedMonth && !day.startsWith(selectedMonth)) return false;
      if (startDate && day < startDate) return false;
      if (endDate && day > endDate) return false;
      return true;
    });
  }, [endDate, selectedMonth, startDate, telemetryHistory]);

  const latestTelemetry = filteredTelemetry[0] || telemetryHistory[0] || null;

  const tempHistoryDevice = useMemo(() => {
    const buckets = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"];
    return buckets
      .map((time) => {
        const hour = Number(time.slice(0, 2));
        const values = filteredTelemetry
          .filter((row) => {
            const parsed = new Date(row.timestamp);
            return Math.abs(parsed.getHours() - hour) <= 2 && row.tempValue > 0;
          })
          .map((row) => row.tempValue);
        if (!values.length) return null;
        return { time, water: Number(average(values).toFixed(1)) };
      })
      .filter((row): row is { time: string; water: number } => Boolean(row));
  }, [filteredTelemetry]);

  const waterQualityHistoryDevice = useMemo(() => {
    const groups = new Map<string, typeof filteredTelemetry>();
    filteredTelemetry.forEach((row) => {
      const day = new Date(row.timestamp).toISOString().slice(0, 10);
      const rows = groups.get(day) ?? [];
      rows.push(row);
      groups.set(day, rows);
    });

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([day, rows]) => {
        const ph = average(rows.map((row) => row.phValue).filter((value) => value > 0));
        const ec = average(rows.map((row) => row.ecValue).filter((value) => value > 0));
        return {
          time: new Date(`${day}T00:00:00`).toLocaleDateString([], { weekday: "short" }),
          ph: Number(ph.toFixed(2)),
          ec: Number(ec.toFixed(2)),
          oxygen: Number((ph > 0 ? Math.max(0, 14 - ph) : 0).toFixed(2)),
        };
      })
      .filter((row) => row.ph > 0 || row.ec > 0 || row.oxygen > 0);
  }, [filteredTelemetry]);

  const currentSensorReadingsDevice = useMemo(() => {
    if (!latestTelemetry) return [];
    const lastUpdate = formatTime(latestTelemetry.timestamp);
    const phStatus = latestTelemetry.phValue > 0 && latestTelemetry.phValue >= 6.5 && latestTelemetry.phValue <= 7.5 ? "Normal" : "Warning";
    const tempStatus = latestTelemetry.tempValue > 0 && latestTelemetry.tempValue >= 20 && latestTelemetry.tempValue <= 32 ? "Normal" : "Warning";
    const ecStatus = latestTelemetry.ecValue > 0 ? "Normal" : "Warning";
    return [
      {
        id: "S-TMP-W1",
        name: isTH ? "อุณหภูมิน้ำ" : "Water Temperature",
        value: latestTelemetry.tempValue > 0 ? `${latestTelemetry.tempValue.toFixed(1)} °C` : "-",
        status: tempStatus,
        lastUpdate,
      },
      {
        id: "S-PH-01",
        name: isTH ? "ค่า pH น้ำ" : "Water pH",
        value: latestTelemetry.phValue > 0 ? latestTelemetry.phValue.toFixed(2) : "-",
        status: phStatus,
        lastUpdate,
      },
      {
        id: "S-EC-01",
        name: isTH ? "ค่า EC น้ำ" : "Water EC",
        value: latestTelemetry.ecValue > 0 ? `${latestTelemetry.ecValue.toFixed(2)} mS/cm` : "-",
        status: ecStatus,
        lastUpdate,
      },
      {
        id: "WLS1",
        name: isTH ? "ระดับน้ำ WLS1" : "Water Level WLS1",
        value: latestTelemetry.wls1 ? (isTH ? "ตรวจพบ" : "Detected") : (isTH ? "ไม่พบ" : "Not detected"),
        status: latestTelemetry.wls1 ? "Normal" : "Warning",
        lastUpdate,
      },
      {
        id: "WLS2",
        name: isTH ? "ระดับน้ำ WLS2" : "Water Level WLS2",
        value: latestTelemetry.wls2 ? (isTH ? "ตรวจพบ" : "Detected") : (isTH ? "ไม่พบ" : "Not detected"),
        status: latestTelemetry.wls2 ? "Normal" : "Warning",
        lastUpdate,
      },
      {
        id: "FLOAT",
        name: isTH ? "ลูกลอยแจ้งเตือน" : "Float Alarm",
        value: latestTelemetry.floatAlarm ? (isTH ? "แจ้งเตือน" : "Alarm") : (isTH ? "ปกติ" : "Normal"),
        status: latestTelemetry.floatAlarm ? "Warning" : "Normal",
        lastUpdate,
      },
    ];
  }, [isTH, latestTelemetry]);

  const alertRows = useMemo(() => {
    return filteredTelemetry
      .filter((row) =>
        row.floatAlarm ||
        row.locked ||
        row.redOn ||
        (row.phValue > 0 && (row.phValue < 6.5 || row.phValue > 7.5)),
      )
      .slice(0, 200)
      .map((row) => ({
        timestamp: row.timestamp,
        type: row.locked ? "LOCKED" : row.redOn ? "RED_ALARM" : row.floatAlarm ? "FLOAT_ALARM" : "PH_RANGE",
        detail: row.locked
          ? (isTH ? "ระบบล็อค" : "System locked")
          : row.redOn
            ? (isTH ? "ไฟแดงแจ้งเตือน" : "Red alarm active")
            : row.floatAlarm
              ? (isTH ? "ลูกลอยแจ้งเตือน" : "Float alarm detected")
              : `pH ${row.phValue.toFixed(2)}`,
      }));
  }, [filteredTelemetry, isTH]);

  const weatherExportRows = useMemo(() => {
    return filteredTelemetry.map((row) => {
      const ph = row.phValue > 0 ? row.phValue : 0;
      return {
        timestamp: row.timestamp,
        ph: ph > 0 ? ph.toFixed(2) : "",
        oxygen_mg_l: ph > 0 ? Math.max(0, 14 - ph).toFixed(2) : "",
        ec_ms_cm: row.ecValue > 0 ? row.ecValue.toFixed(2) : "",
        temp_c: row.tempValue > 0 ? row.tempValue.toFixed(1) : "",
      };
    });
  }, [filteredTelemetry]);

  const buildExportContent = () => {
    const meta = [
      `report,${isTH ? "Environmental and Water Data" : "Environmental and Water Data"}`,
      `device,${deviceLabel}`,
      `month,${selectedMonth || "-"}`,
      `date_range,${startDate || "-"} to ${endDate || "-"}`,
      "",
    ];
    const headers = ["timestamp", "ph", "oxygen_mg_l", "ec_ms_cm", "temp_c"];
    const rows = weatherExportRows.map((row) => headers.map((key) => csvCell(row[key as keyof typeof row])).join(","));
    return `${meta.join("\n")}${headers.join(",")}\n${rows.join("\n")}`;
  };

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      if (!weatherExportRows.length) {
        toast.error(isTH ? "ดาวน์โหลดล้มเหลว" : "Download failed", {
          description: isTH ? "ไม่มีข้อมูลสำหรับส่งออก" : "No data to export.",
        });
        return;
      }

      const content = buildExportContent();
      if (format === "pdf") {
        await downloadSimplePdf("weather-water-data.pdf", content);
      } else {
        downloadTextFile("weather-water-data.csv", content, "text/csv;charset=utf-8");
      }

      toast.success(isTH ? "เริ่มดาวน์โหลด" : "Download started", {
        description: format === "pdf" ? "weather-water-data.pdf" : "weather-water-data.csv",
      });
    } catch (error) {
      toast.error(isTH ? "ดาวน์โหลดล้มเหลว" : "Download failed", {
        description: isTH ? "ไม่สามารถสร้างไฟล์ได้" : "Could not generate export file.",
      });
    }
  };

  const missingTempData = tempHistoryDevice.length === 0;
  const missingWaterQualityData = waterQualityHistoryDevice.length === 0;
  const hasNoTelemetry = telemetryHistory.length === 0;
  const emptyDataKey = `${telemetryHistory.length}:${selectedMonth}:${startDate}:${endDate}:${tempHistoryDevice.length}:${waterQualityHistoryDevice.length}`;
  const showEmptyDataDialog = (missingTempData || missingWaterQualityData) && dismissedEmptyDataKey !== emptyDataKey;
  const missingSections = [
    missingTempData ? (isTH ? "อุณหภูมิน้ำ (24 ชม.)" : "Water Temperature (24h)") : "",
    missingWaterQualityData ? (isTH ? "แนวโน้มคุณภาพน้ำ (7 วัน)" : "Water Quality Trends (7 Days)") : "",
  ].filter(Boolean);
  const emptyDialogTitle = hasNoTelemetry
    ? (isTH ? "ยังไม่มีข้อมูลเซ็นเซอร์ในฐานข้อมูล" : "No sensor data in the database yet")
    : (isTH ? "ไม่พบข้อมูลจริงในช่วงที่เลือก" : "No real data in the selected range");
  const emptyDialogDescription = hasNoTelemetry
    ? (isTH
      ? "ระบบยังไม่ได้รับข้อมูลจาก sensor_data จึงยังวาดกราฟอุณหภูมิน้ำและ pH/EC ไม่ได้"
      : "No sensor_data rows have been received yet, so the water temperature and pH/EC charts cannot be drawn.")
    : (isTH
      ? "มีข้อมูลบางส่วนในระบบ แต่ช่วงเดือน/วันที่เลือกยังไม่มีค่าที่ใช้วาดกราฟนี้"
      : "Some records exist, but the selected month/date range has no values for these charts.");

  return (
    <>
      <Dialog
        open={showEmptyDataDialog}
        onOpenChange={(open) => {
          if (!open) setDismissedEmptyDataKey(emptyDataKey);
        }}
      >
        <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Database className="h-5 w-5 text-blue-500" />
              {emptyDialogTitle}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {emptyDialogDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
            <p className="font-medium text-foreground">{isTH ? "กราฟที่ยังไม่มีข้อมูล:" : "Charts without data:"}</p>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              {missingSections.map((section) => (
                <li key={section}>{section}</li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button onClick={() => setDismissedEmptyDataKey(emptyDataKey)}>
              {isTH ? "รับทราบ" : "OK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="bg-card/50 border-b border-border px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-500" />
              {isTH ? "ข้อมูลสภาพแวดล้อมและน้ำ" : "Sensor Intelligence"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isTH ? "ข้อมูลแบบเรียลไทม์และประวัติของเซนเซอร์" : "Detailed real-time analytics and historical sensor data"}
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/40">
                {deviceLabel}
              </Badge>
            </div>
          </div>
          <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-3">
            <MinimalMonthPicker ariaLabel="Analytics month" value={selectedMonth} onChange={setSelectedMonth} locale={isTH ? "TH" : "EN"} />
            <MinimalDatePicker ariaLabel="Analytics start date" value={startDate} onChange={setStartDate} locale={isTH ? "TH" : "EN"} />
            <MinimalDatePicker ariaLabel="Analytics end date" value={endDate} onChange={setEndDate} locale={isTH ? "TH" : "EN"} />
            <div className="grid gap-2 sm:col-span-3 sm:grid-cols-2">
              <Button
                className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => handleExport("csv")}
              >
                <Download className="w-4 h-4" />
                {isTH ? "ดาวน์โหลด CSV" : "Download CSV"}
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-border bg-background text-foreground hover:bg-muted shadow-sm"
                onClick={() => handleExport("pdf")}
              >
                <FileText className="w-4 h-4" />
                {isTH ? "ดาวน์โหลด PDF" : "Download PDF"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 ">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 max-w-xl bg-muted border border-border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">{isTH ? "ภาพรวม" : "Overview"}</TabsTrigger>
            <TabsTrigger value="weather" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">{isTH ? "บรรยากาศ" : "Atmosphere"}</TabsTrigger>
            <TabsTrigger value="water" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">{isTH ? "คุณภาพน้ำ" : "Water Quality"}</TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-background data-[state=active]:text-foreground text-muted-foreground">{isTH ? "แจ้งเตือนระบบ" : "System Alerts"}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Temperature Chart */}
              <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Thermometer className="w-5 h-5 text-blue-400" />
                      {isTH ? "อุณหภูมิน้ำ (24 ชม.)" : "Water Temperature (24h)"}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {isTH ? "ติดตามเสถียรภาพอุณหภูมิบ่อ" : "Monitor pond thermal stability"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {tempHistoryDevice.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                        {isTH ? "ยังไม่มีข้อมูลอุณหภูมิน้ำจริงในช่วงที่เลือก" : "No real water temperature data in this range."}
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={tempHistoryDevice} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <Tooltip
                              contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }}
                             itemStyle={{ color: "hsl(var(--foreground))" }}
                             labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                          />
                          <Legend wrapperStyle={{ paddingTop: "20px" }}/>
                          <Area type="monotone" dataKey="water" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWater)" name={isTH ? "อุณหภูมิน้ำ (°C)" : "Water Temp (°C)"} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Water Quality Chart */}
              <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Droplets className="w-5 h-5 text-cyan-500" />
                      {isTH ? "แนวโน้มคุณภาพน้ำ (7 วัน)" : "Water Quality Trends (7 Days)"}
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {isTH ? "เสถียรภาพของ pH, ออกซิเจน และ EC" : "pH, Oxygen, and EC stability"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {waterQualityHistoryDevice.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                        {isTH ? "ยังไม่มีข้อมูล pH/EC จริงในช่วงที่เลือก" : "No real pH/EC data in this range."}
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={waterQualityHistoryDevice} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip
                              contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "0.5rem" }}
                             itemStyle={{ color: "hsl(var(--foreground))" }}
                             labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                          />
                          <Legend wrapperStyle={{ paddingTop: "20px" }}/>
                          <Line type="monotone" dataKey="ph" stroke="#10b981" strokeWidth={2} name={isTH ? "ค่า pH" : "pH Level"} />
                          <Line type="monotone" dataKey="oxygen" stroke="#0ea5e9" strokeWidth={2} name={isTH ? "ออกซิเจน (mg/L)" : "Oxygen (mg/L)"} />
                          <Line type="monotone" dataKey="ec" stroke="#eab308" strokeWidth={2} name={isTH ? "EC (mS/cm)" : "EC (mS/cm)"} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
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
                           <Badge variant="outline" className={sensorStatusClass(sensor.status)}>
                             {sensor.status}
                           </Badge>
                         </TableCell>
                         <TableCell className="text-right text-muted-foreground text-sm">{sensor.lastUpdate}</TableCell>
                       </TableRow>
                     ))}
                     {currentSensorReadingsDevice.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                           {isTH ? "ยังไม่มีค่าจริงจาก sensor_data ในช่วงที่เลือก" : "No real sensor_data readings in this range."}
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weather">
            <Card className="rounded-xl border border-border bg-card/50 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <CloudRain className="w-5 h-5 text-blue-500" />
                  {isTH ? "ข้อมูลบรรยากาศจากเซ็นเซอร์จริง" : "Atmosphere Data From Real Sensors"}
                </CardTitle>
                <CardDescription>
                  {isTH ? "ตอนนี้ระบบมีข้อมูลอุณหภูมิน้ำจาก sensor_data ยังไม่มีคีย์ฝน/อากาศภายนอกแยกต่างหาก" : "The system currently has water temperature in sensor_data; rain/outdoor weather keys are not present yet."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{isTH ? "เวลา" : "Time"}</TableHead>
                      <TableHead>{isTH ? "อุณหภูมิน้ำ" : "Water Temp"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTelemetry.filter((row) => row.tempValue > 0).slice(0, 200).map((row) => (
                      <TableRow key={`weather-${row.timestamp}`}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{formatTime(row.timestamp)}</TableCell>
                        <TableCell className="font-semibold">{row.tempValue.toFixed(1)} °C</TableCell>
                      </TableRow>
                    ))}
                    {filteredTelemetry.filter((row) => row.tempValue > 0).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="py-8 text-center text-muted-foreground">
                          {isTH ? "ยังไม่มีข้อมูลอุณหภูมิน้ำจริงในช่วงที่เลือก" : "No real temperature rows in this range."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="water">
             <Card className="rounded-xl border border-border bg-card/50 shadow-lg">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-foreground">
                   <Droplets className="w-5 h-5 text-cyan-500" />
                   {isTH ? "บันทึกคุณภาพน้ำแบบละเอียด" : "Water Quality Detailed Logs"}
                 </CardTitle>
                 <CardDescription>{isTH ? "ข้อมูลจริงจาก sensor_data ไม่ใช้ข้อมูลจำลอง" : "Real rows from sensor_data, no generated demo values."}</CardDescription>
               </CardHeader>
               <CardContent>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>{isTH ? "เวลา" : "Time"}</TableHead>
                       <TableHead>pH</TableHead>
                       <TableHead>EC</TableHead>
                       <TableHead>{isTH ? "อุณหภูมิ" : "Temp"}</TableHead>
                       <TableHead>WLS1</TableHead>
                       <TableHead>WLS2</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {filteredTelemetry.slice(0, 500).map((row) => (
                       <TableRow key={`water-${row.timestamp}`}>
                         <TableCell className="font-mono text-xs text-muted-foreground">{formatTime(row.timestamp)}</TableCell>
                         <TableCell>{row.phValue > 0 ? row.phValue.toFixed(2) : "-"}</TableCell>
                         <TableCell>{row.ecValue > 0 ? row.ecValue.toFixed(2) : "-"}</TableCell>
                         <TableCell>{row.tempValue > 0 ? `${row.tempValue.toFixed(1)} °C` : "-"}</TableCell>
                         <TableCell>{row.wls1 ? "ON" : "OFF"}</TableCell>
                         <TableCell>{row.wls2 ? "ON" : "OFF"}</TableCell>
                       </TableRow>
                     ))}
                     {filteredTelemetry.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                           {isTH ? "ยังไม่มีข้อมูลคุณภาพน้ำจริงในช่วงที่เลือก" : "No real water-quality rows in this range."}
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="alerts">
             <Card className="rounded-xl border border-border bg-card/50 shadow-lg">
               <CardHeader>
                 <CardTitle className="flex items-center gap-2 text-foreground">
                   <AlertTriangle className="w-5 h-5 text-amber-500" />
                   {isTH ? "ประวัติการแจ้งเตือนระบบ" : "System Alert History"}
                 </CardTitle>
                 <CardDescription>{isTH ? "แจ้งเตือนที่คำนวณจากค่า sensor_data จริง" : "Alerts derived from real sensor_data rows."}</CardDescription>
               </CardHeader>
               <CardContent>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>{isTH ? "เวลา" : "Time"}</TableHead>
                       <TableHead>{isTH ? "ประเภท" : "Type"}</TableHead>
                       <TableHead>{isTH ? "รายละเอียด" : "Detail"}</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {alertRows.map((row) => (
                       <TableRow key={`alert-${row.timestamp}-${row.type}`}>
                         <TableCell className="font-mono text-xs text-muted-foreground">{formatTime(row.timestamp)}</TableCell>
                         <TableCell>
                           <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                             {row.type}
                           </Badge>
                         </TableCell>
                         <TableCell>{row.detail}</TableCell>
                       </TableRow>
                     ))}
                     {alertRows.length === 0 && (
                       <TableRow>
                         <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                           {isTH ? "ไม่พบการแจ้งเตือนจริงในช่วงที่เลือก" : "No real alerts in this range."}
                         </TableCell>
                       </TableRow>
                     )}
                   </TableBody>
                 </Table>
               </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
