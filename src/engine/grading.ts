import type { Question } from "@/content/types";

/** What the browser is allowed to see: no answers, no explanations. */
export type PublicQuestion =
  | { id: string; type: "single" | "multi"; prompt: string; visual?: string; hint?: string; options: { id: string; text: string }[]; selectCount?: number }
  | { id: string; type: "truefalse"; prompt: string; visual?: string; hint?: string }
  | { id: string; type: "order"; prompt: string; visual?: string; hint?: string; items: { id: string; text: string }[] }
  | { id: string; type: "match"; prompt: string; visual?: string; hint?: string; left: { id: string; text: string }[]; right: { id: string; text: string }[] }
  | { id: string; type: "numeric"; prompt: string; visual?: string; hint?: string; unit?: string };

export type Response = string | string[] | boolean | number | Record<string, string>;

export type GradeResult = {
  correct: boolean;
  /** 0..1 partial credit (order/match/multi). */
  score: number;
  explanation: string;
  /** Human-readable correct answer. */
  correctAnswer: string;
  /** Per-option feedback for selected/correct options. */
  feedback: { id: string; text: string; correct: boolean }[];
};

/** Deterministic seeded shuffle (mulberry32) so a run can be reproduced server-side. */
export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function toPublicQuestion(q: Question, seed = hashString(q.id)): PublicQuestion {
  const base = { id: q.id, prompt: q.prompt, visual: q.visual, hint: q.hint };
  switch (q.type) {
    case "single":
      return { ...base, type: "single", options: q.options.map((o) => ({ id: o.id, text: o.text })) };
    case "multi":
      return { ...base, type: "multi", options: q.options.map((o) => ({ id: o.id, text: o.text })), selectCount: q.answer.length };
    case "truefalse":
      return { ...base, type: "truefalse" };
    case "order": {
      let shuffled = seededShuffle(q.items, seed);
      // Never present the puzzle already solved.
      if (shuffled.every((it, i) => it.id === q.items[i].id)) shuffled = [...shuffled.slice(1), shuffled[0]];
      return { ...base, type: "order", items: shuffled.map((i) => ({ id: i.id, text: i.text })) };
    }
    case "match":
      return {
        ...base,
        type: "match",
        left: q.pairs.map((p) => ({ id: p.id, text: p.left })),
        right: seededShuffle(q.pairs, seed).map((p) => ({ id: p.id, text: p.right })),
      };
    case "numeric":
      return { ...base, type: "numeric", unit: q.unit };
  }
}

export function gradeQuestion(q: Question, response: Response): GradeResult {
  const explanation = q.explanation;
  switch (q.type) {
    case "single": {
      const picked = typeof response === "string" ? response : "";
      const correct = picked === q.answer;
      const right = q.options.find((o) => o.id === q.answer)!;
      const feedback = q.options
        .filter((o) => o.feedback && (o.id === picked || o.id === q.answer))
        .map((o) => ({ id: o.id, text: o.feedback!, correct: o.id === q.answer }));
      return { correct, score: correct ? 1 : 0, explanation, correctAnswer: right.text, feedback };
    }
    case "multi": {
      const picked = new Set(Array.isArray(response) ? response.map(String) : []);
      const answer = new Set(q.answer);
      let hits = 0;
      let wrong = 0;
      for (const p of picked) (answer.has(p) ? hits++ : wrong++);
      const correct = wrong === 0 && hits === answer.size;
      const score = Math.max(0, (hits - wrong) / answer.size);
      const feedback = q.options
        .filter((o) => o.feedback && (picked.has(o.id) || answer.has(o.id)))
        .map((o) => ({ id: o.id, text: o.feedback!, correct: answer.has(o.id) }));
      return {
        correct,
        score,
        explanation,
        correctAnswer: q.options.filter((o) => answer.has(o.id)).map((o) => o.text).join("; "),
        feedback,
      };
    }
    case "truefalse": {
      const correct = response === q.answer;
      return { correct, score: correct ? 1 : 0, explanation, correctAnswer: q.answer ? "True" : "False", feedback: [] };
    }
    case "order": {
      const seq = Array.isArray(response) ? response.map(String) : [];
      const target = q.items.map((i) => i.id);
      const valid = seq.length === target.length && new Set(seq).size === seq.length && seq.every((id) => target.includes(id));
      const inPlace = valid ? seq.filter((id, i) => target[i] === id).length : 0;
      const correct = valid && inPlace === target.length;
      return {
        correct,
        score: valid ? inPlace / target.length : 0,
        explanation,
        correctAnswer: q.items.map((i, n) => `${n + 1}. ${i.text}`).join("  "),
        feedback: [],
      };
    }
    case "match": {
      const map = response && typeof response === "object" && !Array.isArray(response) ? (response as Record<string, string>) : {};
      const hits = q.pairs.filter((p) => map[p.id] === p.id).length;
      const correct = hits === q.pairs.length;
      return {
        correct,
        score: hits / q.pairs.length,
        explanation,
        correctAnswer: q.pairs.map((p) => `${p.left} → ${p.right}`).join("; "),
        feedback: [],
      };
    }
    case "numeric": {
      const n = typeof response === "number" ? response : Number(response);
      const correct = Number.isFinite(n) && Math.abs(n - q.answer) <= q.tolerance;
      return {
        correct,
        score: correct ? 1 : 0,
        explanation,
        correctAnswer: `${q.answer}${q.unit ? " " + q.unit : ""}${q.tolerance ? ` (±${q.tolerance})` : ""}`,
        feedback: [],
      };
    }
  }
}
