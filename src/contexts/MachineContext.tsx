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
import { ACTIVE_DEVICE_EVENT_NAME } from '@/hooks/useActiveDeviceId';

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
const HISTORY_LIMIT = 200;

const getTelemetryHistoryKey = (deviceId: string) =>
  `greencrop.telemetry.history.${safeTopicSegment(deviceId || 'default')}`;

const safeTopicSegment = (value: string) =>
  value.trim().replace(/[^A-Za-z0-9_-]/g, '');

const getActiveDeviceId = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem('active_device_id') || '';
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
  const [telemetryHistory, setTelemetryHistory] = useState<TelemetrySnapshot[]>([]);

  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [mqttStatus, setMqttStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [isSendingControl, setIsSendingControl] = useState(false);
  const [activeDeviceId, setActiveDeviceId] = useState(getActiveDeviceId);

  const uptimeBaseRef = useRef(0);
  const uptimeSyncedAtRef = useRef<number | null>(null);
  const zeroUptimeWhileRunningStreakRef = useRef(0);
  const lastApiUptimeRef = useRef<number | null>(null);
  const lastHistorySignatureRef = useRef('');

  const loadTelemetryHistory = useCallback((deviceId: string) => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(getTelemetryHistoryKey(deviceId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as TelemetrySnapshot[] : [];
    } catch {
      return [];
    }
  }, []);

  const persistTelemetrySnapshot = useCallback((snapshot: TelemetrySnapshot) => {
    const signature = [
      snapshot.timestamp,
      snapshot.deviceId,
      snapshot.phValue.toFixed(2),
      snapshot.ecValue.toFixed(2),
      snapshot.tempValue.toFixed(1),
      snapshot.wls1 ? '1' : '0',
      snapshot.wls2 ? '1' : '0',
      snapshot.floatAlarm ? '1' : '0',
      snapshot.locked ? '1' : '0',
      snapshot.pump1On ? '1' : '0',
      snapshot.pump2On ? '1' : '0',
    ].join('|');

    if (lastHistorySignatureRef.current === signature) return;
    lastHistorySignatureRef.current = signature;

    setTelemetryHistory((prev) => {
      const next = [snapshot, ...prev].slice(0, HISTORY_LIMIT);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(getTelemetryHistoryKey(snapshot.deviceId), JSON.stringify(next));
      }
      return next;
    });
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

      const latest = [...dataList].sort((a, b) => recordSortKey(b) - recordSortKey(a))[0];
      if (!latest) return;

      const localNowMs = Date.now();
      const serverAtMs = parseServerTimestampMs(latest.timestamp);
      const serverNowMs = parseServerTimestampMs((latest as any).server_now) ?? localNowMs;
      const staleByCommand =
        lastLocalCommandAtMs != null &&
        serverAtMs != null &&
        serverAtMs < lastLocalCommandAtMs - 200;

      setPressure(Number(latest.pressure) || 0);
      setFlowRate(Number(latest.flow_rate) || 0);
      setEcValue(Number(latest.ec_value) || 0);
      setPhValue(Number(latest.ph_value) || 0);
      setTempValue(Number(latest.temp_c) || 0);
      setWls1(asBool(latest.wls1));
      setWls2(asBool(latest.wls2));
      setFloatAlarm(asBool(latest.float_alarm));
      setLocked(asBool(latest.locked));
      setPump1On(asBool(latest.pump1_on));
      setPump2On(asBool(latest.pump2_on));
      setGreenOn(asBool(latest.green_on));
      setRedOn(asBool(latest.red_on));
      setPhOk(asBool(latest.ph_ok) || ((Number(latest.ph_value) || 0) >= 6.5 && (Number(latest.ph_value) || 0) <= 7.5));
      setLastTelemetryAt(typeof latest.timestamp === 'string' ? latest.timestamp : null);

      const apiIsOn = asBool(latest.is_on);
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

      const resolvedDeviceId = String(latest.device_id || activeDeviceId || 'UNKNOWN');
      const snapshotTimestamp = typeof latest.timestamp === 'string' && latest.timestamp
        ? latest.timestamp
        : new Date().toISOString();
      persistTelemetrySnapshot({
        timestamp: snapshotTimestamp,
        deviceId: resolvedDeviceId,
        phValue: asNumber(latest.ph_value),
        ecValue: asNumber(latest.ec_value),
        tempValue: asNumber(latest.temp_c),
        wls1: asBool(latest.wls1),
        wls2: asBool(latest.wls2),
        floatAlarm: asBool(latest.float_alarm),
        locked: asBool(latest.locked),
        pump1On: asBool(latest.pump1_on),
        pump2On: asBool(latest.pump2_on),
        greenOn: asBool(latest.green_on),
        redOn: asBool(latest.red_on),
        isOn: asBool(latest.is_on),
      });
    } catch (err) {
      console.error('API Polling Error:', err);
    }
  }, [pendingResetUntilMs, ignoreApiStateUntilMs, pendingIsOnAck, isOn, lastLocalCommandAtMs, getCurrentUptimeSeconds, persistTelemetrySnapshot]);

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
	      setTelemetryHistory(loadTelemetryHistory(nextDeviceId));
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
	  }, [loadTelemetryHistory]);

  useEffect(() => {
    setTelemetryHistory(loadTelemetryHistory(activeDeviceId));
  }, [activeDeviceId, loadTelemetryHistory]);

	  useEffect(() => {
	    if (!client || mqttStatus !== 'connected') return;
	    const { tenantId } = getSessionAuth();
	    const deviceSensorsTopic = getDeviceTopic(tenantId, activeDeviceId, 'sensors');
	    if (deviceSensorsTopic) {
	      client.subscribe(deviceSensorsTopic);
	    }
	    fetchApiData();
	  }, [activeDeviceId, client, fetchApiData, mqttStatus]);

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
      mqttClient.subscribe(TOPIC_SENSORS_LEGACY);

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
      if (selectedDeviceId && topic !== TOPIC_SENSORS_LEGACY && deviceTopic && topic !== deviceTopic) {
        return;
      }

      const snapshot: TelemetrySnapshot = {
        timestamp: typeof parsed.timestamp === 'string' && parsed.timestamp
          ? parsed.timestamp
          : new Date().toISOString(),
        deviceId: incomingDeviceId || selectedDeviceId || 'UNKNOWN',
        phValue: asNumber(parsed.ph_value),
        ecValue: asNumber(parsed.ec_value),
        tempValue: asNumber(parsed.temp_c),
        wls1: asBool(parsed.wls1),
        wls2: asBool(parsed.wls2),
        floatAlarm: asBool(parsed.float_alarm),
        locked: asBool(parsed.locked),
        pump1On: asBool(parsed.pump1_on),
        pump2On: asBool(parsed.pump2_on),
        greenOn: asBool(parsed.green_on),
        redOn: asBool(parsed.red_on),
        isOn: asBool(parsed.is_on),
      };

      setPressure(asNumber(parsed.pressure));
      setFlowRate(asNumber(parsed.flow_rate));
      applyTelemetrySnapshot(snapshot);
    });

    setClient(mqttClient);

    const pollId = setInterval(fetchApiData, 250);
    fetchApiData();

    return () => {
      mqttClient.end();
      clearInterval(pollId);
    };
  }, [fetchApiData]);

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
      await syncAfterCommand();
      toast.success('Pump 2 OFF sent', {
        description: 'The board will stop Pump 2 while keeping the rest of the logic unchanged.',
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
