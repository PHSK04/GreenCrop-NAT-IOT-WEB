import { useState, useEffect } from "react";
import { User, Users, Activity, Server, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/features/auth/services/authService";
import { Progress } from "@/components/ui/progress";

export function AdminOverview() {
  const [userCount, setUserCount] = useState(0);
  const [adminCount, setAdminCount] = useState(0);

  useEffect(() => {
    authService.getAllUsers().then(users => {
      setUserCount(users.length);
      setAdminCount(users.filter(u => u.role === 'admin').length);
    });
  }, []);

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
            <p className="text-muted-foreground mt-2">Real-time system performance and user statistics.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
            <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{userCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">+12% from last month</p>
                </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Admins</CardTitle>
                    <User className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{adminCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">Security Level: High</p>
                </CardContent>
            </Card>

             <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">System Health</CardTitle>
                    <Activity className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-emerald-500">98.5%</div>
                    <p className="text-xs text-muted-foreground mt-1">Uptime: 24d 12h</p>
                </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20 backdrop-blur">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Database</CardTitle>
                    <Server className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">SQLite</div>
                    <p className="text-xs text-muted-foreground mt-1">Status: Connected</p>
                </CardContent>
            </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>System Load</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span>CPU Usage</span>
                            <span className="text-muted-foreground">45%</span>
                        </div>
                        <Progress value={45} className="h-2 bg-secondary" />
                    </div>
                     <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span>Memory</span>
                            <span className="text-muted-foreground">62%</span>
                        </div>
                        <Progress value={62} className="h-2 bg-secondary" />
                    </div>
                     <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span>Storage</span>
                            <span className="text-muted-foreground">23%</span>
                        </div>
                        <Progress value={23} className="h-2 bg-secondary" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-medium">New user registration</p>
                                    <p className="text-xs text-muted-foreground">2 minutes ago</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
