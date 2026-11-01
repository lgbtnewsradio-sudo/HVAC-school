import Link from "next/link";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { Lock, Sparkles } from "lucide-react";
import { pageCtx } from "@/server/page-ctx";
import { runs } from "@/server/db/schema";
import { canAccessPro } from "@/server/progress";
import { Card, Pill, SectionTitle } from "@/components/ui";

export const metadata = { title: "Field Simulator" };

const PROFILE_LABEL = { cooling: "Cooling", "gas-heat": "Gas heat", "hp-heat": "Heat pump" } as const;

export default async function SimulatorPage() {
  const { user, db, scenarios } = await pageCtx("/simulator");
  const best = await db
    .select({ ref: runs.refId, best: sql<number>`max(${runs.score})::int`, n: sql<number>`count(*)::int` })
    .from(runs)
    .where(and(eq(runs.userId, user.id), eq(runs.kind, "sim"), isNotNull(runs.finishedAt)))
    .groupBy(runs.refId);
  const bestBy = new Map(best.map((b) => [b.ref, b]));
  const pro = canAccessPro(user);
  const groups = [1, 2, 3] as const;
  return (
    <div>
      <SectionTitle eyebrow="Field Simulator" title="Realistic residential service calls">
        Talk to the customer, inspect the equipment, choose your tools and take real readings. You&apos;re scored on your process: evidence, safety, the right repair and verification.
      </SectionTitle>
      {groups.map((lvl) => (
        <section key={lvl} className="mb-8">
          <h2 className="mb-3 font-display text-lg font-bold text-white">{["", "Beginner calls", "Intermediate calls", "Advanced & multi-fault calls"][lvl]}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {scenarios
              .filter((s) => s.level === lvl)
              .map((s) => {
                const b = bestBy.get(s.id);
                const locked = s.pro && !pro;
                return (
                  <Link key={s.id} href={locked ? "/pricing?from=sim" : `/simulator/${s.id}`} className="focus-ring group">
                    <Card className="h-full transition group-hover:border-heat-400/40">
                      <div className="flex items-center gap-2">
                        <Pill tone={s.profile === "cooling" ? "cool" : "heat"}>{PROFILE_LABEL[s.profile]}</Pill>
                        {locked && <Pill tone="pro"><Sparkles size={12} /> Pro</Pill>}
                        {b && <Pill tone={b.best >= 80 ? "ok" : "slate"}>Best {b.best}</Pill>}
                      </div>
                      <div className="mt-3 font-semibold text-white">{s.title}</div>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-400">&ldquo;{s.complaint}&rdquo;</p>
                      <div className="mt-3 text-xs text-slate-500">{s.equipment.type}</div>
                      {locked && <Lock size={14} className="mt-2 text-slate-500" />}
                    </Card>
                  </Link>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
