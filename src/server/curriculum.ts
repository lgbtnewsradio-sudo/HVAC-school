import { z } from "zod";
import { eq } from "drizzle-orm";
import { BASE_CERT_QUESTIONS, BASE_LESSONS, buildCurriculum, type Curriculum } from "@/content";
import { lessonSchema, questionSchema, type Lesson, type Question } from "@/content/types";
import { SCENARIOS } from "@/engine/sim/scenarios";
import { PROFILES, REPAIRS, CAUSES } from "@/engine/sim/catalog";
import type { Scenario } from "@/engine/sim/types";
import type { DB } from "./db";
import { contentOverrides } from "./db/schema";

const reading = z.union([z.number(), z.string(), z.object({ value: z.union([z.number(), z.string()]), note: z.string().optional() })]);
const readings = z.record(z.string(), reading);

export const scenarioSchema = z
  .object({
    id: z.string().regex(/^sim-[a-z0-9-]+$/),
    title: z.string().min(3),
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    levelId: z.string(),
    profile: z.enum(["cooling", "gas-heat", "hp-heat"]),
    customer: z.string(),
    complaint: z.string(),
    equipment: z.object({ type: z.string(), age: z.string(), refrigerant: z.string().optional(), metering: z.string().optional(), tonnage: z.string().optional(), notes: z.string().optional() }),
    conditions: z.string(),
    faults: z
      .array(
        z.object({
          cause: z.string(),
          accept: z.array(z.string()).optional(),
          repair: z.string(),
          on: readings.optional(),
          off: readings.optional(),
          inspect: z.record(z.string(), z.string()).optional(),
          answers: z.record(z.string(), z.string()).optional(),
        }),
      )
      .min(1),
    evidence: z.array(z.object({ label: z.string(), any: z.array(z.string()).min(1) })).min(1),
    verify: z.array(z.string()).min(1),
    explanation: z.string(),
    differentials: z.array(z.object({ cause: z.string(), why: z.string() })),
    hints: z.array(z.string()),
    parSteps: z.number().int().min(1),
    pro: z.boolean().optional(),
    combined: z.object({ on: readings.optional() }).optional(),
  })
  .superRefine((s, ctx) => {
    const p = PROFILES[s.profile];
    for (const f of s.faults) {
      if (!CAUSES[f.cause]) ctx.addIssue({ code: "custom", message: `Unknown cause ${f.cause}` });
      if (!REPAIRS[f.repair] || !p.repairs.includes(f.repair)) ctx.addIssue({ code: "custom", message: `Repair ${f.repair} not available for profile ${s.profile}` });
      for (const k of [...Object.keys(f.on ?? {}), ...Object.keys(f.off ?? {})])
        if (!p.measures.some((m) => m.id === k)) ctx.addIssue({ code: "custom", message: `Unknown measurement ${k}` });
    }
    for (const v of s.verify) if (!p.measures.some((m) => m.id === v)) ctx.addIssue({ code: "custom", message: `Unknown verify measurement ${v}` });
  });

export const OVERRIDE_KINDS = {
  lesson: lessonSchema,
  question: questionSchema,
  scenario: scenarioSchema,
} as const;
export type OverrideKind = keyof typeof OVERRIDE_KINDS;

type Loaded = { curriculum: Curriculum; scenarios: Scenario[]; at: number; version: number };
const g = globalThis as unknown as { __hvacCurriculum?: Loaded; __hvacCurriculumVersion?: number };
const TTL_MS = 30_000;

export function invalidateCurriculum() {
  g.__hvacCurriculumVersion = (g.__hvacCurriculumVersion ?? 0) + 1;
}

/** Bundled content with published admin overrides applied. Invalid overrides are ignored (and visible in admin). */
export async function loadContent(db: DB): Promise<{ curriculum: Curriculum; scenarios: Scenario[] }> {
  const version = g.__hvacCurriculumVersion ?? 0;
  const cached = g.__hvacCurriculum;
  if (cached && cached.version === version && Date.now() - cached.at < TTL_MS) return cached;
  const rows = await db.select().from(contentOverrides).where(eq(contentOverrides.published, true));
  const lessons = new Map<string, Lesson>(BASE_LESSONS.map((l) => [l.id, l]));
  const extraQuestions: Question[] = [];
  const scenarios = new Map<string, Scenario>(SCENARIOS.map((s) => [s.id, s]));
  for (const r of rows) {
    const parsed = OVERRIDE_KINDS[r.kind as OverrideKind]?.safeParse(r.data);
    if (!parsed?.success) continue;
    if (r.kind === "lesson") lessons.set(r.id, parsed.data as Lesson);
    if (r.kind === "question") extraQuestions.push(parsed.data as Question);
    if (r.kind === "scenario") scenarios.set(r.id, parsed.data as Scenario);
  }
  const certBanks = { ...BASE_CERT_QUESTIONS };
  // Admin-authored questions tagged as certification are added to an "admin" bank that cert tracks may reference.
  const loaded: Loaded = {
    curriculum: buildCurriculum([...lessons.values()], certBanks, extraQuestions),
    scenarios: [...scenarios.values()],
    at: Date.now(),
    version,
  };
  g.__hvacCurriculum = loaded;
  return loaded;
}
