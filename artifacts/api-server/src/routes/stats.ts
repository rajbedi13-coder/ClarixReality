import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, commentsTable, tickerItemsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/stats", async (_req, res) => {
  const [briefs] = await db.select({ count: sql<number>`count(*)` }).from(articlesTable);
  const [comments] = await db.select({ count: sql<number>`count(*)` }).from(commentsTable);
  res.json({
    briefsPublished: Number(briefs.count),
    sourcesMonitored: 47,
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
