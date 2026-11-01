import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { DB } from "./db";
import { certificates, lessonProgress, reviewCards, runs, xpEvents } from "./db/schema";
import { newId } from "./crypto";
import type { SessionUser } from "./auth-core";
import { lessonQuestions, type Curriculum } from "@/content";
import type { Lesson, Question } from "@/content/types";
import { CERT_TRACKS } from "@/content/cert";
import { LEVELS } from "@/content/levels";
import { gradeQuestion, hashString, toPublicQuestion, type PublicQuestion, type Response } from "@/engine/grading";
import { lessonXp, localDay, XP } from "@/engine/progression";
import { sample, rng } from "@/engine/games/core";
import {
  awardXp,
  canAccessPro,
  checkChallenges,
  completedLessonIds,
  evaluateBadges,
  levelStatuses,
  passedLevelExams,
  recordAnswer,
  xpAlreadyAwarded,
} from "./progress";

export type Fail = { ok: false; error: string; code?: "auth" | "locked" | "pro" | "notfound" | "invalid" };
const fail = (error: string, code?: Fail["code"]): Fail => ({ ok: false, error, code });

export type PublicStep =
  | Exclude<Lesson["steps"][number], { kind: "question" }>
  | { kind: "question"; question: PublicQuestion; skills: string[] };

export function publicLesson(l: Lesson) {
  return {
    id: l.id,
    levelId: l.levelId,
    order: l.order,
    title: l.title,
    summary: l.summary,
    minutes: l.minutes,
    objectives: l.objectives,
    skills: l.skills,
    sources: l.sources,
    revised: l.revised,
    scope: l.scope,
    pro: l.pro,
    steps: l.steps.map((s): PublicStep => (s.kind === "question" ? { kind: "question", question: toPublicQuestion(s.question), skills: s.question.skills } : s)),
  };
}
export type PublicLesson = ReturnType<typeof publicLesson>;

async function loadRun(db: DB, userId: string, runId: string, kind: string) {
  const [r] = await db.select().from(runs).where(and(eq(runs.id, String(runId)), eq(runs.userId, userId), eq(runs.kind, kind)));
  return r ?? null;
}

/** Atomically mark a run finished. Returns false if it was already finished (prevents double awards). */
async function claimFinish(db: DB, runId: string, values: Partial<typeof runs.$inferInsert>) {
  const r = await db
    .update(runs)
    .set({ finishedAt: new Date(), ...values })
    .where(and(eq(runs.id, runId), isNull(runs.finishedAt)))
    .returning({ id: runs.id });
  return r.length > 0;
}

export async function lessonAccess(db: DB, user: SessionUser, cur: Curriculum, lesson: Lesson): Promise<Fail | null> {
  const statuses = levelStatuses(cur, await completedLessonIds(db, user.id), await passedLevelExams(db, user.id));
  if (!statuses.find((s) => s.id === lesson.levelId)?.unlocked) return fail("Finish the previous level (or pass its checkpoint) to unlock this lesson.", "locked");
  if (lesson.pro && !canAccessPro(user)) return fail("This lesson is part of HVAC Academy Pro.", "pro");
  return null;
}

// ---------------- Lessons ----------------

export async function startLesson(db: DB, user: SessionUser, cur: Curriculum, lessonId: string) {
  const lesson = cur.lessonById.get(String(lessonId));
  if (!lesson) return fail("Lesson not found", "notfound");
  const denied = await lessonAccess(db, user, cur, lesson);
  if (denied) return denied;
  const id = newId("r_");
  await db.insert(runs).values({ id, userId: user.id, kind: "lesson", refId: lesson.id, state: { first: {}, correct: {} } });
  return { ok: true as const, runId: id, lesson: publicLesson(lesson) };
}

export async function checkLessonAnswer(db: DB, user: SessionUser, cur: Curriculum, runId: string, questionId: string, response: Response) {
  const run = await loadRun(db, user.id, runId, "lesson");
  if (!run || run.finishedAt) return fail("This lesson session has ended. Restart the lesson.", "invalid");
  const lesson = cur.lessonById.get(run.refId);
  const q = lesson && lessonQuestions(lesson).find((x) => x.id === questionId);
  if (!q) return fail("Question not in this lesson", "invalid");
  const g = gradeQuestion(q, response);
  const state = run.state as { first: Record<string, boolean>; correct: Record<string, boolean> };
  const firstAttempt = !(q.id in state.first);
  if (firstAttempt) {
    state.first[q.id] = g.correct;
    await recordAnswer(db, user.id, q.id, g.correct, "lesson", q.skills);
  }
  if (g.correct) state.correct[q.id] = true;
  await db.update(runs).set({ state }).where(eq(runs.id, run.id));
  return { ok: true as const, ...g, firstAttempt };
}

export async function completeLesson(db: DB, user: SessionUser, cur: Curriculum, runId: string) {
  const run = await loadRun(db, user.id, runId, "lesson");
  if (!run) return fail("Lesson session not found", "invalid");
  const lesson = cur.lessonById.get(run.refId);
  if (!lesson) return fail("Lesson not found", "notfound");
  const qs = lessonQuestions(lesson);
  const state = run.state as { first: Record<string, boolean>; correct: Record<string, boolean> };
  const missing = qs.filter((q) => !state.correct[q.id]);
  if (missing.length) return fail("Answer every question correctly to finish the lesson.", "invalid");
  const firstTry = qs.filter((q) => state.first[q.id]).length;
  const pct = qs.length ? Math.round((firstTry / qs.length) * 100) : 100;
  if (!(await claimFinish(db, run.id, { score: firstTry, maxScore: qs.length }))) return fail("Lesson already completed.", "invalid");

  const today = localDay(new Date(), user.timezone);
  const [prev] = await db.select().from(lessonProgress).where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lesson.id)));
  const xp = lessonXp({ firstCompletion: !prev, questions: qs.length, firstTryCorrect: firstTry, replayAwardedToday: prev?.lastReplayXpDate === today });
  if (prev) {
    await db
      .update(lessonProgress)
      .set({ bestScore: Math.max(prev.bestScore, pct), attempts: prev.attempts + 1, ...(xp > 0 ? { lastReplayXpDate: today } : {}) })
      .where(and(eq(lessonProgress.userId, user.id), eq(lessonProgress.lessonId, lesson.id)));
  } else {
    await db.insert(lessonProgress).values({ userId: user.id, lessonId: lesson.id, bestScore: pct, attempts: 1 });
  }
  const awarded = await awardXp(db, user, xp, "lesson", lesson.id);
  await db.update(runs).set({ xpAwarded: awarded }).where(eq(runs.id, run.id));
  const badges = await evaluateBadges(db, user, cur);
  const challenges = await checkChallenges(db, user);
  await maybeIssueCertificates(db, user, cur);
  const siblings = cur.lessonsByLevel.get(lesson.levelId) ?? [];
  const nextLesson = siblings.find((l) => l.order > lesson.order) ?? null;
  return { ok: true as const, xp: awarded, firstTry, total: qs.length, pct, firstCompletion: !prev, badges, challenges, nextLessonId: nextLesson?.id ?? null, levelId: lesson.levelId };
}

// ---------------- Spaced review ----------------

export async function startReview(db: DB, user: SessionUser, cur: Curriculum, n = 10) {
  const due = await db
    .select({ q: reviewCards.questionId })
    .from(reviewCards)
    .where(and(eq(reviewCards.userId, user.id), sql`${reviewCards.dueAt} <= now()`))
    .orderBy(asc(reviewCards.dueAt))
    .limit(n);
  let ids = due.map((d) => d.q).filter((id) => cur.questions.has(id));
  let early = false;
  if (ids.length === 0) {
    // Nothing due: offer the soonest upcoming cards so practice is always possible.
    const soon = await db.select({ q: reviewCards.questionId }).from(reviewCards).where(eq(reviewCards.userId, user.id)).orderBy(asc(reviewCards.dueAt)).limit(n);
    ids = soon.map((d) => d.q).filter((id) => cur.questions.has(id));
    early = true;
  }
  if (!ids.length) return { ok: true as const, runId: null, questions: [], early };
  const id = newId("r_");
  await db.insert(runs).values({ id, userId: user.id, kind: "review", refId: "review", state: { ids, answered: {} } });
  return { ok: true as const, runId: id, questions: ids.map((q) => toPublicQuestion(cur.questions.get(q)!)), early };
}

const REVIEW_DAILY_CAP = 60;

export async function answerReview(db: DB, user: SessionUser, cur: Curriculum, runId: string, questionId: string, response: Response) {
  const run = await loadRun(db, user.id, runId, "review");
  if (!run || run.finishedAt) return fail("Review session ended.", "invalid");
  const state = run.state as { ids: string[]; answered: Record<string, boolean> };
  if (!state.ids.includes(questionId)) return fail("Question not in this review.", "invalid");
  const q = cur.questions.get(questionId)!;
  const g = gradeQuestion(q, response);
  let xp = 0;
  if (!(questionId in state.answered)) {
    state.answered[questionId] = g.correct;
    await recordAnswer(db, user.id, questionId, g.correct, "review", q.skills);
    if (g.correct) {
      const today = localDay(new Date(), user.timezone);
      const [{ n }] = await db
        .select({ n: sql<number>`coalesce(sum(${xpEvents.amount}),0)::int` })
        .from(xpEvents)
        .where(and(eq(xpEvents.userId, user.id), eq(xpEvents.source, "review"), eq(xpEvents.day, today)));
      if (n < REVIEW_DAILY_CAP) xp = await awardXp(db, user, XP.reviewCorrect, "review", questionId);
    }
    const done = state.ids.every((id) => id in state.answered);
    await db.update(runs).set({ state, ...(done ? { finishedAt: new Date() } : {}) }).where(eq(runs.id, run.id));
  }
  const badges = await evaluateBadges(db, user, cur);
  return { ok: true as const, ...g, xp, badges };
}

// ---------------- Exams ----------------

export type ExamDef = { key: string; title: string; questions: Question[]; count: number; minutes: number; passMark: number; disclaimer?: string };

export function examDef(cur: Curriculum, key: string): ExamDef | null {
  if (key.startsWith("level:")) {
    const lvl = LEVELS.find((l) => l.id === key.slice(6));
    if (!lvl) return null;
    const qs = (cur.lessonsByLevel.get(lvl.id) ?? []).flatMap(lessonQuestions);
    return { key, title: `Level ${lvl.number} Checkpoint — ${lvl.title}`, questions: qs, count: Math.min(15, qs.length), minutes: 20, passMark: lvl.passMark };
  }
  if (key === "final") {
    const qs = cur.lessons.flatMap(lessonQuestions).filter((q) => q.difficulty >= 1);
    return { key, title: "Final Exam — Professional HVAC Technician", questions: qs, count: 40, minutes: 60, passMark: 80, disclaimer: "Completing this exam is not an official certification or license." };
  }
  if (key.startsWith("cert:")) {
    const t = CERT_TRACKS.find((x) => x.id === key.slice(5));
    if (!t) return null;
    return { key, title: t.title, questions: t.banks.flatMap((b) => cur.certBanks[b] ?? []), count: t.questionCount, minutes: t.minutes, passMark: t.passMark, disclaimer: t.disclaimer };
  }
  return null;
}

export async function startExam(db: DB, user: SessionUser, cur: Curriculum, key: string) {
  const def = examDef(cur, String(key));
  if (!def) return fail("Exam not found", "notfound");
  const statuses = levelStatuses(cur, await completedLessonIds(db, user.id), await passedLevelExams(db, user.id));
  if (key.startsWith("level:") && !statuses.find((s) => s.id === key.slice(6))?.unlocked) return fail("Unlock this level first.", "locked");
  if (key === "final" && !statuses.find((s) => s.id === "l10")?.unlocked) return fail("The final exam unlocks with Level 10.", "locked");
  if (key.startsWith("cert:") && CERT_TRACKS.find((t) => t.id === key.slice(5))?.pro && !canAccessPro(user)) return fail("This practice exam is part of HVAC Academy Pro.", "pro");
  if (key === "final" && !canAccessPro(user)) return fail("The final exam is part of HVAC Academy Pro.", "pro");
  const seed = hashString(newId());
  const chosen = sample(rng(seed), def.questions, def.count);
  const id = newId("r_");
  await db.insert(runs).values({ id, userId: user.id, kind: "exam", refId: def.key, state: { ids: chosen.map((q) => q.id), minutes: def.minutes, passMark: def.passMark } });
  return {
    ok: true as const,
    runId: id,
    title: def.title,
    minutes: def.minutes,
    passMark: def.passMark,
    disclaimer: def.disclaimer ?? null,
    deadline: Date.now() + def.minutes * 60_000,
    questions: chosen.map((q) => toPublicQuestion(q, seed)),
  };
}

export async function submitExam(db: DB, user: SessionUser, cur: Curriculum, runId: string, responses: Record<string, Response>) {
  const run = await loadRun(db, user.id, runId, "exam");
  if (!run) return fail("Exam not found", "notfound");
  if (run.finishedAt) return fail("This exam was already submitted.", "invalid");
  const state = run.state as { ids: string[]; minutes: number; passMark: number };
  const elapsed = Date.now() - run.startedAt.getTime();
  const overtime = elapsed > state.minutes * 60_000 + 30_000;
  const resp = responses && typeof responses === "object" ? responses : {};
  let score = 0;
  const results = state.ids.map((id) => {
    const q = cur.questions.get(id);
    if (!q) return { id, correct: false, prompt: "(question removed)", explanation: "", correctAnswer: "" };
    const g = gradeQuestion(q, resp[id] as Response);
    if (g.correct) score++;
    return { id, correct: g.correct, prompt: q.prompt, explanation: g.explanation, correctAnswer: g.correctAnswer };
  });
  const pct = Math.round((score / Math.max(1, state.ids.length)) * 100);
  const passed = !overtime && pct >= state.passMark;
  if (!(await claimFinish(db, run.id, { score, maxScore: state.ids.length, result: { pct, passed, overtime } }))) return fail("This exam was already submitted.", "invalid");
  for (const r of results) {
    const q = cur.questions.get(r.id);
    if (q) await recordAnswer(db, user.id, q.id, r.correct, "exam", q.skills);
  }
  let xp = 0;
  if (passed && !(await xpAlreadyAwarded(db, user.id, "exam", run.refId))) xp = await awardXp(db, user, XP.examPass, "exam", run.refId);
  await db.update(runs).set({ xpAwarded: xp }).where(eq(runs.id, run.id));
  const certs = await maybeIssueCertificates(db, user, cur);
  const badges = await evaluateBadges(db, user, cur);
  return { ok: true as const, score, total: state.ids.length, pct, passed, overtime, passMark: state.passMark, xp, results, certificates: certs, badges };
}

/** Issue a certificate for each level that is fully complete with its checkpoint passed, plus the master certificate. */
export async function maybeIssueCertificates(db: DB, user: SessionUser, cur: Curriculum) {
  const exams = await passedLevelExams(db, user.id);
  const statuses = levelStatuses(cur, await completedLessonIds(db, user.id), exams);
  const have = new Set((await db.select({ l: certificates.levelId }).from(certificates).where(eq(certificates.userId, user.id))).map((r) => r.l));
  const issued: { id: string; levelId: string }[] = [];
  const bestExam = async (ref: string) => {
    const [r] = await db
      .select({ s: sql<number>`max(${runs.score}::float / nullif(${runs.maxScore},0))` })
      .from(runs)
      .where(and(eq(runs.userId, user.id), eq(runs.kind, "exam"), eq(runs.refId, ref)));
    return Math.round((r?.s ?? 0) * 100);
  };
  for (const s of statuses) {
    if (s.complete && s.examPassed && !have.has(s.id)) {
      const id = newId("c_");
      await db.insert(certificates).values({ id, userId: user.id, levelId: s.id, recipientName: user.displayName, score: await bestExam(`level:${s.id}`) });
      issued.push({ id, levelId: s.id });
    }
  }
  const finalRows = await db.select({ result: runs.result }).from(runs).where(and(eq(runs.userId, user.id), eq(runs.kind, "exam"), eq(runs.refId, "final")));
  const finalPassed = finalRows.some((r) => (r.result as { passed?: boolean } | null)?.passed);
  if (finalPassed && exams.size >= LEVELS.length && !have.has("master")) {
    const id = newId("c_");
    await db.insert(certificates).values({ id, userId: user.id, levelId: "master", recipientName: user.displayName, score: await bestExam("final") });
    issued.push({ id, levelId: "master" });
  }
  return issued;
}
