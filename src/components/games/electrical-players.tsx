"use client";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { Trash2 } from "lucide-react";
import { gameActionAction } from "@/app/actions";
import { Button, Card, Notice } from "../ui";
import type { PlayerProps } from "./shell";

type WiringPuzzle = {
  puzzle: { id: string; title: string; brief: string; devices: { id: string; label: string; x: number; y: number }[]; terminals: { id: string; label: string; device: string }[] };
  netCount: number;
};
const WIRE_COLORS = ["#ef4444", "#3b82f6", "#eab308", "#22c55e", "#f8fafc", "#f97316", "#a855f7", "#14b8a6"];

export function WireItRightPlayer({ puzzle: { puzzle }, submit, busy }: PlayerProps<WiringPuzzle>) {
  const [wires, setWires] = useState<[string, string][]>([]);
  const [first, setFirst] = useState<string | null>(null);
  const W = 1000;
  const H = 560;
  const layout = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    const boxes = puzzle.devices.map((d) => {
      const ts = puzzle.terminals.filter((t) => t.device === d.id);
      const bw = 170;
      const bh = 50 + ts.length * 34;
      const cx = (d.x / 100) * W;
      const cy = (d.y / 100) * H;
      const x = Math.min(Math.max(cx - bw / 2, 10), W - bw - 10);
      const y = Math.min(Math.max(cy - bh / 2, 10), H - bh - 10);
      ts.forEach((t, i) => pos.set(t.id, { x: x + bw / 2, y: y + 46 + i * 34 }));
      return { d, x, y, bw, bh, ts };
    });
    return { pos, boxes };
  }, [puzzle]);

  function tap(id: string) {
    if (!first) return setFirst(id);
    if (first === id) return setFirst(null);
    const exists = wires.some(([a, b]) => (a === first && b === id) || (a === id && b === first));
    if (!exists) setWires([...wires, [first, id]]);
    setFirst(null);
  }
  const label = (id: string) => {
    const t = puzzle.terminals.find((x) => x.id === id)!;
    return `${puzzle.devices.find((d) => d.id === t.device)!.label} ${t.label}`;
  };

  return (
    <Card className="space-y-4">
      <div>
        <div className="font-semibold text-white">{puzzle.title}</div>
        <p className="text-sm text-slate-400">{puzzle.brief}</p>
        <p className="mt-1 text-xs text-slate-500">Tap one terminal, then another, to run a wire. A terminal can hold several wires.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-ink-900">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[640px]" role="img" aria-label="Wiring board">
          {layout.boxes.map(({ d, x, y, bw, bh }) => (
            <g key={d.id}>
              <rect x={x} y={y} width={bw} height={bh} rx={14} fill="#12203d" stroke="#3d5285" strokeWidth={2} />
              <text x={x + bw / 2} y={y + 26} textAnchor="middle" fill="#fff" fontSize={16} fontWeight={700}>
                {d.label}
              </text>
            </g>
          ))}
          {wires.map(([a, b], i) => {
            const p = layout.pos.get(a)!;
            const q = layout.pos.get(b)!;
            const mx = (p.x + q.x) / 2;
            return <path key={i} d={`M${p.x} ${p.y} C${mx} ${p.y} ${mx} ${q.y} ${q.x} ${q.y}`} stroke={WIRE_COLORS[i % WIRE_COLORS.length]} strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.9} />;
          })}
          {puzzle.terminals.map((t) => {
            const p = layout.pos.get(t.id)!;
            const on = first === t.id;
            return (
              <g key={t.id} onClick={() => tap(t.id)} style={{ cursor: "pointer" }} role="button" tabIndex={0} aria-label={`Terminal ${label(t.id)}`} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && tap(t.id)}>
                <rect x={p.x - 70} y={p.y - 14} width={140} height={28} rx={8} fill={on ? "#facc1533" : "#0a1428"} stroke={on ? "#facc15" : "#2a3d66"} />
                <circle cx={p.x - 52} cy={p.y} r={9} fill={on ? "#facc15" : "#94a3b8"} />
                <text x={p.x - 36} y={p.y + 5} fill="#e2e8f0" fontSize={14} fontWeight={600}>
                  {t.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      {first && <Notice tone="volt">Selected: {label(first)} — now tap where the wire goes.</Notice>}
      {wires.length > 0 && (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {wires.map(([a, b], i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-1.5 text-sm text-slate-200">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: WIRE_COLORS[i % WIRE_COLORS.length] }} />
              <span className="flex-1">
                {label(a)} → {label(b)}
              </span>
              <button onClick={() => setWires(wires.filter((_, j) => j !== i))} className="focus-ring rounded p-1 text-slate-400 hover:text-bad-400" aria-label="Remove wire">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button size="lg" disabled={busy || wires.length === 0} onClick={() => submit(wires)}>
        Energize & test my wiring
      </Button>
    </Card>
  );
}

type DetectivePuzzle = { rounds: { circuit: { id: string; title: string; supply: number; points: { id: string; label: string }[]; elements: { id: string; label: string; from: string; to: string; kind: "switch" | "load" }[] }; symptom: string }[] };

export function ElectricalDetectivePlayer({ runId, puzzle, submit, busy }: PlayerProps<DetectivePuzzle>) {
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [a, setA] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [readings, setReadings] = useState<{ a: string; b: string; v: number }[]>([]);
  const [pick, setPick] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [probing, setProbing] = useState(false);
  const r = puzzle.rounds[i];
  const c = r.circuit;
  const ptLabel = (id: string) => c.points.find((p) => p.id === id)?.label ?? id;

  async function probe() {
    if (!a || !b || a === b) return;
    setProbing(true);
    setErr(null);
    const res = await gameActionAction(runId, { t: "probe", round: i, a, b });
    setProbing(false);
    if (!res.ok) return setErr(res.error);
    setReadings([{ a, b, v: res.result as number }, ...readings]);
  }
  function next() {
    const ans = [...answers, pick!];
    setAnswers(ans);
    setReadings([]);
    setA(null);
    setB(null);
    setPick(null);
    if (i + 1 >= puzzle.rounds.length) submit({ rounds: ans.map((x) => ({ answer: x })) });
    else setI(i + 1);
  }

  const X0 = 60;
  const step = (1000 - 120) / c.elements.length;
  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-white">
          Circuit {i + 1}/{puzzle.rounds.length}: {c.title}
        </div>
      </div>
      <Notice tone="cool">{r.symptom} The circuit is live (simulated). Place your meter leads and find the open component.</Notice>
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-ink-900">
        <svg viewBox="0 0 1000 200" className="h-auto w-full min-w-[640px]" role="img" aria-label="Ladder circuit">
          <line x1={X0} y1={100} x2={1000 - X0} y2={100} stroke="#facc15" strokeWidth={3} />
          {c.elements.map((e, k) => {
            const x = X0 + step * k + step / 2;
            return (
              <g key={e.id}>
                <rect x={x - 60} y={78} width={120} height={44} rx={8} fill="#12203d" stroke={e.kind === "load" ? "#fb923c" : "#facc15"} strokeWidth={2} />
                <text x={x} y={105} textAnchor="middle" fontSize={13} fill="#e2e8f0">
                  {e.label.length > 18 ? e.label.slice(0, 17) + "…" : e.label}
                </text>
              </g>
            );
          })}
          {c.points.map((p, k) => {
            const x = X0 + step * k;
            const sel = p.id === a || p.id === b;
            return (
              <g key={p.id} onClick={() => (!a ? setA(p.id) : !b && p.id !== a ? setB(p.id) : (setA(p.id), setB(null)))} style={{ cursor: "pointer" }} role="button" tabIndex={0} aria-label={`Test point ${p.label}`} onKeyDown={(ev) => ev.key === "Enter" && (!a ? setA(p.id) : setB(p.id))}>
                <circle cx={x} cy={100} r={13} fill={p.id === a ? "#ef4444" : p.id === b ? "#0f172a" : "#facc15"} stroke={sel ? "#fff" : "#0a1428"} strokeWidth={3} />
                <text x={x} y={150} textAnchor="middle" fontSize={12} fill="#94a3b8">
                  {p.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <span>
          Red lead: <b className="text-white">{a ? ptLabel(a) : "tap a point"}</b>
        </span>
        <span>
          Black lead: <b className="text-white">{b ? ptLabel(b) : "tap a point"}</b>
        </span>
        <Button size="sm" disabled={!a || !b || probing} onClick={probe}>
          Read meter (V~)
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setA(null); setB(null); }}>
          Clear leads
        </Button>
      </div>
      {err && <Notice tone="bad">{err}</Notice>}
      {readings.length > 0 && (
        <div className="space-y-1">
          {readings.map((x, k) => (
            <div key={k} className="flex justify-between rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-sm">
              <span className="text-slate-400">
                {x.a} → {x.b}
              </span>
              <span className="font-bold text-volt-400">{x.v} VAC</span>
            </div>
          ))}
        </div>
      )}
      <div>
        <div className="mb-2 text-sm font-semibold text-white">Which component is open?</div>
        <div className="flex flex-wrap gap-2">
          {c.elements.map((e) => (
            <button key={e.id} onClick={() => setPick(e.id)} aria-pressed={pick === e.id} className={clsx("focus-ring rounded-xl border-2 px-3 py-2 text-sm", pick === e.id ? "border-cool-400 bg-cool-500/15 text-white" : "border-white/10 text-slate-200")}>
              {e.label}
            </button>
          ))}
        </div>
      </div>
      <Button size="lg" disabled={!pick || busy} onClick={next}>
        {i + 1 >= puzzle.rounds.length ? "Finish" : "Lock in & next circuit"}
      </Button>
    </Card>
  );
}
