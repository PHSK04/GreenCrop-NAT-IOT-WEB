import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { ExportFiltersCard } from "@/components/ExportFiltersCard";
import { 
  Search, 
  Filter, 
  Lightbulb, 
  Zap, 
  Droplets, 
  Activity, 
  Gauge, 
  CheckCircle2, 
  RefreshCw,
  Power,
  Eye,
  BarChart3,
  Download,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import { downloadSimplePdf, downloadTextFile } from "@/utils/download";
import { useDeviceSeed } from "@/hooks/useActiveDeviceId";
import { seededNumber } from "@/utils/deviceData";

const initialDeviceData = [
  {
    id: 1,
    name: "LED Grow Light",
    type: "Actuator",
    category: "Lighting",
    status: "Active",
    value: "85% Intensity",
    lastUpdate: "Just now",
    icon: Lightbulb,
    color: "text-amber-500 dark:text-amber-400"
  },
  {
    id: 2,
    name: "UV Germicidal Irradiation",
    type: "Actuator",
    category: "Sterilization",
    status: "Active",
    value: "Running",
    lastUpdate: "Just now",
    icon: Zap,
    color: "text-purple-600 dark:text-purple-400"
  },
  {
    id: 3,
    name: "RO System",
    type: "System",
    category: "Water Treatment",
    status: "Standby",
    value: "Tank Full",
    lastUpdate: "5 mins ago",
    icon: Droplets,
    color: "text-blue-600 dark:text-blue-400"
  },
  {
    id: 4,
    name: "Water Level Sensor",
    type: "Sensor",
    category: "Monitoring",
    status: "Active",
    value: "82% Level",
    lastUpdate: "10 sec ago",
    icon: Gauge,
    color: "text-cyan-600 dark:text-cyan-400"
  },
  {
    id: 5,
    name: "Electrical Conductivity (EC)",
    type: "Sensor",
    category: "Quality",
    status: "Active",
    value: "1.8 mS/cm",
    lastUpdate: "Just now",
    icon: Activity,
    color: "text-emerald-600 dark:text-emerald-400"
  },
  {
    id: 6,
    name: "Dissolved Oxygen (DO)",
    type: "Sensor",
    category: "Quality",
    status: "Active",
    value: "6.8 mg/L",
    lastUpdate: "Just now",
    icon: Activity,
    color: "text-emerald-600 dark:text-emerald-400"
  },
  {
    id: 7,
    name: "pH Sensor",
    type: "Sensor",
    category: "Quality",
    status: "Active",
    value: "7.2 pH",
    lastUpdate: "Just now",
    icon: Activity,
    color: "text-emerald-600 dark:text-emerald-400"
  },
  {
    id: 8,
    name: "Temperature Sensor",
    type: "Sensor",
    category: "Monitoring",
    status: "Active",
    value: "28.5 °C",
    lastUpdate: "Just now",
    icon: Activity,
    color: "text-amber-500 dark:text-amber-400"
  }
];

type DeviceMonitorPageProps = {
  language?: string;
};

export function DeviceMonitorPage({ language = "TH" }: DeviceMonitorPageProps) {
  const { deviceId, seed } = useDeviceSeed();
  const isTH = language === "TH";
  const deviceLabel = deviceId ? `${isTH ? "อุปกรณ์" : "Device"} ${deviceId}` : (isTH ? "ทุกอุปกรณ์" : "All Devices");

  const seededDeviceData = useMemo(() => {
    return initialDeviceData.map((device, index) => {
      const label = device.name.toLowerCase();
      let nextValue = device.value;
      if (label.includes("ec")) {
        nextValue = `${seededNumber(1.8, seed, index, 0.05, 1.0, 2.4, 2)} mS/cm`;
      } else if (label.includes("oxygen")) {
        nextValue = `${seededNumber(6.8, seed, index, 0.07, 5.5, 8.6, 2)} mg/L`;
      } else if (label.includes("ph")) {
        nextValue = `${seededNumber(7.2, seed, index, 0.05, 6.4, 7.8, 2)} pH`;
      } else if (label.includes("temperature")) {
        nextValue = `${seededNumber(28.5, seed, index, 0.2, 22.0, 29.0, 1)} °C`;
      } else if (label.includes("water level")) {
        nextValue = `${seededNumber(82, seed, index, 2, 60, 95, 0)}% Level`;
      } else if (label.includes("led")) {
        nextValue = `${seededNumber(85, seed, index, 3, 60, 100, 0)}% Intensity`;
      }
      return { ...device, value: nextValue };
    });
  }, [seed]);

  const [devices, setDevices] = useState(seededDeviceData);
  const [selectedDevices, setSelectedDevices] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDevice, setSelectedDevice] = useState<typeof initialDeviceData[0] | null>(null);
  const [exportStart, setExportStart] = useState("");
  const [exportEnd, setExportEnd] = useState("");
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([
    "Sensor",
    "Actuator",
    "System",
  ]);

  const dataTypeOptions = [
    { key: "Sensor", label: isTH ? "เซนเซอร์" : "Sensor" },
    { key: "Actuator", label: isTH ? "แอคชูเอเตอร์" : "Actuator" },
    { key: "System", label: isTH ? "ระบบ" : "System" },
  ];

  useEffect(() => {
    setDevices(seededDeviceData);
    setSelectedDevices([]);
    setSelectedDevice(null);
  }, [seededDeviceData]);

  const handleSelectAll = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map(d => d.id));
    }
  };

  const handleSelectDevice = (id: number) => {
    setSelectedDevices(prev => 
      prev.includes(id) 
        ? prev.filter(d => d !== id)
        : [...prev, id]
    );
  };

  const toggleDeviceStatus = (id: number) => {
    setDevices(prevDevices => prevDevices.map(device => {
      if (device.id === id) {
        const newStatus = device.status === "Active" ? "Standby" : "Active";
        const isActive = newStatus === "Active";
        
        let newValue = device.value;
        if (device.name.includes("LED")) newValue = isActive ? "85% Intensity" : "OFF";
        else if (device.name.includes("UV")) newValue = isActive ? "Running" : "OFF";
        else if (device.name.includes("RO")) newValue = isActive ? "Filtering" : "Standby";

        toast(isActive ? `${device.name} Activated` : `${device.name} Deactivated`, {
          description: `Device status changed to ${newStatus}`,
          icon: isActive ? <CheckCircle2 className="w-4 h-4 text-emerald-500"/> : <Power className="w-4 h-4 text-muted-foreground"/>
        });

        return { ...device, status: newStatus, value: newValue, lastUpdate: "Just now" };
      }
      return device;
    }));
  };

  const filteredData = devices.filter(item =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const buildExportPayload = () => {
    const lines: string[] = [];
    lines.push(isTH ? "รายงาน, สถานะอัจฉริยะของเซนเซอร์" : "Report, Sensor Intelligence");
    if (exportStart || exportEnd) {
      lines.push(`${isTH ? "ช่วงวันที่" : "Date Range"}, ${exportStart || "-"} to ${exportEnd || "-"}`);
    }
    lines.push(`${isTH ? "ประเภทที่เลือก" : "Selected Types"}, ${selectedDataTypes.join(" | ") || "-"}`);
    lines.push("");

    lines.push("id,name,type,category,status,value,lastUpdate");
    devices
      .filter((d) => selectedDataTypes.includes(d.type))
      .forEach((d) => {
        lines.push(`${d.id},${d.name},${d.type},${d.category},${d.status},${d.value},${d.lastUpdate}`);
      });

    return lines.join("\n");
  };

  const handleExport = async (format: "csv" | "pdf") => {
    try {
      if (selectedDataTypes.length === 0) {
        toast.error(isTH ? "ส่งออกล้มเหลว" : "Export Failed", { description: isTH ? "กรุณาเลือกอย่างน้อย 1 ประเภทข้อมูล" : "Please select at least one data type." });
        return;
      }
      const payload = buildExportPayload();
      const filename = `sensor_intelligence.${format}`;
      if (format === "pdf") {
        await downloadSimplePdf(filename, payload);
      } else {
        downloadTextFile(filename, payload, "text/csv;charset=utf-8");
      }
      toast.success(isTH ? "ส่งออกสำเร็จ" : "Export Successful", {
        description: isTH ? `ดาวน์โหลด ${filename}` : `Downloaded ${filename}`
      });
    } catch {
      toast.error(isTH ? "ส่งออกล้มเหลว" : "Export Failed", {
        description: isTH ? "ไม่สามารถสร้างไฟล์ได้" : "Could not generate export file."
      });
    }
  };

  return (
    <>
      <header className="bg-card/50 border-b border-border px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-500" />
              {isTH ? "ระบบอัจฉริยะเซนเซอร์" : "Sensor Intelligence"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isTH ? "สถานะเรียลไทม์ของเซนเซอร์และแอคชูเอเตอร์" : "Real-time AI status of sensors and actuators"}
            </p>
            <div className="mt-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40">
                {deviceLabel}
              </Badge>
            </div>
          </div>
          <Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0">
            <RefreshCw className="w-4 h-4" />
            {isTH ? "รีเฟรชสถานะ" : "Refresh Status"}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 relative z-10">
        <ExportFiltersCard
          startDate={exportStart}
          endDate={exportEnd}
          onStartDateChange={setExportStart}
          onEndDateChange={setExportEnd}
          title={isTH ? "ตัวกรองสำหรับส่งออก" : "Export Filters"}
          description={isTH ? "เลือกช่วงวันที่และประเภทข้อมูลเพื่อดาวน์โหลด CSV/PDF" : "Select date range and data types to download CSV/PDF"}
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

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="relative w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={isTH ? "ค้นหาอุปกรณ์..." : "Search devices..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-emerald-500/50"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2 border-border bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground">
              <Filter className="w-4 h-4" />
              {isTH ? "กรองตามประเภท" : "Filter by Type"}
            </Button>
          </div>
          {selectedDevices.length > 0 && (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-secondary">
                {isTH ? `${selectedDevices.length} รายการ` : `${selectedDevices.length} selected`}
              </Badge>
              <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:bg-muted">
                {isTH ? "ตรวจสอบระบบ" : "Run Diagnostics"}
              </Button>
            </div>
          )}
        </div>

        <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Connected Peripherals</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Monitoring {filteredData.length} devices across the network
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  {devices.filter(d => d.status === "Active").length} Online
                </Badge>
                <Badge variant="outline" className="border-border text-muted-foreground">
                  {devices.filter(d => d.status !== "Active").length} Standby
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-muted/50">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedDevices.length === devices.length}
                        onCheckedChange={handleSelectAll}
                        className="border-muted-foreground data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Device Name</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Category</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Current Value</TableHead>
                    <TableHead className="font-semibold text-muted-foreground">Last Update</TableHead>
                    <TableHead className="font-semibold text-muted-foreground text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((device) => (
                    <TableRow 
                      key={device.id}
                      className="border-border hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedDevices.includes(device.id)}
                          onCheckedChange={() => handleSelectDevice(device.id)}
                          className="border-muted-foreground data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg bg-muted ${device.status === "Active" ? device.color : "text-muted-foreground"}`}>
                             <device.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{device.name}</p>
                            <p className="text-xs text-muted-foreground">{device.type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-secondary text-secondary-foreground border border-border">
                          {device.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                           {device.status === "Active" ? (
                             <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                           ) : (
                             <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                           )}
                           <span className={`text-sm font-medium ${
                             device.status === "Active" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                           }`}>
                             {device.status}
                           </span>
                        </div>
                      </TableCell>
                      <TableCell>
                         <span className="text-sm font-mono text-foreground">
                           {device.value}
                         </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{device.lastUpdate}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        {device.type === "Actuator" ? (
                          <div className="flex justify-end pr-2">
                            <Switch 
                              checked={device.status === "Active"} 
                              onCheckedChange={() => toggleDeviceStatus(device.id)}
                              className="data-[state=checked]:bg-emerald-600" 
                            />
                          </div>
                        ) : (
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             onClick={() => setSelectedDevice(device)}
                             className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10 gap-2 h-8"
                           >
                             <Eye className="w-4 h-4" />
                             <span className="sr-only sm:not-sr-only">Data</span>
                           </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Activity className="w-5 h-5 text-emerald-500" />
              Sensor Data Analysis
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Real-time telemetry from {selectedDevice?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDevice && (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border">
                 <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl bg-card ${selectedDevice.color}`}>
                       <selectedDevice.icon className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-sm text-muted-foreground">Current Reading</p>
                       <p className="text-2xl font-bold text-foreground">{selectedDevice.value}</p>
                    </div>
                 </div>
                 <Badge variant="outline" className={`
                    ${selectedDevice.status === "Active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"}
                  `}>
                    {selectedDevice.status}
                 </Badge>
              </div>

              <div className="space-y-3">
                 <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    24h Performance Trend
                 </h4>
                 {/* Simulated Chart Placeholder */}
                 <div className="h-32 w-full bg-muted/30 rounded-lg border border-border relative overflow-hidden flex items-end justify-between px-2 pb-2 gap-1 pointer-events-none">
                    {[40, 65, 55, 80, 75, 90, 85, 95, 88, 70, 60, 75, 40, 65, 55, 80, 75, 90, 85, 95].map((h, i) => (
                       <div key={i} className={`w-full bg-gradient-to-t ${selectedDevice.status === "Active" ? "from-emerald-500/20 to-emerald-500/80" : "from-slate-500/20 to-slate-500/50"} rounded-t-sm transition-all duration-500`} style={{ height: `${h}%` }}></div>
                    ))}
                 </div>
                 <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>00:00</span>
                    <span>06:00</span>
                    <span>12:00</span>
                    <span>18:00</span>
                    <span>Now</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Stability Score</p>
                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">98.5%</p>
                 </div>
                 <div className="p-3 bg-muted/30 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">Signal Strength</p>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">-42 dBm</p>
                 </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSelectedDevice(null)} className="text-muted-foreground hover:text-foreground">Close</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Export Log</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
