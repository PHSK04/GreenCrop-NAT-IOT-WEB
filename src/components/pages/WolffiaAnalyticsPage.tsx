import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Input } from "../ui/input";
import { ExportFiltersCard } from "@/components/ExportFiltersCard";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Sprout, TrendingUp, Scale, Calendar, ArrowUpRight, Droplets, Timer, Download, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { toast } from "sonner";
import { downloadSimplePdf, downloadTextFile } from "@/utils/download";
import { useDeviceSeed } from "@/hooks/useActiveDeviceId";
import { rotateBy, seededInt, seededNumber } from "@/utils/deviceData";

// Monthly Wolffia Stats: Yield vs Frequency
const wolffiaStats = [
  { month: "Jan", yield: 350, frequency: 8 },
  { month: "Feb", yield: 395, frequency: 10 },
  { month: "Mar", yield: 450, frequency: 12 },
  { month: "Apr", yield: 500, frequency: 12 },
  { month: "May", yield: 580, frequency: 14 },
  { month: "Jun", yield: 670, frequency: 15 },
];

const pondMetrics = [
  { metric: "Avg Harvest / Month", value: "11.8 times", trend: "+2" },
  { metric: "Avg Yield / Harvest", value: "42.5 g", trend: "+5%" },
  { metric: "Total Yield (YTD)", value: "2,945 g", trend: "+18%" },
  { metric: "Cycle Duration", value: "2-3 Days", trend: "0" },
];

const recentHarvestLogs = [
  { id: "#B-06-15-1", weight: "45.2 g", date: "Today, 6:00 AM", interval: "2 days" },
  { id: "#B-06-13-1", weight: "44.8 g", date: "Jun 13", interval: "2 days" },
  { id: "#B-06-11-1", weight: "43.5 g", date: "Jun 11", interval: "2 days" },
  { id: "#B-06-09-1", weight: "46.1 g", date: "Jun 09", interval: "3 days" },
  { id: "#B-06-06-1", weight: "42.9 g", date: "Jun 06", interval: "2 days" },
];

type WolffiaAnalyticsPageProps = {
  language?: string;
};

export function WolffiaAnalyticsPage({ language = "TH" }: WolffiaAnalyticsPageProps) {
  const { deviceId, seed } = useDeviceSeed();
  const isTH = language === "TH";
  const deviceLabel = deviceId ? `${isTH ? "อุปกรณ์" : "Device"} ${deviceId}` : (isTH ? "ทุกอุปกรณ์" : "All Devices");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([
    "monthly",
    "harvest",
    "metrics",
  ]);

  const dataTypeOptions = [
    { key: "monthly", label: isTH ? "สถิติรายเดือน" : "Monthly Stats" },
    { key: "harvest", label: isTH ? "ประวัติเก็บเกี่ยว" : "Harvest History" },
    { key: "metrics", label: isTH ? "ค่าชี้วัดบ่อ" : "Pond Metrics" },
  ];

  const wolffiaStatsDevice = useMemo(
    () =>
      wolffiaStats.map((row, index) => ({
        ...row,
        yield: seededInt(row.yield, seed, index, 12, 300, 760),
        frequency: seededInt(row.frequency, seed, index, 1, 6, 18),
      })),
    [seed],
  );

  const adjustMetricValue = (
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

  const pondMetricsDevice = useMemo(
    () =>
      pondMetrics.map((row, index) => {
        let value = row.value;
        if (row.metric.includes("Harvest / Month")) {
          value = adjustMetricValue(row.value, index, 0.4, 8, 16, 1);
        } else if (row.metric.includes("Yield / Harvest")) {
          value = adjustMetricValue(row.value, index, 1.2, 30, 60, 1);
        } else if (row.metric.includes("Total Yield")) {
          value = adjustMetricValue(row.value, index, 60, 1800, 4200, 0);
        }
        return { ...row, value };
      }),
    [seed],
  );

  const recentHarvestLogsDevice = useMemo(
    () =>
      rotateBy(recentHarvestLogs, seed).map((row, index) => ({
        ...row,
        weight: `${seededNumber(44.8, seed, index, 0.6, 38.0, 52.0, 1)} g`,
      })),
    [seed],
  );

  const handleDownload = () => {
    try {
      if (!wolffiaStatsDevice.length) {
        toast.error(isTH ? "ส่งออกล้มเหลว" : "Export Failed", { description: isTH ? "ไม่มีข้อมูลสำหรับส่งออก" : "No data to export." });
        return;
      }
      const headers = Object.keys(wolffiaStatsDevice[0]).join(",");
      const csvContent =
        headers +
        "\n" +
        wolffiaStatsDevice.map((row) => Object.values(row).join(",")).join("\n");
      downloadTextFile("wolffia_monthly_report.csv", csvContent, "text/csv;charset=utf-8");
      
      toast.success(isTH ? "ส่งออกสำเร็จ" : "Export Successful", {
        description: isTH ? "ดาวน์โหลดรายงานรายเดือนแล้ว" : "Monthly report has been downloaded."
      });
      setIsExportOpen(false);
    } catch (error) {
      toast.error(isTH ? "ส่งออกล้มเหลว" : "Export Failed", {
        description: isTH ? "ไม่สามารถสร้างไฟล์รายงานได้" : "Could not generate report file."
      });
    }
  };

  const buildExportPayload = () => {
    const lines: string[] = [];
    lines.push(isTH ? "รายงาน, วิเคราะห์บ่อวูล์ฟเฟีย" : "Report, Wolffia Pond Analytics");
    if (exportStart || exportEnd) {
      lines.push(`${isTH ? "ช่วงวันที่" : "Date Range"}, ${exportStart || "-"} to ${exportEnd || "-"}`);
    }
    lines.push(`${isTH ? "ประเภทที่เลือก" : "Selected Types"}, ${selectedDataTypes.map((key) => dataTypeOptions.find((opt) => opt.key === key)?.label || key).join(" | ") || "-"}`);
    lines.push("");

    if (selectedDataTypes.includes("monthly")) {
      lines.push(`${isTH ? "ส่วน" : "Section"}, ${isTH ? "สถิติรายเดือน" : "Monthly Stats"}`);
      lines.push("month,yield,frequency");
      wolffiaStatsDevice.forEach((row) => {
        lines.push(`${row.month},${row.yield},${row.frequency}`);
      });
      lines.push("");
    }

    if (selectedDataTypes.includes("harvest")) {
      lines.push(`${isTH ? "ส่วน" : "Section"}, ${isTH ? "ประวัติเก็บเกี่ยว" : "Harvest History"}`);
      lines.push("id,weight,date,interval");
      recentHarvestLogsDevice.forEach((row) => {
        lines.push(`${row.id},${row.weight},${row.date},${row.interval}`);
      });
      lines.push("");
    }

    if (selectedDataTypes.includes("metrics")) {
      lines.push(`${isTH ? "ส่วน" : "Section"}, ${isTH ? "ค่าชี้วัดบ่อ" : "Pond Metrics"}`);
      lines.push("metric,value,trend");
      pondMetricsDevice.forEach((row) => {
        lines.push(`${row.metric},${row.value},${row.trend}`);
      });
      lines.push("");
    }

    return lines.join("\n");
  };

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      if (selectedDataTypes.length === 0) {
        toast.error(isTH ? "ส่งออกล้มเหลว" : "Export Failed", { description: isTH ? "กรุณาเลือกอย่างน้อย 1 ประเภทข้อมูล" : "Please select at least one data type." });
        return;
      }
      const payload = buildExportPayload();
      const filename = `wolffia_analytics.${format}`;
      if (format === "pdf") {
        await downloadSimplePdf(filename, payload);
      } else {
        downloadTextFile(filename, payload, "text/csv;charset=utf-8");
      }
      toast.success(isTH ? "ส่งออกสำเร็จ" : "Export Successful", {
        description: isTH ? `ดาวน์โหลด ${filename}` : `Downloaded ${filename}`
      });
    } catch {
      toast.error(isTH ? "ส่งออกล้มเหลว" : "Export Failed", {
        description: isTH ? "ไม่สามารถสร้างไฟล์ได้" : "Could not generate export file."
      });
    }
  };

  return (
    <>
      <header className="solid-surface border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Scale className="w-6 h-6 text-primary" />
              {isTH ? "วิเคราะห์บ่อวูล์ฟเฟีย" : "Wolffia Pond Analytics"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isTH ? "ประสิทธิภาพบ่อเดียวและความถี่การเก็บเกี่ยว" : "Single Pond Performance & Harvest Frequency"}
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40">
                {deviceLabel}
              </Badge>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="gap-2 border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setIsExportOpen(true)}
          >
            <TrendingUp className="w-4 h-4" />
            {isTH ? "ส่งออกรายงานรายเดือน" : "Export Monthly Report"}
          </Button>
        </div>
      </header>
      
      {/* Export Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-5 h-5 text-primary" />
              {isTH ? "ส่งออกรายงานรายเดือน" : "Export Monthly Report"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {isTH ? "ตัวอย่างข้อมูลที่จะส่งออกในช่วงปัจจุบัน" : "Preview of data to be exported for the current period."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground h-8">{isTH ? "เดือน" : "Month"}</TableHead>
                    <TableHead className="text-muted-foreground h-8 text-right">{isTH ? "ผลผลิต (กรัม)" : "Yield (g)"}</TableHead>
                    <TableHead className="text-muted-foreground h-8 text-right">{isTH ? "ความถี่" : "Frequency"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wolffiaStatsDevice.map((row, i) => (
                    <TableRow key={i} className="border-border hover:bg-muted/50">
                      <TableCell className="text-foreground py-2">{row.month}</TableCell>
                      <TableCell className="text-emerald-600 dark:text-emerald-400 font-medium text-right py-2">{row.yield}</TableCell>
                      <TableCell className="text-amber-600 dark:text-amber-400 text-right py-2">{row.frequency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              * This export includes total biomass yield and harvest counts for Jan-Jun.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportOpen(false)} className="border-border text-muted-foreground hover:bg-muted">
              {isTH ? "ยกเลิก" : "Cancel"}
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
              {isTH ? "ดาวน์โหลด CSV" : "Download CSV"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="page-solid-cards flex-1 overflow-auto p-8 ">
        <ExportFiltersCard
          startDate={exportStart}
          endDate={exportEnd}
          onStartDateChange={setExportStart}
          onEndDateChange={setExportEnd}
          title={isTH ? "ตัวกรองสำหรับส่งออก" : "Export Filters"}
          description={isTH ? "เลือกช่วงวันที่และประเภทข้อมูลเพื่อดาวน์โหลด CSV/PDF" : "Select date range and data types to download CSV/PDF"}
          startDateLabel={isTH ? "วันที่เริ่มต้น" : "Start Date"}
          endDateLabel={isTH ? "วันที่สิ้นสุด" : "End Date"}
          options={dataTypeOptions}
          selectedKeys={selectedDataTypes}
          onToggleKey={(key) =>
            setSelectedDataTypes((prev) =>
              prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]
            )
          }
          onDownloadCsv={() => handleExport("csv")}
          onDownloadPdf={() => handleExport("pdf")}
          downloadCsvLabel={isTH ? "ดาวน์โหลด CSV" : "Download CSV"}
          downloadPdfLabel={isTH ? "ดาวน์โหลด PDF" : "Download PDF"}
        />
        {/* Dual Axis Chart */}
        <Card className="rounded-xl border border-border shadow-lg !bg-card !opacity-100 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Sprout className="w-5 h-5 text-primary" />
              {isTH ? "ผลผลิตเทียบความถี่การเก็บเกี่ยว" : "Yield vs. Harvest Frequency"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isTH ? "เปรียบเทียบผลผลิตรวม (กรัม) กับจำนวนครั้งที่เก็บเกี่ยว (ครั้ง/เดือน)" : "Comparing Total Biomass (g) with Harvest Count (times/month)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={wolffiaStatsDevice} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="#10b981"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: isTH ? "ผลผลิต (กรัม)" : "Yield (g)", angle: -90, position: 'insideLeft', fill: '#10b981' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="#f59e0b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Frequency (times)', angle: 90, position: 'insideRight', fill: '#f59e0b' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      color: "hsl(var(--foreground))"
                    }}
                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar yAxisId="left" dataKey="yield" fill="#10b981" name={isTH ? "ผลผลิตชีวมวล (กรัม)" : "Biomass Yield (g)"} radius={[4, 4, 0, 0]} barSize={40} />
                  <Line yAxisId="right" type="monotone" dataKey="frequency" stroke="#f59e0b" strokeWidth={3} name={isTH ? "จำนวนเก็บเกี่ยว (ครั้ง/เดือน)" : "Harvests (times/month)"} dot={{ r: 4, fill: "#f59e0b" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Metrics & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Metrics */}
          <Card className="rounded-xl border border-border shadow-lg !bg-card !opacity-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Droplets className="w-5 h-5 text-blue-500" />
                {isTH ? "ตัวชี้วัดประสิทธิภาพหลัก" : "Key Performance Indicators"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isTH ? "สถิติประสิทธิภาพของบ่อปัจจุบัน" : "Efficiency stats for the current pond"}
              </CardDescription>
            </CardHeader>
            <CardContent>
               <div className="grid grid-cols-2 gap-4">
                 {pondMetricsDevice.map((item, idx) => (
                   <div key={idx} className="p-4 rounded-lg bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">
                        {isTH
                          ? ({
                              "Avg Harvest / Month": "เก็บเกี่ยวเฉลี่ย/เดือน",
                              "Avg Yield / Harvest": "ผลผลิตเฉลี่ย/ครั้ง",
                              "Total Yield": "ผลผลิตรวม",
                              "Cycle Duration": "ระยะเวลารอบการผลิต",
                            } as Record<string, string>)[item.metric] || item.metric
                          : item.metric}
                      </p>
                      <div className="flex items-end justify-between">
                        <span className="text-xl font-bold text-foreground">{item.value}</span>
                        {item.trend !== "0" && (
                           <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center">
                             {item.trend}
                           </span>
                        )}
                      </div>
                   </div>
                 ))}
               </div>
            </CardContent>
          </Card>

          {/* Recent Harvests */}
          <Card className="rounded-xl border border-border shadow-lg !bg-card !opacity-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Timer className="w-5 h-5 text-amber-500" />
                {isTH ? "ประวัติเก็บเกี่ยว" : "Harvest History"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isTH ? "บันทึกรอบการเก็บเกี่ยวล่าสุด" : "Log of recent collection cycles"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-muted/50">
                    <TableHead className="font-semibold text-muted-foreground">{isTH ? "รหัสรอบ" : "Batch ID"}</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">{isTH ? "ช่วงเวลา" : "Interval"}</TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-right">{isTH ? "ผลผลิต" : "Yield"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentHarvestLogsDevice.map((log, index) => (
                    <TableRow key={index} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">
                          {log.id}
                        </span>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {log.date}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border text-amber-600 dark:text-amber-400 bg-amber-500/10">
                          {log.interval}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{log.weight}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
