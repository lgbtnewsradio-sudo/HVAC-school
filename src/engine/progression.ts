/**
 * Pure progression rules: XP values, rank levels, streaks, spaced repetition and
 * mastery. Kept free of I/O so they are easy to unit-test and reason about.
 */

export const XP = {
  lessonFirstComplete: 20,
  lessonPerFirstTryCorrect: 3,
  lessonPerfectBonus: 10,
  lessonReplay: 3,
  reviewCorrect: 2,
  dailyChallenge: 40,
  weeklyChallenge: 150,
  /** Most XP a single game run can award. Scaled by score fraction. */
  gameMax: 40,
  /** Repeat plays of the same game the same day earn a reduced share. */
  gameRepeatFactor: 0.25,
  simMax: 120,
  examPass: 80,
} as const;

/** Total XP needed to reach rank level n (level 1 = 0 XP). Gentle quadratic curve. */
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.round(50 * (n - 1) * (n + 2));
}

export function levelFromXp(xp: number): { level: number; current: number; next: number; progress: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  const current = xpForLevel(level);
  const next = xpForLevel(level + 1);
  return { level, current, next, progress: (xp - current) / (next - current) };
}

const RANKS: [number, string][] = [
  [1, "Trainee"],
  [3, "Helper"],
  [6, "Apprentice"],
  [10, "Junior Tech"],
  [15, "Service Tech"],
  [21, "Senior Tech"],
  [28, "Lead Tech"],
  [36, "HVAC Master"],
];
export function rankTitle(level: number): string {
  let title = RANKS[0][1];
  for (const [min, name] of RANKS) if (level >= min) title = name;
  return title;
}

/** Local calendar day (YYYY-MM-DD) for a timezone. Falls back to UTC on invalid tz. */
export function localDay(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function addDays(day: string, n: number): string {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Current streak given the set of days with activity. A streak survives until the
 * end of "today": if today has no activity yet, yesterday's run still counts.
 */
export function computeStreak(activeDays: Iterable<string>, today: string): { current: number; best: number; activeToday: boolean } {
  const set = new Set(activeDays);
  const activeToday = set.has(today);
  let cursor = activeToday ? today : addDays(today, -1);
  let current = 0;
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...set].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of sorted) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current), activeToday };
}

/** ISO week key, e.g. 2026-W44, used for weekly challenges and boards. */
export function isoWeek(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Monday (YYYY-MM-DD) of the week containing `day`. */
export function weekStart(day: string): string {
  const d = new Date(day + "T00:00:00Z");
  return addDays(day, -((d.getUTCDay() + 6) % 7));
}

// ---------- Spaced repetition (Leitner boxes) ----------

/** Days until next review for each box. Box 0 = learning (review again soon). */
export const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35];

export function nextCard(prev: { box: number; lapses: number } | null, correct: boolean, now: Date) {
  const box = correct ? Math.min((prev?.box ?? 0) + 1, BOX_INTERVAL_DAYS.length - 1) : 0;
  const lapses = (prev?.lapses ?? 0) + (correct ? 0 : 1);
  // Missed cards come back in ~10 minutes; otherwise after the box interval.
  const dueAt = new Date(now.getTime() + (correct ? BOX_INTERVAL_DAYS[box] * 86400000 : 10 * 60000));
  return { box, lapses, dueAt };
}

// ---------- Mastery ----------

/**
 * Mastery for a skill from chronological answer outcomes: an exponentially
 * weighted accuracy (recent answers matter more) scaled by evidence volume, so
 * one lucky answer can't show 100%.
 */
export function masteryFromAnswers(outcomes: boolean[], fullConfidenceAt = 12): number {
  if (outcomes.length === 0) return 0;
  let weighted = 0;
  let total = 0;
  const alpha = 0.85;
  outcomes.forEach((ok, i) => {
    const w = Math.pow(alpha, outcomes.length - 1 - i);
    weighted += (ok ? 1 : 0) * w;
    total += w;
  });
  const accuracy = weighted / total;
  const confidence = Math.min(1, outcomes.length / fullConfidenceAt);
  return Math.round(accuracy * confidence * 100);
}

/** Lesson XP from first-try correctness. Replays (after the first) earn a small fixed amount. */
export function lessonXp(opts: { firstCompletion: boolean; questions: number; firstTryCorrect: number; replayAwardedToday: boolean }) {
  if (!opts.firstCompletion) return opts.replayAwardedToday ? 0 : XP.lessonReplay;
  const perfect = opts.questions > 0 && opts.firstTryCorrect === opts.questions;
  return XP.lessonFirstComplete + opts.firstTryCorrect * XP.lessonPerFirstTryCorrect + (perfect ? XP.lessonPerfectBonus : 0);
}

/** Game XP: proportional to score; reduced for repeat plays the same day; zero below 40%. */
export function gameXp(scoreFraction: number, playsToday: number, max: number = XP.gameMax): number {
  const f = Math.max(0, Math.min(1, scoreFraction));
  if (f < 0.4) return 0;
  const base = Math.round(max * f);
  return playsToday > 0 ? Math.round(base * XP.gameRepeatFactor) : base;
}
