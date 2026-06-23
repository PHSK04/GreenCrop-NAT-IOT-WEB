import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { toast } from 'sonner';
import mqtt from 'mqtt';
import { ACTIVE_DEVICE_EVENT_NAME, getActiveDeviceIdValue } from '@/hooks/useActiveDeviceId';

interface MachineContextType {
  isOn: boolean;
  toggleMachine: () => void;
  togglePump: (pumpIndex: number) => void;
  sendStartCommand: () => void;
  sendEmergencyStop: () => void;
  stopPump2FromWeb: () => void;
  resetUptime: () => void;
  uptimeSeconds: number;
  pressure: number;
  flowRate: number;
  pumps: boolean[];
  activeTank: number | null;
  ecValue: number;
  phValue: number;
  tempValue: number;
  locked: boolean;
  wls1: boolean;
  wls2: boolean;
  floatAlarm: boolean;
  pump1On: boolean;
  pump2On: boolean;
  greenOn: boolean;
  redOn: boolean;
  phOk: boolean;
  lastTelemetryAt: string | null;
  boardConnected: boolean;
  telemetryHistory: TelemetrySnapshot[];
  mqttStatus: 'connected' | 'disconnected' | 'connecting';
}

type TelemetrySnapshot = {
  timestamp: string;
  deviceId: string;
  phValue: number;
  ecValue: number;
  tempValue: number;
  wls1: boolean;
  wls2: boolean;
  floatAlarm: boolean;
  locked: boolean;
  pump1On: boolean;
  pump2On: boolean;
  greenOn: boolean;
  redOn: boolean;
  isOn: boolean;
};

const MachineContext = createContext<MachineContextType | undefined>(undefined);

const MQTT_BROKER = 'wss://862ddab18768410486982f71e1ac75bb.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USERNAME = 'GreenCropnat';
const MQTT_PASSWORD = 'GreenCropnat123456';
const TOPIC_SENSORS_LEGACY = 'smartfarm/sensors';
const TOPIC_CONTROL_LEGACY = 'smartfarm/control';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const ACCEPT_LEGACY_MQTT = import.meta.env.VITE_ACCEPT_LEGACY_MQTT === 'true';
const HISTORY_LIMIT = 50000;
const HISTORY_FETCH_LIMIT = 50000;
const HISTORY_CACHE_LIMIT = 5000;
const HISTORY_CACHE_KEY_PREFIX = 'smart_iot_telemetry_history';
const API_POLL_INTERVAL_MS = 2000;
const BOARD_TELEMETRY_STALE_MS = 10000;

const safeTopicSegment = (value: string) =>
  value.trim().replace(/[^A-Za-z0-9_-]/g, '');

const getActiveDeviceId = () => {
  return getActiveDeviceIdValue();
};

const getDeviceTopic = (
  tenantId: string,
  deviceId: string,
  channel: 'control' | 'sensors',
) => {
  const safeTenant = safeTopicSegment(tenantId);
  const safeDevice = safeTopicSegment(deviceId);
  if (!safeTenant || !safeDevice) return '';
  return `tenants/${safeTenant}/devices/${safeDevice}/${channel}`;
};

const getSessionAuth = () => {
  const raw = localStorage.getItem('smart_iot_session');
  if (!raw) {
    return { token: '', tenantId: '' };
  }

  try {
    const parsed = JSON.parse(raw);
    const token = parsed?.token || parsed?.user?.token || '';
    const tenantId = String(parsed?.user?.id || parsed?.id || '');
    return { token, tenantId };
  } catch (err) {
    console.error('Failed to parse smart_iot_session:', err);
    return { token: '', tenantId: '' };
  }
};

const getTelemetryHistoryCacheKey = () => {
  const { tenantId } = getSessionAuth();
  const deviceId = getActiveDeviceId() || 'all-devices';
  if (!tenantId) return '';
  return `${HISTORY_CACHE_KEY_PREFIX}:${tenantId}:${deviceId}`;
};

const readCachedTelemetryHistory = () => {
  const cacheKey = getTelemetryHistoryCacheKey();
  if (!cacheKey) return [];

  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeTelemetrySnapshot)
      .filter((snapshot): snapshot is TelemetrySnapshot => Boolean(snapshot))
      .slice(0, HISTORY_CACHE_LIMIT);
  } catch (err) {
    console.error('Failed to load cached telemetry history:', err);
    return [];
  }
};

const writeCachedTelemetryHistory = (history: TelemetrySnapshot[]) => {
  const cacheKey = getTelemetryHistoryCacheKey();
  if (!cacheKey || history.length === 0) return;

  try {
    localStorage.setItem(cacheKey, JSON.stringify(history.slice(0, HISTORY_CACHE_LIMIT)));
  } catch (err) {
    console.error('Failed to save cached telemetry history:', err);
  }
};

const asBool = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const v = String(value ?? '').toLowerCase().trim();
  return v === '1' || v === 'true' || v === 'on';
};

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const firstDefined = (...values: unknown[]) => values.find((value) => value !== undefined && value !== null);

const parseMqttPayload = (raw: string) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const normalizePumps = (rawPumps: unknown, fallback: boolean[]) => {
  let parsed: unknown = rawPumps;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return fallback;
    }
  }

  if (!Array.isArray(parsed)) return fallback;

  const boolPumps = parsed.map((p) => asBool(p));

  if (boolPumps.length >= 5) return boolPumps.slice(0, 5);
  return [...boolPumps, ...Array.from({ length: 5 - boolPumps.length }, () => false)];
};

const parseServerTimestampMs = (raw: unknown): number | null => {
  if (typeof raw !== 'string' || !raw) return null;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeTelemetrySnapshot = (raw: any): TelemetrySnapshot | null => {
  if (!raw || typeof raw !== 'object') return null;
  const timestamp = typeof raw.timestamp === 'string' && raw.timestamp
    ? raw.timestamp
    : typeof raw.created_at === 'string' && raw.created_at
      ? raw.created_at
      : typeof raw.createdAt === 'string' && raw.createdAt
        ? raw.createdAt
        : '';
  if (!timestamp || !Number.isFinite(Date.parse(timestamp))) return null;

  return {
    timestamp,
    deviceId: String(raw.deviceId || raw.device_id || 'UNKNOWN'),
    phValue: asNumber(firstDefined(raw.phValue, raw.ph_value, raw.ph)),
    ecValue: asNumber(firstDefined(raw.ecValue, raw.ec_value, raw.ec)),
    tempValue: asNumber(firstDefined(raw.tempValue, raw.temp_c, raw.temperature)),
    wls1: asBool(firstDefined(raw.wls1, raw.WLS1)),
    wls2: asBool(firstDefined(raw.wls2, raw.WLS2)),
    floatAlarm: asBool(firstDefined(raw.floatAlarm, raw.float_alarm, raw.float)),
    locked: asBool(firstDefined(raw.locked, raw.lock, raw.reed, raw.reed_switch)),
    pump1On: asBool(firstDefined(raw.pump1On, raw.pump1_on)),
    pump2On: asBool(firstDefined(raw.pump2On, raw.pump2_on)),
    greenOn: asBool(firstDefined(raw.greenOn, raw.green_on)),
    redOn: asBool(firstDefined(raw.redOn, raw.red_on)),
    isOn: asBool(firstDefined(raw.isOn, raw.is_on)),
  };
};

const telemetryFingerprint = (snapshot: TelemetrySnapshot) =>
  [
    snapshot.timestamp,
    snapshot.deviceId,
    snapshot.phValue,
    snapshot.ecValue,
    snapshot.tempValue,
    snapshot.wls1,
    snapshot.wls2,
    snapshot.floatAlarm,
    snapshot.locked,
    snapshot.pump1On,
    snapshot.pump2On,
  ].join('|');

const telemetryStateSignature = (snapshot: TelemetrySnapshot) =>
  [
    snapshot.deviceId,
    snapshot.phValue.toFixed(3),
    snapshot.ecValue.toFixed(3),
    snapshot.tempValue.toFixed(2),
    snapshot.wls1 ? '1' : '0',
    snapshot.wls2 ? '1' : '0',
    snapshot.floatAlarm ? '1' : '0',
    snapshot.locked ? '1' : '0',
    snapshot.pump1On ? '1' : '0',
    snapshot.pump2On ? '1' : '0',
    snapshot.greenOn ? '1' : '0',
    snapshot.redOn ? '1' : '0',
    snapshot.isOn ? '1' : '0',
  ].join('|');

const isNoDataRecord = (raw: any) =>
  Boolean(raw?.no_data) || String(raw?.status || '').toLowerCase().trim() === 'no_data';

const recordSortKey = (item: any) => {
  const ts = parseServerTimestampMs(item?.timestamp);
  if (ts != null) return ts;

  const createdAtRaw = item?.created_at ?? item?.createdAt;
  if (typeof createdAtRaw === 'string' && createdAtRaw) {
    const parsed = Date.parse(createdAtRaw);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof createdAtRaw === 'number') return createdAtRaw;

  const idRaw = item?.id;
  if (typeof idRaw === 'number') return idRaw;
  if (typeof idRaw === 'string') return Number(idRaw) || 0;
  return 0;
};

export function MachineProvider({ children }: { children: ReactNode }) {
  const [isOn, setIsOn] = useState(false);
  const [uptimeBaseSeconds, setUptimeBaseSeconds] = useState(0);
  const [uptimeSyncedAtMs, setUptimeSyncedAtMs] = useState<number | null>(null);
  const [uptimeFreezeUntilMs, setUptimeFreezeUntilMs] = useState<number | null>(null);
  const [pendingResetUntilMs, setPendingResetUntilMs] = useState<number | null>(null);
  const [ignoreApiStateUntilMs, setIgnoreApiStateUntilMs] = useState<number | null>(null);
  const [pendingIsOnAck, setPendingIsOnAck] = useState<boolean | null>(null);
  const [lastLocalCommandAtMs, setLastLocalCommandAtMs] = useState<number | null>(null);
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [pressure, setPressure] = useState(0);
  const [flowRate, setFlowRate] = useState(0);
  const [pumps, setPumps] = useState<boolean[]>([false, false, false, false, false]);
  const [activeTank, setActiveTank] = useState<number | null>(null);
  const [ecValue, setEcValue] = useState(0);
  const [phValue, setPhValue] = useState(0);
  const [tempValue, setTempValue] = useState(0);
  const [locked, setLocked] = useState(false);
  const [wls1, setWls1] = useState(false);
  const [wls2, setWls2] = useState(false);
  const [floatAlarm, setFloatAlarm] = useState(false);
  const [pump1On, setPump1On] = useState(false);
  const [pump2On, setPump2On] = useState(false);
  const [greenOn, setGreenOn] = useState(false);
  const [redOn, setRedOn] = useState(false);
  const [phOk, setPhOk] = useState(false);
  const [lastTelemetryAt, setLastTelemetryAt] = useState<string | null>(null);
  const [boardConnected, setBoardConnected] = useState(false);
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetrySnapshot[]>([]);

  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [mqttStatus, setMqttStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [isSendingControl, setIsSendingControl] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState(getActiveDeviceId);

  const uptimeBaseRef = useRef(0);
  const uptimeSyncedAtRef = useRef<number | null>(null);
  const zeroUptimeWhileRunningStreakRef = useRef(0);
  const lastApiUptimeRef = useRef<number | null>(null);
  const lastHistoryStateSignatureRef = useRef('');
  const lastHistorySavedAtMsRef = useRef(0);
  const lastCarriedTelemetryRef = useRef<TelemetrySnapshot | null>(null);
  const historyCacheSaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const updateBoardConnected = () => {
      const telemetryMs = parseServerTimestampMs(lastTelemetryAt);
      setBoardConnected(telemetryMs != null && Date.now() - telemetryMs <= BOARD_TELEMETRY_STALE_MS);
    };

    updateBoardConnected();
    const intervalId = window.setInterval(updateBoardConnected, 1000);
    return () => window.clearInterval(intervalId);
  }, [lastTelemetryAt]);

  const carryTelemetrySnapshot = useCallback((snapshot: TelemetrySnapshot) => {
    lastCarriedTelemetryRef.current = snapshot;
    return snapshot;
  }, []);

  const persistTelemetrySnapshot = useCallback((snapshot: TelemetrySnapshot) => {
    const stateSignature = telemetryStateSignature(snapshot);
    const nowMs = Date.now();

    lastHistoryStateSignatureRef.current = stateSignature;
    lastHistorySavedAtMsRef.current = nowMs;

    setTelemetryHistory((prev) => {
      const merged = new Map<string, TelemetrySnapshot>();
      [snapshot, ...prev].forEach((row) => merged.set(telemetryFingerprint(row), row));
      const next = Array.from(merged.values())
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
        .slice(0, HISTORY_LIMIT);
      writeCachedTelemetryHistory(next);
      return next;
    });
  }, []);

  const persistTelemetrySnapshots = useCallback((snapshots: TelemetrySnapshot[]) => {
    if (!snapshots.length) return;
    setTelemetryHistory((prev) => {
      const merged = new Map<string, TelemetrySnapshot>();
      [...snapshots, ...prev].forEach((row) => merged.set(telemetryFingerprint(row), row));
      const next = Array.from(merged.values())
        .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
        .slice(0, HISTORY_LIMIT);
      writeCachedTelemetryHistory(next);
      return next;
    });
  }, []);

  const replaceTelemetrySnapshots = useCallback((snapshots: TelemetrySnapshot[]) => {
    if (!snapshots.length) return;
    const merged = new Map<string, TelemetrySnapshot>();
    snapshots.forEach((row) => merged.set(telemetryFingerprint(row), row));
    const next = Array.from(merged.values())
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, HISTORY_LIMIT);
    writeCachedTelemetryHistory(next);
    setTelemetryHistory(next);
  }, []);

  const applyTelemetrySnapshot = useCallback((snapshot: TelemetrySnapshot) => {
    setPhValue(snapshot.phValue);
    setEcValue(snapshot.ecValue);
    setTempValue(snapshot.tempValue);
    setWls1(snapshot.wls1);
    setWls2(snapshot.wls2);
    setFloatAlarm(snapshot.floatAlarm);
    setLocked(snapshot.locked);
    setPump1On(snapshot.pump1On);
    setPump2On(snapshot.pump2On);
    setGreenOn(snapshot.greenOn);
    setRedOn(snapshot.redOn);
    setPhOk(snapshot.phValue >= 6.5 && snapshot.phValue <= 7.5);
    setIsOn(snapshot.isOn);
    setPumps([snapshot.pump1On, snapshot.pump2On, false, false, false]);
    setActiveTank(snapshot.wls2 ? 2 : snapshot.wls1 ? 1 : null);
    setLastTelemetryAt(snapshot.timestamp);
    persistTelemetrySnapshot(snapshot);
  }, [persistTelemetrySnapshot]);

  useEffect(() => {
    uptimeBaseRef.current = uptimeBaseSeconds;
  }, [uptimeBaseSeconds]);

  useEffect(() => {
    uptimeSyncedAtRef.current = uptimeSyncedAtMs;
  }, [uptimeSyncedAtMs]);

  const getCurrentUptimeSeconds = useCallback(
    (onState: boolean) => {
      if (!onState) return uptimeBaseSeconds;
      if (uptimeSyncedAtMs == null) return uptimeBaseSeconds;
      const delta = Math.floor((Date.now() - uptimeSyncedAtMs) / 1000);
      return uptimeBaseSeconds + (delta > 0 ? delta : 0);
    },
    [uptimeBaseSeconds, uptimeSyncedAtMs],
  );

  useEffect(() => {
    let intervalId: number | undefined;
    if (isOn) {
      intervalId = window.setInterval(() => {
        setUptimeSeconds(getCurrentUptimeSeconds(true));
      }, 1000);
    }

    return () => {
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [isOn, getCurrentUptimeSeconds]);

  const fetchApiData = useCallback(async () => {
    const { tenantId, token } = getSessionAuth();
    if (!tenantId || !token) {
      return;
    }

    try {
      const activeDeviceId = getActiveDeviceId();
      const deviceParam = activeDeviceId ? `&device_id=${encodeURIComponent(activeDeviceId)}` : '';
      const response = await fetch(`${API_BASE_URL}/sensor-data?tenant_id=${tenantId}${deviceParam}`, {
        headers: {
          'x-tenant-id': tenantId,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const dataList = await response.json();
      if (!Array.isArray(dataList) || dataList.length === 0) return;

      const apiHistory = dataList
        .map(normalizeTelemetrySnapshot)
        .filter((snapshot): snapshot is TelemetrySnapshot => Boolean(snapshot));
      persistTelemetrySnapshots(apiHistory);

      const latest = [...dataList].sort((a, b) => recordSortKey(b) - recordSortKey(a))[0];
      if (!latest) return;
      if (isNoDataRecord(latest)) {
        setPressure(0);
        setFlowRate(0);
        setEcValue(0);
        setPhValue(0);
        setTempValue(0);
        setWls1(false);
        setWls2(false);
        setFloatAlarm(false);
        setLocked(false);
        setPump1On(false);
        setPump2On(false);
        setGreenOn(false);
        setRedOn(false);
        setPhOk(false);
        setLastTelemetryAt(null);
        setBoardConnected(false);
        setIsOn(false);
        setPumps([false, false, false, false, false]);
        setActiveTank(null);
        lastCarriedTelemetryRef.current = null;
        return;
      }

      const localNowMs = Date.now();
      const serverAtMs = parseServerTimestampMs(latest.timestamp);
      const serverNowMs = parseServerTimestampMs((latest as any).server_now) ?? localNowMs;
      const staleByCommand =
        lastLocalCommandAtMs != null &&
        serverAtMs != null &&
        serverAtMs < lastLocalCommandAtMs - 200;
      const resolvedDeviceId = String(latest.device_id || activeDeviceId || 'UNKNOWN');
      const snapshotTimestamp = typeof latest.timestamp === 'string' && latest.timestamp
        ? latest.timestamp
        : new Date().toISOString();
      const latestSnapshot: TelemetrySnapshot = {
        timestamp: snapshotTimestamp,
        deviceId: resolvedDeviceId,
        phValue: asNumber(firstDefined(latest.ph_value, latest.phValue, latest.ph)),
        ecValue: asNumber(firstDefined(latest.ec_value, latest.ecValue, latest.ec)),
        tempValue: asNumber(firstDefined(latest.temp_c, latest.tempValue, latest.temperature)),
        wls1: asBool(firstDefined(latest.wls1, latest.WLS1)),
        wls2: asBool(firstDefined(latest.wls2, latest.WLS2)),
        floatAlarm: asBool(firstDefined(latest.float_alarm, latest.floatAlarm, latest.float)),
        locked: asBool(firstDefined(latest.locked, latest.lock, latest.reed, latest.reed_switch)),
        pump1On: asBool(firstDefined(latest.pump1_on, latest.pump1On)),
        pump2On: asBool(firstDefined(latest.pump2_on, latest.pump2On)),
        greenOn: asBool(firstDefined(latest.green_on, latest.greenOn)),
        redOn: asBool(firstDefined(latest.red_on, latest.redOn)),
        isOn: asBool(firstDefined(latest.is_on, latest.isOn)),
      };

      const carriedSnapshot = carryTelemetrySnapshot(latestSnapshot);
      if (!carriedSnapshot) return;

      setPressure(Number(latest.pressure) || 0);
      setFlowRate(Number(latest.flow_rate) || 0);
      setEcValue(carriedSnapshot.ecValue);
      setPhValue(carriedSnapshot.phValue);
      setTempValue(carriedSnapshot.tempValue);
      setWls1(carriedSnapshot.wls1);
      setWls2(carriedSnapshot.wls2);
      setFloatAlarm(carriedSnapshot.floatAlarm);
      setLocked(carriedSnapshot.locked);
      setPump1On(carriedSnapshot.pump1On);
      setPump2On(carriedSnapshot.pump2On);
      setGreenOn(carriedSnapshot.greenOn);
      setRedOn(carriedSnapshot.redOn);
      setPhOk(asBool(firstDefined(latest.ph_ok, latest.phOk)) || (carriedSnapshot.phValue >= 6.5 && carriedSnapshot.phValue <= 7.5));
      setLastTelemetryAt(typeof latest.timestamp === 'string' ? latest.timestamp : null);

      const apiIsOn = carriedSnapshot.isOn;
      if (!staleByCommand) {
        const waitingAck = pendingIsOnAck !== null;
        const isAckMatched = waitingAck && apiIsOn === pendingIsOnAck;
        const ignoreApiState =
          ((ignoreApiStateUntilMs != null && localNowMs < ignoreApiStateUntilMs) || waitingAck) &&
          apiIsOn !== isOn;
        if (!ignoreApiState || isAckMatched) {
          setIsOn(apiIsOn);
          if (isAckMatched) {
            setPendingIsOnAck(null);
          }
        }
      }

      const apiUptime = Number(latest.uptime_seconds);
      if (Number.isFinite(apiUptime) && apiUptime >= 0 && !staleByCommand) {
        const normalized = Math.floor(apiUptime);
        const projectedApiUptime = normalized;
        const pendingReset = pendingResetUntilMs != null && localNowMs < pendingResetUntilMs;
        const localUptime = getCurrentUptimeSeconds(isOn);
        const sawPositiveApiBefore = (lastApiUptimeRef.current ?? 0) > 0;
        const freshServerReset =
          projectedApiUptime === 0 &&
          apiIsOn &&
          serverAtMs != null &&
          serverNowMs >= serverAtMs &&
          serverNowMs - serverAtMs <= 6000;

        if (isOn && projectedApiUptime === 0 && !pendingReset && sawPositiveApiBefore) {
          zeroUptimeWhileRunningStreakRef.current += 1;
        } else {
          zeroUptimeWhileRunningStreakRef.current = 0;
        }

        const allowZeroOverride =
          projectedApiUptime === 0 &&
          (!isOn ||
            pendingReset ||
            freshServerReset ||
            (sawPositiveApiBefore && zeroUptimeWhileRunningStreakRef.current >= 2));

        if (!(pendingReset && projectedApiUptime > 0)) {
          if (!isOn) {
            setUptimeBaseSeconds(projectedApiUptime);
            setUptimeSyncedAtMs(null);
            setUptimeSeconds(projectedApiUptime);
          } else if (allowZeroOverride) {
            setUptimeBaseSeconds(0);
            setUptimeSyncedAtMs(localNowMs);
            setUptimeSeconds(0);
            zeroUptimeWhileRunningStreakRef.current = 0;
          } else if (projectedApiUptime > localUptime + 2) {
            setUptimeBaseSeconds(projectedApiUptime);
            setUptimeSyncedAtMs(localNowMs);
            setUptimeSeconds(projectedApiUptime);
          } else {
            setUptimeSyncedAtMs((prev) => prev ?? localNowMs);
          }
        }

        if (projectedApiUptime === 0) {
          setPendingResetUntilMs(null);
          setUptimeFreezeUntilMs(localNowMs + 1500);
        } else {
          setUptimeFreezeUntilMs(null);
        }
        lastApiUptimeRef.current = projectedApiUptime;
      } else if (apiIsOn && uptimeSyncedAtRef.current == null) {
        setUptimeSyncedAtMs((prev) => prev ?? localNowMs);
      }

      if (latest.active_tank !== undefined && latest.active_tank !== null) {
        setActiveTank(Number(latest.active_tank));
      }

      setPumps((prev) => normalizePumps(latest.pumps, prev));

      persistTelemetrySnapshot(carriedSnapshot);
    } catch (err) {
      console.error('API Polling Error:', err);
    }
  }, [pendingResetUntilMs, ignoreApiStateUntilMs, pendingIsOnAck, isOn, lastLocalCommandAtMs, getCurrentUptimeSeconds, carryTelemetrySnapshot, persistTelemetrySnapshot, persistTelemetrySnapshots]);

  const fetchApiHistory = useCallback(async () => {
    const { tenantId, token } = getSessionAuth();
    if (!tenantId || !token) {
      return;
    }

    try {
      const activeDeviceId = getActiveDeviceId();
      const historyParams = new URLSearchParams({
        tenant_id: tenantId,
        history: 'true',
        limit: String(HISTORY_FETCH_LIMIT),
      });
      if (activeDeviceId) {
        historyParams.set('device_id', activeDeviceId);
      }

      const response = await fetch(`${API_BASE_URL}/sensor-data?${historyParams.toString()}`, {
        headers: {
          'x-tenant-id': tenantId,
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;
      const dataList = await response.json();
      if (!Array.isArray(dataList) || dataList.length === 0) return;

      const apiHistory = dataList
        .map(normalizeTelemetrySnapshot)
        .filter((snapshot): snapshot is TelemetrySnapshot => Boolean(snapshot));
      replaceTelemetrySnapshots(apiHistory);
    } catch (err) {
      console.error('API History Error:', err);
    }
  }, [replaceTelemetrySnapshots]);

  useEffect(() => {
    const cachedHistory = readCachedTelemetryHistory();
    setTelemetryHistory(cachedHistory);
    fetchApiData();
    fetchApiHistory();
  }, [activeDeviceId]);

  useEffect(() => {
    if (telemetryHistory.length === 0) return;
    if (historyCacheSaveTimerRef.current != null) {
      window.clearTimeout(historyCacheSaveTimerRef.current);
    }

    historyCacheSaveTimerRef.current = window.setTimeout(() => {
      writeCachedTelemetryHistory(telemetryHistory);
      historyCacheSaveTimerRef.current = null;
    }, 250);

    return () => {
      if (historyCacheSaveTimerRef.current != null) {
        window.clearTimeout(historyCacheSaveTimerRef.current);
        historyCacheSaveTimerRef.current = null;
      }
    };
  }, [activeDeviceId, telemetryHistory]);

  const syncAfterCommand = async () => {
    await fetchApiData();
    await new Promise((resolve) => setTimeout(resolve, 40));
    await fetchApiData();
  };

  const postMachineState = async (nextIsOn: boolean, nextUptimeSeconds: number) => {
    const { tenantId, token } = getSessionAuth();
    if (!tenantId || !token) {
      toast.error('Sync Failed', { description: 'Please login first.' });
      return false;
    }

    const activeDeviceId = getActiveDeviceId();
    const response = await fetch(`${API_BASE_URL}/sensor-data?tenant_id=${tenantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        is_on: nextIsOn,
        pressure,
        flow_rate: flowRate,
        ec_value: ecValue,
        uptime_seconds: nextUptimeSeconds,
        timestamp: new Date().toISOString(),
        tenant_id: tenantId,
        device_id: activeDeviceId || undefined,
        source: 'web-ui',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      toast.error(`Sync Failed: ${response.status}`, { description: errorText });
      return false;
    }

    return true;
  };

	  useEffect(() => {
	    const handleActiveDeviceChange = () => {
	      const nextDeviceId = getActiveDeviceId();
	      setActiveDeviceId(nextDeviceId);
	      setIsOn(false);
	      setUptimeBaseSeconds(0);
	      setUptimeSyncedAtMs(null);
	      setUptimeSeconds(0);
	      setPumps([false, false, false, false, false]);
	      setActiveTank(null);
	      setEcValue(0);
	      setPhValue(0);
	      setTempValue(0);
	      setWls1(false);
	      setWls2(false);
	      setFloatAlarm(false);
	      setLocked(false);
	      setPump1On(false);
	      setPump2On(false);
	      setGreenOn(false);
	      setRedOn(false);
	      setPhOk(false);
	      setLastTelemetryAt(null);
	      setBoardConnected(false);
	      setTelemetryHistory([]);
	      lastCarriedTelemetryRef.current = null;
	      setPendingIsOnAck(null);
	      setLastLocalCommandAtMs(null);
	      lastApiUptimeRef.current = null;
	    };

	    window.addEventListener(ACTIVE_DEVICE_EVENT_NAME, handleActiveDeviceChange);
	    window.addEventListener('storage', handleActiveDeviceChange);
	    return () => {
	      window.removeEventListener(ACTIVE_DEVICE_EVENT_NAME, handleActiveDeviceChange);
	      window.removeEventListener('storage', handleActiveDeviceChange);
	    };
	  }, []);

	  useEffect(() => {
	    if (!client || mqttStatus !== 'connected') return;
	    const { tenantId } = getSessionAuth();
	    const deviceSensorsTopic = getDeviceTopic(tenantId, activeDeviceId, 'sensors');
	    if (deviceSensorsTopic) {
	      client.subscribe(deviceSensorsTopic);
	    }
		    fetchApiData();
		    fetchApiHistory();
		  }, [activeDeviceId, client, fetchApiData, fetchApiHistory, mqttStatus]);

	  useEffect(() => {
	    const mqttClient = mqtt.connect(MQTT_BROKER, {
      clientId: `smartfarm_web_${Math.random().toString(16).substr(2, 8)}`,
      clean: true,
      connectTimeout: 8000,
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
    });

    mqttClient.on('connect', () => {
      setMqttStatus('connected');
      if (ACCEPT_LEGACY_MQTT) {
        mqttClient.subscribe(TOPIC_SENSORS_LEGACY);
      }

      const { tenantId } = getSessionAuth();
      const activeDeviceId = getActiveDeviceId();
      const deviceSensorsTopic = getDeviceTopic(tenantId, activeDeviceId, 'sensors');
      if (deviceSensorsTopic) {
        mqttClient.subscribe(deviceSensorsTopic);
      }
    });

    mqttClient.on('error', (err) => {
      console.error('MQTT Error:', err);
      setMqttStatus('disconnected');
    });

    mqttClient.on('message', (incomingTopic, payload) => {
      const raw = payload.toString();
      const parsed = parseMqttPayload(raw);
      if (!parsed) return;

      const selectedDeviceId = getActiveDeviceId();
      const incomingDeviceId = String(parsed.device_id || '').trim();
      if (selectedDeviceId && incomingDeviceId && incomingDeviceId !== selectedDeviceId) {
        return;
      }

      const topic = incomingTopic.toString();
      const { tenantId } = getSessionAuth();
      const deviceTopic = getDeviceTopic(tenantId, selectedDeviceId, 'sensors');
      if (topic === TOPIC_SENSORS_LEGACY && !ACCEPT_LEGACY_MQTT) {
        return;
      }
      if (selectedDeviceId && topic !== TOPIC_SENSORS_LEGACY && deviceTopic && topic !== deviceTopic) {
        return;
      }

      const snapshot: TelemetrySnapshot = {
        timestamp: typeof parsed.timestamp === 'string' && parsed.timestamp
          ? parsed.timestamp
          : new Date().toISOString(),
        deviceId: incomingDeviceId || selectedDeviceId || 'UNKNOWN',
        phValue: asNumber(firstDefined(parsed.ph_value, parsed.phValue, parsed.ph)),
        ecValue: asNumber(firstDefined(parsed.ec_value, parsed.ecValue, parsed.ec)),
        tempValue: asNumber(firstDefined(parsed.temp_c, parsed.tempValue, parsed.temperature)),
        wls1: asBool(firstDefined(parsed.wls1, parsed.WLS1)),
        wls2: asBool(firstDefined(parsed.wls2, parsed.WLS2)),
        floatAlarm: asBool(firstDefined(parsed.float_alarm, parsed.floatAlarm, parsed.float)),
        locked: asBool(firstDefined(parsed.locked, parsed.lock, parsed.reed, parsed.reed_switch)),
        pump1On: asBool(firstDefined(parsed.pump1_on, parsed.pump1On)),
        pump2On: asBool(firstDefined(parsed.pump2_on, parsed.pump2On)),
        greenOn: asBool(firstDefined(parsed.green_on, parsed.greenOn)),
        redOn: asBool(firstDefined(parsed.red_on, parsed.redOn)),
        isOn: asBool(firstDefined(parsed.is_on, parsed.isOn)),
      };

      setPressure(asNumber(parsed.pressure));
      setFlowRate(asNumber(firstDefined(parsed.flow_rate, parsed.flow)));
      const carriedSnapshot = carryTelemetrySnapshot(snapshot);
      if (carriedSnapshot) {
        applyTelemetrySnapshot(carriedSnapshot);
      }
    });

    setClient(mqttClient);

    const pollId = setInterval(fetchApiData, API_POLL_INTERVAL_MS);
    fetchApiData();
    fetchApiHistory();

    return () => {
      mqttClient.end();
      clearInterval(pollId);
    };
  }, [carryTelemetrySnapshot, fetchApiData, fetchApiHistory]);

  const publishCommand = useCallback(async (command: string, pump?: number, state?: 'ON' | 'OFF') => {
    if (!client || mqttStatus !== 'connected') {
      toast.error('Command Failed', {
        description: 'MQTT is not connected, so the board did not receive the command.',
      });
      return false;
    }

    const { tenantId } = getSessionAuth();
    const activeDeviceId = getActiveDeviceId();
    const payload = JSON.stringify({
      command,
      pump,
      state,
      tenant_id: tenantId,
      device_id: activeDeviceId || undefined,
      timestamp: Date.now(),
    });
    const deviceControlTopic = getDeviceTopic(tenantId, activeDeviceId, 'control');

    client.publish(TOPIC_CONTROL_LEGACY, payload);
    if (deviceControlTopic) {
      client.publish(deviceControlTopic, payload);
    }

    return true;
  }, [client, mqttStatus]);

  const resetUptime = async () => {
    if (isSendingControl) return;
    const nowMs = Date.now();
    setIsSendingControl(true);
    setLastLocalCommandAtMs(nowMs);
    setUptimeBaseSeconds(0);
    setUptimeSyncedAtMs(isOn ? nowMs : null);
    setUptimeFreezeUntilMs(nowMs + 1500);
    setPendingResetUntilMs(nowMs + 4000);
    setUptimeSeconds(0);
    zeroUptimeWhileRunningStreakRef.current = 0;
    lastApiUptimeRef.current = 0;
    try {
      await postMachineState(isOn, 0);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await postMachineState(isOn, 0);
      await syncAfterCommand();
    } catch (apiErr) {
      console.error('Failed to reset uptime via API:', apiErr);
      toast.error('Network Error', { description: 'Could not connect to API server.' });
    } finally {
      setIsSendingControl(false);
    }
  };

  const toggleMachine = async () => {
    if (isSendingControl) return;

    const newState = !isOn;
    const nowMs = Date.now();
    const currentUptime = getCurrentUptimeSeconds(isOn);
    setIsSendingControl(true);
    setLastLocalCommandAtMs(nowMs);
    setPendingIsOnAck(newState);
    setIgnoreApiStateUntilMs(nowMs + 1000);
    zeroUptimeWhileRunningStreakRef.current = 0;
    lastApiUptimeRef.current = currentUptime;

    const published = await publishCommand(newState ? 'START' : 'STOP');
    if (!published) {
      setIsSendingControl(false);
      setPendingIsOnAck(null);
      return;
    }

    try {
      // The board is the source of truth. Do not write the desired power state here;
      // wait for the firmware to publish the actual accepted state.
      await syncAfterCommand();
    } catch (apiErr) {
      console.error('Failed to sync machine state with API:', apiErr);
      toast.error('Network Error', { description: 'Could not connect to API server.' });
    } finally {
      setIsSendingControl(false);
    }

    toast.success(newState ? 'Machine System Started' : 'Machine System Stopped', {
      description: newState
        ? 'START command sent. The board will start only if it is not locked.'
        : 'STOP command sent. The board will stop and enter lock mode.',
    });
  };

  const togglePump = async (pumpIndex: number) => {
    if (isSendingControl) return;
    if (pumpIndex < 0 || pumpIndex > 1) return;

    const nextPumpState = !pumps[pumpIndex];
    const pumpNumber = pumpIndex + 1;
    const command =
      pumpNumber === 2
        ? (nextPumpState ? 'START' : 'STOP')
        : `PUMP${pumpNumber}_${nextPumpState ? 'ON' : 'OFF'}`;

    setIsSendingControl(true);
    setLastLocalCommandAtMs(Date.now());
    setPumps((prev) => prev.map((active, index) => (index === pumpIndex ? nextPumpState : active)));
    const published = await publishCommand(command, pumpNumber, nextPumpState ? 'ON' : 'OFF');
    if (!published) {
      setIsSendingControl(false);
      return;
    }

    try {
      await syncAfterCommand();
    } catch (apiErr) {
      console.error('Failed to sync pump state with API:', apiErr);
      toast.error('Network Error', { description: 'Could not connect to API server.' });
    } finally {
      setIsSendingControl(false);
    }

    toast.success(`Pump ${pumpNumber} ${nextPumpState ? 'ON' : 'OFF'}`, {
      description: `${command} command sent to the board.`,
    });
  };

  const sendStartCommand = useCallback(async () => {
    if (isSendingControl) return;
    setIsSendingControl(true);
    setLastLocalCommandAtMs(Date.now());
    const published = await publishCommand('START', 2, 'ON');
    if (published) {
      await syncAfterCommand();
      toast.success('Pump 2 START sent', {
        description: 'The board will run Pump 2 only if manual conditions are satisfied.',
      });
    }
    setIsSendingControl(false);
  }, [isSendingControl, publishCommand]);

  const sendEmergencyStop = useCallback(async () => {
    if (isSendingControl) return;
    setIsSendingControl(true);
    setLastLocalCommandAtMs(Date.now());
    const published = await publishCommand('STOP', 2, 'OFF');
    if (published) {
      await syncAfterCommand();
      toast.success('Emergency STOP sent', {
        description: 'The board should stop all outputs and enter lock mode.',
      });
    }
    setIsSendingControl(false);
  }, [isSendingControl, publishCommand]);

  const stopPump2FromWeb = useCallback(async () => {
    if (isSendingControl) return;
    setIsSendingControl(true);
    setLastLocalCommandAtMs(Date.now());
    const published = await publishCommand('PUMP2_OFF', 2, 'OFF');
    if (published) {
      await publishCommand('ACK_ALARM', 2, 'OFF');
      await syncAfterCommand();
      toast.success('Pump 2 OFF sent', {
        description: 'The board will stop Pump 2 and acknowledge the cabinet alarm.',
      });
    }
    setIsSendingControl(false);
  }, [isSendingControl, publishCommand]);

  return (
    <MachineContext.Provider
      value={{
        isOn,
        toggleMachine,
        togglePump,
        sendStartCommand,
        sendEmergencyStop,
        stopPump2FromWeb,
        resetUptime,
        uptimeSeconds,
        pressure,
        flowRate,
        pumps,
        activeTank,
        ecValue,
        phValue,
        tempValue,
        locked,
        wls1,
        wls2,
        floatAlarm,
        pump1On,
        pump2On,
        greenOn,
        redOn,
        phOk,
        lastTelemetryAt,
        boardConnected,
        telemetryHistory,
        mqttStatus,
      }}
    >
      {children}
    </MachineContext.Provider>
  );
}

export function useMachine() {
  const context = useContext(MachineContext);
  if (context === undefined) {
    throw new Error('useMachine must be used within a MachineProvider');
  }
  return context;
}
