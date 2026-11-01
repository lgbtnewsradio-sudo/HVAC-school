import Link from "next/link";
import { clsx } from "clsx";
import { pageCtx } from "@/server/page-ctx";
import { weeklyLeaderboard } from "@/server/progress";
import { Card, Empty, LinkButton, Notice, SectionTitle } from "@/components/ui";

export const metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const { user, db } = await pageCtx("/leaderboard");
  const lb = await weeklyLeaderboard(db, user);
  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle eyebrow={`Week of ${lb.weekOf}`} title="Weekly leaderboard">XP earned this week by learners who chose to appear here. Only display names are shown.</SectionTitle>
      {!lb.optedIn && (
        <div className="mb-4">
          <Notice tone="cool" title="You're not on the board">
            The leaderboard is opt-in for privacy. <Link href="/profile" className="font-semibold underline">Turn it on in your profile</Link> to compete.
          </Notice>
        </div>
      )}
      <Card className="p-2">
        {lb.rows.length ? (
          <ol>
            {lb.rows.map((r) => (
              <li key={r.rank} className={clsx("flex items-center gap-4 rounded-xl px-4 py-3", r.you && "bg-cool-500/15")}>
                <span className={clsx("w-8 text-center font-display text-lg font-bold", r.rank === 1 ? "text-volt-400" : r.rank <= 3 ? "text-slate-200" : "text-slate-500")}>{r.rank}</span>
                <span className="flex-1 font-semibold text-white">
                  {r.name} {r.you && <span className="text-xs text-cool-300">(you)</span>}
                </span>
                <span className="font-mono font-bold text-cool-300">{r.xp.toLocaleString()} XP</span>
              </li>
            ))}
          </ol>
        ) : (
          <Empty title="No one on the board yet this week">Be the first — opt in and earn some XP.</Empty>
        )}
      </Card>
      <LinkButton href="/dashboard" variant="ghost" className="mt-4">Back to dashboard</LinkButton>
    </div>
  );
}
