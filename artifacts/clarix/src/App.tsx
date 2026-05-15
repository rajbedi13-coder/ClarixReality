import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import ArticleDetail from "@/pages/article";
import Saved from "@/pages/saved";
import SignIn from "@/pages/signin";
import SignUp from "@/pages/signup";
import Pricing from "@/pages/pricing";
import Explore from "@/pages/explore";
import Archive from "@/pages/archive";
import Admin from "@/pages/admin";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/article/:id" component={ArticleDetail} />
        <Route path="/saved" component={Saved} />
        <Route path="/signin" component={SignIn} />
        <Route path="/signup" component={SignUp} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/explore" component={Explore} />
        <Route path="/archive" component={Archive} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="clarix-theme">
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
