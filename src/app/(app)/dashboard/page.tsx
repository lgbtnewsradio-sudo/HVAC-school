import Link from "next/link";
import { ArrowRight, CalendarCheck, Flame, PlayCircle, Repeat, Stethoscope, Target, Trophy } from "lucide-react";
import { pageCtx } from "@/server/page-ctx";
import { dashboardSummary } from "@/server/progress";
import { LEVELS } from "@/content/levels";
import { SKILL_LABELS, SKILLS } from "@/content/types";
import { gameById } from "@/engine/games";
import { Card, LinkButton, Pill, Progress, Ring } from "@/components/ui";
import { Icon } from "@/components/icon";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { user, db, cur, scenarios } = await pageCtx("/dashboard");
  const sp = await searchParams;
  const s = await dashboardSummary(db, user, cur);
  const level = LEVELS.find((l) => l.id === s.currentLevel)!;
  const lvlStatus = s.statuses.find((x) => x.id === level.id)!;
  const dailyTitle = s.daily.kind === "sim" ? scenarios.find((x) => x.id === s.daily.id)?.title : gameById(s.daily.id)?.title;
  const resume = user.lastPath && user.lastPath !== s.next?.id ? user.lastPath : null;
  const totalLessons = cur.lessons.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-slate-400">{sp.welcome ? "Welcome to the crew," : "Welcome back,"}</div>
          <h1 className="font-display text-3xl font-bold text-white">{user.displayName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Pill tone="cool">{s.rank.title} · Rank {s.rank.level}</Pill>
          <Pill tone="heat">+{s.todayXp} XP today</Pill>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ background: `${level.color}22`, color: level.color }}>
              <Icon name={level.icon} size={28} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Current level {level.number}</div>
              <div className="font-display text-xl font-bold text-white">{level.title}</div>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={(lvlStatus.completed / Math.max(1, lvlStatus.total)) * 100} label="Level progress" />
                <span className="shrink-0 text-sm text-slate-400">
                  {lvlStatus.completed}/{lvlStatus.total}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-cool-400/25 bg-cool-500/[0.07] p-4">
            <div className="text-xs font-bold uppercase tracking-wider text-cool-400">Recommended next</div>
            {s.recommendation.kind === "lesson" && s.next ? (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">{s.next.title}</div>
                  <div className="text-sm text-slate-400">{s.next.minutes} min · {s.recommendation.reason}</div>
                </div>
                <LinkButton href={`/learn/${s.next.id}`}>
                  <PlayCircle size={18} /> Start
                </LinkButton>
              </div>
            ) : s.recommendation.kind === "review" ? (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-white">Spaced review</div>
                  <div className="text-sm text-slate-400">{s.recommendation.reason}</div>
                </div>
                <LinkButton href="/review">
                  <Repeat size={18} /> Review
                </LinkButton>
              </div>
            ) : (
              <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-300">{s.recommendation.reason}</div>
                <LinkButton href="/simulator">
                  <Stethoscope size={18} /> Field Simulator
                </LinkButton>
              </div>
            )}
          </div>
          {resume && (
            <Link href={resume} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-300 hover:text-white">
              Resume where you left off <ArrowRight size={16} />
            </Link>
          )}
        </Card>

        <Card className="flex flex-col items-center justify-center text-center">
          <Ring value={s.rank.progress * 100} size={112} stroke={10}>
            <div>
              <div className="font-display text-2xl font-bold text-white">{s.rank.level}</div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400">rank</div>
            </div>
          </Ring>
          <div className="mt-3 font-semibold text-white">{s.xp.toLocaleString()} XP</div>
          <div className="text-sm text-slate-400">{(s.rank.next - s.xp).toLocaleString()} XP to rank {s.rank.level + 1}</div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-heat-500/10 px-4 py-2 text-heat-400">
            <Flame size={20} />
            <span className="font-bold">{s.streak.current}-day streak</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">{s.streak.activeToday ? "You've learned today 🔥" : "Earn XP today to keep it going"} · best {s.streak.best}</div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 text-sm font-bold text-volt-400">
            <CalendarCheck size={18} /> Daily challenge
          </div>
          <div className="mt-2 font-semibold text-white">{dailyTitle}</div>
          <div className="text-sm text-slate-400">{s.daily.title}</div>
          <div className="mt-3 flex items-center justify-between">
            {s.daily.done ? <Pill tone="ok">Complete · +40 XP</Pill> : <Pill tone="volt">+40 XP</Pill>}
            {!s.daily.done && (
              <LinkButton href={s.daily.kind === "sim" ? `/simulator/${s.daily.id}` : `/games/${s.daily.id}`} size="sm" variant="secondary">
                Go
              </LinkButton>
            )}
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-bold text-fuchsia-300">
            <Target size={18} /> Weekly challenge
          </div>
          <div className="mt-2 font-semibold text-white">{s.weekly.title}</div>
          <div className="mt-3 flex items-center gap-3">
            <Progress value={(s.weekly.value / s.weekly.target) * 100} color="bg-fuchsia-400" label="Weekly challenge progress" />
            <span className="shrink-0 text-sm text-slate-400">
              {s.weekly.value}/{s.weekly.target}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">{s.weekly.done ? "Complete! +150 XP earned" : "+150 XP when complete"}</div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 text-sm font-bold text-cool-300">
            <Repeat size={18} /> Spaced review
          </div>
          <div className="mt-2 font-display text-3xl font-bold text-white">{s.dueReviews}</div>
          <div className="text-sm text-slate-400">concepts due for review</div>
          <LinkButton href="/review" size="sm" variant="secondary" className="mt-3">
            Review now
          </LinkButton>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">Skill mastery</h2>
            <span className="text-xs text-slate-500">based on your answers and field calls</span>
          </div>
          <div className="space-y-3">
            {SKILLS.filter((k) => k !== "certification" || s.mastery[k].n > 0).map((k) => (
              <div key={k} className="flex items-center gap-3">
                <div className="w-36 shrink-0 text-sm text-slate-300">{SKILL_LABELS[k]}</div>
                <Progress value={s.mastery[k].pct} color={s.mastery[k].pct >= 75 ? "bg-ok-400" : s.mastery[k].pct >= 40 ? "bg-cool-400" : "bg-heat-400"} label={`${SKILL_LABELS[k]} mastery`} />
                <div className="w-10 shrink-0 text-right text-sm font-semibold text-white">{s.mastery[k].pct}%</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">Recent achievements</h2>
            <Link href="/achievements" className="text-sm font-semibold text-cool-300 hover:text-cool-200">
              All badges
            </Link>
          </div>
          {s.badges.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {s.badges.slice(0, 6).map((b) => (
                <div key={b.id} className="rounded-xl bg-white/[0.04] p-3 text-center">
                  <Icon name={b.icon} className="mx-auto text-volt-400" size={26} />
                  <div className="mt-1 text-sm font-semibold text-white">{b.title}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-4 text-sm text-slate-400">
              <Trophy className="text-slate-500" /> Finish your first lesson to earn your first badge.
            </div>
          )}
          <div className="mt-5 text-sm text-slate-400">
            {s.lessonsDone} of {totalLessons} lessons complete across all 10 levels.
          </div>
        </Card>
      </div>
    </div>
  );
}
