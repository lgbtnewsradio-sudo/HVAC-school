import { describe, expect, it } from "vitest";
import { GAMES, gameById } from "@/engine/games";
import { WIRING, gradeWiring, CIRCUITS, potentials, detectiveReading } from "@/engine/games/electrical-games";
import { buildCrossword } from "@/engine/games/misc-games";
import { advanceMystery } from "@/engine/games/misc-games";
import { runFaultTest } from "@/engine/games/diag-games";

const ctx = (seed: number) => ({ seed, unlockedLevels: ["l1", "l2", "l3"] });

describe("games", () => {
  it("has all 12 games A–L", () => {
    expect(GAMES.map((g) => g.letter).sort().join("")).toBe("ABCDEFGHIJKL");
  });

  for (const g of GAMES) {
    it(`${g.letter} ${g.title}: start is deterministic, secret is not in the puzzle, garbage submissions score 0`, () => {
      const a = g.start(ctx(42));
      const b = g.start(ctx(42));
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      const pub = JSON.stringify(a.puzzle);
      expect(pub).not.toMatch(/"answer"|"secret"|"open"|"fault"|"mistake"/);
      for (const junk of [null, 5, "x", [], {}, { rounds: "x" }]) {
        const r = g.grade(structuredClone(a.secret), junk, 1000);
        expect(r.score, `${g.id} ${JSON.stringify(junk)}`).toBe(0);
        expect(r.max).toBeGreaterThan(0);
      }
    });
  }

  it("A: perfect answers score max", () => {
    const g = gameById("name-that-part")!;
    const { secret } = g.start(ctx(7));
    const sub = secret.rounds.map((r: { id: string }) => ({ name: r.id, purpose: r.id }));
    const res = g.grade(secret, sub, 0);
    expect(res.score).toBe(res.max);
  });

  it("C: wiring grader detects completeness and shorts", () => {
    for (const p of WIRING) {
      const perfect = p.nets.flatMap((n) => n.terminals.slice(1).map((t) => [n.terminals[0], t] as [string, string]));
      expect(gradeWiring(p, perfect).every((f) => f.correct)).toBe(true);
      const shorted: [string, string][] = [...perfect, [p.nets[0].terminals[0], p.nets[1].terminals[0]]];
      const fb = gradeWiring(p, shorted);
      expect(fb[0].correct).toBe(false);
      expect(fb[1].correct).toBe(false);
    }
  });

  it("J: voltage appears across the open switch only", () => {
    for (const c of CIRCUITS) {
      for (const e of c.elements.filter((x) => x.kind === "switch")) {
        const v = potentials(c, e.id);
        expect(Math.abs(v[e.from] - v[e.to])).toBe(c.supply);
        for (const o of c.elements.filter((x) => x.id !== e.id)) expect(Math.abs(v[o.from] - v[o.to])).toBe(0);
      }
      const ok = potentials(c, null);
      const load = c.elements.find((x) => x.kind === "load")!;
      expect(Math.abs(ok[load.from] - ok[load.to])).toBe(c.supply);
    }
    const g = gameById("electrical-detective")!;
    const { secret } = g.start(ctx(3));
    const guess = g.grade(structuredClone(secret), { rounds: secret.rounds.map((r: { open: string }) => ({ answer: r.open })) }, 0);
    expect(guess.score).toBe(0); // no probes = guessing
    detectiveReading(secret, 0, "R", "C");
    const res = g.grade(secret, { rounds: secret.rounds.map((r: { open: string }) => ({ answer: r.open })) }, 0);
    expect(res.score).toBe(3);
  });

  it("D: limits tests to 3 per round", () => {
    const g = gameById("find-the-fault")!;
    const { puzzle, secret } = g.start(ctx(9));
    const comps = puzzle.rounds[0].components;
    for (const c of comps.slice(0, 3)) expect(runFaultTest(secret, 0, c.id)).toBeTruthy();
    expect(runFaultTest(secret, 0, comps[3].id)).toBeNull();
  });

  it("F: crossword places intersecting words without conflicts", () => {
    for (let seed = 1; seed < 30; seed++) {
      const words = buildCrossword(seed);
      expect(words.length).toBeGreaterThanOrEqual(6);
      const grid = new Map<string, string>();
      for (const w of words)
        for (let i = 0; i < w.word.length; i++) {
          const k = `${w.row + (w.dir === "down" ? i : 0)},${w.col + (w.dir === "across" ? i : 0)}`;
          if (grid.has(k)) expect(grid.get(k)).toBe(w.word[i]);
          grid.set(k, w.word[i]);
          expect(Number(k.split(",")[0])).toBeLessThan(15);
          expect(Number(k.split(",")[1])).toBeLessThan(15);
        }
    }
  });

  it("K: late submissions earn nothing", () => {
    const g = gameById("speed-round")!;
    const { secret } = g.start(ctx(5));
    expect(secret.ids.length).toBeGreaterThan(10);
    const res = g.grade(secret, secret.ids.map((id: string) => ({ id, response: "a" })), 120_000);
    expect(res.score).toBe(0);
  });

  it("L: safe evidence path to the right ending scores well; unsafe path is penalized", () => {
    const g = gameById("mystery-call")!;
    const { secret } = g.start(ctx(0));
    advanceMystery(secret, 2); // indoor
    advanceMystery(secret, 1); // static
    advanceMystery(secret, 0); // filter
    advanceMystery(secret, 0); // end
    expect(g.grade(secret, { ending: "a" }, 0).score).toBeGreaterThanOrEqual(8);
    const s2 = g.start(ctx(0)).secret;
    advanceMystery(s2, 1);
    advanceMystery(s2, 0);
    advanceMystery(s2, 0);
    advanceMystery(s2, 0);
    expect(g.grade(s2, { ending: "a" }, 0).score).toBeLessThan(8);
  });
});
