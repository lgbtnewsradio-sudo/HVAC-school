"use client";
import { useState } from "react";
import { clsx } from "clsx";
import { FlaskConical } from "lucide-react";
import { gameActionAction } from "@/app/actions";
import { ptTable } from "@/engine/pt";
import { Button, Card, Notice, Pill } from "../ui";
import { OrderInput } from "../question-view";
import type { PlayerProps } from "./shell";

type FtfPuzzle = { rounds: { system: string; symptom: string; components: { id: string; label: string; test: string }[] }[]; tokens: number };
export function FindTheFaultPlayer({ runId, puzzle, submit, busy }: PlayerProps<FtfPuzzle>) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, string>>({});
  const [pick, setPick] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const r = puzzle.rounds[i];
  const used = Object.keys(results).length;
  async function test(id: string) {
    setErr(null);
    const res = await gameActionAction(runId, { t: "test", round: i, component: id });
    if (!res.ok) return setErr(res.error);
    setResults({ ...results, [id]: res.result as string });
  }
  function next() {
    const a = [...answers, pick!];
    setAnswers(a);
    setResults({});
    setPick(null);
    if (i + 1 >= puzzle.rounds.length) submit({ answers: a });
    else setI(i + 1);
  }
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <Pill>
          System {i + 1}/{puzzle.rounds.length}: {r.system}
        </Pill>
        <Pill tone={used >= puzzle.tokens ? "bad" : "cool"}>
          <FlaskConical size={14} /> {puzzle.tokens - used} tests left
        </Pill>
      </div>
      <Notice tone="heat" title="Symptom">
        {r.symptom}
      </Notice>
      <div className="grid gap-3 sm:grid-cols-2">
        {r.components.map((c) => (
          <div key={c.id} className={clsx("rounded-2xl border-2 p-4", pick === c.id ? "border-cool-400 bg-cool-500/10" : "border-white/10 bg-white/[0.02]")}>
            <div className="font-semibold text-white">{c.label}</div>
            <div className="text-xs text-slate-500">Test: {c.test}</div>
            {results[c.id] ? (
              <div className="mt-2 rounded-lg bg-ink-900 p-2 font-mono text-sm text-volt-400">{results[c.id]}</div>
            ) : (
              <Button size="sm" variant="secondary" className="mt-2" disabled={used >= puzzle.tokens} onClick={() => test(c.id)}>
                Run test
              </Button>
            )}
            <button onClick={() => setPick(c.id)} aria-pressed={pick === c.id} className="focus-ring mt-2 block text-sm font-semibold text-cool-300 hover:text-cool-200">
              {pick === c.id ? "✓ Marked as failed" : "Mark as the failed part"}
            </button>
          </div>
        ))}
      </div>
      {err && <Notice tone="bad">{err}</Notice>}
      <Button size="lg" disabled={!pick || busy} onClick={next}>
        {i + 1 >= puzzle.rounds.length ? "Finish" : "Next system"}
      </Button>
    </Card>
  );
}

type PdCase = { refrigerant: string; metering: string; outdoor: number; returnAir: number; suction: number; suctionLine: number; liquid: number; liquidLine: number };
type PdPuzzle = { cases: PdCase[]; diagnoses: { id: string; label: string }[] };
export function PressureDetectivePlayer({ puzzle, submit, busy }: PlayerProps<PdPuzzle>) {
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<{ sh: number; sc: number; dx: string }[]>([]);
  const [sh, setSh] = useState("");
  const [sc, setSc] = useState("");
  const [dx, setDx] = useState<string | null>(null);
  const [chart, setChart] = useState(false);
  const c = puzzle.cases[i];
  function next() {
    const a = [...ans, { sh: Number(sh), sc: Number(sc), dx: dx! }];
    setAns(a);
    setSh("");
    setSc("");
    setDx(null);
    if (i + 1 >= puzzle.cases.length) submit(a);
    else setI(i + 1);
  }
  const field = "focus-ring h-12 w-full rounded-xl border border-white/10 bg-ink-800 px-3 text-lg font-bold text-white";
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill>
          Case {i + 1}/{puzzle.cases.length}
        </Pill>
        <Pill tone="cool">{c.refrigerant}</Pill>
        <Pill>{c.metering}</Pill>
        <span className="text-sm text-slate-400">
          Outdoor {c.outdoor} °F · Return air {c.returnAir} °F
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-cool-400/30 bg-cool-500/[0.07] p-4 font-mono">
          <div className="text-xs font-bold uppercase tracking-wider text-cool-300">Low side</div>
          <div className="mt-2 text-sm text-slate-300">Suction pressure</div>
          <div className="text-2xl font-bold text-white">{c.suction} psig</div>
          <div className="mt-2 text-sm text-slate-300">Suction line temp</div>
          <div className="text-2xl font-bold text-white">{c.suctionLine} °F</div>
        </div>
        <div className="rounded-2xl border border-heat-400/30 bg-heat-500/[0.07] p-4 font-mono">
          <div className="text-xs font-bold uppercase tracking-wider text-heat-400">High side</div>
          <div className="mt-2 text-sm text-slate-300">Liquid pressure</div>
          <div className="text-2xl font-bold text-white">{c.liquid} psig</div>
          <div className="mt-2 text-sm text-slate-300">Liquid line temp</div>
          <div className="text-2xl font-bold text-white">{c.liquidLine} °F</div>
        </div>
      </div>
      <button onClick={() => setChart(!chart)} className="focus-ring text-sm font-semibold text-cool-300 hover:text-cool-200">
        {chart ? "Hide" : "Show"} R-410A PT chart
      </button>
      {chart && (
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-ink-900 p-3 font-mono text-xs sm:grid-cols-7">
          {ptTable("R-410A").map(([t, p]) => (
            <div key={t} className="rounded bg-white/[0.03] px-2 py-1 text-slate-300">
              {t}°F <span className="text-white">{p}</span>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block text-sm text-slate-300">Superheat (°F, ±2)</span>
          <input className={field} inputMode="decimal" type="number" value={sh} onChange={(e) => setSh(e.target.value)} />
        </label>
        <label>
          <span className="mb-1 block text-sm text-slate-300">Subcooling (°F, ±2)</span>
          <input className={field} inputMode="decimal" type="number" value={sc} onChange={(e) => setSc(e.target.value)} />
        </label>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-white">Most likely condition</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {puzzle.diagnoses.map((d) => (
            <button key={d.id} onClick={() => setDx(d.id)} aria-pressed={dx === d.id} className={clsx("focus-ring rounded-xl border-2 px-3 py-2 text-left text-sm", dx === d.id ? "border-cool-400 bg-cool-500/15 text-white" : "border-white/10 text-slate-200")}>
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <Button size="lg" disabled={busy || sh === "" || sc === "" || !dx} onClick={next}>
        {i + 1 >= puzzle.cases.length ? "Finish" : "Next case"}
      </Button>
    </Card>
  );
}

type RsPuzzle = { tickets: { customer: string; equipment: string; notes: string[]; steps: string[] }[]; parts: { id: string; label: string; price: number }[] };
export function RepairShopPlayer({ puzzle, submit, busy }: PlayerProps<RsPuzzle>) {
  const [i, setI] = useState(0);
  const [done, setDone] = useState<{ parts: string[]; steps: string[] }[]>([]);
  const [parts, setParts] = useState<string[]>([]);
  const [steps, setSteps] = useState<string[]>(puzzle.tickets[0].steps);
  const t = puzzle.tickets[i];
  const total = parts.reduce((s, p) => s + (puzzle.parts.find((x) => x.id === p)?.price ?? 0), 0);
  function next() {
    const d = [...done, { parts, steps }];
    setDone(d);
    setParts([]);
    if (i + 1 >= puzzle.tickets.length) submit({ tickets: d });
    else {
      setI(i + 1);
      setSteps(puzzle.tickets[i + 1].steps);
    }
  }
  return (
    <Card className="space-y-5">
      <div className="rounded-2xl border border-white/10 bg-[#f8fafc] p-4 text-ink-950">
        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
          <span>Repair ticket {i + 1}/{puzzle.tickets.length}</span>
          <span>{t.customer}</span>
        </div>
        <div className="mt-1 font-semibold">{t.equipment}</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {t.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">1. Pull parts from the truck (only what&apos;s needed — maybe none)</span>
          <Pill tone={total ? "heat" : "slate"}>${total}</Pill>
        </div>
        <div className="flex flex-wrap gap-2">
          {puzzle.parts.map((p) => (
            <button key={p.id} onClick={() => setParts(parts.includes(p.id) ? parts.filter((x) => x !== p.id) : [...parts, p.id])} aria-pressed={parts.includes(p.id)} className={clsx("focus-ring rounded-xl border px-3 py-2 text-left text-sm", parts.includes(p.id) ? "border-cool-400 bg-cool-500/15 text-white" : "border-white/10 text-slate-300")}>
              {p.label} <span className="text-slate-500">${p.price}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm font-semibold text-white">2. Put the repair procedure in a safe order</div>
        <OrderInput items={t.steps.map((s) => ({ id: s, text: s }))} order={steps} setOrder={setSteps} locked={false} />
      </div>
      <Button size="lg" disabled={busy} onClick={next}>
        {i + 1 >= puzzle.tickets.length ? "Close out tickets" : "Next ticket"}
      </Button>
    </Card>
  );
}
