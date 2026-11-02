import { hashString } from "./grading";

/** Daily challenge rotates deterministically by local date so everyone gets the same one. */
const DAILY_POOL: { kind: "sim" | "game"; id: string; title: string }[] = [
  { kind: "sim", id: "sim-dirty-filter", title: "Field call: running all day, won't cool" },
  { kind: "game", id: "pressure-detective", title: "Pressure Detective: score 70%+" },
  { kind: "sim", id: "sim-bad-capacitor", title: "Field call: outdoor unit hums" },
  { kind: "game", id: "wire-it-right", title: "Wire It Right: score 70%+" },
  { kind: "sim", id: "sim-clogged-drain", title: "Field call: stain on the ceiling" },
  { kind: "game", id: "name-that-part", title: "Name That Part: score 70%+" },
  { kind: "sim", id: "sim-bad-contactor", title: "Field call: silent outdoor unit" },
  { kind: "game", id: "electrical-detective", title: "Electrical Detective: score 70%+" },
  { kind: "sim", id: "sim-flame-sensor", title: "Field call: lights, then shuts off" },
  { kind: "game", id: "find-the-fault", title: "Find the Fault: score 70%+" },
  { kind: "sim", id: "sim-refrigerant-leak", title: "Field call: weak cooling" },
  { kind: "game", id: "speed-round", title: "Speed Round: 10+ correct" },
  { kind: "sim", id: "sim-tstat-batteries", title: "Field call: nothing turns on" },
  { kind: "game", id: "mystery-call", title: "Mystery Service Call: solve it safely" },
];

export function dailyChallenge(day: string) {
  return { day, ...DAILY_POOL[hashString(`daily:${day}`) % DAILY_POOL.length] };
}

export type WeeklyMetric = "simsPassed" | "xp" | "lessons" | "gamesPassed";
const WEEKLY_POOL: { id: string; title: string; metric: WeeklyMetric; target: number }[] = [
  { id: "w-sims", title: "Pass 3 field calls with a B or better", metric: "simsPassed", target: 3 },
  { id: "w-xp", title: "Earn 500 XP this week", metric: "xp", target: 500 },
  { id: "w-lessons", title: "Complete 5 lessons", metric: "lessons", target: 5 },
  { id: "w-games", title: "Score 70%+ in 4 different games", metric: "gamesPassed", target: 4 },
];

export function weeklyChallenge(week: string) {
  return { week, ...WEEKLY_POOL[hashString(`weekly:${week}`) % WEEKLY_POOL.length] };
}

/** Passing threshold for a run to count toward challenges. */
export function runCountsForChallenge(kind: "sim" | "game", gameId: string, score: number, max: number) {
  if (max <= 0) return false;
  if (kind === "game" && gameId === "speed-round") return score >= 10;
  return score / max >= (kind === "sim" ? 0.7 : 0.7);
}
