import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MinimalDatePicker } from "@/components/ui/minimal-date-picker";
import { MinimalMonthPicker } from "@/components/ui/minimal-month-picker";
import { MinimalTimePicker } from "@/components/ui/minimal-time-picker";
import { Download, FileText, RotateCcw } from "lucide-react";

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
  startDateLabel = "Start Date",
  endDateLabel = "End Date",
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

  return (
    <Card
      className="!rounded-[32px] overflow-visible border border-border shadow-lg bg-card !opacity-100 mb-8"
    >
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-foreground text-base">{title}</CardTitle>
            <CardDescription className="text-muted-foreground">{description}</CardDescription>
          </div>
          {resultSummary && (
            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {resultSummary}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{resolvedMonthLabel}</label>
            <MinimalMonthPicker
              ariaLabel="Export month"
              value={selectedMonth}
              onChange={setMonth}
              locale={locale}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{startDateLabel}</label>
            <MinimalDatePicker
              ariaLabel="Export start date"
              value={startDate}
              onChange={onStartDateChange}
              locale={locale}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{endDateLabel}</label>
            <MinimalDatePicker
              ariaLabel="Export end date"
              value={endDate}
              onChange={onEndDateChange}
              locale={locale}
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:col-span-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{resolvedStartTimeLabel}</label>
              <MinimalTimePicker
                ariaLabel="Export start time"
                value={selectedStartTime}
                onChange={setStartTime}
                locale={locale}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">{resolvedEndTimeLabel}</label>
              <MinimalTimePicker
                ariaLabel="Export end time"
                value={selectedEndTime}
                onChange={setEndTime}
                locale={locale}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {options.map((option) => {
            const checked = selectedKeys.includes(option.key);
            return (
              <label
                key={option.key}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                  checked ? "border-emerald-400 bg-emerald-50 text-emerald-700" : "border-border bg-background text-muted-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleKey(option.key)}
                />
                {option.label}
              </label>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2">
          {onClearFilters && (
            <Button
              variant="outline"
              className="gap-2 border-border bg-background text-foreground hover:bg-muted shadow-sm"
              onClick={onClearFilters}
            >
              <RotateCcw className="w-4 h-4" />
              {resolvedClearFiltersLabel}
            </Button>
          )}
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={onDownloadCsv}>
            <Download className="w-4 h-4" />
            {downloadCsvLabel}
          </Button>
          <Button
            variant="outline"
            className="gap-2 border-border bg-background text-foreground hover:bg-muted shadow-sm"
            onClick={onDownloadPdf}
          >
            <FileText className="w-4 h-4" />
            {downloadPdfLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
