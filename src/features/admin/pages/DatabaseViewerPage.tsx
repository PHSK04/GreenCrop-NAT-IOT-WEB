import { useEffect, useMemo, useRef, useState } from "react";
import {
  AdminDbAuditRow,
  AdminDbOtpRow,
  AdminDbQuery,
  AdminDbSensorRow,
  AdminDbSessionRow,
  AdminDbSummary,
  AdminDbUserDetails,
  AdminDbUserRow,
  authService,
} from "@/features/auth/services/authService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Database, Eye, EyeOff, RefreshCcw, Save, Search, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { downloadSimplePdf, downloadTextFile } from "@/utils/download";

type ActiveTab = "users" | "sessions" | "sensor" | "audit" | "otp";

function safeText(v: unknown) {
  if (v === null || v === undefined) return "-";
  return String(v);
}

function formatDate(v: unknown) {
  if (!v) return "-";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function formatDayLabel(v: unknown) {
  if (!v) return "-";
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("th-TH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

type UserEvent = {
  key: string;
  timeMs: number;
  timestampText: string;
  dayKey: string;
  dayLabel: string;
  timeLabel: string;
  type: "LOGIN" | "LOGOUT" | "ACTION" | "SENSOR" | "ERROR";
  title: string;
  detail: string;
  device?: string;
  browser?: string;
  ip?: string;
};

export function DatabaseViewerPage() {
  const [summary, setSummary] = useState<AdminDbSummary | null>(null);
  const [users, setUsers] = useState<AdminDbUserRow[]>([]);
  const [sessions, setSessions] = useState<AdminDbSessionRow[]>([]);
  const [sensorRows, setSensorRows] = useState<AdminDbSensorRow[]>([]);
  const [auditRows, setAuditRows] = useState<AdminDbAuditRow[]>([]);
  const [otpRows, setOtpRows] = useState<AdminDbOtpRow[]>([]);
  const [search, setSearch] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<AdminDbUserDetails | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("users");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [eventSearch, setEventSearch] = useState("");
  const [expandedEventKey, setExpandedEventKey] = useState<string | null>(null);
  const [selectedExportTypes, setSelectedExportTypes] = useState<string[]>([
    "LOGIN",
    "LOGOUT",
    "ACTION",
    "SENSOR",
    "ERROR",
  ]);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const userDetailsRef = useRef<HTMLDivElement | null>(null);
  const modalInputClass = "bg-white text-slate-900 border-slate-300 placeholder:text-slate-400 focus-visible:ring-emerald-500/40 dark:bg-slate-950/80 dark:text-slate-100 dark:border-slate-700 dark:placeholder:text-slate-400";

  const buildQuery = (): AdminDbQuery => {
    const query: AdminDbQuery = { limit: 300 };
    if (search.trim()) query.q = search.trim();
    if (startDateTime) query.startDate = startDateTime;
    if (endDateTime) query.endDate = endDateTime;
    if (statusFilter !== "all" && (activeTab === "sessions" || activeTab === "audit")) {
      query.status = statusFilter;
    }
    return query;
  };

  const loadAllWithQuery = async (query?: AdminDbQuery) => {
    setLoading(true);
    try {
      const usersQuery: AdminDbQuery = { ...query };
      delete usersQuery.userId;
      delete usersQuery.status;

      const [s, u, otp] = await Promise.all([
        authService.getAdminDbSummary(),
        authService.getAdminDbUsers(usersQuery),
        authService.getAdminDbOtpCodes(),
      ]);

      const requestedUserId = query?.userId ? String(query.userId) : "";
      const effectiveUserId = requestedUserId || selectedUserId || (u[0]?.id !== undefined ? String(u[0].id) : "");

      if (!selectedUserId && effectiveUserId) {
        setSelectedUserId(effectiveUserId);
      }

      let ls: AdminDbSessionRow[] = [];
      let sd: AdminDbSensorRow[] = [];
      let al: AdminDbAuditRow[] = [];

      if (effectiveUserId) {
        const scopedQuery: AdminDbQuery = { ...query, userId: effectiveUserId };
        [ls, sd, al] = await Promise.all([
          authService.getAdminDbLoginSessions(scopedQuery),
          authService.getAdminDbSensorData(scopedQuery),
          authService.getAdminDbAuditLogs(scopedQuery),
        ]);
      }

      setSummary(s);
      setUsers(u);
      setSessions(ls);
      setSensorRows(sd);
      setAuditRows(al);
      setOtpRows(otp);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load database view");
    } finally {
      setLoading(false);
    }
  };

  const loadAll = async () => {
    const query = buildQuery();
    await loadAllWithQuery(query);
  };

  const loadUserDetails = async (userId: string | number) => {
    setLoadingUserDetails(true);
    try {
      const details = await authService.getAdminDbUserDetails(String(userId), {
        startDate: startDateTime || undefined,
        endDate: endDateTime || undefined,
        limit: 120,
      });
      setSelectedUserDetails(details);
      toast.success(`Loaded data for ${details.user.name}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load user-specific data");
    } finally {
      setLoadingUserDetails(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (selectedUserDetails && userDetailsRef.current) {
      userDetailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedUserDetails]);

  useEffect(() => {
    if (!selectedUserDetails) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedUserDetails]);

  useEffect(() => {
    if (!selectedUserDetails) return;
    setEditName(String(selectedUserDetails.user.name || ""));
    setEditEmail(String(selectedUserDetails.user.email || ""));
    setEditTitle(String(selectedUserDetails.user.title || ""));
    setEditLocation(String(selectedUserDetails.user.location || ""));
    setEditBio(String(selectedUserDetails.user.bio || ""));
    setEditNotes(String(selectedUserDetails.user.notes || ""));
    setOldPassword(String(selectedUserDetails.user.plain_password || ""));
    setNewPassword("");
    setShowOldPassword(false);
    setShowNewPassword(false);
  }, [selectedUserDetails]);


  const handleSaveUserProfile = async () => {
    if (!selectedUserDetails) return;
    setSavingProfile(true);
    try {
      const payload: any = {
        name: editName,
        email: editEmail,
        title: editTitle,
        location: editLocation,
        bio: editBio,
        notes: editNotes,
      };
      if (newPassword.trim()) payload.password = newPassword.trim();
      await authService.updateUser(String(selectedUserDetails.user.id), payload);
      toast.success("User profile updated");
      await loadUserDetails(String(selectedUserDetails.user.id));
      await loadAll();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update user");
    } finally {
      setSavingProfile(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((row) =>
      [row.id, row.name, row.email, row.role, row.location, row.title]
        .map((v) => safeText(v).toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [users, search]);

  const filteredSessions = useMemo(() => {
    const q = search.toLowerCase();
    return sessions.filter((row) =>
      [row.user_name, row.user_email, row.device_name, row.browser, row.status, row.ip_address]
        .map((v) => safeText(v).toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [sessions, search]);

  const filteredSensors = useMemo(() => {
    const q = search.toLowerCase();
    return sensorRows.filter((row) =>
      [row.tenant_id, row.device_id, row.sensor_id, row.id]
        .map((v) => safeText(v).toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [sensorRows, search]);

  const filteredAudit = useMemo(() => {
    const q = search.toLowerCase();
    return auditRows.filter((row) =>
      [row.user_name, row.action, row.device, row.status, row.details]
        .map((v) => safeText(v).toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [auditRows, search]);

  const filteredOtp = useMemo(() => {
    const q = search.toLowerCase();
    return otpRows.filter((row) =>
      [row.contact, row.id]
        .map((v) => safeText(v).toLowerCase())
        .some((v) => v.includes(q)),
    );
  }, [otpRows, search]);

  const selectedUser = useMemo(
    () => users.find((u) => String(u.id) === String(selectedUserId)) || null,
    [users, selectedUserId],
  );

  const baseUserEvents = useMemo(() => {
    if (!selectedUserDetails) return [];
    const events: UserEvent[] = [];

    selectedUserDetails.sessions.forEach((s) => {
      const loginRaw = s.login_time ? new Date(String(s.login_time)) : null;
      if (loginRaw && !Number.isNaN(loginRaw.getTime())) {
        events.push({
          key: `session-login-${s.id}`,
          timeMs: loginRaw.getTime(),
          timestampText: String(s.login_time),
          dayKey: loginRaw.toISOString().slice(0, 10),
          dayLabel: formatDayLabel(loginRaw.toISOString()),
          timeLabel: loginRaw.toLocaleTimeString(),
          type: "LOGIN",
          title: String(s.status || "").toLowerCase() === "failed" ? "Login failed" : "Login",
          detail: `User login ${String(s.status || "").toLowerCase() === "failed" ? "failed" : "success"}`,
          device: safeText(s.device_name),
          browser: `${safeText(s.browser)} / ${safeText(s.os)}`,
          ip: safeText(s.ip_address),
        });
      }

      const logoutRaw = s.logout_time ? new Date(String(s.logout_time)) : null;
      if (logoutRaw && !Number.isNaN(logoutRaw.getTime())) {
        events.push({
          key: `session-logout-${s.id}`,
          timeMs: logoutRaw.getTime(),
          timestampText: String(s.logout_time),
          dayKey: logoutRaw.toISOString().slice(0, 10),
          dayLabel: formatDayLabel(logoutRaw.toISOString()),
          timeLabel: logoutRaw.toLocaleTimeString(),
          type: "LOGOUT",
          title: "Logout",
          detail: "User logged out",
          device: safeText(s.device_name),
          browser: `${safeText(s.browser)} / ${safeText(s.os)}`,
          ip: safeText(s.ip_address),
        });
      }
    });

    selectedUserDetails.audit_logs.forEach((a) => {
      const raw = a.timestamp ? new Date(String(a.timestamp)) : null;
      if (!raw || Number.isNaN(raw.getTime())) return;
      const action = String(a.action || "ACTION");
      const status = String(a.status || "");
      events.push({
        key: `audit-${a.id}`,
        timeMs: raw.getTime(),
        timestampText: String(a.timestamp),
        dayKey: raw.toISOString().slice(0, 10),
        dayLabel: formatDayLabel(raw.toISOString()),
        timeLabel: raw.toLocaleTimeString(),
        type: status.toLowerCase() === "failed" ? "ERROR" : "ACTION",
        title: action,
        detail: safeText(a.details),
        device: safeText(a.device),
      });
    });

    selectedUserDetails.sensor_data.forEach((sd) => {
      const raw = sd.timestamp ? new Date(String(sd.timestamp)) : null;
      if (!raw || Number.isNaN(raw.getTime())) return;
      events.push({
        key: `sensor-${sd.id}`,
        timeMs: raw.getTime(),
        timestampText: String(sd.timestamp),
        dayKey: raw.toISOString().slice(0, 10),
        dayLabel: formatDayLabel(raw.toISOString()),
        timeLabel: raw.toLocaleTimeString(),
        type: "SENSOR",
        title: `Sensor update (${safeText(sd.sensor_id)})`,
        detail: `Device ${safeText(sd.device_id)} | Pressure ${safeText(sd.pressure)} | Flow ${safeText(sd.flow_rate)}`,
        device: safeText(sd.device_id),
      });
    });

    return events;
  }, [selectedUserDetails]);

  const groupedUserEvents = useMemo(() => {
    if (!baseUserEvents.length) return [];
    const searchQ = eventSearch.trim().toLowerCase();
    const startMs = startDateTime ? new Date(startDateTime).getTime() : 0;
    const endMs = endDateTime ? new Date(endDateTime).getTime() : Number.MAX_SAFE_INTEGER;

    const filtered = baseUserEvents
      .filter((e) => e.timeMs >= startMs && e.timeMs <= endMs)
      .filter((e) => eventTypeFilter === "all" || e.type === eventTypeFilter)
      .filter((e) => {
        if (!searchQ) return true;
        const hay = `${e.title} ${e.detail} ${e.device || ""} ${e.browser || ""} ${e.ip || ""}`.toLowerCase();
        return hay.includes(searchQ);
      })
      .sort((a, b) => b.timeMs - a.timeMs);

    const grouped = new Map<string, UserEvent[]>();
    filtered.forEach((event) => {
      if (!grouped.has(event.dayKey)) grouped.set(event.dayKey, []);
      grouped.get(event.dayKey)!.push(event);
    });

    return Array.from(grouped.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([dayKey, dayEvents]) => ({
        dayKey,
        dayLabel: dayEvents[0]?.dayLabel || dayKey,
        events: dayEvents,
      }));
  }, [baseUserEvents, eventSearch, eventTypeFilter, startDateTime, endDateTime]);

  const handleExportUserEvents = async (format: "csv" | "pdf") => {
    if (!selectedUserDetails) {
      toast.error("Export Failed", { description: "Select a user to export." });
      return;
    }
    if (selectedExportTypes.length === 0) {
      toast.error("Export Failed", { description: "Please select at least one data type." });
      return;
    }
    const searchQ = eventSearch.trim().toLowerCase();
    const startMs = startDateTime ? new Date(startDateTime).getTime() : 0;
    const endMs = endDateTime ? new Date(endDateTime).getTime() : Number.MAX_SAFE_INTEGER;
    const events = baseUserEvents
      .filter((e) => e.timeMs >= startMs && e.timeMs <= endMs)
      .filter((e) => selectedExportTypes.includes(e.type))
      .filter((e) => {
        if (!searchQ) return true;
        const hay = `${e.title} ${e.detail} ${e.device || ""} ${e.browser || ""} ${e.ip || ""}`.toLowerCase();
        return hay.includes(searchQ);
      })
      .sort((a, b) => b.timeMs - a.timeMs);

    if (!events.length) {
      toast.error("Export Failed", { description: "No events found for selected filters." });
      return;
    }

    const headerLines = [
      ["Report", "User Timeline Export"],
      ["User", safeText(selectedUserDetails.user.name)],
      ["User ID", safeText(selectedUserDetails.user.id)],
      ["Date Range", `${startDateTime || "-"} to ${endDateTime || "-"}`],
      ["Selected Types", selectedExportTypes.join(" | ")],
      [],
      ["timestamp", "type", "title", "detail", "device", "browser", "ip"],
    ];

    const rows = events.map((e) => [
      safeText(e.timestampText),
      e.type,
      safeText(e.title),
      safeText(e.detail),
      safeText(e.device),
      safeText(e.browser),
      safeText(e.ip),
    ]);

    const csvBody = [...headerLines, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const filename = `user_${safeText(selectedUserDetails.user.id)}_events.${format}`;
    if (format === "pdf") {
      await downloadSimplePdf(filename, csvBody);
    } else {
      downloadTextFile(filename, csvBody, "text/csv;charset=utf-8");
    }
    toast.success("Export Successful", { description: `Downloaded ${filename}` });
  };

  const exportPreview = useMemo(() => {
    if (!selectedUserDetails) {
      return { count: 0, deviceIds: [] as string[] };
    }
    const searchQ = eventSearch.trim().toLowerCase();
    const startMs = startDateTime ? new Date(startDateTime).getTime() : 0;
    const endMs = endDateTime ? new Date(endDateTime).getTime() : Number.MAX_SAFE_INTEGER;
    const events = baseUserEvents
      .filter((e) => e.timeMs >= startMs && e.timeMs <= endMs)
      .filter((e) => selectedExportTypes.includes(e.type))
      .filter((e) => {
        if (!searchQ) return true;
        const hay = `${e.title} ${e.detail} ${e.device || ""} ${e.browser || ""} ${e.ip || ""}`.toLowerCase();
        return hay.includes(searchQ);
      });

    const deviceIds = Array.from(
      new Set(events.map((e) => safeText(e.device)).filter((v) => v && v !== "-"))
    );

    return { count: events.length, deviceIds };
  }, [selectedUserDetails, baseUserEvents, eventSearch, startDateTime, endDateTime, selectedExportTypes]);

  return (
    <div className="p-8 pb-24 space-y-8 text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Database Viewer</h1>
          <p className="text-muted-foreground mt-2">Admin-only read view for core database tables (users, sessions, sensors, logs, OTP).</p>
        </div>
        <Button variant="outline" onClick={loadAll} disabled={loading}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card className="bg-white/75 dark:bg-slate-900/70">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Users</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.users ?? "-"}</div></CardContent>
        </Card>
        <Card className="bg-white/75 dark:bg-slate-900/70">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Login Sessions</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.login_sessions ?? "-"}</div></CardContent>
        </Card>
        <Card className="bg-white/75 dark:bg-slate-900/70">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Sensor Data</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.sensor_data ?? "-"}</div></CardContent>
        </Card>
        <Card className="bg-white/75 dark:bg-slate-900/70">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Audit Logs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.audit_logs ?? "-"}</div></CardContent>
        </Card>
        <Card className="bg-white/75 dark:bg-slate-900/70">
          <CardHeader className="pb-2"><CardTitle className="text-sm">OTP Codes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{summary?.otp_codes ?? "-"}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <div className="relative md:col-span-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user/email/device/action..."
            className="pl-8"
          />
        </div>
        <Input aria-label="Start date and time" type="datetime-local" value={startDateTime} onChange={(e) => setStartDateTime(e.target.value)} />
        <Input aria-label="End date and time" type="datetime-local" value={endDateTime} onChange={(e) => setEndDateTime(e.target.value)} />
        <Button variant="outline" onClick={loadAll} disabled={loading}>
          Apply Filters
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <select
          className="h-11 rounded-md border border-slate-300 bg-background px-3 text-sm"
          value={selectedUserId}
          onChange={(e) => {
            setSelectedUserId(e.target.value);
            setTimeout(() => {
              loadAllWithQuery({ ...buildQuery(), userId: e.target.value });
            }, 0);
          }}
        >
          <option value="" disabled>
            Select user
          </option>
          {users.map((u) => (
            <option key={String(u.id)} value={String(u.id)}>
              {safeText(u.name)} ({safeText(u.email)})
            </option>
          ))}
        </select>

        <select
          className="h-11 rounded-md border border-slate-300 bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All status</option>
          <option value="success">SUCCESS</option>
          <option value="failed">FAILED</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
          <option value="expired">expired</option>
        </select>

        <Button
          variant="outline"
          onClick={() => {
            setSearch("");
            setStartDateTime("");
            setEndDateTime("");
            setStatusFilter("all");
            loadAllWithQuery({ limit: 300 });
          }}
        >
          Clear Filters
        </Button>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-800">
        Viewing scoped data by user:
        {" "}
        <span className="font-semibold">
          {selectedUser ? `${safeText(selectedUser.name)} (${safeText(selectedUser.email)})` : "No user selected"}
        </span>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
        <TabsList className="h-auto flex-wrap gap-2 bg-slate-100/80 p-2 dark:bg-slate-800/70">
          <TabsTrigger className="text-sm" value="users">Users</TabsTrigger>
          <TabsTrigger className="text-sm" value="sessions">Login Sessions</TabsTrigger>
          <TabsTrigger className="text-sm" value="sensor">Sensor Data</TabsTrigger>
          <TabsTrigger className="text-sm" value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger className="text-sm" value="otp">OTP Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="max-h-[56vh] overflow-auto">
          <Table>
            <TableHeader className="bg-slate-100/90 dark:bg-slate-800/70"><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Location</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredUsers.slice(0, 300).map((row) => (
                <TableRow key={String(row.id)} className="border-b border-slate-200/70 dark:border-slate-700/70">
                  <TableCell className="font-mono text-xs">{safeText(row.id)}</TableCell>
                  <TableCell>{safeText(row.name)}</TableCell>
                  <TableCell>{safeText(row.email)}</TableCell>
                  <TableCell>{safeText(row.role)}</TableCell>
                  <TableCell>{safeText(row.location)}</TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-white border-slate-300 text-slate-800 hover:bg-slate-100"
                      onClick={() => loadUserDetails(row.id)}
                      disabled={loadingUserDetails}
                    >
                      View User Data
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="max-h-[56vh] overflow-auto">
          <Table>
            <TableHeader className="bg-slate-100/90 dark:bg-slate-800/70"><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Device</TableHead><TableHead>Browser</TableHead><TableHead>Status</TableHead><TableHead>Login Time</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredSessions.slice(0, 300).map((row) => (
                <TableRow key={String(row.id)} className="border-b border-slate-200/70 dark:border-slate-700/70">
                  <TableCell>{safeText(row.user_name)}</TableCell>
                  <TableCell>{safeText(row.user_email)}</TableCell>
                  <TableCell>{safeText(row.device_name)}</TableCell>
                  <TableCell>{`${safeText(row.browser)} / ${safeText(row.os)}`}</TableCell>
                  <TableCell>{safeText(row.status)}</TableCell>
                  <TableCell>{formatDate(row.login_time)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </TabsContent>

        <TabsContent value="sensor" className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="max-h-[56vh] overflow-auto">
          <Table>
            <TableHeader className="bg-slate-100/90 dark:bg-slate-800/70"><TableRow><TableHead>ID</TableHead><TableHead>Tenant</TableHead><TableHead>Device</TableHead><TableHead>Sensor</TableHead><TableHead>Pressure</TableHead><TableHead>Flow</TableHead><TableHead>Timestamp</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredSensors.slice(0, 300).map((row) => (
                <TableRow key={String(row.id)} className="border-b border-slate-200/70 dark:border-slate-700/70">
                  <TableCell className="font-mono text-xs">{safeText(row.id)}</TableCell>
                  <TableCell>{safeText(row.tenant_id)}</TableCell>
                  <TableCell>{safeText(row.device_id)}</TableCell>
                  <TableCell>{safeText(row.sensor_id)}</TableCell>
                  <TableCell>{safeText(row.pressure)}</TableCell>
                  <TableCell>{safeText(row.flow_rate)}</TableCell>
                  <TableCell>{formatDate(row.timestamp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="max-h-[56vh] overflow-auto">
          <Table>
            <TableHeader className="bg-slate-100/90 dark:bg-slate-800/70"><TableRow><TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Status</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredAudit.slice(0, 300).map((row) => (
                <TableRow key={String(row.id)} className="border-b border-slate-200/70 dark:border-slate-700/70">
                  <TableCell>{formatDate(row.timestamp)}</TableCell>
                  <TableCell>{safeText(row.user_name)}</TableCell>
                  <TableCell>{safeText(row.action)}</TableCell>
                  <TableCell>{safeText(row.device)}</TableCell>
                  <TableCell>{safeText(row.status)}</TableCell>
                  <TableCell>{safeText(row.details)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </TabsContent>

        <TabsContent value="otp" className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white/95 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <div className="max-h-[56vh] overflow-auto">
          <Table>
            <TableHeader className="bg-slate-100/90 dark:bg-slate-800/70"><TableRow><TableHead>ID</TableHead><TableHead>Contact (masked)</TableHead><TableHead>Created</TableHead><TableHead>Expires</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredOtp.slice(0, 300).map((row) => (
                <TableRow key={String(row.id)} className="border-b border-slate-200/70 dark:border-slate-700/70">
                  <TableCell className="font-mono text-xs">{safeText(row.id)}</TableCell>
                  <TableCell>{safeText(row.contact)}</TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                  <TableCell>{formatDate(row.expires_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </TabsContent>
      </Tabs>

      {selectedUserDetails && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 dark:bg-slate-950/90 px-4 py-8">
          <div
            ref={userDetailsRef}
            className="w-full max-w-6xl max-h-[90vh] overflow-y-auto space-y-4 rounded-xl border-2 border-emerald-300/60 bg-white p-5 text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-slate-100"
          >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                User Detail: {safeText(selectedUserDetails.user.name)}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {safeText(selectedUserDetails.user.email)} | role: {safeText(selectedUserDetails.user.role)} | user_id: {safeText(selectedUserDetails.user.id)}
              </p>
            </div>
            <Button variant="ghost" onClick={() => setSelectedUserDetails(null)} className="border border-slate-300 text-slate-700 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:text-white">
              Close
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-white border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-700 dark:text-slate-200">Login Sessions</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{selectedUserDetails.sessions.length}</div></CardContent>
            </Card>
            <Card className="bg-white border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-700 dark:text-slate-200">Sensor Records</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{selectedUserDetails.sensor_data.length}</div></CardContent>
            </Card>
            <Card className="bg-white border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-700 dark:text-slate-200">Audit Logs</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{selectedUserDetails.audit_logs.length}</div></CardContent>
            </Card>
            <Card className="bg-white border border-slate-200 dark:bg-slate-800/80 dark:border-slate-700">
              <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-700 dark:text-slate-200">Current Filter</CardTitle></CardHeader>
              <CardContent><div className="text-sm font-medium">{eventTypeFilter === "all" ? "All events" : eventTypeFilter}</div></CardContent>
            </Card>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/80">
            <h3 className="text-base font-semibold mb-3 text-slate-800 dark:text-slate-200">User Profile (View / Edit)</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <Input className={modalInputClass} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
              <Input className={modalInputClass} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" />
              <Input className={modalInputClass} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title/Role" />
              <Input className={modalInputClass} value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder="Location" />
              <Input className={modalInputClass} value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Bio" />
              <Input className={modalInputClass} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Admin notes" />
            </div>

            <div className="grid gap-3 md:grid-cols-2 mt-3">
              <div className="relative">
                <Input
                  value={oldPassword}
                  readOnly
                  type={showOldPassword ? "text" : "password"}
                  placeholder="Old password from DB"
                  className={`pr-10 ${modalInputClass}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 px-2"
                  onClick={() => setShowOldPassword((v) => !v)}
                >
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                {!oldPassword && (
                  <p className="mt-1 text-xs text-amber-600">
                    No old password stored for this user (common with social login/migrated account).
                  </p>
                )}
              </div>

              <div className="relative">
                <Input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Set new password (optional)"
                  className={`pr-10 ${modalInputClass}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 px-2"
                  onClick={() => setShowNewPassword((v) => !v)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <Button onClick={handleSaveUserProfile} disabled={savingProfile} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Save className="h-4 w-4 mr-2" />
                {savingProfile ? "Saving..." : "Save User Profile"}
              </Button>
            </div>
          </div>


          <div className="grid gap-3 md:grid-cols-6">
            <Input
              className={modalInputClass}
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder="Search in this user timeline..."
            />
            <select
              className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950/80 dark:text-slate-100"
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
            >
              <option value="all">All events</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="ACTION">ACTION</option>
              <option value="SENSOR">SENSOR</option>
              <option value="ERROR">ERROR</option>
            </select>
            <Input
              type="datetime-local"
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              aria-label="User timeline start date time"
              className={modalInputClass}
            />
            <Input
              type="datetime-local"
              value={endDateTime}
              onChange={(e) => setEndDateTime(e.target.value)}
              aria-label="User timeline end date time"
              className={modalInputClass}
            />
            <Button
              variant="outline"
              onClick={() => {
                setExpandedEventKey(null);
                if (selectedUserDetails) {
                  loadUserDetails(String(selectedUserDetails.user.id));
                }
              }}
              className="border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reload by Date
            </Button>
          </div>

          <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-500/40 dark:bg-emerald-500/10">
            <div className="flex flex-wrap items-center gap-3 mb-2 text-sm text-emerald-800 dark:text-emerald-100">
              <span className="font-semibold">Summary:</span>
              <span>{exportPreview.count} events</span>
              <span>Range: {startDateTime || "-"} to {endDateTime || "-"}</span>
              <span>Types: {selectedExportTypes.join(" / ") || "-"}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-emerald-700 dark:text-emerald-200">
              <span className="font-semibold">Device IDs:</span>
              {exportPreview.deviceIds.length ? exportPreview.deviceIds.join(", ") : "-"}
            </div>
            <div className="flex flex-wrap items-center gap-3">
            {["LOGIN", "LOGOUT", "ACTION", "SENSOR", "ERROR"].map((type) => {
              const checked = selectedExportTypes.includes(type);
              return (
                <label key={type} className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-100">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      setSelectedExportTypes((prev) =>
                        prev.includes(type)
                          ? prev.filter((v) => v !== type)
                          : [...prev, type]
                      );
                    }}
                  />
                  {type}
                </label>
              );
            })}
              <div className="flex flex-wrap gap-2 ml-auto">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => handleExportUserEvents("csv")}>
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={() => handleExportUserEvents("pdf")}>
                  <FileText className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>

          <div
            className="space-y-4 max-h-[60vh] overflow-y-scroll overscroll-contain touch-pan-y pr-1"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {groupedUserEvents.length === 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                No events found for this user in selected filters.
              </div>
            )}
            {groupedUserEvents.map((group) => (
              <div key={group.dayKey} className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
                <div className="border-b border-slate-200 bg-slate-100/80 px-4 py-2 text-base font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100">
                  {group.dayLabel}
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {group.events.map((ev) => (
                    <div key={ev.key} className="px-4 py-3">
                      <button
                        className="w-full text-left"
                        onClick={() => setExpandedEventKey((prev) => (prev === ev.key ? null : ev.key))}
                      >
                        <div className="grid gap-2 md:grid-cols-[120px_180px_1fr]">
                          <div className="font-mono text-sm text-slate-600 dark:text-slate-300">{ev.timeLabel}</div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{ev.type}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-300">{ev.title}</div>
                        </div>
                      </button>
                      {expandedEventKey === ev.key && (
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200">
                          <div><span className="font-semibold">Time:</span> {formatDate(ev.timestampText)}</div>
                          <div><span className="font-semibold">Detail:</span> {ev.detail}</div>
                          <div><span className="font-semibold">Device:</span> {safeText(ev.device)}</div>
                          <div><span className="font-semibold">Browser/OS:</span> {safeText(ev.browser)}</div>
                          <div><span className="font-semibold">IP:</span> {safeText(ev.ip)}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
        <Database className="h-3.5 w-3.5" />
        Read-only admin view. No data writes are performed from this screen.
      </p>
    </div>
  );
}
