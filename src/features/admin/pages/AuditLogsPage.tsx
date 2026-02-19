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
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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

      <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>User / Source</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Device / Target</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             {filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{log.user}</TableCell>
                    <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                            {log.action}
                        </Badge>
                    </TableCell>
                    <TableCell>{log.device}</TableCell>
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
                    <TableCell className="text-muted-foreground text-sm">{log.details}</TableCell>
                </TableRow>
             ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
