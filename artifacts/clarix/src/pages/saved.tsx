import { useListSavedArticles } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Saved() {
  const { data: articles, isLoading } = useListSavedArticles();

  if (isLoading) {
    return (
      <div className="container py-8 max-w-5xl">
        <h1 className="font-serif text-3xl font-medium mb-8">Saved Briefings</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-5xl">
      <h1 className="font-serif text-3xl font-medium mb-8">Saved Briefings</h1>
      
      {(!articles || articles.length === 0) ? (
        <div className="text-center py-24 bg-surface2 rounded-lg border border-border/50">
          <div className="font-mono text-4xl mb-4 text-muted-foreground">◇</div>
          <h2 className="text-lg font-medium mb-2">No saved briefings</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You haven't saved any articles yet. Bookmark important intelligence to read later or reference in your research.
          </p>
          <Link href="/" className="inline-flex items-center justify-center px-4 py-2 bg-accent text-accent-foreground rounded-md text-sm font-medium">
            Explore Briefings
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <Link key={article.id} href={`/article/${article.id}`}>
              <div className="group cursor-pointer rounded-lg border bg-card p-6 h-full flex flex-col transition-all hover:border-accent/50">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-accent">◇ {article.category}</span>
                    <span className="text-muted-foreground">• {article.readTime}</span>
                  </div>
                  <h3 className="font-serif text-xl font-medium leading-tight group-hover:text-accent transition-colors">
                    {article.headline}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed line-clamp-3">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-auto">
                    <div className="font-mono text-xs text-muted-foreground">{article.source}</div>
                    <div className="font-mono text-xs text-muted-foreground">{article.publishedAt}</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
