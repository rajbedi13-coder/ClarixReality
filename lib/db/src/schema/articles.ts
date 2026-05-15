import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const impactLevelEnum = pgEnum("impact_level", ["high", "medium", "low"]);

export const contentTypeEnum = pgEnum("content_type", [
  "news",
  "essay",
  "quote",
  "historical",
  "market_signal",
  "psychology",
  "geopolitical",
  "philosophy",
  "culture",
  "technology",
]);

export const reviewStatusEnum = pgEnum("review_status", ["pending", "approved", "rejected"]);

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
});

export const articlesTable = pgTable("articles", {
  id: serial("id").primaryKey(),
  categorySlug: text("category_slug").notNull(),
  headline: text("headline").notNull(),
  summary: text("summary").notNull(),
  whyItMatters: text("why_it_matters").notNull(),
  facts: text("facts").array().notNull().default([]),
  source: text("source").notNull(),
  sourceUrl: text("source_url").notNull().default("#"),
  readTime: text("read_time").notNull(),
  sentiment: text("sentiment").notNull(),
  impactLevel: impactLevelEnum("impact_level").notNull().default("medium"),
  upvotes: integer("upvotes").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  icon: text("icon").notNull().default("◈"),
  imageUrl: text("image_url"),
  imageCredit: text("image_credit"),
  externalId: text("external_id").unique(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  contentType: contentTypeEnum("content_type").notNull().default("news"),
  author: text("author"),
  historicalDate: text("historical_date"),
  tags: text("tags").array().notNull().default([]),
  reviewStatus: reviewStatusEnum("review_status").notNull().default("approved"),
  sourceId: integer("source_id"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
});

export const sourcesTable = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  feedUrl: text("feed_url").notNull().unique(),
  homepageUrl: text("homepage_url"),
  categorySlug: text("category_slug").notNull().default("world"),
  defaultContentType: contentTypeEnum("default_content_type").notNull().default("news"),
  defaultImpact: impactLevelEnum("default_impact").notNull().default("medium"),
  trustTier: integer("trust_tier").notNull().default(2),
  autoPublish: boolean("auto_publish").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  lastFetchedAt: timestamp("last_fetched_at"),
  lastStatus: text("last_status"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ingestionRunsTable = pgTable("ingestion_runs", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  finishedAt: timestamp("finished_at"),
  fetched: integer("fetched").notNull().default(0),
  inserted: integer("inserted").notNull().default(0),
  skipped: integer("skipped").notNull().default(0),
  errors: text("errors"),
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true });
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
export type Source = typeof sourcesTable.$inferSelect;
export type IngestionRun = typeof ingestionRunsTable.$inferSelect;
