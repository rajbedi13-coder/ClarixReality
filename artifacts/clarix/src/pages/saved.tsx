import { useListSavedArticles } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Saved() {
  const { data: articles, isLoading } = useListSavedArticles();

  if (isLoading) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <div className="mb-8 space-y-1">
          <h1 className="font-serif text-3xl font-medium">Reading List</h1>
          <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">Saved intelligence</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-12">
      <div className="mb-10 border-b border-border pb-6 flex items-baseline justify-between">
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-medium">Reading List</h1>
          <p className="font-mono text-[11px] text-muted-foreground uppercase tracking-wider">
            {articles?.length ?? 0} saved {(articles?.length ?? 0) === 1 ? "briefing" : "briefings"}
          </p>
        </div>
        <Link href="/" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
          ← Back to feed
        </Link>
      </div>

      {(!articles || articles.length === 0) ? (
        <div className="py-32 flex flex-col items-center gap-4 text-center">
          <span className="font-mono text-3xl text-muted-foreground/30">◇</span>
          <h2 className="font-serif text-xl font-medium">Your reading list is empty</h2>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Save any briefing from the feed to build your personal intelligence archive.
          </p>
          <Link href="/" className="mt-2 font-mono text-[11px] uppercase tracking-wider bg-foreground text-background px-5 py-2.5 hover:opacity-80 transition-opacity">
            Explore briefings
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {articles.map((article) => (
            <Link key={article.id} href={`/article/${article.id}`}>
              <article className="group border border-border hover:border-accent/40 transition-all bg-card flex flex-col h-full">
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
                  <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    <span className="text-accent">{article.category}</span>
                    <span className="text-border">·</span>
                    <span>{article.readTime}</span>
                  </div>
                  <h3 className="font-serif text-[17px] font-medium leading-snug group-hover:text-accent transition-colors flex-1">
                    {article.headline}
                  </h3>
                  <p className="text-[13px] text-muted-foreground leading-relaxed line-clamp-2">{article.summary}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-border/50 mt-auto">
                    <span className="font-mono text-[10px] text-muted-foreground truncate">via {article.source}</span>
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">{article.publishedAt}</span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
