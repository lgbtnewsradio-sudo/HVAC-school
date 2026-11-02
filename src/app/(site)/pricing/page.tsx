import { Check } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { paywallEnabled } from "@/server/progress";
import { stripeConfigured } from "@/server/stripe";
import { Button, LinkButton, Notice, Pill } from "@/components/ui";

export const metadata = { title: "Pricing" };

const FREE = ["Levels 1–8 core lessons", "Field Simulator beginner & intermediate calls", "10 of the 12 training games", "EPA 608 Core, Type I & apprenticeship practice exams", "Spaced review, streaks, badges", "Certificates of completion"];
const PRO = ["Everything in Free", "Advanced diagnostics (Level 9) & Professional (Level 10)", "Advanced & multi-fault field calls", "Repair Shop & Installation Challenge", "EPA Type II/III, NATE-style & Employment Ready practice exams", "Comprehensive final exam & HVAC Master certificate"];

export default async function Pricing({ searchParams }: { searchParams: Promise<{ billing?: string; canceled?: string; from?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const live = stripeConfigured();
  const paywall = paywallEnabled();
  const price = process.env.NEXT_PUBLIC_PRO_PRICE_LABEL ?? "$14.99 / month";
  return (
    <div className="bg-grid px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h1 className="font-display text-4xl font-bold text-white">Simple pricing</h1>
          <p className="mt-3 text-slate-400">Start free. Upgrade when you&apos;re ready for advanced diagnostics and full certification prep.</p>
        </div>
        <div className="mx-auto mt-6 max-w-2xl space-y-3">
          {sp.from && paywall && <Notice tone="cool">That content is part of Pro.</Notice>}
          {sp.canceled && <Notice tone="volt">Checkout canceled — no charge was made.</Notice>}
          {!paywall && <Notice tone="ok" title="Early access: everything is unlocked">Pro features are free while we&apos;re in early access. Create an account and enjoy the full platform.</Notice>}
          {sp.billing === "unavailable" && <Notice tone="volt">Online billing isn&apos;t enabled yet.</Notice>}
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="glass rounded-3xl p-8">
            <div className="font-display text-xl font-bold text-white">Free</div>
            <div className="mt-2 font-display text-4xl font-bold text-white">$0</div>
            <ul className="mt-6 space-y-3">
              {FREE.map((f) => (
                <li key={f} className="flex gap-2 text-slate-300">
                  <Check className="shrink-0 text-ok-400" size={20} /> {f}
                </li>
              ))}
            </ul>
            <LinkButton href={user ? "/dashboard" : "/register"} variant="secondary" size="lg" className="mt-8 w-full">
              {user ? "Go to dashboard" : "Start free"}
            </LinkButton>
          </div>
          <div className="relative rounded-3xl border-2 border-cool-400/50 bg-gradient-to-b from-ink-800 to-ink-900 p-8 shadow-[0_0_80px_-20px_rgb(56_189_248/0.5)]">
            <Pill tone="pro" className="absolute right-6 top-6">Most popular</Pill>
            <div className="font-display text-xl font-bold text-white">Pro</div>
            <div className="mt-2 font-display text-4xl font-bold text-white">{price}</div>
            <div className="text-sm text-slate-400">Cancel anytime</div>
            <ul className="mt-6 space-y-3">
              {PRO.map((f) => (
                <li key={f} className="flex gap-2 text-slate-200">
                  <Check className="shrink-0 text-cool-300" size={20} /> {f}
                </li>
              ))}
            </ul>
            {user?.plan === "pro" ? (
              <form action="/api/stripe/portal" method="post" className="mt-8">
                <Button size="lg" variant="secondary" className="w-full">Manage subscription</Button>
              </form>
            ) : live && paywall ? (
              user ? (
                <form action="/api/stripe/checkout" method="post" className="mt-8">
                  <Button size="lg" className="w-full">Upgrade to Pro</Button>
                </form>
              ) : (
                <LinkButton href="/register" size="lg" className="mt-8 w-full">Create an account to upgrade</LinkButton>
              )
            ) : (
              <LinkButton href={user ? "/dashboard" : "/register"} size="lg" className="mt-8 w-full">
                {user ? "Pro is unlocked during early access" : "Get full access free"}
              </LinkButton>
            )}
          </div>
        </div>
        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-white/10 p-6 text-center">
          <div className="font-semibold text-white">Trade schools, contractors & apprenticeship programs</div>
          <p className="mt-1 text-sm text-slate-400">Team seats, progress reports and custom curriculum are available for organizations.</p>
          <a href="mailto:lgbtnewsradio@gmail.com?subject=HVAC%20Academy%20for%20teams" className="mt-3 inline-block font-semibold text-cool-300 hover:text-cool-200">Contact us about team pricing →</a>
        </div>
      </div>
    </div>
  );
}
