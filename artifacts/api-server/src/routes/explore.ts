import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, categoriesTable, articleUpvotesTable, articleSavesTable } from "@workspace/db";
import { and, eq, sql, ilike, or, inArray, notInArray, desc } from "drizzle-orm";

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
  const diff = now.getTime() - date.getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), d = Math.floor(diff / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 365) return `${d}d ago`;
  return `${Math.floor(d / 365)}y ago`;
}

async function enrich(article: any, sessionId: string) {
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

/* Explore: pulls a curated mix of content types, weighting toward the user's
   declared preferences and excluding seen IDs. Server-side randomness via
   PG random() so the pool is fresh each request. */
router.get("/articles/explore", async (req, res) => {
  const sessionId = getSessionId(req);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 30), 1), 60);
  const preferRaw = String(req.query.prefer ?? "").trim();
  const skipRaw = String(req.query.skip ?? "").trim();
  const skipIds = skipRaw ? skipRaw.split(",").map(Number).filter(Number.isFinite) : [];
  const preferred = preferRaw ? preferRaw.split(",").map(s => s.trim()).filter(Boolean) : [];

  const conditions = [eq(articlesTable.reviewStatus, "approved" as const)];
  if (skipIds.length > 0) conditions.push(notInArray(articlesTable.id, skipIds));
  const where = and(...conditions);

  // Pull a generous random pool, then apply preference weighting in app code
  const pool = await db.select().from(articlesTable)
    .where(where)
    .orderBy(sql`random()`)
    .limit(limit * 3);

  const scored = pool.map(a => {
    let score = Math.random();
    if (preferred.includes(a.contentType)) score += 1.5;
    if (preferred.includes(a.categorySlug)) score += 1.0;
    if (Array.isArray(a.tags)) {
      for (const t of a.tags) if (preferred.includes(t)) score += 0.4;
    }
    return { a, score };
  }).sort((x, y) => y.score - x.score).slice(0, limit).map(x => x.a);

  const enriched = await Promise.all(scored.map(a => enrich(a, sessionId)));
  res.json(enriched);
});

/* Archive: filterable by content type, author, decade, search */
router.get("/archive", async (req, res) => {
  const sessionId = getSessionId(req);
  const contentType = req.query.contentType ? String(req.query.contentType) : undefined;
  const author = req.query.author ? String(req.query.author) : undefined;
  const decadeRaw = req.query.decade ? Number(req.query.decade) : undefined;
  const search = req.query.search ? String(req.query.search) : undefined;
  const page = Math.max(Number(req.query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit ?? 24), 1), 60);
  const offset = (page - 1) * limit;

  const conditions: any[] = [eq(articlesTable.reviewStatus, "approved" as const)];
  if (contentType && contentType !== "all") conditions.push(eq(articlesTable.contentType, contentType as any));
  if (author && author !== "all") conditions.push(eq(articlesTable.author, author));
  if (decadeRaw && Number.isFinite(decadeRaw)) {
    const start = `${decadeRaw}`;
    const end = `${decadeRaw + 9}`;
    conditions.push(and(
      sql`${articlesTable.historicalDate} IS NOT NULL`,
      sql`substring(${articlesTable.historicalDate} from 1 for 4) >= ${start}`,
      sql`substring(${articlesTable.historicalDate} from 1 for 4) <= ${end}`,
    ));
  }
  if (search) {
    conditions.push(or(
      ilike(articlesTable.headline, `%${search}%`),
      ilike(articlesTable.summary, `%${search}%`),
      ilike(articlesTable.author, `%${search}%`),
    ));
  }

  const where = and(...conditions);

  const articles = await db.select().from(articlesTable)
    .where(where)
    .orderBy(desc(articlesTable.publishedAt))
    .limit(limit).offset(offset);

  const totalRow = await db.select({ count: sql<number>`count(*)` }).from(articlesTable).where(where);
  const enriched = await Promise.all(articles.map(a => enrich(a, sessionId)));
  res.json({ articles: enriched, total: Number(totalRow[0].count), page, limit });
});

router.get("/archive/authors", async (_req, res) => {
  const rows = await db.selectDistinct({ author: articlesTable.author }).from(articlesTable)
    .where(and(sql`${articlesTable.author} IS NOT NULL`, eq(articlesTable.reviewStatus, "approved" as const)))
    .orderBy(articlesTable.author);
  res.json(rows.map(r => r.author).filter(Boolean));
});

export default router;
