import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ArrowUpRight, TrendingUp, TrendingDown, Crown } from "lucide-react";

const competitors = [
  {
    rank: 1,
    name: "AI8 Digital",
    logo: "A8",
    score: 8.4,
    change: "+0.3",
    trend: "up",
    isYou: true,
    gradient: "from-blue-600 to-cyan-500"
  },
  {
    rank: 2,
    name: "TechCorp Solutions",
    logo: "TC",
    score: 7.9,
    change: "-0.1",
    trend: "down",
    isYou: false,
    gradient: "from-purple-500 to-purple-600"
  },
  {
    rank: 3,
    name: "InnovateLabs",
    logo: "IL",
    score: 7.6,
    change: "+0.2",
    trend: "up",
    isYou: false,
    gradient: "from-indigo-500 to-indigo-600"
  },
  {
    rank: 4,
    name: "NextGen Analytics",
    logo: "NG",
    score: 7.2,
    change: "0.0",
    trend: "neutral",
    isYou: false,
    gradient: "from-orange-500 to-orange-600"
  },
  {
    rank: 5,
    name: "DataWise Pro",
    logo: "DW",
    score: 6.8,
    change: "-0.4",
    trend: "down",
    isYou: false,
    gradient: "from-red-500 to-red-600"
  },
];

export function CompetitorRanking() {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "up":
        return "text-emerald-400";
      case "down":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-lg h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-8">
        <div>
          <CardTitle className="text-xl font-bold text-slate-400">Competitor Ranking</CardTitle>
          <CardDescription className="text-slate-400 font-medium">
            How you rank against key competitors in AI visibility
          </CardDescription>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 transition-colors bg-transparent border rounded-lg border-slate-800 hover:bg-slate-800 hover:text-white">
          View Full Report
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-4">
        {competitors.map((competitor) => (
          <div
            key={competitor.rank}
            className={`p-5 rounded-xl border transition-all duration-200 ${competitor.isYou
                ? "border-blue-500/30 bg-blue-500/5 shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                : "border-slate-800/50 bg-slate-800/30 hover:bg-slate-800/50"
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-4">
                  {competitor.rank === 1 && (
                    <Crown className="w-6 h-6 text-amber-400" />
                  )}
                  <div className={`
                    w-12 h-12 rounded-2xl bg-gradient-to-br ${competitor.gradient} 
                    flex items-center justify-center shadow-lg
                  `}>
                    <span className="text-white font-bold text-sm">{competitor.logo}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-slate-400 text-lg">
                      #{competitor.rank} {competitor.name}
                    </span>
                    {competitor.isYou && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-bold border">You</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="text-sm text-slate-400 font-medium">Score: </span>
                    <span className="text-sm font-bold text-slate-400">{competitor.score}</span>
                    <div className="flex items-center space-x-1">
                      {getTrendIcon(competitor.trend)}
                      <span className={`text-sm font-bold ${getTrendColor(competitor.trend)}`}>
                        {competitor.change}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}