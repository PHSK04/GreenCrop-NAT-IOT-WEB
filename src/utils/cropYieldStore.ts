export type CropYieldEntry = {
  id: string;
  deviceId: string;
  date: string;
  time: string;
  yield: number;
  ph: number;
  oxygen: number;
  ec: number;
  temp: number;
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
  avgTemp: number;
  entries: CropYieldEntry[];
};

const STORAGE_KEY = "greencrop_crop_yield_entries_v1";
const CHANGE_EVENT = "greencrop_crop_yield_entries_changed";
const LEGACY_DEVICE_IDS = new Set(["", "default", "UNKNOWN"]);
const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const LEGACY_OWNER_KEY = "greencrop_crop_yield_legacy_owner_v2";
const LEGACY_MIGRATION_KEY_PREFIX = "greencrop_crop_yield_migrated_v2";
let legacyMigrationPromise: Promise<void> | null = null;

const safeNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeEntry = (entry: any): CropYieldEntry | null => {
  if (!entry || typeof entry !== "object" || !entry.date) return null;
  const createdAt = String(entry.createdAt || new Date().toISOString());
  const createdDate = new Date(createdAt);
  const fallbackTime = Number.isNaN(createdDate.getTime())
    ? "00:00"
    : `${String(createdDate.getHours()).padStart(2, "0")}:${String(createdDate.getMinutes()).padStart(2, "0")}`;
  return {
    id: String(entry.id || `${entry.date}-${Date.now()}`),
    deviceId: String(entry.deviceId || ""),
    date: String(entry.date),
    time: String(entry.time || fallbackTime),
    yield: safeNumber(entry.yield),
    ph: safeNumber(entry.ph, 7),
    oxygen: safeNumber(entry.oxygen, 0),
    ec: safeNumber(entry.ec, 0),
    temp: safeNumber(entry.temp ?? entry.tempValue ?? entry.temperature, 0),
    note: entry.note ? String(entry.note) : "",
    createdAt,
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
    const requestedDeviceId = String(deviceId || "");
    return entries
      .filter((entry) => {
        if (!requestedDeviceId) return true;
        if (entry.deviceId === requestedDeviceId) return true;
        return requestedDeviceId !== "default" && LEGACY_DEVICE_IDS.has(entry.deviceId);
      })
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
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
    id: crypto?.randomUUID?.() || `${entry.deviceId}-${entry.date}-${entry.time}-${Date.now()}`,
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

const getAuthToken = () => {
  if (typeof window === "undefined") return "";
  try {
    const session = JSON.parse(window.localStorage.getItem("smart_iot_session") || "null");
    return String(session?.token || session?.user?.token || "");
  } catch {
    return "";
  }
};

const getSessionUserId = () => {
  if (typeof window === "undefined") return "";
  try {
    const session = JSON.parse(window.localStorage.getItem("smart_iot_session") || "null");
    return String(session?.user?.id || "");
  } catch {
    return "";
  }
};

const cropYieldRequest = async (path: string, init: RequestInit = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication is required");
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || `Crop yield request failed (${response.status})`);
  }
  return response.json();
};

const fromApiRow = (row: any): CropYieldEntry | null => normalizeEntry({
  id: row.id,
  deviceId: row.device_id,
  date: String(row.harvest_date || "").slice(0, 10),
  time: String(row.harvest_time || "").slice(0, 5),
  yield: row.yield_grams,
  ph: row.ph_value,
  oxygen: row.oxygen_value,
  ec: row.ec_value,
  temp: row.temp_c,
  note: row.note,
  createdAt: row.created_at,
});

const postCropYieldEntry = (entry: CropYieldEntry) => cropYieldRequest("/crop-yields/me", {
  method: "POST",
  body: JSON.stringify({
    id: entry.id,
    device_id: entry.deviceId,
    date: entry.date,
    time: entry.time,
    yield: entry.yield,
    ph: entry.ph,
    oxygen: entry.oxygen,
    ec: entry.ec,
    temp: entry.temp,
    note: entry.note || "",
  }),
});

const migrateLegacyCropYieldEntries = async (fallbackDeviceId?: string) => {
  if (typeof window === "undefined") return;
  const userId = getSessionUserId();
  if (!userId) return;

  const migrationKey = `${LEGACY_MIGRATION_KEY_PREFIX}:${userId}`;
  if (window.localStorage.getItem(migrationKey) === "done") return;

  const legacyRows = readCropYieldEntries();
  if (!legacyRows.length) {
    window.localStorage.setItem(migrationKey, "done");
    return;
  }

  // Old localStorage rows had no owner field. The first authenticated account
  // claims them once so a shared browser cannot copy the same history to others.
  const claimedOwner = window.localStorage.getItem(LEGACY_OWNER_KEY);
  if (claimedOwner && claimedOwner !== userId) return;

  const currentRows = await cropYieldRequest("/crop-yields/me");
  const existingIds = new Set(
    (Array.isArray(currentRows) ? currentRows : []).map((row: any) => String(row.id)),
  );
  const resolvedFallback = String(fallbackDeviceId || "default");

  for (const legacyRow of legacyRows) {
    if (existingIds.has(legacyRow.id)) continue;
    const deviceId = LEGACY_DEVICE_IDS.has(legacyRow.deviceId)
      ? resolvedFallback
      : legacyRow.deviceId;
    await postCropYieldEntry({ ...legacyRow, deviceId });
  }

  window.localStorage.setItem(LEGACY_OWNER_KEY, userId);
  window.localStorage.setItem(migrationKey, "done");
};

export const loadMyCropYieldEntries = async (deviceId?: string): Promise<CropYieldEntry[]> => {
  if (!legacyMigrationPromise) {
    legacyMigrationPromise = migrateLegacyCropYieldEntries(deviceId).catch((error) => {
      legacyMigrationPromise = null;
      throw error;
    });
  }
  await legacyMigrationPromise;
  const query = deviceId && deviceId !== "default"
    ? `?device_id=${encodeURIComponent(deviceId)}`
    : "";
  const rows = await cropYieldRequest(`/crop-yields/me${query}`);
  return (Array.isArray(rows) ? rows : [])
    .map(fromApiRow)
    .filter((entry): entry is CropYieldEntry => Boolean(entry));
};

export const createMyCropYieldEntry = async (
  entry: Omit<CropYieldEntry, "id" | "createdAt">,
): Promise<CropYieldEntry> => {
  const nextEntry: CropYieldEntry = {
    ...entry,
    id: crypto?.randomUUID?.() || `${entry.deviceId}-${entry.date}-${entry.time}-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  await postCropYieldEntry(nextEntry);
  return nextEntry;
};

export const deleteMyCropYieldEntry = async (entryId: string): Promise<void> => {
  await cropYieldRequest(`/crop-yields/me/${encodeURIComponent(entryId)}`, { method: "DELETE" });
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
        avgTemp: Math.round(avg((entry) => entry.temp) * 100) / 100,
        entries: sortedEntries,
      };
    });
};
