import Parser from "rss-parser";
import { db } from "@workspace/db";
import { articlesTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
      ["enclosure", "enclosure", { keepArray: false }],
    ],
  },
});

const RSS_FEEDS: { url: string; source: string; defaultCategory: string }[] = [
  { url: "http://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC News", defaultCategory: "world-news" },
  { url: "http://feeds.bbci.co.uk/news/technology/rss.xml", source: "BBC News", defaultCategory: "technology-ai" },
  { url: "http://feeds.bbci.co.uk/news/business/rss.xml", source: "BBC News", defaultCategory: "finance-markets" },
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian", defaultCategory: "world-news" },
  { url: "https://www.theguardian.com/technology/rss", source: "The Guardian", defaultCategory: "technology-ai" },
  { url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", source: "Wall Street Journal", defaultCategory: "world-news" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "New York Times", defaultCategory: "world-news" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml", source: "New York Times", defaultCategory: "technology-ai" },
  { url: "https://feeds.npr.org/1001/rss.xml", source: "NPR", defaultCategory: "world-news" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera", defaultCategory: "geopolitics" },
  { url: "https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml", source: "New York Times", defaultCategory: "finance-markets" },
];

const CATEGORY_KEYWORDS: { slug: string; keywords: string[] }[] = [
  { slug: "technology-ai", keywords: ["ai", "artificial intelligence", "tech", "software", "cyber", "digital", "robot", "machine learning", "openai", "google", "apple", "microsoft", "meta", "nvidia", "chip", "quantum", "algorithm", "data", "hack", "privacy", "startup"] },
  { slug: "finance-markets", keywords: ["economy", "market", "stock", "gdp", "inflation", "trade", "bank", "fed", "interest rate", "investment", "recession", "finance", "fiscal", "monetary", "crypto", "bitcoin", "oil", "energy", "commodity", "imf", "world bank"] },
  { slug: "geopolitics", keywords: ["war", "conflict", "nato", "un ", "sanction", "diplomat", "treaty", "nuclear", "military", "tension", "geopolit", "coup", "election", "vote", "government", "minister", "president", "summit", "alliance", "china", "russia", "iran", "ukraine"] },
  { slug: "psychology", keywords: ["mental health", "psychology", "brain", "anxiety", "depression", "behavior", "cognitive", "wellbeing", "therapy", "stress", "emotion", "social media effect", "addiction", "happiness"] },
  { slug: "society-culture", keywords: ["society", "culture", "social", "education", "health", "climate", "environment", "migration", "immigration", "gender", "race", "inequality", "poverty", "housing", "media", "arts", "sport", "celebrity"] },
  { slug: "deep-dives", keywords: ["analysis", "investigation", "feature", "in-depth", "explainer", "special report", "long read"] },
];

function detectCategory(title: string, description: string, defaultCategory: string): string {
  const text = `${title} ${description}`.toLowerCase();
  for (const { slug, keywords } of CATEGORY_KEYWORDS) {
    if (keywords.some(kw => text.includes(kw))) return slug;
  }
  return defaultCategory;
}

function extractImage(item: any): string | null {
  if (item.mediaContent?.["$"]?.url) return item.mediaContent["$"].url;
  if (item.mediaThumbnail?.["$"]?.url) return item.mediaThumbnail["$"].url;
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) return item.enclosure.url;
  const imgMatch = (item["content:encoded"] || item.content || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  return null;
}

function estimateReadTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 200));
  return `${mins} min`;
}

function detectSentiment(text: string): string {
  const lower = text.toLowerCase();
  const negative = ["war", "crisis", "collapse", "attack", "death", "kill", "disaster", "fail", "danger", "threat", "sanction", "ban", "conflict", "violence"];
  const positive = ["growth", "peace", "deal", "breakthrough", "success", "discover", "advance", "improve", "agree", "invest", "recovery"];
  const negScore = negative.filter(w => lower.includes(w)).length;
  const posScore = positive.filter(w => lower.includes(w)).length;
  if (negScore > posScore) return "concerning";
  if (posScore > negScore) return "positive";
  return "significant";
}

function detectImpact(title: string): "high" | "medium" | "low" {
  const lower = title.toLowerCase();
  const highWords = ["war", "nuclear", "crisis", "collapse", "breakthrough", "historic", "major", "critical", "emergency", "global"];
  const lowWords = ["minor", "local", "small", "niche", "update"];
  if (highWords.some(w => lower.includes(w))) return "high";
  if (lowWords.some(w => lower.includes(w))) return "low";
  return "medium";
}

export async function fetchAndStoreNews(): Promise<number> {
  let inserted = 0;

  for (const feed of RSS_FEEDS) {
    try {
      const result = await Promise.race([
        parser.parseURL(feed.url),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
      ]) as Awaited<ReturnType<typeof parser.parseURL>>;

      for (const item of result.items.slice(0, 10)) {
        if (!item.title || !item.link) continue;

        const externalId = item.guid || item.link;
        const title = item.title.trim();
        const description = item.contentSnippet || item.summary || item.content || "";
        const summary = description.slice(0, 400) || title;
        const category = detectCategory(title, summary, feed.defaultCategory);
        const imageUrl = extractImage(item);
        const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

        try {
          await db.insert(articlesTable).values({
            externalId,
            categorySlug: category,
            headline: title,
            summary,
            whyItMatters: `This report from ${feed.source} covers a development worth tracking for its broader implications.`,
            facts: [],
            source: feed.source,
            sourceUrl: item.link,
            readTime: estimateReadTime(summary),
            sentiment: detectSentiment(`${title} ${summary}`),
            impactLevel: detectImpact(title),
            imageUrl,
            isFeatured: false,
            icon: "◈",
            publishedAt: pubDate,
          }).onConflictDoNothing();
          inserted++;
        } catch {
          // duplicate or constraint error — skip silently
        }
      }
    } catch (err: any) {
      logger.warn({ feed: feed.url, err: err?.message }, "RSS feed fetch failed");
    }
  }

  logger.info({ inserted }, "News fetch complete");
  return inserted;
}

export function startNewsPoller(intervalMs = 15 * 60 * 1000) {
  fetchAndStoreNews().catch((err) => logger.error({ err }, "Initial news fetch failed"));
  const id = setInterval(() => {
    fetchAndStoreNews().catch((err) => logger.error({ err }, "Scheduled news fetch failed"));
  }, intervalMs);
  return id;
}

export async function updateTickerFromArticles() {
  await db.execute(sql`
    INSERT INTO ticker_items (headline)
    SELECT headline FROM articles
    ORDER BY published_at DESC
    LIMIT 20
    ON CONFLICT DO NOTHING
  `);
}
