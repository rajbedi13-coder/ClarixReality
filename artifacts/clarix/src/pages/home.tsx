import { useListArticles, useListCategories, useListFeaturedArticles, useGetPlatformStats } from "@workspace/api-client-react";
import { Link } from "wouter";

export default function Home() {
  const { data: articles } = useListArticles();
  const { data: featured } = useListFeaturedArticles();
  const { data: categories } = useListCategories();
  const { data: stats } = useGetPlatformStats();

  return (
    <div className="container py-8 flex gap-8">
      <aside className="hidden lg:block w-64 shrink-0 space-y-8">
        <div>
          <h2 className="font-mono text-xs text-muted-foreground mb-4 uppercase tracking-wider">Categories</h2>
          <nav className="space-y-1">
            <Link href="/" className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md bg-accent/10 text-accent">
              <span>◈</span> All Briefs
            </Link>
            {categories?.map((cat) => (
              <Link key={cat.id} href={`/?category=${cat.slug}`} className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
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
              <div>
                <div className="font-serif text-2xl">{stats.aiAccuracy}</div>
                <div className="font-mono text-[10px] text-muted-foreground">AI Accuracy</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 space-y-8">
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-3xl font-medium">Featured Intelligence</h2>
          </div>
          <div className="grid gap-6">
            {featured?.map((article) => (
              <ArticleCard key={article.id} article={article} featured />
            ))}
          </div>
        </section>

        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-serif text-2xl font-medium">Latest Briefings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles?.articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ArticleCard({ article, featured = false }: { article: any, featured?: boolean }) {
  return (
    <Link href={`/article/${article.id}`}>
      <div className={`group cursor-pointer rounded-lg border bg-card p-6 transition-all hover:border-accent/50 ${featured ? 'flex flex-col md:flex-row gap-8 items-center' : 'flex flex-col h-full'}`}>
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-accent">◇ {article.category}</span>
            <span className="text-muted-foreground">• {article.readTime}</span>
          </div>
          <h3 className={`font-serif font-medium leading-tight group-hover:text-accent transition-colors ${featured ? 'text-3xl' : 'text-xl'}`}>
            {article.headline}
          </h3>
          <p className="text-muted-foreground leading-relaxed line-clamp-3">
            {article.summary}
          </p>
          <div className="flex items-center justify-between pt-4 border-t border-border/50">
            <div className="font-mono text-xs text-muted-foreground">{article.source}</div>
            <div className="font-mono text-xs text-muted-foreground">{article.publishedAt}</div>
          </div>
        </div>
        {featured && article.icon && (
          <div className="hidden md:flex shrink-0 w-32 h-32 items-center justify-center text-6xl text-accent/20 bg-accent/5 rounded-full">
            {article.icon}
          </div>
        )}
      </div>
    </Link>
  );
}