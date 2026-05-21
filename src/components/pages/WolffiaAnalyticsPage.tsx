import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ExportFiltersCard } from "@/components/ExportFiltersCard";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Sprout, TrendingUp, Scale, Droplets, Timer, Download, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { toast } from "sonner";
import { downloadSimplePdf, downloadTextFile } from "@/utils/download";
import { useDeviceSeed } from "@/hooks/useActiveDeviceId";
import {
  CropYieldEntry,
  getMonthlyYieldSummaries,
  MonthlyYieldSummary,
  readCropYieldEntries,
  subscribeCropYieldEntries,
} from "@/utils/cropYieldStore";

type WolffiaAnalyticsPageProps = {
  language?: string;
};

export function WolffiaAnalyticsPage({ language = "TH" }: WolffiaAnalyticsPageProps) {
  const { deviceId, seed } = useDeviceSeed();
  const isTH = language === "TH";
  const locale = isTH ? "th-TH" : "en-US";
  const activeDeviceId = deviceId || "default";
  const deviceLabel = deviceId ? `${isTH ? "อุปกรณ์" : "Device"} ${deviceId}` : (isTH ? "ทุกอุปกรณ์" : "All Devices");
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState("");
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [exportStartTime, setExportStartTime] = useState("");
  const [exportEndTime, setExportEndTime] = useState("");
  const [entries, setEntries] = useState<CropYieldEntry[]>(() => readCropYieldEntries(activeDeviceId));
  const [selectedMonth, setSelectedMonth] = useState<MonthlyYieldSummary | null>(null);
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

  useEffect(() => {
    const refresh = () => setEntries(readCropYieldEntries(activeDeviceId));
    refresh();
    return subscribeCropYieldEntries(refresh);
  }, [activeDeviceId, seed]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (exportMonth && !entry.date.startsWith(exportMonth)) return false;
      if (exportStart && entry.date < exportStart) return false;
      if (exportEnd && entry.date > exportEnd) return false;
      if (exportStartTime && entry.time < exportStartTime) return false;
      if (exportEndTime && entry.time > exportEndTime) return false;
      return true;
    });
  }, [entries, exportEnd, exportEndTime, exportMonth, exportStart, exportStartTime]);

  const wolffiaStatsDevice = useMemo(
    () => getMonthlyYieldSummaries(filteredEntries, locale),
    [filteredEntries, locale],
  );

  const totalYield = filteredEntries.reduce((sum, entry) => sum + entry.yield, 0);
  const avgHarvestPerMonth = wolffiaStatsDevice.length
    ? filteredEntries.length / wolffiaStatsDevice.length
    : 0;
  const avgYieldPerHarvest = filteredEntries.length ? totalYield / filteredEntries.length : 0;
  const latestEntries = useMemo(
    () => [...filteredEntries].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)).slice(0, 8),
    [filteredEntries],
  );

  const pondMetricsDevice = useMemo(
    () => [
      {
        metric: "Avg Harvest / Month",
        value: `${avgHarvestPerMonth.toFixed(1)} ${isTH ? "ครั้ง" : "times"}`,
        trend: filteredEntries.length ? `${wolffiaStatsDevice.length} ${isTH ? "เดือน" : "months"}` : "0",
      },
      {
        metric: "Avg Yield / Harvest",
        value: `${avgYieldPerHarvest.toFixed(1)} g`,
        trend: filteredEntries.length ? `${filteredEntries.length} ${isTH ? "รายการ" : "entries"}` : "0",
      },
      {
        metric: "Total Yield",
        value: `${totalYield.toFixed(1)} g`,
        trend: filteredEntries.length ? "+manual" : "0",
      },
      {
        metric: "Recorded Months",
        value: `${wolffiaStatsDevice.length}`,
        trend: "0",
      },
    ],
    [avgHarvestPerMonth, avgYieldPerHarvest, filteredEntries.length, isTH, totalYield, wolffiaStatsDevice.length],
  );

  const handleDownload = () => {
    try {
      if (!wolffiaStatsDevice.length) {
        toast.error(isTH ? "ส่งออกล้มเหลว" : "Export Failed", { description: isTH ? "ไม่มีข้อมูลสำหรับส่งออก" : "No data to export." });
        return;
      }
      const csvContent =
        "month,total_yield_g,average_yield_g,harvest_count,avg_ph,avg_oxygen,avg_ec\n" +
        wolffiaStatsDevice
          .map((row) => `${row.monthLabel},${row.yield},${row.averageYield},${row.frequency},${row.avgPh},${row.avgOxygen},${row.avgEc}`)
          .join("\n");
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
      lines.push("month,total_yield_g,average_yield_g,harvest_count,avg_ph,avg_oxygen,avg_ec");
      wolffiaStatsDevice.forEach((row) => {
        lines.push(`${row.monthLabel},${row.yield},${row.averageYield},${row.frequency},${row.avgPh},${row.avgOxygen},${row.avgEc}`);
      });
      lines.push("");
    }

    if (selectedDataTypes.includes("harvest")) {
      lines.push(`${isTH ? "ส่วน" : "Section"}, ${isTH ? "ประวัติเก็บเกี่ยว" : "Harvest History"}`);
      lines.push("date,time,yield_g,ph,oxygen,ec,temp,note");
      filteredEntries.forEach((row) => {
        lines.push(`${row.date},${row.time},${row.yield},${row.ph},${row.oxygen},${row.ec},${row.temp},${row.note || ""}`);
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
                  {wolffiaStatsDevice.map((row) => (
                    <TableRow key={row.key} className="border-border hover:bg-muted/50">
                      <TableCell className="text-foreground py-2">{row.monthLabel}</TableCell>
                      <TableCell className="text-emerald-600 dark:text-emerald-400 font-medium text-right py-2">{row.yield}</TableCell>
                      <TableCell className="text-amber-600 dark:text-amber-400 text-right py-2">{row.frequency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {isTH ? "* ข้อมูลมาจากรายการที่กรอกในหน้ารายงานผลผลิต" : "* Data comes from manual entries in Crop Reports."}
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
          month={exportMonth}
          startTime={exportStartTime}
          endTime={exportEndTime}
          onStartDateChange={setExportStart}
          onEndDateChange={setExportEnd}
          onMonthChange={setExportMonth}
          onStartTimeChange={setExportStartTime}
          onEndTimeChange={setExportEndTime}
          title={isTH ? "ตัวกรองสำหรับส่งออก" : "Export Filters"}
          description={isTH ? "เลือกเดือน วันที่ เวลา และประเภทข้อมูลเพื่อค้นหา/ดาวน์โหลด CSV/PDF" : "Select month, date, time, and data types to search/download CSV/PDF"}
          locale={isTH ? "TH" : "EN"}
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
              {isTH
                ? "คำนวณจากผลผลิตที่กรอกเอง แยกตามเดือนและปี กดแท่งสีเขียวเพื่อดูรายวันที่บันทึก"
                : "Calculated from manual entries by month and year. Click a green bar to inspect daily records."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={wolffiaStatsDevice} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="monthLabel" 
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
                  <Bar
                    yAxisId="left"
                    dataKey="yield"
                    fill="#10b981"
                    name={isTH ? "ผลผลิตชีวมวล (กรัม)" : "Biomass Yield (g)"}
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                    cursor="pointer"
                    onClick={(data) => setSelectedMonth(data.payload as MonthlyYieldSummary)}
                  />
                  <Line yAxisId="right" type="monotone" dataKey="frequency" stroke="#f59e0b" strokeWidth={3} name={isTH ? "จำนวนเก็บเกี่ยว (ครั้ง/เดือน)" : "Harvests (times/month)"} dot={{ r: 4, fill: "#f59e0b" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {wolffiaStatsDevice.length === 0 && (
              <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                {entries.length
                  ? (isTH ? "ไม่มีข้อมูลที่บันทึก" : "No saved data for this filter.")
                  : (isTH ? "ยังไม่มีข้อมูลผลผลิต กรุณากรอกที่หน้า รายงานผลผลิต" : "No harvest entries yet. Add data in Crop Reports.")}
              </div>
            )}
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
	                              "Recorded Months": "จำนวนเดือนที่มีข้อมูล",
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
                  {latestEntries.map((log) => (
                    <TableRow key={log.id} className="border-border hover:bg-muted/50">
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">
                          #{log.id.slice(0, 8)}
                        </span>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(log.date).toLocaleDateString(locale)} {log.time}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-border text-amber-600 dark:text-amber-400 bg-amber-500/10">
                          {log.note || (isTH ? "กรอกมือ" : "Manual")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{log.yield} g</span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {latestEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        {entries.length
                          ? (isTH ? "ไม่มีข้อมูลที่บันทึก" : "No saved data for this filter.")
                          : (isTH ? "ยังไม่มีประวัติเก็บเกี่ยว" : "No harvest history yet.")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog open={!!selectedMonth} onOpenChange={() => setSelectedMonth(null)}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sprout className="w-5 h-5 text-emerald-500" />
              {selectedMonth
                ? isTH
                  ? `รายละเอียดผลผลิต ${selectedMonth.monthLabel}`
                  : `Harvest details for ${selectedMonth.monthLabel}`
                : ""}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedMonth
                ? isTH
                  ? `ผลผลิตรวม ${selectedMonth.yield} กรัม, เฉลี่ย ${selectedMonth.averageYield} กรัม/ครั้ง, บันทึก ${selectedMonth.frequency} วัน`
                  : `Total ${selectedMonth.yield} g, average ${selectedMonth.averageYield} g/harvest, ${selectedMonth.frequency} records`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedMonth && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{isTH ? "ผลผลิตรวม" : "Total Yield"}</p>
                  <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{selectedMonth.yield} g</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{isTH ? "เฉลี่ย/ครั้ง" : "Average"}</p>
                  <p className="text-xl font-bold text-foreground">{selectedMonth.averageYield} g</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">pH</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{selectedMonth.avgPh}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">EC</p>
                  <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{selectedMonth.avgEc}</p>
                </div>
              </div>

              <div className="max-h-[360px] overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="border-border">
                      <TableHead>{isTH ? "วันที่" : "Date"}</TableHead>
                      <TableHead>{isTH ? "เวลา" : "Time"}</TableHead>
                      <TableHead className="text-right">{isTH ? "ผลผลิต" : "Yield"}</TableHead>
                      <TableHead className="text-right">pH</TableHead>
                      <TableHead className="text-right">{isTH ? "ออกซิเจน" : "Oxygen"}</TableHead>
                      <TableHead className="text-right">EC</TableHead>
                      <TableHead>{isTH ? "หมายเหตุ" : "Note"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedMonth.entries.map((entry) => (
                      <TableRow key={entry.id} className="border-border hover:bg-muted/50">
                        <TableCell>{new Date(entry.date).toLocaleDateString(locale)}</TableCell>
                        <TableCell>{entry.time}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">{entry.yield} g</TableCell>
                        <TableCell className="text-right">{entry.ph}</TableCell>
                        <TableCell className="text-right">{entry.oxygen}</TableCell>
                        <TableCell className="text-right">{entry.ec}</TableCell>
                        <TableCell className="text-muted-foreground">{entry.note || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMonth(null)} className="border-border text-muted-foreground hover:bg-muted">
              {isTH ? "ปิด" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
