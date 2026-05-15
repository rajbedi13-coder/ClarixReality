import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { SignUpBody, SignInBody } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import bcrypt from "bcrypt";

const router = Router();

const BCRYPT_ROUNDS = 12;
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const LEGACY_SHA256_SALT = "clarix_salt_2025";

const MIN_TOKEN_SECRET_LENGTH = 32;

function resolveTokenSecret(): string {
  const secret = process.env.TOKEN_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("TOKEN_SECRET environment variable is required in production");
    }
    const ephemeral = randomBytes(32).toString("hex");
    console.warn("[auth] TOKEN_SECRET is not set. Using a random ephemeral secret — tokens will not survive server restarts. Set TOKEN_SECRET before deploying.");
    return ephemeral;
  }
  if (secret.length < MIN_TOKEN_SECRET_LENGTH) {
    throw new Error(`TOKEN_SECRET must be at least ${MIN_TOKEN_SECRET_LENGTH} characters long`);
  }
  return secret;
}

const TOKEN_SECRET = resolveTokenSecret();

function generateToken(userId: number): string {
  const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + TOKEN_TTL_MS })).toString("base64url");
  const sig = createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

function parseToken(token: string): { userId: number } | null {
  try {
    const dotIndex = token.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const payload = token.slice(0, dotIndex);
    const sig = token.slice(dotIndex + 1);

    const expectedSig = createHmac("sha256", TOKEN_SECRET).update(payload).digest("hex");
    const sigBuf = Buffer.from(sig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.userId !== "number" || typeof data.exp !== "number") return null;
    if (Date.now() > data.exp) return null;

    return { userId: data.userId };
  } catch {
    return null;
  }
}

function isLegacySha256Hash(hash: string): boolean {
  return /^[0-9a-f]{64}$/.test(hash);
}

function legacyHashPassword(password: string): string {
  return createHash("sha256").update(password + LEGACY_SHA256_SALT).digest("hex");
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
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
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
  if (!user) { res.status(401).json({ error: "Invalid email or password" }); return; }

  let passwordValid = false;
  if (isLegacySha256Hash(user.passwordHash)) {
    passwordValid = user.passwordHash === legacyHashPassword(password);
    if (passwordValid) {
      const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, user.id));
    }
  } else {
    passwordValid = await bcrypt.compare(password, user.passwordHash);
  }

  if (!passwordValid) { res.status(401).json({ error: "Invalid email or password" }); return; }

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
