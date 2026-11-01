import { z } from "zod";

/**
 * Curriculum content model. Everything a student sees is data that conforms to
 * these schemas, so lessons/questions/scenarios can be added or corrected (in
 * code or through the admin console) without changing application code.
 */

export const SKILLS = [
  "fundamentals",
  "components",
  "refrigeration",
  "electrical",
  "airflow",
  "heating",
  "installation",
  "troubleshooting",
  "safety",
  "professional",
  "certification",
] as const;
export const skillSchema = z.enum(SKILLS);
export type Skill = z.infer<typeof skillSchema>;

export const SKILL_LABELS: Record<Skill, string> = {
  fundamentals: "Fundamentals",
  components: "Components",
  refrigeration: "Refrigeration",
  electrical: "Electrical",
  airflow: "Airflow & Ducts",
  heating: "Heating",
  installation: "Installation",
  troubleshooting: "Troubleshooting",
  safety: "Safety",
  professional: "Professional Practice",
  certification: "Certification Prep",
};

export const sourceRefSchema = z.object({
  /** Key into SOURCES (src/content/sources.ts) */
  id: z.string(),
  note: z.string().optional(),
});

const optionSchema = z.object({
  id: z.string(),
  text: z.string(),
  /** Why this option is right/wrong — shown after answering. */
  feedback: z.string().optional(),
});

const baseQuestion = {
  id: z.string(),
  prompt: z.string(),
  explanation: z.string(),
  skills: z.array(skillSchema).min(1),
  difficulty: z.number().int().min(1).max(3).default(1),
  /** Optional diagram shown with the prompt. */
  visual: z.string().optional(),
  hint: z.string().optional(),
};

export const questionSchema = z.discriminatedUnion("type", [
  z.object({ ...baseQuestion, type: z.literal("single"), options: z.array(optionSchema).min(2), answer: z.string() }),
  z.object({ ...baseQuestion, type: z.literal("multi"), options: z.array(optionSchema).min(2), answer: z.array(z.string()).min(1) }),
  z.object({ ...baseQuestion, type: z.literal("truefalse"), answer: z.boolean() }),
  z.object({
    ...baseQuestion,
    type: z.literal("order"),
    /** Items listed in the CORRECT order; the client receives them shuffled. */
    items: z.array(z.object({ id: z.string(), text: z.string() })).min(3),
  }),
  z.object({
    ...baseQuestion,
    type: z.literal("match"),
    pairs: z.array(z.object({ id: z.string(), left: z.string(), right: z.string() })).min(2),
  }),
  z.object({
    ...baseQuestion,
    type: z.literal("numeric"),
    answer: z.number(),
    tolerance: z.number().min(0).default(0),
    unit: z.string().optional(),
  }),
]);
export type Question = z.infer<typeof questionSchema>;
export type QuestionInput = z.input<typeof questionSchema>;

export const lessonStepSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("concept"),
    title: z.string(),
    /** Short paragraphs. Supports **bold** and [[term]] glossary links. */
    body: z.array(z.string()).min(1),
    visual: z.string().optional(),
    keyTerms: z.array(z.string()).optional(),
  }),
  z.object({ kind: z.literal("example"), title: z.string(), body: z.array(z.string()).min(1), visual: z.string().optional() }),
  z.object({ kind: z.literal("safety"), title: z.string(), body: z.array(z.string()).min(1) }),
  z.object({
    kind: z.literal("interactive"),
    title: z.string(),
    widget: z.string(),
    intro: z.string().optional(),
  }),
  z.object({ kind: z.literal("question"), question: questionSchema }),
]);
export type LessonStep = z.infer<typeof lessonStepSchema>;
export type LessonStepInput = z.input<typeof lessonStepSchema>;

export const lessonSchema = z.object({
  id: z.string(),
  levelId: z.string(),
  order: z.number().int(),
  title: z.string(),
  summary: z.string(),
  minutes: z.number().int().min(1).max(30),
  objectives: z.array(z.string()).min(1),
  skills: z.array(skillSchema).min(1),
  steps: z.array(lessonStepSchema).min(2),
  sources: z.array(sourceRefSchema).min(1),
  /** ISO date the technical content was last reviewed. */
  revised: z.string(),
  /** "general" = trade-wide principle; "equipment-specific" = always defer to manufacturer docs. */
  scope: z.enum(["general", "equipment-specific"]).default("general"),
  /** Requires the Pro plan when the paywall is enabled. */
  pro: z.boolean().default(false),
});
export type Lesson = z.infer<typeof lessonSchema>;
export type LessonInput = z.input<typeof lessonSchema>;

export type Level = {
  id: string;
  number: number;
  title: string;
  tagline: string;
  description: string;
  color: string; // tailwind-friendly hex accent
  icon: string; // lucide icon name
  skills: Skill[];
  /** Pass mark (percent) for the level checkpoint exam. */
  passMark: number;
};

export type GlossaryTerm = {
  term: string;
  slug: string;
  definition: string;
  plain?: string; // even simpler explanation
  related?: string[];
};

export type SourceDef = {
  id: string;
  title: string;
  publisher: string;
  url?: string;
  kind: "standard" | "regulation" | "training" | "manual" | "safety";
};
