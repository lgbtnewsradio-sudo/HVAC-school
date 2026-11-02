import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import type { DB } from "./db";
import { achievements, answers, lessonProgress, reviewCards, runs, users, xpEvents } from "./db/schema";
import { newId } from "./crypto";
import type { SessionUser } from "./auth-core";
import { LEVELS } from "@/content/levels";
import { SKILLS, type Skill } from "@/content/types";
import type { Curriculum } from "@/content";
import { computeStreak, isoWeek, levelFromXp, localDay, masteryFromAnswers, nextCard, rankTitle, weekStart, XP } from "@/engine/progression";
import { BADGES, newlyEarned, type BadgeStats } from "@/engine/achievements";
import { dailyChallenge, runCountsForChallenge, weeklyChallenge } from "@/engine/challenges";

// ---------- Entitlements ----------

export function paywallEnabled() {
  return process.env.PAYWALL === "on" || (!!process.env.STRIPE_SECRET_KEY && process.env.PAYWALL !== "off");
}
export function canAccessPro(u: Pick<SessionUser, "plan" | "role">) {
  return !paywallEnabled() || u.plan === "pro" || u.role === "admin";
}

// ---------- XP ----------

export async function awardXp(db: DB, user: Pick<SessionUser, "id" | "timezone">, amount: number, source: string, ref: string) {
  if (amount <= 0) return 0;
  const day = localDay(new Date(), user.timezone);
  await db.insert(xpEvents).values({ id: newId("x_"), userId: user.id, amount: Math.round(amount), source, ref, day });
  await db.update(users).set({ xp: sql`${users.xp} + ${Math.round(amount)}` }).where(eq(users.id, user.id));
  return Math.round(amount);
}

export async function xpAlreadyAwarded(db: DB, userId: string, source: string, ref: string) {
  const r = await db.select({ id: xpEvents.id }).from(xpEvents).where(and(eq(xpEvents.userId, userId), eq(xpEvents.source, source), eq(xpEvents.ref, ref))).limit(1);
  return r.length > 0;
}

export async function activeDays(db: DB, userId: string): Promise<string[]> {
  const rows = await db.selectDistinct({ day: xpEvents.day }).from(xpEvents).where(eq(xpEvents.userId, userId));
  return rows.map((r) => String(r.day));
}

export async function streakFor(db: DB, user: Pick<SessionUser, "id" | "timezone">) {
  return computeStreak(await activeDays(db, user.id), localDay(new Date(), user.timezone));
}

// ---------- Answer history & mastery ----------

export async function recordAnswer(db: DB, userId: string, questionId: string, correct: boolean, context: string, skills: string[]) {
  await db.insert(answers).values({ id: newId("a_"), userId, questionId, correct, context, skills });
  if (context === "lesson" || context === "review" || context === "exam") {
    const [prev] = await db.select().from(reviewCards).where(and(eq(reviewCards.userId, userId), eq(reviewCards.questionId, questionId)));
    const n = nextCard(prev ?? null, correct, new Date());
    if (prev) await db.update(reviewCards).set(n).where(and(eq(reviewCards.userId, userId), eq(reviewCards.questionId, questionId)));
    else await db.insert(reviewCards).values({ userId, questionId, ...n });
  }
}

export async function masteryBySkill(db: DB, userId: string): Promise<Record<Skill, { pct: number; n: number }>> {
  const rows = await db.select({ correct: answers.correct, skills: answers.skills }).from(answers).where(eq(answers.userId, userId)).orderBy(answers.createdAt).limit(5000);
  const out = Object.fromEntries(SKILLS.map((s) => [s, [] as boolean[]])) as Record<Skill, boolean[]>;
  for (const r of rows) for (const s of r.skills ?? []) if (s in out) out[s as Skill].push(r.correct);
  return Object.fromEntries(SKILLS.map((s) => [s, { pct: masteryFromAnswers(out[s]), n: out[s].length }])) as Record<Skill, { pct: number; n: number }>;
}

// ---------- Level unlocks ----------

export async function completedLessonIds(db: DB, userId: string) {
  const rows = await db.select({ id: lessonProgress.lessonId, best: lessonProgress.bestScore }).from(lessonProgress).where(eq(lessonProgress.userId, userId));
  return new Map(rows.map((r) => [r.id, r.best]));
}

export async function passedLevelExams(db: DB, userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ ref: runs.refId, score: runs.score, max: runs.maxScore })
    .from(runs)
    .where(and(eq(runs.userId, userId), eq(runs.kind, "exam"), isNotNull(runs.finishedAt)));
  const passed = new Set<string>();
  for (const r of rows) {
    if (!r.ref.startsWith("level:") || !r.max) continue;
    const lvl = LEVELS.find((l) => l.id === r.ref.slice(6));
    if (lvl && ((r.score ?? 0) / r.max) * 100 >= lvl.passMark) passed.add(lvl.id);
  }
  return passed;
}

export type LevelStatus = { id: string; unlocked: boolean; completed: number; total: number; examPassed: boolean; complete: boolean };

export function levelStatuses(cur: Curriculum, done: Map<string, number>, examsPassed: Set<string>): LevelStatus[] {
  const out: LevelStatus[] = [];
  LEVELS.forEach((lvl, i) => {
    const lessons = cur.lessonsByLevel.get(lvl.id) ?? [];
    const completed = lessons.filter((l) => done.has(l.id)).length;
    const prev = out[i - 1];
    // Unlock: first level, or previous level 80%+ complete, or previous checkpoint passed (test-out).
    const unlocked = i === 0 || !!prev?.examPassed || (prev ? prev.completed / Math.max(1, prev.total) >= 0.8 : false);
    out.push({ id: lvl.id, unlocked, completed, total: lessons.length, examPassed: examsPassed.has(lvl.id), complete: lessons.length > 0 && completed === lessons.length });
  });
  return out;
}

// ---------- Stats & badges ----------

export async function badgeStats(db: DB, user: Pick<SessionUser, "id" | "timezone">, cur: Curriculum): Promise<BadgeStats> {
  const done = await completedLessonIds(db, user.id);
  const exams = await passedLevelExams(db, user.id);
  const statuses = levelStatuses(cur, done, exams);
  const finished = await db
    .select({ kind: runs.kind, ref: runs.refId, score: runs.score, max: runs.maxScore, result: runs.result })
    .from(runs)
    .where(and(eq(runs.userId, user.id), isNotNull(runs.finishedAt)));
  const bestGame: Record<string, number> = {};
  const simPassed = new Set<string>();
  let simSafe = 0;
  let simA = 0;
  let certPassed = 0;
  let finalPassed = false;
  for (const r of finished) {
    const frac = r.max ? (r.score ?? 0) / r.max : 0;
    if (r.kind === "game") bestGame[r.ref] = Math.max(bestGame[r.ref] ?? 0, frac);
    if (r.kind === "sim") {
      if (frac >= 0.8) simPassed.add(r.ref);
      const res = r.result as { safetyNotes?: string[]; grade?: string } | null;
      if (res && (res.safetyNotes?.length ?? 1) === 0) simSafe++;
      if (res?.grade === "A") simA++;
    }
    if (r.kind === "exam" && (r.result as { passed?: boolean } | null)?.passed) {
      if (r.ref.startsWith("cert:")) certPassed++;
      if (r.ref === "final") finalPassed = true;
    }
  }
  const [{ n: reviewCorrect }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(answers)
    .where(and(eq(answers.userId, user.id), eq(answers.context, "review"), eq(answers.correct, true)));
  const perfect = [...done.values()].filter((b) => b === 100).length;
  return {
    lessonsCompleted: done.size,
    perfectLessons: perfect,
    levelsCompleted: statuses.filter((s) => s.complete).map((s) => s.id),
    levelExamsPassed: [...exams],
    streak: (await streakFor(db, user)).current,
    simPassedDistinct: simPassed.size,
    simSafeRuns: simSafe,
    simAGrades: simA,
    bestGame,
    certPassed,
    reviewCorrect,
    finalPassed,
  };
}

/** Award any newly earned badges (and their XP). Returns the new badges. */
export async function evaluateBadges(db: DB, user: Pick<SessionUser, "id" | "timezone">, cur: Curriculum) {
  const have = new Set((await db.select({ id: achievements.badgeId }).from(achievements).where(eq(achievements.userId, user.id))).map((r) => r.id));
  const fresh = newlyEarned(await badgeStats(db, user, cur), have);
  for (const b of fresh) {
    const inserted = await db.insert(achievements).values({ userId: user.id, badgeId: b.id }).onConflictDoNothing().returning();
    if (inserted.length) await awardXp(db, user, b.xp, "achievement", b.id);
  }
  return fresh.map((b) => ({ id: b.id, title: b.title, icon: b.icon, xp: b.xp }));
}

// ---------- Challenges ----------

export async function weeklyProgress(db: DB, user: Pick<SessionUser, "id" | "timezone">) {
  const today = localDay(new Date(), user.timezone);
  const wk = weeklyChallenge(isoWeek(today));
  const start = weekStart(today);
  const startDate = new Date(start + "T00:00:00Z");
  let value = 0;
  if (wk.metric === "xp") {
    const [r] = await db
      .select({ n: sql<number>`coalesce(sum(${xpEvents.amount}),0)::int` })
      .from(xpEvents)
      .where(and(eq(xpEvents.userId, user.id), gte(xpEvents.day, start), sql`${xpEvents.source} <> 'challenge'`));
    value = r.n;
  } else if (wk.metric === "lessons") {
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(lessonProgress).where(and(eq(lessonProgress.userId, user.id), gte(lessonProgress.completedAt, startDate)));
    value = r.n;
  } else {
    const kind = wk.metric === "simsPassed" ? "sim" : "game";
    const rows = await db
      .select({ ref: runs.refId, score: runs.score, max: runs.maxScore })
      .from(runs)
      .where(and(eq(runs.userId, user.id), eq(runs.kind, kind), gte(runs.finishedAt, startDate)));
    const ok = rows.filter((r) => r.max && (r.score ?? 0) / r.max >= (kind === "sim" ? 0.8 : 0.7));
    value = kind === "sim" ? ok.length : new Set(ok.map((r) => r.ref)).size;
  }
  const done = await xpAlreadyAwarded(db, user.id, "challenge", `weekly:${wk.week}`);
  return { ...wk, value: Math.min(value, wk.target), done };
}

/** After any finished run (or lesson), check daily/weekly challenge completion and award once. */
export async function checkChallenges(db: DB, user: Pick<SessionUser, "id" | "timezone">, finished?: { kind: "sim" | "game"; id: string; score: number; max: number }) {
  const out: { title: string; xp: number }[] = [];
  const today = localDay(new Date(), user.timezone);
  const daily = dailyChallenge(today);
  if (finished && finished.kind === daily.kind && finished.id === daily.id && runCountsForChallenge(finished.kind, finished.id, finished.score, finished.max)) {
    if (!(await xpAlreadyAwarded(db, user.id, "challenge", `daily:${today}`))) {
      await awardXp(db, user, XP.dailyChallenge, "challenge", `daily:${today}`);
      out.push({ title: "Daily challenge complete!", xp: XP.dailyChallenge });
    }
  }
  const wk = await weeklyProgress(db, user);
  if (!wk.done && wk.value >= wk.target) {
    await awardXp(db, user, XP.weeklyChallenge, "challenge", `weekly:${wk.week}`);
    out.push({ title: "Weekly challenge complete!", xp: XP.weeklyChallenge });
  }
  return out;
}

// ---------- Leaderboard (opt-in only) ----------

export async function weeklyLeaderboard(db: DB, user: Pick<SessionUser, "id" | "timezone" | "leaderboardOptIn">) {
  const start = weekStart(localDay(new Date(), user.timezone));
  const rows = await db
    .select({ id: users.id, name: users.displayName, xp: sql<number>`coalesce(sum(${xpEvents.amount}),0)::int` })
    .from(xpEvents)
    .innerJoin(users, eq(users.id, xpEvents.userId))
    .where(and(eq(users.leaderboardOptIn, true), gte(xpEvents.day, start)))
    .groupBy(users.id, users.displayName)
    .orderBy(desc(sql`sum(${xpEvents.amount})`))
    .limit(50);
  return {
    weekOf: start,
    rows: rows.map((r, i) => ({ rank: i + 1, name: r.name, xp: r.xp, you: r.id === user.id })),
    optedIn: user.leaderboardOptIn,
  };
}

// ---------- Dashboard summary ----------

export async function dashboardSummary(db: DB, user: SessionUser, cur: Curriculum) {
  const [done, exams, streak, mastery, badges] = await Promise.all([
    completedLessonIds(db, user.id),
    passedLevelExams(db, user.id),
    streakFor(db, user),
    masteryBySkill(db, user.id),
    db.select().from(achievements).where(eq(achievements.userId, user.id)).orderBy(desc(achievements.earnedAt)),
  ]);
  const statuses = levelStatuses(cur, done, exams);
  const [{ due }] = await db
    .select({ due: sql<number>`count(*)::int` })
    .from(reviewCards)
    .where(and(eq(reviewCards.userId, user.id), sql`${reviewCards.dueAt} <= now()`));
  const today = localDay(new Date(), user.timezone);
  const [{ todayXp }] = await db
    .select({ todayXp: sql<number>`coalesce(sum(${xpEvents.amount}),0)::int` })
    .from(xpEvents)
    .where(and(eq(xpEvents.userId, user.id), eq(xpEvents.day, today)));
  const daily = dailyChallenge(today);
  const dailyDone = await xpAlreadyAwarded(db, user.id, "challenge", `daily:${today}`);
  const weekly = await weeklyProgress(db, user);

  // Recommended next lesson: first incomplete lesson in the lowest unlocked level.
  let next = null as null | { id: string; title: string; levelId: string; minutes: number };
  for (const st of statuses) {
    if (!st.unlocked) break;
    const l = (cur.lessonsByLevel.get(st.id) ?? []).find((x) => !done.has(x.id));
    if (l) {
      next = { id: l.id, title: l.title, levelId: l.levelId, minutes: l.minutes };
      break;
    }
  }
  const weakest = SKILLS.map((s) => ({ skill: s, ...mastery[s] }))
    .filter((m) => m.n >= 4)
    .sort((a, b) => a.pct - b.pct)[0];
  const recommendation =
    due >= 8 || (weakest && weakest.pct < 50 && due > 0)
      ? { kind: "review" as const, reason: weakest && weakest.pct < 50 ? `Your ${weakest.skill} mastery is ${weakest.pct}%. A quick review will lock it in.` : `${due} concepts are due for review.` }
      : next
        ? { kind: "lesson" as const, reason: "Next up on your path." }
        : { kind: "sim" as const, reason: "You've finished the unlocked lessons — put them to work in the Field Simulator." };

  const lvl = levelFromXp(user.xp);
  const currentLevel = [...statuses].reverse().find((s) => s.unlocked) ?? statuses[0];
  return {
    xp: user.xp,
    rank: { ...lvl, title: rankTitle(lvl.level) },
    todayXp,
    streak,
    statuses,
    currentLevel: currentLevel.id,
    mastery,
    badges: badges.map((b) => ({ ...BADGES.find((x) => x.id === b.badgeId)!, earnedAt: b.earnedAt })).filter((b) => b.id),
    dueReviews: due,
    next,
    recommendation,
    daily: { ...daily, done: dailyDone },
    weekly,
    lessonsDone: done.size,
  };
}

export async function unlockedLevelIds(db: DB, userId: string, cur: Curriculum) {
  const statuses = levelStatuses(cur, await completedLessonIds(db, userId), await passedLevelExams(db, userId));
  return statuses.filter((s) => s.unlocked).map((s) => s.id);
}

export async function runsTodayCount(db: DB, user: Pick<SessionUser, "id" | "timezone">, kind: string, refId: string) {
  const today = localDay(new Date(), user.timezone);
  const rows = await db
    .select({ finishedAt: runs.finishedAt })
    .from(runs)
    .where(and(eq(runs.userId, user.id), eq(runs.kind, kind), eq(runs.refId, refId), isNotNull(runs.finishedAt)));
  return rows.filter((r) => r.finishedAt && localDay(r.finishedAt, user.timezone) === today).length;
}

