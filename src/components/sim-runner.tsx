"use client";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, ClipboardList, Clock, DollarSign, Eye, HelpCircle, Lightbulb, Lock, MessageCircle, Power, ShieldCheck, Unlock, Wrench, XCircle, Zap } from "lucide-react";
import type { PublicScenario, PublicSimState, SimScore } from "@/engine/sim/engine";
import { simActAction, startSimAction, touchPathAction } from "@/app/actions";
import { Button, Card, LinkButton, Notice, Pill } from "./ui";
import { Icon } from "./icon";

type Award = { xp: number; badges: { id: string; title: string; icon: string; xp: number }[]; challenges: { title: string; xp: number }[] };

export function SimLauncher({ scenario, mode }: { scenario: PublicScenario; mode: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [run, setRun] = useState<{ runId: string; scenario: PublicScenario; state: PublicSimState; mode: string } | null>(null);
  if (run) return <SimRunner {...run} />;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Ticket s={scenario} />
      <Card>
        <div className="mb-2 font-semibold text-white">Before you go</div>
        <ul className="space-y-1.5 text-sm text-slate-300">
          <li>• Gather evidence before replacing parts — guesses cost the customer money and cost you points.</li>
          <li>• Resistance and capacitance tests require lockout/tagout and verified zero voltage. Capacitors must be discharged.</li>
          <li>• Live voltage/amp readings in the simulator represent work by qualified technicians with proper PPE.</li>
          <li>• Verify the system works after your repair, then close the ticket with your diagnosis.</li>
        </ul>
        <div className="mt-3 text-xs text-slate-500">Mode: {mode === "advanced" ? "Advanced (no hints, +25% XP)" : "Beginner (hints available, −3 points each)"}</div>
      </Card>
      {err && <Notice tone="bad">{err}</Notice>}
      <Button
        size="lg"
        variant="heat"
        disabled={busy}
        className="w-full"
        onClick={async () => {
          setBusy(true);
          const r = await startSimAction(scenario.id);
          setBusy(false);
          if (!r.ok) return setErr(r.error);
          window.history.replaceState(null, "", `/simulator/${scenario.id}?run=${r.runId}`);
          touchPathAction(`/simulator/${scenario.id}?run=${r.runId}`);
          setRun(r);
        }}
      >
        {busy ? "Driving over…" : "Arrive on site"}
      </Button>
    </div>
  );
}

function Ticket({ s, compact }: { s: PublicScenario; compact?: boolean }) {
  return (
    <Card className="border-heat-400/20">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone="heat">Service call</Pill>
        <Pill>{["", "Beginner", "Intermediate", "Advanced"][s.level]}</Pill>
        <span className="text-sm text-slate-400">{s.customer}</span>
      </div>
      <p className={clsx("mt-3 font-display font-semibold text-white", compact ? "text-lg" : "text-2xl")}>&ldquo;{s.complaint}&rdquo;</p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
        {Object.entries({ Equipment: s.equipment.type, Age: s.equipment.age, Refrigerant: s.equipment.refrigerant, Metering: s.equipment.metering, Size: s.equipment.tonnage, Conditions: s.conditions }).map(
          ([k, v]) =>
            v && (
              <div key={k}>
                <dt className="text-xs text-slate-500">{k}</dt>
                <dd className="text-slate-200">{v}</dd>
              </div>
            ),
        )}
      </dl>
      {s.equipment.notes && <div className="mt-2 text-sm text-volt-400">Note: {s.equipment.notes}</div>}
    </Card>
  );
}

export function SimRunner({ runId, scenario: s, state: initial, mode, score: initialScore }: { runId: string; scenario: PublicScenario; state: PublicSimState; mode: string; score?: SimScore | null }) {
  const [st, setSt] = useState(initial);
  const [loc, setLoc] = useState(s.locations[0].id);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [score, setScore] = useState<SimScore | null>(initialScore ?? null);
  const [award, setAward] = useState<Award | null>(null);
  const [tab, setTab] = useState<"site" | "notes" | "repair">("site");
  const [closing, setClosing] = useState(false);
  const [causes, setCauses] = useState<string[]>([]);
  const [confirmRepair, setConfirmRepair] = useState<string | null>(null);

  useEffect(() => {
    if (score) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [score]);

  async function act(a: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    const r = await simActAction(runId, a);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setSt(r.state);
    if (r.score) {
      setScore(r.score);
      setAward({ xp: r.xp, badges: r.badges, challenges: r.challenges });
    } else if (window.innerWidth < 1024 && a.t !== "power" && a.t !== "verify-dead" && a.t !== "discharge") setTab("notes");
  }

  const asked = useMemo(() => new Set(st.log.filter((l) => l.action.t === "ask").map((l) => (l.action as { q: string }).q)), [st.log]);
  const measured = useMemo(() => new Set(st.log.filter((l) => l.action.t === "measure" && l.reading).map((l) => (l.action as { m: string }).m)), [st.log]);

  if (score) return <Debrief s={s} score={score} award={award} />;

  const locMeasures = s.measures.filter((m) => m.location === loc);
  const location = s.locations.find((l) => l.id === loc)!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-display text-xl font-bold text-white">{s.title}</h1>
        <Pill tone={st.power ? "volt" : "ok"}>
          {st.power ? <Zap size={14} /> : <Lock size={14} />} {st.power ? "Energized" : st.verifiedDead ? "Locked out · verified 0 V" : "Locked out"}
        </Pill>
        <Pill>
          <Clock size={14} /> {st.minute} min
        </Pill>
        <Pill tone={st.customerCost ? "heat" : "slate"}>
          <DollarSign size={14} />
          {st.customerCost}
        </Pill>
      </div>

      <div className="flex gap-1 rounded-xl bg-white/5 p-1 lg:hidden" role="tablist">
        {(["site", "notes", "repair"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("flex-1 rounded-lg py-2 text-sm font-semibold capitalize", tab === t ? "bg-cool-500 text-ink-950" : "text-slate-300")}>
            {t === "notes" ? `Notes (${st.log.length})` : t === "repair" ? "Repair & close" : "On site"}
          </button>
        ))}
      </div>

      {err && <Notice tone="bad">{err}</Notice>}

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className={clsx("space-y-4", tab !== "site" && "hidden lg:block")}>
          <details className="glass rounded-2xl p-4" open={st.log.length === 0}>
            <summary className="cursor-pointer font-semibold text-white">Service ticket</summary>
            <div className="mt-3">
              <Ticket s={s} compact />
            </div>
          </details>

          <Card>
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Walk the site</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {s.locations.map((l) => (
                <button key={l.id} onClick={() => setLoc(l.id)} aria-pressed={loc === l.id} className={clsx("focus-ring flex flex-col items-center gap-1 rounded-xl border p-3 text-center text-sm transition", loc === l.id ? "border-cool-400 bg-cool-500/15 text-white" : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/25")}>
                  <Icon name={l.icon} size={22} />
                  {l.label}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <div className="font-display text-lg font-bold text-white">{location.label}</div>
              <Button size="sm" variant="secondary" disabled={busy} onClick={() => act({ t: "inspect", loc })}>
                <Eye size={16} /> Visual inspection
              </Button>
            </div>
            {locMeasures.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {locMeasures.map((m) => {
                  const tool = s.tools.find((t) => t.id === m.tool)!;
                  return (
                    <button key={m.id} disabled={busy} onClick={() => act({ t: "measure", m: m.id })} className="focus-ring flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left hover:border-cool-400/40 hover:bg-white/[0.05] disabled:opacity-60">
                      <Icon name={tool.icon} className="mt-0.5 shrink-0 text-cool-300" size={18} />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-white">{m.label}</span>
                        <span className="text-xs text-slate-500">
                          {tool.label}
                          {m.power === "off" ? " · de-energized test" : m.power === "on" ? " · live test" : ""}
                        </span>
                      </span>
                      {measured.has(m.id) && <CheckCircle2 size={16} className="text-ok-400" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No instrument tests here — use a visual inspection.</p>
            )}
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <ShieldCheck size={16} /> Safety & power
            </div>
            <div className="flex flex-wrap gap-2">
              {st.power ? (
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => act({ t: "power", on: false })}>
                  <Lock size={16} /> Lock out & tag out
                </Button>
              ) : (
                <Button size="sm" variant="secondary" disabled={busy} onClick={() => act({ t: "power", on: true })}>
                  <Unlock size={16} /> Remove lock & restore power
                </Button>
              )}
              <Button size="sm" variant="secondary" disabled={busy || st.power || st.verifiedDead} onClick={() => act({ t: "verify-dead" })}>
                <Power size={16} /> Verify zero voltage
              </Button>
              <Button size="sm" variant="secondary" disabled={busy || st.capDischarged} onClick={() => act({ t: "discharge" })}>
                <Zap size={16} /> Discharge capacitors
              </Button>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <MessageCircle size={16} /> Ask the customer
            </div>
            <div className="flex flex-wrap gap-2">
              {s.questions.map((q) => (
                <button key={q.id} disabled={busy || asked.has(q.id)} onClick={() => act({ t: "ask", q: q.id })} className="focus-ring rounded-full border border-white/10 px-3 py-1.5 text-sm text-slate-200 hover:border-cool-400/40 disabled:border-transparent disabled:bg-white/5 disabled:text-slate-500">
                  {q.text}
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className={clsx("space-y-4", tab === "site" && "hidden lg:block")}>
          <div className={clsx(tab !== "notes" && "hidden lg:block")}>
            <Card className="lg:sticky lg:top-20">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <ClipboardList size={18} /> Field notes
                </div>
                {mode !== "advanced" && st.hintsUsed < s.hintsAvailable && (
                  <button disabled={busy} onClick={() => act({ t: "hint" })} className="focus-ring flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-volt-400 hover:bg-volt-400/10">
                    <Lightbulb size={16} /> Hint (−3)
                  </button>
                )}
              </div>
              <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1" aria-live="polite">
                {st.log.length === 0 && <p className="text-sm text-slate-500">Your findings will appear here. Start by talking to the customer or inspecting the equipment.</p>}
                {[...st.log].reverse().map((l, i) => (
                  <div key={st.log.length - i} className={clsx("animate-rise rounded-xl border p-3 text-sm", l.safety?.severity === "critical" ? "border-bad-400/50 bg-bad-500/10" : l.safety ? "border-volt-400/40 bg-volt-400/10" : l.outcome === "not-fixed" ? "border-heat-400/40 bg-heat-500/10" : l.outcome === "fixed" ? "border-ok-400/40 bg-ok-500/10" : "border-white/10 bg-white/[0.03]")}>
                    <div className="flex justify-between gap-2 text-xs text-slate-400">
                      <span>{l.title}</span>
                      <span className="shrink-0">{l.minute}m</span>
                    </div>
                    {l.reading && <div className="mt-1 font-mono text-lg font-bold text-white">{l.reading.value}</div>}
                    {l.text && <div className="mt-1 text-slate-200">{l.text}</div>}
                    {l.safety && (
                      <div className={clsx("mt-2 flex gap-2 text-sm font-medium", l.safety.severity === "critical" ? "text-red-200" : "text-yellow-100")}>
                        <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {l.safety.text}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <div className={clsx(tab !== "repair" && "hidden lg:block")}>
            <Card>
              <div className="mb-3 flex items-center gap-2 font-semibold text-white">
                <Wrench size={18} /> Repair
              </div>
              <div className="space-y-1.5">
                {s.repairs.map((r) => (
                  <div key={r.id}>
                    {confirmRepair === r.id ? (
                      <div className="flex items-center gap-2 rounded-xl border border-heat-400/40 bg-heat-500/10 p-2 text-sm">
                        <span className="flex-1 text-white">Bill ${r.cost} and perform this repair?</span>
                        <Button size="sm" variant="heat" disabled={busy} onClick={() => { setConfirmRepair(null); act({ t: "repair", r: r.id }); }}>Yes</Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmRepair(null)}>No</Button>
                      </div>
                    ) : (
                      <button disabled={busy} onClick={() => setConfirmRepair(r.id)} className="focus-ring flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/5">
                        <span>{r.label}</span>
                        <span className="shrink-0 text-slate-500">${r.cost}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 border-t border-white/10 pt-4">
                {!closing ? (
                  <Button className="w-full" onClick={() => setClosing(true)}>
                    Close ticket & submit diagnosis
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-white">Root cause(s) you found:</div>
                    {s.causes.map((c) => (
                      <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-white/5">
                        <input type="checkbox" className="h-4 w-4 accent-sky-400" checked={causes.includes(c.id)} onChange={() => setCauses(causes.includes(c.id) ? causes.filter((x) => x !== c.id) : [...causes, c.id])} />
                        {c.label}
                      </label>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Button disabled={busy || !causes.length} onClick={() => act({ t: "finish", causes })}>
                        Submit
                      </Button>
                      <Button variant="ghost" onClick={() => setClosing(false)}>
                        Cancel
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">Tip: did you verify the system works after your repair?</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Debrief({ s, score, award }: { s: PublicScenario; score: SimScore; award: Award | null }) {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Card className="text-center">
        <div className="text-sm text-slate-400">{s.title}</div>
        <div className={clsx("mt-2 font-display text-6xl font-bold", score.passed ? "text-ok-400" : "text-bad-400")}>{score.grade}</div>
        <div className="mt-1 text-lg text-white">{score.total}/100 · {score.passed ? "Call resolved" : "Needs another look"}</div>
        <div className="mt-2 text-sm text-slate-400">
          {score.minutes} minutes on site · customer billed ${score.customerCost}
          {score.unnecessaryCost ? ` (incl. $${score.unnecessaryCost} in unnecessary repairs)` : ""}
        </div>
        {award && (
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Pill tone="cool">+{award.xp} XP</Pill>
            {award.badges.map((b) => (
              <Pill key={b.id} tone="volt">Badge: {b.title} (+{b.xp})</Pill>
            ))}
            {award.challenges.map((c) => (
              <Pill key={c.title} tone="pro">{c.title} (+{c.xp})</Pill>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <h2 className="mb-3 font-display text-lg font-bold text-white">How you were scored</h2>
        <div className="space-y-2">
          {score.parts.map((p) => (
            <div key={p.key} className="flex items-start gap-3 rounded-xl bg-white/[0.03] p-3">
              {p.earned === p.max ? <CheckCircle2 className="mt-0.5 shrink-0 text-ok-400" size={18} /> : p.earned === 0 ? <XCircle className="mt-0.5 shrink-0 text-bad-400" size={18} /> : <HelpCircle className="mt-0.5 shrink-0 text-volt-400" size={18} />}
              <div className="flex-1">
                <div className="font-semibold text-white">{p.label}</div>
                <div className="text-sm text-slate-400">{p.note}</div>
              </div>
              <div className="font-mono font-bold text-white">
                {p.earned}/{p.max}
              </div>
            </div>
          ))}
        </div>
        {score.safetyNotes.length > 0 && (
          <div className="mt-3">
            <Notice tone="bad" title="Safety">Unsafe actions cap your score. {score.safetyNotes.join(". ")}.</Notice>
          </div>
        )}
      </Card>
      <Card>
        <h2 className="font-display text-lg font-bold text-white">The answer: {score.correctCauses.join(" + ")}</h2>
        <p className="mt-2 leading-relaxed text-slate-300">{score.explanation}</p>
        <h3 className="mt-4 font-semibold text-white">Why not something else?</h3>
        <ul className="mt-2 space-y-2">
          {score.differentials.map((d) => (
            <li key={d.cause} className="rounded-xl bg-white/[0.03] p-3 text-sm">
              <span className="font-semibold text-white">{d.cause}: </span>
              <span className="text-slate-300">{d.why}</span>
            </li>
          ))}
        </ul>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row">
        <LinkButton href={`/simulator/${s.id}`} variant="secondary" size="lg" className="flex-1">
          Run this call again
        </LinkButton>
        <LinkButton href="/simulator" size="lg" className="flex-1">
          Next service call
        </LinkButton>
      </div>
    </div>
  );
}
