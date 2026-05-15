import {
  useListArticles,
  useListFeaturedArticles,
  useListCategories,
} from "@workspace/api-client-react";
import { Link, useSearch } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import { upscaleImageUrl } from "@/lib/imageQuality";

const PAGE_SIZE = 18;

/* The Brief — a calm, Geobarta-inspired front page.
   Masthead → one lead story → a 3-up secondary grid → a clean editorial list.
   Single column of attention. No ticker, no sidebar, no decorative quotes. */
export default function Home() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const category = params.get("category") || undefined;
  const searchQuery = params.get("q") || undefined;
  const isFiltered = !!(category || searchQuery);

  const [page, setPage] = useState(1);
  const [allArticles, setAllArticles] = useState<any[]>([]);
  const [knownTotal, setKnownTotal] = useState(0);
  const [searchInput, setSearchInput] = useState(searchQuery || "");
  const loaderRef = useRef<HTMLDivElement>(null);

  const { data: articlesPage, isFetching } = useListArticles({ category, search: searchQuery, page, limit: PAGE_SIZE });
  const { data: featured } = useListFeaturedArticles();
  const { data: categories } = useListCategories();

  useEffect(() => { setPage(1); setAllArticles([]); setKnownTotal(0); }, [category, searchQuery]);

  useEffect(() => {
    if (!articlesPage) return;
    if (page === 1) { setAllArticles(articlesPage.articles); setKnownTotal(articlesPage.total); }
    else setAllArticles(prev => {
      const ids = new Set(prev.map((a: any) => a.id));
      return [...prev, ...articlesPage.articles.filter((a: any) => !ids.has(a.id))];
    });
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = searchInput ? `/?q=${encodeURIComponent(searchInput)}` : "/";
  };

  const currentCatName = categories?.find(c => c.slug === category)?.name;
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Compose the front-page selection.
  // Lead = first featured (or first article).
  // Secondaries = next 3 featured, falling back to articles, deduped against lead.
  const featuredList = featured ?? [];
  const lead = !isFiltered ? (featuredList[0] ?? allArticles[0]) : allArticles[0];
  const usedIds = new Set<number>();
  if (lead) usedIds.add(lead.id);

  const pickSecondaries = (n: number) => {
    const out: any[] = [];
    const pool = !isFiltered ? [...featuredList.slice(1), ...allArticles] : allArticles.slice(1);
    for (const a of pool) {
      if (out.length >= n) break;
      if (a && !usedIds.has(a.id)) { out.push(a); usedIds.add(a.id); }
    }
    return out;
  };
  const secondaries = pickSecondaries(3);
  const rest = allArticles.filter(a => !usedIds.has(a.id));

  return (
    <div className="bg-background">
      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 py-10 md:py-14">

        {/* ── Masthead ── */}
        {!isFiltered && (
          <header className="border-b border-border pb-8 md:pb-10 mb-10 md:mb-14">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-3">
                  Vol. I · {today}
                </p>
                <h1 className="font-serif font-medium text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.02]">
                  The Brief
                </h1>
                <p className="font-serif italic text-base md:text-lg text-muted-foreground mt-3 max-w-xl leading-relaxed">
                  A quiet intelligence dispatch — finance, geopolitics, technology, the long arc of culture.
                </p>
              </div>
              <form onSubmit={handleSearch} className="md:w-72">
                <div className="relative">
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search the brief…"
                    className="w-full bg-transparent border-b border-border focus:border-foreground transition-colors py-2 pr-8 font-serif text-sm placeholder:text-muted-foreground/60 focus:outline-none"
                  />
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-xs text-muted-foreground">⌕</span>
                </div>
              </form>
            </div>
          </header>
        )}

        {/* ── Filter banner ── */}
        {isFiltered && (
          <header className="flex items-center justify-between border-b border-border pb-5 mb-8">
            <div className="flex items-baseline gap-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                {searchQuery ? "Search" : "Section"}
              </p>
              <h1 className="font-serif text-2xl md:text-3xl tracking-tight">
                {searchQuery ? `“${searchQuery}”` : (currentCatName ?? "Brief")}
              </h1>
              {knownTotal > 0 && (
                <span className="font-mono text-xs text-muted-foreground">{knownTotal} brief{knownTotal === 1 ? "" : "s"}</span>
              )}
            </div>
            <Link href="/" className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors">
              Clear ✕
            </Link>
          </header>
        )}

        {/* ── Empty state (shown high on the page if there's nothing) ── */}
        {!isFetching && allArticles.length === 0 && articlesPage && (
          <div className="py-24 text-center border border-dashed border-border">
            <p className="font-serif italic text-lg text-muted-foreground">
              {searchQuery ? `No briefs match “${searchQuery}”.` : "No briefs in this section yet."}
            </p>
            {isFiltered && (
              <Link href="/" className="inline-block mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-accent hover:underline">
                Return to The Brief
              </Link>
            )}
          </div>
        )}

        {/* ── Lead story ── */}
        {lead && !isFiltered && <LeadStory article={lead} />}

        {/* ── Secondary grid ── */}
        {secondaries.length > 0 && !isFiltered && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12 border-t border-border pt-10 md:pt-12 mt-10 md:mt-14">
            {secondaries.map(a => <SecondaryCard key={a.id} article={a} />)}
          </div>
        )}

        {/* ── Section divider ── */}
        {rest.length > 0 && (
          <div className="flex items-center gap-4 mt-16 md:mt-20 mb-8">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              {isFiltered ? "Briefs" : "More from the desk"}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
        )}

        {/* ── Editorial list ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-0 divide-y md:divide-y-0 divide-border">
          {rest.map((a, i) => (
            <ListRow key={a.id} article={a} stripeRight={i % 2 === 0} />
          ))}
        </div>

        {/* ── Loader / end-of-feed ── */}
        <div ref={loaderRef} className="py-16 text-center">
          {isFetching && (
            <p className="font-mono text-xs text-muted-foreground animate-pulse">Loading more briefs…</p>
          )}
          {!isFetching && allArticles.length > 0 && allArticles.length >= knownTotal && (
            <p className="font-serif italic text-muted-foreground">
              You've reached the bottom. Return tomorrow for the next dispatch.
            </p>
          )}
          {!isFetching && allArticles.length === 0 && (
            <p className="font-serif italic text-muted-foreground">No briefs match this filter.</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Lead story: the front page's centerpiece ─── */
function LeadStory({ article }: { article: any }) {
  const img = upscaleImageUrl(article.imageUrl);
  const dot = impactDot(article.impactLevel);
  return (
    <Link href={`/article/${article.id}`} className="block group">
      <article className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 lg:gap-12 items-stretch">
        {img ? (
          <div className="relative aspect-[16/10] overflow-hidden bg-surface">
            <img
              src={img}
              alt={article.headline}
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          <div className="aspect-[16/10] bg-surface border border-border flex items-center justify-center">
            <span className="font-serif italic text-5xl text-muted-foreground/40">{article.icon ?? "◈"}</span>
          </div>
        )}
        <div className="flex flex-col justify-center py-2">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-5">
            <span className="text-accent">{article.icon}</span>
            <span>{article.category}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${dot}`} aria-label={`${article.impactLevel} impact`} />
            <span>{article.publishedAt}</span>
          </div>
          <h2 className="font-serif font-medium text-3xl md:text-4xl lg:text-5xl tracking-tight leading-[1.05] text-foreground group-hover:text-accent transition-colors">
            {article.headline}
          </h2>
          {article.summary && (
            <p className="font-serif text-base md:text-lg text-foreground/80 leading-relaxed mt-5 max-w-prose">
              {article.summary}
            </p>
          )}
          <div className="flex items-center gap-3 mt-6 font-mono text-[11px] text-muted-foreground">
            <span>{article.source}</span>
            <span className="text-border">·</span>
            <span>{article.readTime}</span>
            {article.author && <><span className="text-border">·</span><span className="italic">{article.author}</span></>}
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ─── Secondary card: image-on-top, three across ─── */
function SecondaryCard({ article }: { article: any }) {
  const img = upscaleImageUrl(article.imageUrl);
  const dot = impactDot(article.impactLevel);
  return (
    <Link href={`/article/${article.id}`} className="group block space-y-4">
      {img ? (
        <div className="relative aspect-[4/3] overflow-hidden bg-surface">
          <img
            src={img}
            alt={article.headline}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-surface border border-border flex items-center justify-center">
          <span className="font-serif italic text-3xl text-muted-foreground/40">{article.icon ?? "◈"}</span>
        </div>
      )}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          <span>{article.category}</span>
        </div>
        <h3 className="font-serif text-xl md:text-[22px] tracking-tight leading-[1.15] text-foreground group-hover:text-accent transition-colors">
          {article.headline}
        </h3>
        {article.summary && (
          <p className="font-serif text-sm md:text-[15px] text-muted-foreground leading-relaxed line-clamp-3">
            {article.summary}
          </p>
        )}
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 pt-1">
          {article.source} · {article.readTime}
        </p>
      </div>
    </Link>
  );
}

/* ─── Editorial list row: type-led, no thumbnail noise ─── */
function ListRow({ article, stripeRight }: { article: any; stripeRight: boolean }) {
  const dot = impactDot(article.impactLevel);
  return (
    <Link
      href={`/article/${article.id}`}
      className={`group block py-7 md:py-8 ${stripeRight ? "md:pr-6 md:border-r md:border-border" : "md:pl-6"}`}
    >
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        <span>{article.category}</span>
        <span className="text-border">·</span>
        <span>{article.publishedAt}</span>
      </div>
      <h3 className="font-serif text-[22px] md:text-2xl tracking-tight leading-[1.15] text-foreground group-hover:text-accent transition-colors">
        {article.headline}
      </h3>
      {article.summary && (
        <p className="font-serif text-[15px] text-muted-foreground leading-relaxed mt-3 line-clamp-2">
          {article.summary}
        </p>
      )}
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 mt-4">
        {article.source} · {article.readTime}
      </p>
    </Link>
  );
}

function impactDot(level: string | undefined): string {
  if (level === "high") return "bg-red-500";
  if (level === "low") return "bg-emerald-500";
  return "bg-amber-400";
}
