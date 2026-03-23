import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

type ExportFilterOption = {
  key: string;
  label: string;
};

type ExportFiltersCardProps = {
  title?: string;
  description?: string;
  startDateLabel?: string;
  endDateLabel?: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  options: ExportFilterOption[];
  selectedKeys: string[];
  onToggleKey: (key: string) => void;
  onDownloadCsv: () => void;
  onDownloadPdf: () => void;
  downloadCsvLabel?: string;
  downloadPdfLabel?: string;
};

export function ExportFiltersCard({
  title = "Export Filters",
  description = "Select date range and data types to download CSV/PDF",
  startDateLabel = "Start Date",
  endDateLabel = "End Date",
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  options,
  selectedKeys,
  onToggleKey,
  onDownloadCsv,
  onDownloadPdf,
  downloadCsvLabel = "Download CSV",
  downloadPdfLabel = "Download PDF",
}: ExportFiltersCardProps) {
  return (
    <Card
      className="!rounded-[32px] overflow-hidden border border-border shadow-lg bg-card !opacity-100 mb-8"
    >
      <CardHeader>
        <CardTitle className="text-foreground text-base">{title}</CardTitle>
        <CardDescription className="text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{startDateLabel}</label>
            <Input
              type="date"
              aria-label="Export start date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">{endDateLabel}</label>
            <Input
              type="date"
              aria-label="Export end date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
            />
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
