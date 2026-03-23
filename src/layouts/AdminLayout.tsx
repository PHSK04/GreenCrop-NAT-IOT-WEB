import { useEffect, useState } from "react";
import { User, LogOut, Users, Settings, Activity, Shield, LayoutDashboard, Database, MessageSquare } from "lucide-react";
import { useAuth } from "@/features/auth/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/mode-toggle";
import { UserManagementPage } from "@/features/admin/pages/UserManagementPage";
import { AuditLogsPage } from "@/features/admin/pages/AuditLogsPage";
import { AdminOverview } from "@/features/admin/pages/AdminOverview";
import { DatabaseViewerPage } from "@/features/admin/pages/DatabaseViewerPage";
import { AdminChatInboxPage } from "@/features/chat/components/AdminChatInboxPage";
import { chatService } from "@/features/chat/services/chatService";
import { Separator } from "@/components/ui/separator";

export function AdminDashboard() {
  const { logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState("Overview");
  const [unreadThreads, setUnreadThreads] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadUnread = async () => {
      try {
        const summary = await chatService.getUnreadSummary();
        if (!cancelled) {
          setUnreadThreads(summary.unread_threads);
        }
      } catch {
        if (!cancelled) {
          setUnreadThreads(0);
        }
      }
    };

    loadUnread().catch(() => {});
    const timer = window.setInterval(() => {
      loadUnread().catch(() => {});
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex">
      {/* Admin Sidebar */}
      <div className="w-64 border-r border-border bg-gradient-to-b from-white via-emerald-50/30 to-white dark:from-slate-950 dark:via-emerald-900/10 dark:to-slate-950 flex flex-col">
        <div className="p-6 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20 shadow-sm">
              <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="font-semibold text-lg leading-tight tracking-tight">Admin</h1>
              <span className="text-muted-foreground text-sm">Control Panel</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="px-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-2">Management</div>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-11 px-3 rounded-xl transition-all ${
              activeTab === "Overview"
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-600"
                : "text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-900/20"
            }`}
            onClick={() => setActiveTab("Overview")}
          >
            <LayoutDashboard className="h-4 w-4" />
            Overview
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-11 px-3 rounded-xl transition-all ${
              activeTab === "Users"
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-600"
                : "text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-900/20"
            }`}
            onClick={() => setActiveTab("Users")}
          >
            <Users className="h-4 w-4" />
            User Management
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-11 px-3 rounded-xl transition-all ${
              activeTab === "System"
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-600"
                : "text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-900/20"
            }`}
            onClick={() => setActiveTab("System")}
          >
            <Settings className="h-4 w-4" />
            System Settings
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-11 px-3 rounded-xl transition-all ${
              activeTab === "Logs"
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-600"
                : "text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-900/20"
            }`}
            onClick={() => setActiveTab("Logs")}
          >
            <Activity className="h-4 w-4" />
            Audit Logs
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-11 px-3 rounded-xl transition-all ${
              activeTab === "Chats"
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-600"
                : "text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-900/20"
            }`}
            onClick={() => setActiveTab("Chats")}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="flex-1 text-left">Support Chats</span>
            {unreadThreads > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${activeTab === "Chats" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"}`}>
                {unreadThreads}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            className={`w-full justify-start gap-3 h-11 px-3 rounded-xl transition-all ${
              activeTab === "Database"
                ? "bg-emerald-600 text-white shadow-sm hover:bg-emerald-600"
                : "text-slate-700 hover:bg-emerald-50 dark:text-slate-200 dark:hover:bg-emerald-900/20"
            }`}
            onClick={() => setActiveTab("Database")}
          >
            <Database className="h-4 w-4" />
            Database Viewer
          </Button>
        </nav>

        <div className="p-4 border-t border-border/80">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <User className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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
        {activeTab === "Chats" && <AdminChatInboxPage />}
        {activeTab === "Database" && <DatabaseViewerPage />}
      </main>
    </div>
  );
}
