import { useEffect, useMemo, useState } from "react";
import {
  AdminDbAuditRow,
  AdminDbOtpRow,
  AdminDbSensorRow,
  AdminDbSessionRow,
  AdminDbSummary,
  AdminDbUserDetails,
  AdminDbUserRow,
  authService,
} from "@/features/auth/services/authService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Database, RefreshCcw, Search } from "lucide-react";
import { toast } from "sonner";

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

export function DatabaseViewerPage() {
  const [summary, setSummary] = useState<AdminDbSummary | null>(null);
  const [users, setUsers] = useState<AdminDbUserRow[]>([]);
  const [sessions, setSessions] = useState<AdminDbSessionRow[]>([]);
  const [sensorRows, setSensorRows] = useState<AdminDbSensorRow[]>([]);
  const [auditRows, setAuditRows] = useState<AdminDbAuditRow[]>([]);
  const [otpRows, setOtpRows] = useState<AdminDbOtpRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<AdminDbUserDetails | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("users");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, u, ls, sd, al, otp] = await Promise.all([
        authService.getAdminDbSummary(),
        authService.getAdminDbUsers(),
        authService.getAdminDbLoginSessions(),
        authService.getAdminDbSensorData(),
        authService.getAdminDbAuditLogs(),
        authService.getAdminDbOtpCodes(),
      ]);
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

  useEffect(() => {
    loadAll();
  }, []);

  const loadUserDetails = async (userId: string | number) => {
    setLoadingUserDetails(true);
    try {
      const details = await authService.getAdminDbUserDetails(String(userId));
      setSelectedUserDetails(details);
      toast.success(`Loaded data for ${details.user.name}`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load user-specific data");
    } finally {
      setLoadingUserDetails(false);
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

  return (
    <div className="p-8 space-y-8 text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">
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

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search current table..."
          className="pl-8"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ActiveTab)}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="sessions">Login Sessions</TabsTrigger>
          <TabsTrigger value="sensor">Sensor Data</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="otp">OTP Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="overflow-hidden rounded-xl border bg-white/85 dark:bg-slate-900/70">
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Location</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredUsers.slice(0, 300).map((row) => (
                <TableRow key={String(row.id)}>
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
        </TabsContent>

        <TabsContent value="sessions" className="overflow-hidden rounded-xl border bg-white/85 dark:bg-slate-900/70">
          <Table>
            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Device</TableHead><TableHead>Browser</TableHead><TableHead>Status</TableHead><TableHead>Login Time</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredSessions.slice(0, 300).map((row) => (
                <TableRow key={String(row.id)}>
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
        </TabsContent>

        <TabsContent value="sensor" className="overflow-hidden rounded-xl border bg-white/85 dark:bg-slate-900/70">
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Tenant</TableHead><TableHead>Device</TableHead><TableHead>Sensor</TableHead><TableHead>Pressure</TableHead><TableHead>Flow</TableHead><TableHead>Timestamp</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredSensors.slice(0, 300).map((row) => (
                <TableRow key={String(row.id)}>
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
        </TabsContent>

        <TabsContent value="audit" className="overflow-hidden rounded-xl border bg-white/85 dark:bg-slate-900/70">
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>User</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Status</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredAudit.slice(0, 300).map((row) => (
                <TableRow key={String(row.id)}>
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
        </TabsContent>

        <TabsContent value="otp" className="overflow-hidden rounded-xl border bg-white/85 dark:bg-slate-900/70">
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Contact (masked)</TableHead><TableHead>Created</TableHead><TableHead>Expires</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredOtp.slice(0, 300).map((row) => (
                <TableRow key={String(row.id)}>
                  <TableCell className="font-mono text-xs">{safeText(row.id)}</TableCell>
                  <TableCell>{safeText(row.contact)}</TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                  <TableCell>{formatDate(row.expires_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {selectedUserDetails && (
        <div className="space-y-4 rounded-xl border bg-white/90 p-4 dark:bg-slate-900/70">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                User Detail View: {safeText(selectedUserDetails.user.name)}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {safeText(selectedUserDetails.user.email)} | role: {safeText(selectedUserDetails.user.role)} | user_id: {safeText(selectedUserDetails.user.id)}
              </p>
            </div>
            <Button variant="ghost" onClick={() => setSelectedUserDetails(null)}>Close</Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-white/85 dark:bg-slate-900/70">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Login Sessions</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{selectedUserDetails.sessions.length}</div></CardContent>
            </Card>
            <Card className="bg-white/85 dark:bg-slate-900/70">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Sensor Records</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{selectedUserDetails.sensor_data.length}</div></CardContent>
            </Card>
            <Card className="bg-white/85 dark:bg-slate-900/70">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Audit Logs</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{selectedUserDetails.audit_logs.length}</div></CardContent>
            </Card>
          </div>

          <Tabs defaultValue="userSessions">
            <TabsList>
              <TabsTrigger value="userSessions">User Sessions</TabsTrigger>
              <TabsTrigger value="userSensor">User Sensor Data</TabsTrigger>
              <TabsTrigger value="userAudit">User Audit Logs</TabsTrigger>
            </TabsList>
            <TabsContent value="userSessions" className="overflow-hidden rounded-lg border bg-white/90 dark:bg-slate-900/60">
              <Table>
                <TableHeader><TableRow><TableHead>Login Time</TableHead><TableHead>Device</TableHead><TableHead>Browser</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedUserDetails.sessions.slice(0, 120).map((row) => (
                    <TableRow key={`us-${row.id}`}>
                      <TableCell>{formatDate(row.login_time)}</TableCell>
                      <TableCell>{safeText(row.device_name)}</TableCell>
                      <TableCell>{`${safeText(row.browser)} / ${safeText(row.os)}`}</TableCell>
                      <TableCell>{safeText(row.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="userSensor" className="overflow-hidden rounded-lg border bg-white/90 dark:bg-slate-900/60">
              <Table>
                <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Device</TableHead><TableHead>Sensor</TableHead><TableHead>Pressure</TableHead><TableHead>Flow</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedUserDetails.sensor_data.slice(0, 120).map((row) => (
                    <TableRow key={`ud-${row.id}`}>
                      <TableCell>{formatDate(row.timestamp)}</TableCell>
                      <TableCell>{safeText(row.device_id)}</TableCell>
                      <TableCell>{safeText(row.sensor_id)}</TableCell>
                      <TableCell>{safeText(row.pressure)}</TableCell>
                      <TableCell>{safeText(row.flow_rate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
            <TabsContent value="userAudit" className="overflow-hidden rounded-lg border bg-white/90 dark:bg-slate-900/60">
              <Table>
                <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Target</TableHead><TableHead>Status</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedUserDetails.audit_logs.slice(0, 120).map((row) => (
                    <TableRow key={`ua-${row.id}`}>
                      <TableCell>{formatDate(row.timestamp)}</TableCell>
                      <TableCell>{safeText(row.action)}</TableCell>
                      <TableCell>{safeText(row.device)}</TableCell>
                      <TableCell>{safeText(row.status)}</TableCell>
                      <TableCell>{safeText(row.details)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <p className="text-xs text-muted-foreground inline-flex items-center gap-2">
        <Database className="h-3.5 w-3.5" />
        Read-only admin view. No data writes are performed from this screen.
      </p>
    </div>
  );
}
