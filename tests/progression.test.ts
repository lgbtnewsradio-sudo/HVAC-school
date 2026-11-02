import { describe, expect, it } from "vitest";
import { computeStreak, gameXp, isoWeek, lessonXp, levelFromXp, localDay, masteryFromAnswers, nextCard, xpForLevel } from "@/engine/progression";

describe("progression", () => {
  it("levels are monotonic", () => {
    for (let n = 1; n < 50; n++) expect(xpForLevel(n + 1)).toBeGreaterThan(xpForLevel(n));
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(xpForLevel(5)).level).toBe(5);
    expect(levelFromXp(xpForLevel(5) - 1).level).toBe(4);
  });

  it("streaks", () => {
    expect(computeStreak(["2026-10-30", "2026-10-31", "2026-11-01"], "2026-11-01").current).toBe(3);
    expect(computeStreak(["2026-10-30", "2026-10-31"], "2026-11-01")).toMatchObject({ current: 2, activeToday: false });
    expect(computeStreak(["2026-10-29"], "2026-11-01").current).toBe(0);
    expect(computeStreak(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-20"], "2026-11-01").best).toBe(3);
  });

  it("local day respects timezone", () => {
    const d = new Date("2026-11-01T03:00:00Z");
    expect(localDay(d, "America/Los_Angeles")).toBe("2026-10-31");
    expect(localDay(d, "UTC")).toBe("2026-11-01");
    expect(localDay(d, "Not/AZone")).toBe("2026-11-01");
    expect(isoWeek("2026-11-01")).toBe("2026-W44");
  });

  it("spaced repetition", () => {
    const now = new Date();
    const c1 = nextCard(null, true, now);
    expect(c1.box).toBe(1);
    const c2 = nextCard(c1, false, now);
    expect(c2).toMatchObject({ box: 0, lapses: 1 });
    expect(c2.dueAt.getTime() - now.getTime()).toBeLessThan(3600_000);
  });

  it("mastery needs evidence", () => {
    expect(masteryFromAnswers([true])).toBeLessThan(20);
    expect(masteryFromAnswers(Array(12).fill(true))).toBe(100);
    expect(masteryFromAnswers([...Array(10).fill(true), false, false])).toBeLessThan(100);
  });

  it("xp rules reward correctness, not grinding", () => {
    expect(lessonXp({ firstCompletion: true, questions: 3, firstTryCorrect: 3, replayAwardedToday: false })).toBe(20 + 9 + 10);
    expect(lessonXp({ firstCompletion: false, questions: 3, firstTryCorrect: 3, replayAwardedToday: true })).toBe(0);
    expect(gameXp(0.3, 0)).toBe(0);
    expect(gameXp(1, 0)).toBe(40);
    expect(gameXp(1, 2)).toBe(10);
  });
});
