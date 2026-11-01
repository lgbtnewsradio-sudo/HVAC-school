import { and, eq, gt, lt } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "./db";
import { sessions, users } from "./db/schema";
import { hashPassword, newId, newToken, sha256, verifyPassword } from "./crypto";

export const SESSION_DAYS = 30;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").max(40),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(200)
    .refine((p) => /[a-zA-Z]/.test(p) && /[0-9]/.test(p), "Include letters and at least one number"),
  timezone: z.string().max(64).optional(),
  mode: z.enum(["beginner", "advanced"]).optional(),
});

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: "student" | "admin";
  plan: "free" | "pro";
  mode: "beginner" | "advanced";
  timezone: string;
  xp: number;
  leaderboardOptIn: boolean;
  lastPath: string | null;
};

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

function validTz(tz: string | undefined): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

export type AuthResult = { ok: true; userId: string; token: string } | { ok: false; error: string; field?: string };

export async function registerUser(db: DB, input: unknown): Promise<AuthResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") };
  }
  const { email, displayName, password, timezone, mode } = parsed.data;
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length) return { ok: false, error: "An account with that email already exists. Try signing in.", field: "email" };
  const id = newId("u_");
  await db.insert(users).values({
    id,
    email,
    displayName,
    passwordHash: await hashPassword(password),
    role: adminEmails().has(email) ? "admin" : "student",
    timezone: validTz(timezone),
    mode: mode ?? "beginner",
  });
  const token = await createSession(db, id);
  return { ok: true, userId: id, token };
}

export async function loginUser(db: DB, emailRaw: string, password: string): Promise<AuthResult> {
  const email = String(emailRaw ?? "").trim().toLowerCase();
  const generic = { ok: false as const, error: "Email or password is incorrect." };
  const [u] = await db.select().from(users).where(eq(users.email, email));
  if (!u) {
    // Spend comparable time so response timing doesn't reveal which emails exist.
    await hashPassword(String(password ?? ""));
    return generic;
  }
  if (u.lockedUntil && u.lockedUntil > new Date()) {
    return { ok: false, error: "Too many failed attempts. Try again in a few minutes." };
  }
  const ok = await verifyPassword(String(password ?? ""), u.passwordHash);
  if (!ok) {
    const failed = u.failedLogins + 1;
    await db
      .update(users)
      .set({
        failedLogins: failed >= MAX_FAILED ? 0 : failed,
        lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      })
      .where(eq(users.id, u.id));
    return generic;
  }
  const updates: Partial<typeof users.$inferInsert> = { failedLogins: 0, lockedUntil: null };
  if (adminEmails().has(email) && u.role !== "admin") updates.role = "admin";
  await db.update(users).set(updates).where(eq(users.id, u.id));
  return { ok: true, userId: u.id, token: await createSession(db, u.id) };
}

export async function createSession(db: DB, userId: string): Promise<string> {
  const token = newToken();
  await db.insert(sessions).values({
    tokenHash: sha256(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
  });
  // Opportunistic cleanup of this user's expired sessions.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  return token;
}

export async function userForToken(db: DB, token: string | undefined | null): Promise<SessionUser | null> {
  if (!token || token.length > 200) return null;
  const rows = await db
    .select({ u: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())));
  const u = rows[0]?.u;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    role: u.role === "admin" ? "admin" : "student",
    plan: u.plan === "pro" ? "pro" : "free",
    mode: u.mode === "advanced" ? "advanced" : "beginner",
    timezone: u.timezone,
    xp: u.xp,
    leaderboardOptIn: u.leaderboardOptIn,
    lastPath: u.lastPath,
  };
}

export async function destroySession(db: DB, token: string | undefined | null) {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

export async function changePassword(db: DB, userId: string, current: string, next: string): Promise<{ ok: boolean; error?: string }> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || !(await verifyPassword(current, u.passwordHash))) return { ok: false, error: "Current password is incorrect." };
  const check = registerSchema.shape.password.safeParse(next);
  if (!check.success) return { ok: false, error: check.error.issues[0].message };
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, userId));
  // Sign out other devices.
  await db.delete(sessions).where(eq(sessions.userId, userId));
  return { ok: true };
}
