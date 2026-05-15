import { Router } from "express";
import { db } from "@workspace/db";
import { commentsTable, articlesTable, commentUpvotesTable } from "@workspace/db";
import { ListCommentsParams, CreateCommentBody, ToggleCommentUpvoteParams } from "@workspace/api-zod";
import { eq, and, desc, sql } from "drizzle-orm";

const router = Router();

function getSessionId(req: any): string {
  const cookieHeader = req.headers["cookie"] ?? "";
  const match = cookieHeader.match(/session_id=([^;]+)/);
  if (match) return match[1];
  const forwarded = req.headers["x-forwarded-for"] as string;
  return forwarded?.split(",")[0]?.trim() ?? req.socket?.remoteAddress ?? "anon";
}

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

router.get("/articles/:id/comments", async (req, res): Promise<void> => {
  const parsed = ListCommentsParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const sessionId = getSessionId(req);
  const { id } = parsed.data;

  const comments = await db.select().from(commentsTable)
    .where(and(eq(commentsTable.articleId, id), eq(commentsTable.status, "approved")))
    .orderBy(desc(commentsTable.createdAt));

  const enriched = await Promise.all(comments.map(async (c) => {
    const [upvote] = await db.select().from(commentUpvotesTable)
      .where(and(eq(commentUpvotesTable.commentId, c.id), eq(commentUpvotesTable.sessionId, sessionId)));
    return { ...c, createdAt: formatTimeAgo(c.createdAt), isUpvoted: !!upvote };
  }));

  res.json(enriched);
});

router.post("/articles/:id/comments", async (req, res): Promise<void> => {
  const idParsed = ListCommentsParams.safeParse({ id: Number(req.params.id) });
  if (!idParsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const bodyParsed = CreateCommentBody.safeParse(req.body);
  if (!bodyParsed.success) { res.status(400).json({ error: "Invalid body" }); return; }

  const { id } = idParsed.data;
  const { content, userName, userRole } = bodyParsed.data;
  const initials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const [comment] = await db.insert(commentsTable).values({
    articleId: id,
    userInitials: initials,
    userName,
    userRole,
    content,
    status: "pending",
  }).returning();

  await db.update(articlesTable)
    .set({ commentCount: sql`${articlesTable.commentCount} + 1` })
    .where(eq(articlesTable.id, id));

  res.status(201).json({ ...comment, createdAt: "just now", isUpvoted: false });
});

router.post("/comments/:id/upvote", async (req, res): Promise<void> => {
  const parsed = ToggleCommentUpvoteParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) { res.status(400).json({ error: "Invalid id" }); return; }
  const sessionId = getSessionId(req);
  const { id } = parsed.data;

  const [existing] = await db.select().from(commentUpvotesTable)
    .where(and(eq(commentUpvotesTable.commentId, id), eq(commentUpvotesTable.sessionId, sessionId)));

  let isUpvoted: boolean;
  if (existing) {
    await db.delete(commentUpvotesTable).where(eq(commentUpvotesTable.id, existing.id));
    await db.update(commentsTable).set({ upvotes: sql`${commentsTable.upvotes} - 1` }).where(eq(commentsTable.id, id));
    isUpvoted = false;
  } else {
    await db.insert(commentUpvotesTable).values({ commentId: id, sessionId });
    await db.update(commentsTable).set({ upvotes: sql`${commentsTable.upvotes} + 1` }).where(eq(commentsTable.id, id));
    isUpvoted = true;
  }

  const [comment] = await db.select().from(commentsTable).where(eq(commentsTable.id, id));
  res.json({ upvotes: comment.upvotes, isUpvoted });
});

export default router;
