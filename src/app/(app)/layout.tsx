import { Flame, Zap } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/server/auth";
import { getDb } from "@/server/db";
import { streakFor } from "@/server/progress";
import { levelFromXp, rankTitle } from "@/engine/progression";
import { GLOSSARY } from "@/content/glossary";
import { Logo } from "@/components/logo";
import { SideNav, BottomNav } from "@/components/app-nav";
import { GlossaryDrawer } from "@/components/glossary-drawer";
import { logoutAction } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const db = await getDb();
  const streak = await streakFor(db, user);
  const lvl = levelFromXp(user.xp);
  return (
    <div className="bg-grid min-h-dvh">
      <aside className="no-print fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-white/10 bg-ink-900/80 p-4 backdrop-blur lg:flex">
        <div className="mb-6 px-2 pt-1">
          <Logo href="/dashboard" />
        </div>
        <SideNav admin={user.role === "admin"} />
        <div className="mt-auto space-y-2 border-t border-white/10 pt-4">
          <Link href="/profile" className="focus-ring block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
            <div className="font-semibold text-white">{user.displayName}</div>
            <div className="text-xs text-slate-400">
              {rankTitle(lvl.level)} · {user.mode === "advanced" ? "Advanced" : "Beginner"} mode
            </div>
          </Link>
          <form action={logoutAction}>
            <button className="focus-ring w-full rounded-xl px-3 py-2 text-left text-sm text-slate-400 hover:bg-white/5 hover:text-white">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-white/10 bg-ink-950/85 px-4 py-3 backdrop-blur sm:px-6">
          <div className="lg:hidden">
            <Logo href="/dashboard" compact />
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-3">
            <div className="flex items-center gap-1.5 rounded-xl bg-heat-500/10 px-2.5 py-2 text-sm font-bold text-heat-400 sm:px-3" title="Daily streak">
              <Flame size={18} aria-hidden className={streak.activeToday ? "" : "opacity-50"} />
              <span>{streak.current}</span>
              <span className="sr-only">day streak</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-xl bg-cool-500/10 px-2.5 py-2 text-sm font-bold text-cool-300 sm:px-3" title={`Rank level ${lvl.level}`}>
              <Zap size={18} aria-hidden />
              <span>{user.xp.toLocaleString()}</span>
              <span className="hidden text-xs font-semibold text-cool-400/80 sm:inline">XP</span>
            </div>
            <GlossaryDrawer terms={GLOSSARY} />
            <Link href="/profile" className="focus-ring grid h-10 w-10 place-items-center rounded-xl bg-ink-700 font-bold text-white lg:hidden" aria-label="Profile">
              {user.displayName.slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
