import Link from "next/link";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { contentOverrides } from "@/server/db/schema";
import { BASE_LESSONS } from "@/content";
import { SCENARIOS } from "@/engine/sim/scenarios";
import { LEVELS } from "@/content/levels";
import { Card, LinkButton, Pill, SectionTitle } from "@/components/ui";
import { AdminTabs } from "@/components/admin-tabs";

export const metadata = { title: "Admin · Content" };

export default async function AdminContent() {
  await requireAdmin();
  const db = await getDb();
  const ov = await db.select().from(contentOverrides);
  const key = (k: string, id: string) => ov.find((o) => o.kind === k && o.id === id);
  const customLessons = ov.filter((o) => o.kind === "lesson" && !BASE_LESSONS.some((l) => l.id === o.id));
  const customScenarios = ov.filter((o) => o.kind === "scenario" && !SCENARIOS.some((s) => s.id === o.id));
  const badge = (o?: { published: boolean }) => (o ? <Pill tone={o.published ? "cool" : "volt"}>{o.published ? "edited" : "draft"}</Pill> : null);
  return (
    <div>
      <SectionTitle eyebrow="Administration" title="Curriculum & content">Edit any lesson (including its questions) or field scenario. Changes are schema-validated, versioned in the audit log, and can be reverted.</SectionTitle>
      <AdminTabs active="content" />
      <div className="mb-6 flex flex-wrap gap-2">
        <LinkButton href="/admin/content/lesson/new" size="sm">New lesson</LinkButton>
        <LinkButton href="/admin/content/scenario/new" size="sm" variant="secondary">New field scenario</LinkButton>
        <LinkButton href="/admin/content/question/new" size="sm" variant="secondary">New standalone question</LinkButton>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-white">Lessons</h2>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-2">
            {LEVELS.map((lvl) => (
              <div key={lvl.id}>
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">Level {lvl.number} · {lvl.title}</div>
                <ul className="space-y-1">
                  {[...BASE_LESSONS.filter((l) => l.levelId === lvl.id), ...customLessons.filter((o) => (o.data as { levelId?: string }).levelId === lvl.id).map((o) => o.data as { id: string; title: string })].map((l) => (
                    <li key={l.id} className="flex items-center gap-2">
                      <Link href={`/admin/content/lesson/${l.id}`} className="text-sm text-cool-300 hover:underline">{l.title}</Link>
                      {badge(key("lesson", l.id))}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold text-white">Field scenarios</h2>
          <ul className="space-y-1">
            {[...SCENARIOS, ...customScenarios.map((o) => o.data as { id: string; title: string })].map((s) => (
              <li key={s.id} className="flex items-center gap-2">
                <Link href={`/admin/content/scenario/${s.id}`} className="text-sm text-cool-300 hover:underline">{s.title}</Link>
                {badge(key("scenario", s.id))}
              </li>
            ))}
          </ul>
          {ov.some((o) => o.kind === "question") && (
            <>
              <h2 className="mb-2 mt-6 font-semibold text-white">Standalone questions</h2>
              <ul className="space-y-1">
                {ov.filter((o) => o.kind === "question").map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/content/question/${o.id}`} className="text-sm text-cool-300 hover:underline">{o.id}</Link> {badge(o)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
