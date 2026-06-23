import { Fragment, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Download, Gauge, Search, Thermometer, Waves, Wifi } from "lucide-react";
import { toast } from "sonner";
import { ExportFiltersCard } from "@/components/ExportFiltersCard";
import { useDeviceSeed } from "@/hooks/useActiveDeviceId";
import { downloadSimplePdf, downloadTextFile } from "@/utils/download";
import {
  formatLocalDateKey,
  formatTelemetryDateLabel,
  formatTelemetryDateTime,
  formatTelemetryMinuteKey,
  formatTelemetryTime,
} from "@/utils/telemetryDate";
import { useMachine } from "../../contexts/MachineContext";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { MinimalDatePicker } from "../ui/minimal-date-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

type DeviceMonitorPageProps = {
  language?: string;
};

type LiveDeviceRow = {
  id: string;
  name: string;
  type: "Sensor" | "Actuator" | "System";
  category: string;
  status: "Active" | "Standby" | "Alarm";
  value: string;
  lastUpdate: string;
  icon: typeof Activity;
};

const statusClass = (status: LiveDeviceRow["status"]) => {
  if (status === "Alarm") return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";
  if (status === "Active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  return "border-border bg-muted text-muted-foreground";
};

const boolText = (value: boolean, isTH: boolean) => {
  if (value) return isTH ? "ทำงาน/พบสัญญาณ" : "ON / Detected";
  return isTH ? "หยุด/ไม่พบสัญญาณ" : "OFF / Not detected";
};

const hasDisplayChange = (previous: LiveDeviceRow | undefined, next: LiveDeviceRow) => {
  if (!previous) return true;
  return (
    previous.name !== next.name ||
    previous.type !== next.type ||
    previous.category !== next.category ||
    previous.status !== next.status ||
    previous.value !== next.value
  );
};

export function DeviceMonitorPage({ language = "TH" }: DeviceMonitorPageProps) {
  const { deviceId } = useDeviceSeed();
  const {
    ecValue,
    phValue,
    tempValue,
    wls1,
    wls2,
    floatAlarm,
    locked,
    pump1On,
    pump2On,
    greenOn,
    redOn,
    phOk,
    mqttStatus,
    lastTelemetryAt,
    boardConnected,
    telemetryHistory,
    stopPump2FromWeb,
    sendEmergencyStop,
  } = useMachine();

  const isTH = language === "TH";
  const locale = isTH ? "th-TH" : "en-GB";
  const deviceLabel = deviceId ? `${isTH ? "อุปกรณ์" : "Device"} ${deviceId}` : isTH ? "ทุกอุปกรณ์" : "All Devices";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<LiveDeviceRow | null>(null);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [exportMonth, setExportMonth] = useState("");
  const [exportStartTime, setExportStartTime] = useState("");
  const [exportEndTime, setExportEndTime] = useState("");
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(["Sensor", "Actuator", "System"]);
  const [historyDateMode, setHistoryDateMode] = useState<"latest" | "all" | string>("all");
  const [dismissedCabinetAlarm, setDismissedCabinetAlarm] = useState(false);

  const lastUpdate = formatTelemetryDateTime(lastTelemetryAt, locale);
  const liveLastUpdate = boardConnected ? lastUpdate : "-";
  const cabinetAlarmActive = boardConnected && redOn;

  useEffect(() => {
    if (!cabinetAlarmActive) {
      setDismissedCabinetAlarm(false);
    }
  }, [cabinetAlarmActive]);

  const handleStopCabinetAlarm = () => {
    setDismissedCabinetAlarm(true);
    stopPump2FromWeb();
  };

  const handleEmergencyCabinetAlarm = () => {
    setDismissedCabinetAlarm(true);
    sendEmergencyStop();
  };

  const liveRows = useMemo<LiveDeviceRow[]>(
    () => [
      {
        id: "ph",
        name: isTH ? "เซนเซอร์ pH" : "pH Sensor",
        type: "Sensor",
        category: isTH ? "คุณภาพน้ำ" : "Water Quality",
        status: !boardConnected ? "Standby" : phOk ? "Active" : "Alarm",
        value: boardConnected ? `${phValue.toFixed(2)} pH` : "--",
        lastUpdate: liveLastUpdate,
        icon: Gauge,
      },
      {
        id: "ec",
        name: isTH ? "เซนเซอร์ EC" : "EC Sensor",
        type: "Sensor",
        category: isTH ? "คุณภาพน้ำ" : "Water Quality",
        status: boardConnected && ecValue > 0 ? "Active" : "Standby",
        value: boardConnected ? `${ecValue.toFixed(2)} mS/cm` : "--",
        lastUpdate: liveLastUpdate,
        icon: Waves,
      },
      {
        id: "temp",
        name: isTH ? "เซนเซอร์อุณหภูมิ" : "Temperature Sensor",
        type: "Sensor",
        category: isTH ? "อุณหภูมิน้ำ" : "Water Temperature",
        status: boardConnected && tempValue > 0 ? "Active" : "Standby",
        value: boardConnected ? `${tempValue.toFixed(1)} °C` : "--",
        lastUpdate: liveLastUpdate,
        icon: Thermometer,
      },
      {
        id: "wls1",
        name: isTH ? "WLS1 ระดับล่าง" : "WLS1 Lower Level",
        type: "Sensor",
        category: isTH ? "ระดับน้ำ" : "Water Level",
        status: boardConnected && wls1 ? "Active" : "Standby",
        value: boardConnected ? wls1 ? (isTH ? "ตรวจพบน้ำ" : "Water detected") : (isTH ? "ยังไม่ถึงระดับ" : "Not reached") : "--",
        lastUpdate: liveLastUpdate,
        icon: Waves,
      },
      {
        id: "wls2",
        name: isTH ? "WLS2 ระดับบน" : "WLS2 Upper Level",
        type: "Sensor",
        category: isTH ? "ระดับน้ำ" : "Water Level",
        status: boardConnected && wls2 ? "Active" : "Standby",
        value: boardConnected ? wls2 ? (isTH ? "น้ำเต็มระดับ" : "Target reached") : (isTH ? "กำลังรอ" : "Waiting") : "--",
        lastUpdate: liveLastUpdate,
        icon: Waves,
      },
      {
        id: "float",
        name: isTH ? "ลูกลอยถัง 2" : "Tank 2 Float Switch",
        type: "Sensor",
        category: isTH ? "แจ้งเตือน" : "Alarm",
        status: !boardConnected ? "Standby" : floatAlarm ? "Alarm" : "Active",
        value: boardConnected ? floatAlarm ? (isTH ? "แจ้งเตือน" : "Alarm") : (isTH ? "ปกติ" : "Normal") : "--",
        lastUpdate: liveLastUpdate,
        icon: AlertTriangle,
      },
      {
        id: "pump1",
        name: isTH ? "ปั๊ม 1 อัตโนมัติ" : "Pump 1 Auto",
        type: "Actuator",
        category: isTH ? "ปั๊ม" : "Pump",
        status: boardConnected && pump1On ? "Active" : "Standby",
        value: boardConnected ? pump1On ? (isTH ? "กำลังทำงาน" : "Running") : (isTH ? "หยุด" : "Stopped") : "--",
        lastUpdate: liveLastUpdate,
        icon: Activity,
      },
      {
        id: "pump2",
        name: isTH ? "ปั๊ม 2 กดมือ/เว็บ" : "Pump 2 Manual/Web",
        type: "Actuator",
        category: isTH ? "ปั๊ม" : "Pump",
        status: boardConnected && pump2On ? "Active" : "Standby",
        value: boardConnected ? pump2On ? (isTH ? "กำลังทำงาน" : "Running") : (isTH ? "หยุด" : "Stopped") : "--",
        lastUpdate: liveLastUpdate,
        icon: Activity,
      },
      {
        id: "lock",
        name: isTH ? "สถานะล็อคระบบ" : "System Lock",
        type: "System",
        category: isTH ? "ความปลอดภัย" : "Safety",
        status: !boardConnected ? "Standby" : locked ? "Alarm" : "Active",
        value: boardConnected ? locked ? (isTH ? "ล็อคฉุกเฉิน" : "Emergency locked") : (isTH ? "พร้อมทำงาน" : "Ready") : "--",
        lastUpdate: liveLastUpdate,
        icon: AlertTriangle,
      },
      {
        id: "lamp",
        name: isTH ? "ไฟสถานะ" : "Status Lamps",
        type: "System",
        category: isTH ? "ไฟแสดงผล" : "Indicator",
        status: !boardConnected ? "Standby" : redOn ? "Alarm" : greenOn ? "Active" : "Standby",
        value: boardConnected ? redOn ? (isTH ? "ไฟแดง" : "Red lamp") : greenOn ? (isTH ? "ไฟเขียว" : "Green lamp") : "-" : "--",
        lastUpdate: liveLastUpdate,
        icon: CheckCircle2,
      },
    ],
    [boardConnected, ecValue, floatAlarm, greenOn, isTH, liveLastUpdate, locked, phOk, phValue, pump1On, pump2On, redOn, tempValue, wls1, wls2],
  );

  const [stableLiveRows, setStableLiveRows] = useState<LiveDeviceRow[]>(liveRows);

  useEffect(() => {
    setStableLiveRows((previousRows) => {
      const previousById = new Map(previousRows.map((row) => [row.id, row]));
      let didChange = previousRows.length !== liveRows.length;

      const nextRows = liveRows.map((row) => {
        const previous = previousById.get(row.id);
        if (hasDisplayChange(previous, row)) {
          didChange = true;
          return row;
        }
        return previous;
      });

      return didChange ? nextRows : previousRows;
    });
  }, [liveRows]);

  const dataTypeOptions = [
    { key: "Sensor", label: isTH ? "เซนเซอร์" : "Sensor" },
    { key: "Actuator", label: isTH ? "แอคชูเอเตอร์" : "Actuator" },
    { key: "System", label: isTH ? "ระบบ" : "System" },
  ];

  const filteredData = stableLiveRows.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  const processCards = useMemo(
    () => [
      {
        label: isTH ? "MQTT" : "MQTT",
        value: mqttStatus === "connected" ? (isTH ? "เชื่อมต่อ" : "Connected") : (isTH ? "ยังไม่เชื่อมต่อ" : "Disconnected"),
        tone: mqttStatus === "connected" ? "ok" : "danger",
      },
      {
        label: isTH ? "WLS1 ระดับล่าง" : "WLS1 Lower",
        value: boolText(wls1, isTH),
        tone: wls1 ? "ok" : "idle",
      },
      {
        label: isTH ? "WLS2 ระดับบน" : "WLS2 Upper",
        value: wls2 ? (isTH ? "น้ำเต็มระดับ" : "Target reached") : (isTH ? "ยังไม่เต็ม" : "Not full"),
        tone: wls2 ? "ok" : "idle",
      },
      {
        label: isTH ? "ลูกลอยถัง 2" : "Tank 2 Float",
        value: floatAlarm ? (isTH ? "แจ้งเตือน" : "Alarm") : (isTH ? "ปกติ" : "Normal"),
        tone: floatAlarm ? "danger" : "ok",
      },
      {
        label: isTH ? "ล็อคฉุกเฉิน" : "Emergency Lock",
        value: locked ? (isTH ? "ล็อคอยู่" : "Locked") : (isTH ? "พร้อมทำงาน" : "Ready"),
        tone: locked ? "danger" : "ok",
      },
      {
        label: isTH ? "pH ผ่านเงื่อนไข" : "pH Condition",
        value: phOk ? (isTH ? "ผ่าน 6.5-7.5" : "OK 6.5-7.5") : (isTH ? "ไม่ผ่าน" : "Out of range"),
        tone: phOk ? "ok" : "danger",
      },
      {
        label: isTH ? "ปั๊ม 1 ออโต้" : "Pump 1 Auto",
        value: pump1On ? (isTH ? "กำลังเดิน" : "Running") : (isTH ? "หยุด" : "Stopped"),
        tone: pump1On ? "ok" : "idle",
      },
      {
        label: isTH ? "ปั๊ม 2 กดมือ/เว็บ" : "Pump 2 Manual/Web",
        value: pump2On ? (isTH ? "กำลังเดิน" : "Running") : (isTH ? "หยุด" : "Stopped"),
        tone: pump2On ? "ok" : "idle",
      },
      {
        label: isTH ? "ไฟเขียว" : "Green Lamp",
        value: greenOn ? (isTH ? "ติด" : "ON") : (isTH ? "ดับ" : "OFF"),
        tone: greenOn ? "ok" : "idle",
      },
      {
        label: isTH ? "ไฟแดง/เสียง" : "Red Lamp / Sound",
        value: redOn ? (isTH ? "แจ้งเตือน" : "Alarm") : (isTH ? "ปกติ" : "Normal"),
        tone: redOn ? "danger" : "ok",
      },
    ],
    [floatAlarm, greenOn, isTH, locked, mqttStatus, phOk, pump1On, pump2On, redOn, wls1, wls2],
  );

  const historyDates = useMemo(() => {
    const dates = telemetryHistory.map((row) => formatLocalDateKey(row.timestamp)).filter(Boolean);
    return Array.from(new Set(dates));
  }, [telemetryHistory]);

  const activeHistoryDate = historyDateMode === "latest" ? historyDates[0] || "" : historyDateMode;
  const historyForSelectedDate = useMemo(() => {
    if (activeHistoryDate === "all") return telemetryHistory;
    if (!activeHistoryDate) return [];
    return telemetryHistory.filter((row) => formatLocalDateKey(row.timestamp) === activeHistoryDate);
  }, [activeHistoryDate, telemetryHistory]);

  const groupedHistory = useMemo(() => {
    const groups: { date: string; rows: typeof telemetryHistory }[] = [];
    historyForSelectedDate.forEach((row) => {
      const date = formatLocalDateKey(row.timestamp);
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup || lastGroup.date !== date) {
        groups.push({ date, rows: [row] });
      } else {
        lastGroup.rows.push(row);
      }
    });
    return groups;
  }, [historyForSelectedDate]);

  const oldestHistoryAt = historyForSelectedDate[historyForSelectedDate.length - 1]?.timestamp || "";
  const newestHistoryAt = historyForSelectedDate[0]?.timestamp || "";
  const trendHistory = telemetryHistory.slice(0, 12).reverse();

  const cardToneClass = (tone: string) => {
    if (tone === "danger") return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";
    if (tone === "ok") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    return "border-border bg-muted/40 text-muted-foreground";
  };

  const exportHistoryRows = useMemo(() => {
    return telemetryHistory.filter((row) => {
      const day = formatLocalDateKey(row.timestamp);
      if (!day) return false;
      if (exportMonth && !day.startsWith(exportMonth)) return false;
      if (exportStart && day < exportStart) return false;
      if (exportEnd && day > exportEnd) return false;

      const time = formatTelemetryMinuteKey(row.timestamp);
      if (exportStartTime && time < exportStartTime) return false;
      if (exportEndTime && time > exportEndTime) return false;
      return true;
    });
  }, [exportEnd, exportEndTime, exportMonth, exportStart, exportStartTime, telemetryHistory]);

  const buildExportPayload = () => {
    const lines: string[] = [];
    lines.push(isTH ? "รายงานสถานะอุปกรณ์จริงจาก MQTT" : "Live MQTT Device Status Report");
    lines.push(`${isTH ? "อุปกรณ์" : "Device"}, ${deviceId || "-"}`);
    lines.push(`${isTH ? "อัปเดตล่าสุด" : "Last Update"}, ${lastUpdate}`);
    if (exportStart || exportEnd) {
      lines.push(`${isTH ? "ช่วงวันที่" : "Date Range"}, ${exportStart || "-"} to ${exportEnd || "-"}`);
    }
    if (exportMonth) {
      lines.push(`${isTH ? "เดือน" : "Month"}, ${exportMonth}`);
    }
    if (exportStartTime || exportEndTime) {
      lines.push(`${isTH ? "ช่วงเวลา" : "Time Range"}, ${exportStartTime || "00:00"} to ${exportEndTime || "23:59"}`);
    }
    lines.push("");
    lines.push("id,name,type,category,status,value,lastUpdate");
    liveRows
      .filter((d) => selectedDataTypes.includes(d.type))
      .forEach((d) => {
        lines.push(`${d.id},${d.name},${d.type},${d.category},${d.status},${d.value},${d.lastUpdate}`);
      });

    lines.push("");
    lines.push("history_timestamp,ph,ec,temp,wls1,wls2,float_alarm,locked,pump1,pump2");
    exportHistoryRows.slice(0, 500).forEach((row) => {
      lines.push([
        row.timestamp,
        row.phValue.toFixed(2),
        row.ecValue.toFixed(2),
        row.tempValue.toFixed(1),
        row.wls1,
        row.wls2,
        row.floatAlarm,
        row.locked,
        row.pump1On,
        row.pump2On,
      ].join(","));
    });

    return lines.join("\n");
  };

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      if (selectedDataTypes.length === 0) {
        toast.error(isTH ? "ส่งออกล้มเหลว" : "Export Failed", {
          description: isTH ? "กรุณาเลือกอย่างน้อย 1 ประเภทข้อมูล" : "Please select at least one data type.",
        });
        return;
      }

      const payload = buildExportPayload();
      const filename = `live_device_monitor.${format}`;
      if (format === "pdf") {
        await downloadSimplePdf(filename, payload);
      } else {
        downloadTextFile(filename, payload, "text/csv;charset=utf-8");
      }

      toast.success(isTH ? "ส่งออกสำเร็จ" : "Export Successful", {
        description: isTH ? `ดาวน์โหลด ${filename}` : `Downloaded ${filename}`,
      });
    } catch {
      toast.error(isTH ? "ส่งออกล้มเหลว" : "Export Failed", {
        description: isTH ? "ไม่สามารถสร้างไฟล์ได้" : "Could not generate export file.",
      });
    }
  };

  return (
    <>
      <style>{`
        @keyframes waterFullPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.38), 0 30px 90px rgba(127, 29, 29, 0.32);
          }
          50% {
            transform: scale(1.015);
            box-shadow: 0 0 0 12px rgba(239, 68, 68, 0.08), 0 34px 110px rgba(127, 29, 29, 0.45);
          }
        }

        @keyframes hazardBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.56; }
        }

        @media (prefers-reduced-motion: reduce) {
          .water-full-alert-card,
          .water-full-hazard {
            animation: none !important;
          }
        }
      `}</style>

      {cabinetAlarmActive && !dismissedCabinetAlarm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/62 p-4 backdrop-blur-sm">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-[repeating-linear-gradient(115deg,#facc15_0_28px,#020617_28px_56px)] water-full-hazard" style={{ animation: "hazardBlink 0.8s ease-in-out infinite" }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-[repeating-linear-gradient(115deg,#facc15_0_28px,#020617_28px_56px)] water-full-hazard" style={{ animation: "hazardBlink 0.8s ease-in-out infinite" }} />

          <div
            className="water-full-alert-card w-full max-w-3xl overflow-hidden rounded-[28px] border-4 border-yellow-400 bg-white/94 text-center shadow-2xl"
            style={{ animation: "waterFullPulse 1.05s ease-in-out infinite" }}
            role="alert"
            aria-live="assertive"
          >
            <div className="bg-[repeating-linear-gradient(115deg,#facc15_0_24px,#020617_24px_48px)] px-6 py-4" />
            <div className="px-6 py-10 sm:px-10">
              <div className="mx-auto grid h-24 w-24 place-items-center rounded-[24px] border-4 border-yellow-400 bg-yellow-300 shadow-[0_18px_40px_rgba(234,179,8,0.28)]">
                <AlertTriangle className="h-14 w-14 text-slate-950" />
              </div>
              <h2 className="mt-7 text-4xl font-black leading-tight text-slate-950 sm:text-6xl">
                {isTH ? "น้ำเต็มแล้ว" : "Water Full"}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base font-semibold text-slate-700 sm:text-xl">
                {isTH
                    ? "ไฟแดงที่ตู้แจ้งเตือน alarm กรุณาหยุดปั๊มน้ำทันที"
                    : "The cabinet red alarm is active. Stop the pump immediately."}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button
                  variant="destructive"
                  className="h-14 min-w-52 text-base font-black shadow-lg shadow-red-900/20"
                  onClick={handleStopCabinetAlarm}
                >
                  {isTH ? "หยุดปั๊มน้ำ" : "Stop Water Pump"}
                </Button>
                <Button
                  variant="outline"
                  className="h-14 min-w-52 border-red-500/50 bg-red-50 text-base font-bold text-red-700 hover:bg-red-100"
                  onClick={handleEmergencyCabinetAlarm}
                >
                  {isTH ? "หยุดฉุกเฉิน" : "Emergency Stop"}
                </Button>
              </div>
              <p className="mt-5 text-xs font-medium text-slate-500">
                {isTH ? "หน้าต่างนี้จะหายไปเมื่อกดหยุด หรือเมื่อไฟแดงกลับสู่สถานะปกติ" : "This alert clears when stopped or when the red alarm returns to normal."}
              </p>
            </div>
            <div className="bg-[repeating-linear-gradient(115deg,#facc15_0_24px,#020617_24px_48px)] px-6 py-4" />
          </div>
        </div>
      )}

      <header className="border-b border-border bg-card/70 px-4 py-5 backdrop-blur-sm md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Activity className="h-6 w-6 text-emerald-500" />
              {isTH ? "มอนิเตอร์อุปกรณ์จริง" : "Live Device Monitor"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isTH ? "อ่านค่าจริงจาก ESP32 ผ่าน MQTT" : "Live telemetry from the ESP32 over MQTT"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {deviceLabel}
              </Badge>
              <Badge variant="outline" className={mqttStatus === "connected" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"}>
                <Wifi className="mr-1 h-3 w-3" />
                {mqttStatus === "connected" ? (isTH ? "MQTT เชื่อมต่อ" : "MQTT Connected") : (isTH ? "MQTT ไม่เชื่อมต่อ" : "MQTT Disconnected")}
              </Badge>
              <Badge variant="outline" className="border-border bg-background/70 text-muted-foreground">
                {isTH ? "อัปเดตล่าสุด" : "Last update"}: {liveLastUpdate}
              </Badge>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={() => toast.info(isTH ? "ข้อมูลจะอัปเดตอัตโนมัติเมื่อบอร์ดส่ง MQTT" : "Data updates automatically when MQTT telemetry arrives")}>
            <Download className="h-4 w-4" />
            {isTH ? "สถานะสด" : "Live"}
          </Button>
        </div>
      </header>

      <main className="relative z-10 flex-1 overflow-auto p-4 md:p-8">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{isTH ? "ค่า pH" : "pH"}</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{boardConnected ? phValue.toFixed(2) : "--"}</p>
              <Badge variant="outline" className={boardConnected && phOk ? "mt-3 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : boardConnected ? "mt-3 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" : "mt-3 border-border bg-muted text-muted-foreground"}>
                {!boardConnected ? (isTH ? "ไม่มีสัญญาณ" : "No signal") : phOk ? (isTH ? "อยู่ในช่วง" : "OK") : (isTH ? "นอกช่วง" : "Out of range")}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{isTH ? "ค่า EC" : "EC"}</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{boardConnected ? ecValue.toFixed(2) : "--"}</p>
              <p className="mt-1 text-xs text-muted-foreground">mS/cm</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{isTH ? "อุณหภูมิ" : "Temperature"}</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{boardConnected ? tempValue.toFixed(1) : "--"}</p>
              <p className="mt-1 text-xs text-muted-foreground">°C</p>
            </CardContent>
          </Card>
        </div>

        <ExportFiltersCard
          startDate={exportStart}
          endDate={exportEnd}
          onStartDateChange={setExportStart}
            onEndDateChange={setExportEnd}
            month={exportMonth}
            startTime={exportStartTime}
            endTime={exportEndTime}
            onMonthChange={setExportMonth}
            onStartTimeChange={setExportStartTime}
            onEndTimeChange={setExportEndTime}
            title={isTH ? "ส่งออกข้อมูลจริง" : "Export Live Data"}
          description={isTH ? "ดาวน์โหลดสถานะล่าสุดและประวัติที่บันทึกจาก MQTT" : "Download current status and saved MQTT history"}
          locale={isTH ? "TH" : "EN"}
          startDateLabel={isTH ? "วันที่เริ่มต้น" : "Start Date"}
          endDateLabel={isTH ? "วันที่สิ้นสุด" : "End Date"}
          options={dataTypeOptions}
          selectedKeys={selectedDataTypes}
          onToggleKey={(key) =>
            setSelectedDataTypes((prev) =>
              prev.includes(key) ? prev.filter((v) => v !== key) : [...prev, key]
            )
          }
          onDownloadCsv={() => handleExport("csv")}
          onDownloadPdf={() => handleExport("pdf")}
          downloadCsvLabel={isTH ? "ดาวน์โหลด CSV" : "Download CSV"}
          downloadPdfLabel={isTH ? "ดาวน์โหลด PDF" : "Download PDF"}
        />

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={isTH ? "ค้นหาอุปกรณ์จริง..." : "Search live devices..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              {stableLiveRows.filter((d) => d.status === "Active").length} {isTH ? "ปกติ" : "Active"}
            </Badge>
            <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400">
              {stableLiveRows.filter((d) => d.status === "Alarm").length} {isTH ? "แจ้งเตือน" : "Alarm"}
            </Badge>
          </div>
        </div>

        {cabinetAlarmActive && !dismissedCabinetAlarm && (
          <div className="mb-6 overflow-hidden rounded-xl border border-red-500/40 bg-red-500/10 shadow-lg shadow-red-950/10">
            <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-red-500 text-white shadow-lg shadow-red-500/25">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-bold text-red-700 dark:text-red-200">
                    {isTH ? "แจ้งเตือน: ไฟแดงที่ตู้กำลังทำงาน" : "Alert: Cabinet red alarm is active"}
                  </p>
                  <p className="mt-1 text-sm text-red-700/80 dark:text-red-200/80">
                    {isTH
                      ? "ควรหยุดปั๊มทันที และรับทราบ alarm เพื่อปิดสัญญาณเตือนหน้าตู้"
                      : "Stop the pump now and acknowledge the alarm to silence the cabinet warning."}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="destructive"
                  className="h-11 min-w-36 font-semibold"
                  onClick={handleStopCabinetAlarm}
                >
                  {isTH ? "หยุดปั๊ม 2" : "Stop Pump 2"}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 min-w-36 border-red-500/40 bg-background/80 font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-200"
                  onClick={handleEmergencyCabinetAlarm}
                >
                  {isTH ? "หยุดฉุกเฉิน" : "Emergency Stop"}
                </Button>
              </div>
            </div>
          </div>
        )}

        <Card className="rounded-lg border border-border bg-card/60 shadow-sm">
          <CardHeader>
            <CardTitle>{isTH ? "รายการสถานะจากบอร์ด" : "Board Telemetry List"}</CardTitle>
            <CardDescription>
              {isTH ? `แสดง ${filteredData.length} รายการจากข้อมูลจริง` : `Showing ${filteredData.length} live records`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{isTH ? "ชื่อ" : "Name"}</TableHead>
                    <TableHead>{isTH ? "ประเภท" : "Type"}</TableHead>
                    <TableHead>{isTH ? "สถานะ" : "Status"}</TableHead>
                    <TableHead>{isTH ? "ค่าปัจจุบัน" : "Current Value"}</TableHead>
                    <TableHead>{isTH ? "อัปเดต" : "Updated"}</TableHead>
                    <TableHead className="text-right">{isTH ? "ดู" : "View"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((device) => (
                    <TableRow key={device.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-muted p-2 text-emerald-600 dark:text-emerald-400">
                            <device.icon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{device.name}</p>
                            <p className="text-xs text-muted-foreground">{device.category}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{device.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusClass(device.status)}>
                          {device.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-foreground">{device.value}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{device.lastUpdate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedDevice(device)}>
                          <Activity className="mr-2 h-4 w-4" />
                          {isTH ? "ข้อมูล" : "Data"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.35fr]">
          <Card className="rounded-lg border border-border bg-card/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                {isTH ? "สถานะขาจริงและรีเลย์" : "Live Pin & Relay Status"}
              </CardTitle>
              <CardDescription>
                {isTH ? "ดูง่ายว่าแต่ละขา/อุปกรณ์กำลัง ON, OFF หรือแจ้งเตือน" : "Quick view of every input, output, and alarm state"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {processCards.map((item) => (
                  <div key={item.label} className={`rounded-xl border p-3 ${cardToneClass(item.tone)}`}>
                    <p className="text-xs font-medium opacity-80">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border border-border bg-card/60 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-500" />
                {isTH ? "แนวโน้มค่าล่าสุด" : "Latest Value Trend"}
              </CardTitle>
              <CardDescription>
                {isTH ? "กราฟย่อจากข้อมูล MQTT ล่าสุด ใช้ดูว่าค่าวิ่งอยู่ตลอดไหม" : "Mini trend from recent MQTT telemetry"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {trendHistory.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  {isTH ? "ยังไม่มีประวัติจาก MQTT" : "No MQTT history yet"}
                </div>
              ) : (
                <div className="space-y-4">
                  {[
                    { key: "ph", label: isTH ? "pH" : "pH", color: "bg-emerald-500", getValue: (row: typeof trendHistory[number]) => row.phValue, max: 14 },
                    { key: "ec", label: isTH ? "EC" : "EC", color: "bg-sky-500", getValue: (row: typeof trendHistory[number]) => row.ecValue, max: 5 },
                    { key: "temp", label: isTH ? "Temp" : "Temp", color: "bg-amber-500", getValue: (row: typeof trendHistory[number]) => row.tempValue, max: 50 },
                  ].map((metric) => (
                    <div key={metric.key}>
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{metric.label}</span>
                        <span>{formatTelemetryTime(trendHistory[trendHistory.length - 1]?.timestamp || "", locale)}</span>
                      </div>
                      <div className="flex h-20 items-end gap-2 rounded-xl border border-border bg-muted/30 p-3">
                        {trendHistory.map((row) => {
                          const value = metric.getValue(row);
                          const height = Math.max(8, Math.min(100, (value / metric.max) * 100));
                          return (
                            <div key={`${metric.key}-${row.timestamp}`} className="flex min-w-4 flex-1 flex-col items-center justify-end gap-1">
                              <div
                                className={`w-full rounded-t-md ${metric.color}`}
                                style={{ height: `${height}%` }}
                                title={`${metric.label}: ${value.toFixed(2)} (${formatTelemetryTime(row.timestamp, locale)})`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 rounded-lg border border-border bg-card/60 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock3 className="h-5 w-5 text-emerald-500" />
                  {isTH ? "ประวัติข้อมูลทุกวัน" : "All-Day Telemetry Log"}
                </CardTitle>
                <CardDescription>
                  {isTH
                    ? `แสดง log ทุก packet ที่รับจากเซ็นเซอร์ ตอนนี้พบ ${historyForSelectedDate.length} รายการ จากทั้งหมด ${historyDates.length} วัน`
                    : `Shows every received sensor packet. Showing ${historyForSelectedDate.length} records across ${historyDates.length} days.`}
                </CardDescription>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/70 p-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  size="sm"
                  variant={historyDateMode === "all" ? "default" : "outline"}
                  onClick={() => setHistoryDateMode("all")}
                >
                  {isTH ? "ทุกวัน" : "All Days"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={historyDateMode === "latest" ? "default" : "outline"}
                  onClick={() => setHistoryDateMode("latest")}
                >
                  {isTH ? "วันล่าสุด" : "Latest Day"}
                </Button>
                <MinimalDatePicker
                  value={activeHistoryDate === "all" ? "" : activeHistoryDate}
                  onChange={(value) => setHistoryDateMode(value || "all")}
                  ariaLabel={isTH ? "เลือกวันที่ประวัติ" : "Select history date"}
                  locale={isTH ? "TH" : "EN"}
                  className="w-full sm:w-44"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{isTH ? "รอบข้อมูล" : "Data Cycle"}</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {activeHistoryDate === "all" ? (isTH ? "ทุกวันที่บันทึก" : "All saved days") : formatTelemetryDateLabel(activeHistoryDate, locale)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{isTH ? "ข้อมูลใหม่สุด" : "Newest Record"}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">{newestHistoryAt ? formatTelemetryDateTime(newestHistoryAt, locale) : "-"}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{isTH ? "ข้อมูลเก่าสุดที่เก็บไว้" : "Oldest Saved Record"}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">{oldestHistoryAt ? formatTelemetryDateTime(oldestHistoryAt, locale) : "-"}</p>
              </div>
            </div>

            {historyForSelectedDate.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="font-medium text-foreground">{isTH ? "ไม่พบข้อมูลย้อนหลังในบัญชี/อุปกรณ์นี้" : "No saved telemetry for this account/device"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isTH ? "ถ้ามีข้อมูลเก่าในฐาน ตารางจะแสดงได้แม้บอร์ดไม่ได้ออนไลน์" : "Saved rows can be shown even when the board is offline."}
                </p>
              </div>
            ) : (
              <div className="max-h-[620px] overflow-auto rounded-xl border border-border">
                <Table>
                  <TableHeader className="sticky top-0 z-20 bg-emerald-600 text-white shadow-sm">
                    <TableRow>
                      <TableHead className="min-w-36 text-white">{isTH ? "เวลา" : "Time"}</TableHead>
                      <TableHead className="min-w-24 text-white">pH</TableHead>
                      <TableHead className="min-w-24 text-white">EC</TableHead>
                      <TableHead className="min-w-28 text-white">{isTH ? "อุณหภูมิ" : "Temp"}</TableHead>
                      <TableHead className="min-w-24 text-white">WLS1</TableHead>
                      <TableHead className="min-w-24 text-white">WLS2</TableHead>
                      <TableHead className="min-w-28 text-white">{isTH ? "ลูกลอย" : "Float"}</TableHead>
                      <TableHead className="min-w-28 text-white">{isTH ? "ล็อค" : "Lock"}</TableHead>
                      <TableHead className="min-w-28 text-white">{isTH ? "ปั๊ม 1" : "Pump 1"}</TableHead>
                      <TableHead className="min-w-28 text-white">{isTH ? "ปั๊ม 2" : "Pump 2"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedHistory.map((group) => (
                      <Fragment key={group.date}>
                        <TableRow key={`day-${group.date}`} className="bg-emerald-50/80 hover:bg-emerald-50/80 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/30">
                          <TableCell colSpan={10} className="font-semibold text-emerald-700 dark:text-emerald-300">
                            {isTH ? "รอบวันที่" : "Daily Cycle"} {formatTelemetryDateLabel(group.date, locale)} · {group.rows.length} {isTH ? "รายการ" : "records"}
                          </TableCell>
                        </TableRow>
                        {group.rows.map((row) => (
                          <TableRow key={`${row.timestamp}-${row.phValue}-${row.ecValue}`}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{formatTelemetryTime(row.timestamp, locale)}</TableCell>
                            <TableCell className="font-mono">{row.phValue.toFixed(2)}</TableCell>
                            <TableCell className="font-mono">{row.ecValue.toFixed(2)}</TableCell>
                            <TableCell className="font-mono">{row.tempValue.toFixed(1)} °C</TableCell>
                            <TableCell>{row.wls1 ? "ON" : "OFF"}</TableCell>
                            <TableCell>{row.wls2 ? "ON" : "OFF"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={row.floatAlarm ? statusClass("Alarm") : statusClass("Active")}>
                                {row.floatAlarm ? (isTH ? "เตือน" : "Alarm") : (isTH ? "ปกติ" : "OK")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={row.locked ? statusClass("Alarm") : statusClass("Active")}>
                                {row.locked ? (isTH ? "ล็อค" : "Locked") : (isTH ? "พร้อม" : "Ready")}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.pump1On ? "ON" : "OFF"}</TableCell>
                            <TableCell>{row.pump2On ? "ON" : "OFF"}</TableCell>
                          </TableRow>
                        ))}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        <DialogContent className="bg-card text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-500" />
              {selectedDevice?.name}
            </DialogTitle>
            <DialogDescription>
              {isTH ? "ข้อมูลนี้มาจาก MQTT ของบอร์ด ESP32" : "This value comes from ESP32 MQTT telemetry"}
            </DialogDescription>
          </DialogHeader>

          {selectedDevice && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">{isTH ? "ค่าปัจจุบัน" : "Current Reading"}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{selectedDevice.value}</p>
                <Badge variant="outline" className={`mt-3 ${statusClass(selectedDevice.status)}`}>
                  {selectedDevice.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{isTH ? "ประเภท" : "Type"}</p>
                  <p className="mt-1 font-semibold text-foreground">{selectedDevice.type}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">{isTH ? "หมวดหมู่" : "Category"}</p>
                  <p className="mt-1 font-semibold text-foreground">{selectedDevice.category}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{isTH ? "อัปเดตล่าสุด" : "Last Update"}</p>
                <p className="mt-1 font-mono text-sm text-foreground">{selectedDevice.lastUpdate}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
