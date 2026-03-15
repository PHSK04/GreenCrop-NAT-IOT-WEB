import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { 
  Settings, 
  Cpu, 
  Users, 
  Bell, 
  Save, 
  RefreshCw, 
  Power, 
  Zap, 
  Droplets, 
  Sun,
  Smartphone,
  Laptop,
  ArrowRight,
  Pencil,
  Trash2,
  Star
} from "lucide-react";
import { AdminDbDeviceRow } from "@/features/auth/services/authService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";

type FarmSettingsPageProps = {
  devices?: AdminDbDeviceRow[];
  onOpenDevicePairing?: () => void;
  onUpdateDevice?: (payload: { device_id: string; device_name?: string; location?: string }) => Promise<void> | void;
  onUnpairDevice?: (deviceId: string) => Promise<void> | void;
  onSetPrimary?: (deviceId: string) => Promise<void> | void;
  language?: string;
};

function formatDeviceTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export function FarmSettingsPage({
  devices = [],
  onOpenDevicePairing,
  onUpdateDevice,
  onUnpairDevice,
  onSetPrimary,
  language = "TH",
}: FarmSettingsPageProps) {
  const isTH = language === "TH";
  const [sessions, setSessions] = useState([
    { device: "MacBook Pro M4", type: "Web Dashboard", location: "Chiang Mai, TH", status: "Active Now", active: true },
    { device: "iPhone 15 Plus", type: "Mobile App", location: "Bangkok, TH", status: "Active 2m ago", active: true },
    { device: "iPad Air 6", type: "Field Monitor", location: "Farm Site A", status: "Active Now", active: true },
    { device: "MacBook Air M2", type: "Web Dashboard", location: "Phuket, TH", status: "Idle for 1h", active: false },
    { device: "iPhone 11", type: "Mobile App", location: "Chiang Rai, TH", status: "Last active yesterday", active: false },
    { device: "Notebook (Windows)", type: "Web Dashboard", location: "Office HQ", status: "Active Now", active: true },
    { device: "iPhone 14 Pro", type: "Mobile App", location: "Bangkok, TH", status: "Last active 5m ago", active: false },
  ]);

  const handleRevoke = (index: number) => {
    setSessions(sessions.filter((_, i) => i !== index));
  };

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<AdminDbDeviceRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [markPrimary, setMarkPrimary] = useState(false);
  const [savingDevice, setSavingDevice] = useState(false);

  const openEditDevice = (device: AdminDbDeviceRow) => {
    setEditingDevice(device);
    setEditName(device.device_name || "");
    setEditLocation(device.location || "");
    setMarkPrimary(Boolean(device.is_primary));
    setIsEditOpen(true);
  };

  const handleSaveDevice = async () => {
    if (!editingDevice?.device_id) return;
    setSavingDevice(true);
    try {
      if (onUpdateDevice) {
        await onUpdateDevice({
          device_id: editingDevice.device_id,
          device_name: editName.trim() || undefined,
          location: editLocation.trim() || undefined,
        });
      }
      if (markPrimary && onSetPrimary) {
        await onSetPrimary(editingDevice.device_id);
      }
      setIsEditOpen(false);
    } finally {
      setSavingDevice(false);
    }
  };

  const handleUnpairDevice = async () => {
    if (!editingDevice?.device_id || !onUnpairDevice) return;
    if (!confirm(`Unpair device ${editingDevice.device_id}?`)) return;
    await onUnpairDevice(editingDevice.device_id);
    setIsEditOpen(false);
  };

  const deviceSummary = useMemo(() => {
    const primary = devices.find((d) => d.is_primary);
    return {
      total: devices.length,
      primaryLabel: primary?.device_name || primary?.device_id || "-",
    };
  }, [devices]);

  return (
    <>
      <header className="bg-card/50 border-b border-border px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-6 h-6 text-muted-foreground" />
              {isTH ? "ตั้งค่าระบบฟาร์ม" : "System Configuration"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isTH ? "จัดการระบบอัตโนมัติ อุปกรณ์ และสิทธิ์ผู้ใช้" : "Manage farm automation, devices, and user access"}
            </p>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Save className="w-4 h-4" />
            {isTH ? "บันทึกการเปลี่ยนแปลง" : "Save Changes"}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 relative z-10">
        <Tabs defaultValue="automation" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 max-w-xl bg-muted border border-border">
            <TabsTrigger value="automation" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">{isTH ? "ระบบอัตโนมัติ" : "Automation"}</TabsTrigger>
            <TabsTrigger value="devices" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">{isTH ? "อุปกรณ์และการปรับเทียบ" : "Devices & Calibration"}</TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">{isTH ? "แจ้งเตือน" : "Alerts"}</TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground">{isTH ? "สิทธิ์ผู้ใช้" : "User Access"}</TabsTrigger>
          </TabsList>

          {/* Automation Rules */}
          <TabsContent value="automation" className="space-y-6">
            <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Auto-Scheduling
                </CardTitle>
                <CardDescription className="text-muted-foreground">Configure automated tasks for actuators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Light Cycle */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-yellow-500/10 rounded-lg">
                      <Sun className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">LED Grow Light Cycle</h4>
                      <p className="text-sm text-muted-foreground">Daily photoperiod schedule</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <Input type="time" defaultValue="06:00" className="w-32 bg-background border-input text-foreground" />
                       <span className="text-muted-foreground">to</span>
                       <Input type="time" defaultValue="18:00" className="w-32 bg-background border-input text-foreground" />
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                {/* Water Circulation */}
                <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Droplets className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">Aeration Interval</h4>
                      <p className="text-sm text-muted-foreground">Oxygen pump activation cycle (min ON / min OFF)</p>
                    </div>
                  </div>
                   <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                       <Input type="number" defaultValue="15" className="w-20 bg-background border-input text-foreground" />
                       <span className="text-muted-foreground">/</span>
                       <Input type="number" defaultValue="45" className="w-20 bg-background border-input text-foreground" />
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* Devices & Calibration */}
          <TabsContent value="devices" className="space-y-6">
            <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Cpu className="w-5 h-5 text-emerald-500" />
                  Linked Devices
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {deviceSummary.total > 0
                    ? `Primary: ${deviceSummary.primaryLabel}`
                    : "No devices paired yet. Add your first device to start monitoring."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {devices.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-emerald-300/60 bg-emerald-50/40 p-6 text-center dark:border-emerald-500/40 dark:bg-emerald-500/10">
                    <p className="text-sm text-emerald-700 dark:text-emerald-200">
                      ยังไม่มีอุปกรณ์ในบัญชีนี้
                    </p>
                    <Button
                      className="mt-3 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={onOpenDevicePairing}
                    >
                      เพิ่มอุปกรณ์ใหม่
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border bg-background/80 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/60">
                        <TableRow>
                          <TableHead>Device ID</TableHead>
                          <TableHead>Device Name</TableHead>
                          <TableHead>Location</TableHead>
                        <TableHead>Primary</TableHead>
                        <TableHead>Last Seen</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devices.map((device) => (
                        <TableRow key={String(device.id)}>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {device.device_id || "-"}
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {device.device_name || "-"}
                            </TableCell>
                            <TableCell>{device.location || "-"}</TableCell>
                            <TableCell>
                              {device.is_primary ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-200">Primary</Badge>
                              ) : (
                                <Badge variant="outline">Secondary</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDeviceTime(device.last_seen || device.paired_at)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-2"
                                onClick={() => openEditDevice(device)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
              <DialogContent className="sm:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>ตั้งค่าอุปกรณ์</DialogTitle>
                </DialogHeader>
                {editingDevice && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Device ID (แก้ไม่ได้)</Label>
                      <Input value={editingDevice.device_id || ""} readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label>Device Name</Label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="เช่น เครื่องไข่ผำ บ่อ A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="เช่น โรงเรือน 1 / โซน B"
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Star className="h-4 w-4 text-amber-500" />
                        ตั้งเป็นเครื่องหลัก
                      </div>
                      <Switch checked={markPrimary} onCheckedChange={setMarkPrimary} />
                    </div>
                  </div>
                )}
                <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <Button
                    variant="outline"
                    className="gap-2 text-red-600 hover:text-red-700"
                    onClick={handleUnpairDevice}
                  >
                    <Trash2 className="h-4 w-4" />
                    Unpair
                  </Button>
                  <Button onClick={handleSaveDevice} disabled={savingDevice}>
                    {savingDevice ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <RefreshCw className="w-5 h-5 text-emerald-500" />
                  Sensor Calibration
                </CardTitle>
                <CardDescription className="text-muted-foreground">Fine-tune sensor readings</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <Label className="text-foreground">pH Offset</Label>
                       <div className="flex gap-4">
                          <Slider defaultValue={[0]} max={2} min={-2} step={0.1} className="flex-1" />
                          <span className="w-12 text-muted-foreground font-mono text-right">+0.0</span>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <Label className="text-foreground">EC Offset (mS/cm)</Label>
                       <div className="flex gap-4">
                          <Slider defaultValue={[0.1]} max={1} min={-1} step={0.1} className="flex-1" />
                          <span className="w-12 text-muted-foreground font-mono text-right">+0.1</span>
                       </div>
                    </div>
                 </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-6">
             <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Bell className="w-5 h-5 text-amber-500" />
                  Alert Preferences
                </CardTitle>
                <CardDescription className="text-muted-foreground">Configure when and how you get notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="space-y-0.5">
                       <Label className="text-base text-foreground">Critical Alerts via SMS</Label>
                       <p className="text-xs text-muted-foreground">Receive text messages for system failures</p>
                    </div>
                    <Switch />
                 </div>
                 <div className="flex items-center justify-between py-3 border-b border-border">
                    <div className="space-y-0.5">
                       <Label className="text-base text-foreground">Mobile Push Notifications</Label>
                       <p className="text-xs text-muted-foreground">Receive app notifications for harvest reminders</p>
                    </div>
                    <Switch defaultChecked />
                 </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users" className="space-y-6">
            <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                  Active Login Sessions
                </CardTitle>
                <CardDescription className="text-muted-foreground">Manage devices currently accessing your farm dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 {sessions.map((session, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                       <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${session.active ? 'bg-emerald-500/10' : 'bg-muted/50'}`}>
                             {session.device.toLowerCase().includes("mac") || session.device.toLowerCase().includes("notebook") ? (
                                <Laptop className={`w-6 h-6 ${session.active ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                             ) : (
                                <Smartphone className={`w-6 h-6 ${session.active ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                             )}
                          </div>
                          <div>
                             <div className="flex items-center gap-2">
                                <h4 className="font-medium text-foreground">{session.device}</h4>
                                {session.active && <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>}
                             </div>
                             <p className="text-sm text-muted-foreground">{session.type} • {session.location}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className="text-xs text-muted-foreground">{session.status}</span>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300"
                            onClick={() => handleRevoke(i)}
                          >
                             Revoke
                          </Button>
                       </div>
                    </div>
                 ))}
                 {sessions.length === 0 && (
                   <div className="text-center py-8 text-muted-foreground">
                     <p>No active sessions found.</p>
                   </div>
                 )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </>
  );
}
