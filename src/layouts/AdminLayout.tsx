import { useState } from "react";
import { User, LogOut, Users, Settings, Activity, Shield, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { UserManagementPage } from "@/features/admin/pages/UserManagementPage";
import { AuditLogsPage } from "@/features/admin/pages/AuditLogsPage";
import { AdminOverview } from "@/features/admin/pages/AdminOverview";
import { DatabaseViewerPage } from "@/features/admin/pages/DatabaseViewerPage";
import { Separator } from "@/components/ui/separator";

export function AdminDashboard() {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex">
      {/* Admin Sidebar */}
      <div className="w-64 border-r border-border bg-card/50 backdrop-blur flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Shield className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Admin<br/><span className="text-muted-foreground text-sm font-normal">Panel</span></h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
            <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Management</div>
             <Button 
                variant={activeTab === "Overview" ? "secondary" : "ghost"} 
                className="w-full justify-start gap-3"
                onClick={() => setActiveTab("Overview")}
            >
                <LayoutDashboard className="h-4 w-4" />
                Overview
            </Button>
            <Button 
                variant={activeTab === "Users" ? "secondary" : "ghost"} 
                className="w-full justify-start gap-3"
                onClick={() => setActiveTab("Users")}
            >
                <Users className="h-4 w-4" />
                User Management
            </Button>
            <Button 
                variant={activeTab === "System" ? "secondary" : "ghost"} 
                className="w-full justify-start gap-3"
                onClick={() => setActiveTab("System")}
            >
                <Settings className="h-4 w-4" />
                System Settings
            </Button>
            <Button 
                 variant={activeTab === "Logs" ? "secondary" : "ghost"} 
                 className="w-full justify-start gap-3"
                 onClick={() => setActiveTab("Logs")}
            >
                <Activity className="h-4 w-4" />
                Audit Logs
            </Button>
            <Button
                 variant={activeTab === "Database" ? "secondary" : "ghost"}
                 className="w-full justify-start gap-3"
                 onClick={() => setActiveTab("Database")}
            >
                <Users className="h-4 w-4" />
                Database Viewer
            </Button>
        </nav>

        <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2 mb-4 px-2">
                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="h-4 w-4" />
                </div>
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
            </div>
            <div className="flex gap-2">
                 <ModeToggle />
                 <Button variant="outline" className="flex-1 gap-2" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
      </div>

      {/* Main Admin Content */}
      <main className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950/50">
        {activeTab === "Overview" && <AdminOverview />}
        {activeTab === "Users" && <UserManagementPage />}
        
        {activeTab === "System" && (
            <div className="p-8 flex flex-col items-center justify-center h-full text-muted-foreground">
                <Settings className="h-16 w-16 mb-4 opacity-20" />
                <h2 className="text-xl font-semibold">System Settings</h2>
                <p>Global configuration panel (Coming Soon)</p>
            </div>
        )}

        {activeTab === "Logs" && <AuditLogsPage />}
        {activeTab === "Database" && <DatabaseViewerPage />}
      </main>
    </div>
  );
}
