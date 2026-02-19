import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const waterMetricsData = [
  { date: "Jan 18", ph: 7.1, oxygen: 6.5, ec: 1.6, cost: 145, temperature: 26.5 },
  { date: "Jan 19", ph: 7.2, oxygen: 6.8, ec: 1.7, cost: 152, temperature: 27.0 },
  { date: "Jan 20", ph: 6.9, oxygen: 6.2, ec: 1.5, cost: 148, temperature: 25.8 },
  { date: "Jan 21", ph: 7.4, oxygen: 7.1, ec: 1.8, cost: 155, temperature: 26.2 },
  { date: "Jan 22", ph: 7.1, oxygen: 6.9, ec: 1.6, cost: 160, temperature: 27.5 },
  { date: "Jan 23", ph: 7.3, oxygen: 7.0, ec: 1.7, cost: 158, temperature: 28.0 },
  { date: "Jan 24", ph: 7.2, oxygen: 6.8, ec: 1.7, cost: 165, temperature: 27.2 },
];

const chemicalData = [
  { date: "Jan 18", nitrogen: 12, phosphorus: 8 },
  { date: "Jan 19", nitrogen: 14, phosphorus: 9 },
  { date: "Jan 20", nitrogen: 11, phosphorus: 7 },
  { date: "Jan 21", nitrogen: 13, phosphorus: 8 },
  { date: "Jan 22", nitrogen: 15, phosphorus: 10 },
  { date: "Jan 23", nitrogen: 14, phosphorus: 9 },
  { date: "Jan 24", nitrogen: 13, phosphorus: 8 },
];

export function MetricsChart() {
  return (
    <Card className="bg-card/50 border-border backdrop-blur-xl shadow-lg">
      <CardHeader>
        <CardTitle className="text-foreground">Water Quality Analytics</CardTitle>
        <CardDescription className="text-muted-foreground">Real-time trends: pH, Oxygen, EC vs Operational Cost</CardDescription>
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
                    domain={[0, 10]}
                    label={{ value: 'Value (pH/DO/EC/Temp)', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    fontWeight={500}
                    tickLine={false}
                    axisLine={false}
                    label={{ value: 'Cost (THB)', angle: 90, position: 'insideRight', fill: 'hsl(var(--muted-foreground))' }}
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