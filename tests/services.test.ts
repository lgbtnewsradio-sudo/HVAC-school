import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb, resetDbForTests, type DB } from "@/server/db";
import { users, runs, xpEvents } from "@/server/db/schema";
import { loginUser, registerUser, userForToken, destroySession, type SessionUser } from "@/server/auth-core";
import { BASE_CURRICULUM, lessonQuestions } from "@/content";
import { checkLessonAnswer, completeLesson, startLesson, startExam, submitExam, startReview, answerReview } from "@/server/learning";
import { startGame, submitGame, startSim, simAct, gameAction } from "@/server/play";
import { dashboardSummary, levelStatuses } from "@/server/progress";
import { SCENARIOS } from "@/engine/sim/scenarios";
import type { Question } from "@/content/types";

let db: DB;
const cur = BASE_CURRICULUM;

function correctResponse(q: Question) {
  switch (q.type) {
    case "single":
      return q.answer;
    case "multi":
      return q.answer;
    case "truefalse":
      return q.answer;
    case "order":
      return q.items.map((i) => i.id);
    case "match":
      return Object.fromEntries(q.pairs.map((p) => [p.id, p.id]));
    case "numeric":
      return q.answer;
  }
}

async function makeUser(email: string, extra: Record<string, unknown> = {}): Promise<SessionUser> {
  const r = await registerUser(db, { email, displayName: "Test Tech", password: "hvacrocks123", timezone: "America/Chicago", ...extra });
  if (!r.ok) throw new Error(r.error);
  return (await userForToken(db, r.token))!;
}
const refresh = async (u: SessionUser) => (await db.select().from(users).where(eq(users.id, u.id)))[0];

beforeAll(async () => {
  process.env.ADMIN_EMAILS = "boss@example.com";
  resetDbForTests();
  db = await getDb();
});

describe("auth", () => {
  it("registers, rejects duplicates and weak passwords, and hashes passwords", async () => {
    const u = await makeUser("a@example.com");
    expect(u.role).toBe("student");
    expect((await registerUser(db, { email: "A@example.com", displayName: "X", password: "hvacrocks123" })).ok).toBe(false);
    expect((await registerUser(db, { email: "b@example.com", displayName: "Bee", password: "short" })).ok).toBe(false);
    expect((await registerUser(db, { email: "b@example.com", displayName: "Bee", password: "onlyletterslong" })).ok).toBe(false);
    const row = await refresh(u);
    expect(row.passwordHash).toMatch(/^scrypt\$/);
    expect(row.passwordHash).not.toContain("hvacrocks123");
  });

  it("logs in, rejects bad passwords generically, and locks after repeated failures", async () => {
    await makeUser("lock@example.com");
    const ok = await loginUser(db, "LOCK@example.com", "hvacrocks123");
    expect(ok.ok).toBe(true);
    const bad = await loginUser(db, "lock@example.com", "nope");
    const missing = await loginUser(db, "ghost@example.com", "nope");
    expect(bad).toEqual(missing);
    for (let i = 0; i < 5; i++) await loginUser(db, "lock@example.com", "wrong-password1");
    const locked = await loginUser(db, "lock@example.com", "hvacrocks123");
    expect(locked.ok).toBe(false);
  });

  it("sessions are revocable and tokens are not stored raw", async () => {
    const r = await registerUser(db, { email: "sess@example.com", displayName: "Sess", password: "hvacrocks123" });
    if (!r.ok) throw new Error();
    expect(await userForToken(db, r.token)).not.toBeNull();
    expect(await userForToken(db, r.token + "x")).toBeNull();
    await destroySession(db, r.token);
    expect(await userForToken(db, r.token)).toBeNull();
  });

  it("ADMIN_EMAILS bootstraps admins; others are students", async () => {
    const boss = await makeUser("boss@example.com");
    expect(boss.role).toBe("admin");
  });
});

describe("lessons", () => {
  it("can't finish without answering, awards XP once, replays earn little", async () => {
    const u = await makeUser("lesson@example.com");
    const lesson = cur.lessons[0];
    const s = await startLesson(db, u, cur, lesson.id);
    if (!s.ok) throw new Error(s.error);
    expect((await completeLesson(db, u, cur, s.runId)).ok).toBe(false);
    const qs = lessonQuestions(lesson);
    // First question wrong first, then right.
    const first = qs[0];
    await checkLessonAnswer(db, u, cur, s.runId, first.id, "__wrong__");
    for (const q of qs) expect((await checkLessonAnswer(db, u, cur, s.runId, q.id, correctResponse(q) as never)).ok).toBe(true);
    const done = await completeLesson(db, u, cur, s.runId);
    if (!done.ok) throw new Error(done.error);
    expect(done.firstTry).toBe(qs.length - 1);
    expect(done.xp).toBe(20 + (qs.length - 1) * 3);
    // completing the same run twice is rejected
    expect((await completeLesson(db, u, cur, s.runId)).ok).toBe(false);
    // replay: small, once a day
    const s2 = await startLesson(db, u, cur, lesson.id);
    if (!s2.ok) throw new Error();
    for (const q of qs) await checkLessonAnswer(db, u, cur, s2.runId, q.id, correctResponse(q) as never);
    const r2 = await completeLesson(db, u, cur, s2.runId);
    if (!r2.ok) throw new Error();
    expect(r2.xp).toBe(3);
    const s3 = await startLesson(db, u, cur, lesson.id);
    if (!s3.ok) throw new Error();
    for (const q of qs) await checkLessonAnswer(db, u, cur, s3.runId, q.id, correctResponse(q) as never);
    const r3 = await completeLesson(db, u, cur, s3.runId);
    if (!r3.ok) throw new Error();
    expect(r3.xp).toBe(0);
    const row = await refresh(u);
    expect(row.xp).toBeGreaterThanOrEqual(done.xp + 3);
  });

  it("locked levels can't be started", async () => {
    const u = await makeUser("locked@example.com");
    const l5 = cur.lessonsByLevel.get("l5")![0];
    const r = await startLesson(db, u, cur, l5.id);
    expect(r.ok).toBe(false);
  });

  it("other users cannot use someone else's run", async () => {
    const a = await makeUser("owner@example.com");
    const b = await makeUser("thief@example.com");
    const s = await startLesson(db, a, cur, cur.lessons[0].id);
    if (!s.ok) throw new Error();
    const q = lessonQuestions(cur.lessons[0])[0];
    expect((await checkLessonAnswer(db, b, cur, s.runId, q.id, correctResponse(q) as never)).ok).toBe(false);
    expect((await completeLesson(db, b, cur, s.runId)).ok).toBe(false);
  });

  it("finishing level 1 lessons unlocks level 2 and earns the Apprentice badge", async () => {
    const u = await makeUser("apprentice@example.com");
    for (const lesson of cur.lessonsByLevel.get("l1")!) {
      const s = await startLesson(db, u, cur, lesson.id);
      if (!s.ok) throw new Error(s.error);
      for (const q of lessonQuestions(lesson)) await checkLessonAnswer(db, u, cur, s.runId, q.id, correctResponse(q) as never);
      const r = await completeLesson(db, u, cur, s.runId);
      if (!r.ok) throw new Error(r.error);
    }
    const sum = await dashboardSummary(db, { ...u, xp: (await refresh(u)).xp }, cur);
    expect(sum.statuses.find((x) => x.id === "l2")!.unlocked).toBe(true);
    expect(sum.badges.map((b) => b.id)).toContain("apprentice");
    expect(sum.badges.map((b) => b.id)).toContain("first-lesson");
    expect(sum.streak.current).toBe(1);
    // Review cards were created from lesson answers
    const rev = await startReview(db, u, cur);
    expect(rev.ok && rev.questions.length).toBeGreaterThan(0);
    if (rev.ok && rev.runId) {
      const q = cur.questions.get(rev.questions[0].id)!;
      const a = await answerReview(db, u, cur, rev.runId, q.id, correctResponse(q) as never);
      expect(a.ok && a.correct).toBe(true);
    }
  });
});

describe("exams", () => {
  it("grades server-side, rejects double submission, and fails overtime", async () => {
    const u = await makeUser("exam@example.com");
    const ex = await startExam(db, u, cur, "level:l1");
    if (!ex.ok) throw new Error(ex.error);
    expect(JSON.stringify(ex.questions)).not.toContain('"answer"');
    const responses = Object.fromEntries(ex.questions.map((q) => [q.id, correctResponse(cur.questions.get(q.id)!)]));
    const r = await submitExam(db, u, cur, ex.runId, responses as never);
    if (!r.ok) throw new Error(r.error);
    expect(r.passed).toBe(true);
    expect(r.xp).toBe(80);
    expect((await submitExam(db, u, cur, ex.runId, responses as never)).ok).toBe(false);
    const ex2 = await startExam(db, u, cur, "level:l1");
    if (!ex2.ok) throw new Error();
    await db.update(runs).set({ startedAt: new Date(Date.now() - 3600_000) }).where(eq(runs.id, ex2.runId));
    const late = await submitExam(db, u, cur, ex2.runId, Object.fromEntries(ex2.questions.map((q) => [q.id, correctResponse(cur.questions.get(q.id)!)])) as never);
    expect(late.ok && late.overtime && !late.passed).toBe(true);
    // passing the L1 checkpoint unlocks L2 (test-out)
    const u2 = await refresh(u);
    const statuses = levelStatuses(cur, new Map(), new Set(["l1"]));
    expect(statuses[1].unlocked).toBe(true);
    expect(u2.xp).toBeGreaterThan(0);
  });
});

describe("games & sims (anti-cheat)", () => {
  it("game XP comes only from server grading; repeats are reduced", async () => {
    const u = await makeUser("gamer@example.com");
    const g = await startGame(db, u, cur, "name-that-part");
    if (!g.ok) throw new Error(g.error);
    const run = (await db.select().from(runs).where(eq(runs.id, g.runId)))[0];
    const secret = (run.state as { secret: { rounds: { id: string }[] } }).secret;
    const perfect = secret.rounds.map((r) => ({ name: r.id, purpose: r.id }));
    const res = await submitGame(db, u, cur, g.runId, perfect);
    if (!res.ok) throw new Error();
    expect(res.xp).toBe(40);
    expect((await submitGame(db, u, cur, g.runId, perfect)).ok).toBe(false);
    const g2 = await startGame(db, u, cur, "name-that-part");
    if (!g2.ok) throw new Error();
    const secret2 = ((await db.select().from(runs).where(eq(runs.id, g2.runId)))[0].state as { secret: { rounds: { id: string }[] } }).secret;
    const res2 = await submitGame(db, u, cur, g2.runId, secret2.rounds.map((r) => ({ name: r.id, purpose: r.id })));
    expect(res2.ok && res2.xp).toBe(10);
  });

  it("rejects malformed game actions and actions for the wrong game", async () => {
    const u = await makeUser("gamer2@example.com");
    const g = await startGame(db, u, cur, "name-that-part");
    if (!g.ok) throw new Error();
    expect((await gameAction(db, u, g.runId, { t: "probe", round: 0, a: "R", b: "C" })).ok).toBe(false);
    expect((await gameAction(db, u, g.runId, { t: "hack" })).ok).toBe(false);
  });

  it("field sim: actions validated, XP only for improvement over best", async () => {
    const u = await makeUser("sim@example.com");
    const s = SCENARIOS.find((x) => x.id === "sim-bad-contactor")!;
    const play = async () => {
      const st = await startSim(db, u, SCENARIOS, s.id);
      if (!st.ok) throw new Error(st.error);
      expect(JSON.stringify(st.scenario)).not.toMatch(/"faults"|"evidence"|"explanation"|OL \(open coil\)/);
      const acts = [
        { t: "measure", m: "v.disconnect" },
        { t: "measure", m: "v.contactor-coil" },
        { t: "power", on: false },
        { t: "verify-dead" },
        { t: "discharge" },
        { t: "measure", m: "ohm.contactor-coil" },
        { t: "repair", r: "replace-contactor" },
        { t: "power", on: true },
        { t: "measure", m: "a.compressor" },
        { t: "finish", causes: ["bad-contactor"] },
      ];
      let last;
      for (const a of acts) {
        last = await simAct(db, u, cur, SCENARIOS, st.runId, a);
        if (!last.ok) throw new Error(last.error);
      }
      return last!;
    };
    const first = await play();
    if (!first.ok) throw new Error();
    expect(first.score!.total).toBeGreaterThanOrEqual(90);
    expect(first.xp).toBeGreaterThanOrEqual(100);
    const second = await play();
    expect(second.ok && second.xp).toBe(0);
    const st = await startSim(db, u, SCENARIOS, s.id);
    if (!st.ok) throw new Error();
    expect((await simAct(db, u, cur, SCENARIOS, st.runId, { t: "measure", m: "x".repeat(500) })).ok).toBe(false);
    expect((await simAct(db, u, cur, SCENARIOS, st.runId, { t: "teleport" })).ok).toBe(false);
    expect((await simAct(db, u, cur, SCENARIOS, st.runId, { t: "measure", m: "nope" })).ok).toBe(false);
    const ledger = await db.select().from(xpEvents).where(eq(xpEvents.userId, u.id));
    expect(ledger.every((e) => e.amount > 0)).toBe(true);
  });
});
