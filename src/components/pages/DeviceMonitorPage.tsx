import { Fragment, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Download, Gauge, Search, Thermometer, Waves, Wifi } from "lucide-react";
import { toast } from "sonner";
import { ExportFiltersCard } from "@/components/ExportFiltersCard";
import { useDeviceSeed } from "@/hooks/useActiveDeviceId";
import { downloadSimplePdf, downloadTextFile } from "@/utils/download";
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

const formatTimestamp = (value: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const statusClass = (status: LiveDeviceRow["status"]) => {
  if (status === "Alarm") return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400";
  if (status === "Active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  return "border-border bg-muted text-muted-foreground";
};

const formatCompactTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value || "-";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

const formatDateKey = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateLabel = (value: string, isTH: boolean) => {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(isTH ? "th-TH" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const boolText = (value: boolean, isTH: boolean) => {
  if (value) return isTH ? "ทำงาน/พบสัญญาณ" : "ON / Detected";
  return isTH ? "หยุด/ไม่พบสัญญาณ" : "OFF / Not detected";
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
    telemetryHistory,
  } = useMachine();

  const isTH = language === "TH";
  const deviceLabel = deviceId ? `${isTH ? "อุปกรณ์" : "Device"} ${deviceId}` : isTH ? "ทุกอุปกรณ์" : "All Devices";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<LiveDeviceRow | null>(null);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(["Sensor", "Actuator", "System"]);
  const [historyDateMode, setHistoryDateMode] = useState<"latest" | "all" | string>("latest");

  const lastUpdate = formatTimestamp(lastTelemetryAt);

  const liveRows = useMemo<LiveDeviceRow[]>(
    () => [
      {
        id: "ph",
        name: isTH ? "เซนเซอร์ pH" : "pH Sensor",
        type: "Sensor",
        category: isTH ? "คุณภาพน้ำ" : "Water Quality",
        status: phOk ? "Active" : "Alarm",
        value: `${phValue.toFixed(2)} pH`,
        lastUpdate,
        icon: Gauge,
      },
      {
        id: "ec",
        name: isTH ? "เซนเซอร์ EC" : "EC Sensor",
        type: "Sensor",
        category: isTH ? "คุณภาพน้ำ" : "Water Quality",
        status: ecValue > 0 ? "Active" : "Standby",
        value: `${ecValue.toFixed(2)} mS/cm`,
        lastUpdate,
        icon: Waves,
      },
      {
        id: "temp",
        name: isTH ? "เซนเซอร์อุณหภูมิ" : "Temperature Sensor",
        type: "Sensor",
        category: isTH ? "อุณหภูมิน้ำ" : "Water Temperature",
        status: tempValue > 0 ? "Active" : "Standby",
        value: `${tempValue.toFixed(1)} °C`,
        lastUpdate,
        icon: Thermometer,
      },
      {
        id: "wls1",
        name: isTH ? "WLS1 ระดับล่าง" : "WLS1 Lower Level",
        type: "Sensor",
        category: isTH ? "ระดับน้ำ" : "Water Level",
        status: wls1 ? "Active" : "Standby",
        value: wls1 ? (isTH ? "ตรวจพบน้ำ" : "Water detected") : (isTH ? "ยังไม่ถึงระดับ" : "Not reached"),
        lastUpdate,
        icon: Waves,
      },
      {
        id: "wls2",
        name: isTH ? "WLS2 ระดับบน" : "WLS2 Upper Level",
        type: "Sensor",
        category: isTH ? "ระดับน้ำ" : "Water Level",
        status: wls2 ? "Active" : "Standby",
        value: wls2 ? (isTH ? "น้ำเต็มระดับ" : "Target reached") : (isTH ? "กำลังรอ" : "Waiting"),
        lastUpdate,
        icon: Waves,
      },
      {
        id: "float",
        name: isTH ? "ลูกลอยถัง 2" : "Tank 2 Float Switch",
        type: "Sensor",
        category: isTH ? "แจ้งเตือน" : "Alarm",
        status: floatAlarm ? "Alarm" : "Active",
        value: floatAlarm ? (isTH ? "แจ้งเตือน" : "Alarm") : (isTH ? "ปกติ" : "Normal"),
        lastUpdate,
        icon: AlertTriangle,
      },
      {
        id: "pump1",
        name: isTH ? "ปั๊ม 1 อัตโนมัติ" : "Pump 1 Auto",
        type: "Actuator",
        category: isTH ? "ปั๊ม" : "Pump",
        status: pump1On ? "Active" : "Standby",
        value: pump1On ? (isTH ? "กำลังทำงาน" : "Running") : (isTH ? "หยุด" : "Stopped"),
        lastUpdate,
        icon: Activity,
      },
      {
        id: "pump2",
        name: isTH ? "ปั๊ม 2 กดมือ/เว็บ" : "Pump 2 Manual/Web",
        type: "Actuator",
        category: isTH ? "ปั๊ม" : "Pump",
        status: pump2On ? "Active" : "Standby",
        value: pump2On ? (isTH ? "กำลังทำงาน" : "Running") : (isTH ? "หยุด" : "Stopped"),
        lastUpdate,
        icon: Activity,
      },
      {
        id: "lock",
        name: isTH ? "สถานะล็อคระบบ" : "System Lock",
        type: "System",
        category: isTH ? "ความปลอดภัย" : "Safety",
        status: locked ? "Alarm" : "Active",
        value: locked ? (isTH ? "ล็อคฉุกเฉิน" : "Emergency locked") : (isTH ? "พร้อมทำงาน" : "Ready"),
        lastUpdate,
        icon: AlertTriangle,
      },
      {
        id: "lamp",
        name: isTH ? "ไฟสถานะ" : "Status Lamps",
        type: "System",
        category: isTH ? "ไฟแสดงผล" : "Indicator",
        status: redOn ? "Alarm" : greenOn ? "Active" : "Standby",
        value: redOn ? (isTH ? "ไฟแดง" : "Red lamp") : greenOn ? (isTH ? "ไฟเขียว" : "Green lamp") : "-",
        lastUpdate,
        icon: CheckCircle2,
      },
    ],
    [ecValue, floatAlarm, greenOn, isTH, lastUpdate, locked, phOk, phValue, pump1On, pump2On, redOn, tempValue, wls1, wls2],
  );

  const dataTypeOptions = [
    { key: "Sensor", label: isTH ? "เซนเซอร์" : "Sensor" },
    { key: "Actuator", label: isTH ? "แอคชูเอเตอร์" : "Actuator" },
    { key: "System", label: isTH ? "ระบบ" : "System" },
  ];

  const filteredData = liveRows.filter((item) => {
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
    const dates = telemetryHistory.map((row) => formatDateKey(row.timestamp)).filter(Boolean);
    return Array.from(new Set(dates));
  }, [telemetryHistory]);

  const activeHistoryDate = historyDateMode === "latest" ? historyDates[0] || "" : historyDateMode;
  const historyForSelectedDate = useMemo(() => {
    if (activeHistoryDate === "all") return telemetryHistory;
    if (!activeHistoryDate) return [];
    return telemetryHistory.filter((row) => formatDateKey(row.timestamp) === activeHistoryDate);
  }, [activeHistoryDate, telemetryHistory]);

  const groupedHistory = useMemo(() => {
    const groups: { date: string; rows: typeof telemetryHistory }[] = [];
    historyForSelectedDate.forEach((row) => {
      const date = formatDateKey(row.timestamp);
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

  const buildExportPayload = () => {
    const lines: string[] = [];
    lines.push(isTH ? "รายงานสถานะอุปกรณ์จริงจาก MQTT" : "Live MQTT Device Status Report");
    lines.push(`${isTH ? "อุปกรณ์" : "Device"}, ${deviceId || "-"}`);
    lines.push(`${isTH ? "อัปเดตล่าสุด" : "Last Update"}, ${lastUpdate}`);
    if (exportStart || exportEnd) {
      lines.push(`${isTH ? "ช่วงวันที่" : "Date Range"}, ${exportStart || "-"} to ${exportEnd || "-"}`);
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
    telemetryHistory.slice(0, 50).forEach((row) => {
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
                {isTH ? "อัปเดตล่าสุด" : "Last update"}: {lastUpdate}
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
              <p className="mt-2 text-3xl font-bold text-foreground">{phValue.toFixed(2)}</p>
              <Badge variant="outline" className={phOk ? "mt-3 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "mt-3 border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"}>
                {phOk ? (isTH ? "อยู่ในช่วง" : "OK") : (isTH ? "นอกช่วง" : "Out of range")}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{isTH ? "ค่า EC" : "EC"}</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{ecValue.toFixed(2)}</p>
              <p className="mt-1 text-xs text-muted-foreground">mS/cm</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{isTH ? "อุณหภูมิ" : "Temperature"}</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{tempValue.toFixed(1)}</p>
              <p className="mt-1 text-xs text-muted-foreground">°C</p>
            </CardContent>
          </Card>
        </div>

        <ExportFiltersCard
          startDate={exportStart}
          endDate={exportEnd}
          onStartDateChange={setExportStart}
          onEndDateChange={setExportEnd}
          title={isTH ? "ส่งออกข้อมูลจริง" : "Export Live Data"}
          description={isTH ? "ดาวน์โหลดสถานะล่าสุดและประวัติที่บันทึกจาก MQTT" : "Download current status and saved MQTT history"}
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
              {liveRows.filter((d) => d.status === "Active").length} {isTH ? "ปกติ" : "Active"}
            </Badge>
            <Badge variant="outline" className="border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400">
              {liveRows.filter((d) => d.status === "Alarm").length} {isTH ? "แจ้งเตือน" : "Alarm"}
            </Badge>
          </div>
        </div>

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
                        <span>{formatCompactTime(trendHistory[trendHistory.length - 1]?.timestamp || "")}</span>
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
                                title={`${metric.label}: ${value.toFixed(2)} (${formatCompactTime(row.timestamp)})`}
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
                  {isTH ? "ประวัติข้อมูลที่รันต่อเนื่อง" : "Continuous Telemetry Log"}
                </CardTitle>
                <CardDescription>
                  {isTH
                    ? `เลือกดูตามวันและเลื่อนดูข้อมูลเก่าได้ ตอนนี้พบ ${historyForSelectedDate.length} รายการ`
                    : `Filter by day and scroll older records. Showing ${historyForSelectedDate.length} records.`}
                </CardDescription>
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-border bg-background/70 p-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  size="sm"
                  variant={historyDateMode === "latest" ? "default" : "outline"}
                  onClick={() => setHistoryDateMode("latest")}
                >
                  {isTH ? "วันล่าสุด" : "Latest Day"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={historyDateMode === "all" ? "default" : "outline"}
                  onClick={() => setHistoryDateMode("all")}
                >
                  {isTH ? "ทุกวัน" : "All Days"}
                </Button>
                <MinimalDatePicker
                  value={activeHistoryDate === "all" ? "" : activeHistoryDate}
                  onChange={(value) => setHistoryDateMode(value || "latest")}
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
                  {activeHistoryDate === "all" ? (isTH ? "ทุกวัน" : "All days") : formatDateLabel(activeHistoryDate, isTH)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{isTH ? "ข้อมูลใหม่สุด" : "Newest Record"}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">{newestHistoryAt ? formatTimestamp(newestHistoryAt) : "-"}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{isTH ? "ข้อมูลเก่าสุดที่เก็บไว้" : "Oldest Saved Record"}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">{oldestHistoryAt ? formatTimestamp(oldestHistoryAt) : "-"}</p>
              </div>
            </div>

            {historyForSelectedDate.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <p className="font-medium text-foreground">{isTH ? "รอข้อมูลจาก ESP32" : "Waiting for ESP32 telemetry"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {isTH ? "เมื่อบอร์ดส่ง MQTT เข้ามา ตารางนี้จะเพิ่มข้อมูลอัตโนมัติ" : "Rows will appear automatically when MQTT messages arrive."}
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
                            {isTH ? "รอบวันที่" : "Daily Cycle"} {formatDateLabel(group.date, isTH)} · {group.rows.length} {isTH ? "รายการ" : "records"}
                          </TableCell>
                        </TableRow>
                        {group.rows.map((row) => (
                          <TableRow key={`${row.timestamp}-${row.phValue}-${row.ecValue}`}>
                            <TableCell className="font-mono text-xs text-muted-foreground">{formatCompactTime(row.timestamp)}</TableCell>
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
