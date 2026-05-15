import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { articlesTable } from "./articles";
import { usersTable } from "./users";

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  userInitials: text("user_initials").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull().default("Reader"),
  content: text("content").notNull(),
  upvotes: integer("upvotes").notNull().default(0),
  status: text("status").notNull().default("approved"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const articleUpvotesTable = pgTable("article_upvotes", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const articleSavesTable = pgTable("article_saves", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articlesTable.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const commentUpvotesTable = pgTable("comment_upvotes", {
  id: serial("id").primaryKey(),
  commentId: integer("comment_id").notNull().references(() => commentsTable.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const newsletterSubscribersTable = pgTable("newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tickerItemsTable = pgTable("ticker_items", {
  id: serial("id").primaryKey(),
  headline: text("headline").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});
