import { useEffect, useState } from "react";
import {
  ClipboardList,
  Sun,
  Droplets,
  Activity,
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
} from "lucide-react";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import { DashboardPage } from "./pages/DashboardPage";
import { CropReportsPage } from "./pages/CropReportsPage";
import { DeviceMonitorPage } from "./pages/DeviceMonitorPage";
import { FarmSettingsPage } from "./pages/FarmSettingsPage";
import { WeatherDataPage } from "./pages/WeatherDataPage";
import { SensorIntelligencePage } from "@/features/ai/pages/SensorIntelligencePage";
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
import { CustomerChatWidget } from "@/features/chat/components/CustomerChatWidget";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

import { ModeToggle } from "./mode-toggle";
import { useMachine } from "../contexts/MachineContext";
import appLogoGreen from "@/assets/images/3_transparent_logo_green.png";
import { getActiveDeviceIdValue, scopedStorageKey, setActiveDeviceIdValue } from "@/hooks/useActiveDeviceId";

const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Activity, label: "Device Monitor" },
  { icon: Droplets, label: "Tank Levels" }, 
  { icon: Zap, label: "Sensor Intelligence" },
  { icon: Settings, label: "Farm Settings" },
  { icon: Cpu, label: "Device Pairing" },
];

const insightItems = [
  { icon: Sun, label: "Weather Data" },
  { icon: Activity, label: "Machine Performance" },
];

const analyticsItems = [
  { icon: ClipboardList, label: "Crop Reports" },
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
    "Crop Reports": "รายงานผลผลิต",
    "Sensor Intelligence": "ระบบเซนเซอร์อัจฉริยะ",
    "Device Monitor": "มอนิเตอร์ละเอียด",
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
  onToggleCompact?: () => void;
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
  onDeviceChange,
  onToggleCompact
}: SidebarContentProps & { user?: { name: string; role?: string } }) {
  const { isOn } = useMachine();
  const [isCompactHovered, setIsCompactHovered] = useState(false);
  const isAdmin = isAdminUser ?? (String(user?.role || "").toLowerCase() === "admin");
  const brandName = isAdmin ? "GreenCropNAT Admin" : "GreenCropNAT";
  const t = (navTranslations as any)[language] || navTranslations.EN;

  const handleNavClick = (label: string) => {
    setActivePage(label);
    if (onCloseMobile) onCloseMobile();
  };

  const renderNavItem = (item: any, isActive: boolean) => {
    const Icon = item.icon;
    const translatedLabel = t[item.label] || item.label;
    const navButton = (
      <button
        onClick={() => handleNavClick(item.label)}
        aria-label={translatedLabel}
        className={`
          group flex items-center text-[13px] font-medium transition-all duration-150
          ${compact
            ? `mx-auto h-11 ${isCompactHovered ? "w-[200px] justify-start gap-3 rounded-xl px-4" : "w-11 justify-center rounded-full px-0"}`
            : "w-full gap-3 rounded-2xl px-3 py-2.5"}
          ${isActive
            ? compact
              ? "!bg-emerald-600 text-white !text-white shadow-[0_10px_24px_-12px_rgba(5,150,105,0.95)] hover:!bg-emerald-700 dark:!bg-emerald-500 dark:text-white dark:!text-white"
              : "bg-emerald-600 text-white !text-white shadow-[0_5px_16px_-10px_rgba(5,150,105,0.8)]"
            : compact
              ? isCompactHovered
                ? "border border-transparent bg-transparent text-slate-700 hover:bg-slate-950/[0.045] hover:text-emerald-700 dark:text-slate-200 dark:hover:bg-white/[0.07]"
                : "border border-white/90 bg-white/95 text-slate-700 shadow-[0_7px_20px_-14px_rgba(15,23,42,0.55)] hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              : "border border-transparent text-slate-600 hover:bg-black/[0.035] hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
          }
        `}
      >
        <Icon className={`${compact ? "h-5 w-5" : "h-4 w-4"} shrink-0 transition-colors ${isActive ? "text-white !text-white opacity-100" : "text-slate-700 group-hover:text-emerald-700 dark:text-slate-300 dark:group-hover:text-emerald-300"}`} />
        <span className={`truncate transition-all duration-200 ${compact ? `text-sm font-medium ${isCompactHovered ? "max-w-[150px] opacity-100" : "max-w-0 opacity-0"}` : ""} ${isActive ? "text-white !text-white" : ""}`}>
          {translatedLabel}
        </span>
      </button>
    );

    return <div key={item.label}>{navButton}</div>;
  };

  return (
    <div
      onMouseEnter={() => compact && setIsCompactHovered(true)}
      onMouseLeave={() => compact && setIsCompactHovered(false)}
      className={`flex flex-col transition-[width,border-radius] duration-300 ${compact ? `pointer-events-auto mx-auto h-[calc(100%-2rem)] overflow-hidden border border-white/80 bg-white/90 shadow-[0_28px_70px_-34px_rgba(15,23,42,0.5)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/92 ${isCompactHovered ? "w-56 rounded-[24px]" : "w-20 rounded-[40px]"}` : "h-full border-r border-border/70 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/92"}`}
    >
      <div 
        className={`cursor-pointer transition-colors ${compact ? "flex min-h-[74px] w-full items-center px-2 py-2" : "flex min-h-[102px] items-center border-b border-border/60 px-5 hover:bg-muted/35 dark:border-slate-800"}`}
        onClick={() => handleNavClick(isAdmin ? "Admin Panel" : "Dashboard")}
      >
        <div className={`flex w-full items-center ${compact ? `${isCompactHovered ? "flex-row px-1" : "flex-col"} gap-2` : "gap-3"}`}>
          <div className={`${compact ? "h-10 w-10" : "h-11 w-11"} group relative flex items-center justify-center overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50 shadow-none transition-all duration-300 dark:border-emerald-900 dark:bg-emerald-950/40 ${isOn ? "" : "grayscale"}`}>
            <div className="absolute inset-0 bg-background/50 backdrop-blur-md/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute inset-[5px] rounded-lg bg-white/78 dark:bg-slate-900/35" />
            <img
              src={appLogoGreen}
              alt="GreenCropNAT logo"
              className="relative z-10 h-8 w-8 object-contain brightness-110 contrast-125 saturate-125"
              draggable={false}
            />
          </div>
          <div className={`min-w-0 flex-1 ${compact && !isCompactHovered ? "hidden" : ""}`}>
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
          </div>
          {compact && (
            <button
              type="button"
              title={language === "TH" ? "ขยายเมนู" : "Expand menu"}
              className={`${isCompactHovered ? "ml-auto" : ""} flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/70 bg-white/75 text-slate-600 transition-colors hover:bg-white hover:text-emerald-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleCompact?.();
              }}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
          {!compact && onToggleCompact && (
            <button
              type="button"
              title={language === "TH" ? "ย่อเมนู" : "Collapse menu"}
              className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-muted-foreground shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40"
              onClick={(event) => {
                event.stopPropagation();
                onToggleCompact();
              }}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
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
      <nav className={`min-h-0 ${compact ? `flex w-full flex-1 flex-col border-y border-slate-200/55 px-2 py-3 dark:border-slate-700/60 ${isCompactHovered ? "justify-start space-y-4 overflow-y-auto overscroll-contain" : "justify-center space-y-1 overflow-hidden"}` : "flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-5"}`}>
        {!isAdmin && (
          <>
            <div className="space-y-1">
              {(!compact || isCompactHovered) && <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">{t["Control Center"]}</h3>}
            {mainNavItems
              .filter((item) => !(isAdmin && item.label === "Device Pairing"))
              .map((item) => renderNavItem(item, activePage === item.label))}
            </div>

            <div className="space-y-1">
              {(!compact || isCompactHovered) && <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">{t["Field Insights"]}</h3>}
              <div className="space-y-1">
                {insightItems.map((item) => renderNavItem(item, activePage === item.label))}
              </div>
            </div>

            <div className="space-y-1">
              {(!compact || isCompactHovered) && <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">{t["Resources"]}</h3>}
              <div className="space-y-1">
                {analyticsItems.map((item) => renderNavItem(item, activePage === item.label))}
              </div>
            </div>

            <div className="space-y-1">
              {(!compact || isCompactHovered) && <h3 className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">{t["System"]}</h3>}
              <div className="space-y-1">
                {otherItems.map((item) => renderNavItem(item, activePage === item.label))}
              </div>
            </div>
          </>
        )}

        {isAdmin && (
          <>
            {(!compact || isCompactHovered) && <Separator className="bg-border/50" />}
            <div className="space-y-1">
              {(!compact || isCompactHovered) && <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground">Administration</h3>}
              <div className="space-y-1">
                {adminItems.map((item) => renderNavItem(item, activePage === item.label))}
              </div>
            </div>
          </>
        )}
      </nav>

      <div className={`${compact ? "mx-auto px-2 py-3" : "border-t border-border/60 p-3 dark:border-slate-800"}`}>
         {compact ? (
           <div className={`flex items-center justify-center ${isCompactHovered ? "w-[200px] gap-3" : "w-11 flex-col gap-2"}`}>
             <Button
               variant="ghost"
               size="icon"
               title={language === "TH" ? "เปลี่ยนภาษา" : "Change language"}
               className={`${isCompactHovered ? "flex" : "hidden"} h-10 w-10 rounded-full`}
               onClick={() => setLanguage(l => l === "EN" ? "TH" : "EN")}
             >
               <span className="text-xs font-bold font-mono">{language}</span>
             </Button>
             <ModeToggle />
             <Button
               variant="ghost"
               size="icon"
               title={language === "TH" ? "ออกจากระบบ" : "Logout"}
               className={`${isCompactHovered ? "flex" : "hidden"} h-10 w-10 rounded-full border border-white/90 bg-white/92 text-slate-600 shadow-[0_6px_18px_-12px_rgba(15,23,42,0.35)] hover:bg-white hover:text-red-500 dark:border-slate-700 dark:bg-slate-900`}
               onClick={onLogout}
             >
               <LogOut className="h-4 w-4" />
             </Button>
           </div>
         ) : (
         <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 p-1.5 dark:bg-slate-900/60">
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
         )}
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
  const [isDesktopSidebarCompact, setIsDesktopSidebarCompact] = useState(true);
  const [devices, setDevices] = useState<AdminDbDeviceRow[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string>("");
  const showDeviceSelector = devices.length > 1;
  const showDashboardChatWidget = !isAdminUser;

  // Use machine context for sidebar status
  const { isOn } = useMachine();
  const t = (navTranslations as any)[language] || navTranslations.EN;

  const loadDevices = async () => {
    if (!user?.id) return;
    try {
      const rows = await authService.getMyDevices();
      setDevices(rows);
      const stored = typeof window !== 'undefined'
        ? (getActiveDeviceIdValue() || localStorage.getItem(scopedStorageKey('device_pairing_device_id')))
        : null;
      const hasStored = stored ? rows.some((d) => d.device_id === stored) : false;
      const primary = rows.find((d) => d.is_primary)?.device_id;
      const next = (hasStored ? stored : null) || primary || rows[0]?.device_id || "";
	      setActiveDeviceId(next);
	      setActiveDeviceIdValue(next);
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
	    setActiveDeviceIdValue(deviceId);
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
	        return isAdminUser ? (
	          <AdminOverview language={language} />
	        ) : (
	          <DashboardPage
	            language={language}
	            devices={devices}
	            activeDeviceId={activeDeviceId}
	            onDeviceChange={handleDeviceChange}
	            user={user}
	            onOpenProfile={() => setActivePage("My Profile")}
	            onLogout={onLogout}
	          />
	        );
      case "Crop Reports":
        return <CropReportsPage language={language} />;
      case "Sensor Intelligence":
        return <SensorIntelligencePage language={language} activeDeviceId={activeDeviceId} />;
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
              localStorage.setItem(scopedStorageKey("device_pairing_completed"), "true");
              localStorage.removeItem(scopedStorageKey("device_pairing_skipped"));
              localStorage.setItem(scopedStorageKey("device_pairing_device_id"), deviceId);
	              setActiveDeviceId(deviceId);
	              setActiveDeviceIdValue(deviceId);
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
        return (
          <TankLevelsPage
            language={language}
            tank2On={tank2On}
            setTank2On={setTank2On}
            tank3On={tank3On}
            setTank3On={setTank3On}
          />
        );
      case "My Profile":
        return <MyProfilePage onLogout={onLogout} language={language} />;
	      case "Admin Panel":
	        return isAdminUser ? <AdminOverview language={language} /> : <DashboardPage language={language} devices={devices} activeDeviceId={activeDeviceId} onDeviceChange={handleDeviceChange} user={user} />;
	      case "User Management":
	        return isAdminUser ? <UserManagementPage language={language} /> : <DashboardPage language={language} devices={devices} activeDeviceId={activeDeviceId} onDeviceChange={handleDeviceChange} />;
	      case "Audit Logs":
	        return isAdminUser ? <AuditLogsPage language={language} /> : <DashboardPage language={language} devices={devices} activeDeviceId={activeDeviceId} onDeviceChange={handleDeviceChange} />;
	      case "Database Viewer":
	        return isAdminUser ? <DatabaseViewerPage language={language} /> : <DashboardPage language={language} devices={devices} activeDeviceId={activeDeviceId} onDeviceChange={handleDeviceChange} />;
	      default:
	        return <DashboardPage language={language} devices={devices} activeDeviceId={activeDeviceId} onDeviceChange={handleDeviceChange} user={user} />;
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background font-sans text-foreground transition-colors duration-300 selection:bg-primary/30">
      {/* Desktop Sidebar */}
      <div className={`z-50 hidden h-full transition-[width] duration-300 lg:block ${
        isDesktopSidebarCompact
          ? "pointer-events-none absolute inset-y-0 left-0 flex w-24 items-center"
          : "relative w-64 shrink-0"
      }`}>
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
          onToggleCompact={() => setIsDesktopSidebarCompact((value) => !value)}
        />
      </div>

      {/* Main Content */}
      <div className={`relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f7faf8] transition-[padding,background-color] duration-300 dark:bg-slate-950 ${
        isDesktopSidebarCompact ? "lg:pl-0" : ""
      }`}>
         
         {/* Mobile Header */}
         <div className="lg:hidden sticky top-0 z-30 border-b border-border bg-card/85 px-3 py-3 backdrop-blur-md">
           <div className="flex items-center justify-between gap-3">
           <div className="min-w-0 flex items-center gap-2">
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
             <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">
                GreenCropNAT
              </p>
             <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
                {t[activePage] || activePage}
              </h1>
             </div>
           </div>
           
           <div className="flex shrink-0 items-center gap-2">
              <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOn ? "bg-primary" : "bg-muted-foreground hidden"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isOn ? "bg-primary" : "bg-muted-foreground"}`}></span>
              </span>
           </div>
           </div>
           {showDeviceSelector && (
             <div className="mt-3">
               <select
                 className="h-9 w-full rounded-lg border border-border bg-background px-3 text-xs"
                 value={activeDeviceId || ""}
                 onChange={(e) => handleDeviceChange(e.target.value)}
               >
                 {devices.map((device) => (
                   <option key={String(device.id)} value={device.device_id}>
                     {device.device_name || device.device_id}
                   </option>
                 ))}
               </select>
             </div>
           )}
         </div>

        <div className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden transition-[padding] duration-300 ${
          isDesktopSidebarCompact ? "lg:pl-28" : ""
        }`}>
          {renderContent()}
        </div>

        {showDashboardChatWidget && (
          <CustomerChatWidget
            language={language}
            currentPage={t[activePage] || activePage}
            userContext={user}
            deviceCount={devices.length}
          />
        )}
      </div>
    </div>
  );
}
