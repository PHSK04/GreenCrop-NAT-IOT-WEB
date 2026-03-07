import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { AlertTriangle, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: 'Passing', value: 23, color: '#10B981' },
  { name: 'Warnings', value: 5, color: '#F59E0B' },
  { name: 'Critical', value: 2, color: '#EF4444' },
];

const issues = [
  { type: "Critical", count: 2, color: "text-red-400", bgColor: "bg-red-500/10", icon: XCircle },
  { type: "Warnings", count: 5, color: "text-amber-400", bgColor: "bg-amber-500/10", icon: AlertTriangle },
  { type: "Passing", count: 23, color: "text-emerald-400", bgColor: "bg-emerald-500/10", icon: CheckCircle },
];

export function OptimizationDonut() {
  const score = 74;

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-lg h-full">
      <CardHeader className="pb-6">
        <CardTitle className="text-xl font-bold text-slate-400">Site Optimization Score</CardTitle>
        <CardDescription className="text-slate-400 font-medium">
          LLM visibility optimization status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Donut Chart */}
        <div className="relative">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "12px",
                    boxShadow: "rgba(0, 0, 0, 0.4) 0px 8px 24px",
                    fontWeight: 500,
                    color: "#f8fafc"
                  }}
                  itemStyle={{ color: '#f8fafc' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-slate-400 mb-1">{score}%</div>
              <div className="text-sm font-medium text-slate-400">Overall Score</div>
            </div>
          </div>
        </div>

        {/* Issues Breakdown */}
        <div className="space-y-4">
          {issues.map((issue) => {
            const Icon = issue.icon;
            return (
              <div key={issue.type} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-800/50">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-xl ${issue.bgColor} flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${issue.color}`} />
                  </div>
                  <span className="text-sm font-semibold text-slate-400">{issue.type}</span>
                </div>
                <Badge className="bg-slate-700 text-slate-400 border-slate-600 font-bold px-3 py-1">
                  {issue.count}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Priority Action */}
        <div className="pt-6 border-t border-slate-800">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-400 mb-2">Highest Priority Action</h4>
              <p className="text-sm text-slate-400 font-medium">
                Optimize heading structure &amp; main content tags for better AI parsing
              </p>
            </div>
            <button className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm font-medium text-slate-400 transition-colors bg-transparent border rounded-lg border-slate-800 hover:bg-slate-800 hover:text-white group">
              View All Actions
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}