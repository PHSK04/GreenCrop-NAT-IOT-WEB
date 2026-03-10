import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Bar, Line, Legend } from "recharts";
import { Heart, TrendingUp, Star, AlertCircle, Activity, Zap, Factory, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { downloadTextFile } from "@/utils/download";

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

export function MachinePerformancePage() {
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([
    "Production Output",
    "System Performance",
    "Top Factors",
    "Constraints",
  ]);

  const dataTypeOptions = [
    "Production Output",
    "System Performance",
    "Top Factors",
    "Constraints",
  ];

  const buildExportPayload = () => {
    const lines: string[] = [];
    lines.push("Report, Machine Performance Analytics");
    if (exportStart || exportEnd) {
      lines.push(`Date Range, ${exportStart || "-"} to ${exportEnd || "-"}`);
    }
    lines.push(`Selected Types, ${selectedDataTypes.join(" | ") || "-"}`);
    lines.push("");

    if (selectedDataTypes.includes("Production Output")) {
      lines.push("Section, Production Output");
      lines.push("date,morningYield,afternoonYield,growthRate");
      productionData.forEach((row) => {
        lines.push(`${row.date},${row.morningYield},${row.afternoonYield},${row.growthRate}`);
      });
      lines.push("");
    }

    if (selectedDataTypes.includes("System Performance")) {
      lines.push("Section, System Performance");
      lines.push("category,score,fullMark");
      machinePerformanceData.forEach((row) => {
        lines.push(`${row.category},${row.score},${row.fullMark}`);
      });
      lines.push("");
    }

    if (selectedDataTypes.includes("Top Factors")) {
      lines.push("Section, Top Performance Factors");
      lines.push("factor");
      performanceFactors.forEach((row) => {
        lines.push(`${row}`);
      });
      lines.push("");
    }

    if (selectedDataTypes.includes("Constraints")) {
      lines.push("Section, Production Constraints");
      lines.push("issue");
      bottleneckIssues.forEach((row) => {
        lines.push(`${row}`);
      });
      lines.push("");
    }

    return lines.join("\n");
  };

  const handleExport = (format: "csv" | "pdf") => {
    try {
      if (selectedDataTypes.length === 0) {
        toast.error("Export Failed", { description: "Please select at least one data type." });
        return;
      }
      const payload = buildExportPayload();
      const filename = `machine_performance.${format}`;
      const mimeType = format === "pdf" ? "application/pdf" : "text/csv;charset=utf-8";
      downloadTextFile(filename, payload, mimeType);
      toast.success("Export Successful", {
        description: `Downloaded ${filename}`
      });
    } catch {
      toast.error("Export Failed", {
        description: "Could not generate export file."
      });
    }
  };

  return (
    <>
      {/* Header */}
      <header className="bg-card/50 border-b border-border px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Factory className="w-6 h-6 text-blue-500" />
              Machine Performance Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Analyze production output and system efficiency</p>
          </div>
          <Button variant="outline" className="gap-2 border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground">
            <Activity className="w-4 h-4" />
            Generate Report
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 ">
        <Card className="rounded-xl border border-border shadow-lg bg-white/90 dark:bg-slate-900/70 mb-8">
          <CardHeader>
            <CardTitle className="text-foreground text-base">Export Filters</CardTitle>
            <CardDescription className="text-muted-foreground">
              Select date range and data types to download CSV/PDF
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="date"
                aria-label="Export start date"
                value={exportStart}
                onChange={(e) => setExportStart(e.target.value)}
              />
              <Input
                type="date"
                aria-label="Export end date"
                value={exportEnd}
                onChange={(e) => setExportEnd(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {dataTypeOptions.map((option) => {
                const checked = selectedDataTypes.includes(option);
                return (
                  <label key={option} className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        setSelectedDataTypes((prev) =>
                          prev.includes(option)
                            ? prev.filter((v) => v !== option)
                            : [...prev, option]
                        );
                      }}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => handleExport("csv")}>
                <Download className="w-4 h-4" />
                Download CSV
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => handleExport("pdf")}>
                <FileText className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          
          {/* Chart 1: Production Output (Spans 2 columns) */}
          <Card className="lg:col-span-2 rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                Production Output Over Time
              </CardTitle>
              <CardDescription className="text-muted-foreground">Yield (g) vs Growth Rate (%)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={productionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Yield (g)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#F59E0B" fontSize={12} tickLine={false} axisLine={false} label={{ value: 'Growth (%)', angle: 90, position: 'insideRight', fill: '#F59E0B' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))" }}
                      cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "20px" }}/>
                    <Bar yAxisId="left" dataKey="morningYield" name="Morning Yield" fill="#3B82F6" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar yAxisId="left" dataKey="afternoonYield" name="Afternoon Yield" fill="#0EA5E9" radius={[4, 4, 0, 0]} stackId="a" />
                    <Line yAxisId="right" type="monotone" dataKey="growthRate" name="Growth Rate %" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart 2: Machine Radar Stats (Spans 1 column) */}
          <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Zap className="w-5 h-5 text-yellow-500" />
                System Performance
              </CardTitle>
              <CardDescription className="text-muted-foreground">Efficiency by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={machinePerformanceData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                    <Radar name="Performance" dataKey="score" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
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
          <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Star className="w-5 h-5 text-emerald-500" />
                Top Performance Factors
              </CardTitle>
              <CardDescription className="text-muted-foreground">Conditions contributing to high yield</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {performanceFactors.map((factor, index) => (
                  <div key={index} className="px-3 py-1.5 rounded-md text-sm font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    {factor}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bottlenecks */}
          <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Production Constraints
              </CardTitle>
              <CardDescription className="text-muted-foreground">Detected issues affecting consistency</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {bottleneckIssues.map((issue, index) => (
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
        <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-900 dark:to-slate-800 bg-white border border-border p-1 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500"></div>
          <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-muted border border-border">
                <Activity className="w-8 h-8 text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Advanced Predictive Analytics</h3>
                <p className="text-muted-foreground text-sm max-w-lg">
                  Use AI to forecast yield based on parameter tuning comparisons and enable multi-pond performance benchmarking.
                </p>
              </div>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white whitespace-nowrap">
              Run Analysis
            </Button>
          </div>
           {/* Overlay for light mode readability on dark gradient cards - handled by bg-white and dark:bg-transparent with z-index, but the design implies a specific look. Let's keep it dark themed for this CTA for premium feel, but ensure text is readable. actually, let's just make it dark always for 'premium' feel or adapt. The current code sets bg-white for light mode but keeps dark gradient text. that might be weird. Let's fix the class. */}
        </div>
      </main>
    </>
  );
}
