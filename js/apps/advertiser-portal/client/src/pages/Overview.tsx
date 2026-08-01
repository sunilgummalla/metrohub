import { PortalLayout } from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { BarChart3, MousePointerClick, Eye, TrendingUp, Layers, ArrowRight, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";
import { startLogin } from "@/const";
import { useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Mock weekly trend data for the overview chart
const MOCK_TREND = [
  { day: "Mon", impressions: 420 }, { day: "Tue", impressions: 580 },
  { day: "Wed", impressions: 510 }, { day: "Thu", impressions: 720 },
  { day: "Fri", impressions: 890 }, { day: "Sat", impressions: 1100 },
  { day: "Sun", impressions: 960 },
];

export default function Overview() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: stats, isLoading: statsLoading } = trpc.campaigns.stats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: liveData, isLoading: liveLoading } = trpc.presence.live.useQuery(undefined, { enabled: isAuthenticated, refetchInterval: 30000 });
  const { data: membership } = trpc.membership.currentTier.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/");
  }, [isAuthenticated, loading, navigate]);

  const totalLive = liveData?.reduce((s, p) => s + p.count, 0) ?? 0;

  const statCards = [
    { label: "Total Impressions", value: stats?.impressions ?? 0, icon: Eye, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Total Clicks", value: stats?.clicks ?? 0, icon: MousePointerClick, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Overall CTR", value: `${stats?.ctr ?? "0.00"}%`, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Active Campaigns", value: stats?.activeCampaigns ?? 0, icon: Layers, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <PortalLayout title="Overview">
      {/* Welcome banner */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-foreground text-lg mb-1">
            Welcome back{membership?.businessName ? `, ${membership.businessName}` : ""}
          </h2>
          <p className="text-sm text-muted-foreground">
            {totalLive > 0 ? (
              <><span className="font-semibold text-foreground">{totalLive.toLocaleString()}</span> players active on MetroHub right now</>
            ) : "Loading live audience data..."}
          </p>
        </div>
        {membership?.tier !== "pro" && (
          <Link href="/account">
            <Button size="sm" variant="outline" className="shrink-0 border-primary/30 text-primary hover:bg-primary hover:text-white">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />Upgrade to Pro
            </Button>
          </Link>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-border">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <Icon className={`w-4.5 h-4.5 ${color}`} />
                </div>
              </div>
              {statsLoading ? (
                <Skeleton className="h-7 w-20 mb-1" />
              ) : (
                <p className="font-display font-bold text-2xl text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Impressions trend */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />Impressions This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MOCK_TREND}>
                <defs>
                  <linearGradient id="impGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: 12 }} />
                <Area type="monotone" dataKey="impressions" stroke="var(--color-primary)" strokeWidth={2} fill="url(#impGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Live audience snapshot */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />Live Audience
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveLoading ? (
              <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : (
              <div className="space-y-2">
                {(liveData ?? []).map((p) => (
                  <div key={p.appName} className="flex items-center justify-between py-1.5">
                    <span className="text-sm font-medium text-foreground capitalize">{p.appName.replace(/-/g, " ")}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (p.count / Math.max(1, totalLive)) * 100 * 2)}%` }} />
                      </div>
                      <Badge variant="secondary" className="text-xs font-semibold min-w-[2.5rem] justify-center">{p.count}</Badge>
                    </div>
                  </div>
                ))}
                {(!liveData || liveData.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No live data yet</p>
                )}
              </div>
            )}
            <Link href="/audience">
              <Button variant="ghost" size="sm" className="w-full mt-4 text-primary hover:text-primary">
                View full heatmap <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}

