import { PortalLayout } from "@/components/PortalLayout";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// Badge imported but not used; keep for future use
import { Bot, Send, Lock, Shield, Sparkles, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const SUGGESTED_QUESTIONS = [
  "What's the best time to run ads on Tambola this weekend?",
  "How did my campaigns perform last month?",
  "Which ad slot has the highest audience right now?",
  "Compare Poker vs Rummy audience on Friday evenings.",
];

export default function AIAssistant() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [input, setInput] = useState("");
  const [localMessages, setLocalMessages] = useState<Array<{ role: string; content: string }>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: membership } = trpc.membership.currentTier.useQuery(undefined, { enabled: isAuthenticated });
  const isPro = membership?.tier === "pro";

  const { data: history, error: historyError } = trpc.ai.history.useQuery(undefined, {
    enabled: isAuthenticated && isPro,
  });

  useEffect(() => {
    if (historyError?.message?.startsWith("UPGRADE_REQUIRED")) setUpgradeOpen(true);
  }, [historyError]);

  const chatMutation = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setLocalMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    },
    onError: (e) => {
      if (e.message.startsWith("UPGRADE_REQUIRED")) setUpgradeOpen(true);
      else toast.error(e.message);
      setLocalMessages(prev => prev.slice(0, -1)); // remove optimistic user message
    },
  });

  useEffect(() => { if (!loading && !isAuthenticated) navigate("/"); }, [isAuthenticated, loading, navigate]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [localMessages]);

  const allMessages = [...(history ?? []), ...localMessages];

  const sendMessage = (text: string) => {
    if (!text.trim() || chatMutation.isPending) return;
    if (!isPro) { setUpgradeOpen(true); return; }
    setLocalMessages(prev => [...prev, { role: "user", content: text }]);
    setInput("");
    chatMutation.mutate({ message: text });
  };

  return (
    <PortalLayout title="AI Assistant">
      <UpgradeModal open={upgradeOpen} feature="ai_assistant" onClose={() => setUpgradeOpen(false)} />

      {!isPro ? (
        /* Pro gate */
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">AI Business Assistant</h2>
          <p className="text-muted-foreground max-w-md mb-2 leading-relaxed">
            Ask questions about your campaign performance, audience patterns, and slot recommendations. Get instant, data-driven answers.
          </p>
          <div className="flex items-center gap-2 mb-8">
            <Shield className="w-4 h-4 text-primary" />
            <p className="text-sm text-muted-foreground">Strict data isolation — only your data, never competitors'.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 w-full max-w-lg">
            {SUGGESTED_QUESTIONS.map((q) => (
              <div key={q} className="bg-muted/60 rounded-lg p-3 text-sm text-muted-foreground text-left border border-border blur-[1px]">{q}</div>
            ))}
          </div>
          <Button size="lg" className="font-semibold px-8" onClick={() => setUpgradeOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" />Upgrade to Pro to Unlock
          </Button>
        </div>
      ) : (
        /* Chat interface */
        <div className="flex flex-col h-[calc(100vh-10rem)] max-w-3xl mx-auto">
          {/* Privacy notice */}
          <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-lg px-4 py-2.5 mb-4 shrink-0">
            <Shield className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Data isolation active.</span> This assistant can only access your own campaign data and platform-wide aggregate statistics. Competitor data is never shared.
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
            {allMessages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="w-10 h-10 text-primary/40 mx-auto mb-4" />
                <p className="font-medium text-foreground mb-2">How can I help you today?</p>
                <p className="text-sm text-muted-foreground mb-6">Ask me about your campaigns, audience trends, or slot recommendations.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {SUGGESTED_QUESTIONS.map((q) => (
                    <button key={q} onClick={() => sendMessage(q)}
                      className="bg-muted/60 hover:bg-muted rounded-lg p-3 text-sm text-left text-muted-foreground hover:text-foreground border border-border transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {allMessages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === "user" ? "bg-primary" : "bg-muted"}`}>
                  {m.role === "user"
                    ? <User className="w-4 h-4 text-white" />
                    : <Bot className="w-4 h-4 text-primary" />
                  }
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border text-foreground rounded-tl-sm"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-3 shrink-0">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Ask about your campaigns, audience trends, or slot performance..."
              className="flex-1"
              disabled={chatMutation.isPending}
            />
            <Button onClick={() => sendMessage(input)} disabled={!input.trim() || chatMutation.isPending} size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
