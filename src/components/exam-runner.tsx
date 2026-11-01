"use client";
import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import type { PublicQuestion, Response } from "@/engine/grading";
import { startExamAction, submitExamAction, touchPathAction } from "@/app/actions";
import { Button, Card, LinkButton, Notice, Pill, Progress } from "./ui";
import { MatchInput, OrderInput } from "./question-view";

type Started = { runId: string; title: string; minutes: number; passMark: number; disclaimer: string | null; deadline: number; questions: PublicQuestion[] };
type Result = { score: number; total: number; pct: number; passed: boolean; overtime: boolean; passMark: number; xp: number; results: { id: string; correct: boolean; prompt: string; explanation: string; correctAnswer: string }[]; certificates: { id: string; levelId: string }[] };

export function ExamRunner({ examKey, title, intro, count, minutes, passMark, disclaimer }: { examKey: string; title: string; intro: string; count: number; minutes: number; passMark: number; disclaimer?: string | null }) {
  const [exam, setExam] = useState<Started | null>(null);
  const [resp, setResp] = useState<Record<string, Response>>({});
  const [i, setI] = useState(0);
  const [res, setRes] = useState<Result | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const submitted = useRef(false);
  useEffect(() => {
    touchPathAction(`/exams/${examKey}`);
  }, [examKey]);
  const submitRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!exam) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= exam.deadline) submitRef.current();
    }, 1000);
    return () => clearInterval(t);
  }, [exam]);

  async function start() {
    setBusy(true);
    setErr(null);
    const r = await startExamAction(examKey);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    submitted.current = false;
    setExam(r);
    setResp({});
    setI(0);
    setRes(null);
  }
  async function submit() {
    if (!exam || submitted.current) return;
    submitted.current = true;
    setBusy(true);
    const r = await submitExamAction(exam.runId, resp);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setRes(r);
    setExam(null);
    window.scrollTo({ top: 0 });
  }
  useEffect(() => {
    submitRef.current = submit;
  });
  const left = exam ? Math.max(0, Math.floor((exam.deadline - now) / 1000)) : 0;

  if (res)
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="text-center">
          <div className={clsx("font-display text-5xl font-bold", res.passed ? "text-ok-400" : "text-bad-400")}>{res.pct}%</div>
          <div className="mt-1 text-white">
            {res.score}/{res.total} correct · {res.passed ? "Passed" : res.overtime ? "Time expired" : `Pass mark ${res.passMark}%`}
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {res.xp > 0 && <Pill tone="cool">+{res.xp} XP</Pill>}
            {res.certificates.map((c) => (
              <LinkButton key={c.id} href={`/certificates/${c.id}`} size="sm" variant="success">
                View your new certificate
              </LinkButton>
            ))}
          </div>
          {disclaimer && <p className="mt-4 text-xs text-slate-500">{disclaimer}</p>}
        </Card>
        {res.results.map((r, k) => (
          <div key={r.id} className={clsx("rounded-xl border p-4", r.correct ? "border-ok-400/30 bg-ok-500/[0.06]" : "border-bad-400/30 bg-bad-500/[0.06]")}>
            <div className="flex gap-2 font-semibold text-white">
              {r.correct ? <CheckCircle2 className="shrink-0 text-ok-400" size={18} /> : <XCircle className="shrink-0 text-bad-400" size={18} />}
              {k + 1}. {r.prompt}
            </div>
            {!r.correct && <div className="mt-1 text-sm text-slate-200">Answer: {r.correctAnswer}</div>}
            <div className="mt-1 text-sm text-slate-400">{r.explanation}</div>
          </div>
        ))}
        <div className="flex gap-3">
          <Button onClick={start}>Retake</Button>
          <LinkButton href="/exams" variant="secondary">All exams</LinkButton>
        </div>
      </div>
    );

  if (!exam)
    return (
      <Card className="mx-auto max-w-2xl space-y-4">
        <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
        <p className="text-slate-300">{intro}</p>
        <div className="flex flex-wrap gap-2">
          <Pill>{count} questions</Pill>
          <Pill>
            <Clock size={14} /> {minutes} minutes
          </Pill>
          <Pill tone="cool">Pass {passMark}%</Pill>
        </div>
        {disclaimer && <Notice tone="volt">{disclaimer}</Notice>}
        {err && <Notice tone="bad">{err}</Notice>}
        <Button size="lg" onClick={start} disabled={busy}>
          {busy ? "Preparing…" : "Start timed exam"}
        </Button>
      </Card>
    );

  const q = exam.questions[i];
  const answered = Object.keys(resp).length;
  const set = (r: Response) => setResp({ ...resp, [q.id]: r });
  const cur = resp[q.id];
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Progress value={(answered / exam.questions.length) * 100} label="Answered" />
        <Pill tone={left < 120 ? "bad" : "slate"}>
          <Clock size={14} /> {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
        </Pill>
      </div>
      <Card className="space-y-4">
        <div className="text-sm text-slate-400">
          Question {i + 1} of {exam.questions.length}
        </div>
        <h2 className="font-display text-xl font-semibold text-white">{q.prompt}</h2>
        {(q.type === "single" || q.type === "multi") && (
          <div className="grid gap-2">
            {q.type === "multi" && <div className="text-sm text-slate-400">Select all that apply.</div>}
            {q.options.map((o) => {
              const on = q.type === "multi" ? ((cur as string[]) ?? []).includes(o.id) : cur === o.id;
              return (
                <button key={o.id} onClick={() => (q.type === "multi" ? set(on ? ((cur as string[]) ?? []).filter((x) => x !== o.id) : [...((cur as string[]) ?? []), o.id]) : set(o.id))} aria-pressed={on} className={clsx("focus-ring rounded-xl border-2 px-4 py-3 text-left", on ? "border-cool-400 bg-cool-500/15 text-white" : "border-white/10 text-slate-200")}>
                  {o.text}
                </button>
              );
            })}
          </div>
        )}
        {q.type === "truefalse" && (
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map((v) => (
              <button key={String(v)} onClick={() => set(v)} aria-pressed={cur === v} className={clsx("focus-ring h-14 rounded-xl border-2 font-bold", cur === v ? "border-cool-400 bg-cool-500/15 text-white" : "border-white/10 text-slate-300")}>
                {v ? "True" : "False"}
              </button>
            ))}
          </div>
        )}
        {q.type === "numeric" && (
          <label className="flex max-w-xs items-center gap-2">
            <input type="number" inputMode="decimal" value={cur === undefined ? "" : String(cur)} onChange={(e) => set(e.target.value === "" ? (undefined as never) : Number(e.target.value))} className="focus-ring h-12 w-full rounded-xl border border-white/10 bg-ink-800 px-3 text-lg font-bold text-white" aria-label="Your answer" />
            {q.unit && <span className="text-slate-400">{q.unit}</span>}
          </label>
        )}
        {q.type === "order" && <OrderInput items={q.items} order={(cur as string[]) ?? q.items.map((x) => x.id)} setOrder={(o) => set(o)} locked={false} />}
        {q.type === "match" && <MatchInput left={q.left} right={q.right} map={(cur as Record<string, string>) ?? {}} setMap={(m) => set(m)} locked={false} />}
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</Button>
        {i + 1 < exam.questions.length ? <Button onClick={() => setI(i + 1)}>Next</Button> : <Button variant="success" onClick={submit} disabled={busy}>Submit exam</Button>}
        <span className="ml-auto self-center text-sm text-slate-400">
          {answered}/{exam.questions.length} answered
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {exam.questions.map((x, k) => (
          <button key={x.id} onClick={() => setI(k)} className={clsx("h-8 w-8 rounded-lg text-xs font-bold", k === i ? "bg-cool-500 text-ink-950" : resp[x.id] !== undefined ? "bg-white/15 text-white" : "bg-white/5 text-slate-500")} aria-label={`Go to question ${k + 1}`}>
            {k + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
