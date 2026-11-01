"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/server/db";
import { bookmarks, sessions, users } from "@/server/db/schema";
import { changePassword, destroySession, loginUser, registerUser } from "@/server/auth-core";
import { clearSessionCookie, getCurrentUser, sessionToken, setSessionCookie } from "@/server/auth";
import { loadContent } from "@/server/curriculum";
import * as learning from "@/server/learning";
import * as play from "@/server/play";
import { rateLimit } from "@/server/rate-limit";
import type { Response } from "@/engine/grading";

type FormState = { error?: string; field?: string; ok?: boolean; message?: string; values?: Record<string, string> } | undefined;

function safeNext(next: FormDataEntryValue | null) {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard";
}

async function clientKey(scope: string) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

// ---------------- Auth ----------------

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  if (!rateLimit(await clientKey("register"), 10, 3600_000)) return { error: "Too many sign-ups from this network. Try again later." };
  const db = await getDb();
  const r = await registerUser(db, {
    email: form.get("email"),
    displayName: form.get("displayName"),
    password: form.get("password"),
    timezone: form.get("timezone") || undefined,
    mode: form.get("mode") === "advanced" ? "advanced" : "beginner",
  });
  if (!r.ok) return { error: r.error, field: r.field, values: { email: String(form.get("email") ?? ""), displayName: String(form.get("displayName") ?? ""), mode: String(form.get("mode") ?? "") } };
  await setSessionCookie(r.token);
  redirect("/dashboard?welcome=1");
}

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  if (!rateLimit(await clientKey("login"), 30, 15 * 60_000)) return { error: "Too many attempts. Wait a few minutes and try again." };
  const db = await getDb();
  const r = await loginUser(db, String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!r.ok) return { error: r.error, values: { email: String(form.get("email") ?? "") } };
  await setSessionCookie(r.token);
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  const db = await getDb();
  await destroySession(db, await sessionToken());
  await clearSessionCookie();
  redirect("/");
}

// ---------------- Profile ----------------

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(40),
  mode: z.enum(["beginner", "advanced"]),
  timezone: z.string().max(64),
  leaderboardOptIn: z.boolean(),
});

export async function updateProfileAction(_: FormState, form: FormData): Promise<FormState> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  const parsed = profileSchema.safeParse({
    displayName: form.get("displayName"),
    mode: form.get("mode"),
    timezone: form.get("timezone"),
    leaderboardOptIn: form.get("leaderboardOptIn") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: parsed.data.timezone });
  } catch {
    return { error: "Unknown time zone" };
  }
  const db = await getDb();
  await db.update(users).set(parsed.data).where(eq(users.id, u.id));
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  const db = await getDb();
  const r = await changePassword(db, u.id, String(form.get("current") ?? ""), String(form.get("next") ?? ""));
  if (!r.ok) return { error: r.error };
  await clearSessionCookie();
  redirect("/login?changed=1");
}

export async function signOutEverywhereAction() {
  const u = await getCurrentUser();
  if (!u) redirect("/login");
  const db = await getDb();
  await db.delete(sessions).where(eq(sessions.userId, u.id));
  await clearSessionCookie();
  redirect("/login");
}

export async function toggleBookmarkAction(kind: "lesson" | "term", refId: string) {
  const u = await getCurrentUser();
  if (!u) return { ok: false as const, error: "Sign in to bookmark." };
  if (!["lesson", "term"].includes(kind) || typeof refId !== "string" || refId.length > 100) return { ok: false as const, error: "Invalid" };
  const db = await getDb();
  const where = and(eq(bookmarks.userId, u.id), eq(bookmarks.kind, kind), eq(bookmarks.refId, refId));
  const existing = await db.select().from(bookmarks).where(where);
  if (existing.length) await db.delete(bookmarks).where(where);
  else await db.insert(bookmarks).values({ userId: u.id, kind, refId });
  revalidatePath("/profile");
  return { ok: true as const, bookmarked: !existing.length };
}

export async function touchPathAction(path: string) {
  const u = await getCurrentUser();
  if (!u || typeof path !== "string" || !/^\/(learn|simulator|games|exams|review)[\w\-/?=&]*$/.test(path) || path.length > 200) return;
  const db = await getDb();
  await db.update(users).set({ lastPath: path }).where(eq(users.id, u.id));
}

// ---------------- Learning ----------------

async function ctx() {
  const u = await getCurrentUser();
  if (!u) return null;
  const db = await getDb();
  const { curriculum, scenarios } = await loadContent(db);
  return { u, db, cur: curriculum, scenarios };
}
const AUTH = { ok: false as const, error: "Please sign in again.", code: "auth" as const };

export async function startLessonAction(lessonId: string) {
  const c = await ctx();
  if (!c) return AUTH;
  return learning.startLesson(c.db, c.u, c.cur, lessonId);
}
export async function checkAnswerAction(runId: string, questionId: string, response: Response) {
  const c = await ctx();
  if (!c) return AUTH;
  return learning.checkLessonAnswer(c.db, c.u, c.cur, runId, questionId, response);
}
export async function completeLessonAction(runId: string) {
  const c = await ctx();
  if (!c) return AUTH;
  const r = await learning.completeLesson(c.db, c.u, c.cur, runId);
  revalidatePath("/", "layout");
  return r;
}
export async function startReviewAction() {
  const c = await ctx();
  if (!c) return AUTH;
  return learning.startReview(c.db, c.u, c.cur);
}
export async function answerReviewAction(runId: string, questionId: string, response: Response) {
  const c = await ctx();
  if (!c) return AUTH;
  return learning.answerReview(c.db, c.u, c.cur, runId, questionId, response);
}
export async function startExamAction(key: string) {
  const c = await ctx();
  if (!c) return AUTH;
  return learning.startExam(c.db, c.u, c.cur, key);
}
export async function submitExamAction(runId: string, responses: Record<string, Response>) {
  const c = await ctx();
  if (!c) return AUTH;
  const r = await learning.submitExam(c.db, c.u, c.cur, runId, responses);
  revalidatePath("/", "layout");
  return r;
}

// ---------------- Games & simulator ----------------

export async function startGameAction(gameId: string) {
  const c = await ctx();
  if (!c) return AUTH;
  return play.startGame(c.db, c.u, c.cur, gameId);
}
export async function gameActionAction(runId: string, action: unknown) {
  const c = await ctx();
  if (!c) return AUTH;
  return play.gameAction(c.db, c.u, runId, action);
}
export async function submitGameAction(runId: string, submission: unknown) {
  const c = await ctx();
  if (!c) return AUTH;
  const r = await play.submitGame(c.db, c.u, c.cur, runId, submission);
  revalidatePath("/", "layout");
  return r;
}
export async function startSimAction(scenarioId: string) {
  const c = await ctx();
  if (!c) return AUTH;
  return play.startSim(c.db, c.u, c.scenarios, scenarioId);
}
export async function simActAction(runId: string, action: unknown) {
  const c = await ctx();
  if (!c) return AUTH;
  const r = await play.simAct(c.db, c.u, c.cur, c.scenarios, runId, action);
  if (r.ok && r.score) revalidatePath("/", "layout");
  return r;
}
