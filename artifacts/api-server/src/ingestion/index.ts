/**
 * Content ingestion pipeline.
 *
 * Sources/RSS  →  fetch  →  dedupe  →  summarise  →  database (pending|approved)
 *
 * The summariser is currently extractive (deterministic, no API key).
 * To upgrade to AI summarisation later, replace `extractiveSummary()`
 * with a call to your LLM provider. The function signature is stable.
 */
import Parser from "rss-parser";
import { eq, and, ilike, sql } from "drizzle-orm";
import { db, articlesTable, sourcesTable, ingestionRunsTable, type Source, type InsertArticle } from "@workspace/db";
import { logger } from "../lib/logger";

const parser = new Parser({
  timeout: 15_000,
  headers: { "User-Agent": "ClarixReality/1.0 (+https://clarix.ai)" },
});

function hash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function normaliseTitle(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function readingTime(words: number): string {
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min`;
}

function pickImage(item: any): string | undefined {
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image")) return item.enclosure.url;
  if (item["media:content"]?.$?.url) return item["media:content"].$.url;
  if (item["media:thumbnail"]?.$?.url) return item["media:thumbnail"].$.url;
  const html = item["content:encoded"] || item.content || "";
  const m = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
  return m?.[1];
}

/* ── Extractive summariser (deterministic). Swap with LLM call later. ── */
function extractiveSummary(title: string, body: string): { summary: string; whyItMatters: string; facts: string[] } {
  const clean = stripHtml(body);
  const sentences = clean
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 320);

  const summary = sentences.slice(0, 2).join(" ") || clean.slice(0, 280);

  // "Why it matters": prefer sentences mentioning impact words
  const impactCues = /(because|matters|risk|warns?|signals?|threatens?|implications?|consequences?|first time|record|rare|unprecedented)/i;
  const whyCandidate = sentences.find(s => impactCues.test(s));
  const whyItMatters = whyCandidate
    ?? `Tracked as a developing signal in the broader ${title.split(/[:\-—]/)[0]?.trim() || "global"} narrative. Watch for follow-up reporting from primary sources.`;

  // Key facts: short factual sentences with numbers, dates, proper nouns
  const facts = sentences
    .filter(s => /\d/.test(s) || /\b[A-Z][a-zA-Z]+ [A-Z][a-zA-Z]+/.test(s))
    .slice(0, 4);

  return { summary, whyItMatters, facts };
}

function classify(title: string, body: string, source: Source): {
  contentType: typeof articlesTable.$inferSelect.contentType;
  impactLevel: typeof articlesTable.$inferSelect.impactLevel;
  tags: string[];
} {
  const text = `${title} ${body}`.toLowerCase();
  const tags = new Set<string>();
  const tagMap: Record<string, string[]> = {
    finance: ["market", "stock", "bond", "yield", "inflation", "fed", "ecb", "bank", "trade", "tariff", "currency", "rate"],
    geopolitics: ["war", "treaty", "sanction", "diplomat", "border", "military", "election", "kremlin", "beijing", "nato", "un security"],
    technology: ["ai", "chip", "semiconductor", "openai", "google", "apple", "tsmc", "quantum", "model", "gpu", "cyber"],
    energy: ["oil", "opec", "gas", "barrel", "lng", "rare earth", "lithium", "nuclear"],
    climate: ["climate", "carbon", "emission", "drought", "wildfire", "heatwave"],
    psychology: ["psychology", "cognition", "attention", "behaviour", "behavior", "study finds"],
    philosophy: ["philosophy", "meaning", "ethics", "moral", "metaphysic"],
    society: ["society", "demographic", "inequality", "migration", "education"],
  };
  for (const [tag, words] of Object.entries(tagMap)) {
    if (words.some(w => text.includes(w))) tags.add(tag);
  }

  // Impact heuristic
  const highCues = ["breaking", "war", "crisis", "collapse", "record", "unprecedented", "fed cut", "fed raise", "default"];
  const lowCues = ["op-ed", "opinion", "essay", "review", "profile"];
  let impactLevel: "high" | "medium" | "low" = source.defaultImpact;
  if (highCues.some(c => text.includes(c))) impactLevel = "high";
  else if (lowCues.some(c => text.includes(c))) impactLevel = "low";

  return {
    contentType: source.defaultContentType,
    impactLevel,
    tags: Array.from(tags),
  };
}

async function isDuplicate(externalId: string, title: string): Promise<boolean> {
  const [byExt] = await db.select({ id: articlesTable.id })
    .from(articlesTable)
    .where(eq(articlesTable.externalId, externalId))
    .limit(1);
  if (byExt) return true;

  // Fuzzy title match within last 30 days
  const norm = normaliseTitle(title);
  if (norm.length < 12) return false;
  const [byTitle] = await db.select({ id: articlesTable.id })
    .from(articlesTable)
    .where(and(
      ilike(articlesTable.headline, `%${norm.split(" ").slice(0, 4).join(" ")}%`),
      sql`${articlesTable.publishedAt} > now() - interval '30 days'`,
    ))
    .limit(1);
  return Boolean(byTitle);
}

export async function ingestSource(source: Source): Promise<{ fetched: number; inserted: number; skipped: number; error?: string }> {
  const [run] = await db.insert(ingestionRunsTable).values({ sourceId: source.id }).returning();
  let fetched = 0, inserted = 0, skipped = 0;
  let error: string | undefined;

  try {
    const feed = await parser.parseURL(source.feedUrl);
    fetched = feed.items?.length ?? 0;

    for (const item of feed.items ?? []) {
      const url = item.link?.trim();
      const title = item.title?.trim();
      if (!url || !title) { skipped++; continue; }

      const externalId = `${source.id}:${hash(url)}`;
      if (await isDuplicate(externalId, title)) { skipped++; continue; }

      const body = String(item["content:encoded"] || item.content || item.contentSnippet || item.summary || "");
      const { summary, whyItMatters, facts } = extractiveSummary(title, body);
      const { contentType, impactLevel, tags } = classify(title, body, source);
      const wordCount = stripHtml(body).split(/\s+/).length;
      const publishedAt = item.isoDate ? new Date(item.isoDate) : new Date();

      const insertRow: InsertArticle = {
        categorySlug: source.categorySlug,
        headline: title.slice(0, 280),
        summary: summary.slice(0, 1200),
        whyItMatters: whyItMatters.slice(0, 800),
        facts,
        source: source.name,
        sourceUrl: url,
        readTime: readingTime(wordCount || 200),
        sentiment: "developing",
        impactLevel,
        contentType,
        tags,
        author: item.creator || item["dc:creator"] || null,
        imageUrl: pickImage(item) || null,
        externalId,
        publishedAt,
        reviewStatus: source.autoPublish ? "approved" : "pending",
        sourceId: source.id,
        icon: "◈",
      };

      await db.insert(articlesTable).values(insertRow).onConflictDoNothing();
      inserted++;
    }

    await db.update(sourcesTable)
      .set({ lastFetchedAt: new Date(), lastStatus: `ok: ${inserted} new` })
      .where(eq(sourcesTable.id, source.id));
  } catch (e: any) {
    error = e?.message || String(e);
    logger.error({ err: e, sourceId: source.id, name: source.name }, "Ingestion failed");
    await db.update(sourcesTable)
      .set({ lastFetchedAt: new Date(), lastStatus: `error: ${error?.slice(0, 200)}` })
      .where(eq(sourcesTable.id, source.id));
  }

  await db.update(ingestionRunsTable)
    .set({ finishedAt: new Date(), fetched, inserted, skipped, errors: error ?? null })
    .where(eq(ingestionRunsTable.id, run.id));

  return { fetched, inserted, skipped, error };
}

export async function ingestAllActive(): Promise<{ totalFetched: number; totalInserted: number; sources: number }> {
  const sources = await db.select().from(sourcesTable).where(eq(sourcesTable.isActive, true));
  let totalFetched = 0, totalInserted = 0;
  for (const s of sources) {
    const r = await ingestSource(s);
    totalFetched += r.fetched;
    totalInserted += r.inserted;
  }
  logger.info({ sources: sources.length, totalFetched, totalInserted }, "Ingestion sweep complete");
  return { totalFetched, totalInserted, sources: sources.length };
}
