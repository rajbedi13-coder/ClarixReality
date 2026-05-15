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
  useGetCurrentUser
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function ArticleDetail() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: user } = useGetCurrentUser();

  const { data: article, isLoading } = useGetArticle(id, {
    query: {
      enabled: !!id,
      queryKey: getGetArticleQueryKey(id)
    }
  });

  const { data: comments } = useListComments(id, {
    query: {
      enabled: !!id,
      queryKey: getListCommentsQueryKey(id)
    }
  });

  const toggleUpvote = useToggleArticleUpvote();
  const toggleSave = useToggleArticleSave();
  const createComment = useCreateComment();
  const toggleCommentUpvote = useToggleCommentUpvote();

  const [commentContent, setCommentContent] = useState("");

  const handleUpvote = () => {
    toggleUpvote.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetArticleQueryKey(id) });
      }
    });
  };

  const handleSave = () => {
    toggleSave.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetArticleQueryKey(id) });
        toast({
          title: "Article saved",
          description: "Added to your saved briefings.",
        });
      }
    });
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentContent.length < 20 || !user) return;
    
    createComment.mutate({
      id,
      data: {
        content: commentContent,
        userName: user.name,
        userRole: user.role || "Member"
      }
    }, {
      onSuccess: () => {
        setCommentContent("");
        queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(id) });
        toast({ title: "Comment posted" });
      }
    });
  };

  const handleCommentUpvote = (commentId: number) => {
    toggleCommentUpvote.mutate({ id: commentId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(id) });
      }
    });
  };

  if (isLoading || !article) {
    return (
      <div className="container py-8 max-w-3xl">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-16 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  const getImpactColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="container py-8 max-w-3xl mx-auto space-y-12">
      {/* Topbar */}
      <div className="flex items-center justify-between sticky top-14 bg-background/95 backdrop-blur py-4 z-40 border-b border-border/50">
        <Link href="/" className="font-mono text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={handleUpvote}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-xs border transition-colors ${article.isUpvoted ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted-foreground hover:border-accent hover:text-accent'}`}
          >
            ▲ {article.upvotes} Insightful
          </button>
          <button 
            onClick={handleSave}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-mono text-xs border transition-colors ${article.isSaved ? 'border-foreground text-foreground bg-foreground/10' : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'}`}
          >
            {article.isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Article Header */}
      <header className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <span className="text-accent bg-accent/10 px-2 py-1 rounded">◇ {article.category}</span>
          <span className="text-muted-foreground">{article.publishedAt}</span>
          <span className="text-muted-foreground">• {article.readTime}</span>
          <span className="flex items-center gap-1.5 border border-border px-2 py-1 rounded text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${getImpactColor(article.impactLevel)}`}></span>
            {article.impactLevel} Impact
          </span>
          <span className="border border-border px-2 py-1 rounded text-muted-foreground">
            {article.sentiment}
          </span>
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-medium leading-[1.1]">{article.headline}</h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <a href={article.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
            {article.source}
          </a>
        </div>
      </header>

      {/* AI Summary */}
      <section className="space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-wider text-accent flex items-center gap-2">
          <span>◈</span> AI Summary
        </h2>
        <div className="text-lg leading-relaxed text-foreground/90 font-sans">
          {article.summary}
        </div>
      </section>

      {/* Why it matters */}
      <section className="border-l-2 border-accent pl-6 py-2 bg-accent/5 rounded-r-lg">
        <h2 className="font-mono text-xs uppercase tracking-wider text-accent mb-3 flex items-center gap-2">
          <span>◉</span> Why it matters
        </h2>
        <p className="leading-relaxed">
          {article.whyItMatters}
        </p>
      </section>

      {/* Key Facts */}
      <section className="space-y-4">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <span>◇</span> Key Facts
        </h2>
        <ul className="space-y-3">
          {article.facts.map((fact, i) => (
            <li key={i} className="flex gap-4">
              <span className="text-muted-foreground mt-1.5">—</span>
              <span className="leading-relaxed">{fact}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Disclaimer */}
      <div className="font-mono text-[10px] text-muted-foreground/60 border border-border/50 p-4 rounded bg-surface2">
        DISCLAIMER: This briefing is an AI-generated summary intended for informational purposes only. While we strive for accuracy, users should verify facts with the original source before making decisions based on this intelligence.
      </div>

      <hr className="border-border/50" />

      {/* Comments */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-medium">Discussion</h2>
          <span className="font-mono text-[10px] uppercase tracking-wider border border-border px-2 py-1 rounded bg-surface2 text-muted-foreground">
            AI Moderated
          </span>
        </div>

        {/* Comment Input */}
        <div className="flex gap-4">
          <div className="w-10 h-10 shrink-0 rounded-full bg-accent/20 flex items-center justify-center text-accent font-medium text-sm">
            {user ? user.initials : "?"}
          </div>
          <form onSubmit={handleCommentSubmit} className="flex-1 space-y-3">
            <textarea 
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              placeholder="Add to the analysis (min. 20 characters)..."
              className="w-full min-h-[100px] bg-surface2 border border-border rounded-md p-3 text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-y"
              disabled={!user}
            />
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">
                {commentContent.length < 20 ? `${20 - commentContent.length} more characters needed` : 'Ready to post'}
              </span>
              <button 
                type="submit" 
                disabled={!user || commentContent.length < 20 || createComment.isPending}
                className="bg-accent text-accent-foreground px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {user ? 'Post Comment' : 'Sign in to comment'}
              </button>
            </div>
          </form>
        </div>

        {/* Comment List */}
        <div className="space-y-6">
          {comments?.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              <div className="w-10 h-10 shrink-0 rounded-full bg-surface2 border border-border flex items-center justify-center text-muted-foreground font-medium text-sm">
                {comment.userInitials}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium text-sm">{comment.userName}</span>
                    <span className="font-mono text-[10px] text-accent border border-accent/30 px-1.5 py-0.5 rounded-sm">{comment.userRole}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{comment.createdAt}</span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">{comment.content}</p>
                <div className="flex items-center gap-4 pt-1">
                  <button 
                    onClick={() => handleCommentUpvote(comment.id)}
                    className={`font-mono text-xs flex items-center gap-1 transition-colors ${comment.isUpvoted ? 'text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    ▲ {comment.upvotes}
                  </button>
                  <button className="font-mono text-xs text-muted-foreground hover:text-destructive transition-colors">
                    Report
                  </button>
                </div>
              </div>
            </div>
          ))}
          {comments?.length === 0 && (
            <div className="text-center py-8 font-mono text-sm text-muted-foreground">
              No analysis added yet. Be the first to comment.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
