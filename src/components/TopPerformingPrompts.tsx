import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowUpRight, MessageSquare, BarChart3 } from "lucide-react";

const prompts = [
  {
    id: 1,
    text: "What are the best project management tools for remote teams?",
    score: 94,
    mentions: 1247,
    growth: "+23%",
    status: "trending"
  },
  {
    id: 2,
    text: "How to implement AI in customer service workflows?",
    score: 89,
    mentions: 892,
    growth: "+18%",
    status: "rising"
  },
  {
    id: 3,
    text: "Best practices for digital marketing automation",
    score: 85,
    mentions: 756,
    growth: "+15%",
    status: "stable"
  },
  {
    id: 4,
    text: "Software development lifecycle management tools",
    score: 82,
    mentions: 634,
    growth: "+12%",
    status: "rising"
  },
  {
    id: 5,
    text: "Cloud infrastructure security best practices",
    score: 78,
    mentions: 523,
    growth: "+8%",
    status: "stable"
  },
];

export function TopPerformingPrompts() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "trending":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30";
      case "rising":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-lg h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-8">
        <div>
          <CardTitle className="text-xl font-bold text-slate-400">Top Performing Prompts</CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            Prompts driving the highest visibility and mentions
          </CardDescription>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 transition-colors bg-transparent border rounded-lg border-slate-800 hover:bg-slate-800 hover:text-white">
          View All
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-5">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className="p-5 rounded-xl border border-slate-800/50 hover:bg-slate-800/50 transition-all duration-200 bg-slate-800/30"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 mr-4">
                <p className="text-sm font-semibold text-slate-400 leading-relaxed">
                  {prompt.text}
                </p>
              </div>
              <Badge className={`${getStatusColor(prompt.status)} font-semibold px-3 py-1 border`}>
                {prompt.status}
              </Badge>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400 font-medium">Score</span>
                    <span className="text-sm font-bold text-slate-400">{prompt.score}/100</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-400 font-medium">Mentions</span>
                    <span className="text-sm font-bold text-slate-400">{prompt.mentions.toLocaleString()}</span>
                  </div>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold px-3 py-1 border">
                  {prompt.growth}
                </Badge>
              </div>
              
              <div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${prompt.score}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}