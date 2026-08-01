import { PortalLayout } from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Eye, MousePointerClick, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending_payment: "bg-amber-100 text-amber-700 border-amber-200",
  pending_moderation: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-gray-100 text-gray-600 border-gray-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function Campaigns() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery(undefined, { enabled: isAuthenticated });
  const { data: stats, isLoading: statsLoading } = trpc.campaigns.stats.useQuery(undefined, { enabled: isAuthenticated });

  useEffect(() => { if (!loading && !isAuthenticated) navigate("/"); }, [isAuthenticated, loading, navigate]);

  const summaryCards = [
    { label: "Impressions", value: stats?.impressions ?? 0, icon: Eye, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Clicks", value: stats?.clicks ?? 0, icon: MousePointerClick, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "CTR", value: `${stats?.ctr ?? "0.00"}%`, icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Total Spend", value: `$${stats?.totalSpend?.toFixed(2) ?? "0.00"}`, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <PortalLayout title="My Campaigns">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-border">
            <CardContent className="pt-5 pb-4">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              {statsLoading ? <Skeleton className="h-7 w-20 mb-1" /> : (
                <p className="font-display font-bold text-2xl text-foreground">{typeof value === "number" ? value.toLocaleString() : value}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign list */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base font-semibold">All Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
          ) : !campaigns?.length ? (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">No campaigns yet</p>
              <p className="text-sm text-muted-foreground">Book your first ad slot to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {campaigns.map((c) => (
                <div key={c.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm text-foreground truncate">{c.slotId}</p>
                      <Badge className={`text-[10px] px-1.5 py-0 border ${STATUS_STYLES[c.status] ?? STATUS_STYLES.completed}`}>
                        {c.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.startDate).toLocaleDateString()} — {new Date(c.endDate).toLocaleDateString()}
                    </p>
                    {c.creativeCopy && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5 truncate italic">"{c.creativeCopy}"</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-sm text-foreground">${parseFloat(c.totalPrice).toFixed(2)}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground justify-end">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{c.impressions?.toLocaleString() ?? 0}</span>
                      <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{c.clicks?.toLocaleString() ?? 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PortalLayout>
  );
}

