import { useEffect, useState } from "react";
import {
  ArrowRight,
  ClipboardList,
  Sun,
  Droplets,
  Activity,
  MessageCircle,
  User,
  Users,
  LayoutDashboard,
  Settings,
  LogOut,
  Scale,
  Zap,
  Wrench,
  Menu,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Cpu,
  Headset,
  X,
} from "lucide-react";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { DashboardPage } from "./pages/DashboardPage";
import { CropReportsPage } from "./pages/CropReportsPage";
import { DeviceMonitorPage } from "./pages/DeviceMonitorPage";
import { FarmSettingsPage } from "./pages/FarmSettingsPage";
import { WeatherDataPage } from "./pages/WeatherDataPage";
import { MachinePerformancePage } from "./pages/MachinePerformancePage";
import { WolffiaAnalyticsPage } from "./pages/WolffiaAnalyticsPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { MyProfilePage } from "./pages/MyProfilePage";
import { TankLevelsPage } from "./pages/TankLevelsPage";
import { DevicePairingPage } from "./pages/DevicePairingPage";
import { SupportCenterPage } from "./pages/SupportCenterPage";
import { AdminOverview } from "@/features/admin/pages/AdminOverview";
import { UserManagementPage } from "@/features/admin/pages/UserManagementPage";
import { AuditLogsPage } from "@/features/admin/pages/AuditLogsPage";
import { DatabaseViewerPage } from "@/features/admin/pages/DatabaseViewerPage";
import { AdminDbDeviceRow, authService } from "@/features/auth/services/authService";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

import { ModeToggle } from "./mode-toggle";
import { useMachine } from "../contexts/MachineContext";
import appLogoGreen from "@/assets/images/3_transparent_logo_green.png";
import { emitActiveDeviceChanged } from "@/hooks/useActiveDeviceId";

const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Droplets, label: "Tank Levels" }, 
  { icon: ClipboardList, label: "Crop Reports" },
  { icon: Zap, label: "Sensor Intelligence" },
  { icon: Settings, label: "Farm Settings" },
  { icon: Cpu, label: "Device Pairing" },
];

const insightItems = [
  { icon: Sun, label: "Weather Data" },
  { icon: Activity, label: "Machine Performance" },
];

const analyticsItems = [
  { icon: Scale, label: "Wolffia Analytics" },
];

const otherItems = [
  { icon: Wrench, label: "Maintenance" },
  { icon: Headset, label: "Help Center" },
  { icon: User, label: "My Profile" },
];

const adminItems = [
  { icon: Shield, label: "Admin Panel" },
  { icon: Users, label: "User Management" },
  { icon: Activity, label: "Audit Logs" },
  { icon: ClipboardList, label: "Database Viewer" },
];

const navTranslations = {
  EN: {
    "Dashboard": "Dashboard",
    "Tank Levels": "Tank Levels",
    "Crop Reports": "Crop Reports",
    "Sensor Intelligence": "Sensor Intelligence",
    "Device Monitor": "Device Monitor",
    "Farm Settings": "Farm Settings",
    "Weather Data": "Weather Data",
    "Machine Performance": "Machine Performance",
    "Wolffia Analytics": "Wolffia Analytics",
    "Maintenance": "Maintenance",
    "Help Center": "Help Center",
    "My Profile": "My Profile",
    "Device Pairing": "Device Pairing",
    "Field Insights": "Field Insights",
    "Resources": "Resources",
    "System": "System",
    "Smart Farm": "Smart Farm",
    "IoT Management": "IoT Management",
    "Control Center": "Control Center",
    "System Online": "System Online",
    "System Offline": "System Offline",
    "Admin Panel": "Admin Panel",
    "User Management": "User Management",
    "Audit Logs": "Audit Logs",
    "Database Viewer": "Database Viewer"
  },
  TH: {
    "Dashboard": "แดชบอร์ด",
    "Tank Levels": "ระดับถังเก็บน้ำ",
    "Crop Reports": "รายงานพืชผล",
    "Sensor Intelligence": "ระบบเซนเซอร์อัจฉริยะ",
    "Device Monitor": "ตรวจสอบอุปกรณ์",
    "Farm Settings": "ตั้งค่าฟาร์ม",
    "Weather Data": "ข้อมูลสภาพอากาศ",
    "Machine Performance": "ประสิทธิภาพเครื่องจักร",
    "Wolffia Analytics": "วิเคราะห์ไข่น้ำ",
    "Maintenance": "การบำรุงรักษา",
    "Help Center": "ศูนย์ช่วยเหลือ",
    "My Profile": "โปรไฟล์ของฉัน",
    "Device Pairing": "เชื่อมต่ออุปกรณ์",
    "Field Insights": "ข้อมูลเชิงลึกภาคสนาม",
    "Resources": "ทรัพยากร",
    "System": "ระบบ",
    "Smart Farm": "สมาร์ทฟาร์ม",
    "IoT Management": "การจัดการ IoT",
    "Control Center": "ศูนย์ควบคุม",
    "System Online": "ระบบออนไลน์",
    "System Offline": "ระบบออฟไลน์",
    "Admin Panel": "แดชบอร์ดแอดมิน",
    "User Management": "จัดการผู้ใช้งาน",
    "Audit Logs": "บันทึกกิจกรรม",
    "Database Viewer": "ดูฐานข้อมูล"
  }
};

interface DashboardProps {
  onLogout: () => void;
  user?: { id?: string | number; name: string; email: string; role?: string }; // Made optional to be safe, but generic
}

interface SidebarContentProps {
  activePage: string;
  setActivePage: (page: string) => void;
  language: string;
  setLanguage: React.Dispatch<React.SetStateAction<string>>;
  onLogout: () => void;
  onCloseMobile?: () => void;
  isAdminUser?: boolean;
  compact?: boolean;
  devices?: AdminDbDeviceRow[];
  activeDeviceId?: string;
  onDeviceChange?: (deviceId: string) => void;
}

function SidebarContent({ 
  activePage, 
  setActivePage, 
  language, 
  setLanguage, 
  onLogout,
  onCloseMobile,
  user,
  isAdminUser,
  compact = false,
  devices = [],
  activeDeviceId,
  onDeviceChange
}: SidebarContentProps & { user?: { name: string; role?: string } }) {
  const { isOn } = useMachine();
  const isAdmin = isAdminUser ?? (String(user?.role || "").toLowerCase() === "admin");
  const brandName = isAdmin ? "GreenCropNAT Admin" : "GreenCropNAT";
  const t = (navTranslations as any)[language] || navTranslations.EN;

  const handleNavClick = (label: string) => {
    setActivePage(label);
    if (onCloseMobile) onCloseMobile();
  };

  const renderNavItem = (item: any, isActive: boolean) => {
    const Icon = item.icon;
    return (
      <button
        key={item.label}
        onClick={() => handleNavClick(item.label)}
        title={compact ? (t[item.label] || item.label) : undefined}
        className={`
          group flex items-center rounded-full text-sm font-medium transition-all duration-200 w-full
          ${compact ? "justify-center gap-0 px-2 py-3" : "gap-3 px-4 py-2.5"}
          ${isActive
            ? "bg-emerald-600 text-white !text-white shadow-sm"
            : "text-slate-900 border border-transparent hover:bg-emerald-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-emerald-900/20 dark:hover:text-white"
          }
        `}
      >
        <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-white !text-white opacity-100" : "text-slate-700 group-hover:text-emerald-700 dark:text-slate-300 dark:group-hover:text-emerald-300"}`} />
        {!compact && (
          <span className={`truncate ${isActive ? "text-white !text-white opacity-100" : ""}`}>
            {t[item.label] || item.label}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-card/85 backdrop-blur-xl border-r border-border">
      <div 
        className={`border-b border-border bg-card/60 cursor-pointer hover:bg-accent/40 transition-colors ${compact ? "p-3" : "p-5"}`}
        onClick={() => handleNavClick(isAdmin ? "Admin Panel" : "Dashboard")}
      >
        <div className={`flex items-center ${compact ? "justify-center" : "gap-3"}`}>
          <div className={`${compact ? "w-10 h-10" : "w-12 h-12"} rounded-xl flex items-center justify-center shadow-[0_0_14px_rgba(16,185,129,0.32)] relative overflow-hidden group transition-all duration-500 ${isOn ? "bg-gradient-to-br from-primary to-emerald-700" : "bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 grayscale"}`}>
            <div className="absolute inset-0 bg-background/50 backdrop-blur-md/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-[5px] rounded-lg bg-white/78 dark:bg-slate-900/35" />
            <img
              src={appLogoGreen}
              alt="GreenCropNAT logo"
              className="relative z-10 h-8 w-8 object-contain brightness-110 contrast-125 saturate-125"
              draggable={false}
            />
          </div>
          {!compact && <div>
            <h1 className="text-lg font-bold text-foreground tracking-tight leading-tight">
              {brandName}
            </h1>
             <div className="flex items-center gap-1.5 mt-0.5">
               <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOn ? "bg-primary" : "bg-muted-foreground hidden"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOn ? "bg-primary" : "bg-muted-foreground"}`}></span>
              </span>
              <p className={`text-[10px] uppercase font-mono tracking-wider ${isOn ? "text-primary/80" : "text-muted-foreground"}`}>
                {isOn ? t["System Online"] : t["System Offline"]}
              </p>
            </div>
          </div>}
        </div>
      </div>

      {!compact && devices.length > 1 && (
        <div className="px-4 pt-3 pb-2">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Active Device</div>
          <select
            className="w-full h-9 rounded-md border border-border bg-background px-2 text-xs"
            value={activeDeviceId || ""}
            onChange={(e) => onDeviceChange?.(e.target.value)}
          >
            {devices.map((device) => (
              <option key={String(device.id)} value={device.device_id}>
                {device.device_name || device.device_id}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto no-scrollbar scroll-smooth ${compact ? "p-2 space-y-4" : "p-4 space-y-7"}`}>
        {!isAdmin && (
          <>
            <div className="space-y-1">
              {!compact && <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground">{t["Control Center"]}</h3>}
            {mainNavItems
              .filter((item) => !(isAdmin && item.label === "Device Pairing"))
              .map((item) => renderNavItem(item, activePage === item.label))}
            </div>

            {!compact && <Separator className="bg-border/50" />}

            <div className="space-y-1">
              {!compact && <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground">{t["Field Insights"]}</h3>}
              <div className="space-y-1">
                {insightItems.map((item) => renderNavItem(item, activePage === item.label))}
              </div>
            </div>

            {!compact && <Separator className="bg-border/50" />}

            <div className="space-y-1">
              {!compact && <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground">{t["Resources"]}</h3>}
              <div className="space-y-1">
                {analyticsItems.map((item) => renderNavItem(item, activePage === item.label))}
              </div>
            </div>

            {!compact && <Separator className="bg-border/50" />}

            <div className="space-y-1">
              {!compact && <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground">{t["System"]}</h3>}
              <div className="space-y-1">
                {otherItems.map((item) => renderNavItem(item, activePage === item.label))}
              </div>
            </div>
          </>
        )}

        {isAdmin && (
          <>
            {!compact && <Separator className="bg-border/50" />}
            <div className="space-y-1">
              {!compact && <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground">Administration</h3>}
              <div className="space-y-1">
                {adminItems.map((item) => renderNavItem(item, activePage === item.label))}
              </div>
            </div>
          </>
        )}
      </nav>

      <div className={`border-t border-border bg-card/80 ${compact ? "p-2" : "p-4"}`}>
         <div className={`rounded-lg bg-accent/30 border border-border ${compact ? "p-1.5 space-y-1.5" : "p-2 flex items-center justify-between gap-2"}`}>
            <div className={`flex items-center ${compact ? "justify-center gap-1.5" : "gap-2"}`}>
               <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={() => setLanguage(l => l === 'EN' ? 'TH' : 'EN')}
              >
                 <span className="text-xs font-bold font-mono">{language}</span>
              </Button>
              {!compact && <div className="w-px h-4 bg-border"></div>}
              <ModeToggle />
            </div>
            <Button variant="ghost" size="icon" className={`h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 ${compact ? "mx-auto flex" : ""}`} onClick={onLogout}>
                <LogOut className="w-4 h-4" />
            </Button>
         </div>
      </div>
    </div>
  );
}

export function Dashboard({ onLogout, user }: DashboardProps) {

  const isAdminUser = String(user?.role || "").toLowerCase() === "admin";
  const [activePage, setActivePage] = useState(isAdminUser ? "Admin Panel" : "Dashboard");
  const [language, setLanguage] = useState("TH");
  const [tank2On, setTank2On] = useState(false);
  const [tank3On, setTank3On] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopSidebarCompact, setIsDesktopSidebarCompact] = useState(false);
  const [isDashboardChatOpen, setIsDashboardChatOpen] = useState(false);
  const [devices, setDevices] = useState<AdminDbDeviceRow[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>("");
  const showDeviceSelector = devices.length > 1;
  const showDashboardChatWidget = !isAdminUser && activePage === "Dashboard";

  // Use machine context for sidebar status
  const { isOn } = useMachine();
  const t = (navTranslations as any)[language] || navTranslations.EN;

  const loadDevices = async () => {
    if (!user?.id) return;
    try {
      const rows = await authService.getMyDevices();
      setDevices(rows);
      const stored = typeof window !== 'undefined'
        ? (localStorage.getItem('active_device_id') || localStorage.getItem('device_pairing_device_id'))
        : null;
      const hasStored = stored ? rows.some((d) => d.device_id === stored) : false;
      const primary = rows.find((d) => d.is_primary)?.device_id;
      const next = (hasStored ? stored : null) || primary || rows[0]?.device_id || "";
      setActiveDeviceId(next);
      if (typeof window !== 'undefined') {
        if (next) localStorage.setItem('active_device_id', next);
        else localStorage.removeItem('active_device_id');
      }
    } catch {
      setDevices([]);
      setActiveDeviceId("");
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    loadDevices().catch(() => {});
  }, [user?.id]);

  const handleDeviceChange = async (deviceId: string) => {
    setActiveDeviceId(deviceId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('active_device_id', deviceId);
    }
    emitActiveDeviceChanged();
    try {
      await authService.setPrimaryDevice(deviceId);
      setDevices((prev) =>
        prev.map((d) => ({ ...d, is_primary: d.device_id === deviceId }))
      );
    } catch {
      // keep UI change; server will be retried later
    }
  };

  const renderContent = () => {
    switch (activePage) {
      case "Dashboard":
        return isAdminUser ? <AdminOverview language={language} /> : <DashboardPage language={language} />;
      case "Crop Reports":
        return <CropReportsPage language={language} />;
      case "Sensor Intelligence":
      case "Device Monitor":
        return <DeviceMonitorPage language={language} />;
      case "Farm Settings":
        return (
          <FarmSettingsPage
            devices={devices}
            onOpenDevicePairing={() => setActivePage("Device Pairing")}
            onSetPrimary={handleDeviceChange}
            onUpdateDevice={async (payload) => {
              await authService.updateDevice(payload);
              await loadDevices();
            }}
            onUnpairDevice={async (deviceId) => {
              await authService.unpairDevice(deviceId);
              await loadDevices();
            }}
            language={language}
          />
        );
      case "Device Pairing":
        if (isAdminUser) return <AdminOverview language={language} />;
        return (
          <DevicePairingPage
            user={user}
            onPaired={({ deviceId }) => {
              localStorage.setItem("device_pairing_completed", "true");
              localStorage.removeItem("device_pairing_skipped");
              localStorage.setItem("device_pairing_device_id", deviceId);
              localStorage.setItem("active_device_id", deviceId);
              setActiveDeviceId(deviceId);
              emitActiveDeviceChanged();
              authService.getMyDevices().then(setDevices).catch(() => {});
              setActivePage("Dashboard");
            }}
            onSkip={() => setActivePage("Dashboard")}
            language={language}
          />
        );
      case "Weather Data":
        return <WeatherDataPage language={language} />;
      case "Machine Performance":
        return <MachinePerformancePage language={language} />;
      case "Wolffia Analytics":
        return <WolffiaAnalyticsPage language={language} />;
      case "Maintenance":
        return <MaintenancePage language={language} />;
      case "Help Center":
        return <SupportCenterPage language={language} />;
      case "Tank Levels":
        return <TankLevelsPage tank2On={tank2On} setTank2On={setTank2On} tank3On={tank3On} setTank3On={setTank3On} language={language} />;
      case "My Profile":
        return <MyProfilePage onLogout={onLogout} language={language} />;
      case "Admin Panel":
        return isAdminUser ? <AdminOverview language={language} /> : <DashboardPage language={language} />;
      case "User Management":
        return isAdminUser ? <UserManagementPage language={language} /> : <DashboardPage language={language} />;
      case "Audit Logs":
        return isAdminUser ? <AuditLogsPage language={language} /> : <DashboardPage language={language} />;
      case "Database Viewer":
        return isAdminUser ? <DatabaseViewerPage language={language} /> : <DashboardPage language={language} />;
      default:
        return <DashboardPage language={language} />;
    }
  };

  return (
    <div className="flex h-screen bg-background font-sans selection:bg-primary/30 text-foreground transition-colors duration-300">
      {/* Desktop Sidebar */}
      <div className={`hidden lg:block h-full z-20 relative border-r border-border/60 transition-[width] duration-300 ${isDesktopSidebarCompact ? "w-24" : "w-72"}`}>
        <SidebarContent 
          activePage={activePage} 
          setActivePage={setActivePage} 
          language={language} 
          setLanguage={setLanguage} 
          onLogout={onLogout} 
          user={user}
          isAdminUser={isAdminUser}
          compact={isDesktopSidebarCompact}
          devices={devices}
          activeDeviceId={activeDeviceId}
          onDeviceChange={handleDeviceChange}
        />
      </div>

      {/* Main Content */}
      <div className="force-solid flex-1 flex flex-col overflow-hidden relative bg-background transition-colors duration-300">
         {/* Background Grid Pattern */}
         <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.05)_1px,transparent_1px)] bg-[size:24px_24px] dark:bg-[linear-gradient(to_right,rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.08)_1px,transparent_1px)]"></div>
         <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_800px_at_50%_-30%,rgba(16,185,129,0.14),transparent)] dark:bg-[radial-gradient(circle_800px_at_50%_-30%,rgba(16,185,129,0.2),transparent)]"></div>
         
         {/* Mobile Header */}
         <div className="lg:hidden flex items-center p-4 border-b border-border bg-card/85 backdrop-blur-md sticky top-0 z-30 justify-between">
           <div className="flex items-center gap-2">
             <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
               <SheetTrigger asChild>
                 <Button variant="ghost" size="icon" className="mr-1">
                   <Menu className="w-5 h-5" />
                 </Button>
               </SheetTrigger>
               <SheetContent side="left" className="p-0 w-72 bg-card border-border shadow-xl">
                <SidebarContent 
                    activePage={activePage} 
                    setActivePage={setActivePage} 
                    language={language} 
                    setLanguage={setLanguage} 
                    onLogout={onLogout}
                    onCloseMobile={() => setIsMobileOpen(false)}
                    user={user}
                    isAdminUser={isAdminUser}
                    devices={devices}
                    activeDeviceId={activeDeviceId}
                    onDeviceChange={handleDeviceChange}
                />
               </SheetContent>
             </Sheet>
             <div>
              <p className="text-xs text-muted-foreground font-medium">
                GreenCropNAT
              </p>
             <h1 className="text-base font-semibold tracking-tight">
                {t[activePage] || activePage}
              </h1>
             </div>
           </div>
           
           <div className="flex items-center gap-2">
              {showDeviceSelector && (
                <select
                  className="h-8 max-w-[150px] rounded-md border border-border bg-background px-2 text-xs"
                  value={activeDeviceId || ""}
                  onChange={(e) => handleDeviceChange(e.target.value)}
                >
                  {devices.map((device) => (
                    <option key={String(device.id)} value={device.device_id}>
                      {device.device_name || device.device_id}
                    </option>
                  ))}
                </select>
              )}
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOn ? "bg-primary" : "bg-muted-foreground hidden"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOn ? "bg-primary" : "bg-muted-foreground"}`}></span>
              </span>
           </div>
         </div>

        <div className="hidden lg:block absolute top-4 left-4 z-30">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl bg-card/85 backdrop-blur-md border-border shadow-sm"
            onClick={() => setIsDesktopSidebarCompact(prev => !prev)}
            title={isDesktopSidebarCompact ? "Expand menu" : "Collapse menu"}
          >
            {isDesktopSidebarCompact ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {renderContent()}
        </div>

        {showDashboardChatWidget && (
          <div className="pointer-events-none fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:bottom-8 sm:right-8">
            {isDashboardChatOpen && (
              <div className="pointer-events-auto w-[min(320px,calc(100vw-2.5rem))] overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/95">
                <div className="flex items-start justify-between border-b border-slate-200/80 px-5 py-4 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {language === "TH" ? "เริ่มคุยกับทีมซัพพอร์ต" : "Start a support chat"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {language === "TH" ? "เลือกว่าต้องการไปดูคู่มือช่วยตอบ หรือส่งต่อเคส" : "Choose whether to open the help center or escalate a case."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDashboardChatOpen(false)}
                    className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 px-5 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePage("Help Center");
                      setIsDashboardChatOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {language === "TH" ? "เปิดศูนย์ช่วยเหลือ" : "Open Help Center"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {language === "TH" ? "ดูวิธีตอบลูกค้าและขั้นตอนแก้ปัญหา" : "View troubleshooting steps and customer reply templates"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePage("Help Center");
                      setIsDashboardChatOpen(false);
                    }}
                    className="flex w-full items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {language === "TH" ? "ส่งต่อเคสเร่งด่วน" : "Escalate an urgent case"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {language === "TH" ? "เหมาะกับเครื่อง offline หรือ alert ระดับรุนแรง" : "For offline devices or critical alerts"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>
            )}

            <div className="pointer-events-auto flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsDashboardChatOpen((open) => !open)}
                className="hidden rounded-[2rem] bg-white/96 px-8 py-6 text-[clamp(1.1rem,1.8vw,2rem)] font-semibold tracking-tight text-slate-800 shadow-[0_20px_50px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.16)] sm:block dark:bg-slate-50"
              >
                Chat with us <span className="ml-2">👋</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDashboardChatOpen((open) => !open)}
                className="group flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 text-white shadow-[0_22px_45px_rgba(15,23,42,0.24)] transition hover:-translate-y-0.5 hover:bg-slate-800 sm:h-24 sm:w-24"
                aria-label={language === "TH" ? "เปิดแชตช่วยเหลือ" : "Open support chat"}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 sm:h-12 sm:w-12">
                  <MessageCircle className="h-6 w-6 transition group-hover:scale-105" />
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
