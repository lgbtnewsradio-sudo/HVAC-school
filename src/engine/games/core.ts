import type { Skill } from "@/content/types";

export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = <T,>(r: () => number, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
export function shuffle<T>(r: () => number, arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export const sample = <T,>(r: () => number, arr: readonly T[], n: number) => shuffle(r, arr).slice(0, n);
export const between = (r: () => number, lo: number, hi: number, dp = 0) => {
  const f = 10 ** dp;
  return Math.round((lo + r() * (hi - lo)) * f) / f;
};

export type GameResult = {
  score: number;
  max: number;
  /** Per-round feedback shown after grading. */
  feedback: { title: string; correct: boolean; detail: string }[];
  summary?: string;
};

export type StartCtx = { seed: number; unlockedLevels: string[] };

export type GameDef<Pub = unknown, Secret = unknown, Sub = unknown> = {
  id: string;
  letter: string;
  title: string;
  tagline: string;
  description: string;
  skills: Skill[];
  icon: string;
  pro: boolean;
  /** Time limit in seconds (enforced server-side) when present. */
  timeLimit?: number;
  start(ctx: StartCtx): { puzzle: Pub; secret: Secret };
  grade(secret: Secret, submission: Sub, elapsedMs: number): GameResult;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = GameDef<any, any, any>;

export const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
export const asArray = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
