import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const impactLevelEnum = pgEnum("impact_level", ["high", "medium", "low"]);

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
  externalId: text("external_id").unique(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({ id: true });
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
