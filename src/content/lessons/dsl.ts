import type { LessonInput, LessonStepInput, QuestionInput, Skill } from "../types";

/** Tiny authoring helpers that keep curriculum files readable. */

type Opt = [id: string, text: string, feedback?: string];
const opts = (o: Opt[]) => o.map(([id, text, feedback]) => ({ id, text, feedback }));

export const concept = (title: string, body: string[], visual?: string, keyTerms?: string[]): LessonStepInput => ({
  kind: "concept",
  title,
  body,
  visual,
  keyTerms,
});
export const example = (title: string, body: string[], visual?: string): LessonStepInput => ({ kind: "example", title, body, visual });
export const safety = (title: string, body: string[]): LessonStepInput => ({ kind: "safety", title, body });
export const widget = (title: string, w: string, intro?: string): LessonStepInput => ({ kind: "interactive", title, widget: w, intro });
export const ask = (question: QuestionInput): LessonStepInput => ({ kind: "question", question });

type Meta = { skills: Skill[]; difficulty?: number; visual?: string; hint?: string };

export const single = (id: string, prompt: string, options: Opt[], answer: string, explanation: string, m: Meta): QuestionInput => ({
  id,
  type: "single",
  prompt,
  options: opts(options),
  answer,
  explanation,
  ...m,
});
export const multi = (id: string, prompt: string, options: Opt[], answer: string[], explanation: string, m: Meta): QuestionInput => ({
  id,
  type: "multi",
  prompt,
  options: opts(options),
  answer,
  explanation,
  ...m,
});
export const tf = (id: string, prompt: string, answer: boolean, explanation: string, m: Meta): QuestionInput => ({
  id,
  type: "truefalse",
  prompt,
  answer,
  explanation,
  ...m,
});
export const order = (id: string, prompt: string, itemsInOrder: string[], explanation: string, m: Meta): QuestionInput => ({
  id,
  type: "order",
  prompt,
  items: itemsInOrder.map((text, i) => ({ id: `${id}-${i}`, text })),
  explanation,
  ...m,
});
export const match = (id: string, prompt: string, pairs: [string, string][], explanation: string, m: Meta): QuestionInput => ({
  id,
  type: "match",
  prompt,
  pairs: pairs.map(([left, right], i) => ({ id: `${id}-${i}`, left, right })),
  explanation,
  ...m,
});
export const numeric = (id: string, prompt: string, answer: number, tolerance: number, unit: string | undefined, explanation: string, m: Meta): QuestionInput => ({
  id,
  type: "numeric",
  prompt,
  answer,
  tolerance,
  unit,
  explanation,
  ...m,
});

export const lesson = (l: LessonInput): LessonInput => l;
