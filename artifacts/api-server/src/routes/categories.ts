import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, articlesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/categories", async (_req, res) => {
  const cats = await db.select().from(categoriesTable);
  const withCounts = await Promise.all(cats.map(async (cat) => {
    const [{ count }] = await db.select({ count: sql<number>`count(*)` })
      .from(articlesTable)
      .where(eq(articlesTable.categorySlug, cat.slug));
    return { ...cat, articleCount: Number(count) };
  }));
  res.json(withCounts);
});

export default router;
