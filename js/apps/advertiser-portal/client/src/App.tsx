import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Overview from "./pages/Overview";
import LiveAudience from "./pages/LiveAudience";
import AdSlots from "./pages/AdSlots";
import Campaigns from "./pages/Campaigns";
import AIAssistant from "./pages/AIAssistant";
import AccountBilling from "./pages/AccountBilling";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/overview"} component={Overview} />
      <Route path={"/audience"} component={LiveAudience} />
      <Route path={"/slots"} component={AdSlots} />
      <Route path={"/campaigns"} component={Campaigns} />
      <Route path={"/ai"} component={AIAssistant} />
      <Route path={"/account"} component={AccountBilling} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
