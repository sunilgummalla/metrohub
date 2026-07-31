import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard, Users, Layers, BarChart3, Bot, CreditCard,
  ChevronRight, LogOut, Settings, Sparkles, Menu, X
} from "lucide-react";
import { useState } from "react";
import { startLogin } from "@/const";

const NAV_ITEMS = [
  { href: "/overview",  label: "Overview",       icon: LayoutDashboard },
  { href: "/audience",  label: "Live Audience",  icon: Users },
  { href: "/slots",     label: "Ad Slots",       icon: Layers },
  { href: "/campaigns", label: "My Campaigns",   icon: BarChart3 },
  { href: "/ai",        label: "AI Assistant",   icon: Bot, proOnly: true },
  { href: "/account",   label: "Account & Billing", icon: CreditCard },
];

interface PortalLayoutProps {
  children: ReactNode;
  title?: string;
}

export function PortalLayout({ children, title }: PortalLayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { data: membership } = trpc.membership.currentTier.useQuery(undefined, { enabled: isAuthenticated });
  const isPro = membership?.tier === "pro";

  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground flex flex-col
        transform transition-transform duration-200 ease-out
        lg:relative lg:translate-x-0
        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">M</span>
          </div>
          <div>
            <p className="font-display font-semibold text-sm text-sidebar-foreground">MetroHub</p>
            <p className="text-xs text-sidebar-foreground/60">Advertiser Portal</p>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="w-4 h-4 text-sidebar-foreground/60" />
          </button>
        </div>

        {/* Tier badge */}
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-sidebar-accent">
            {isPro
              ? <><Sparkles className="w-3.5 h-3.5 text-amber-400" /><span className="text-xs font-semibold text-amber-400">Pro Member</span></>
              : <><span className="w-2 h-2 rounded-full bg-sidebar-foreground/40" /><span className="text-xs text-sidebar-foreground/60">Basic Member</span></>
            }
            {!isPro && (
              <Link href="/account" className="ml-auto text-xs text-primary font-medium hover:underline">Upgrade</Link>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon, proOnly }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <div className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer
                  transition-colors duration-150
                  ${active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }
                `}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {proOnly && !isPro && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-400 border-0">Pro</Badge>
                  )}
                  {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-sidebar-border">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.name ?? "Advertiser"}</p>
                    <p className="text-xs text-sidebar-foreground/50 truncate">{user?.email ?? ""}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild><Link href="/account"><span className="flex items-center gap-2 w-full"><Settings className="w-4 h-4" />Account Settings</span></Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button className="w-full" size="sm" onClick={() => startLogin()}>Sign In</Button>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm shrink-0">
          <button className="lg:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          {title && <h1 className="font-display font-semibold text-lg text-foreground">{title}</h1>}
          <div className="ml-auto flex items-center gap-3">
            {isPro && <Badge className="bg-amber-500/15 text-amber-600 border-amber-200 font-semibold text-xs"><Sparkles className="w-3 h-3 mr-1" />Pro</Badge>}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

