"use client";
import { useEffect, useState, type ReactNode } from "react";
import { clsx } from "clsx";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { startGameAction, submitGameAction, touchPathAction } from "@/app/actions";
import type { GameInfo } from "@/engine/games";
import type { GameResult } from "@/engine/games/core";
import { Button, Card, LinkButton, Notice, Pill } from "../ui";
import { Icon } from "../icon";

type Started = { runId: string; puzzle: unknown; timeLimit: number | null };
type Graded = GameResult & { xp: number; repeatPlay: boolean; badges: { id: string; title: string; xp: number }[]; challenges: { title: string; xp: number }[] };

export type PlayerProps<P = unknown> = { runId: string; puzzle: P; submit: (submission: unknown) => Promise<void>; busy: boolean };

export function GameShell({ info, render }: { info: GameInfo; render: (p: PlayerProps<never>) => ReactNode }) {
  const [run, setRun] = useState<Started | null>(null);
  const [result, setResult] = useState<Graded | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [key, setKey] = useState(0);
  useEffect(() => {
    touchPathAction(`/games/${info.id}`);
  }, [info.id]);

  async function start() {
    setBusy(true);
    setErr(null);
    setResult(null);
    const r = await startGameAction(info.id);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setRun({ runId: r.runId, puzzle: r.puzzle, timeLimit: r.timeLimit });
    setKey((k) => k + 1);
  }
  async function submit(sub: unknown) {
    if (!run) return;
    setBusy(true);
    const r = await submitGameAction(run.runId, sub);
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setResult(r);
    setRun(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cool-500/15 text-cool-300">
          <Icon name={info.icon} />
        </span>
        <div className="flex-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Game {info.letter}</div>
          <h1 className="font-display text-2xl font-bold text-white">{info.title}</h1>
        </div>
        {info.timeLimit && <Pill tone="heat">{info.timeLimit}s</Pill>}
      </div>
      {err && <Notice tone="bad">{err}</Notice>}
      {!run && !result && (
        <Card className="space-y-4">
          <p className="text-lg text-slate-300">{info.description}</p>
          <p className="text-sm text-slate-500">XP is based on your score. Your first play each day earns full XP; replays earn less. Scores below 40% earn no XP.</p>
          <Button size="lg" onClick={start} disabled={busy}>
            {busy ? "Loading…" : "Play"}
          </Button>
        </Card>
      )}
      {run && <div key={key}>{render({ runId: run.runId, puzzle: run.puzzle as never, submit, busy })}</div>}
      {result && (
        <div className="space-y-4">
          <Card className="text-center">
            <div className="font-display text-5xl font-bold text-white">
              {result.score}
              <span className="text-2xl text-slate-500">/{result.max}</span>
            </div>
            <div className="mt-1 text-slate-400">{result.summary ?? `${Math.round((result.score / Math.max(1, result.max)) * 100)}%`}</div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Pill tone="cool">+{result.xp} XP{result.repeatPlay ? " (replay)" : ""}</Pill>
              {result.badges.map((b) => (
                <Pill key={b.id} tone="volt">Badge: {b.title}</Pill>
              ))}
              {result.challenges.map((c) => (
                <Pill key={c.title} tone="pro">{c.title} +{c.xp}</Pill>
              ))}
            </div>
          </Card>
          <div className="space-y-2">
            {result.feedback.map((f, i) => (
              <div key={i} className={clsx("flex gap-3 rounded-xl border p-3", f.correct ? "border-ok-400/30 bg-ok-500/[0.07]" : "border-bad-400/30 bg-bad-500/[0.07]")}>
                {f.correct ? <CheckCircle2 className="mt-0.5 shrink-0 text-ok-400" size={18} /> : <XCircle className="mt-0.5 shrink-0 text-bad-400" size={18} />}
                <div>
                  <div className="font-semibold text-white">{f.title}</div>
                  <div className="text-sm text-slate-300">{f.detail}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button onClick={start} disabled={busy} size="lg">
              <RotateCcw size={18} /> Play again
            </Button>
            <LinkButton href="/games" variant="secondary" size="lg">
              All games
            </LinkButton>
          </div>
        </div>
      )}
    </div>
  );
}
