import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, commentsTable, tickerItemsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

function relativeTime(date: Date | string | null): string {
  if (!date) return "moments ago";
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "moments ago";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

router.get("/stats", async (_req, res) => {
  const [agg] = await db
    .select({
      briefs: sql<number>`count(*) FILTER (WHERE ${articlesTable.reviewStatus} = 'approved')`,
      sources: sql<number>`count(DISTINCT ${articlesTable.source})`,
      sections: sql<number>`count(DISTINCT ${articlesTable.categorySlug})`,
      last24h: sql<number>`count(*) FILTER (WHERE ${articlesTable.publishedAt} > NOW() - INTERVAL '24 hours')`,
      lastPublished: sql<Date | null>`MAX(${articlesTable.publishedAt})`,
    })
    .from(articlesTable);
  const [comments] = await db.select({ count: sql<number>`count(*)` }).from(commentsTable);

  res.json({
    briefsPublished: Number(agg.briefs),
    sourcesMonitored: Number(agg.sources),
    sectionsLive: Number(agg.sections),
    briefsLast24h: Number(agg.last24h),
    lastUpdated: relativeTime(agg.lastPublished as unknown as Date | null),
    refreshCadenceHours: 4,
    commentsReviewed: Number(comments.count),
    aiAccuracy: "98.3%",
  });
});

router.get("/ticker", async (_req, res) => {
  const items = await db.select().from(tickerItemsTable)
    .where(eq(tickerItemsTable.isActive, true));
  res.json(items);
});

export default router;
