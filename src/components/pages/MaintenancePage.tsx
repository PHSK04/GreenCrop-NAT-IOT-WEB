import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { AlertTriangle, CheckCircle, Droplets, Wrench, History, Plus, AlertOctagon, FileText } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const healthData = [
  { name: 'Operational', value: 95, color: '#10b981' },
  { name: 'Issues', value: 5, color: '#ef4444' },
];

const incidents = [
  { id: 1, title: "UV Lamp B3 Failure", location: "Water Tank 2", severity: "Critical", time: "2 hours ago", status: "Pending" },
  { id: 2, title: "Filter Clog Warning", location: "Input Pipe A", severity: "Warning", time: "5 hours ago", status: "Investigating" },
];

const maintenanceLogs = [
  { id: 1, action: "Refilled Nutrient A (5L)", target: "Mixing Tank 1", user: "Admin", time: "10 mins ago", type: "refill" },
  { id: 2, action: "Added pH Down (2L)", target: "Main Reservoir", user: "System Auto", time: "1 hour ago", type: "refill" },
  { id: 3, action: "Cleaned EC Sensor Probe", target: "Sensor Node 2", user: "Tech Team", time: "Yesterday", type: "maintenance" },
  { id: 4, action: "Refilled Nutrient B (5L)", target: "Mixing Tank 1", user: "Admin", time: "Yesterday", type: "refill" },
];

export function MaintenancePage() {
  return (
    <>
      <header className="bg-card/50 border-b border-border px-8 py-6 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Wrench className="w-6 h-6 text-amber-500" />
              System Maintenance
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Operational status, damage reports, and refill logs</p>
          </div>
          <Button className="bg-red-600 hover:bg-red-700 text-white gap-2">
            <AlertOctagon className="w-4 h-4" />
            Report Issue
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-8 ">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* System Health Score */}
          <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-foreground">System Health</CardTitle>
              <CardDescription className="text-muted-foreground">Overall Operational Status</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center relative">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={healthData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {healthData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center flex-col mt-4 pointer-events-none">
                  <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">95%</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">Normal</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full mt-4">
                 <div className="text-center p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">28</div>
                    <div className="text-xs text-muted-foreground">Active Nodes</div>
                 </div>
                 <div className="text-center p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">2</div>
                    <div className="text-xs text-muted-foreground">Issues</div>
                 </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Incidents */}
          <Card className="lg:col-span-2 rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Active Incidents
              </CardTitle>
              <CardDescription className="text-muted-foreground">Current equipment failures and warnings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {incidents.map((incident) => (
                  <div key={incident.id} className="flex items-center justify-between p-4 bg-muted/40 rounded-lg border border-border hover:border-slate-400 dark:hover:border-slate-600 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${incident.severity === 'Critical' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                        <AlertOctagon className={`w-6 h-6 ${incident.severity === 'Critical' ? 'text-red-500' : 'text-amber-500'}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground group-hover:text-blue-500 transition-colors">{incident.title}</h4>
                        <p className="text-sm text-muted-foreground">{incident.location} • {incident.time}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`${incident.severity === 'Critical' ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-amber-500 text-amber-600 dark:text-amber-400'}`}>
                      {incident.status}
                    </Badge>
                  </div>
                ))}
                 {incidents.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">No active incidents. System is healthy.</div>
                 )}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Refill & Maintenance Logs */}
        <div className="mt-8">
            <Card className="rounded-xl border border-border shadow-lg bg-card/50 backdrop-blur-md">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <History className="w-5 h-5 text-blue-500" />
                            Refill & Maintenance Logs
                        </CardTitle>
                        <CardDescription className="text-muted-foreground">History of nutrient refills and system repairs</CardDescription>
                    </div>
                    <Button variant="outline" className="border-border text-muted-foreground hover:bg-muted">
                        <FileText className="w-4 h-4 mr-2" />
                        Export Log
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        {maintenanceLogs.map((log) => (
                            <div key={log.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${log.type === 'refill' ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                                        {log.type === 'refill' ? <Droplets className="w-4 h-4 text-emerald-500" /> : <Wrench className="w-4 h-4 text-blue-500" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{log.action}</p>
                                        <p className="text-xs text-muted-foreground">{log.target} • {log.user}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-muted-foreground">{log.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      </main>
    </>
  );
}