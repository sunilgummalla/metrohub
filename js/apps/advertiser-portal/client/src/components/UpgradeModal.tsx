import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, BarChart3, Bot, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const FEATURE_LABELS: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
  historical_analytics: {
    title: "Historical Audience Analytics",
    description: "Access 3-year trend charts, peak hour analysis, day-of-week patterns, and year-over-year comparisons to make smarter booking decisions.",
    icon: <BarChart3 className="w-8 h-8 text-primary" />,
  },
  ai_assistant: {
    title: "AI Business Assistant",
    description: "Get instant answers about your campaign performance, audience insights, and slot recommendations — powered by AI with strict data privacy.",
    icon: <Bot className="w-8 h-8 text-primary" />,
  },
  hero_banner: {
    title: "Hero Banner Slot",
    description: "The highest-visibility ad placement on MetroHub — full-width banner above the app grid, seen by every visitor. Pro members only.",
    icon: <Star className="w-8 h-8 text-primary" />,
  },
};

interface UpgradeModalProps {
  open: boolean;
  feature: string;
  onClose: () => void;
}

export function UpgradeModal({ open, feature, onClose }: UpgradeModalProps) {
  const info = FEATURE_LABELS[feature] ?? {
    title: "Pro Feature",
    description: "Upgrade to Pro to unlock this feature.",
    icon: <Sparkles className="w-8 h-8 text-primary" />,
  };

  const upgrade = trpc.membership.upgrade.useMutation({
    onSuccess: () => {
      toast.success("You're now on MetroHub Pro! Enjoy full access.");
      onClose();
      window.location.reload();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {info.icon}
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-semibold">
              Pro Feature
            </Badge>
          </div>
          <DialogTitle className="text-xl font-display">{info.title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-1">
            {info.description}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 my-2">
          <p className="text-sm font-semibold text-foreground mb-2">MetroHub Pro includes:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-primary shrink-0" /> 3-year historical audience analytics</li>
            <li className="flex items-center gap-2"><Bot className="w-3.5 h-3.5 text-primary shrink-0" /> AI Business Intelligence Assistant</li>
            <li className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-primary shrink-0" /> Hero Banner ad slot access</li>
            <li className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5 text-primary shrink-0" /> Advanced campaign analytics</li>
          </ul>
        </div>

        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Maybe later</Button>
          <Button
            className="flex-1 font-semibold"
            onClick={() => upgrade.mutate({ tier: "pro" })}
            disabled={upgrade.isPending}
          >
            {upgrade.isPending ? "Upgrading..." : "Upgrade to Pro"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

