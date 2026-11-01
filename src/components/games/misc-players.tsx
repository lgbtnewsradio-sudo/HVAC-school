"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle, Search, Timer } from "lucide-react";
import { gameActionAction } from "@/app/actions";
import type { PublicQuestion, Response } from "@/engine/grading";
import { Button, Card, Notice, Progress } from "../ui";
import { OrderInput } from "../question-view";
import type { PlayerProps } from "./shell";

// ---------- F: Crossword ----------
type CwPuzzle = { size: number; cells: string[]; entries: { n: number; row: number; col: number; dir: "across" | "down"; length: number; clue: string }[] };
export function CrosswordPlayer({ puzzle, submit, busy }: PlayerProps<CwPuzzle>) {
  const cells = useMemo(() => new Set(puzzle.cells), [puzzle.cells]);
  const [val, setVal] = useState<Record<string, string>>({});
  const [dir, setDir] = useState<"across" | "down">("across");
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const rows = puzzle.cells.map((c) => Number(c.split(",")[0]));
  const cols = puzzle.cells.map((c) => Number(c.split(",")[1]));
  const [r0, r1, c0, c1] = [Math.min(...rows), Math.max(...rows), Math.min(...cols), Math.max(...cols)];
  const numAt = new Map(puzzle.entries.map((e) => [`${e.row},${e.col}`, e.n]));
  const move = (k: string, d: number) => {
    const [r, c] = k.split(",").map(Number);
    const nk = dir === "across" ? `${r},${c + d}` : `${r + d},${c}`;
    if (cells.has(nk)) refs.current[nk]?.focus();
  };
  const filled = Object.values(val).filter(Boolean).length;
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
        Typing direction:
        {(["across", "down"] as const).map((d) => (
          <button key={d} onClick={() => setDir(d)} aria-pressed={dir === d} className={clsx("rounded-lg px-3 py-1 font-semibold capitalize", dir === d ? "bg-cool-500 text-ink-950" : "bg-white/5 text-slate-300")}>
            {d}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <div className="mx-auto grid w-max gap-0.5" style={{ gridTemplateColumns: `repeat(${c1 - c0 + 1}, 2.25rem)` }}>
          {Array.from({ length: r1 - r0 + 1 }, (_, ri) =>
            Array.from({ length: c1 - c0 + 1 }, (_, ci) => {
              const k = `${r0 + ri},${c0 + ci}`;
              if (!cells.has(k)) return <div key={k} className="h-9 w-9" />;
              return (
                <div key={k} className="relative h-9 w-9">
                  {numAt.has(k) && <span className="pointer-events-none absolute left-0.5 top-0 text-[9px] font-bold text-slate-500">{numAt.get(k)}</span>}
                  <input
                    ref={(el) => {
                      refs.current[k] = el;
                    }}
                    value={val[k] ?? ""}
                    maxLength={1}
                    aria-label={`Cell row ${r0 + ri + 1} column ${c0 + ci + 1}`}
                    onChange={(e) => {
                      const ch = e.target.value.replace(/[^a-z]/gi, "").slice(-1).toUpperCase();
                      setVal({ ...val, [k]: ch });
                      if (ch) move(k, 1);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !val[k]) move(k, -1);
                    }}
                    className="h-9 w-9 rounded bg-slate-100 text-center text-lg font-bold uppercase text-ink-950 outline-none focus:bg-cool-300"
                  />
                </div>
              );
            }),
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["across", "down"] as const).map((d) => (
          <div key={d}>
            <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">{d}</div>
            <ol className="space-y-1 text-sm text-slate-300">
              {puzzle.entries
                .filter((e) => e.dir === d)
                .sort((a, b) => a.n - b.n)
                .map((e) => (
                  <li key={`${e.n}${d}`}>
                    <button onClick={() => { setDir(d); refs.current[`${e.row},${e.col}`]?.focus(); }} className="text-left hover:text-white">
                      <b className="text-white">{e.n}.</b> {e.clue} ({e.length})
                    </button>
                  </li>
                ))}
            </ol>
          </div>
        ))}
      </div>
      <Button size="lg" disabled={busy || filled === 0} onClick={() => submit(val)}>
        Check puzzle
      </Button>
    </Card>
  );
}

// ---------- I: Installation challenge ----------
type IcPuzzle = { steps: string[]; inspection: { id: string; label: string }[]; decisions: { id: string; prompt: string; options: string[] }[] };
export function InstallationPlayer({ puzzle, submit, busy }: PlayerProps<IcPuzzle>) {
  const [phase, setPhase] = useState(0);
  const [steps, setSteps] = useState(puzzle.steps);
  const [mistakes, setMistakes] = useState<string[]>([]);
  const [decisions, setDecisions] = useState<(number | null)[]>(puzzle.decisions.map(() => null));
  return (
    <Card className="space-y-5">
      <Progress value={(phase / 3) * 100} label="Challenge progress" />
      {phase === 0 && (
        <div className="space-y-3">
          <div className="font-semibold text-white">Phase 1 · Sequence the installation</div>
          <OrderInput items={puzzle.steps.map((s) => ({ id: s, text: s }))} order={steps} setOrder={setSteps} locked={false} />
          <Button size="lg" onClick={() => setPhase(1)}>Next: inspect a finished job</Button>
        </div>
      )}
      {phase === 1 && (
        <div className="space-y-3">
          <div className="font-semibold text-white">Phase 2 · Final inspection — flag every mistake</div>
          <p className="text-sm text-slate-400">You&apos;re checking another crew&apos;s install. Flag only real problems.</p>
          <div className="grid gap-2">
            {puzzle.inspection.map((x) => (
              <label key={x.id} className={clsx("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm", mistakes.includes(x.id) ? "border-bad-400/50 bg-bad-500/10 text-white" : "border-white/10 text-slate-200")}>
                <input type="checkbox" className="h-5 w-5 accent-red-400" checked={mistakes.includes(x.id)} onChange={() => setMistakes(mistakes.includes(x.id) ? mistakes.filter((m) => m !== x.id) : [...mistakes, x.id])} />
                <Search size={16} className="shrink-0 text-slate-500" /> {x.label}
              </label>
            ))}
          </div>
          <Button size="lg" onClick={() => setPhase(2)}>Next: critical decisions</Button>
        </div>
      )}
      {phase === 2 && (
        <div className="space-y-4">
          <div className="font-semibold text-white">Phase 3 · Make the call</div>
          {puzzle.decisions.map((d, i) => (
            <fieldset key={d.id} className="space-y-2">
              <legend className="mb-1 text-sm font-semibold text-slate-200">{d.prompt}</legend>
              {d.options.map((o, j) => (
                <label key={j} className={clsx("flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm", decisions[i] === j ? "border-cool-400 bg-cool-500/10 text-white" : "border-white/10 text-slate-300")}>
                  <input type="radio" name={d.id} className="h-4 w-4 accent-sky-400" checked={decisions[i] === j} onChange={() => setDecisions(decisions.map((x, k) => (k === i ? j : x)))} />
                  {o}
                </label>
              ))}
            </fieldset>
          ))}
          <Notice tone="volt">Real installations must follow manufacturer instructions, applicable codes and local permitting requirements.</Notice>
          <Button size="lg" disabled={busy || decisions.some((d) => d === null)} onClick={() => submit({ steps, mistakes, decisions })}>
            Submit for inspection
          </Button>
        </div>
      )}
    </Card>
  );
}

// ---------- K: Speed round ----------
type SrPuzzle = { questions: PublicQuestion[]; seconds: number };
export function SpeedRoundPlayer({ puzzle, submit, busy }: PlayerProps<SrPuzzle>) {
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(puzzle.seconds);
  const answers = useRef<{ id: string; response: Response }[]>([]);
  const sent = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if ((left <= 0 || i >= puzzle.questions.length) && !sent.current) {
      sent.current = true;
      submit(answers.current);
    }
  }, [left, i, puzzle.questions.length, submit]);
  const q = puzzle.questions[i];
  const answer = (r: Response) => {
    answers.current.push({ id: q.id, response: r });
    setI(i + 1);
  };
  if (!q || left <= 0) return <Card className="text-center text-slate-300">{busy ? "Scoring…" : "Time!"}</Card>;
  return (
    <Card className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Question {i + 1}</span>
        <span className={clsx("flex items-center gap-1 font-mono text-2xl font-bold", left <= 10 ? "text-bad-400" : "text-white")}>
          <Timer size={22} /> {left}s
        </span>
      </div>
      <Progress value={(left / puzzle.seconds) * 100} color={left <= 10 ? "bg-bad-400" : "bg-heat-400"} label="Time remaining" />
      <h2 className="font-display text-xl font-semibold text-white">{q.prompt}</h2>
      {q.type === "truefalse" ? (
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" variant="secondary" onClick={() => answer(true)}>True</Button>
          <Button size="lg" variant="secondary" onClick={() => answer(false)}>False</Button>
        </div>
      ) : q.type === "single" ? (
        <div className="grid gap-2">
          {q.options.map((o) => (
            <button key={o.id} onClick={() => answer(o.id)} className="focus-ring min-h-12 rounded-xl border-2 border-white/10 bg-white/[0.03] px-4 py-2 text-left text-slate-100 hover:border-cool-400">
              {o.text}
            </button>
          ))}
        </div>
      ) : (
        <Button onClick={() => setI(i + 1)}>Skip</Button>
      )}
    </Card>
  );
}

// ---------- L: Mystery service call ----------
type MyNode = { id: string; text: string; choices: { text: string }[]; end?: { options: { id: string; text: string }[] } };
type MyPuzzle = { id: string; title: string; intro: string; node: MyNode };
export function MysteryPlayer({ runId, puzzle, submit, busy }: PlayerProps<MyPuzzle>) {
  const [node, setNode] = useState<MyNode>(puzzle.node);
  const [story, setStory] = useState<{ text: string; clue?: string | null; warning?: string | null; choice?: string }[]>([{ text: puzzle.node.text }]);
  const [clues, setClues] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [going, setGoing] = useState(false);
  async function choose(idx: number) {
    setGoing(true);
    setErr(null);
    const r = await gameActionAction(runId, { t: "choose", index: idx });
    setGoing(false);
    if (!r.ok) return setErr(r.error);
    const res = r.result as { node: MyNode; clue: string | null; warning: string | null };
    setStory([...story, { text: res.node.text, clue: res.clue, warning: res.warning, choice: node.choices[idx].text }]);
    if (res.clue) setClues([...clues, res.clue]);
    setNode(res.node);
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <Card className="space-y-4">
        <div className="text-sm italic text-slate-400">{puzzle.intro}</div>
        {story.map((s, i) => (
          <div key={i} className="animate-rise space-y-2">
            {s.choice && <div className="text-sm font-semibold text-cool-300">→ {s.choice}</div>}
            {s.warning && (
              <div className="flex gap-2 rounded-xl border border-bad-400/40 bg-bad-500/10 p-3 text-sm text-red-100">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {s.warning}
              </div>
            )}
            <p className="leading-relaxed text-slate-200">{s.text}</p>
          </div>
        ))}
        {err && <Notice tone="bad">{err}</Notice>}
        {node.end ? (
          <div className="space-y-2">
            {node.end.options.map((o) => (
              <button key={o.id} disabled={busy} onClick={() => submit({ ending: o.id })} className="focus-ring block w-full rounded-xl border-2 border-white/10 bg-white/[0.03] p-3 text-left text-slate-100 hover:border-cool-400">
                {o.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid gap-2">
            {node.choices.map((c, i) => (
              <button key={i} disabled={going} onClick={() => choose(i)} className="focus-ring rounded-xl border-2 border-white/10 bg-white/[0.03] p-3 text-left text-slate-100 hover:border-cool-400 disabled:opacity-50">
                {c.text}
              </button>
            ))}
          </div>
        )}
      </Card>
      <Card>
        <div className="mb-2 font-semibold text-white">Clue notebook</div>
        {clues.length ? (
          <ul className="space-y-2 text-sm text-volt-400">
            {clues.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Clues you uncover will appear here.</p>
        )}
      </Card>
    </div>
  );
}
