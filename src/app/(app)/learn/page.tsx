import Link from "next/link";
import { CheckCircle2, Lock, PlayCircle, Sparkles } from "lucide-react";
import { pageCtx } from "@/server/page-ctx";
import { completedLessonIds, levelStatuses, passedLevelExams, canAccessPro } from "@/server/progress";
import { LEVELS } from "@/content/levels";
import { Card, LinkButton, Pill, Progress, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/icon";

export const metadata = { title: "Learning path" };

export default async function LearnPage() {
  const { user, db, cur } = await pageCtx("/learn");
  const done = await completedLessonIds(db, user.id);
  const exams = await passedLevelExams(db, user.id);
  const statuses = levelStatuses(cur, done, exams);
  const pro = canAccessPro(user);
  return (
    <div>
      <SectionTitle eyebrow="Learning path" title="From zero to professional technician">
        Ten levels, short lessons. Finish 80% of a level — or pass its checkpoint to test out — to unlock the next.
      </SectionTitle>
      <div className="space-y-5">
        {LEVELS.map((lvl) => {
          const st = statuses.find((s) => s.id === lvl.id)!;
          const lessons = cur.lessonsByLevel.get(lvl.id) ?? [];
          return (
            <Card key={lvl.id} className={st.unlocked ? "" : "opacity-70"}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ background: `${lvl.color}22`, color: lvl.color }}>
                  {st.unlocked ? <Icon name={lvl.icon} size={28} /> : <Lock size={24} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Level {lvl.number} · {lvl.tagline}</div>
                  <h2 className="font-display text-xl font-bold text-white">{lvl.title}</h2>
                  <p className="text-sm text-slate-400">{lvl.description}</p>
                </div>
                <div className="flex w-full items-center gap-3 sm:w-56">
                  <Progress value={(st.completed / Math.max(1, st.total)) * 100} label={`Level ${lvl.number} progress`} />
                  <span className="shrink-0 text-sm text-slate-400">{st.completed}/{st.total}</span>
                </div>
              </div>
              {st.unlocked ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {lessons.map((l) => {
                    const complete = done.has(l.id);
                    const locked = l.pro && !pro;
                    return (
                      <Link key={l.id} href={locked ? "/pricing" : `/learn/${l.id}`} className="focus-ring group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-cool-400/40 hover:bg-white/[0.05]">
                        {complete ? <CheckCircle2 className="shrink-0 text-ok-400" size={22} /> : locked ? <Sparkles className="shrink-0 text-fuchsia-300" size={22} /> : <PlayCircle className="shrink-0 text-cool-400" size={22} />}
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold text-white">{l.title}</div>
                          <div className="text-xs text-slate-400">{l.minutes} min{complete ? ` · best ${done.get(l.id)}%` : ""}</div>
                        </div>
                        {locked && <Pill tone="pro">Pro</Pill>}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-3 text-sm text-slate-400">
                  <span>Locked — complete the previous level, or test out by passing its checkpoint.</span>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
                {st.examPassed ? <Pill tone="ok">Checkpoint passed</Pill> : <Pill>Checkpoint · pass {lvl.passMark}%</Pill>}
                {(st.unlocked || statuses[lvl.number - 2]?.unlocked) && (
                  <LinkButton href={`/exams/level:${st.unlocked ? lvl.id : LEVELS[lvl.number - 2].id}`} variant="ghost" size="sm">
                    {st.unlocked ? (st.examPassed ? "Retake checkpoint" : "Take checkpoint") : `Test out of Level ${lvl.number - 1}`}
                  </LinkButton>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
