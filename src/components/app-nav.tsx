"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { LayoutDashboard, BookOpen, Gamepad2, Stethoscope, GraduationCap, Trophy, Repeat, Shield, BookA, Users } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/learn", label: "Learn", icon: BookOpen },
  { href: "/simulator", label: "Field Sim", icon: Stethoscope },
  { href: "/games", label: "Games", icon: Gamepad2 },
  { href: "/review", label: "Review", icon: Repeat },
  { href: "/exams", label: "Exams & Cert Prep", icon: GraduationCap },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/leaderboard", label: "Leaderboard", icon: Users },
  { href: "/glossary", label: "Glossary", icon: BookA },
];

export function SideNav({ admin }: { admin: boolean }) {
  const path = usePathname();
  const items = admin ? [...NAV, { href: "/admin", label: "Admin", icon: Shield }] : NAV;
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {items.map(({ href, label, icon: I }) => {
        const active = path === href || path.startsWith(href + "/");
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={clsx("focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition", active ? "bg-cool-500/15 text-cool-300" : "text-slate-400 hover:bg-white/5 hover:text-white")}>
            <I size={19} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

const MOBILE = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[4]];
export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-900/95 backdrop-blur lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {MOBILE.map(({ href, label, icon: I }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={clsx("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", active ? "text-cool-300" : "text-slate-400")}>
              <I size={22} aria-hidden />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
