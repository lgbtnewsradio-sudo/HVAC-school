import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { DB } from "./db";
import { runs, xpEvents } from "./db/schema";
import { newId } from "./crypto";
import type { SessionUser } from "./auth-core";
import type { Curriculum } from "@/content";
import { gameById } from "@/engine/games";
import { detectiveReading, type DetectiveSecret } from "@/engine/games/electrical-games";
import { runFaultTest } from "@/engine/games/diag-games";
import { advanceMystery } from "@/engine/games/misc-games";
import { hashString } from "@/engine/grading";
import { gameXp, XP } from "@/engine/progression";
import { publicScenario, publicState, replay, scoreRun, SimError } from "@/engine/sim/engine";
import type { Scenario, SimAction } from "@/engine/sim/types";
import { awardXp, canAccessPro, checkChallenges, evaluateBadges, recordAnswer, runsTodayCount, unlockedLevelIds } from "./progress";
import type { Fail } from "./learning";

const fail = (error: string, code?: Fail["code"]): Fail => ({ ok: false, error, code });

async function loadRun(db: DB, userId: string, runId: string, kind: string) {
  const [r] = await db.select().from(runs).where(and(eq(runs.id, String(runId)), eq(runs.userId, userId), eq(runs.kind, kind)));
  return r ?? null;
}

// ---------------- Games ----------------

export async function startGame(db: DB, user: SessionUser, cur: Curriculum, gameId: string) {
  const game = gameById(String(gameId));
  if (!game) return fail("Game not found", "notfound");
  if (game.pro && !canAccessPro(user)) return fail(`${game.title} is part of HVAC Academy Pro.`, "pro");
  const seed = hashString(newId());
  const { puzzle, secret } = game.start({ seed, unlockedLevels: await unlockedLevelIds(db, user.id, cur) });
  const id = newId("r_");
  await db.insert(runs).values({ id, userId: user.id, kind: "game", refId: game.id, state: { secret: secret as Record<string, unknown> } });
  return { ok: true as const, runId: id, gameId: game.id, puzzle, timeLimit: game.timeLimit ?? null };
}

const gameActionSchema = z.discriminatedUnion("t", [
  z.object({ t: z.literal("probe"), round: z.number().int().min(0).max(20), a: z.string().max(20), b: z.string().max(20) }),
  z.object({ t: z.literal("test"), round: z.number().int().min(0).max(20), component: z.string().max(40) }),
  z.object({ t: z.literal("choose"), index: z.number().int().min(0).max(10) }),
]);

/** Interactive steps inside a game whose answers must stay on the server. */
export async function gameAction(db: DB, user: SessionUser, runId: string, raw: unknown) {
  const run = await loadRun(db, user.id, runId, "game");
  if (!run || run.finishedAt) return fail("Game session ended.", "invalid");
  const parsed = gameActionSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid action", "invalid");
  const a = parsed.data;
  const state = run.state as { secret: Record<string, unknown> };
  let result: unknown = null;
  if (a.t === "probe" && run.refId === "electrical-detective") result = detectiveReading(state.secret as unknown as DetectiveSecret, a.round, a.a, a.b);
  else if (a.t === "test" && run.refId === "find-the-fault") result = runFaultTest(state.secret as never, a.round, a.component);
  else if (a.t === "choose" && run.refId === "mystery-call") result = advanceMystery(state.secret as never, a.index);
  else return fail("Action not supported for this game", "invalid");
  if (result === null) return fail("That action isn't available.", "invalid");
  await db.update(runs).set({ state }).where(eq(runs.id, run.id));
  return { ok: true as const, result };
}

export async function submitGame(db: DB, user: SessionUser, cur: Curriculum, runId: string, submission: unknown) {
  const run = await loadRun(db, user.id, runId, "game");
  if (!run) return fail("Game session not found", "notfound");
  if (run.finishedAt) return fail("Already submitted", "invalid");
  const game = gameById(run.refId)!;
  const elapsed = Date.now() - run.startedAt.getTime();
  const state = run.state as { secret: unknown };
  const result = game.grade(structuredClone(state.secret), submission, elapsed);
  const playsToday = await runsTodayCount(db, user, "game", game.id);
  const claimed = await db
    .update(runs)
    .set({ finishedAt: new Date(), score: result.score, maxScore: result.max, result: result as unknown as Record<string, unknown> })
    .where(and(eq(runs.id, run.id), isNull(runs.finishedAt)))
    .returning({ id: runs.id });
  if (!claimed.length) return fail("Already submitted", "invalid");
  const frac = result.max ? result.score / result.max : 0;
  const xp = await awardXp(db, user, gameXp(frac, playsToday), "game", game.id);
  await db.update(runs).set({ xpAwarded: xp }).where(eq(runs.id, run.id));
  await recordAnswer(db, user.id, `game:${game.id}`, frac >= 0.7, "game", game.skills);
  const badges = await evaluateBadges(db, user, cur);
  const challenges = await checkChallenges(db, user, { kind: "game", id: game.id, score: result.score, max: result.max });
  return { ok: true as const, ...result, xp, repeatPlay: playsToday > 0, badges, challenges };
}

// ---------------- Field simulator ----------------

const simActionSchema: z.ZodType<SimAction> = z.discriminatedUnion("t", [
  z.object({ t: z.literal("ask"), q: z.string().max(40) }),
  z.object({ t: z.literal("inspect"), loc: z.enum(["thermostat", "indoor", "filter", "outdoor", "panel", "vents", "drain", "attic"]) }),
  z.object({ t: z.literal("measure"), m: z.string().max(40) }),
  z.object({ t: z.literal("power"), on: z.boolean() }),
  z.object({ t: z.literal("verify-dead") }),
  z.object({ t: z.literal("discharge") }),
  z.object({ t: z.literal("hint") }),
  z.object({ t: z.literal("repair"), r: z.string().max(40) }),
  z.object({ t: z.literal("finish"), causes: z.array(z.string().max(40)).min(1).max(6) }),
]) as z.ZodType<SimAction>;

export function scenarioAccess(user: SessionUser, s: Scenario): Fail | null {
  if (s.pro && !canAccessPro(user)) return fail("This field call is part of HVAC Academy Pro.", "pro");
  return null;
}

export async function startSim(db: DB, user: SessionUser, scenarios: Scenario[], scenarioId: string) {
  const s = scenarios.find((x) => x.id === String(scenarioId));
  if (!s) return fail("Scenario not found", "notfound");
  const denied = scenarioAccess(user, s);
  if (denied) return denied;
  const id = newId("r_");
  await db.insert(runs).values({ id, userId: user.id, kind: "sim", refId: s.id, state: { actions: [], mode: user.mode } });
  return { ok: true as const, runId: id, scenario: publicScenario(s), state: publicState(replay(s, [], user.mode)), mode: user.mode };
}

export async function getSimRun(db: DB, user: SessionUser, scenarios: Scenario[], runId: string) {
  const run = await loadRun(db, user.id, runId, "sim");
  if (!run) return fail("Run not found", "notfound");
  const s = scenarios.find((x) => x.id === run.refId);
  if (!s) return fail("Scenario not found", "notfound");
  const { actions, mode } = run.state as { actions: SimAction[]; mode: "beginner" | "advanced" };
  const st = replay(s, actions, mode);
  return { ok: true as const, runId: run.id, scenario: publicScenario(s), state: publicState(st), mode, score: st.finished ? scoreRun(s, st) : null, xp: run.xpAwarded };
}

export async function simAct(db: DB, user: SessionUser, cur: Curriculum, scenarios: Scenario[], runId: string, raw: unknown) {
  const run = await loadRun(db, user.id, runId, "sim");
  if (!run || run.finishedAt) return fail("This service call is closed.", "invalid");
  const s = scenarios.find((x) => x.id === run.refId);
  if (!s) return fail("Scenario not found", "notfound");
  const parsed = simActionSchema.safeParse(raw);
  if (!parsed.success) return fail("Invalid action", "invalid");
  const { actions, mode } = run.state as { actions: SimAction[]; mode: "beginner" | "advanced" };
  if (actions.length >= 250) return fail("Too many actions on this call.", "invalid");
  const next = [...actions, parsed.data];
  let st;
  try {
    st = replay(s, next, mode);
  } catch (e) {
    if (e instanceof SimError) return fail(e.message, "invalid");
    throw e;
  }
  if (!st.finished) {
    await db.update(runs).set({ state: { actions: next, mode } }).where(and(eq(runs.id, run.id), isNull(runs.finishedAt)));
    return { ok: true as const, state: publicState(st), score: null, xp: 0, badges: [], challenges: [] };
  }
  const score = scoreRun(s, st);
  const claimed = await db
    .update(runs)
    .set({ state: { actions: next, mode }, finishedAt: new Date(), score: score.total, maxScore: 100, result: { ...score, grade: score.grade } as unknown as Record<string, unknown> })
    .where(and(eq(runs.id, run.id), isNull(runs.finishedAt)))
    .returning({ id: runs.id });
  if (!claimed.length) return fail("This service call is closed.", "invalid");

  // XP: proportional to score; Advanced mode earns a bonus. Replays only earn the improvement over your best.
  const potential = score.total < 40 ? 0 : Math.round(XP.simMax * (score.total / 100) * (mode === "advanced" ? 1.25 : 1));
  const [{ prior }] = await db
    .select({ prior: sql<number>`coalesce(sum(${xpEvents.amount}),0)::int` })
    .from(xpEvents)
    .where(and(eq(xpEvents.userId, user.id), eq(xpEvents.source, "sim"), eq(xpEvents.ref, s.id)));
  const playsToday = await runsTodayCount(db, user, "sim", s.id);
  let amount = Math.max(0, potential - prior);
  if (amount === 0 && score.passed && playsToday <= 1) amount = Math.round(potential * 0.1);
  const xp = await awardXp(db, user, amount, "sim", s.id);
  await db.update(runs).set({ xpAwarded: xp }).where(eq(runs.id, run.id));
  await recordAnswer(db, user.id, `sim:${s.id}`, score.passed, "sim", ["troubleshooting", ...(s.profile === "cooling" ? ["refrigeration"] : ["heating"])]);
  await recordAnswer(db, user.id, `sim-safety:${s.id}`, score.safetyNotes.length === 0, "sim", ["safety"]);
  const badges = await evaluateBadges(db, user, cur);
  const challenges = await checkChallenges(db, user, { kind: "sim", id: s.id, score: score.total, max: 100 });
  return { ok: true as const, state: publicState(st), score, xp, badges, challenges };
}
