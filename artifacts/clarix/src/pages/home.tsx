import {
  useListArticles,
  useListCategories,
  useListFeaturedArticles,
  useGetPlatformStats,
  useRefreshNews,
} from "@workspace/api-client-react";
import { Link, useSearch } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

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

  return (
    <div className="max-w-screen-xl mx-auto">
      {/* ── Hero (only on unfiltered home) ── */}
      {!isFiltered && (
        <section className="border-b border-border px-6 py-16 md:py-24 animate-fade-up">
          <div className="max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">Intelligence Platform</span>
              <span className="h-px flex-1 max-w-[40px] bg-accent/40" />
            </div>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-medium leading-[1.05] text-foreground">
              Signal over noise<br />
              <span className="text-accent italic">for the curious mind.</span>
            </h1>
            <p className="font-sans text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl font-normal">
              Finance, geopolitics, psychology and global intelligence — curated, AI-assisted, and source-transparent. No clickbait. No rage bait. No meme feed.
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link href="/signup" className="inline-flex items-center gap-2 bg-foreground text-background font-mono text-xs uppercase tracking-wider px-5 py-3 hover:opacity-80 transition-opacity">
                Start free trial
              </Link>
              <Link href="#briefings" className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors px-5 py-3 border border-border hover:border-foreground/30">
                Explore briefings
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Trust signals bar ── */}
      {!isFiltered && (
        <div className="border-b border-border bg-surface px-6 py-3 overflow-x-auto">
          <div className="flex items-center gap-6 text-[11px] font-mono text-muted-foreground whitespace-nowrap">
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
            <TrustSignal icon="▽" text={`${stats?.briefsPublished ?? "—"} briefings indexed`} className="hidden md:flex" />
          </div>
        </div>
      )}

      {/* ── New articles banner ── */}
      {newCount > 0 && (
        <button
          onClick={() => { setNewCount(0); setPage(1); setAllArticles([]); queryClient.invalidateQueries(); }}
          className="w-full py-2.5 text-center font-mono text-xs text-accent border-b border-accent/30 bg-accent/5 hover:bg-accent/10 transition-colors animate-soft-pulse"
        >
          ↑ {newCount} new {newCount === 1 ? "briefing" : "briefings"} available — click to reload
        </button>
      )}

      {/* ── Main layout ── */}
      <div className="flex gap-0" id="briefings">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-60 xl:w-64 shrink-0 border-r border-border min-h-[60vh]">
          <div className="sticky top-[88px] p-5 space-y-8">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search intelligence…"
                className="w-full bg-transparent border border-border px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent placeholder:text-muted-foreground/60 transition-colors"
              />
              <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent transition-colors text-sm">
                ⌕
              </button>
            </form>

            {/* Categories */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Sections</p>
              <nav className="space-y-0.5">
                <CategoryLink href="/" label="All Briefings" icon="◈" active={!category} count={knownTotal || undefined} />
                {categories?.map(cat => (
                  <CategoryLink
                    key={cat.id}
                    href={`/?category=${cat.slug}`}
                    label={cat.name}
                    icon={cat.icon}
                    active={category === cat.slug}
                    count={cat.articleCount}
                  />
                ))}
              </nav>
            </div>

            {/* Stats */}
            {stats && (
              <div className="space-y-4 pt-2 border-t border-border">
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Platform</p>
                <div className="space-y-3">
                  <Stat value={stats.briefsPublished} label="Briefings" />
                  <Stat value={stats.sourcesMonitored} label="Sources tracked" />
                  <Stat value={stats.aiAccuracy} label="AI accuracy" />
                </div>
              </div>
            )}

            {/* Refresh */}
            <button
              onClick={() => refreshNews.mutate(undefined, { onSuccess: d => { if (d.inserted > 0) setNewCount(p => p + d.inserted); } })}
              disabled={refreshNews.isPending}
              className="w-full font-mono text-[11px] text-muted-foreground border border-border px-3 py-2 hover:border-accent/50 hover:text-accent transition-colors disabled:opacity-40 text-left flex items-center gap-2"
            >
              <span className={refreshNews.isPending ? "animate-spin inline-block" : ""}>⟳</span>
              {refreshNews.isPending ? "Fetching…" : "Refresh news"}
            </button>
          </div>
        </aside>

        {/* Feed */}
        <div className="flex-1 min-w-0">
          {/* Featured (unfiltered only) */}
          {!isFiltered && (featured?.length ?? 0) > 0 && (
            <section className="border-b border-border">
              <div className="px-6 pt-8 pb-3">
                <SectionLabel>Featured Intelligence</SectionLabel>
              </div>
              <div className="divide-y divide-border">
                {featured!.map((article, i) => (
                  <FeaturedCard key={article.id} article={article} priority={i === 0} />
                ))}
              </div>
            </section>
          )}

          {/* Article grid */}
          <section className="px-6 py-8">
            <div className="flex items-baseline justify-between mb-6">
              <SectionLabel>
                {searchQuery ? `Results for "${searchQuery}"` : currentCatName ?? "Latest Briefings"}
              </SectionLabel>
              {knownTotal > 0 && (
                <span className="font-mono text-[11px] text-muted-foreground">{knownTotal} articles</span>
              )}
            </div>

            {allArticles.length === 0 && !isFetching && (
              <div className="py-24 text-center font-mono text-sm text-muted-foreground">No briefings found.</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {allArticles.map(article => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={loaderRef} className="mt-12 flex justify-center h-8">
              {isFetching ? (
                <span className="font-mono text-xs text-muted-foreground">Loading…</span>
              ) : allArticles.length >= knownTotal && allArticles.length > 0 ? (
                <span className="font-mono text-[11px] text-muted-foreground/50">End of feed</span>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function TrustSignal({ icon, text, className = "" }: { icon: string; text: string; className?: string }) {
  return (
    <span className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-accent/70">{icon}</span>
      {text}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{children}</h2>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <div className="font-serif text-xl font-medium">{value}</div>
      <div className="font-mono text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function CategoryLink({ href, label, icon, active, count }: { href: string; label: string; icon: string; active: boolean; count?: number }) {
  return (
    <Link href={href} className={`flex items-center justify-between py-1.5 px-2 text-sm transition-colors group ${active ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-xs ${active ? "text-accent" : "text-muted-foreground group-hover:text-accent/70"}`}>{icon}</span>
        <span className="font-sans text-sm">{label}</span>
      </div>
      {count !== undefined && (
        <span className="font-mono text-[10px] text-muted-foreground/60">{count}</span>
      )}
    </Link>
  );
}

function FeaturedCard({ article, priority }: { article: any; priority: boolean }) {
  const impactColor = article.impactLevel === "high" ? "bg-red-500" : article.impactLevel === "low" ? "bg-emerald-500" : "bg-amber-400";

  return (
    <Link href={`/article/${article.id}`}>
      <article className={`group flex flex-col md:flex-row hover:bg-muted/20 transition-colors ${priority ? "md:min-h-[280px]" : "md:min-h-[180px]"}`}>
        {/* Image */}
        {article.imageUrl && (
          <div className={`shrink-0 overflow-hidden bg-muted ${priority ? "md:w-96 h-56 md:h-auto" : "md:w-64 h-44 md:h-auto"}`}>
            <img
              src={article.imageUrl}
              alt={article.headline}
              loading={priority ? "eager" : "lazy"}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        )}
        {/* Content */}
        <div className="flex-1 px-6 py-5 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
              <span className="text-accent">{article.category}</span>
              <span className="text-border">·</span>
              <span>{article.readTime}</span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${impactColor}`} />
                <span className="capitalize">{article.impactLevel} impact</span>
              </span>
            </div>
            <h2 className={`font-serif font-medium leading-tight group-hover:text-accent transition-colors ${priority ? "text-2xl md:text-3xl" : "text-xl"}`}>
              {article.headline}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{article.summary}</p>
          </div>
          <div className="flex items-center justify-between border-t border-border/50 pt-3">
            <span className="font-mono text-[10px] text-muted-foreground">via {article.source}</span>
            <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
              <span>{article.publishedAt}</span>
              {article.upvotes > 0 && <span>▲ {article.upvotes}</span>}
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

function ArticleCard({ article }: { article: any }) {
  const impactColor = article.impactLevel === "high" ? "bg-red-500" : article.impactLevel === "low" ? "bg-emerald-500" : "bg-amber-400";

  return (
    <Link href={`/article/${article.id}`}>
      <article className="group border border-border hover:border-accent/40 transition-all hover:shadow-sm flex flex-col h-full bg-card">
        {/* Image */}
        {article.imageUrl && (
          <div className="h-40 overflow-hidden bg-muted shrink-0">
            <img
              src={article.imageUrl}
              alt={article.headline}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        )}

        <div className="flex flex-col flex-1 p-4 gap-3">
          {/* Meta */}
          <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground flex-wrap">
            <span className="text-accent font-medium">{article.category}</span>
            <span className="text-border">·</span>
            <span>{article.readTime}</span>
            <span className={`ml-auto w-1.5 h-1.5 rounded-full ${impactColor}`} title={`${article.impactLevel} impact`} />
          </div>

          {/* Headline */}
          <h3 className="font-serif text-[17px] font-medium leading-snug group-hover:text-accent transition-colors flex-1">
            {article.headline}
          </h3>

          {/* Summary */}
          <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">
            {article.summary}
          </p>

          {/* Footer */}
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
