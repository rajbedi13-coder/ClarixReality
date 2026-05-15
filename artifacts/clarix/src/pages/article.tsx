import { useParams, Link } from "wouter";
import {
  useGetArticle,
  useListComments,
  useCreateComment,
  useToggleArticleUpvote,
  useToggleArticleSave,
  useToggleCommentUpvote,
  getGetArticleQueryKey,
  getListCommentsQueryKey,
  useGetCurrentUser,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

/* ── Comment label derivation (no DB changes needed) ── */
function getAnalysisLabel(comment: any): { label: string; cls: string } {
  const text = (comment.content || "").toLowerCase();
  if (comment.upvotes >= 15 || text.includes("study") || text.includes("evidence") || text.includes("data shows") || text.includes("research"))
    return { label: "Evidence-backed", cls: "text-blue-400 border-blue-400/30 bg-blue-400/5" };
  if (text.includes("however") || text.includes("disagree") || text.includes("contrary") || text.includes("but consider") || text.includes("counterpoint") || text.includes("on the other hand"))
    return { label: "Counterpoint", cls: "text-orange-400 border-orange-400/30 bg-orange-400/5" };
  if (comment.status === "approved" || comment.upvotes >= 20)
    return { label: "Moderator Reviewed", cls: "text-accent border-accent/30 bg-accent/5" };
  return { label: "Insightful", cls: "text-muted-foreground border-border/60 bg-muted/20" };
}

export default function ArticleDetail() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: user } = useGetCurrentUser();

  const { data: article, isLoading } = useGetArticle(id, {
    query: { enabled: !!id, queryKey: getGetArticleQueryKey(id) },
  });
  const { data: comments } = useListComments(id, {
    query: { enabled: !!id, queryKey: getListCommentsQueryKey(id) },
  });

  const toggleUpvote = useToggleArticleUpvote();
  const toggleSave = useToggleArticleSave();
  const createComment = useCreateComment();
  const toggleCommentUpvote = useToggleCommentUpvote();
  const [commentContent, setCommentContent] = useState("");

  const handleUpvote = () =>
    toggleUpvote.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetArticleQueryKey(id) }) });

  const handleSave = () =>
    toggleSave.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetArticleQueryKey(id) });
        toast({ title: article?.isSaved ? "Removed from saved" : "Saved to reading list" });
      },
    });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentContent.length < 20 || !user) return;
    createComment.mutate(
      { id, data: { content: commentContent, userName: user.name, userRole: user.role || "Member" } },
      {
        onSuccess: () => {
          setCommentContent("");
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(id) });
          toast({ title: "Analysis posted" });
        },
      }
    );
  };

  if (isLoading || !article) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-16">
        <div className="max-w-2xl space-y-8 animate-pulse">
          <div className="h-5 bg-muted rounded w-24" />
          <div className="h-72 bg-muted rounded" />
          <div className="h-10 bg-muted rounded w-3/4" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-5/6" />
            <div className="h-4 bg-muted rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  const impactColor =
    article.impactLevel === "high" ? "bg-red-500" :
    article.impactLevel === "low" ? "bg-emerald-500" : "bg-amber-400";

  return (
    <div className="max-w-screen-xl mx-auto">
      {/* ── Sticky article toolbar ── */}
      <div className="sticky top-[88px] z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Link href="/" className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
            ← Briefings
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpvote}
              className={`flex items-center gap-2 px-3 py-1.5 font-mono text-[11px] border transition-colors ${
                article.isUpvoted
                  ? "border-accent text-accent bg-accent/8"
                  : "border-border text-muted-foreground hover:border-accent/50 hover:text-accent"
              }`}
            >
              ▲ {article.upvotes} Insightful
            </button>
            <button
              onClick={handleSave}
              className={`px-3 py-1.5 font-mono text-[11px] border transition-colors ${
                article.isSaved
                  ? "border-foreground/40 text-foreground bg-foreground/8"
                  : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {article.isSaved ? "✓ Saved" : "Save"}
            </button>
            <button
              onClick={async () => {
                const url = window.location.href;
                const shareData = { title: article.headline, text: article.summary, url };
                try {
                  if (navigator.share && navigator.canShare?.(shareData)) {
                    await navigator.share(shareData);
                  } else {
                    await navigator.clipboard.writeText(url);
                    toast({ title: "Link copied" });
                  }
                } catch { /* user dismissed share */ }
              }}
              className="px-3 py-1.5 font-mono text-[11px] border border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="max-w-3xl mx-auto px-6">
        {/* Hero image */}
        {article.imageUrl && (
          <div className="mt-8 overflow-hidden bg-muted h-64 md:h-96">
            <img
              src={article.imageUrl}
              alt={article.headline}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
            />
          </div>
        )}

        {/* Header */}
        <header className="py-10 space-y-6 border-b border-border">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <span className="text-accent font-medium">{article.category}</span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">{article.readTime}</span>
            <span className="text-border">·</span>
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className={`w-1.5 h-1.5 rounded-full ${impactColor}`} />
              <span className="capitalize">{article.impactLevel} impact</span>
            </span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground capitalize">{article.sentiment}</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-medium leading-tight">
            {article.headline}
          </h1>

          {/* Source block */}
          <div className="flex items-center gap-3 py-3 border-y border-border/50">
            <div className="flex-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Source</p>
              <a
                href={article.sourceUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-sm font-medium text-foreground hover:text-accent transition-colors flex items-center gap-1.5"
              >
                {article.source}
                <span className="text-muted-foreground text-xs">↗</span>
              </a>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Published</p>
              <p className="font-mono text-sm">{article.publishedAt}</p>
            </div>
          </div>
        </header>

        {/* AI Summary */}
        <section className="py-8 border-b border-border space-y-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">◈ AI Summary</span>
            <span className="font-mono text-[9px] text-muted-foreground/60 border border-border/50 px-1.5 py-0.5">AI-assisted</span>
          </div>
          <p className="text-lg leading-relaxed text-foreground/90 font-sans">{article.summary}</p>
        </section>

        {/* Why it matters */}
        <section className="py-8 border-b border-border">
          <div className="pl-4 border-l-2 border-accent space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">◉ Why it matters</p>
            <p className="text-base leading-relaxed italic text-foreground/80">{article.whyItMatters}</p>
          </div>
        </section>

        {/* Key facts */}
        {article.facts && article.facts.length > 0 && (
          <section className="py-8 border-b border-border space-y-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">◇ Key Facts</p>
            <ul className="space-y-4">
              {article.facts.map((fact: string, i: number) => (
                <li key={i} className="flex gap-4 text-sm leading-relaxed">
                  <span className="font-mono text-muted-foreground/50 mt-0.5 shrink-0 w-4">{String(i + 1).padStart(2, "0")}</span>
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Disclaimer */}
        <div className="py-6 border-b border-border">
          <p className="font-mono text-[10px] text-muted-foreground/50 leading-relaxed">
            AI-ASSISTED SUMMARY — Clarix curates and summarises content from <strong className="text-muted-foreground/70">{article.source}</strong>. This briefing is for informational purposes only. Verify facts with the original source before acting on this intelligence.{" "}
            {article.sourceUrl && article.sourceUrl !== "#" && (
              <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-muted-foreground transition-colors">
                Read original →
              </a>
            )}
          </p>
        </div>

        {/* ── Analysis Thread ── */}
        <section className="py-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="font-serif text-2xl font-medium">Analysis Thread</h2>
              <p className="font-mono text-[11px] text-muted-foreground">
                {comments?.length ?? 0} {(comments?.length ?? 0) === 1 ? "contribution" : "contributions"} · Expert perspectives
              </p>
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider border border-border px-2 py-1 text-muted-foreground">
              AI Curated
            </span>
          </div>

          {/* Discourse standards notice */}
          <div className="flex items-start gap-3 px-4 py-3 border border-border/60 bg-surface/40">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent shrink-0 mt-0.5">◈ AI Mod</span>
            <p className="font-sans text-[12px] text-muted-foreground/90 leading-relaxed">
              Discourse here is guided by clarity standards. No ad hominem, no clickbait,
              no slogans. Argue with evidence; disagree with grace.
            </p>
          </div>

          {/* Compose */}
          <div className="flex gap-4 pb-8 border-b border-border">
            <div className="w-8 h-8 shrink-0 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent font-mono text-[11px]">
              {user ? user.initials : "?"}
            </div>
            <form onSubmit={handleCommentSubmit} className="flex-1 space-y-3">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder={user ? "Add your analysis, evidence, or perspective (min. 20 characters)…" : "Sign in to contribute to the analysis thread…"}
                className="w-full min-h-[96px] bg-surface border border-border px-4 py-3 text-sm font-sans focus:outline-none focus:border-accent/50 resize-y transition-colors placeholder:text-muted-foreground/50 disabled:opacity-50"
                disabled={!user}
              />
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {user
                    ? commentContent.length < 20
                      ? `${20 - commentContent.length} characters to go`
                      : "✓ Ready to submit"
                    : ""}
                </span>
                {user ? (
                  <button
                    type="submit"
                    disabled={commentContent.length < 20 || createComment.isPending}
                    className="font-mono text-[11px] uppercase tracking-wider bg-foreground text-background px-4 py-2 hover:opacity-80 transition-opacity disabled:opacity-30"
                  >
                    {createComment.isPending ? "Submitting…" : "Submit analysis"}
                  </button>
                ) : (
                  <Link href="/signin" className="font-mono text-[11px] uppercase tracking-wider bg-foreground text-background px-4 py-2 hover:opacity-80 transition-opacity">
                    Sign in to contribute
                  </Link>
                )}
              </div>
            </form>
          </div>

          {/* Comment list */}
          <div className="space-y-8">
            {comments?.map((comment) => {
              const { label, cls } = getAnalysisLabel(comment);
              return (
                <div key={comment.id} className="flex gap-4">
                  <div className="w-8 h-8 shrink-0 bg-muted border border-border flex items-center justify-center font-mono text-[11px] text-muted-foreground">
                    {comment.userInitials}
                  </div>
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{comment.userName}</span>
                      {comment.userRole && (
                        <span className="font-mono text-[10px] text-muted-foreground/70">· {comment.userRole}</span>
                      )}
                      <span className={`font-mono text-[9px] uppercase tracking-wider border px-1.5 py-0.5 ${cls}`}>
                        {label}
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/50 ml-auto">{comment.createdAt}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/85">{comment.content}</p>
                    <div className="flex items-center gap-4 pt-0.5">
                      <button
                        onClick={() => toggleCommentUpvote.mutate({ id: comment.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(id) }) })}
                        className={`font-mono text-[11px] flex items-center gap-1.5 transition-colors ${comment.isUpvoted ? "text-accent" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        ▲ {comment.upvotes} Insightful
                      </button>
                      <button className="font-mono text-[11px] text-muted-foreground/50 hover:text-destructive transition-colors">
                        Report
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {(!comments || comments.length === 0) && (
              <div className="py-12 text-center space-y-2">
                <p className="font-mono text-[11px] text-muted-foreground/50 uppercase tracking-wider">No analysis yet</p>
                <p className="text-sm text-muted-foreground">Be the first to contribute a perspective to this thread.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
