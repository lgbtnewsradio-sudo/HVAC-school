import { desc, gte, sql, isNotNull, and, eq } from "drizzle-orm";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { auditLog, lessonProgress, runs, users, xpEvents } from "@/server/db/schema";
import { Card, SectionTitle } from "@/components/ui";
import { AdminTabs } from "@/components/admin-tabs";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  await requireAdmin();
  const db = await getDb();
  const [[u], [active], [lessons], [sims], [games], [pro]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(users),
    db.select({ n: sql<number>`count(distinct ${xpEvents.userId})::int` }).from(xpEvents).where(gte(xpEvents.createdAt, sql`now() - interval '7 days'`)),
    db.select({ n: sql<number>`count(*)::int` }).from(lessonProgress),
    db.select({ n: sql<number>`count(*)::int` }).from(runs).where(and(eq(runs.kind, "sim"), isNotNull(runs.finishedAt))),
    db.select({ n: sql<number>`count(*)::int` }).from(runs).where(and(eq(runs.kind, "game"), isNotNull(runs.finishedAt))),
    db.select({ n: sql<number>`count(*)::int` }).from(users).where(eq(users.plan, "pro")),
  ]);
  const recent = await db.select({ name: users.displayName, email: users.email, at: users.createdAt }).from(users).orderBy(desc(users.createdAt)).limit(8);
  const log = await db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(15);
  const stats = [
    ["Learners", u.n],
    ["Active (7 days)", active.n],
    ["Pro subscribers", pro.n],
    ["Lessons completed", lessons.n],
    ["Field calls finished", sims.n],
    ["Games played", games.n],
  ];
  return (
    <div>
      <SectionTitle eyebrow="Administration" title="Admin console" />
      <AdminTabs active="overview" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stats.map(([k, v]) => (
          <Card key={k as string}>
            <div className="font-display text-3xl font-bold text-white">{v}</div>
            <div className="text-xs text-slate-400">{k}</div>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold text-white">Newest learners</h2>
          <ul className="divide-y divide-white/5 text-sm">
            {recent.map((r) => (
              <li key={r.email} className="flex justify-between py-2">
                <span className="text-slate-200">{r.name}</span>
                <span className="text-slate-500">{r.at.toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold text-white">Audit log</h2>
          {log.length ? (
            <ul className="divide-y divide-white/5 text-sm">
              {log.map((l) => (
                <li key={l.id} className="flex justify-between gap-3 py-2">
                  <span className="text-slate-200">{l.action}</span>
                  <span className="truncate text-slate-400">{l.target}</span>
                  <span className="shrink-0 text-slate-500">{l.createdAt.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">No admin activity yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
