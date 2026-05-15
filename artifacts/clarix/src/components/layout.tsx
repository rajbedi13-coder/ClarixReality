import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetCurrentUser, useSignOut, useGetTicker } from "@workspace/api-client-react";
import { useTheme } from "./theme-provider";

export function Layout({ children }: { children: ReactNode }) {
  const { data: user } = useGetCurrentUser();
  const signOut = useSignOut();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();

  const handleSignOut = () => {
    signOut.mutate({}, {
      onSuccess: () => {
        localStorage.removeItem("token");
        setLocation("/signin");
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-serif font-bold text-2xl tracking-wide">Clarix</span>
              <span className="hidden md:inline-flex items-center justify-center px-2 py-0.5 text-xs font-mono border border-accent text-accent rounded-sm">
                Intelligence
              </span>
            </Link>
            <nav className="hidden md:flex gap-6">
              <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">Briefings</Link>
              <Link href="/saved" className="text-sm font-medium text-muted-foreground hover:text-foreground">Saved</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-md hover:bg-muted"
            >
              <span className="font-mono text-xs">{theme === "dark" ? "◈ Light" : "◈ Dark"}</span>
            </button>
            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground font-medium text-sm">
                  {user.initials}
                </div>
                <button onClick={handleSignOut} className="text-sm font-medium text-muted-foreground hover:text-foreground">
                  Sign Out
                </button>
              </div>
            ) : (
              <Link href="/signin" className="text-sm font-medium hover:text-foreground">
                Sign In
              </Link>
            )}
          </div>
        </div>
        <Ticker />
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}

function Ticker() {
  const { data: items } = useGetTicker();
  
  if (!items || items.length === 0) return null;

  return (
    <div className="border-b bg-surface2 overflow-hidden h-8 flex items-center px-4 gap-4">
      <span className="shrink-0 font-mono text-xs text-accent whitespace-nowrap">◈ Live</span>
      <div className="flex-1 flex overflow-hidden relative">
        <div className="animate-marquee whitespace-nowrap flex gap-8 items-center font-mono text-xs text-muted-foreground">
          {items.map((item) => (
            <span key={item.id}>◇ {item.headline}</span>
          ))}
          {/* Duplicate for infinite effect */}
          {items.map((item) => (
            <span key={`${item.id}-dup`}>◇ {item.headline}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
