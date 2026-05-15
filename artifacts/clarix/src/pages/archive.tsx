import { useState } from "react";
import { Link } from "wouter";
import { useListArchive, useListArchiveAuthors, useListCategories } from "@workspace/api-client-react";

const CONTENT_TYPES = [
  { slug: "all", label: "All" },
  { slug: "philosophy", label: "Philosophy" },
  { slug: "historical", label: "Historical" },
  { slug: "psychology", label: "Psychology" },
  { slug: "essay", label: "Deep Essay" },
  { slug: "geopolitical", label: "Geopolitical" },
  { slug: "market_signal", label: "Market Signal" },
  { slug: "culture", label: "Culture" },
  { slug: "technology", label: "Technology" },
  { slug: "news", label: "News" },
];

const DECADES = [
  { value: 0, label: "All eras" },
  { value: 2020, label: "2020s" },
  { value: 2010, label: "2010s" },
  { value: 2000, label: "2000s" },
  { value: 1990, label: "1990s" },
  { value: 1980, label: "1980s" },
  { value: 1970, label: "1970s" },
  { value: 1960, label: "1960s" },
  { value: 1950, label: "1950s" },
  { value: 1940, label: "1940s" },
  { value: 1930, label: "1930s" },
  { value: 1920, label: "1920s" },
  { value: 1900, label: "Pre-1920" },
];

export default function Archive() {
  const [contentType, setContentType] = useState<string>("all");
  const [author, setAuthor] = useState<string>("all");
  const [decade, setDecade] = useState<number>(0);
  const [search, setSearch] = useState<string>("");

  const { data: authors } = useListArchiveAuthors();
  const { data: cats } = useListCategories();
  const { data, isLoading } = useListArchive({
    contentType: contentType !== "all" ? contentType : undefined,
    author: author !== "all" ? author : undefined,
    decade: decade > 0 ? decade : undefined,
    search: search || undefined,
    limit: 30,
  } as any);

  const articles = data?.articles ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6 pt-10 md:pt-16 pb-24">
        {/* Header */}
        <header className="mb-10 md:mb-14 space-y-3 animate-soft-fade">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-accent">◈ Intelligence Library</p>
          <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl tracking-tight leading-[0.95]">
            The Archive.
          </h1>
          <p className="font-serif text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
            A curated reading shelf — philosophy, history, psychology, market signals — drawn from primary sources, with citation. Search by thinker, theme, era.
          </p>
        </header>

        {/* Filters */}
        <div className="border-y border-border py-5 mb-10 space-y-4">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search the library — Nietzsche, Bretton Woods, attention, 1929…"
            className="w-full bg-transparent border-b border-border focus:border-accent outline-none py-2 font-serif text-base placeholder:text-muted-foreground/60 transition-colors"
          />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-[11px] font-mono uppercase tracking-wider">
            {/* Content type */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground/60">Type:</span>
              {CONTENT_TYPES.map(t => (
                <button
                  key={t.slug}
                  onClick={() => setContentType(t.slug)}
                  className={`px-2.5 py-1 border transition-colors ${contentType === t.slug ? "border-accent text-accent bg-accent/5" : "border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] font-mono">
            <label className="flex items-center gap-2">
              <span className="uppercase tracking-wider text-muted-foreground/60">Era:</span>
              <select
                value={decade}
                onChange={e => setDecade(Number(e.target.value))}
                className="bg-background border border-border px-2 py-1 hover:border-foreground transition-colors text-foreground"
              >
                {DECADES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="uppercase tracking-wider text-muted-foreground/60">Author:</span>
              <select
                value={author}
                onChange={e => setAuthor(e.target.value)}
                className="bg-background border border-border px-2 py-1 hover:border-foreground transition-colors text-foreground max-w-[220px]"
              >
                <option value="all">All thinkers</option>
                {(authors ?? []).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>

            <span className="ml-auto text-muted-foreground/60 normal-case">
              {isLoading ? "Searching…" : `${total} ${total === 1 ? "entry" : "entries"}`}
            </span>
          </div>
        </div>

        {/* Results grid */}
        {articles.length === 0 && !isLoading ? (
          <div className="py-24 text-center font-serif text-lg italic text-muted-foreground">
            No entries match. Try a broader filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((a: any) => <ArchiveCard key={a.id} article={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ArchiveCard({ article }: { article: any }) {
  const typeLabel = article.contentType?.replace("_", " ") ?? "entry";
  return (
    <Link
      href={`/article/${article.id}`}
      className="group block border border-border bg-surface/40 hover:bg-surface hover:border-accent/40 transition-all p-5 md:p-6 flex flex-col gap-4 min-h-[260px]"
    >
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
        <span className="text-accent">◈ {typeLabel}</span>
        {article.historicalDate && <span>{article.historicalDate}</span>}
      </div>

      <h3 className="font-serif text-xl leading-tight tracking-tight text-foreground group-hover:text-accent transition-colors">
        {article.headline}
      </h3>

      {article.author && (
        <p className="font-serif italic text-sm text-muted-foreground -mt-2">{article.author}</p>
      )}

      <p className="font-serif text-[14px] leading-relaxed text-foreground/75 line-clamp-3">
        {article.summary}
      </p>

      <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span className="truncate max-w-[70%]">{article.source}</span>
        <span>{article.readTime}</span>
      </div>
    </Link>
  );
}
