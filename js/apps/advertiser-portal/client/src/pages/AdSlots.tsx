import { PortalLayout } from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Users, DollarSign, Lock, CheckCircle2, ExternalLink } from "lucide-react";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const SLOT_DESCRIPTIONS: Record<string, string> = {
  "hero-banner": "Full-width banner above the MetroHub app grid — maximum visibility for every visitor.",
  "news-ticker": "Scrolling text strip in the shell header — seen on every page, every session.",
  "poker-scorecard-footer": "Slim banner at the bottom of the Poker scorecard — shown to active Poker players.",
  "rummy-scorecard-footer": "Slim banner at the bottom of the Rummy scorecard — shown to active Rummy players.",
  "tambola-sidebar": "Small banner beside the Tambola number board — seen during active game play.",
  "bingo-sidebar": "Small banner beside the Bingo board — shown during active Bingo sessions.",
};

const SLOT_ICONS: Record<string, string> = {
  "hero-banner": "🏆", "news-ticker": "📰",
  "poker-scorecard-footer": "♠️", "rummy-scorecard-footer": "🃏",
  "tambola-sidebar": "🎱", "bingo-sidebar": "🎯",
};

/**
 * Build a local-time Date from a `YYYY-MM-DD` date-input value. Using
 * `new Date("YYYY-MM-DD")` would parse as midnight UTC and can land on the
 * previous local day, causing off-by-one booking/pricing on the server (which
 * computes calendar days in local time).
 */
function localDateFromInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default function AdSlots() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [copy, setCopy] = useState("");
  const [clickUrl, setClickUrl] = useState("");

  const { data: slots, isLoading } = trpc.slots.list.useQuery(undefined, { enabled: isAuthenticated });
  const bookMutation = trpc.slots.bookSlot.useMutation({
    onSuccess: (data) => {
      toast.success("Booking created! Redirecting to checkout...");
      setBookingSlot(null);
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    },
    onError: (e) => {
      if (e.message.startsWith("UPGRADE_REQUIRED")) {
        setBookingSlot(null);
        setUpgradeFeature("hero_banner");
      } else {
        toast.error(e.message);
      }
    },
  });

  useEffect(() => { if (!loading && !isAuthenticated) navigate("/"); }, [isAuthenticated, loading, navigate]);

  const selectedSlot = slots?.find(s => s.slotId === bookingSlot);

  return (
    <PortalLayout title="Ad Slots">
      <UpgradeModal open={!!upgradeFeature} feature={upgradeFeature} onClose={() => setUpgradeFeature("")} />

      <p className="text-sm text-muted-foreground mb-6">
        Each slot is an independent selling unit with its own audience, pricing, and creative. Click any slot to book.
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(slots ?? []).map((slot) => (
            <Card key={slot.slotId} className={`border-border hover:shadow-md transition-all ${!slot.canBook ? "opacity-80" : ""}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{SLOT_ICONS[slot.slotId] ?? "📢"}</span>
                    <div>
                      <CardTitle className="font-display text-sm font-semibold leading-tight">{slot.name}</CardTitle>
                      <code className="text-[10px] text-muted-foreground font-mono">{slot.slotId}</code>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {slot.isProRequired && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/15 text-amber-600 border-0">Pro Only</Badge>
                    )}
                    <Badge variant={slot.isActive ? "default" : "secondary"} className="text-[10px]">
                      {slot.isActive ? "Available" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                  {SLOT_DESCRIPTIONS[slot.slotId] ?? slot.description}
                </p>
                <div className="flex items-center gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span className="font-semibold text-foreground">{slot.liveAudience}</span>
                    <span className="text-xs">live</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <DollarSign className="w-3.5 h-3.5" />
                    <span className="font-semibold text-foreground">${slot.basePricePerDay}</span>
                    <span className="text-xs">/day</span>
                  </div>
                </div>
                {slot.canBook ? (
                  <Button size="sm" className="w-full font-medium" onClick={() => setBookingSlot(slot.slotId)}>
                    Book This Slot <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="w-full font-medium border-amber-200 text-amber-600 hover:bg-amber-50"
                    onClick={() => setUpgradeFeature("hero_banner")}>
                    <Lock className="w-3.5 h-3.5 mr-1.5" />Upgrade to Book
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Booking dialog */}
      <Dialog open={!!bookingSlot} onOpenChange={() => setBookingSlot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Book: {selectedSlot?.name}</DialogTitle>
            <DialogDescription>
              ${selectedSlot?.basePricePerDay}/day · Creative goes to admin moderation before going live.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start">Start Date</Label>
                <Input id="start" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end">End Date</Label>
                <Input id="end" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate || new Date().toISOString().split("T")[0]} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="copy">Ad Copy (one-liner)</Label>
              <Input id="copy" placeholder="e.g. Order wings tonight — 15% off with code POKER" value={copy} onChange={e => setCopy(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="url">Click URL</Label>
              <Input id="url" type="url" placeholder="https://yourbusiness.com" value={clickUrl} onChange={e => setClickUrl(e.target.value)} />
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Your creative will enter the admin moderation queue and go live once approved — typically within 24 hours.</p>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setBookingSlot(null)}>Cancel</Button>
            <Button className="flex-1 font-semibold" disabled={!startDate || !endDate || bookMutation.isPending}
              onClick={() => {
                if (!bookingSlot || !startDate || !endDate) return;
                bookMutation.mutate({
                  slotId: bookingSlot,
                  // Build local-time dates from the Y/M/D parts. `new Date("YYYY-MM-DD")`
                  // parses as midnight UTC, which the server's local-time calendar-day
                  // math can shift by a day (off-by-one billing/availability).
                  startDate: localDateFromInput(startDate),
                  endDate: localDateFromInput(endDate),
                  creativeCopy: copy || undefined,
                  creativeClickUrl: clickUrl || undefined,
                });
              }}>
              {bookMutation.isPending ? "Processing..." : "Proceed to Checkout"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}

