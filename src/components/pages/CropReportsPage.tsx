import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Download, Eye, Calendar, Filter, FileText, Share2, Sprout, Droplets, Zap, Wind } from "lucide-react";
import { toast } from "sonner";
import { downloadTextFile } from "@/utils/download";

const reportData = [
  {
    date: "2025-01-24",
    yield: 145,
    ph: 7.2,
    oxygen: 6.8,
    ec: 1.8,
  },
  {
    date: "2025-01-23",
    yield: 132,
    ph: 7.1,
    oxygen: 6.6,
    ec: 1.7,
  },
  {
    date: "2025-01-22",
    yield: 156,
    ph: 6.9,
    oxygen: 6.4,
    ec: 1.9,
  },
  {
    date: "2025-01-21",
    yield: 128,
    ph: 7.4,
    oxygen: 7.1,
    ec: 1.6,
  },
  {
    date: "2025-01-20",
    yield: 142,
    ph: 7.0,
    oxygen: 6.9,
    ec: 1.7,
  },
  {
    date: "2025-01-19",
    yield: 138,
    ph: 7.2,
    oxygen: 6.7,
    ec: 1.8,
  },
  {
    date: "2025-01-18",
    yield: 125,
    ph: 6.8,
    oxygen: 6.5,
    ec: 1.9,
  },
];

export function CropReportsPage() {
  const [selectedReport, setSelectedReport] = useState<typeof reportData[0] | null>(null);

  const handleDownload = (data: any[], filename: string) => {
    try {
      if (!data.length) {
        toast.error("Download Failed", { description: "No data to export." });
        return;
      }
      const headers = Object.keys(data[0]).join(",");
      const csvContent =
        headers +
        "\n" +
        data.map((row) => Object.values(row).join(",")).join("\n");
      downloadTextFile(filename, csvContent, "text/csv;charset=utf-8");
      
      toast.success("Download Started", {
        description: `Successfully exported ${filename}`
      });
    } catch (error) {
      toast.error("Download Failed", {
        description: "Could not generate export file."
      });
    }
  };

  return (
    <>
      <header className="bg-card/50 border-b border-border px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Crop Reports</h1>
            <p className="text-sm text-muted-foreground mt-1">Export and analyze daily harvest and water quality data</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="gap-2 border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground">
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            <Button 
              size="sm" 
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0"
              onClick={() => handleDownload(reportData, "farm_report.csv")}
            >
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-xl border border-border shadow-sm bg-card/50 backdrop-blur-md">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-foreground mb-1">7</div>
              <div className="text-sm text-muted-foreground">Days Recorded</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border shadow-sm bg-card/50 backdrop-blur-md">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">966 g</div>
              <div className="text-sm text-muted-foreground">Total Yield</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border shadow-sm bg-card/50 backdrop-blur-md">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">7.1</div>
              <div className="text-sm text-muted-foreground">Avg pH Level</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border shadow-sm bg-card/50 backdrop-blur-md">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mb-1">6.7</div>
              <div className="text-sm text-muted-foreground">Avg Oxygen (mg/L)</div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-foreground">Daily Harvest & Quality Report</CardTitle>
            <CardDescription className="text-muted-foreground">
              Breakdown of daily yield, pH, oxygen, and conductivity levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="font-semibold text-muted-foreground w-[180px]">Date</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Yield (g)</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">pH Level</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Oxygen (mg/L)</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">EC (mS/cm)</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row) => (
                  <TableRow 
                    key={row.date}
                    className="border-border hover:bg-muted/50 transition-colors group"
                  >
                    <TableCell className="font-medium text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="group-hover:text-foreground">{new Date(row.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-emerald-500" />
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{row.yield}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`
                        ${row.ph >= 6.8 && row.ph <= 7.2 ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400" : "border-amber-500/50 text-amber-600 dark:text-amber-400"}
                        bg-muted/50
                      `}>
                        {row.ph}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Wind className="w-4 h-4 text-cyan-500" />
                        {row.oxygen}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        {row.ec}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={() => setSelectedReport(row)}
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-5 h-5 text-blue-400" />
              Daily Report Details
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedReport && `Analysis for ${new Date(selectedReport.date).toLocaleDateString()}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Sprout className="w-3 h-3 text-emerald-500" />
                    <p className="text-xs font-medium text-muted-foreground">Yield</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{selectedReport.yield} <span className="text-xs text-muted-foreground font-normal">g</span></p>
                </div>
                <div className="space-y-1 p-3 bg-muted/30 rounded-lg border border-border">
                   <div className="flex items-center gap-2 mb-1">
                    <Droplets className="w-3 h-3 text-blue-500" />
                    <p className="text-xs font-medium text-muted-foreground">pH Level</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedReport.ph}</p>
                </div>
                <div className="space-y-1 p-3 bg-muted/30 rounded-lg border border-border">
                   <div className="flex items-center gap-2 mb-1">
                    <Wind className="w-3 h-3 text-cyan-500" />
                    <p className="text-xs font-medium text-muted-foreground">Oxygen</p>
                  </div>
                  <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{selectedReport.oxygen} <span className="text-xs text-muted-foreground font-normal">mg/L</span></p>
                </div>
                <div className="space-y-1 p-3 bg-muted/30 rounded-lg border border-border">
                   <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <p className="text-xs font-medium text-muted-foreground">Conductivity</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{selectedReport.ec} <span className="text-xs text-muted-foreground font-normal">mS/cm</span></p>
                </div>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg space-y-2 border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Report Link:</span>
                </div>
                <code className="text-xs bg-muted p-2 rounded block text-muted-foreground truncate">
                  https://farm.example.com/daily/{selectedReport.date.replace(/-/g, '')}
                </code>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSelectedReport(null)} className="border-border text-muted-foreground hover:bg-muted">
              Close
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={() => {
                if (selectedReport) {
                  handleDownload([selectedReport], `daily_report_${selectedReport.date}.csv`);
                }
              }}
            >
              <Download className="w-4 h-4" />
              Download CSV
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
