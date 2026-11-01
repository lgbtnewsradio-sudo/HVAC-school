import Link from "next/link";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { Lock, Sparkles } from "lucide-react";
import { pageCtx } from "@/server/page-ctx";
import { runs } from "@/server/db/schema";
import { canAccessPro, completedLessonIds, levelStatuses, passedLevelExams } from "@/server/progress";
import { CERT_TRACKS } from "@/content/cert";
import { LEVELS } from "@/content/levels";
import { Card, Notice, Pill, SectionTitle } from "@/components/ui";

export const metadata = { title: "Exams & certification prep" };

export default async function ExamsPage() {
  const { user, db, cur } = await pageCtx("/exams");
  const statuses = levelStatuses(cur, await completedLessonIds(db, user.id), await passedLevelExams(db, user.id));
  const best = await db
    .select({ ref: runs.refId, best: sql<number>`max(${runs.score}::float / nullif(${runs.maxScore},0))` })
    .from(runs)
    .where(and(eq(runs.userId, user.id), eq(runs.kind, "exam"), isNotNull(runs.finishedAt)))
    .groupBy(runs.refId);
  const bestBy = new Map(best.map((b) => [b.ref, Math.round((b.best ?? 0) * 100)]));
  const pro = canAccessPro(user);
  const finalUnlocked = statuses.find((s) => s.id === "l10")?.unlocked;
  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Test yourself" title="Exams & certification prep">Timed practice exams with explanations. Level checkpoints unlock the next level — or let you test out.</SectionTitle>
      <Notice tone="volt">Practice exams are for study only. Completing them is not an official certification, and HVAC Academy is not affiliated with or endorsed by the EPA, NATE, HVAC Excellence or ESCO Group.</Notice>
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-white">Certification study tracks</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CERT_TRACKS.map((t) => {
            const locked = t.pro && !pro;
            const b = bestBy.get(`cert:${t.id}`);
            return (
              <Link key={t.id} href={locked ? "/pricing?from=cert" : `/exams/cert:${t.id}`} className="focus-ring group">
                <Card className="h-full group-hover:border-cool-400/40">
                  <div className="flex flex-wrap gap-2">
                    <Pill tone="cool">{t.short}</Pill>
                    <Pill>{t.questionCount} Q · {t.minutes} min</Pill>
                    {locked && <Pill tone="pro"><Sparkles size={12} /> Pro</Pill>}
                    {b !== undefined && <Pill tone={b >= t.passMark ? "ok" : "slate"}>Best {b}%</Pill>}
                  </div>
                  <div className="mt-3 font-semibold text-white">{t.title}</div>
                  <p className="mt-1 text-sm text-slate-400">{t.description}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-white">Level checkpoints</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {LEVELS.map((l) => {
            const st = statuses.find((s) => s.id === l.id)!;
            const b = bestBy.get(`level:${l.id}`);
            return (
              <Link key={l.id} href={st.unlocked ? `/exams/level:${l.id}` : "/learn"} className="focus-ring">
                <Card className={st.unlocked ? "h-full hover:border-cool-400/40" : "h-full opacity-50"}>
                  <div className="text-xs font-bold text-slate-500">LEVEL {l.number}</div>
                  <div className="text-sm font-semibold text-white">{l.title}</div>
                  <div className="mt-2">{st.examPassed ? <Pill tone="ok">Passed{b ? ` · ${b}%` : ""}</Pill> : st.unlocked ? <Pill>Pass {l.passMark}%</Pill> : <Lock size={14} className="text-slate-500" />}</div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
      <section>
        <Link href={finalUnlocked ? "/exams/final" : "/learn"} className="focus-ring block">
          <Card className={finalUnlocked ? "border-volt-400/30 hover:border-volt-400/60" : "opacity-60"}>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="volt">Final exam</Pill>
              <Pill>40 Q · 60 min · pass 80%</Pill>
              {!finalUnlocked && <Pill><Lock size={12} /> Unlocks with Level 10</Pill>}
            </div>
            <div className="mt-2 font-display text-lg font-bold text-white">Professional HVAC Technician — comprehensive final</div>
            <p className="text-sm text-slate-400">Pass every level checkpoint and the final to earn the HVAC Master certificate of completion.</p>
          </Card>
        </Link>
      </section>
    </div>
  );
}
