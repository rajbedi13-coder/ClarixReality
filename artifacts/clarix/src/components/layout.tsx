import { ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useGetCurrentUser, useSignOut, useGetTicker, useListCategories } from "@workspace/api-client-react";
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
            <NavLink href="/" active={location === "/"}>The Brief</NavLink>
            <NavLink href="/explore" active={location === "/explore"}>Reality Swipe</NavLink>
            <NavLink href="/archive" active={location === "/archive"}>Library</NavLink>
            <NavLink href="/saved" active={location === "/saved"}>Archive</NavLink>
            <NavLink href="/standard" active={location === "/standard"}>The Standard</NavLink>
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
                <Link
                  href="/signup"
                  className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-accent transition-colors border-b border-transparent hover:border-accent/40 pb-0.5"
                >
                  Join the beta
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Category navigation bar (mobile + desktop) */}
        <CategoryBar />

        {/* Ticker */}
        <Ticker />
      </header>

      <main className="flex-1">{children}</main>

      {/* Editorial footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-screen-xl mx-auto px-6 py-10 space-y-6">
          <p className="font-serif italic text-base md:text-lg text-foreground/75 leading-relaxed max-w-2xl">
            No clickbait. No rage bait. No meme feed. Source-backed intelligence for clearer thinking.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-border/60">
            <div className="space-y-1">
              <p className="font-serif text-base font-medium">Clarix Reality</p>
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                Signal over noise · AI-assisted summaries · Source transparency
              </p>
            </div>
            <div className="flex items-center gap-5 font-mono text-[11px] text-muted-foreground">
              <Link href="/standard" className="hover:text-foreground transition-colors">The Standard</Link>
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/signup" className="hover:text-foreground transition-colors">Join the beta</Link>
            </div>
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

function CategoryBar() {
  const { data: categories } = useListCategories();
  const [location] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const activeSlug = params.get("category");
  const onHome = location === "/";

  if (!categories || categories.length === 0) return null;

  return (
    <div className="border-t border-border bg-background/80">
      <div className="max-w-screen-2xl mx-auto overflow-x-auto scrollbar-none">
        <nav className="flex items-stretch gap-0 px-2 md:px-6 min-w-max">
          <CategoryNavLink href="/" active={onHome && !activeSlug} icon="◈" label="All" />
          {categories.map((cat) => (
            <CategoryNavLink
              key={cat.id}
              href={`/?category=${cat.slug}`}
              active={onHome && activeSlug === cat.slug}
              icon={cat.icon}
              label={cat.name}
              count={cat.articleCount}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}

function CategoryNavLink({ href, active, icon, label, count }: { href: string; active: boolean; icon: string; label: string; count?: number }) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-2 px-3 md:px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.12em] whitespace-nowrap border-b-2 transition-colors ${
        active
          ? "border-accent text-foreground bg-accent/5"
          : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
      }`}
    >
      <span className={active ? "text-accent" : "text-muted-foreground/70 group-hover:text-accent/70"}>{icon}</span>
      <span className="font-sans normal-case tracking-normal text-[13px]">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[9px] text-muted-foreground/50 font-mono">{count}</span>
      )}
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
