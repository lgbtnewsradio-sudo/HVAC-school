import Link from "next/link";
import { Logo } from "./logo";
import { LinkButton } from "./ui";
import { BRAND } from "@/lib/brand";

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <nav aria-label="Site" className="ml-6 hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="/#path" className="hover:text-white">Curriculum</Link>
          <Link href="/#simulator" className="hover:text-white">Field Simulator</Link>
          <Link href="/#games" className="hover:text-white">Games</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <LinkButton href="/dashboard" size="sm">Go to dashboard</LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">Sign in</LinkButton>
              <LinkButton href="/register" size="sm">Start free</LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 py-10 text-sm text-slate-500">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs">{BRAND.tagline}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/pricing" className="hover:text-slate-300">Pricing</Link>
          <Link href="/safety" className="hover:text-slate-300">Safety & disclaimer</Link>
          <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-300">Terms</Link>
        </div>
        <p className="text-xs leading-relaxed">
          {BRAND.name} is educational software and is not affiliated with or endorsed by the EPA, NATE, HVAC Excellence, ACCA, ASHRAE, ESCO Group, or OSHA. Practice exams are not official certifications. Always follow manufacturer instructions, applicable codes and your employer&apos;s safety procedures.
        </p>
      </div>
    </footer>
  );
}
