import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Input } from "../ui/input";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Sprout, TrendingUp, Scale, Calendar, ArrowUpRight, Droplets, Timer, Download, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { toast } from "sonner";
import { downloadSimplePdf, downloadTextFile } from "@/utils/download";

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

export function WolffiaAnalyticsPage() {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([
    "Monthly Stats",
    "Harvest History",
    "Pond Metrics",
  ]);

  const dataTypeOptions = [
    "Monthly Stats",
    "Harvest History",
    "Pond Metrics",
  ];

  const handleDownload = () => {
    try {
      if (!wolffiaStats.length) {
        toast.error("Export Failed", { description: "No data to export." });
        return;
      }
      const headers = Object.keys(wolffiaStats[0]).join(",");
      const csvContent =
        headers +
        "\n" +
        wolffiaStats.map((row) => Object.values(row).join(",")).join("\n");
      downloadTextFile("wolffia_monthly_report.csv", csvContent, "text/csv;charset=utf-8");
      
      toast.success("Export Successful", {
        description: "Monthly report has been downloaded."
      });
      setIsExportOpen(false);
    } catch (error) {
      toast.error("Export Failed", {
        description: "Could not generate report file."
      });
    }
  };

  const buildExportPayload = () => {
    const lines: string[] = [];
    lines.push(`Report, Wolffia Pond Analytics`);
    if (exportStart || exportEnd) {
      lines.push(`Date Range, ${exportStart || "-"} to ${exportEnd || "-"}`);
    }
    lines.push(`Selected Types, ${selectedDataTypes.join(" | ") || "-"}`);
    lines.push("");

    if (selectedDataTypes.includes("Monthly Stats")) {
      lines.push("Section, Monthly Stats");
      lines.push("month,yield,frequency");
      wolffiaStats.forEach((row) => {
        lines.push(`${row.month},${row.yield},${row.frequency}`);
      });
      lines.push("");
    }

    if (selectedDataTypes.includes("Harvest History")) {
      lines.push("Section, Harvest History");
      lines.push("id,weight,date,interval");
      recentHarvestLogs.forEach((row) => {
        lines.push(`${row.id},${row.weight},${row.date},${row.interval}`);
      });
      lines.push("");
    }

    if (selectedDataTypes.includes("Pond Metrics")) {
      lines.push("Section, Pond Metrics");
      lines.push("metric,value,trend");
      pondMetrics.forEach((row) => {
        lines.push(`${row.metric},${row.value},${row.trend}`);
      });
      lines.push("");
    }

    return lines.join("\n");
  };

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      if (selectedDataTypes.length === 0) {
        toast.error("Export Failed", { description: "Please select at least one data type." });
        return;
      }
      const payload = buildExportPayload();
      const filename = `wolffia_analytics.${format}`;
      if (format === "pdf") {
        await downloadSimplePdf(filename, payload);
      } else {
        downloadTextFile(filename, payload, "text/csv;charset=utf-8");
      }
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
      <header className="bg-card/50 border-b border-border px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Scale className="w-6 h-6 text-primary" />
              Wolffia Pond Analytics
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Single Pond Performance & Harvest Frequency</p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2 border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setIsExportOpen(true)}
          >
            <TrendingUp className="w-4 h-4" />
            Export Monthly Report
          </Button>
        </div>
      </header>
      
      {/* Export Dialog */}
      <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-5 h-5 text-primary" />
              Export Monthly Report
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Preview of data to be exported for the current period.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="rounded-md border border-border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="border-border">
                    <TableHead className="text-muted-foreground h-8">Month</TableHead>
                    <TableHead className="text-muted-foreground h-8 text-right">Yield (g)</TableHead>
                    <TableHead className="text-muted-foreground h-8 text-right">Frequency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wolffiaStats.map((row, i) => (
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
              Cancel
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4" />
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        {/* Dual Axis Chart */}
        <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Sprout className="w-5 h-5 text-primary" />
              Yield vs. Harvest Frequency
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Comparing Total Biomass (g) with Harvest Count (times/month)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={wolffiaStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                    label={{ value: 'Yield (g)', angle: -90, position: 'insideLeft', fill: '#10b981' }}
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
                  <Bar yAxisId="left" dataKey="yield" fill="#10b981" name="Biomass Yield (g)" radius={[4, 4, 0, 0]} barSize={40} />
                  <Line yAxisId="right" type="monotone" dataKey="frequency" stroke="#f59e0b" strokeWidth={3} name="Harvests (times/month)" dot={{ r: 4, fill: "#f59e0b" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Metrics & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Metrics */}
          <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Droplets className="w-5 h-5 text-blue-500" />
                Key Performance Indicators
              </CardTitle>
              <CardDescription className="text-muted-foreground">Efficiency stats for the current pond</CardDescription>
            </CardHeader>
            <CardContent>
               <div className="grid grid-cols-2 gap-4">
                 {pondMetrics.map((item, idx) => (
                   <div key={idx} className="p-4 rounded-lg bg-muted/30 border border-border">
                      <p className="text-xs text-muted-foreground mb-1">{item.metric}</p>
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
          <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Timer className="w-5 h-5 text-amber-500" />
                Harvest History
              </CardTitle>
              <CardDescription className="text-muted-foreground">Log of recent collection cycles</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-muted/50">
                    <TableHead className="font-semibold text-muted-foreground">Batch ID</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Interval</TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-right">Yield</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentHarvestLogs.map((log, index) => (
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
