import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MinimalDatePicker } from "./ui/minimal-date-picker";
import { MinimalMonthPicker } from "./ui/minimal-month-picker";
import { useMachine } from "@/contexts/MachineContext";

const formatDateKey = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function MetricsChart() {
  const { telemetryHistory } = useMachine();
  const [selectedMonth, setSelectedMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const waterMetricsData = useMemo(() => {
    const groups = new Map<string, typeof telemetryHistory>();
    telemetryHistory.forEach((row) => {
      const day = formatDateKey(row.timestamp);
      if (!day) return;
      if (selectedMonth && !day.startsWith(selectedMonth)) return;
      if (startDate && day < startDate) return;
      if (endDate && day > endDate) return;
      const rows = groups.get(day) ?? [];
      rows.push(row);
      groups.set(day, rows);
    });

    const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
    const visibleGroups = selectedMonth || startDate || endDate ? sortedGroups : sortedGroups.slice(-14);

    return visibleGroups.map(([day, rows]) => {
        const validPh = rows.map((row) => row.phValue).filter((value) => value > 0);
        const validEc = rows.map((row) => row.ecValue).filter((value) => value > 0);
        const validTemp = rows.map((row) => row.tempValue).filter((value) => value > 0);
        return {
          date: new Date(`${day}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }),
          ph: Number(average(validPh).toFixed(2)),
          oxygen: Number((average(validPh) > 0 ? Math.max(0, 14 - average(validPh)) : 0).toFixed(2)),
          ec: Number(average(validEc).toFixed(2)),
          temperature: Number(average(validTemp).toFixed(1)),
          cost: rows.length,
        };
      });
  }, [endDate, selectedMonth, startDate, telemetryHistory]);

  const chemicalData = useMemo(
    () =>
      waterMetricsData.map((row) => ({
        date: row.date,
        nitrogen: Number((row.ec * 8).toFixed(2)),
        phosphorus: Number((row.ec * 5).toFixed(2)),
      })),
    [waterMetricsData],
  );

  return (
    <Card className="bg-card/50 border-border backdrop-blur-xl shadow-lg">
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="text-foreground">Water Quality Analytics</CardTitle>
            <CardDescription className="text-muted-foreground">
              ค่าเฉลี่ยรายวันจากข้อมูลจริง เลือกช่วงวัน/เดือนได้
            </CardDescription>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:w-[620px]">
            <MinimalMonthPicker ariaLabel="Chart month" value={selectedMonth} onChange={setSelectedMonth} />
            <MinimalDatePicker ariaLabel="Chart start date" value={startDate} onChange={setStartDate} />
            <MinimalDatePicker ariaLabel="Chart end date" value={endDate} onChange={setEndDate} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="quality" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/50 border border-border/50">
            <TabsTrigger 
              value="quality" 
              className="text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground hover:text-foreground transition-colors"
            >
              Water Quality Metrics
            </TabsTrigger>
            <TabsTrigger 
              value="chemical" 
              className="text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-muted-foreground hover:text-foreground transition-colors"
            >
              Nutrient Balance
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="quality" className="space-y-4">
            <div className="h-80">
              {waterMetricsData.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  รอข้อมูลจริงจาก MQTT เพื่อคำนวณค่าเฉลี่ยรายวัน
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waterMetricsData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    yAxisId="left"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, "auto"]}
                    label={{ value: 'Daily avg value', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Records/day', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      fontWeight: 500,
                      color: "hsl(var(--card-foreground))"
                    }}
                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="ph" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    dot={{ fill: "#6366f1", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, stroke: "#6366f1", strokeWidth: 2, fill: "hsl(var(--background))" }}
                    name="pH Value"
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="oxygen" 
                    stroke="#06b6d4" 
                    strokeWidth={3}
                    dot={{ fill: "#06b6d4", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, stroke: "#06b6d4", strokeWidth: 2, fill: "hsl(var(--background))" }}
                    name="Oxygen (DO)"
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="ec" 
                    stroke="#eab308" 
                    strokeWidth={3}
                    dot={{ fill: "#eab308", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, stroke: "#eab308", strokeWidth: 2, fill: "hsl(var(--background))" }}
                    name="Conductivity (EC)"
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    dot={{ fill: "#ef4444", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, stroke: "#ef4444", strokeWidth: 2, fill: "hsl(var(--background))" }}
                    name="Water Temperature"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#10b981", strokeWidth: 0, r: 4 }}
                    activeDot={{ r: 6, stroke: "#10b981", strokeWidth: 2, fill: "hsl(var(--background))" }}
                    name="Op. Cost"
                  />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="chemical" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chemicalData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      fontWeight: 500,
                      color: "hsl(var(--card-foreground))"
                    }}
                    cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Line 
                    type="monotone" 
                    dataKey="nitrogen" 
                    stroke="#d8b4fe" 
                    strokeWidth={3}
                    dot={{ fill: "#d8b4fe", strokeWidth: 0, r: 5 }}
                    activeDot={{ r: 7, stroke: "#d8b4fe", strokeWidth: 2, fill: "hsl(var(--background))" }}
                    name="Nitrogen"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="phosphorus" 
                    stroke="#fb923c" 
                    strokeWidth={3}
                    dot={{ fill: "#fb923c", strokeWidth: 0, r: 5 }}
                    activeDot={{ r: 7, stroke: "#fb923c", strokeWidth: 2, fill: "hsl(var(--background))" }}
                    name="Phosphorus"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
