import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Award, Lock } from "lucide-react";
import { pageCtx } from "@/server/page-ctx";
import { achievements, certificates } from "@/server/db/schema";
import { BADGES } from "@/engine/achievements";
import { LEVELS } from "@/content/levels";
import { Card, Pill, SectionTitle } from "@/components/ui";
import { Icon } from "@/components/icon";

export const metadata = { title: "Achievements" };
const TIER = { bronze: "text-orange-300", silver: "text-slate-200", gold: "text-volt-400" };

export default async function AchievementsPage() {
  const { user, db } = await pageCtx("/achievements");
  const earned = new Map((await db.select().from(achievements).where(eq(achievements.userId, user.id))).map((a) => [a.badgeId, a.earnedAt]));
  const certs = await db.select().from(certificates).where(eq(certificates.userId, user.id)).orderBy(desc(certificates.issuedAt));
  return (
    <div className="space-y-8">
      <SectionTitle eyebrow="Trophy case" title="Achievements">
        {earned.size} of {BADGES.length} badges earned. Badges reward correct reasoning and safe work — never guessing.
      </SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BADGES.map((b) => {
          const at = earned.get(b.id);
          return (
            <Card key={b.id} className={at ? "border-volt-400/30" : "opacity-60"}>
              <div className="flex items-start gap-3">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${at ? "bg-volt-400/15" : "bg-white/5"}`}>
                  {at ? <Icon name={b.icon} className={TIER[b.tier]} size={26} /> : <Lock size={20} className="text-slate-500" />}
                </div>
                <div>
                  <div className="font-semibold text-white">{b.title}</div>
                  <div className="text-sm text-slate-400">{b.description}</div>
                  <div className="mt-2 flex gap-2">
                    <Pill tone={at ? "volt" : "slate"}>{b.tier}</Pill>
                    <Pill>+{b.xp} XP</Pill>
                  </div>
                  {at && <div className="mt-1 text-xs text-slate-500">Earned {at.toLocaleDateString()}</div>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-white">Certificates of completion</h2>
        {certs.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {certs.map((c) => (
              <Link key={c.id} href={`/certificates/${c.id}`} className="focus-ring">
                <Card className="flex items-center gap-3 hover:border-ok-400/40">
                  <Award className="text-ok-400" />
                  <div>
                    <div className="font-semibold text-white">{c.levelId === "master" ? "HVAC Master — all levels" : `Level ${LEVELS.find((l) => l.id === c.levelId)?.number}: ${LEVELS.find((l) => l.id === c.levelId)?.title}`}</div>
                    <div className="text-xs text-slate-500">Issued {c.issuedAt.toLocaleDateString()} · ID {c.id}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">Complete every lesson in a level and pass its checkpoint to earn a certificate of completion.</p>
        )}
      </section>
    </div>
  );
}
