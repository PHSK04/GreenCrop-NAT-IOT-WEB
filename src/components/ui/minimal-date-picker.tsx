import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "./utils";

type MinimalDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  locale?: "TH" | "EN";
  className?: string;
};

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const POPOVER_WIDTH = 292;
const POPOVER_HEIGHT = 400;
const POPOVER_GAP = 8;
const VIEWPORT_PADDING = 12;

const toDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateValue = (value: string) => {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatDisplayDate = (value: string, placeholder: string, locale: "TH" | "EN") => {
  const parsed = parseDateValue(value);
  if (!parsed) return placeholder;
  return parsed.toLocaleDateString(locale === "TH" ? "th-TH" : "en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export function MinimalDatePicker({
  value,
  onChange,
  ariaLabel = "Select date",
  placeholder = "dd/mm/yyyy",
  locale = "TH",
  className,
}: MinimalDatePickerProps) {
  const selectedDate = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate || new Date());
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const monthLabel = viewDate.toLocaleDateString(locale === "TH" ? "th-TH" : "en-US", {
    month: "long",
    year: "numeric",
  });

  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const calendarStart = new Date(year, month, 1 - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(calendarStart);
      date.setDate(calendarStart.getDate() + index);
      return date;
    });
  }, [viewDate]);

  const moveMonth = (amount: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  const selectDate = (date: Date) => {
    onChange(toDateValue(date));
    setViewDate(date);
    setOpen(false);
  };

  const clearDate = () => {
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

  const calendarPopover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[1000] w-[292px] rounded-[28px] border border-border bg-card p-4 text-foreground shadow-2xl shadow-emerald-950/10"
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
        >
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-semibold">{monthLabel}</p>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((day, index) => (
              <div key={`${day}-${index}`} className="py-1 text-[11px] font-semibold text-muted-foreground">
                {day}
              </div>
            ))}
            {days.map((date) => {
              const dateValue = toDateValue(date);
              const isSelected = value === dateValue;
              const isCurrentMonth = date.getMonth() === viewDate.getMonth();
              const isToday = dateValue === toDateValue(new Date());

              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={cn(
                    "h-9 rounded-full text-sm transition",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/45",
                    isToday && !isSelected && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300",
                    isSelected && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25",
                    !isSelected && "hover:bg-muted",
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={clearDate}
              className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {locale === "TH" ? "ล้าง" : "Clear"}
            </button>
            <button
              type="button"
              onClick={() => selectDate(new Date())}
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              {locale === "TH" ? "วันนี้" : "Today"}
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
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-full border border-border bg-background/90 px-4 text-left text-sm shadow-sm transition",
          "hover:border-emerald-300 hover:bg-emerald-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-300/60 dark:hover:bg-emerald-950/20",
          value ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <span>{formatDisplayDate(value, placeholder, locale)}</span>
        <Calendar className="h-4 w-4 text-emerald-500" />
      </button>

      {calendarPopover}
    </div>
  );
}
