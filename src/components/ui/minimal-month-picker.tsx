import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "./utils";

type MinimalMonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  locale?: "TH" | "EN";
  className?: string;
};

const POPOVER_WIDTH = 292;
const POPOVER_HEIGHT = 340;
const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;

const MONTHS = {
  TH: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."],
  EN: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};

const toMonthValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const parseMonthValue = (value: string) => {
  if (!value) return null;
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return null;
  return new Date(year, month - 1, 1);
};

const formatDisplayMonth = (value: string, placeholder: string, locale: "TH" | "EN") => {
  const parsed = parseMonthValue(value);
  if (!parsed) return placeholder;
  return parsed.toLocaleDateString(locale === "TH" ? "th-TH" : "en-US", {
    month: "short",
    year: "numeric",
  });
};

export function MinimalMonthPicker({
  value,
  onChange,
  ariaLabel = "Select month",
  placeholder = "เลือกเดือน",
  locale = "TH",
  className,
}: MinimalMonthPickerProps) {
  const selectedMonth = parseMonthValue(value);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState((selectedMonth || new Date()).getFullYear());
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const currentMonthValue = toMonthValue(new Date());

  const selectMonth = (monthIndex: number) => {
    onChange(`${viewYear}-${String(monthIndex + 1).padStart(2, "0")}`);
    setOpen(false);
  };

  const clearMonth = () => {
    onChange("");
    setOpen(false);
  };

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const button = buttonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const popoverHeight = popoverRef.current?.offsetHeight || POPOVER_HEIGHT;
      const hasRoomBelow = rect.bottom + POPOVER_GAP + popoverHeight <= window.innerHeight - VIEWPORT_PADDING;
      const top = hasRoomBelow
        ? rect.bottom + POPOVER_GAP
        : Math.max(VIEWPORT_PADDING, rect.top - popoverHeight - POPOVER_GAP);
      const preferredLeft = rect.right - POPOVER_WIDTH;
      const maxLeft = window.innerWidth - POPOVER_WIDTH - VIEWPORT_PADDING;
      const left = Math.min(Math.max(VIEWPORT_PADDING, preferredLeft), maxLeft);

      setPopoverPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const monthPopover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[1000] w-[292px] rounded-[28px] border border-border bg-card p-4 text-foreground shadow-2xl shadow-emerald-950/10"
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
        >
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewYear((current) => current - 1)}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold">{viewYear}</p>
            <button
              type="button"
              onClick={() => setViewYear((current) => current + 1)}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MONTHS[locale].map((month, index) => {
              const monthValue = `${viewYear}-${String(index + 1).padStart(2, "0")}`;
              const isSelected = value === monthValue;
              const isCurrent = monthValue === currentMonthValue;

              return (
                <button
                  key={monthValue}
                  type="button"
                  onClick={() => selectMonth(index)}
                  className={cn(
                    "h-11 rounded-2xl text-sm font-medium transition",
                    isCurrent && !isSelected && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
                    isSelected && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25",
                    !isSelected && "hover:bg-muted",
                  )}
                >
                  {month}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={clearMonth}
              className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {locale === "TH" ? "ล้าง" : "Clear"}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(currentMonthValue);
                setViewYear(new Date().getFullYear());
                setOpen(false);
              }}
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              {locale === "TH" ? "เดือนนี้" : "This month"}
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        onClick={() => {
          const nextSelectedMonth = parseMonthValue(value);
          if (nextSelectedMonth) setViewYear(nextSelectedMonth.getFullYear());
          setOpen((current) => !current);
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-full border border-border bg-background/90 px-4 text-left text-sm shadow-sm transition",
          "hover:border-emerald-300 hover:bg-emerald-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 dark:hover:bg-emerald-950/20",
          value ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span>{formatDisplayMonth(value, placeholder, locale)}</span>
        <Calendar className="h-4 w-4 text-emerald-500" />
      </button>

      {monthPopover}
    </div>
  );
}
