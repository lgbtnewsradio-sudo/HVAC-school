import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { contentOverrides } from "@/server/db/schema";
import { BASE_LESSONS } from "@/content";
import { SCENARIOS } from "@/engine/sim/scenarios";
import { OVERRIDE_KINDS } from "@/server/curriculum";
import { SectionTitle } from "@/components/ui";
import { ContentEditor } from "@/components/content-editor";

export const metadata = { title: "Admin · Edit content" };

const TEMPLATES: Record<string, unknown> = {
  lesson: {
    id: "l1-new-lesson",
    levelId: "l1",
    order: 99,
    title: "New lesson",
    summary: "One-sentence summary.",
    minutes: 6,
    objectives: ["Objective one"],
    skills: ["fundamentals"],
    steps: [
      { kind: "concept", title: "Big idea", body: ["Plain-English explanation with **bold** and [[glossary]] links."] },
      { kind: "question", question: { id: "l1q-new-1", type: "truefalse", prompt: "Statement to evaluate.", answer: true, explanation: "Why.", skills: ["fundamentals"], difficulty: 1 } },
      { kind: "question", question: { id: "l1q-new-2", type: "single", prompt: "Question?", options: [{ id: "a", text: "Right" }, { id: "b", text: "Wrong", feedback: "Why it's wrong" }], answer: "a", explanation: "Why.", skills: ["fundamentals"], difficulty: 1 } },
    ],
    sources: [{ id: "ashrae-fund" }],
    revised: new Date().toISOString().slice(0, 10),
    scope: "general",
    pro: false,
  },
  question: { id: "q-new", type: "single", prompt: "Question?", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], answer: "a", explanation: "Why.", skills: ["fundamentals"], difficulty: 1 },
  scenario: { ...SCENARIOS[0], id: "sim-new-scenario", title: "New service call" },
};

export default async function EditContent({ params }: { params: Promise<{ kind: string; id: string }> }) {
  await requireAdmin();
  const { kind, id } = await params;
  if (!(kind in OVERRIDE_KINDS)) notFound();
  const db = await getDb();
  const [ov] = id === "new" ? [] : await db.select().from(contentOverrides).where(and(eq(contentOverrides.kind, kind), eq(contentOverrides.id, id)));
  const base = kind === "lesson" ? BASE_LESSONS.find((l) => l.id === id) : kind === "scenario" ? SCENARIOS.find((s) => s.id === id) : undefined;
  const data = ov?.data ?? base ?? (id === "new" ? TEMPLATES[kind] : undefined);
  if (!data) notFound();
  return (
    <div>
      <Link href="/admin/content" className="text-sm text-slate-400 hover:text-white">← All content</Link>
      <SectionTitle eyebrow={`Edit ${kind}`} title={id === "new" ? `New ${kind}` : id} className="mt-2">
        {ov ? `Override last updated ${ov.updatedAt.toLocaleString()}.` : base ? "Editing creates an override of the bundled version." : "Fill in the template and save."}
        {kind === "lesson" && id !== "new" && (
          <>
            {" "}
            <Link href={`/learn/${id}`} className="text-cool-300 underline">Preview as a learner</Link>
          </>
        )}
      </SectionTitle>
      <ContentEditor kind={kind} id={id} initial={JSON.stringify(data, null, 2)} hasOverride={!!ov} published={ov?.published ?? true} />
    </div>
  );
}
