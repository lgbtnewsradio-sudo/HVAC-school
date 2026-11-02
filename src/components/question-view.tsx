"use client";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import { ArrowDown, ArrowUp, Check, Lightbulb, X } from "lucide-react";
import type { PublicQuestion, Response, GradeResult } from "@/engine/grading";
import { Button } from "./ui";
import { Diagram } from "./diagrams";
import { RichText } from "./rich-text";

export type Graded = GradeResult & { firstAttempt?: boolean };

/** Interactive question for every question type. Grading happens on the server via onCheck. Give it a `key` per question so state resets. */
export function QuestionView({
  q,
  onCheck,
  onContinue,
  allowRetry = true,
  showHint = true,
  continueLabel = "Continue",
}: {
  q: PublicQuestion;
  onCheck: (r: Response) => Promise<Graded | { error: string }>;
  onContinue?: () => void;
  allowRetry?: boolean;
  showHint?: boolean;
  continueLabel?: string;
}) {
  const [resp, setResp] = useState<Response | null>(initial(q));
  const [result, setResult] = useState<Graded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(false);

  const ready = isReady(q, resp);
  async function check() {
    if (!ready || resp === null) return;
    setBusy(true);
    setError(null);
    const r = await onCheck(resp);
    setBusy(false);
    if ("error" in r) setError(r.error);
    else setResult(r);
  }
  const locked = !!result;

  return (
    <div className="animate-rise space-y-5">
      {q.visual && <Diagram name={q.visual} />}
      <h2 className="font-display text-xl font-semibold leading-snug text-white sm:text-2xl">{q.prompt}</h2>
      <div aria-live="polite">
        <Inputs q={q} resp={resp} setResp={setResp} locked={locked} />
      </div>
      {showHint && q.hint && !result && (
        <div>
          {hint ? (
            <div className="flex gap-2 rounded-xl bg-volt-400/10 p-3 text-sm text-yellow-100">
              <Lightbulb size={18} className="shrink-0 text-volt-400" aria-hidden /> {q.hint}
            </div>
          ) : (
            <button onClick={() => setHint(true)} className="focus-ring flex items-center gap-1.5 rounded-lg text-sm font-semibold text-volt-400 hover:text-yellow-200">
              <Lightbulb size={16} aria-hidden /> Show a hint
            </button>
          )}
        </div>
      )}
      {error && <div className="rounded-xl bg-bad-500/10 p-3 text-sm text-red-200" role="alert">{error}</div>}
      {result && <Feedback r={result} />}
      <div className="flex flex-wrap gap-3">
        {!result && (
          <Button onClick={check} disabled={!ready || busy} size="lg" className="w-full sm:w-auto">
            {busy ? "Checking…" : "Check answer"}
          </Button>
        )}
        {result && !result.correct && allowRetry && (
          <Button variant="secondary" size="lg" onClick={() => { setResult(null); }} className="w-full sm:w-auto">
            Try again
          </Button>
        )}
        {result && (result.correct || !allowRetry) && onContinue && (
          <Button size="lg" variant={result.correct ? "success" : "primary"} onClick={onContinue} className="w-full sm:w-auto" autoFocus>
            {continueLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function initial(q: PublicQuestion): Response | null {
  if (q.type === "order") return q.items.map((i) => i.id);
  if (q.type === "match") return {};
  if (q.type === "multi") return [];
  return null;
}

function isReady(q: PublicQuestion, r: Response | null) {
  if (r === null) return false;
  if (q.type === "multi") return Array.isArray(r) && r.length > 0;
  if (q.type === "match") return Object.keys(r as object).length === q.left.length;
  if (q.type === "numeric") return r !== "" && Number.isFinite(Number(r));
  return true;
}

function Feedback({ r }: { r: Graded }) {
  return (
    <div className={clsx("animate-pop rounded-2xl border p-4", r.correct ? "border-ok-400/40 bg-ok-500/10" : "border-bad-400/40 bg-bad-500/10")} role="status">
      <div className={clsx("flex items-center gap-2 font-bold", r.correct ? "text-ok-400" : "text-bad-400")}>
        {r.correct ? <Check size={20} aria-hidden /> : <X size={20} aria-hidden />}
        {r.correct ? pick(["Nice work!", "Correct!", "Exactly right.", "You've got it."], r.explanation) : r.score > 0 ? "Partly right" : "Not quite"}
      </div>
      {!r.correct && <div className="mt-2 text-sm text-slate-200"><span className="font-semibold text-white">Answer: </span>{r.correctAnswer}</div>}
      {r.feedback.map((f) => (
        <div key={f.id} className={clsx("mt-2 text-sm", f.correct ? "text-green-100" : "text-red-100")}>• {f.text}</div>
      ))}
      <div className="mt-2 text-sm leading-relaxed text-slate-300"><RichText text={r.explanation} /></div>
    </div>
  );
}
const pick = (arr: string[], seed: string) => arr[seed.length % arr.length];

function Inputs({ q, resp, setResp, locked }: { q: PublicQuestion; resp: Response | null; setResp: (r: Response) => void; locked: boolean }) {
  if (q.type === "single" || q.type === "multi") {
    const multi = q.type === "multi";
    const sel = new Set(multi ? ((resp as string[]) ?? []) : resp ? [resp as string] : []);
    return (
      <div className="grid gap-3" role={multi ? "group" : "radiogroup"} aria-label="Answer choices">
        {multi && <div className="text-sm text-slate-400">Select all that apply.</div>}
        {q.options.map((o, i) => {
          const on = sel.has(o.id);
          return (
            <button
              key={o.id}
              type="button"
              disabled={locked}
              role={multi ? "checkbox" : "radio"}
              aria-checked={on}
              onClick={() => {
                if (multi) {
                  const s = new Set(sel);
                  if (s.has(o.id)) s.delete(o.id);
                  else s.add(o.id);
                  setResp([...s]);
                } else setResp(o.id);
              }}
              className={clsx("focus-ring flex min-h-14 items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left text-[15px] transition", on ? "border-cool-400 bg-cool-500/15 text-white" : "border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/25")}
            >
              <span className={clsx("grid h-7 w-7 shrink-0 place-items-center rounded-lg border text-xs font-bold", on ? "border-cool-400 bg-cool-400 text-ink-950" : "border-white/20 text-slate-400")}>{multi ? (on ? "✓" : "") : String.fromCharCode(65 + i)}</span>
              {o.text}
            </button>
          );
        })}
      </div>
    );
  }
  if (q.type === "truefalse") {
    return (
      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="True or false">
        {[true, false].map((v) => (
          <button key={String(v)} type="button" disabled={locked} role="radio" aria-checked={resp === v} onClick={() => setResp(v)} className={clsx("focus-ring h-16 rounded-2xl border-2 text-lg font-bold transition", resp === v ? "border-cool-400 bg-cool-500/15 text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25")}>
            {v ? "True" : "False"}
          </button>
        ))}
      </div>
    );
  }
  if (q.type === "numeric") {
    return (
      <label className="flex max-w-xs items-center gap-3">
        <span className="sr-only">Your answer</span>
        <input type="number" inputMode="decimal" step="any" disabled={locked} value={resp === null ? "" : String(resp)} onChange={(e) => setResp(e.target.value === "" ? (null as never) : Number(e.target.value))} className="focus-ring h-14 w-full rounded-2xl border-2 border-white/10 bg-white/[0.03] px-4 text-xl font-bold text-white" placeholder="0" />
        {q.unit && <span className="text-lg font-semibold text-slate-400">{q.unit}</span>}
      </label>
    );
  }
  if (q.type === "order") return <OrderInput items={q.items} order={(resp as string[]) ?? []} setOrder={(o) => setResp(o)} locked={locked} />;
  if (q.type !== "match") return null;
  return <MatchInput left={q.left} right={q.right} map={(resp as Record<string, string>) ?? {}} setMap={(m) => setResp(m)} locked={locked} />;
}

export function OrderInput({ items, order, setOrder, locked }: { items: { id: string; text: string }[]; order: string[]; setOrder: (o: string[]) => void; locked: boolean }) {
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    const o = [...order];
    [o[i], o[j]] = [o[j], o[i]];
    setOrder(o);
  };
  return (
    <ol className="grid gap-2" aria-label="Reorder the steps">
      {order.map((id, i) => (
        <li key={id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 pl-3">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-700 text-xs font-bold text-cool-300">{i + 1}</span>
          <span className="flex-1 text-[15px] text-slate-100">{byId.get(id)?.text}</span>
          <button type="button" disabled={locked || i === 0} onClick={() => move(i, -1)} className="focus-ring grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30" aria-label={`Move "${byId.get(id)?.text}" up`}>
            <ArrowUp size={18} />
          </button>
          <button type="button" disabled={locked || i === order.length - 1} onClick={() => move(i, 1)} className="focus-ring grid h-10 w-10 place-items-center rounded-xl bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30" aria-label={`Move "${byId.get(id)?.text}" down`}>
            <ArrowDown size={18} />
          </button>
        </li>
      ))}
    </ol>
  );
}

export function MatchInput({ left, right, map, setMap, locked }: { left: { id: string; text: string }[]; right: { id: string; text: string }[]; map: Record<string, string>; setMap: (m: Record<string, string>) => void; locked: boolean }) {
  const [active, setActive] = useState<string | null>(left[0]?.id ?? null);
  const usedRight = new Set(Object.values(map));
  const colors = ["#38bdf8", "#fb923c", "#4ade80", "#facc15", "#c084fc", "#f472b6", "#2dd4bf", "#f87171"];
  const colorOf = (leftId: string) => colors[left.findIndex((l) => l.id === leftId) % colors.length];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid content-start gap-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">1 · Tap an item</div>
        {left.map((l) => (
          <button key={l.id} type="button" disabled={locked} onClick={() => setActive(l.id)} aria-pressed={active === l.id} className={clsx("focus-ring min-h-12 rounded-xl border-2 px-3 py-2 text-left text-sm transition", active === l.id ? "border-white bg-white/10 text-white" : "border-white/10 bg-white/[0.03] text-slate-200")} style={map[l.id] ? { borderColor: colorOf(l.id) } : undefined}>
            {l.text}
          </button>
        ))}
      </div>
      <div className="grid content-start gap-2">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">2 · Tap its match</div>
        {right.map((r) => {
          const owner = Object.entries(map).find(([, v]) => v === r.id)?.[0];
          return (
            <button
              key={r.id}
              type="button"
              disabled={locked || !active}
              onClick={() => {
                if (!active) return;
                const m = { ...map };
                for (const k of Object.keys(m)) if (m[k] === r.id) delete m[k];
                m[active] = r.id;
                setMap(m);
                const nextLeft = left.find((l) => !m[l.id]);
                setActive(nextLeft?.id ?? null);
              }}
              className={clsx("focus-ring min-h-12 rounded-xl border-2 px-3 py-2 text-left text-sm transition", usedRight.has(r.id) ? "text-white" : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25")}
              style={owner ? { borderColor: colorOf(owner), background: `${colorOf(owner)}1a` } : undefined}
            >
              {r.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
