import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { SignUpBody, SignInBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

const router = Router();

function hashPassword(password: string): string {
  const salt = "clarix_salt_2025";
  return createHash("sha256").update(password + salt).digest("hex");
}

function generateToken(userId: number): string {
  return Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64url");
}

function parseToken(token: string): { userId: number } | null {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString());
  } catch {
    return null;
  }
}

function getInitials(name: string): string {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function trialEndsAt(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

function trialDaysLeft(trialEnd: Date | null): number | null {
  if (!trialEnd) return null;
  const diff = trialEnd.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export function getUserFromToken(authHeader: string | undefined): { userId: number } | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return parseToken(authHeader.slice(7));
}

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignUpBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { email, password, name, role } = parsed.data;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing) { res.status(409).json({ error: "Email already registered" }); return; }

  const trialEnd = trialEndsAt();
  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash: hashPassword(password),
    name,
    initials: getInitials(name),
    role: role ?? null,
    subscriptionStatus: "trial",
    trialEndsAt: trialEnd,
  }).returning();

  const token = generateToken(user.id);
  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      initials: user.initials,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      trialDaysLeft: trialDaysLeft(user.trialEndsAt),
    },
    token,
  });
});

router.post("/auth/signin", async (req, res): Promise<void> => {
  const parsed = SignInBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid input" }); return; }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid email or password" }); return;
  }

  const token = generateToken(user.id);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      initials: user.initials,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
      trialDaysLeft: trialDaysLeft(user.trialEndsAt),
    },
    token,
  });
});

router.post("/auth/signout", (_req, res) => {
  res.json({ message: "Signed out successfully" });
});

router.get("/user/me", async (req, res): Promise<void> => {
  const auth = getUserFromToken(req.headers.authorization);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, auth.userId));
  if (!user) { res.status(401).json({ error: "User not found" }); return; }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    initials: user.initials,
    role: user.role,
    subscriptionStatus: user.subscriptionStatus,
    trialEndsAt: user.trialEndsAt?.toISOString() ?? null,
    trialDaysLeft: trialDaysLeft(user.trialEndsAt),
  });
});

export default router;
