import { Router } from "express";
import { db } from "@workspace/db";
import { newsletterSubscribersTable } from "@workspace/db";
import { SubscribeNewsletterBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/newsletter/subscribe", async (req, res): Promise<void> => {
  const parsed = SubscribeNewsletterBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, message: "Invalid email" }); return; }

  const { email } = parsed.data;
  const [existing] = await db.select().from(newsletterSubscribersTable)
    .where(eq(newsletterSubscribersTable.email, email));

  if (existing) {
    res.json({ success: true, message: "Already subscribed. Your digest arrives every Sunday." }); return;
  }

  await db.insert(newsletterSubscribersTable).values({ email });
  res.json({ success: true, message: "Subscribed. Your first digest arrives this Sunday." });
});

export default router;
