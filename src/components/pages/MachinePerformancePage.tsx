import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ExportFiltersCard } from "@/components/ExportFiltersCard";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Bar, Line, Legend } from "recharts";
import { Heart, TrendingUp, Star, AlertCircle, Activity, Zap, Factory, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { downloadSimplePdf, downloadTextFile } from "@/utils/download";
import { useDeviceSeed } from "@/hooks/useActiveDeviceId";
import { rotateBy, seededInt } from "@/utils/deviceData";

type MachinePerformancePageProps = {
  language?: string;
};

// 1. Production Output Over Time (Kg & Growth Rate)
const productionData = [
  { date: "Day 1", morningYield: 42, afternoonYield: 38, growthRate: 85 },
  { date: "Day 2", morningYield: 45, afternoonYield: 40, growthRate: 88 },
  { date: "Day 3", morningYield: 41, afternoonYield: 39, growthRate: 86 },
  { date: "Day 4", morningYield: 48, afternoonYield: 42, growthRate: 92 },
  { date: "Day 5", morningYield: 52, afternoonYield: 45, growthRate: 95 },
  { date: "Day 6", morningYield: 50, afternoonYield: 44, growthRate: 93 },
  { date: "Day 7", morningYield: 55, afternoonYield: 48, growthRate: 97 },
];

// 2. Machine Performance Radar Data
const machinePerformanceData = [
  { category: "Energy Eff.", score: 85, fullMark: 100 },
  { category: "Env Control", score: 92, fullMark: 100 },
  { category: "Water Sys", score: 78, fullMark: 100 },
  { category: "Growth Rate", score: 88, fullMark: 100 },
  { category: "Stability", score: 95, fullMark: 100 },
  { category: "Uptime", score: 98, fullMark: 100 },
];

// 3. Top Performance Factors
const performanceFactors = [
  "pH levels stabilized (6.5-7.5)",
  "Consistent High DO (>6.0 mg/L)",
  "Optimized LED Cycles",
  "RO System Efficiency > 95%",
  "Stable Water Levels",
];

// 4. Production Issues / Bottlenecks
const bottleneckIssues = [
  "Minor pH Fluctuations at night",
  "DO drops post-harvest",
  "Intermittent EC calibration needed",
];

export function MachinePerformancePage({ language = "TH" }: MachinePerformancePageProps) {
  const { deviceId, seed } = useDeviceSeed();
  const isTH = language === "TH";
  const deviceLabel = deviceId ? `${isTH ? "อุปกรณ์" : "Device"} ${deviceId}` : (isTH ? "ทุกอุปกรณ์" : "All Devices");
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([
    "production",
    "system",
    "top",
    "constraints",
  ]);

  const dataTypeOptions = [
    { key: "production", label: isTH ? "ผลผลิต" : "Production Output" },
    { key: "system", label: isTH ? "ประสิทธิภาพระบบ" : "System Performance" },
    { key: "top", label: isTH ? "ปัจจัยหลัก" : "Top Factors" },
    { key: "constraints", label: isTH ? "ข้อจำกัด" : "Constraints" },
  ];

  const productionDataDevice = useMemo(
    () =>
      productionData.map((row, index) => ({
        ...row,
        date: isTH ? row.date.replace("Day", "วันที่") : row.date,
        morningYield: seededInt(row.morningYield, seed, index, 2, 30, 70),
        afternoonYield: seededInt(row.afternoonYield, seed, index, 2, 28, 68),
        growthRate: seededInt(row.growthRate, seed, index, 1, 78, 99),
      })),
    [seed, isTH],
  );

  const machinePerformanceDataDevice = useMemo(
    () =>
      machinePerformanceData.map((row, index) => ({
        ...row,
        category: isTH
          ? ({
              "Energy Eff.": "พลังงาน",
              "Env Control": "ควบคุมสภาพแวดล้อม",
              "Water Sys": "ระบบน้ำ",
              "Growth Rate": "อัตราเติบโต",
              "Stability": "เสถียรภาพ",
              "Uptime": "เวลาทำงาน",
            } as Record<string, string>)[row.category] || row.category
          : row.category,
        score: seededInt(row.score, seed, index, 2, 70, 99),
      })),
    [seed, isTH],
  );

  const performanceFactorsDevice = useMemo(
    () =>
      rotateBy(performanceFactors, seed).map((factor) =>
        isTH
          ? ({
              "pH levels stabilized (6.5-7.5)": "ค่า pH คงที่ (6.5-7.5)",
              "Consistent High DO (>6.0 mg/L)": "ค่า DO สูงสม่ำเสมอ (>6.0 mg/L)",
              "Optimized LED Cycles": "รอบไฟ LED เหมาะสม",
              "RO System Efficiency > 95%": "ประสิทธิภาพ RO > 95%",
              "Stable Water Levels": "ระดับน้ำคงที่",
            } as Record<string, string>)[factor] || factor
          : factor
      ),
    [seed, isTH],
  );

  const bottleneckIssuesDevice = useMemo(
    () =>
      rotateBy(bottleneckIssues, seed + 3).map((issue) =>
        isTH
          ? ({
              "Minor pH Fluctuations at night": "ค่า pH ผันผวนเล็กน้อยตอนกลางคืน",
              "DO drops post-harvest": "ค่า DO ลดลงหลังเก็บเกี่ยว",
              "Intermittent EC calibration needed": "ต้องปรับเทียบ EC เป็นระยะ",
            } as Record<string, string>)[issue] || issue
          : issue
      ),
    [seed, isTH],
  );

  const buildExportPayload = () => {
    const lines: string[] = [];
    lines.push(isTH ? "รายงาน, วิเคราะห์ประสิทธิภาพเครื่องจักร" : "Report, Machine Performance Analytics");
    if (exportStart || exportEnd) {
      lines.push(`${isTH ? "ช่วงวันที่" : "Date Range"}, ${exportStart || "-"} to ${exportEnd || "-"}`);
    }
    lines.push(`${isTH ? "ประเภทที่เลือก" : "Selected Types"}, ${selectedDataTypes.map((key) => dataTypeOptions.find((opt) => opt.key === key)?.label || key).join(" | ") || "-"}`);
    lines.push("");

    if (selectedDataTypes.includes("production")) {
      lines.push(`${isTH ? "ส่วน" : "Section"}, ${isTH ? "ผลผลิต" : "Production Output"}`);
      lines.push("date,morningYield,afternoonYield,growthRate");
      productionDataDevice.forEach((row) => {
        lines.push(`${row.date},${row.morningYield},${row.afternoonYield},${row.growthRate}`);
      });
      lines.push("");
    }

    if (selectedDataTypes.includes("system")) {
      lines.push(`${isTH ? "ส่วน" : "Section"}, ${isTH ? "ประสิทธิภาพระบบ" : "System Performance"}`);
      lines.push("category,score,fullMark");
      machinePerformanceDataDevice.forEach((row) => {
        lines.push(`${row.category},${row.score},${row.fullMark}`);
      });
      lines.push("");
    }

    if (selectedDataTypes.includes("top")) {
      lines.push(`${isTH ? "ส่วน" : "Section"}, ${isTH ? "ปัจจัยหลัก" : "Top Performance Factors"}`);
      lines.push("factor");
      performanceFactorsDevice.forEach((row) => {
        lines.push(`${row}`);
      });
      lines.push("");
    }

    if (selectedDataTypes.includes("constraints")) {
      lines.push(`${isTH ? "ส่วน" : "Section"}, ${isTH ? "ข้อจำกัดการผลิต" : "Production Constraints"}`);
      lines.push("issue");
      bottleneckIssuesDevice.forEach((row) => {
        lines.push(`${row}`);
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
      const filename = `machine_performance.${format}`;
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
      {/* Header */}
      <header className="solid-surface border-b border-border px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Factory className="w-6 h-6 text-blue-500" />
              {isTH ? "วิเคราะห์ประสิทธิภาพเครื่องจักร" : "Machine Performance Analytics"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isTH ? "วิเคราะห์ผลผลิตและประสิทธิภาพระบบ" : "Analyze production output and system efficiency"}
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/40">
                {deviceLabel}
              </Badge>
            </div>
          </div>
          <Button variant="outline" className="gap-2 border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground">
            <Activity className="w-4 h-4" />
            {isTH ? "สร้างรายงาน" : "Generate Report"}
          </Button>
        </div>
      </header>

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
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Chart 1: Production Output (Spans 2 columns) */}
          <Card className="lg:col-span-2 rounded-xl border border-border shadow-lg !bg-card !opacity-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                {isTH ? "ผลผลิตตามช่วงเวลา" : "Production Output Over Time"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isTH ? "ผลผลิต (กรัม) เทียบอัตราการเติบโต (%)" : "Yield (g) vs Growth Rate (%)"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={productionDataDevice} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} label={{ value: isTH ? "ผลผลิต (กรัม)" : "Yield (g)", angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" fontSize={12} tickLine={false} axisLine={false} label={{ value: isTH ? "อัตราเติบโต (%)" : "Growth (%)", angle: 90, position: 'insideRight', fill: '#F59E0B' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                      cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "20px" }}/>
                    <Bar yAxisId="left" dataKey="morningYield" name={isTH ? "ผลผลิตเช้า" : "Morning Yield"} fill="#3B82F6" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar yAxisId="left" dataKey="afternoonYield" name={isTH ? "ผลผลิตบ่าย" : "Afternoon Yield"} fill="#0EA5E9" radius={[4, 4, 0, 0]} stackId="a" />
                    <Line yAxisId="right" type="monotone" dataKey="growthRate" name={isTH ? "อัตราเติบโต %" : "Growth Rate %"} stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart 2: Machine Radar Stats (Spans 1 column) */}
          <Card className="rounded-xl border border-border shadow-lg !bg-card !opacity-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Zap className="w-5 h-5 text-yellow-500" />
                {isTH ? "ประสิทธิภาพระบบ" : "System Performance"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isTH ? "ประสิทธิภาพแยกตามหมวด" : "Efficiency by category"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={machinePerformanceDataDevice}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Radar name={isTH ? "ประสิทธิภาพ" : "Performance"} dataKey="score" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Factors & Issues */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Performance Factors */}
          <Card className="rounded-xl border border-border shadow-lg !bg-card !opacity-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Star className="w-5 h-5 text-emerald-500" />
                {isTH ? "ปัจจัยประสิทธิภาพสูง" : "Top Performance Factors"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isTH ? "เงื่อนไขที่ช่วยเพิ่มผลผลิต" : "Conditions contributing to high yield"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {performanceFactorsDevice.map((factor, index) => (
                  <div key={index} className="px-3 py-1.5 rounded-md text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    {factor}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bottlenecks */}
          <Card className="rounded-xl border border-border shadow-lg !bg-card !opacity-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <AlertCircle className="w-5 h-5 text-red-500" />
                {isTH ? "ข้อจำกัดการผลิต" : "Production Constraints"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isTH ? "ปัญหาที่ตรวจพบจากการทำงาน" : "Detected issues affecting consistency"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {bottleneckIssuesDevice.map((issue, index) => (
                  <div key={index} className="px-3 py-1.5 rounded-md text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    {issue}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analytics CTA */}
        <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-900 dark:to-slate-800 border border-border p-1 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500"></div>
          <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted border border-border">
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {isTH ? "วิเคราะห์เชิงพยากรณ์ขั้นสูง" : "Advanced Predictive Analytics"}
                </h3>
                <p className="text-muted-foreground text-sm max-w-lg">
                  {isTH
                    ? "ใช้ AI พยากรณ์ผลผลิตจากการเปรียบเทียบการตั้งค่าพารามิเตอร์ และรองรับการเทียบประสิทธิภาพหลายบ่อ"
                    : "Use AI to forecast yield based on parameter tuning comparisons and enable multi-pond performance benchmarking."}
                </p>
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
              {isTH ? "เริ่มวิเคราะห์" : "Run Analysis"}
            </Button>
          </div>
           {/* Overlay for light mode readability on dark gradient cards - handled by bg-white and dark:bg-transparent with z-index, but the design implies a specific look. Let's keep it dark themed for this CTA for premium feel, but ensure text is readable. actually, let's just make it dark always for 'premium' feel or adapt. The current code sets bg-white for light mode but keeps dark gradient text. that might be weird. Let's fix the class. */}
        </div>
      </main>
    </>
  );
}
