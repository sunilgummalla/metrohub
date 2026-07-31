import { PortalLayout } from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Sparkles, CheckCircle2, Shield, CreditCard, User, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AccountBilling() {
  const { isAuthenticated, loading, user } = useAuth();
  const [, navigate] = useLocation();
  const { data: membership, refetch } = trpc.membership.currentTier.useQuery(undefined, { enabled: isAuthenticated });
  const isPro = membership?.tier === "pro";

  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (membership) {
      setBusinessName(membership.businessName ?? "");
      setBusinessCategory(membership.businessCategory ?? "");
      setPhone(membership.phone ?? "");
    }
  }, [membership]);

  useEffect(() => { if (!loading && !isAuthenticated) navigate("/"); }, [isAuthenticated, loading, navigate]);

  const updateProfile = trpc.membership.updateProfile.useMutation({
    onSuccess: () => { toast.success("Profile updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const upgrade = trpc.membership.upgrade.useMutation({
    onSuccess: () => { toast.success("Welcome to MetroHub Pro!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const PRO_FEATURES = [
    "3-year historical audience analytics",
    "AI Business Intelligence Assistant",
    "Hero Banner ad slot access",
    "Advanced campaign performance reports",
    "Priority customer support",
  ];

  return (
    <PortalLayout title="Account & Billing">
      <div className="max-w-3xl space-y-6">
        {/* Current plan */}
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-display text-base font-semibold">Current Plan</CardTitle>
                <CardDescription>Your MetroHub Advertiser membership tier</CardDescription>
              </div>
              <Badge className={isPro
                ? "bg-amber-500/15 text-amber-600 border-amber-200 font-semibold"
                : "bg-muted text-muted-foreground border-border font-medium"
              }>
                {isPro ? <><Sparkles className="w-3 h-3 mr-1" />Pro</> : "Basic"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isPro ? (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                <p className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />You're on MetroHub Pro
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRO_FEATURES.map(f => (
                    <div key={f} className="flex items-center gap-2 text-sm text-amber-700">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />{f}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">Upgrade to Pro to unlock advanced analytics, the AI assistant, and premium ad slots.</p>
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-4">
                  <p className="font-semibold text-foreground mb-3">Pro includes:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PRO_FEATURES.map(f => (
                      <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />{f}
                      </div>
                    ))}
                  </div>
                </div>
                <Button className="font-semibold" onClick={() => upgrade.mutate({ tier: "pro" })} disabled={upgrade.isPending}>
                  <Sparkles className="w-4 h-4 mr-2" />{upgrade.isPending ? "Upgrading..." : "Upgrade to Pro"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business profile */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />Business Profile
            </CardTitle>
            <CardDescription>This information is used to personalise your portal experience.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="bname">Business Name</Label>
                  <Input id="bname" value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="e.g. Mario's Pizzeria" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="bcat">Business Category</Label>
                  <Input id="bcat" value={businessCategory} onChange={e => setBusinessCategory(e.target.value)} placeholder="e.g. Food & Drink" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" />
              </div>
              <Button variant="outline" onClick={() => updateProfile.mutate({ businessName, businessCategory, phone })} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account info */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />Account Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium text-foreground">{user?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium text-foreground">{user?.email ?? "—"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Login Method</span>
                <span className="font-medium text-foreground capitalize">{user?.loginMethod ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment info */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-display text-base font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />Payment Gateway
            </CardTitle>
            <CardDescription>Configured by your MetroHub administrator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-lg bg-muted/50 border border-border p-4">
              <Shield className="w-5 h-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Stripe &amp; PayPal supported</p>
                <p className="text-xs text-muted-foreground mt-0.5">Payments are processed securely via the configured gateway. Your card details are never stored on MetroHub servers.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}

