import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, Layers, Bot, Sparkles, ArrowRight, Shield, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { startLogin } from "@/const";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) navigate("/overview");
  }, [isAuthenticated, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-display font-bold text-sm">M</span>
            </div>
            <span className="font-display font-semibold text-foreground">MetroHub <span className="text-muted-foreground font-normal">Advertiser Portal</span></span>
          </div>
          <Button onClick={() => startLogin()} className="font-semibold">
            Get Started <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary border-primary/20 font-medium">
            <Zap className="w-3.5 h-3.5 mr-1.5" /> Self-Serve Advertising Platform
          </Badge>
          <h1 className="font-display text-5xl font-bold text-foreground leading-tight mb-6">
            Reach players when<br />
            <span className="text-primary">they're most engaged</span>
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl mx-auto">
            Advertise across MetroHub's suite of gaming apps — Poker, Rummy, Tambola, Bingo and more. Book ad slots, track performance, and get AI-powered insights in one place.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="font-semibold text-base px-8" onClick={() => startLogin()}>
              Start Advertising Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="font-semibold text-base px-8" onClick={() => startLogin()}>
              View Ad Inventory
            </Button>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-16 px-4 bg-muted/40">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-center text-foreground mb-12">Everything you need to advertise smarter</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Users, title: "Live Audience Heatmap", desc: "See real-time concurrent users per game. Know exactly when and where your audience is most active.", color: "text-blue-600 bg-blue-50" },
              { icon: Layers, title: "6 Independent Ad Slots", desc: "Hero banner, news ticker, and in-game slots for Poker, Rummy, Tambola, and Bingo — each sold separately.", color: "text-indigo-600 bg-indigo-50" },
              { icon: BarChart3, title: "Campaign Analytics", desc: "Track impressions, clicks, and CTR for every campaign. 3-year historical trends available on Pro.", color: "text-emerald-600 bg-emerald-50" },
              { icon: Bot, title: "AI Business Assistant", desc: "Ask questions about your campaigns and get instant, data-driven answers. Strict data isolation enforced.", color: "text-purple-600 bg-purple-50" },
              { icon: Shield, title: "Admin-Moderated Creatives", desc: "Every ad creative goes through a moderation queue before going live — quality guaranteed.", color: "text-amber-600 bg-amber-50" },
              { icon: Sparkles, title: "Stripe & PayPal Checkout", desc: "Pay securely with your preferred provider. Configurable gateway, no lock-in.", color: "text-rose-600 bg-rose-50" },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-display font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-foreground mb-4">Ready to reach MetroHub players?</h2>
          <p className="text-muted-foreground mb-8">Sign up free. No credit card required for Basic tier.</p>
          <Button size="lg" className="font-semibold text-base px-10" onClick={() => startLogin()}>
            Create Your Account <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
}

