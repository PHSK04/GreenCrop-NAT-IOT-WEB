import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MinimalDatePicker } from "./ui/minimal-date-picker";
import { MinimalMonthPicker } from "./ui/minimal-month-picker";
import { useMachine } from "@/contexts/MachineContext";
import { AlertCircle, CalendarSearch, Database } from "lucide-react";

const formatDateKey = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateKeyFromDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateKeyOffset = (offsetDays: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return formatDateKeyFromDate(date);
};

const getCurrentMonthKey = () => getDateKeyOffset(0).slice(0, 7);

const addDaysToDateKey = (dateKey: string, offsetDays: number) => {
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  date.setDate(date.getDate() + offsetDays);
  return formatDateKeyFromDate(date);
};

const enumerateDateKeys = (startKey: string, endKey: string) => {
  const keys: string[] = [];
  if (!startKey || !endKey || startKey > endKey) return keys;

  let cursor = startKey;
  while (cursor <= endKey && keys.length < 370) {
    keys.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }
  return keys;
};

const getMonthEndKey = (monthKey: string) => {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return "";
  return formatDateKeyFromDate(new Date(year, month, 0));
};

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function MetricsChart() {
  const { telemetryHistory } = useMachine();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dismissedEmptyKey, setDismissedEmptyKey] = useState<string | null>(null);

  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    setStartDate("");
    setEndDate("");
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    if (value) setSelectedMonth("");
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    if (value) setSelectedMonth("");
  };

  const resetToCurrentMonth = () => {
    setSelectedMonth(getCurrentMonthKey());
    setStartDate("");
    setEndDate("");
  };

  const selectToday = () => {
    const todayKey = getDateKeyOffset(0);
    setSelectedMonth("");
    setStartDate(todayKey);
    setEndDate(todayKey);
  };

  const clearFilters = () => {
    setSelectedMonth("");
    setStartDate("");
    setEndDate("");
  };

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
    const groupedDays = sortedGroups.map(([day]) => day);
    const todayKey = getDateKeyOffset(0);
    let visibleDays: string[];

    if (selectedMonth) {
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = getMonthEndKey(selectedMonth);
      const boundedEnd = selectedMonth === todayKey.slice(0, 7) ? todayKey : monthEnd;
      visibleDays = enumerateDateKeys(monthStart, boundedEnd);
    } else if (startDate || endDate) {
      const endKey = endDate || todayKey;
      const startKey = startDate || groupedDays[0] || addDaysToDateKey(endKey, -13);
      visibleDays = enumerateDateKeys(startKey, endKey);
    } else {
      visibleDays = enumerateDateKeys(getDateKeyOffset(-13), todayKey);
    }

    return visibleDays.map((day) => {
      const rows = groups.get(day) ?? [];
      const validPh = rows.map((row) => row.phValue).filter((value) => value > 0);
      const validEc = rows.map((row) => row.ecValue).filter((value) => value > 0);
      const validTemp = rows.map((row) => row.tempValue).filter((value) => value > 0);
      const avgPh = average(validPh);
      const avgEc = average(validEc);
      const avgTemp = average(validTemp);
      return {
        date: new Date(`${day}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric" }),
        ph: validPh.length ? Number(avgPh.toFixed(2)) : null,
        oxygen: validPh.length ? Number(Math.max(0, 14 - avgPh).toFixed(2)) : null,
        ec: validEc.length ? Number(avgEc.toFixed(2)) : null,
        temperature: validTemp.length ? Number(avgTemp.toFixed(1)) : null,
        cost: rows.length,
      };
    });
  }, [endDate, selectedMonth, startDate, telemetryHistory]);

  const chemicalData = useMemo(
    () =>
      waterMetricsData.map((row) => ({
        date: row.date,
        nitrogen: row.ec == null ? null : Number((row.ec * 8).toFixed(2)),
        phosphorus: row.ec == null ? null : Number((row.ec * 5).toFixed(2)),
      })),
    [waterMetricsData],
  );

  const emptyKey = `${telemetryHistory.length}:${selectedMonth}:${startDate}:${endDate}`;
  const hasNoTelemetry = telemetryHistory.length === 0;
  const hasNoChartData = waterMetricsData.length === 0;
  const hasNoRecordsInRange = waterMetricsData.length > 0 && waterMetricsData.every((row) => row.cost === 0);
  const showEmptyDialog = hasNoChartData && dismissedEmptyKey !== emptyKey;
  const emptyTitle = hasNoTelemetry
    ? "ยังไม่มีข้อมูลคุณภาพน้ำในฐานข้อมูล"
    : "ไม่พบข้อมูลในช่วงวันที่เลือก";
  const emptyDescription = hasNoTelemetry
    ? "ระบบยังไม่พบข้อมูล telemetry จากอุปกรณ์ จึงไม่สามารถวาดกราฟ Water Quality Analytics ได้"
    : "ลองเลือกเดือนหรือช่วงวันที่ใหม่ เพราะช่วงนี้ยังไม่มีข้อมูลย้อนหลังให้แสดงผล";
  const EmptyIcon = hasNoTelemetry ? Database : CalendarSearch;

  const renderEmptyPanel = () => (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border bg-background/40 px-6 text-center">
      <div className="max-w-md space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <EmptyIcon className="h-6 w-6" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Dialog
        open={showEmptyDialog}
        onOpenChange={(open) => {
          if (!open) setDismissedEmptyKey(emptyKey);
        }}
      >
        <DialogContent className="bg-card border-border text-foreground sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="h-5 w-5 text-primary" />
              {emptyTitle}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {emptyDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            กราฟจะกลับมาแสดงอัตโนมัติเมื่อมีข้อมูลจริงจากอุปกรณ์ หรือจะแสดง Records/day = 0 ในวันที่ไม่มี packet เพื่อช่วยตรวจจับอุปกรณ์/เซิร์ฟเวอร์ขาดช่วง
          </div>
          <DialogFooter>
            <Button onClick={() => setDismissedEmptyKey(emptyKey)}>รับทราบ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-card/50 border-border backdrop-blur-xl shadow-lg">
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="text-foreground">Water Quality Analytics</CardTitle>
              <CardDescription className="text-muted-foreground">
                ค่าเฉลี่ยรายวันจากข้อมูลจริง เลือกช่วงวัน/เดือนได้
              </CardDescription>
            </div>
            <div className="space-y-2 lg:w-[720px]">
              <div className="grid gap-2 sm:grid-cols-3">
                <MinimalMonthPicker ariaLabel="Chart month" value={selectedMonth} onChange={handleMonthChange} />
                <MinimalDatePicker ariaLabel="Chart start date" value={startDate} onChange={handleStartDateChange} />
                <MinimalDatePicker ariaLabel="Chart end date" value={endDate} onChange={handleEndDateChange} />
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" size="sm" variant="default" onClick={selectToday}>
                  วันนี้
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={resetToCurrentMonth}>
                  เดือนนี้
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
                  14 วันล่าสุด
                </Button>
              </div>
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
              {hasNoRecordsInRange && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300">
                  ไม่มี packet จากเซ็นเซอร์ในช่วงวันที่นี้ กราฟจึงแสดง Records/day = 0 ทุกวันเพื่อใช้ตรวจจับปัญหา sensor/server
                </div>
              )}
              <div className="h-80">
                {hasNoChartData ? (
                  renderEmptyPanel()
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
                        name="Records/day"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </TabsContent>

            <TabsContent value="chemical" className="space-y-4">
              <div className="h-80">
                {hasNoChartData ? (
                  renderEmptyPanel()
                ) : (
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
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
