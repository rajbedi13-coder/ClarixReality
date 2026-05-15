import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, categoriesTable, articleUpvotesTable, articleSavesTable, commentsTable } from "@workspace/db";
import { ListArticlesQueryParams, GetArticleParams, ToggleArticleUpvoteParams, ToggleArticleSaveParams } from "@workspace/api-zod";
import { eq, ilike, and, desc, or, sql } from "drizzle-orm";

const router = Router();

function getSessionId(req: any): string {
  const cookieHeader = req.headers["cookie"] ?? "";
  const match = cookieHeader.match(/session_id=([^;]+)/);
  if (match) return match[1];
  const forwarded = req.headers["x-forwarded-for"] as string;
  return forwarded?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? "anon";
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

async function enrichArticle(article: any, sessionId: string) {
  const [upvote] = await db.select().from(articleUpvotesTable)
    .where(and(eq(articleUpvotesTable.articleId, article.id), eq(articleUpvotesTable.sessionId, sessionId)));
  const [save] = await db.select().from(articleSavesTable)
    .where(and(eq(articleSavesTable.articleId, article.id), eq(articleSavesTable.sessionId, sessionId)));
  const [cat] = await db.select().from(categoriesTable).where(eq(categoriesTable.slug, article.categorySlug));
  return {
    ...article,
    category: cat?.name ?? article.categorySlug,
    publishedAt: formatTimeAgo(article.publishedAt),
    isSaved: !!save,
    isUpvoted: !!upvote,
  };
}

router.get("/articles", async (req, res) => {
  const parsed = ListArticlesQueryParams.safeParse(req.query);
  const { category, search, page = 1, limit = 20 } = parsed.success ? parsed.data : { category: undefined, search: undefined, page: 1, limit: 20 };
  const sessionId = getSessionId(req);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (category && category !== "all") conditions.push(eq(articlesTable.categorySlug, category));
  if (search) conditions.push(or(ilike(articlesTable.headline, `%${search}%`), ilike(articlesTable.summary, `%${search}%`)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const articles = await db.select().from(articlesTable)
    .where(where)
    .orderBy(desc(articlesTable.publishedAt))
    .limit(limit)
    .offset(offset);

  const total = await db.select({ count: sql<number>`count(*)` }).from(articlesTable).where(where);
  const enriched = await Promise.all(articles.map(a => enrichArticle(a, sessionId)));

  res.json({ articles: enriched, total: Number(total[0].count), page, limit });
});

router.get("/articles/featured", async (req, res) => {
  const sessionId = getSessionId(req);
  const articles = await db.select().from(articlesTable)
    .where(eq(articlesTable.isFeatured, true))
    .orderBy(desc(articlesTable.publishedAt))
    .limit(4);
  const enriched = await Promise.all(articles.map(a => enrichArticle(a, sessionId)));
  res.json(enriched);
});

router.get("/articles/trending", async (req, res) => {
  const sessionId = getSessionId(req);
  const articles = await db.select().from(articlesTable)
    .orderBy(desc(articlesTable.upvotes))
    .limit(6);
  const enriched = await Promise.all(articles.map(a => enrichArticle(a, sessionId)));
  res.json(enriched);
});

router.get("/articles/:id", async (req, res): Promise<void> => {
  const parsed = GetArticleParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const sessionId = getSessionId(req);
  const [article] = await db.select().from(articlesTable).where(eq(articlesTable.id, parsed.data.id));
  if (!article) { res.status(404).json({ error: "Not found" }); return; }
  const enriched = await enrichArticle(article, sessionId);
  res.json(enriched);
});

router.post("/articles/:id/upvote", async (req, res): Promise<void> => {
  const parsed = ToggleArticleUpvoteParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const sessionId = getSessionId(req);
  const { id } = parsed.data;

  const [existing] = await db.select().from(articleUpvotesTable)
    .where(and(eq(articleUpvotesTable.articleId, id), eq(articleUpvotesTable.sessionId, sessionId)));

  let isUpvoted: boolean;
  if (existing) {
    await db.delete(articleUpvotesTable).where(eq(articleUpvotesTable.id, existing.id));
    await db.update(articlesTable).set({ upvotes: sql`${articlesTable.upvotes} - 1` }).where(eq(articlesTable.id, id));
    isUpvoted = false;
  } else {
    await db.insert(articleUpvotesTable).values({ articleId: id, sessionId });
    await db.update(articlesTable).set({ upvotes: sql`${articlesTable.upvotes} + 1` }).where(eq(articlesTable.id, id));
    isUpvoted = true;
  }

  const [article] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  res.json({ upvotes: article.upvotes, isUpvoted });
});

router.post("/articles/:id/save", async (req, res): Promise<void> => {
  const parsed = ToggleArticleSaveParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const sessionId = getSessionId(req);
  const { id } = parsed.data;

  const [existing] = await db.select().from(articleSavesTable)
    .where(and(eq(articleSavesTable.articleId, id), eq(articleSavesTable.sessionId, sessionId)));

  let isSaved: boolean;
  if (existing) {
    await db.delete(articleSavesTable).where(eq(articleSavesTable.id, existing.id));
    isSaved = false;
  } else {
    await db.insert(articleSavesTable).values({ articleId: id, sessionId });
    isSaved = true;
  }
  res.json({ isSaved });
});

router.get("/saved", async (req, res): Promise<void> => {
  const sessionId = getSessionId(req);
  const saves = await db.select({ articleId: articleSavesTable.articleId })
    .from(articleSavesTable)
    .where(eq(articleSavesTable.sessionId, sessionId));
  if (saves.length === 0) { res.json([]); return; }
  const ids = saves.map(s => s.articleId);
  const articles = await db.select().from(articlesTable)
    .where(sql`${articlesTable.id} = ANY(${ids})`);
  const enriched = await Promise.all(articles.map(a => enrichArticle(a, sessionId)));
  res.json(enriched);
});

export default router;
