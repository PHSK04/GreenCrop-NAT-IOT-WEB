import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Activity, Search, Filter, Download, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LogEntry {
  id: string;
  timestamp: number;
  user: string;
  action: string;
  device: string;
  status: 'success' | 'warning' | 'error';
  details: string;
}

// Mock Data
const MOCK_LOGS: LogEntry[] = [
  { id: '1', timestamp: Date.now() - 1000 * 60 * 5, user: 'Admin', action: 'TURN_ON', device: 'Water Pump A', status: 'success', details: 'Manual override' },
  { id: '2', timestamp: Date.now() - 1000 * 60 * 30, user: 'System', action: 'AUTO_OFF', device: 'Dehumidifier', status: 'success', details: 'Humidity reached target' },
  { id: '3', timestamp: Date.now() - 1000 * 60 * 60 * 2, user: 'phongsagonr', action: 'LOGIN', device: 'Web Portal', status: 'success', details: 'Login successful' },
  { id: '4', timestamp: Date.now() - 1000 * 60 * 60 * 5, user: 'System', action: 'ALERT', device: 'Sensor Node 1', status: 'warning', details: 'High temperature detected' },
  { id: '5', timestamp: Date.now() - 1000 * 60 * 60 * 24, user: 'Admin', action: 'UPDATE_CONFIG', device: 'System', status: 'success', details: 'Updated threshold values' },
];

export function AuditLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>(MOCK_LOGS);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLogs = logs.filter(log => 
    log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.device.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 space-y-8 text-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Device Activity & Audit Logs</h1>
          <p className="text-muted-foreground mt-2">Monitor user actions and device status changes.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLogs([...MOCK_LOGS, { id: Date.now().toString(), timestamp: Date.now(), user: 'System', action: 'REFRESH', device: 'Log Monitor', status: 'success', details: 'Manual refresh' }])}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Refresh
            </Button>
            <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search logs..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <Table className="text-sm">
          <TableHeader className="bg-red-600 dark:bg-red-700">
            <TableRow>
              <TableHead className="w-[180px] text-white font-semibold">Timestamp</TableHead>
              <TableHead className="text-white font-semibold">User / Source</TableHead>
              <TableHead className="text-white font-semibold">Action</TableHead>
              <TableHead className="text-white font-semibold">Device / Target</TableHead>
              <TableHead className="text-white font-semibold">Status</TableHead>
              <TableHead className="text-white font-semibold">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {filteredLogs.map((log) => (
                <TableRow key={log.id} className="border-b border-slate-200 last:border-b-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/40">
                    <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">{log.user}</TableCell>
                    <TableCell>
                        <Badge variant="outline" className="font-mono text-[11px] tracking-wide">
                            {log.action}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-slate-800 dark:text-slate-200">{log.device}</TableCell>
                    <TableCell>
                        <Badge variant={log.status === 'success' ? 'default' : log.status === 'warning' ? 'secondary' : 'destructive'} 
                               className={
                                   log.status === 'success' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                   log.status === 'warning' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                   ""
                               }>
                            {log.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{log.details}</TableCell>
                </TableRow>
             ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
