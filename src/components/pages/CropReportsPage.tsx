import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Download, Eye, Calendar, Filter, FileText, Share2, Sprout, Droplets, Zap, Wind, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { downloadSimplePdf, downloadTextFile } from "@/utils/download";
import { ExportFiltersCard } from "@/components/ExportFiltersCard";
import { useDeviceSeed } from "@/hooks/useActiveDeviceId";
import { MinimalDatePicker } from "../ui/minimal-date-picker";
import {
  addCropYieldEntry,
  CropYieldEntry,
  deleteCropYieldEntry,
  readCropYieldEntries,
  subscribeCropYieldEntries,
} from "@/utils/cropYieldStore";

type CropReportsPageProps = {
  language?: string;
};

export function CropReportsPage({ language = "TH" }: CropReportsPageProps) {
  const { deviceId, seed } = useDeviceSeed();
  const isTH = language === "TH";
  const activeDeviceId = deviceId || "default";
  const deviceLabel = deviceId ? `${isTH ? "อุปกรณ์" : "Device"} ${deviceId}` : (isTH ? "ทุกอุปกรณ์" : "All Devices");
  const [selectedReport, setSelectedReport] = useState<CropYieldEntry | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>(["yield", "ph", "oxygen", "ec"]);
  const [deviceReportData, setDeviceReportData] = useState<CropYieldEntry[]>(() => readCropYieldEntries(activeDeviceId));
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    yield: "",
    ph: "7.0",
    oxygen: "6.5",
    ec: "1.8",
    note: "",
  });

  useEffect(() => {
    const refresh = () => setDeviceReportData(readCropYieldEntries(activeDeviceId));
    refresh();
    return subscribeCropYieldEntries(refresh);
  }, [activeDeviceId, seed]);

  const reportSummary = useMemo(() => {
    const days = deviceReportData.length;
    const totalYield = deviceReportData.reduce((sum, row) => sum + row.yield, 0);
    const avgPh =
      days > 0 ? deviceReportData.reduce((sum, row) => sum + row.ph, 0) / days : 0;
    const avgOxygen =
      days > 0
        ? deviceReportData.reduce((sum, row) => sum + row.oxygen, 0) / days
        : 0;
    return {
      days,
      totalYield,
      avgPh: Math.round(avgPh * 100) / 100,
      avgOxygen: Math.round(avgOxygen * 100) / 100,
    };
  }, [deviceReportData]);

  const filteredReportData = useMemo(() => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    return deviceReportData.filter((row) => {
      const d = new Date(row.date);
      if (Number.isNaN(d.getTime())) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [startDate, endDate, deviceReportData]);

  const exportRows = useMemo(() => {
    return filteredReportData.map((row) => {
      const base: any = { date: row.date };
      selectedFields.forEach((field) => {
        base[field] = (row as any)[field];
      });
      return base;
    });
  }, [filteredReportData, selectedFields]);

  const handleSaveManualEntry = () => {
    const yieldValue = Number(form.yield);
    const phValue = Number(form.ph);
    const oxygenValue = Number(form.oxygen);
    const ecValue = Number(form.ec);

    if (!form.date || !Number.isFinite(yieldValue) || yieldValue <= 0) {
      toast.error(isTH ? "กรอกข้อมูลไม่ครบ" : "Missing data", {
        description: isTH ? "กรุณากรอกวันที่และผลผลิตเป็นตัวเลขมากกว่า 0" : "Please enter a date and yield greater than 0.",
      });
      return;
    }

    addCropYieldEntry({
      deviceId: activeDeviceId,
      date: form.date,
      yield: yieldValue,
      ph: Number.isFinite(phValue) ? phValue : 7,
      oxygen: Number.isFinite(oxygenValue) ? oxygenValue : 0,
      ec: Number.isFinite(ecValue) ? ecValue : 0,
      note: form.note,
    });

    setForm((prev) => ({
      ...prev,
      yield: "",
      note: "",
    }));
    toast.success(isTH ? "บันทึกผลผลิตแล้ว" : "Harvest saved", {
      description: isTH ? "ข้อมูลนี้จะถูกนำไปเฉลี่ยใน Wolffia Pond Analytics" : "This entry will be reflected in Wolffia Pond Analytics.",
    });
  };

  const handleDeleteEntry = (entryId: string) => {
    deleteCropYieldEntry(entryId);
    toast.success(isTH ? "ลบรายการแล้ว" : "Entry deleted");
  };

  const handleDownload = async (data: any[], filename: string, format: "csv" | "pdf") => {
    try {
      if (!data.length) {
        toast.error(isTH ? "ดาวน์โหลดล้มเหลว" : "Download Failed", { description: isTH ? "ไม่มีข้อมูลสำหรับส่งออก" : "No data to export." });
        return;
      }
      const headers = Object.keys(data[0]).join(",");
      const csvContent =
        headers +
        "\n" +
        data.map((row) => Object.values(row).join(",")).join("\n");

      if (format === "pdf") {
        await downloadSimplePdf(filename, csvContent);
      } else {
        downloadTextFile(filename, csvContent, "text/csv;charset=utf-8");
      }
      
      toast.success(isTH ? "เริ่มดาวน์โหลด" : "Download Started", {
        description: isTH ? `ส่งออกสำเร็จ ${filename}` : `Successfully exported ${filename}`
      });
    } catch (error) {
      toast.error(isTH ? "ดาวน์โหลดล้มเหลว" : "Download Failed", {
        description: isTH ? "ไม่สามารถสร้างไฟล์ได้" : "Could not generate export file."
      });
    }
  };

  return (
    <>
      <header className="solid-surface border-b border-border px-8 py-6 animate-in fade-in slide-in-from-bottom-2 duration-700 motion-reduce:animate-none">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {isTH ? "รายงานผลผลิต" : "Crop Reports"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isTH ? "ส่งออกและวิเคราะห์ผลผลิตรายวันและคุณภาพน้ำ" : "Export and analyze daily harvest and water quality data"}
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40">
                {deviceLabel}
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="gap-2 border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground">
              <Filter className="w-4 h-4" />
              {isTH ? "ตัวกรอง" : "Filters"}
            </Button>
          </div>
        </div>
      </header>

      <main className="page-solid-cards flex-1 overflow-auto p-8">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 motion-reduce:animate-none">
          <Card className="mb-6 rounded-xl border border-border shadow-lg !bg-card !opacity-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Plus className="h-5 w-5 text-emerald-500" />
                {isTH ? "กรอกผลผลิตด้วยตนเอง" : "Manual Harvest Entry"}
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                {isTH
                  ? "ข้อมูลที่บันทึกจะถูกใช้คำนวณค่าเฉลี่ยรายเดือนและรายปีในหน้า Wolffia Pond Analytics"
                  : "Saved entries are used for monthly and yearly averages in Wolffia Pond Analytics."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{isTH ? "วันที่เก็บ" : "Date"}</p>
                  <MinimalDatePicker
                    value={form.date}
                    onChange={(value) => setForm((prev) => ({ ...prev, date: value }))}
                    ariaLabel={isTH ? "เลือกวันที่เก็บ" : "Select harvest date"}
                    locale={isTH ? "TH" : "EN"}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{isTH ? "ผลผลิต (กรัม)" : "Yield (g)"}</p>
                  <Input type="number" min="0" step="0.1" value={form.yield} onChange={(event) => setForm((prev) => ({ ...prev, yield: event.target.value }))} placeholder="120" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">pH</p>
                  <Input type="number" step="0.1" value={form.ph} onChange={(event) => setForm((prev) => ({ ...prev, ph: event.target.value }))} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{isTH ? "ออกซิเจน" : "Oxygen"}</p>
                  <Input type="number" step="0.1" value={form.oxygen} onChange={(event) => setForm((prev) => ({ ...prev, oxygen: event.target.value }))} />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">EC</p>
                  <Input type="number" step="0.1" value={form.ec} onChange={(event) => setForm((prev) => ({ ...prev, ec: event.target.value }))} />
                </div>
                <div className="flex items-end">
                  <Button className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700" onClick={handleSaveManualEntry}>
                    <Plus className="h-4 w-4" />
                    {isTH ? "บันทึก" : "Save"}
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <Input
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder={isTH ? "หมายเหตุ เช่น รอบเช้า / บ่อ A / คุณภาพดี" : "Note, e.g. morning batch / pond A / good quality"}
                />
              </div>
            </CardContent>
          </Card>

          <ExportFiltersCard
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            title={isTH ? "ตัวกรองสำหรับส่งออก" : "Export Filters"}
            description={isTH ? "เลือกช่วงวันที่และประเภทข้อมูลเพื่อดาวน์โหลด CSV/PDF" : "Select date range and data types to download CSV/PDF"}
            startDateLabel={isTH ? "วันที่เริ่มต้น" : "Start Date"}
            endDateLabel={isTH ? "วันที่สิ้นสุด" : "End Date"}
            options={[
              { key: "yield", label: isTH ? "ผลผลิต (กรัม)" : "Yield (g)" },
              { key: "ph", label: "pH" },
              { key: "oxygen", label: isTH ? "ออกซิเจน (mg/L)" : "Oxygen (mg/L)" },
              { key: "ec", label: isTH ? "EC (mS/cm)" : "EC (mS/cm)" },
            ]}
            selectedKeys={selectedFields}
            onToggleKey={(key) =>
              setSelectedFields((prev) =>
                prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]
              )
            }
            onDownloadCsv={() => handleDownload(exportRows, "farm_report.csv", "csv")}
            onDownloadPdf={() => handleDownload(exportRows, "farm_report.pdf", "pdf")}
            downloadCsvLabel={isTH ? "ดาวน์โหลด CSV" : "Download CSV"}
            downloadPdfLabel={isTH ? "ดาวน์โหลด PDF" : "Download PDF"}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-xl border border-border shadow-sm !bg-card !opacity-100 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-150 motion-reduce:animate-none">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-foreground mb-1">{reportSummary.days}</div>
              <div className="text-sm text-muted-foreground">{isTH ? "จำนวนวันที่บันทึก" : "Days Recorded"}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border shadow-sm !bg-card !opacity-100 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 motion-reduce:animate-none">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">{reportSummary.totalYield} g</div>
              <div className="text-sm text-muted-foreground">{isTH ? "ผลผลิตรวม" : "Total Yield"}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border shadow-sm !bg-card !opacity-100 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-250 motion-reduce:animate-none">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{reportSummary.avgPh}</div>
              <div className="text-sm text-muted-foreground">{isTH ? "ค่า pH เฉลี่ย" : "Avg pH Level"}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border border-border shadow-sm !bg-card !opacity-100 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300 motion-reduce:animate-none">
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mb-1">{reportSummary.avgOxygen}</div>
              <div className="text-sm text-muted-foreground">{isTH ? "ออกซิเจนเฉลี่ย (mg/L)" : "Avg Oxygen (mg/L)"}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-xl border border-border shadow-lg !bg-card !opacity-100 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-350 motion-reduce:animate-none">
          <CardHeader>
            <CardTitle className="text-foreground">
              {isTH ? "รายงานผลผลิตและคุณภาพรายวัน" : "Daily Harvest & Quality Report"}
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              {isTH ? "สรุปผลผลิตรายวัน ค่า pH ออกซิเจน และค่าการนำไฟฟ้า" : "Breakdown of daily yield, pH, oxygen, and conductivity levels"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="font-semibold text-muted-foreground w-[180px]">{isTH ? "วันที่" : "Date"}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{isTH ? "ผลผลิต (กรัม)" : "Yield (g)"}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{isTH ? "ค่า pH" : "pH Level"}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{isTH ? "ออกซิเจน (mg/L)" : "Oxygen (mg/L)"}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{isTH ? "EC (mS/cm)" : "EC (mS/cm)"}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-right">{isTH ? "การทำงาน" : "Action"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deviceReportData.map((row) => (
                  <TableRow 
                    key={row.id}
                    className="border-border hover:bg-muted/50 transition-colors group"
                  >
                    <TableCell className="font-medium text-muted-foreground">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="group-hover:text-foreground">{new Date(row.date).toLocaleDateString(isTH ? 'th-TH' : 'en-US', { 
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
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2 border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => setSelectedReport(row)}
                        >
                          <Eye className="w-4 h-4" />
                          {isTH ? "ดู" : "View"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 border-red-500/30 bg-transparent text-red-600 hover:bg-red-500/10"
                          onClick={() => handleDeleteEntry(row.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          {isTH ? "ลบ" : "Delete"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {deviceReportData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {isTH ? "ยังไม่มีข้อมูล กรุณากรอกผลผลิตด้านบน" : "No entries yet. Add a harvest entry above."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Report Detail Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-[425px] animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-5 h-5 text-blue-400" />
              {isTH ? "รายละเอียดรายงานรายวัน" : "Daily Report Details"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedReport &&
                (isTH
                  ? `วิเคราะห์สำหรับ ${new Date(selectedReport.date).toLocaleDateString("th-TH")}`
                  : `Analysis for ${new Date(selectedReport.date).toLocaleDateString()}`)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Sprout className="w-3 h-3 text-emerald-500" />
                    <p className="text-xs font-medium text-muted-foreground">{isTH ? "ผลผลิต" : "Yield"}</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{selectedReport.yield} <span className="text-xs text-muted-foreground font-normal">g</span></p>
                </div>
                <div className="space-y-1 p-3 bg-muted/30 rounded-lg border border-border">
                   <div className="flex items-center gap-2 mb-1">
                    <Droplets className="w-3 h-3 text-blue-500" />
                    <p className="text-xs font-medium text-muted-foreground">{isTH ? "ค่า pH" : "pH Level"}</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedReport.ph}</p>
                </div>
                <div className="space-y-1 p-3 bg-muted/30 rounded-lg border border-border">
                   <div className="flex items-center gap-2 mb-1">
                    <Wind className="w-3 h-3 text-cyan-500" />
                    <p className="text-xs font-medium text-muted-foreground">{isTH ? "ออกซิเจน" : "Oxygen"}</p>
                  </div>
                  <p className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{selectedReport.oxygen} <span className="text-xs text-muted-foreground font-normal">mg/L</span></p>
                </div>
                <div className="space-y-1 p-3 bg-muted/30 rounded-lg border border-border">
                   <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <p className="text-xs font-medium text-muted-foreground">{isTH ? "การนำไฟฟ้า" : "Conductivity"}</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{selectedReport.ec} <span className="text-xs text-muted-foreground font-normal">mS/cm</span></p>
                </div>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg space-y-2 border border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Share2 className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{isTH ? "ลิงก์รายงาน:" : "Report Link:"}</span>
                </div>
                <code className="text-xs bg-muted p-2 rounded block text-muted-foreground truncate">
                  https://farm.example.com/daily/{selectedReport.date.replace(/-/g, '')}
                </code>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setSelectedReport(null)} className="border-border bg-background text-foreground hover:bg-muted shadow-sm">
              {isTH ? "ปิด" : "Close"}
            </Button>
            <Button
              variant="outline"
              className="border-border bg-background text-foreground hover:bg-muted shadow-sm"
              onClick={() => {
                if (selectedReport) {
                  handleDownload([selectedReport], `daily_report_${selectedReport.date}.pdf`, "pdf");
                }
              }}
            >
              <FileText className="w-4 h-4 mr-1" />
              {isTH ? "ดาวน์โหลด PDF" : "Download PDF"}
            </Button>
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={() => {
                if (selectedReport) {
                  handleDownload([selectedReport], `daily_report_${selectedReport.date}.csv`, "csv");
                }
              }}
            >
              <Download className="w-4 h-4" />
              {isTH ? "ดาวน์โหลด CSV" : "Download CSV"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
