import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useGetCurrentUser, useSignOut, useGetTicker } from "@workspace/api-client-react";
import { useTheme } from "./theme-provider";

export function Layout({ children }: { children: ReactNode }) {
  const { data: user } = useGetCurrentUser();
  const signOut = useSignOut();
  const [location, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();

  const handleSignOut = () => {
    signOut.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("token");
        setLocation("/signin");
      },
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-screen-xl mx-auto px-6 flex h-13 items-center justify-between gap-8">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <span className="font-serif text-xl font-semibold tracking-tight">Clarix</span>
            <span className="hidden sm:block font-mono text-[10px] uppercase tracking-[0.15em] text-accent border border-accent/40 px-2 py-0.5 rounded-sm">
              Intelligence
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-7 text-sm">
            <NavLink href="/" active={location === "/"}>Briefings</NavLink>
            <NavLink href="/saved" active={location === "/saved"}>Saved</NavLink>
            <NavLink href="/pricing" active={location === "/pricing"}>Pricing</NavLink>
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-4 ml-auto md:ml-0">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="font-mono text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              title="Toggle theme"
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>

            {user ? (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center text-accent font-mono text-[11px] font-medium">
                  {user.initials}
                </div>
                <button
                  onClick={handleSignOut}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/signin" className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
                  Sign in
                </Link>
                <Link href="/signup" className="font-mono text-xs bg-foreground text-background px-3 py-1.5 hover:opacity-80 transition-opacity">
                  Start free trial
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Ticker */}
        <Ticker />
      </header>

      <main className="flex-1">{children}</main>

      {/* Minimal footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-screen-xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-serif text-base font-medium">Clarix Intelligence</p>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
              Signal over noise · AI-assisted summaries · Source transparency
            </p>
          </div>
          <div className="flex items-center gap-5 font-mono text-[11px] text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">Get access</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children, active }: { href: string; children: ReactNode; active: boolean }) {
  return (
    <Link
      href={href}
      className={`font-mono text-xs uppercase tracking-wider transition-colors ${
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function Ticker() {
  const { data: items } = useGetTicker();
  if (!items || items.length === 0) return null;

  return (
    <div className="border-t border-border bg-surface overflow-hidden h-8 flex items-center">
      <div className="shrink-0 px-4 border-r border-border h-full flex items-center">
        <span className="font-mono text-[10px] uppercase tracking-widest text-accent">Live</span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <div className="animate-marquee whitespace-nowrap flex gap-12 items-center font-mono text-[11px] text-muted-foreground px-6">
          {[...items, ...items].map((item, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-border">—</span>
              {item.headline}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
