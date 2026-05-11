export type CropYieldEntry = {
  id: string;
  deviceId: string;
  date: string;
  yield: number;
  ph: number;
  oxygen: number;
  ec: number;
  note?: string;
  createdAt: string;
};

export type MonthlyYieldSummary = {
  key: string;
  year: number;
  month: number;
  monthLabel: string;
  yield: number;
  averageYield: number;
  frequency: number;
  avgPh: number;
  avgOxygen: number;
  avgEc: number;
  entries: CropYieldEntry[];
};

const STORAGE_KEY = "greencrop_crop_yield_entries_v1";
const CHANGE_EVENT = "greencrop_crop_yield_entries_changed";

const safeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeEntry = (entry: any): CropYieldEntry | null => {
  if (!entry || typeof entry !== "object" || !entry.date) return null;
  return {
    id: String(entry.id || `${entry.date}-${Date.now()}`),
    deviceId: String(entry.deviceId || ""),
    date: String(entry.date),
    yield: safeNumber(entry.yield),
    ph: safeNumber(entry.ph, 7),
    oxygen: safeNumber(entry.oxygen, 0),
    ec: safeNumber(entry.ec, 0),
    note: entry.note ? String(entry.note) : "",
    createdAt: String(entry.createdAt || new Date().toISOString()),
  };
};

export const readCropYieldEntries = (deviceId?: string): CropYieldEntry[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const entries = Array.isArray(parsed)
      ? parsed.map(normalizeEntry).filter(Boolean) as CropYieldEntry[]
      : [];
    return entries
      .filter((entry) => !deviceId || entry.deviceId === deviceId)
      .sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    return [];
  }
};

export const writeCropYieldEntries = (entries: CropYieldEntry[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

export const addCropYieldEntry = (entry: Omit<CropYieldEntry, "id" | "createdAt">) => {
  const nextEntry: CropYieldEntry = {
    ...entry,
    id: crypto?.randomUUID?.() || `${entry.deviceId}-${entry.date}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  writeCropYieldEntries([nextEntry, ...readCropYieldEntries()]);
  return nextEntry;
};

export const deleteCropYieldEntry = (entryId: string) => {
  writeCropYieldEntries(readCropYieldEntries().filter((entry) => entry.id !== entryId));
};

export const subscribeCropYieldEntries = (callback: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
};

export const getMonthlyYieldSummaries = (
  entries: CropYieldEntry[],
  locale: string,
): MonthlyYieldSummary[] => {
  const grouped = new Map<string, CropYieldEntry[]>();

  entries.forEach((entry) => {
    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    grouped.set(key, [...(grouped.get(key) || []), entry]);
  });

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, group]) => {
      const [yearText, monthText] = key.split("-");
      const year = Number(yearText);
      const month = Number(monthText);
      const sortedEntries = [...group].sort((a, b) => a.date.localeCompare(b.date));
      const totalYield = sortedEntries.reduce((sum, entry) => sum + entry.yield, 0);
      const avg = (selector: (entry: CropYieldEntry) => number) =>
        sortedEntries.length
          ? sortedEntries.reduce((sum, entry) => sum + selector(entry), 0) / sortedEntries.length
          : 0;

      return {
        key,
        year,
        month,
        monthLabel: new Date(year, month - 1, 1).toLocaleDateString(locale, {
          month: "short",
          year: "numeric",
        }),
        yield: Math.round(totalYield * 100) / 100,
        averageYield: Math.round(avg((entry) => entry.yield) * 100) / 100,
        frequency: sortedEntries.length,
        avgPh: Math.round(avg((entry) => entry.ph) * 100) / 100,
        avgOxygen: Math.round(avg((entry) => entry.oxygen) * 100) / 100,
        avgEc: Math.round(avg((entry) => entry.ec) * 100) / 100,
        entries: sortedEntries,
      };
    });
};
