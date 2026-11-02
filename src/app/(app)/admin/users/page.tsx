import { desc, ilike, or } from "drizzle-orm";
import { requireAdmin } from "@/server/auth";
import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";
import { Card, SectionTitle } from "@/components/ui";
import { AdminTabs } from "@/components/admin-tabs";
import { AdminUserRow } from "@/components/admin-user-row";

export const metadata = { title: "Admin · Users" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const q = ((await searchParams).q ?? "").slice(0, 100);
  const db = await getDb();
  const like = `%${q.replace(/[%_]/g, "")}%`;
  const rows = await db
    .select()
    .from(users)
    .where(q ? or(ilike(users.email, like), ilike(users.displayName, like)) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(100);
  return (
    <div>
      <SectionTitle eyebrow="Administration" title="Users" />
      <AdminTabs active="users" />
      <form className="mb-4">
        <input name="q" defaultValue={q} placeholder="Search by email or name…" className="focus-ring h-11 w-full max-w-md rounded-xl border border-white/10 bg-ink-800 px-3 text-white" aria-label="Search users" />
      </form>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="pb-2">Learner</th>
              <th className="pb-2">XP</th>
              <th className="pb-2">Joined</th>
              <th className="pb-2">Role & plan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <AdminUserRow key={u.id} u={{ id: u.id, displayName: u.displayName, email: u.email, role: u.role, plan: u.plan, xp: u.xp, createdAt: u.createdAt.toLocaleDateString() }} />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
