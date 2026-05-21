import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock3, X } from "lucide-react";
import { cn } from "./utils";

type MinimalTimePickerProps = {
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

const toTimeValue = (date: Date) => {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const roundToQuarterHour = (value: string) => {
  const [hourValue, minuteValue] = value.split(":").map(Number);
  if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return value;
  const minutes = Math.round(minuteValue / 15) * 15;
  const hours = (hourValue + Math.floor(minutes / 60)) % 24;
  return `${String(hours).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};

export function MinimalTimePicker({
  value,
  onChange,
  ariaLabel = "Select time",
  placeholder = "--:--",
  locale = "TH",
  className,
}: MinimalTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const timeOptions = useMemo(
    () =>
      Array.from({ length: 96 }, (_, index) => {
        const totalMinutes = index * 15;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      }),
    [],
  );

  const clearTime = () => {
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

  const timePopover = open
    ? createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[1000] w-[292px] rounded-[28px] border border-border bg-card p-4 text-foreground shadow-2xl shadow-emerald-950/10"
          style={{ top: popoverPosition.top, left: popoverPosition.left }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">{locale === "TH" ? "เลือกเวลา" : "Select time"}</p>
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
              {value || placeholder}
            </div>
          </div>

          <div className="grid max-h-56 grid-cols-3 gap-2 overflow-y-auto pr-1">
            {timeOptions.map((time) => {
              const isSelected = value === time;

              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => {
                    onChange(time);
                    setOpen(false);
                  }}
                  className={cn(
                    "h-10 rounded-2xl text-sm font-medium transition",
                    isSelected && "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25",
                    !isSelected && "hover:bg-muted",
                  )}
                >
                  {time}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <button
              type="button"
              onClick={clearTime}
              className="flex items-center gap-1 rounded-full px-3 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {locale === "TH" ? "ล้าง" : "Clear"}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(roundToQuarterHour(toTimeValue(new Date())));
                setOpen(false);
              }}
              className="rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600"
            >
              {locale === "TH" ? "ตอนนี้" : "Now"}
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
        <span>{value || placeholder}</span>
        <Clock3 className="h-4 w-4 text-emerald-500" />
      </button>

      {timePopover}
    </div>
  );
}
