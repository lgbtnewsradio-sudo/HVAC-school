"use client";
import { useState } from "react";
import { clsx } from "clsx";
import { Button, Card, Progress } from "../ui";
import { PartArt } from "../part-art";
import { MatchInput } from "../question-view";
import type { PlayerProps } from "./shell";

type NtpPuzzle = { rounds: { image: string; names: { id: string; text: string }[]; purposes: { id: string; text: string }[] }[] };
export function NameThatPartPlayer({ puzzle, submit, busy }: PlayerProps<NtpPuzzle>) {
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<{ name: string; purpose: string }[]>([]);
  const [name, setName] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<string | null>(null);
  const r = puzzle.rounds[i];
  const next = () => {
    const a = [...ans, { name: name!, purpose: purpose! }];
    setAns(a);
    setName(null);
    setPurpose(null);
    if (i + 1 >= puzzle.rounds.length) submit(a);
    else setI(i + 1);
  };
  return (
    <Card className="space-y-5">
      <Progress value={(i / puzzle.rounds.length) * 100} label="Round progress" />
      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        <PartArt id={r.image} className="mx-auto w-48 md:w-full" />
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-300">1. What is this part?</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {r.names.map((n) => (
                <button key={n.id} onClick={() => setName(n.id)} aria-pressed={name === n.id} className={clsx("focus-ring rounded-xl border-2 px-3 py-2.5 text-left text-sm", name === n.id ? "border-cool-400 bg-cool-500/15 text-white" : "border-white/10 text-slate-200 hover:border-white/25")}>
                  {n.text}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-300">2. What does it do?</div>
            <div className="grid gap-2">
              {r.purposes.map((n) => (
                <button key={n.id} onClick={() => setPurpose(n.id)} aria-pressed={purpose === n.id} className={clsx("focus-ring rounded-xl border-2 px-3 py-2.5 text-left text-sm", purpose === n.id ? "border-cool-400 bg-cool-500/15 text-white" : "border-white/10 text-slate-200 hover:border-white/25")}>
                  {n.text}
                </button>
              ))}
            </div>
          </div>
          <Button size="lg" disabled={!name || !purpose || busy} onClick={next}>
            {i + 1 >= puzzle.rounds.length ? "Finish" : "Next part"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

type BuildPuzzle = { layout: { id: string; title: string; brief: string; slots: { id: string; x: number; y: number; hint: string }[] }; parts: { id: string; name: string }[] };
export function BuildSystemPlayer({ puzzle, submit, busy }: PlayerProps<BuildPuzzle>) {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [held, setHeld] = useState<string | null>(null);
  const used = new Set(Object.values(placed));
  const nameOf = (id: string) => puzzle.parts.find((p) => p.id === id)?.name;
  const drop = (slot: string, part: string | null) => {
    if (!part) return;
    const m = { ...placed };
    for (const k of Object.keys(m)) if (m[k] === part) delete m[k];
    m[slot] = part;
    setPlaced(m);
    setHeld(null);
  };
  const s = puzzle.layout.slots;
  return (
    <Card className="space-y-4">
      <div>
        <div className="font-semibold text-white">{puzzle.layout.title}</div>
        <p className="text-sm text-slate-400">{puzzle.layout.brief} Tap a part, then tap a slot (or drag on desktop).</p>
      </div>
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-ink-900">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
          <polygon points={s.map((x) => `${x.x},${x.y}`).join(" ")} fill="none" stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="0.8" strokeDasharray="2 1.5" className="animate-flow" />
        </svg>
        <div className="absolute left-2 top-2 rounded bg-cool-500/15 px-2 py-0.5 text-[10px] font-bold text-cool-300">INDOOR</div>
        <div className="absolute right-2 top-2 rounded bg-heat-500/15 px-2 py-0.5 text-[10px] font-bold text-heat-400">OUTDOOR</div>
        {s.map((slot, idx) => (
          <button
            key={slot.id}
            onClick={() => (held ? drop(slot.id, held) : placed[slot.id] && setPlaced(Object.fromEntries(Object.entries(placed).filter(([k]) => k !== slot.id))))}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(slot.id, e.dataTransfer.getData("text/plain"))}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            className={clsx("focus-ring absolute w-28 -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 px-2 py-2 text-center text-xs sm:w-36 sm:text-sm", placed[slot.id] ? "border-cool-400 bg-cool-500/20 text-white" : held ? "animate-pulse border-dashed border-volt-400 bg-ink-800 text-volt-400" : "border-dashed border-white/25 bg-ink-800/90 text-slate-400")}
            aria-label={`Slot ${idx + 1}: ${slot.hint}${placed[slot.id] ? `, holds ${nameOf(placed[slot.id])}` : ""}`}
          >
            <div className="text-[10px] text-slate-500">{slot.hint}</div>
            <div className="font-semibold">{placed[slot.id] ? nameOf(placed[slot.id]) : "?"}</div>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {puzzle.parts.map((p) => (
          <button key={p.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", p.id)} onClick={() => setHeld(held === p.id ? null : p.id)} aria-pressed={held === p.id} className={clsx("focus-ring rounded-xl border px-3 py-2 text-sm", held === p.id ? "border-volt-400 bg-volt-400/15 text-white" : used.has(p.id) ? "border-white/5 text-slate-500" : "border-white/15 bg-white/[0.03] text-slate-200 hover:border-white/30")}>
            {p.name}
          </button>
        ))}
      </div>
      <Button size="lg" disabled={busy || Object.keys(placed).length === 0} onClick={() => submit(placed)}>
        Check my system
      </Button>
    </Card>
  );
}

type MatchPuzzle = { mode: "picture" | "function"; left: { id: string; text: string; image?: string }[]; right: { id: string; text: string }[] };
export function MatchComponentPlayer({ puzzle, submit, busy }: PlayerProps<MatchPuzzle>) {
  const [map, setMap] = useState<Record<string, string>>({});
  const left = puzzle.left.map((l, i) => ({ id: l.id, text: l.image ? `Picture ${i + 1}` : l.text }));
  return (
    <Card className="space-y-4">
      <p className="text-slate-300">{puzzle.mode === "picture" ? "Match each pictured part to its name." : "Match each component to its function."}</p>
      {puzzle.mode === "picture" && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {puzzle.left.map((l, i) => (
            <figure key={l.id} className="text-center">
              <PartArt id={l.image!} className="w-full" />
              <figcaption className="mt-1 text-xs font-bold text-slate-400">Picture {i + 1}</figcaption>
            </figure>
          ))}
        </div>
      )}
      <MatchInput left={left} right={puzzle.right} map={map} setMap={setMap} locked={false} />
      <Button size="lg" disabled={busy || Object.keys(map).length < left.length} onClick={() => submit(map)}>
        Check matches
      </Button>
    </Card>
  );
}
