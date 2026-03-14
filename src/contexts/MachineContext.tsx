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

interface MachineContextType {
  isOn: boolean;
  toggleMachine: () => void;
  resetUptime: () => void;
  uptimeSeconds: number;
  pressure: number;
  flowRate: number;
  pumps: boolean[];
  activeTank: number | null;
  ecValue: number;
  mqttStatus: 'connected' | 'disconnected' | 'connecting';
}

const MachineContext = createContext<MachineContextType | undefined>(undefined);

const MQTT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
const TOPIC_SENSORS = 'smartfarm/sensors';
const TOPIC_CONTROL = 'smartfarm/control';
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

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

  const [client, setClient] = useState<mqtt.MqttClient | null>(null);
  const [mqttStatus, setMqttStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [isSendingControl, setIsSendingControl] = useState(false);

  const uptimeBaseRef = useRef(0);
  const uptimeSyncedAtRef = useRef<number | null>(null);
  const zeroUptimeWhileRunningStreakRef = useRef(0);
  const lastApiUptimeRef = useRef<number | null>(null);

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
      const activeDeviceId = typeof window !== 'undefined'
        ? window.localStorage.getItem('active_device_id') || ''
        : '';
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
    } catch (err) {
      console.error('API Polling Error:', err);
    }
  }, [pendingResetUntilMs, ignoreApiStateUntilMs, pendingIsOnAck, isOn, lastLocalCommandAtMs, getCurrentUptimeSeconds]);

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
    const mqttClient = mqtt.connect(MQTT_BROKER, {
      clientId: `smartfarm_web_${Math.random().toString(16).substr(2, 8)}`,
    });

    mqttClient.on('connect', () => {
      setMqttStatus('connected');
      mqttClient.subscribe(TOPIC_SENSORS);
    });

    mqttClient.on('error', (err) => {
      console.error('MQTT Error:', err);
      setMqttStatus('disconnected');
    });

    mqttClient.on('message', () => {
      // API polling is the primary sync source.
    });

    setClient(mqttClient);

    const pollId = setInterval(fetchApiData, 250);
    fetchApiData();

    return () => {
      mqttClient.end();
      clearInterval(pollId);
    };
  }, [fetchApiData]);

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
    setIsOn(newState);
    setPendingIsOnAck(newState);
    setIgnoreApiStateUntilMs(nowMs + 3000);
    zeroUptimeWhileRunningStreakRef.current = 0;
    lastApiUptimeRef.current = currentUptime;
    if (newState) {
      setUptimeSyncedAtMs(nowMs);
    } else {
      setUptimeBaseSeconds(currentUptime);
      setUptimeSyncedAtMs(null);
      setUptimeSeconds(currentUptime);
    }

    if (client && mqttStatus === 'connected') {
      const payload = JSON.stringify({ command: newState ? 'START' : 'STOP', timestamp: Date.now() });
      client.publish(TOPIC_CONTROL, payload);
    }

    try {
      await postMachineState(newState, currentUptime);
      await syncAfterCommand();
    } catch (apiErr) {
      console.error('Failed to sync machine state with API:', apiErr);
      toast.error('Network Error', { description: 'Could not connect to API server.' });
    } finally {
      setIsSendingControl(false);
    }

    toast.success(newState ? 'Machine System Started' : 'Machine System Stopped', {
      description: 'Command sent to system.',
    });
  };

  return (
    <MachineContext.Provider
      value={{
        isOn,
        toggleMachine,
        resetUptime,
        uptimeSeconds,
        pressure,
        flowRate,
        pumps,
        activeTank,
        ecValue,
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
