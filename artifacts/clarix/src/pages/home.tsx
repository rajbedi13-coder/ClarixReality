import {
  useListArticles,
  useListCategories,
  useListFeaturedArticles,
  useGetPlatformStats,
  useRefreshNews,
} from "@workspace/api-client-react";
import { Link, useSearch } from "wouter";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QuoteFragment, PullQuote } from "@/components/quote-fragment";
import { TrustSignals } from "@/components/trust-signals";
import { quoteOfTheHour, randomQuote, QUOTES } from "@/lib/quotes";

const PAGE_SIZE = 20;

export default function Home() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const category = params.get("category") || undefined;
  const searchQuery = params.get("q") || undefined;
  const isFiltered = !!(category || searchQuery);

  const [page, setPage] = useState(1);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [knownTotal, setKnownTotal] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [searchInput, setSearchInput] = useState(searchQuery || "");
  const loaderRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: articlesPage, isFetching } = useListArticles({ category, search: searchQuery, page, limit: PAGE_SIZE });
  const { data: featured } = useListFeaturedArticles();
  const { data: categories } = useListCategories();
  const { data: stats } = useGetPlatformStats();
  const refreshNews = useRefreshNews();

  const heroQuote = useMemo(() => quoteOfTheHour(), []);
  const pullQuote = useMemo(() => randomQuote(7), []);

  useEffect(() => { setPage(1); setAllArticles([]); setKnownTotal(0); }, [category, searchQuery]);

  useEffect(() => {
    if (!articlesPage) return;
    if (page === 1) { setAllArticles(articlesPage.articles); setKnownTotal(articlesPage.total); }
    else {
      setAllArticles(prev => {
        const ids = new Set(prev.map((a: any) => a.id));
        return [...prev, ...articlesPage.articles.filter((a: any) => !ids.has(a.id))];
      });
    }
  }, [articlesPage, page]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [e] = entries;
    if (e.isIntersecting && !isFetching && allArticles.length < knownTotal) setPage(p => p + 1);
  }, [isFetching, allArticles.length, knownTotal]);

  useEffect(() => {
    const obs = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const r = await fetch("/api/articles?page=1&limit=1" + (category ? `&category=${category}` : ""));
        const d = await r.json();
        if (d.total > knownTotal && knownTotal > 0) setNewCount(d.total - knownTotal);
      } catch { /* silent */ }
    }, 60_000);
    return () => clearInterval(id);
  }, [category, knownTotal]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = searchInput ? `/?q=${encodeURIComponent(searchInput)}` : "/";
  };

  const currentCatName = categories?.find(c => c.slug === category)?.name;
  const heroFeatured = featured?.[0];
  const restFeatured = featured?.slice(1, 3) ?? [];

  // Today's date in editorial format
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="max-w-screen-2xl mx-auto relative">
      {/* ── Cinematic Hero ── */}
      {!isFiltered && (
        <section className="border-b border-border px-6 lg:px-12 py-20 md:py-28 lg:py-32 relative overflow-hidden">
          <div className="max-w-5xl mx-auto space-y-10">
            {/* Date band */}
            <div className="flex items-center gap-4 animate-fade-up">
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">Vol. I</span>
              <span className="h-px w-8 bg-accent/40" />
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{today}</span>
            </div>

            {/* Display headline */}
            <h1 className="font-serif font-medium leading-[0.98] text-[64px] md:text-[88px] lg:text-[120px] xl:text-[140px] text-foreground tracking-tight animate-fade-up">
              Signal over<br />
              <span className="italic text-accent font-normal">noise.</span>
            </h1>

            {/* Subhead */}
            <div className="max-w-2xl space-y-6 animate-fade-up-delayed">
              <p className="font-sans text-xl md:text-2xl text-foreground/80 leading-snug font-normal">
                A quiet intelligence platform for finance, geopolitics, philosophy, psychology and the long arc of culture.
              </p>
              <p className="font-sans text-base md:text-lg text-muted-foreground leading-relaxed">
                Curated and AI-assisted, with full source transparency. No clickbait. No rage bait. No meme feed —
                <span className="italic text-foreground/70"> just the world, slowly.</span>
              </p>
            </div>

            {/* CTAs */}
            <div className="flex items-center gap-5 pt-2 animate-fade-up-delayed">
              <Link href="#briefings" className="inline-flex items-center gap-2 bg-foreground text-background font-mono text-[11px] uppercase tracking-[0.2em] px-6 py-3.5 hover:opacity-85 transition-opacity">
                Begin reading →
              </Link>
              <Link href="/signup" className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">
                Join the beta
              </Link>
            </div>

            {/* Hero quote */}
            <div className="pt-12 mt-8 border-t border-border/60 max-w-2xl animate-fade-up-slow">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent mb-4">From the editor's commonplace book</p>
              <blockquote className="font-serif text-xl md:text-2xl italic leading-snug text-foreground/85">
                "{heroQuote.text}"
              </blockquote>
              <p className="font-mono text-[11px] text-muted-foreground mt-3">
                — {heroQuote.author}{heroQuote.context && <span className="text-muted-foreground/60"> · {heroQuote.context}</span>}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Trust signals ── */}
      {!isFiltered && (
        <div className="border-b border-border bg-surface px-6 py-3 overflow-x-auto">
          <div className="max-w-screen-2xl mx-auto flex items-center gap-6 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
            <TrustSignal icon="◈" text="AI-assisted summaries" />
            <span className="text-border">·</span>
            <TrustSignal icon="○" text="Source transparency" />
            <span className="text-border">·</span>
            <TrustSignal icon="△" text="No clickbait" />
            <span className="text-border">·</span>
            <TrustSignal icon="◇" text="No rage bait" />
            <span className="text-border">·</span>
            <TrustSignal icon="◉" text="No meme feed" />
            <span className="text-border hidden md:block">·</span>
            <TrustSignal
              icon="▽"
              text={
                stats
                  ? `${stats.briefsLast24h} briefs in last 24h · refreshed every ${stats.refreshCadenceHours}h`
                  : "Refreshed continuously"
              }
              className="hidden md:flex"
            />
          </div>
        </div>
      )}

      {/* ── New articles banner ── */}
      {newCount > 0 && (
        <button
          onClick={() => { setNewCount(0); setPage(1); setAllArticles([]); queryClient.invalidateQueries(); }}
          className="w-full py-2.5 text-center font-mono text-xs text-accent border-b border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors animate-soft-pulse"
        >
          ↑ {newCount} new {newCount === 1 ? "brief" : "briefs"} arrived — refresh to read
        </button>
      )}

      {/* ── Main layout ── */}
      <div className="flex gap-0" id="briefings">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 border-r border-border min-h-[60vh]">
          <div className="sticky top-[88px] p-5 space-y-8">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search The Brief…"
                className="w-full bg-transparent border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent placeholder:text-muted-foreground/60 transition-colors"
              />
              <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors text-sm">⌕</button>
            </form>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Sections</p>
              <nav className="space-y-0.5">
                <CategoryLink href="/" label="All Briefs" icon="◈" active={!category} count={knownTotal || undefined} />
                {categories?.map(cat => (
                  <CategoryLink key={cat.id} href={`/?category=${cat.slug}`} label={cat.name} icon={cat.icon} active={category === cat.slug} count={cat.articleCount} />
                ))}
              </nav>
            </div>

            {stats && (
              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">The desk</p>
                  <span className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-emerald-400/70">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70 animate-soft-pulse" />
                    Live
                  </span>
                </div>
                <div className="space-y-3">
                  <Stat value={`${stats.briefsLast24h}`} label="Briefs in last 24h" />
                  <Stat value={`${stats.sourcesMonitored}`} label="Sources represented" />
                  <Stat value={`${stats.sectionsLive}`} label="Sections live" />
                </div>
                <p className="font-mono text-[10px] text-muted-foreground/70 leading-relaxed pt-1 border-t border-border/40 mt-2">
                  ◈ Updated {stats.lastUpdated} · refreshed every {stats.refreshCadenceHours}h.<br />
                  <span className="italic text-muted-foreground/50">Archive of {stats.briefsPublished}+ briefs and growing.</span>
                </p>
              </div>
            )}

            <button
              onClick={() => refreshNews.mutate(undefined, { onSuccess: d => { if (d.inserted > 0) setNewCount(p => p + d.inserted); } })}
              disabled={refreshNews.isPending}
              className="w-full font-mono text-[11px] text-muted-foreground border border-border px-3 py-2 hover:border-accent/50 hover:text-accent transition-colors disabled:opacity-40 text-left flex items-center gap-2"
            >
              <span className={refreshNews.isPending ? "animate-spin inline-block" : ""}>⟳</span>
              {refreshNews.isPending ? "Fetching…" : "Refresh news"}
            </button>

            {/* Editorial micro-quote in sidebar */}
            <div className="pt-6 border-t border-border space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Marginalia</p>
              <blockquote className="font-serif text-sm italic leading-snug text-foreground/70">
                "{randomQuote(3).text}"
              </blockquote>
              <p className="font-mono text-[10px] text-muted-foreground/60">— {randomQuote(3).author}</p>
            </div>
          </div>
        </aside>

        {/* Main feed */}
        <div className="flex-1 min-w-0">
          {/* ── Asymmetric Featured Spread ── */}
          {!isFiltered && heroFeatured && (
            <section className="border-b border-border">
              <div className="px-6 lg:px-10 pt-10 pb-4 flex items-baseline justify-between">
                <SectionLabel>Top Signals · Featured</SectionLabel>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hidden md:block">
                  Today's lead signals
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 border-t border-border">
                <div className="lg:col-span-2 lg:border-r border-border">
                  <HeroFeatured article={heroFeatured} />
                </div>
                <div className="lg:flex lg:flex-col divide-y divide-border border-t lg:border-t-0 border-border">
                  {restFeatured.map(a => <SecondaryFeatured key={a.id} article={a} />)}
                  {restFeatured.length < 2 && (
                    <div className="p-6 flex flex-col justify-center">
                      <QuoteMini quote={randomQuote(11)} />
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── The Daily Brief — numbered editorial ritual ── */}
          {!isFiltered && allArticles.length > 0 && (
            <DailyBrief articles={allArticles} today={today} />
          )}

          {/* ── Editorial pull-quote between featured and latest ── */}
          {!isFiltered && <PullQuote quote={pullQuote} />}

          {/* ── Latest Briefings grid ── */}
          <section className="px-6 lg:px-10 py-10">
            <div className="flex items-baseline justify-between mb-6">
              <SectionLabel>{searchQuery ? `Results for "${searchQuery}"` : currentCatName ?? "The Brief · Latest"}</SectionLabel>
              {knownTotal > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground">
                  {knownTotal}+ briefs · refreshed continuously
                </span>
              )}
            </div>

            {allArticles.length === 0 && !isFetching && (
              <div className="py-24 text-center font-mono text-sm text-muted-foreground">Nothing to brief on yet.</div>
            )}

            {/* Interspersed grid: editorial fragments inserted *between* articles
                (additive — they never replace a briefing) */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {allArticles.flatMap((article, i) => {
                const tiles = [<ArticleCard key={`a-${article.id}`} article={article} />];
                // Insert a fragment after every 8th article (positions 8, 16, 24…)
                if ((i + 1) % 8 === 0 && i < allArticles.length - 1) {
                  tiles.push(
                    <QuoteFragment
                      key={`q-${i}`}
                      quote={QUOTES[(i / 8) % QUOTES.length]}
                    />
                  );
                }
                return tiles;
              })}
            </div>

            <div ref={loaderRef} className="mt-12 flex justify-center h-8">
              {isFetching ? (
                <span className="font-mono text-xs text-muted-foreground animate-soft-pulse">Loading more…</span>
              ) : allArticles.length >= knownTotal && allArticles.length > 0 ? (
                <div className="text-center space-y-2">
                  <span className="block font-mono text-[11px] text-muted-foreground/60 italic">— that is today's reading. —</span>
                  <span className="block font-mono text-[10px] text-muted-foreground/40 uppercase tracking-wider">New briefs arrive every few hours · return tomorrow</span>
                </div>
              ) : null}
            </div>
          </section>

          {/* ── Discovery: Explore + Library teasers ── */}
          {!isFiltered && (
            <section className="mt-20 mb-16 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Link
                href="/explore"
                className="group relative overflow-hidden border border-border bg-surface/40 hover:bg-surface hover:border-accent/50 transition-all p-8 md:p-10 min-h-[260px] flex flex-col justify-between"
              >
                <div className="absolute -top-10 -right-10 text-[180px] font-serif text-accent/5 leading-none select-none group-hover:text-accent/10 transition-colors">◈</div>
                <div className="relative space-y-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">◈ Reality Swipe</p>
                  <h3 className="font-serif text-3xl md:text-4xl tracking-tight leading-[1.05]">
                    A discovery feed,<br /><span className="italic text-foreground/75">tuned to you.</span>
                  </h3>
                  <p className="font-serif text-[15px] text-muted-foreground leading-relaxed max-w-md">
                    Swipe through philosophy fragments, market signals, and geopolitical briefs. The deck adapts to what you keep.
                  </p>
                </div>
                <span className="relative font-mono text-[11px] uppercase tracking-wider text-accent group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                  Open Explore <span aria-hidden>→</span>
                </span>
              </Link>

              <Link
                href="/archive"
                className="group relative overflow-hidden border border-border bg-surface/40 hover:bg-surface hover:border-accent/50 transition-all p-8 md:p-10 min-h-[260px] flex flex-col justify-between"
              >
                <div className="absolute -top-10 -right-10 text-[180px] font-serif text-accent/5 leading-none select-none group-hover:text-accent/10 transition-colors">❖</div>
                <div className="relative space-y-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">❖ Intelligence Library</p>
                  <h3 className="font-serif text-3xl md:text-4xl tracking-tight leading-[1.05]">
                    The Archive.<br /><span className="italic text-foreground/75">Centuries of thought, indexed.</span>
                  </h3>
                  <p className="font-serif text-[15px] text-muted-foreground leading-relaxed max-w-md">
                    Nietzsche to Kahneman, Bretton Woods to ARPANET. Browse by thinker, era, or theme — every entry sourced.
                  </p>
                </div>
                <span className="relative font-mono text-[11px] uppercase tracking-wider text-accent group-hover:translate-x-1 transition-transform inline-flex items-center gap-2">
                  Enter the Library <span aria-hidden>→</span>
                </span>
              </Link>
            </section>
          )}

          {/* ── Editorial discipline / trust strip ── */}
          {!isFiltered && <TrustSignals />}

          {/* ── Closing editorial fragment ── */}
          {!isFiltered && allArticles.length > 0 && (
            <PullQuote quote={QUOTES[(QUOTES.length - 1) % QUOTES.length]} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── The Daily Brief ── editorial ritual, one item per theme ─── */
function DailyBrief({ articles, today }: { articles: any[]; today: string }) {
  // Pick one article per distinct category, up to 7
  const seen = new Set<string>();
  const picks: any[] = [];
  for (const a of articles) {
    const key = (a.category || "").toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      picks.push(a);
    }
    if (picks.length >= 7) break;
  }
  // Fall back to first 6 if we couldn't diversify
  const items = picks.length >= 5 ? picks : articles.slice(0, 6);
  if (items.length === 0) return null;

  const romans = ["I", "II", "III", "IV", "V", "VI", "VII"];

  return (
    <section className="border-y border-border bg-surface/30 px-6 lg:px-10 py-14 lg:py-16">
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent">◈ Today's ritual</p>
          <h2 className="font-serif text-4xl md:text-5xl font-medium leading-[1.05] tracking-tight">
            The Daily Brief.
          </h2>
          <p className="font-serif text-base md:text-lg text-muted-foreground italic max-w-2xl leading-relaxed">
            A short, slow read across geopolitics, markets, technology, mind, society and the long arc of culture.
            <span className="not-italic font-mono text-[11px] text-muted-foreground/60 block mt-2 uppercase tracking-wider">{today}</span>
          </p>
        </header>

        <ol className="divide-y divide-border/60 border-t border-border/60">
          {items.map((article, i) => (
            <li key={article.id}>
              <Link
                href={`/article/${article.id}`}
                className="group grid grid-cols-[44px_1fr] md:grid-cols-[56px_1fr_auto] gap-5 md:gap-7 py-6 md:py-7 items-start hover:bg-background/40 transition-colors -mx-3 md:-mx-5 px-3 md:px-5"
              >
                <span className="font-serif text-2xl md:text-3xl italic text-accent/70 leading-none pt-1">
                  {romans[i]}
                </span>
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    <span className="text-accent">{article.category}</span>
                    <span className="text-border">·</span>
                    <span>{article.readTime}</span>
                  </div>
                  <h3 className="font-serif text-xl md:text-[22px] leading-snug font-medium group-hover:text-accent transition-colors">
                    {article.headline}
                  </h3>
                  <p className="font-serif text-[14px] md:text-[15px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {article.summary}
                  </p>
                </div>
                <span className="hidden md:flex items-center self-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground/60 group-hover:text-accent group-hover:translate-x-1 transition-all">
                  Read →
                </span>
              </Link>
            </li>
          ))}
        </ol>

        <p className="font-serif italic text-sm text-muted-foreground/70 text-center pt-2">
          — that is today's brief. Read slowly. Return tomorrow. —
        </p>
      </div>
    </section>
  );
}

/* ─── Sub-components ─── */

function TrustSignal({ icon, text, className = "" }: { icon: string; text: string; className?: string }) {
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-accent/70">{icon}</span>
      {text}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{children}</h2>;
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="font-serif text-2xl font-medium leading-none">{value}</div>
      <div className="font-mono text-[10px] text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function CategoryLink({ href, label, icon, active, count }: { href: string; label: string; icon: string; active: boolean; count?: number }) {
  return (
    <Link href={href} className={`flex items-center justify-between py-1.5 px-2 text-sm transition-colors group ${active ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-xs ${active ? "text-accent" : "text-muted-foreground group-hover:text-accent/70"}`}>{icon}</span>
        <span className="font-sans">{label}</span>
      </div>
      {count !== undefined && <span className="font-mono text-[10px] text-muted-foreground/60">{count}</span>}
    </Link>
  );
}

/* ─── Cinematic hero featured article (large, image-led) ─── */
function HeroFeatured({ article }: { article: any }) {
  const impactColor = article.impactLevel === "high" ? "bg-red-500" : article.impactLevel === "low" ? "bg-emerald-500" : "bg-amber-400";
  return (
    <Link href={`/article/${article.id}`}>
      <article className="group flex flex-col h-full hover:bg-muted/10 transition-colors">
        {article.imageUrl && (
          <div className="img-vignette aspect-[16/9] lg:aspect-[16/10] overflow-hidden bg-muted">
            <img
              src={article.imageUrl}
              alt={article.headline}
              className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        )}
        <div className="px-6 lg:px-10 py-8 lg:py-10 space-y-5">
          <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
            <span className="text-accent font-medium">{article.category}</span>
            <span className="text-border">·</span>
            <span>{article.readTime}</span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${impactColor}`} />
              <span className="capitalize">{article.impactLevel} impact</span>
            </span>
          </div>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-[42px] xl:text-5xl font-medium leading-[1.1] group-hover:text-accent transition-colors">
            {article.headline}
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed line-clamp-3 max-w-3xl">
            {article.summary}
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <span className="font-mono text-[11px] text-muted-foreground">via {article.source}</span>
            <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
              <span>{article.publishedAt}</span>
              {article.upvotes > 0 && <span>▲ {article.upvotes}</span>}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ─── Side-stack featured (compact, text-forward) ─── */
function SecondaryFeatured({ article }: { article: any }) {
  return (
    <Link href={`/article/${article.id}`} className="block flex-1">
      <article className="group p-6 lg:p-7 h-full flex flex-col gap-3 hover:bg-muted/15 transition-colors">
        <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
          <span className="text-accent">{article.category}</span>
          <span className="text-border">·</span>
          <span>{article.readTime}</span>
        </div>
        <h3 className="font-serif text-xl lg:text-[22px] font-medium leading-snug group-hover:text-accent transition-colors">
          {article.headline}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed flex-1">{article.summary}</p>
        <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
          <span className="font-mono text-[10px] text-muted-foreground truncate">via {article.source}</span>
          <span className="font-mono text-[10px] text-muted-foreground shrink-0">{article.publishedAt}</span>
        </div>
      </article>
    </Link>
  );
}

/* ─── Standard article tile in the grid ─── */
function ArticleCard({ article }: { article: any }) {
  const impactColor = article.impactLevel === "high" ? "bg-red-500" : article.impactLevel === "low" ? "bg-emerald-500" : "bg-amber-400";
  const isQuote = article.contentType === "quote";
  return (
    <Link href={`/article/${article.id}`}>
      <article className="group border border-border hover:border-accent/40 transition-all flex flex-col h-full bg-card relative">
        {!isQuote && (
          <span className="absolute top-2 right-2 z-10 font-mono text-[9px] uppercase tracking-wider bg-background/85 backdrop-blur border border-border/70 px-1.5 py-0.5 text-muted-foreground/80">
            ◈ AI-summarized · verify at source
          </span>
        )}
        {article.imageUrl && (
          <div className="h-44 overflow-hidden bg-muted shrink-0 img-vignette">
            <img
              src={article.imageUrl}
              alt={article.headline}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        )}
        <div className="flex flex-col flex-1 p-5 gap-3">
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground flex-wrap">
            <span className="text-accent font-medium">{article.category}</span>
            <span className="text-border">·</span>
            <span>{article.readTime}</span>
            <span className={`ml-auto w-1.5 h-1.5 rounded-full ${impactColor}`} title={`${article.impactLevel} impact`} />
          </div>
          <h3 className="font-serif text-lg md:text-[19px] font-medium leading-snug group-hover:text-accent transition-colors flex-1">
            {article.headline}
          </h3>
          <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">{article.summary}</p>
          <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
            <span className="font-mono text-[10px] text-muted-foreground truncate">via {article.source}</span>
            <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground shrink-0">
              <span>{article.publishedAt}</span>
              {article.upvotes > 0 && <span>▲ {article.upvotes}</span>}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function QuoteMini({ quote }: { quote: any }) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">◈ Marginalia</p>
      <blockquote className="font-serif text-lg italic leading-snug text-foreground/85">"{quote.text}"</blockquote>
      <p className="font-mono text-[11px] text-muted-foreground">— {quote.author}</p>
    </div>
  );
}
