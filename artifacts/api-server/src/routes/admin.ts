import { Router, type Request, type Response, type NextFunction } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, articlesTable, sourcesTable, ingestionRunsTable } from "@workspace/db";
import { ingestSource, ingestAllActive } from "../ingestion/index";

const router = Router();

/**
 * Admin auth: requires `x-admin-token` header matching ADMIN_TOKEN env var.
 * In development (no ADMIN_TOKEN set), access is open to make iteration easy.
 * In production the route is locked until the secret is set.
 */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env["ADMIN_TOKEN"];
  const provided = req.header("x-admin-token");

  if (!expected) {
    if (process.env["NODE_ENV"] === "production") {
      res.status(503).json({ error: "ADMIN_TOKEN not configured" });
      return;
    }
    next();
    return;
  }
  if (provided !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

router.use("/admin", requireAdmin);

/* ── Articles queue ── */
router.get("/admin/articles", async (req: Request, res: Response): Promise<void> => {
  const status = String(req.query["status"] ?? "pending");
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
  const valid = ["pending", "approved", "rejected"] as const;
  if (!valid.includes(status as (typeof valid)[number])) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const articles = await db.select({
    id: articlesTable.id,
    headline: articlesTable.headline,
    summary: articlesTable.summary,
    whyItMatters: articlesTable.whyItMatters,
    source: articlesTable.source,
    sourceUrl: articlesTable.sourceUrl,
    categorySlug: articlesTable.categorySlug,
    contentType: articlesTable.contentType,
    impactLevel: articlesTable.impactLevel,
    tags: articlesTable.tags,
    imageUrl: articlesTable.imageUrl,
    publishedAt: articlesTable.publishedAt,
    reviewStatus: articlesTable.reviewStatus,
    sourceId: articlesTable.sourceId,
  }).from(articlesTable)
    .where(eq(articlesTable.reviewStatus, status as "pending" | "approved" | "rejected"))
    .orderBy(desc(articlesTable.publishedAt))
    .limit(limit);

  const [counts] = await db.select({
    pending: sql<number>`count(*) filter (where review_status = 'pending')`,
    approved: sql<number>`count(*) filter (where review_status = 'approved')`,
    rejected: sql<number>`count(*) filter (where review_status = 'rejected')`,
  }).from(articlesTable);

  res.json({ articles, counts });
});

router.patch("/admin/articles/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const allowed = ["headline", "summary", "whyItMatters", "categorySlug", "contentType", "impactLevel", "tags", "reviewStatus"] as const;
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in (req.body ?? {})) patch[k] = (req.body as Record<string, unknown>)[k];
  if ("reviewStatus" in patch) {
    patch["reviewedAt"] = new Date();
    patch["reviewedBy"] = req.header("x-admin-user") ?? "admin";
  }
  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db.update(articlesTable).set(patch).where(eq(articlesTable.id, id)).returning();
  res.json({ article: updated });
});

router.delete("/admin/articles/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(articlesTable).where(eq(articlesTable.id, id));
  res.json({ ok: true });
});

/* ── Sources CRUD ── */
router.get("/admin/sources", async (_req: Request, res: Response): Promise<void> => {
  const sources = await db.select().from(sourcesTable).orderBy(desc(sourcesTable.createdAt));
  res.json({ sources });
});

router.post("/admin/sources", async (req: Request, res: Response): Promise<void> => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = body["name"] as string | undefined;
  const feedUrl = body["feedUrl"] as string | undefined;
  if (!name || !feedUrl) {
    res.status(400).json({ error: "name and feedUrl are required" });
    return;
  }
  try {
    const [src] = await db.insert(sourcesTable).values({
      name,
      feedUrl,
      homepageUrl: (body["homepageUrl"] as string | undefined) ?? null,
      categorySlug: (body["categorySlug"] as string | undefined) ?? "world",
      defaultContentType: ((body["defaultContentType"] as string | undefined) ?? "news") as "news",
      defaultImpact: ((body["defaultImpact"] as string | undefined) ?? "medium") as "medium",
      trustTier: (body["trustTier"] as number | undefined) ?? 2,
      autoPublish: Boolean(body["autoPublish"]),
    }).returning();
    res.json({ source: src });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Insert failed";
    res.status(400).json({ error: msg });
  }
});

router.patch("/admin/sources/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const allowed = ["name", "feedUrl", "homepageUrl", "categorySlug", "defaultContentType", "defaultImpact", "trustTier", "autoPublish", "isActive"] as const;
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in (req.body ?? {})) patch[k] = (req.body as Record<string, unknown>)[k];
  const [updated] = await db.update(sourcesTable).set(patch).where(eq(sourcesTable.id, id)).returning();
  res.json({ source: updated });
});

router.delete("/admin/sources/:id", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(sourcesTable).where(eq(sourcesTable.id, id));
  res.json({ ok: true });
});

/* ── Manual ingest triggers ── */
router.post("/admin/ingest", async (_req: Request, res: Response): Promise<void> => {
  // Fire and forget — actual progress is visible via /admin/runs
  ingestAllActive().catch(() => { /* errors logged inside */ });
  res.json({ ok: true, message: "Ingestion sweep queued" });
});

router.post("/admin/sources/:id/ingest", async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [source] = await db.select().from(sourcesTable).where(eq(sourcesTable.id, id));
  if (!source) {
    res.status(404).json({ error: "Source not found" });
    return;
  }
  const result = await ingestSource(source);
  res.json({ result });
});

router.get("/admin/runs", async (_req: Request, res: Response): Promise<void> => {
  const runs = await db.select().from(ingestionRunsTable).orderBy(desc(ingestionRunsTable.startedAt)).limit(30);
  res.json({ runs });
});

export default router;
