import { useListArticles, useListCategories, useListFeaturedArticles, useGetPlatformStats, useRefreshNews } from "@workspace/api-client-react";
import { Link, useSearch } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

const PAGE_SIZE = 20;

export default function Home() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const category = params.get("category") || undefined;
  const searchQuery = params.get("q") || undefined;

  const [page, setPage] = useState(1);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [knownTotal, setKnownTotal] = useState(0);
  const [newCount, setNewCount] = useState(0);
  const [searchInput, setSearchInput] = useState(searchQuery || "");
  const loaderRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: articlesPage, isFetching } = useListArticles(
    { category, search: searchQuery, page, limit: PAGE_SIZE }
  );

  const { data: featured } = useListFeaturedArticles();
  const { data: categories } = useListCategories();
  const { data: stats } = useGetPlatformStats();
  const refreshNews = useRefreshNews();

  useEffect(() => {
    setPage(1);
    setAllArticles([]);
    setKnownTotal(0);
  }, [category, searchQuery]);

  useEffect(() => {
    if (!articlesPage) return;
    if (page === 1) {
      setAllArticles(articlesPage.articles);
      setKnownTotal(articlesPage.total);
    } else {
      setAllArticles(prev => {
        const existingIds = new Set(prev.map((a: any) => a.id));
        const fresh = articlesPage.articles.filter((a: any) => !existingIds.has(a.id));
        return [...prev, ...fresh];
      });
    }
  }, [articlesPage, page]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && !isFetching && allArticles.length < knownTotal) {
      setPage(p => p + 1);
    }
  }, [isFetching, allArticles.length, knownTotal]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [handleObserver]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/articles?page=1&limit=1" + (category ? `&category=${category}` : ""));
        const data = await res.json();
        if (data.total > knownTotal && knownTotal > 0) {
          setNewCount(data.total - knownTotal);
        }
      } catch { /* silent */ }
    }, 60_000);
    return () => clearInterval(id);
  }, [category, knownTotal]);

  const handleRefreshBanner = () => {
    setNewCount(0);
    setPage(1);
    setAllArticles([]);
    queryClient.invalidateQueries();
  };

  const handleManualRefresh = () => {
    refreshNews.mutate(undefined, {
      onSuccess: (data) => {
        if (data.inserted > 0) setNewCount(prev => prev + data.inserted);
      }
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = searchInput ? `/?q=${encodeURIComponent(searchInput)}` : "/";
  };

  return (
    <div className="container py-8 flex gap-8">
      {/* Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 space-y-8">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search briefings…"
            className="w-full bg-card border border-border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground"
          />
          <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-accent text-base leading-none">⌕</button>
        </form>

        <div>
          <h2 className="font-mono text-xs text-muted-foreground mb-4 uppercase tracking-wider">Categories</h2>
          <nav className="space-y-1">
            <Link href="/" className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${!category ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <span>◈</span> All Briefs
            </Link>
            {categories?.map((cat) => (
              <Link key={cat.id} href={`/?category=${cat.slug}`} className={`flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${category === cat.slug ? "bg-accent/10 text-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <div className="flex items-center gap-2">
                  <span>{cat.icon}</span> {cat.name}
                </div>
                <span className="font-mono text-xs opacity-50">{cat.articleCount}</span>
              </Link>
            ))}
          </nav>
        </div>

        {stats && (
          <div className="rounded-lg border p-4 bg-card space-y-4">
            <h3 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">Platform Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-serif text-2xl">{stats.briefsPublished}</div>
                <div className="font-mono text-[10px] text-muted-foreground">Briefs</div>
              </div>
              <div>
                <div className="font-serif text-2xl">{stats.sourcesMonitored}</div>
                <div className="font-mono text-[10px] text-muted-foreground">Sources</div>
              </div>
              <div className="col-span-2">
                <div className="font-serif text-2xl">{stats.aiAccuracy}</div>
                <div className="font-mono text-[10px] text-muted-foreground">AI Accuracy</div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleManualRefresh}
          disabled={refreshNews.isPending}
          className="w-full font-mono text-xs text-muted-foreground border border-border rounded-md px-3 py-2 hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
        >
          {refreshNews.isPending ? "⟳ Fetching news…" : "⟳ Refresh news"}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 space-y-8">
        {newCount > 0 && (
          <button
            onClick={handleRefreshBanner}
            className="w-full text-center py-2.5 px-4 bg-accent/10 border border-accent/30 text-accent font-mono text-sm rounded-lg hover:bg-accent/20 transition-colors"
          >
            ↑ {newCount} new article{newCount > 1 ? "s" : ""} available — click to load
          </button>
        )}

        {!searchQuery && !category && (featured?.length ?? 0) > 0 && (
          <section>
            <h2 className="font-serif text-3xl font-medium mb-6">Featured Intelligence</h2>
            <div className="grid gap-6">
              {featured!.map((article) => (
                <ArticleCard key={article.id} article={article} featured />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-medium">
              {searchQuery
                ? `Results for "${searchQuery}"`
                : category
                ? (categories?.find(c => c.slug === category)?.name ?? "Briefings")
                : "Latest Briefings"}
            </h2>
            {knownTotal > 0 && (
              <span className="font-mono text-xs text-muted-foreground">{knownTotal} articles</span>
            )}
          </div>

          {allArticles.length === 0 && !isFetching && (
            <div className="text-center py-16 font-mono text-sm text-muted-foreground">No briefings found.</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {allArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          <div ref={loaderRef} className="mt-10 flex justify-center min-h-[40px]">
            {isFetching ? (
              <span className="font-mono text-xs text-muted-foreground flex items-center gap-2">
                <span className="animate-spin inline-block">⟳</span> Loading more…
              </span>
            ) : allArticles.length > 0 && allArticles.length >= knownTotal ? (
              <span className="font-mono text-xs text-muted-foreground">— End of feed —</span>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function ArticleCard({ article, featured = false }: { article: any; featured?: boolean }) {
  const impactDot =
    article.impactLevel === "high" ? "bg-red-500" :
    article.impactLevel === "low" ? "bg-green-500" : "bg-yellow-500";

  return (
    <Link href={`/article/${article.id}`}>
      <div className={`group cursor-pointer rounded-lg border bg-card overflow-hidden transition-all hover:border-accent/50 hover:shadow-md ${featured ? "flex flex-col md:flex-row" : "flex flex-col h-full"}`}>
        {article.imageUrl && (
          <div className={`overflow-hidden bg-muted shrink-0 ${featured ? "h-52 md:h-auto md:w-72" : "h-44"}`}>
            <img
              src={article.imageUrl}
              alt={article.headline}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        )}

        <div className="flex-1 p-5 flex flex-col gap-3 min-w-0">
          <div className="flex items-center gap-2 font-mono text-xs flex-wrap">
            <span className="text-accent">◇ {article.category}</span>
            <span className="text-muted-foreground">• {article.readTime}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${impactDot}`} title={`${article.impactLevel} impact`} />
            <span className="text-muted-foreground capitalize">{article.sentiment}</span>
          </div>

          <h3 className={`font-serif font-medium leading-snug group-hover:text-accent transition-colors ${featured ? "text-2xl" : "text-lg"}`}>
            {article.headline}
          </h3>

          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 flex-1">
            {article.summary}
          </p>

          <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
            <span className="font-mono text-[10px] text-muted-foreground truncate">via {article.source}</span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-mono text-[10px] text-muted-foreground">{article.publishedAt}</span>
              {article.upvotes > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground">▲ {article.upvotes}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
