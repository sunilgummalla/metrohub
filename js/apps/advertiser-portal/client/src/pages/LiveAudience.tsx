import { PortalLayout } from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { Lock, TrendingUp, RefreshCw } from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const APP_COLORS: Record<string, string> = {
  poker: "#4338ca", rummy: "#0891b2", tambola: "#059669", bingo: "#d97706",
  shell: "#7c3aed", default: "#6b7280",
};

const MOCK_HISTORICAL = [
  { hour: "6am", poker: 12, rummy: 8, tambola: 5, bingo: 3 },
  { hour: "9am", poker: 28, rummy: 22, tambola: 15, bingo: 10 },
  { hour: "12pm", poker: 45, rummy: 38, tambola: 30, bingo: 22 },
  { hour: "3pm", poker: 60, rummy: 52, tambola: 42, bingo: 35 },
  { hour: "6pm", poker: 95, rummy: 88, tambola: 72, bingo: 65 },
  { hour: "9pm", poker: 145, rummy: 128, tambola: 110, bingo: 98 },
  { hour: "12am", poker: 80, rummy: 65, tambola: 55, bingo: 48 },
];

export default function LiveAudience() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const { data: liveData, isLoading, refetch, dataUpdatedAt } = trpc.presence.live.useQuery(
    undefined, { enabled: isAuthenticated, refetchInterval: 30000 }
  );
  const { data: membership } = trpc.membership.currentTier.useQuery(undefined, { enabled: isAuthenticated });
  const isPro = membership?.tier === "pro";

  useEffect(() => { if (!loading && !isAuthenticated) navigate("/"); }, [isAuthenticated, loading, navigate]);

  const totalLive = liveData?.reduce((s, p) => s + p.count, 0) ?? 0;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—";

  return (
    <PortalLayout title="Live Audience">
      <UpgradeModal open={!!upgradeFeature} feature={upgradeFeature} onClose={() => setUpgradeFeature("")} />

      {/* Live heatmap */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-3.5 h-3.5" />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          (liveData ?? []).map((p) => {
            const color = APP_COLORS[p.appName] ?? APP_COLORS.default;
            return (
              <div key={p.appName} className="bg-card rounded-xl border border-border p-4 text-center hover:shadow-md transition-shadow">
                <div className="w-3 h-3 rounded-full mx-auto mb-3 animate-pulse" style={{ backgroundColor: color }} />
                <p className="font-display font-bold text-3xl text-foreground mb-1">{p.count}</p>
                <p className="text-xs text-muted-foreground capitalize font-medium">{p.appName.replace(/-/g, " ")}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">live now</p>
              </div>
            );
          })
        )}
        {/* Total */}
        <div className="bg-primary rounded-xl p-4 text-center text-white">
          <div className="w-3 h-3 rounded-full bg-white/60 mx-auto mb-3 animate-pulse" />
          <p className="font-display font-bold text-3xl mb-1">{totalLive}</p>
          <p className="text-xs font-medium opacity-80">Total Live</p>
          <p className="text-[10px] opacity-60 mt-0.5">all apps</p>
        </div>
      </div>

      {/* Live bar chart */}
      <Card className="border-border mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base font-semibold">Audience Distribution by App</CardTitle>
          <CardDescription>Current concurrent users per MetroHub app</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={liveData ?? []} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="appName" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: 12 }} />
              <Bar dataKey="count" name="Live Users" radius={[4, 4, 0, 0]}
                fill="var(--color-primary)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Historical — Pro gate */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
                Historical Trends
                {!isPro && <Badge variant="secondary" className="bg-amber-500/15 text-amber-600 border-0 text-xs">Pro Only</Badge>}
              </CardTitle>
              <CardDescription>Peak hours and day-of-week patterns over time</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isPro ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={MOCK_HISTORICAL}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="hour" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: 12 }} />
                <Legend />
                {["poker", "rummy", "tambola", "bingo"].map((app) => (
                  <Line key={app} type="monotone" dataKey={app} stroke={APP_COLORS[app]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="relative">
              <div className="blur-sm pointer-events-none select-none opacity-40">
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={MOCK_HISTORICAL}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    {["poker", "rummy", "tambola", "bingo"].map((app) => (
                      <Line key={app} type="monotone" dataKey={app} stroke={APP_COLORS[app]} strokeWidth={2} dot={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-card border border-border rounded-xl p-6 text-center shadow-lg max-w-xs">
                  <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="font-display font-semibold text-foreground mb-1">Pro Feature</p>
                  <p className="text-sm text-muted-foreground mb-4">Unlock 3-year historical trends, peak hour analysis, and year-over-year comparisons.</p>
                  <Button size="sm" className="w-full" onClick={() => setUpgradeFeature("historical_analytics")}>
                    <TrendingUp className="w-3.5 h-3.5 mr-1.5" />Upgrade to Pro
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </PortalLayout>
  );
}

