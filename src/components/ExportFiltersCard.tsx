import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MinimalDatePicker } from "@/components/ui/minimal-date-picker";
import { MinimalMonthPicker } from "@/components/ui/minimal-month-picker";
import { MinimalTimePicker } from "@/components/ui/minimal-time-picker";
import { Download, FileText, RotateCcw, Clock3, ChevronDown, Check } from "lucide-react";

type ExportFilterOption = {
  key: string;
  label: string;
};

type ExportFiltersCardProps = {
  title?: string;
  description?: string;
  startDateLabel?: string;
  endDateLabel?: string;
  monthLabel?: string;
  startTimeLabel?: string;
  endTimeLabel?: string;
  clearFiltersLabel?: string;
  resultSummary?: string;
  locale?: "TH" | "EN";
  startDate: string;
  endDate: string;
  month?: string;
  startTime?: string;
  endTime?: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onMonthChange?: (value: string) => void;
  onStartTimeChange?: (value: string) => void;
  onEndTimeChange?: (value: string) => void;
  options: ExportFilterOption[];
  selectedKeys: string[];
  onToggleKey: (key: string) => void;
  onDownloadCsv: () => void;
  onDownloadPdf: () => void;
  onClearFilters?: () => void;
  downloadCsvLabel?: string;
  downloadPdfLabel?: string;
};

export function ExportFiltersCard({
  title = "Export Filters",
  description = "Select date range and data types to download CSV/PDF",
  startDateLabel,
  endDateLabel,
  monthLabel,
  startTimeLabel,
  endTimeLabel,
  clearFiltersLabel,
  resultSummary,
  locale = "TH",
  startDate,
  endDate,
  month,
  startTime,
  endTime,
  onStartDateChange,
  onEndDateChange,
  onMonthChange,
  onStartTimeChange,
  onEndTimeChange,
  options,
  selectedKeys,
  onToggleKey,
  onDownloadCsv,
  onDownloadPdf,
  onClearFilters,
  downloadCsvLabel = "Download CSV",
  downloadPdfLabel = "Download PDF",
}: ExportFiltersCardProps) {
  const [localMonth, setLocalMonth] = useState("");
  const [localStartTime, setLocalStartTime] = useState("");
  const [localEndTime, setLocalEndTime] = useState("");
  const selectedMonth = month ?? localMonth;
  const selectedStartTime = startTime ?? localStartTime;
  const selectedEndTime = endTime ?? localEndTime;
  const setMonth = onMonthChange ?? setLocalMonth;
  const setStartTime = onStartTimeChange ?? setLocalStartTime;
  const setEndTime = onEndTimeChange ?? setLocalEndTime;
  const resolvedMonthLabel = monthLabel ?? (locale === "TH" ? "เดือน/ปี" : "Month / Year");
  const resolvedStartTimeLabel = startTimeLabel ?? (locale === "TH" ? "เวลาเริ่มต้น" : "Start Time");
  const resolvedEndTimeLabel = endTimeLabel ?? (locale === "TH" ? "เวลาสิ้นสุด" : "End Time");
  const resolvedClearFiltersLabel = clearFiltersLabel ?? (locale === "TH" ? "ล้างตัวกรอง" : "Clear Filters");

  const isTH = locale === "TH";
  const [rangeMode, setRangeMode] = useState<"all" | "month" | "range">(selectedMonth ? "month" : startDate || endDate ? "range" : "all");
  const [showTimes, setShowTimes] = useState(Boolean(selectedStartTime || selectedEndTime));
  const invalidRange = Boolean(startDate && endDate && startDate > endDate) || Boolean(selectedStartTime && selectedEndTime && selectedStartTime > selectedEndTime);
  const changeRangeMode = (mode: "all" | "month" | "range") => {
    setRangeMode(mode);
    if (mode !== "month") setMonth("");
    if (mode !== "range") { onStartDateChange(""); onEndDateChange(""); }
    if (mode === "all") { setStartTime(""); setEndTime(""); setShowTimes(false); }
  };
  const clear = () => {
    changeRangeMode("all");
    onClearFilters?.();
  };
  const hasFilters = Boolean(selectedMonth || startDate || endDate || selectedStartTime || selectedEndTime);
  const fieldClass = "[&_button]:h-9 [&_button]:rounded-lg [&_button]:px-3 [&_button]:text-xs [&_button]:shadow-none";

  return (
    <Card className="mb-5 overflow-visible rounded-2xl border border-border/70 bg-card shadow-none">
      <CardHeader className="px-4 pb-3 pt-4 md:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold">{title}</CardTitle>
            <CardDescription className="mt-1 text-xs">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {resultSummary && <span className="mr-1 text-xs text-muted-foreground">{resultSummary}</span>}
            <Button type="button" size="sm" disabled={invalidRange} aria-label={downloadCsvLabel} title={downloadCsvLabel} className="h-9 gap-2 rounded-lg bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700" onClick={onDownloadCsv}><Download className="h-3.5 w-3.5" />CSV</Button>
            <Button type="button" size="sm" disabled={invalidRange} aria-label={downloadPdfLabel} title={downloadPdfLabel} variant="outline" className="h-9 gap-2 rounded-lg px-3 text-xs shadow-none" onClick={onDownloadPdf}><FileText className="h-3.5 w-3.5" />PDF</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4 md:px-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1.5 text-xs text-muted-foreground">{isTH ? "ช่วงข้อมูล" : "Data period"}</p>
            <div className="inline-flex rounded-lg bg-muted/60 p-1" role="group" aria-label={isTH ? "เลือกช่วงข้อมูล" : "Choose data period"}>
              {([ ["all", isTH ? "ทั้งหมด" : "All time"], ["month", isTH ? "รายเดือน" : "Monthly"], ["range", isTH ? "กำหนดช่วง" : "Date range"] ] as const).map(([mode, label]) => <button key={mode} type="button" aria-pressed={rangeMode === mode} onClick={() => changeRangeMode(mode)} className={`rounded-md px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${rangeMode === mode ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
            </div>
          </div>
          {rangeMode === "month" && <div className="w-full space-y-1.5 sm:w-48"><p className="text-xs text-muted-foreground">{resolvedMonthLabel}</p><MinimalMonthPicker className={fieldClass} ariaLabel="Export month" value={selectedMonth} onChange={setMonth} locale={locale} /></div>}
          {rangeMode === "range" && <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-[180px_180px]">
            <div className="space-y-1.5"><p className="text-xs text-muted-foreground">{startDateLabel ?? (isTH ? "วันที่เริ่มต้น" : "Start date")}</p><MinimalDatePicker className={fieldClass} ariaLabel="Export start date" value={startDate} onChange={onStartDateChange} locale={locale} /></div>
            <div className="space-y-1.5"><p className="text-xs text-muted-foreground">{endDateLabel ?? (isTH ? "วันที่สิ้นสุด" : "End date")}</p><MinimalDatePicker className={fieldClass} ariaLabel="Export end date" value={endDate} onChange={onEndDateChange} locale={locale} /></div>
          </div>}
          <button type="button" aria-expanded={showTimes} onClick={() => setShowTimes(value => !value)} className={`flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs transition hover:bg-muted ${selectedStartTime || selectedEndTime ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}><Clock3 className="h-3.5 w-3.5" />{selectedStartTime || selectedEndTime ? `${selectedStartTime || "00:00"}–${selectedEndTime || "23:59"}` : (isTH ? "ระบุเวลา" : "Time filter")}<ChevronDown className={`h-3 w-3 transition-transform ${showTimes ? "rotate-180" : ""}`} /></button>
          {hasFilters && <button type="button" onClick={clear} className="flex h-9 items-center gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"><RotateCcw className="h-3 w-3" />{resolvedClearFiltersLabel}</button>}
        </div>
        {showTimes && <div className="grid max-w-sm grid-cols-2 gap-2 rounded-xl bg-muted/30 p-3">
          <div className="space-y-1.5"><p className="text-xs text-muted-foreground">{resolvedStartTimeLabel}</p><MinimalTimePicker className={fieldClass} ariaLabel="Export start time" value={selectedStartTime} onChange={setStartTime} locale={locale} /></div>
          <div className="space-y-1.5"><p className="text-xs text-muted-foreground">{resolvedEndTimeLabel}</p><MinimalTimePicker className={fieldClass} ariaLabel="Export end time" value={selectedEndTime} onChange={setEndTime} locale={locale} /></div>
        </div>}
        {invalidRange && <p role="alert" className="text-xs text-red-600">{isTH ? "ช่วงเริ่มต้นต้องไม่เกินช่วงสิ้นสุด" : "The start must not be after the end."}</p>}
        {options.length > 0 && <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
          <span className="mr-1 text-xs text-muted-foreground">{isTH ? "ข้อมูลที่ส่งออก" : "Include"}</span>
          {options.map(option => {
            const checked = selectedKeys.includes(option.key);
            return <label key={option.key} className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition ${checked ? "border-emerald-200 bg-emerald-50/70 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-border text-muted-foreground hover:bg-muted"}`}><input type="checkbox" className="peer sr-only" checked={checked} onChange={() => onToggleKey(option.key)} /><span className={`grid h-3.5 w-3.5 place-items-center rounded border peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-500 ${checked ? "border-emerald-600 bg-emerald-600 text-white" : "border-muted-foreground/40"}`}>{checked && <Check className="h-2.5 w-2.5" />}</span>{option.label}</label>;
          })}
        </div>}
      </CardContent>
    </Card>
  );
}
