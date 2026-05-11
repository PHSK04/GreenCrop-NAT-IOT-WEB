import { useEffect, useMemo, useState } from "react";

export const ACTIVE_DEVICE_STORAGE_KEY = "active_device_id";
export const ACTIVE_DEVICE_EVENT_NAME = "active-device-changed";

export function emitActiveDeviceChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ACTIVE_DEVICE_EVENT_NAME));
}

export function setActiveDeviceIdValue(deviceId: string) {
  if (typeof window === "undefined") return;
  if (deviceId) {
    window.localStorage.setItem(ACTIVE_DEVICE_STORAGE_KEY, deviceId);
  } else {
    window.localStorage.removeItem(ACTIVE_DEVICE_STORAGE_KEY);
  }
  emitActiveDeviceChanged();
}

export function useActiveDeviceId() {
  const [deviceId, setDeviceId] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY) || "";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      setDeviceId(window.localStorage.getItem(ACTIVE_DEVICE_STORAGE_KEY) || "");
    };
    window.addEventListener("storage", update);
    window.addEventListener(ACTIVE_DEVICE_EVENT_NAME, update as EventListener);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener(ACTIVE_DEVICE_EVENT_NAME, update as EventListener);
    };
  }, []);

  return deviceId;
}

export function useDeviceSeed() {
  const deviceId = useActiveDeviceId();
  const seed = useMemo(() => seedFromString(deviceId), [deviceId]);
  return { deviceId, seed };
}

export function seedFromString(value: string) {
  if (!value) return 0;
  let acc = 0;
  for (let i = 0; i < value.length; i += 1) {
    acc = (acc + value.charCodeAt(i) * (i + 1)) % 100000;
  }
  return acc;
}
