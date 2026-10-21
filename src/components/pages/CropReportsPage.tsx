import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Download, Eye, Calendar, FileText, Share2, Sprout, Droplets, Zap, Plus, Trash2, Thermometer } from "lucide-react";
import { toast } from "sonner";
import { downloadSimplePdf, downloadTextFile } from "@/utils/download";
import { ExportFiltersCard } from "@/components/ExportFiltersCard";
import { useDeviceSeed } from "@/hooks/useActiveDeviceId";
import { MinimalDatePicker } from "../ui/minimal-date-picker";
import { MinimalTimePicker } from "../ui/minimal-time-picker";
import {
  createMyCropYieldEntry,
  CropYieldEntry,
  deleteMyCropYieldEntry,
  loadMyCropYieldEntries,
} from "@/utils/cropYieldStore";
import { HarvestReportChart } from "../dashboard/HarvestReportChart";
import { filterHarvestRows, summarizeHarvestRows } from "@/utils/harvestReport";
import { useMachine } from "@/contexts/MachineContext";

type CropReportsPageProps = {
  language?: string;
};

const currentDateValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const currentTimeValue = () => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
};

export function CropReportsPage({ language = "TH" }: CropReportsPageProps) {
  const { deviceId, seed } = useDeviceSeed();
  const { phValue, ecValue, tempValue } = useMachine();
  const isTH = language === "TH";
  const activeDeviceId = deviceId || "default";
  const deviceLabel = deviceId ? `${isTH ? "อุปกรณ์" : "Device"} ${deviceId}` : (isTH ? "ทุกอุปกรณ์" : "All Devices");
  const [showEntry, setShowEntry] = useState(false);
  const [selectedReport, setSelectedReport] = useState<CropYieldEntry | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedFields, setSelectedFields] = useState<string[]>(["yield", "ph", "ec", "temp"]);
  const [deviceReportData, setDeviceReportData] = useState<CropYieldEntry[]>([]);
  const [form, setForm] = useState({
    date: currentDateValue(),
    time: currentTimeValue(),
    yield: "",
    ph: "7.0",
    ec: "1.8",
    temp: "25.0",
    note: "",
  });

  useEffect(() => {
    let active = true;
    loadMyCropYieldEntries(activeDeviceId)
      .then((rows) => { if (active) setDeviceReportData(rows); })
      .catch(() => { if (active) setDeviceReportData([]); });
    return () => { active = false; };
  }, [activeDeviceId, seed]);

  useEffect(() => {
    const nextPh = phValue > 0 ? phValue : null;
    const nextEc = ecValue > 0 ? ecValue : null;
    const nextTemp = tempValue > 0 ? tempValue : null;

    if (nextPh == null && nextEc == null && nextTemp == null) return;

    setForm((prev) => ({
      ...prev,
      ph: nextPh != null ? nextPh.toFixed(2) : prev.ph,
      ec: nextEc != null ? nextEc.toFixed(2) : prev.ec,
      temp: nextTemp != null ? nextTemp.toFixed(1) : prev.temp,
    }));
  }, [ecValue, phValue, tempValue]);

  const filteredReportData = useMemo(() => filterHarvestRows(deviceReportData, {
    month: selectedMonth, startDate, endDate, startTime, endTime,
  }), [deviceReportData, selectedMonth, startDate, endDate, startTime, endTime]);

  const activeFilterCount = [selectedMonth, startDate, endDate, startTime, endTime].filter(Boolean).length;
  const resultSummary = isTH
    ? `พบ ${filteredReportData.length} รายการ${activeFilterCount ? ` จาก ${activeFilterCount} ตัวกรอง` : ""}`
    : `${filteredReportData.length} record${filteredReportData.length === 1 ? "" : "s"}${activeFilterCount ? ` from ${activeFilterCount} filter${activeFilterCount === 1 ? "" : "s"}` : ""}`;

  const handleClearHistoryFilters = () => {
    setSelectedMonth("");
    setStartDate("");
    setEndDate("");
    setStartTime("");
    setEndTime("");
  };

  const reportSummary = useMemo(() => summarizeHarvestRows(filteredReportData), [filteredReportData]);

  const exportRows = useMemo(() => {
    return filteredReportData.map((row) => {
      const base: any = { date: row.date, time: row.time };
      selectedFields.forEach((field) => {
        base[field] = (row as any)[field];
      });
      return base;
    });
  }, [filteredReportData, selectedFields]);

  const handleSaveManualEntry = async () => {
    const yieldValue = Number(form.yield);
    const phValue = Number(form.ph);
    const ecValue = Number(form.ec);
    const tempValue = Number(form.temp);

    if (!form.date || !form.time || !Number.isFinite(yieldValue) || yieldValue <= 0) {
      toast.error(isTH ? "กรอกข้อมูลไม่ครบ" : "Missing data", {
        description: isTH ? "กรุณากรอกวันที่ เวลา และผลผลิตเป็นตัวเลขมากกว่า 0" : "Please enter date, time, and yield greater than 0.",
      });
      return;
    }

    try {
      const saved = await createMyCropYieldEntry({
        deviceId: activeDeviceId,
        date: form.date,
        time: form.time,
        yield: yieldValue,
        ph: Number.isFinite(phValue) ? phValue : 7,
        oxygen: 0, // Retained for compatibility with the existing storage schema.
        ec: Number.isFinite(ecValue) ? ecValue : 0,
        temp: Number.isFinite(tempValue) ? tempValue : 0,
        note: form.note,
      });
      setDeviceReportData((rows) => [saved, ...rows]);
    } catch (error) {
      toast.error(isTH ? "บันทึกไม่สำเร็จ" : "Save failed", {
        description: error instanceof Error ? error.message : undefined,
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      time: currentTimeValue(),
      yield: "",
      note: "",
    }));
    toast.success(isTH ? "บันทึกผลผลิตแล้ว" : "Harvest saved", {
      description: isTH ? "ข้อมูลนี้จะถูกนำไปเฉลี่ยใน Wolffia Pond Analytics" : "This entry will be reflected in Wolffia Pond Analytics.",
    });
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteMyCropYieldEntry(entryId);
      setDeviceReportData((rows) => rows.filter((entry) => entry.id !== entryId));
      toast.success(isTH ? "ลบรายการแล้ว" : "Entry deleted");
    } catch (error) {
      toast.error(isTH ? "ลบไม่สำเร็จ" : "Delete failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
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
      <header className="animate-in border-b border-white/80 bg-white/90 px-4 py-5 shadow-[0_12px_35px_-28px_rgba(15,23,42,.45)] backdrop-blur-xl fade-in slide-in-from-bottom-2 duration-700 motion-reduce:animate-none md:px-8">
        <div className="mx-auto flex w-full max-w-[1840px] flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex min-w-0 items-center gap-3 text-2xl font-black tracking-tight text-slate-900">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-lime-50 text-emerald-600 shadow-sm"><Sprout className="h-6 w-6" /></span>
              <span className="min-w-0">{isTH ? "รายงานผลผลิตและคุณภาพรายวัน" : "Daily Harvest & Quality"}</span>
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
          <Button aria-controls="harvest-entry-form" aria-expanded={showEntry} onClick={() => setShowEntry(value => !value)} className="shrink-0 gap-2"><Plus className="h-4 w-4" />{isTH ? (showEntry ? "ปิดฟอร์ม" : "เพิ่มผลผลิต") : (showEntry ? "Close entry" : "Add harvest")}</Button>
        </div>
      </header>

      <main className="page-solid-cards flex-1 overflow-auto bg-[#f2f5f3] p-4 dark:bg-slate-950 md:p-6">
        <div className="mx-auto w-full max-w-[1840px] space-y-5">
        <section className="report-summary" aria-label={isTH ? "สรุปช่วงที่เลือก" : "Selected period summary"}>
          <div className="report-summary-lead"><p className="workspace-eyebrow">{isTH ? "ผลผลิตรวมในช่วงที่เลือก" : "HARVEST IN SELECTED PERIOD"}</p><p className="report-summary-value">{reportSummary.totalYield.toLocaleString()}<span>g</span></p><p className="text-sm text-muted-foreground">{reportSummary.days} {isTH ? "วันที่มีการเก็บเกี่ยว" : "harvest days"}</p></div>
          {[
            { label: isTH ? "รายการเก็บเกี่ยว" : "Harvest entries", value: reportSummary.records, unit: isTH ? "รายการ" : "entries" },
            { label: isTH ? "pH เฉลี่ย" : "Average pH", value: reportSummary.avgPh ?? "—", unit: "pH" },
            { label: isTH ? "EC เฉลี่ย" : "Average EC", value: reportSummary.avgEc ?? "—", unit: "mS/cm" },
            { label: isTH ? "อุณหภูมิเฉลี่ย" : "Average temperature", value: reportSummary.avgTemp ?? "—", unit: "°C" },
          ].map(metric => <div key={metric.label} className="report-summary-item"><p className="text-sm text-muted-foreground">{metric.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.unit}</p></div>)}
        </section>
        <div className="[&>div:last-child]:mb-0 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 motion-reduce:animate-none">
          {showEntry && <Card id="harvest-entry-form" surface="flat" className="mb-5 rounded-2xl border border-white/80 shadow-[0_24px_60px_-42px_rgba(15,23,42,.5)] !bg-white !opacity-100">
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
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 [&_input]:h-10 [&_input]:rounded-xl [&_p]:flex [&_p]:h-6 [&_p]:items-center">
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{isTH ? "วันที่เก็บ" : "Date"}</p>
                  <MinimalDatePicker
                    value={form.date}
                    onChange={(value) => setForm((prev) => ({ ...prev, date: value }))}
                    className="[&_button]:rounded-xl"
                    ariaLabel={isTH ? "เลือกวันที่เก็บ" : "Select harvest date"}
                    locale={isTH ? "TH" : "EN"}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{isTH ? "เวลา" : "Time"}</p>
                  <MinimalTimePicker
                    value={form.time}
                    onChange={(value) => setForm((prev) => ({ ...prev, time: value }))}
                    className="[&_button]:rounded-xl"
                    ariaLabel={isTH ? "เลือกเวลาเก็บ" : "Select harvest time"}
                    locale={isTH ? "TH" : "EN"}
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{isTH ? "ผลผลิต (กรัม)" : "Yield (g)"}</p>
                  <Input type="number" min="0" step="0.1" value={form.yield} onChange={(event) => setForm((prev) => ({ ...prev, yield: event.target.value }))} placeholder="120" />
                </div>
                <div>
                  <p className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                    <span>pH</span>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">
                      AUTO
                    </Badge>
                  </p>
                  <Input type="number" step="0.01" value={form.ph} readOnly className="bg-muted/40" />
                </div>

                <div>
                  <p className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                    <span>EC</span>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">
                      AUTO
                    </Badge>
                  </p>
                  <Input type="number" step="0.01" value={form.ec} readOnly className="bg-muted/40" />
                </div>
                <div>
                  <p className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                    <span>{isTH ? "อุณหภูมิ" : "Temp"}</span>
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-600 dark:text-emerald-400">
                      AUTO
                    </Badge>
                  </p>
                  <Input type="number" step="0.1" value={form.temp} readOnly className="bg-muted/40" />
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center">
                <Input
                  className="h-10 min-w-0 flex-1 rounded-xl"
                  aria-label={isTH ? "หมายเหตุ" : "Note"}
                  value={form.note}
                  onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                  placeholder={isTH ? "หมายเหตุ เช่น รอบเช้า / บ่อ A / คุณภาพดี" : "Note, e.g. morning batch / pond A / good quality"}
                />
                <Button className="h-10 shrink-0 gap-2 rounded-xl bg-emerald-600 px-6 text-white hover:bg-emerald-700" onClick={handleSaveManualEntry}><Plus className="h-4 w-4" />{isTH ? "บันทึกผลผลิต" : "Save harvest"}</Button>
              </div>
            </CardContent>
          </Card>}

          <section className="report-workbench">
          <ExportFiltersCard
            embedded
            startDate={startDate}
            endDate={endDate}
            month={selectedMonth}
            startTime={startTime}
            endTime={endTime}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
            onMonthChange={setSelectedMonth}
            onStartTimeChange={setStartTime}
            onEndTimeChange={setEndTime}
            title={isTH ? "ค้นหาและดาวน์โหลดรายงาน" : "Find & download reports"}
            description={isTH ? "เลือกเดือน/ปี วันที่ และเวลา เพื่อดูข้อมูลย้อนหลังในตารางและส่งออก CSV/PDF" : "Select month/year, date, and time to review historical records and export CSV/PDF."}
            locale={isTH ? "TH" : "EN"}
            resultSummary={resultSummary}
            monthLabel={isTH ? "เดือน/ปี" : "Month / Year"}
            startDateLabel={isTH ? "วันที่เริ่มต้น" : "Start Date"}
            endDateLabel={isTH ? "วันที่สิ้นสุด" : "End Date"}
            startTimeLabel={isTH ? "เวลาเริ่มต้น" : "Start Time"}
            endTimeLabel={isTH ? "เวลาสิ้นสุด" : "End Time"}
            options={[
              { key: "yield", label: isTH ? "ผลผลิต (กรัม)" : "Yield (g)" },
              { key: "ph", label: "pH" },
              { key: "ec", label: isTH ? "EC (mS/cm)" : "EC (mS/cm)" },
              { key: "temp", label: isTH ? "อุณหภูมิ (°C)" : "Temperature (°C)" },
            ]}
            selectedKeys={selectedFields}
            onToggleKey={(key) =>
              setSelectedFields((prev) =>
                prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]
              )
            }
            onDownloadCsv={() => handleDownload(exportRows, "farm_report.csv", "csv")}
            onDownloadPdf={() => handleDownload(exportRows, "farm_report.pdf", "pdf")}
            onClearFilters={handleClearHistoryFilters}
            clearFiltersLabel={isTH ? "ล้างการค้นหา" : "Clear Search"}
            downloadCsvLabel={isTH ? "ดาวน์โหลด CSV" : "Download CSV"}
            downloadPdfLabel={isTH ? "ดาวน์โหลด PDF" : "Download PDF"}
          />
          <HarvestReportChart rows={filteredReportData} language={language} />

        <Card surface="flat" className="report-details animate-in rounded-[24px] border border-white/80 shadow-[0_24px_60px_-42px_rgba(15,23,42,.5)] !bg-white !opacity-100 fade-in slide-in-from-bottom-8 duration-700 delay-350 motion-reduce:animate-none">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3"><CardTitle className="text-base text-foreground">
              {isTH ? "รายงานผลผลิตและคุณภาพรายวัน" : "Daily Harvest & Quality Report"}
            </CardTitle><Badge variant="secondary" className="text-xs">{resultSummary}</Badge></div>
            <CardDescription className="text-muted-foreground">
              {isTH ? "สรุปผลผลิตรายวัน ค่า pH และค่าการนำไฟฟ้า" : "Breakdown of daily yield, pH and conductivity levels"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-muted/50">
                  <TableHead className="font-semibold text-muted-foreground w-[180px] whitespace-nowrap">{isTH ? "วันที่" : "Date"}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{isTH ? "เวลา" : "Time"}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{isTH ? "ผลผลิต (กรัม)" : "Yield (g)"}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{isTH ? "ค่า pH" : "pH Level"}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{isTH ? "EC (mS/cm)" : "EC (mS/cm)"}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">{isTH ? "อุณหภูมิ" : "Temp"}</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-right">{isTH ? "การทำงาน" : "Action"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReportData.map((row) => (
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
                    <TableCell className="font-medium text-muted-foreground">
                      {row.time || "-"}
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
                        <Zap className="w-4 h-4 text-yellow-500" />
                        {row.ec}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Thermometer className="w-4 h-4 text-blue-500" />
                        {row.temp} °C
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
                {filteredReportData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {deviceReportData.length === 0
                        ? (isTH ? "ยังไม่มีข้อมูล กรุณากรอกผลผลิตด้านบน" : "No entries yet. Add a harvest entry above.")
                        : (isTH ? "ไม่มีข้อมูลที่บันทึก" : "No saved data for this filter.")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
          </section>
        </div>
        </div>
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
                  ? `วิเคราะห์สำหรับ ${new Date(selectedReport.date).toLocaleDateString("th-TH")} เวลา ${selectedReport.time}`
                  : `Analysis for ${new Date(selectedReport.date).toLocaleDateString()} at ${selectedReport.time}`)}
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
                    <Zap className="w-3 h-3 text-yellow-500" />
                    <p className="text-xs font-medium text-muted-foreground">{isTH ? "การนำไฟฟ้า" : "Conductivity"}</p>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{selectedReport.ec} <span className="text-xs text-muted-foreground font-normal">mS/cm</span></p>
                </div>
                <div className="space-y-1 p-3 bg-muted/30 rounded-lg border border-border">
                   <div className="flex items-center gap-2 mb-1">
                    <Thermometer className="w-3 h-3 text-blue-500" />
                    <p className="text-xs font-medium text-muted-foreground">{isTH ? "อุณหภูมิ" : "Temperature"}</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedReport.temp} <span className="text-xs text-muted-foreground font-normal">°C</span></p>
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
