import Link from "next/link";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { Sparkles } from "lucide-react";
import { pageCtx } from "@/server/page-ctx";
import { runs } from "@/server/db/schema";
import { canAccessPro } from "@/server/progress";
import { GAME_INFO } from "@/engine/games";
import { SKILL_LABELS } from "@/content/types";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/icon";

export const metadata = { title: "Games" };

export default async function GamesPage() {
  const { user, db } = await pageCtx("/games");
  const best = await db
    .select({ ref: runs.refId, best: sql<number>`max(${runs.score}::float / nullif(${runs.maxScore}, 0))` })
    .from(runs)
    .where(and(eq(runs.userId, user.id), eq(runs.kind, "game"), isNotNull(runs.finishedAt)))
    .groupBy(runs.refId);
  const bestBy = new Map(best.map((b) => [b.ref, Math.round((b.best ?? 0) * 100)]));
  const pro = canAccessPro(user);
  return (
    <div>
      <SectionTitle eyebrow="Arcade" title="Training games">Short, replayable challenges that build real skills. Personal bests are saved.</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_INFO.map((g) => {
          const locked = g.pro && !pro;
          return (
            <Link key={g.id} href={locked ? "/pricing?from=game" : `/games/${g.id}`} className="focus-ring group">
              <Card className="h-full transition group-hover:border-cool-400/40">
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cool-500/15 text-cool-300">
                    <Icon name={g.icon} />
                  </span>
                  <span className="font-display text-3xl font-bold text-white/10">{g.letter}</span>
                </div>
                <div className="mt-3 font-display text-lg font-bold text-white">{g.title}</div>
                <p className="text-sm text-slate-400">{g.tagline}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.skills.map((s) => (
                    <Pill key={s}>{SKILL_LABELS[s]}</Pill>
                  ))}
                  {locked && <Pill tone="pro"><Sparkles size={12} /> Pro</Pill>}
                  {bestBy.has(g.id) && <Pill tone="ok">Best {bestBy.get(g.id)}%</Pill>}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
