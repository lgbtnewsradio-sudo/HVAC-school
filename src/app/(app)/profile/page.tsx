import Link from "next/link";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { pageCtx } from "@/server/page-ctx";
import { bookmarks, runs } from "@/server/db/schema";
import { paywallEnabled } from "@/server/progress";
import { stripeConfigured } from "@/server/stripe";
import { GAME_INFO } from "@/engine/games";
import { GLOSSARY } from "@/content/glossary";
import { Button, Card, LinkButton, Pill, SectionTitle } from "@/components/ui";
import { PasswordForm, ProfileForm } from "@/components/profile-forms";
import { signOutEverywhereAction } from "@/app/actions";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { user, db, cur, scenarios } = await pageCtx("/profile");
  const bms = await db.select().from(bookmarks).where(eq(bookmarks.userId, user.id)).orderBy(desc(bookmarks.createdAt));
  const history = await db
    .select({ id: runs.id, kind: runs.kind, ref: runs.refId, score: runs.score, max: runs.maxScore, xp: runs.xpAwarded, at: runs.finishedAt })
    .from(runs)
    .where(and(eq(runs.userId, user.id), isNotNull(runs.finishedAt)))
    .orderBy(desc(runs.finishedAt))
    .limit(25);
  const name = (kind: string, ref: string) =>
    kind === "lesson" ? cur.lessonById.get(ref)?.title : kind === "sim" ? scenarios.find((s) => s.id === ref)?.title : kind === "game" ? GAME_INFO.find((g) => g.id === ref)?.title : kind === "review" ? "Spaced review" : ref.replace("cert:", "Practice exam: ").replace("level:", "Checkpoint: ");
  return (
    <div className="space-y-6">
      <SectionTitle eyebrow="Account" title="Profile & settings" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold text-white">Profile</h2>
          <ProfileForm u={user} />
        </Card>
        <div className="space-y-6">
          <Card>
            <h2 className="mb-2 font-display text-lg font-bold text-white">Plan</h2>
            <div className="flex items-center gap-2">
              <Pill tone={user.plan === "pro" ? "pro" : "slate"}>{user.plan === "pro" ? "Pro" : "Free"}</Pill>
              {!paywallEnabled() && <span className="text-sm text-slate-400">All features unlocked during early access.</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {user.plan === "pro" && stripeConfigured() ? (
                <form action="/api/stripe/portal" method="post">
                  <Button variant="secondary" size="sm">Manage billing</Button>
                </form>
              ) : (
                <LinkButton href="/pricing" size="sm">See plans</LinkButton>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-500">Signed in as {user.email}</div>
          </Card>
          <Card>
            <h2 className="mb-4 font-display text-lg font-bold text-white">Security</h2>
            <PasswordForm />
            <form action={signOutEverywhereAction} className="mt-4 border-t border-white/10 pt-4">
              <Button variant="ghost" size="sm">Sign out on all devices</Button>
            </form>
          </Card>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold text-white">Bookmarks</h2>
          {bms.length ? (
            <ul className="space-y-1.5">
              {bms.map((b) => (
                <li key={b.kind + b.refId}>
                  <Link href={b.kind === "lesson" ? `/learn/${b.refId}` : `/glossary#${b.refId}`} className="text-cool-300 hover:underline">
                    {b.kind === "lesson" ? cur.lessonById.get(b.refId)?.title ?? b.refId : GLOSSARY.find((t) => t.slug === b.refId)?.term ?? b.refId}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">{b.kind}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Bookmark lessons and glossary terms to find them here.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold text-white">Activity history</h2>
          {history.length ? (
            <ul className="divide-y divide-white/5 text-sm">
              {history.map((h) => (
                <li key={h.id} className="flex items-center gap-3 py-2">
                  <Pill>{h.kind}</Pill>
                  <span className="flex-1 truncate text-slate-200">{name(h.kind, h.ref)}</span>
                  {h.max ? <span className="text-slate-400">{h.score}/{h.max}</span> : null}
                  <span className="w-14 text-right text-cool-300">+{h.xp}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">Your quizzes, games and field calls will show up here.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
