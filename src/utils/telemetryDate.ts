export const parseTelemetryDate = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatLocalDateKey = (value: string | null | undefined) => {
  const date = parseTelemetryDate(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatTelemetryDateTime = (value: string | null | undefined, locale: string) => {
  const date = parseTelemetryDate(value);
  if (!date) return value || "-";
  return date.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const formatTelemetryTime = (value: string | null | undefined, locale: string) => {
  const date = parseTelemetryDate(value);
  if (!date) return value || "-";
  return date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const formatTelemetryMinuteKey = (value: string | null | undefined) => {
  const date = parseTelemetryDate(value);
  if (!date) return "";
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
};

export const formatTelemetryDateLabel = (dateKey: string, locale: string) => {
  if (!dateKey) return "-";
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
