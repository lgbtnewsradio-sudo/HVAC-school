import { ArrowRight, CheckCircle2, Flame, Gauge, GraduationCap, ShieldCheck, Stethoscope, Trophy, Zap } from "lucide-react";
import { LEVELS } from "@/content/levels";
import { BASE_CURRICULUM } from "@/content";
import { GAME_INFO } from "@/engine/games";
import { SCENARIOS } from "@/engine/sim/scenarios";
import { CERT_TRACKS } from "@/content/cert";
import { BADGES } from "@/engine/achievements";
import { BRAND } from "@/lib/brand";
import { LinkButton, Pill } from "@/components/ui";
import { Icon } from "@/components/icon";
import { CycleExplorer } from "@/components/widgets";

export default function Landing() {
  const lessonCount = BASE_CURRICULUM.lessons.length;
  const questionCount = BASE_CURRICULUM.questions.size;
  return (
    <div className="overflow-x-hidden">
      {/* Hero */}
      <section className="bg-grid relative">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-cool-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-heat-500/10 blur-[100px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-2 lg:pt-24">
          <div className="animate-rise">
            <Pill tone="cool">Zero experience → professional diagnostics</Pill>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Learn HVAC like a game.
              <br />
              <span className="text-gradient">Diagnose like a pro.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              {BRAND.name} turns the HVAC trade into 5-minute interactive lessons, arcade-style games and a realistic field simulator where you run real service calls — with real meters, real readings and real consequences.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href="/register" size="lg">
                Start learning free <ArrowRight size={18} />
              </LinkButton>
              <LinkButton href="#simulator" size="lg" variant="secondary">
                See the Field Simulator
              </LinkButton>
            </div>
            <div className="mt-8 grid max-w-md grid-cols-3 gap-4 text-center">
              {[
                [String(lessonCount), "lessons"],
                [`${questionCount}+`, "practice questions"],
                [String(SCENARIOS.length), "field service calls"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-display text-3xl font-bold text-white">{n}</div>
                  <div className="text-xs text-slate-400">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-3xl p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="text-sm font-semibold text-white">Try it: the refrigeration cycle</div>
              <Pill tone="ok">interactive</Pill>
            </div>
            <CycleExplorer />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Zap, title: "Learn in 5–15 minutes", text: "Plain-English explanations, visual diagrams and one small idea at a time. Every lesson ends with practice and instant explanations." },
            { icon: Stethoscope, title: "Practice on virtual equipment", text: "Inspect, measure and diagnose simulated systems. Wrong guesses cost the customer money — just like the real job." },
            { icon: Flame, title: "Come back every day", text: "Streaks, XP, badges, daily challenges and spaced review that resurfaces exactly what you struggled with." },
          ].map(({ icon: I, title, text }) => (
            <div key={title} className="glass rounded-2xl p-6">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-cool-500/15 text-cool-300">
                <I />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">{title}</h3>
              <p className="mt-2 text-slate-400">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Learning path */}
      <section id="path" className="border-y border-white/5 bg-ink-900/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-cool-400">The curriculum</div>
            <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">10 levels from &ldquo;what is HVAC?&rdquo; to master tech</h2>
            <p className="mt-3 text-slate-400">Built on industry references — ACCA manuals, EPA Section 608, OSHA safety guidance, NATE knowledge areas and manufacturer practice — with sources and revision dates on every lesson.</p>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {LEVELS.map((l) => (
              <div key={l.id} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${l.color}22`, color: l.color }}>
                    <Icon name={l.icon} size={18} />
                  </span>
                  <span className="text-xs font-bold text-slate-500">LEVEL {l.number}</span>
                </div>
                <div className="mt-3 font-semibold text-white">{l.title}</div>
                <div className="mt-1 text-xs text-slate-400">{l.tagline}</div>
                <div className="mt-2 text-xs text-slate-500">{BASE_CURRICULUM.lessonsByLevel.get(l.id)?.length} lessons</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulator */}
      <section id="simulator" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-heat-400">Field Simulator</div>
            <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">Run real service calls — before you touch real equipment</h2>
            <p className="mt-3 text-slate-400">Talk to the customer, inspect the thermostat, filter, air handler, condenser and panel, then pick your tools. Every meter reading comes from the simulated system&apos;s actual condition.</p>
            <ul className="mt-6 space-y-3">
              {[
                "Multimeter, clamp meter, manifold gauges, temperature probes, static pressure meter and leak detector",
                "Lockout/tagout, verifying zero voltage and discharging capacitors are part of the score",
                "Graded on your diagnostic process — evidence before repairs — not just the final answer",
                "Detailed debrief: why the fault is right and why the alternatives are less likely",
              ].map((t) => (
                <li key={t} className="flex gap-3 text-slate-300">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-ok-400" size={20} /> {t}
                </li>
              ))}
            </ul>
            <LinkButton href="/register" size="lg" variant="heat" className="mt-8">
              Take your first service call
            </LinkButton>
          </div>
          <div className="glass rounded-3xl p-5 font-mono text-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-sans font-semibold text-white">Service ticket #2187</span>
              <Pill tone="heat">in progress</Pill>
            </div>
            <div className="rounded-xl bg-white/[0.04] p-3 font-sans text-slate-200">&ldquo;My air conditioner runs all day, but my house never gets cool.&rdquo;</div>
            <div className="mt-3 space-y-2">
              {[
                ["Manometer · Total external static", "1.05 in. w.c.", "text-bad-400"],
                ["Manometer · Filter pressure drop", "0.62 in. w.c.", "text-bad-400"],
                ["Gauges · Suction pressure", "92 psig → 27.4 °F sat", "text-cool-300"],
                ["Probe · Suction line", "30 °F (SH ≈ 3 °F)", "text-cool-300"],
              ].map(([k, v, c]) => (
                <div key={k} className="flex items-center justify-between gap-3 rounded-lg border border-white/5 px-3 py-2">
                  <span className="text-slate-400">{k}</span>
                  <span className={`font-bold ${c}`}>{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-ok-400/30 bg-ok-500/10 p-3 font-sans text-sm text-green-100">
              <b>Debrief:</b> low airflow froze the coil. Low superheat rules out undercharge. Replace filter, thaw, then verify charge.
            </div>
          </div>
        </div>
      </section>

      {/* Games */}
      <section id="games" className="border-y border-white/5 bg-ink-900/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-cool-400">12 training games</div>
            <h2 className="mt-2 font-display text-3xl font-bold text-white sm:text-4xl">Genuinely interactive. Genuinely useful.</h2>
          </div>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {GAME_INFO.map((g) => (
              <div key={g.id} className="glass rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-cool-300">
                    <Icon name={g.icon} />
                  </span>
                  <span className="font-display text-2xl font-bold text-white/10">{g.letter}</span>
                </div>
                <div className="mt-3 font-semibold text-white">{g.title}</div>
                <div className="text-sm text-slate-400">{g.tagline}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Motivation + Cert prep + Safety */}
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-20 sm:px-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-6">
          <Trophy className="text-volt-400" />
          <h3 className="mt-3 font-display text-lg font-bold text-white">Rewards for doing it right</h3>
          <p className="mt-2 text-slate-400">XP, ranks, streaks and {BADGES.length} badges. Guessing and unsafe shortcuts earn nothing — evidence-based diagnosis and safety earn the most.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {BADGES.slice(0, 6).map((b) => (
              <Pill key={b.id} tone="volt">{b.title}</Pill>
            ))}
          </div>
        </div>
        <div className="glass rounded-2xl p-6">
          <GraduationCap className="text-cool-300" />
          <h3 className="mt-3 font-display text-lg font-bold text-white">Certification prep</h3>
          <p className="mt-2 text-slate-400">Timed practice exams with explanations for:</p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
            {CERT_TRACKS.map((t) => (
              <li key={t.id} className="flex gap-2">
                <Gauge size={16} className="mt-0.5 shrink-0 text-cool-400" /> {t.title}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Practice only — not an official certification. Not affiliated with any certifying body.</p>
        </div>
        <div className="glass rounded-2xl p-6">
          <ShieldCheck className="text-ok-400" />
          <h3 className="mt-3 font-display text-lg font-bold text-white">Safety built in</h3>
          <p className="mt-2 text-slate-400">Shock and arc hazards, capacitor discharge, lockout/tagout, refrigerant handling and EPA rules, brazing fire prevention, carbon monoxide, PPE and ladder safety are taught — and enforced in every simulation.</p>
          <p className="mt-3 text-sm text-slate-500">This is training software, not authorization to perform hazardous work. Practice here; work on real equipment under qualified supervision.</p>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-cool-400/30 bg-gradient-to-br from-ink-800 to-ink-900 p-10 text-center">
          <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[600px] -translate-x-1/2 rounded-full bg-cool-500/25 blur-3xl" />
          <h2 className="relative font-display text-3xl font-bold text-white sm:text-4xl">Your first lesson takes 6 minutes.</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-slate-300">Start with Level 1 today. No experience, no tools, no credit card.</p>
          <LinkButton href="/register" size="lg" className="relative mt-8">
            Create your free account <ArrowRight size={18} />
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
