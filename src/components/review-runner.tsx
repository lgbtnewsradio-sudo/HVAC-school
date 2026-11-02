"use client";
import { useState } from "react";
import { Repeat } from "lucide-react";
import type { PublicQuestion } from "@/engine/grading";
import { answerReviewAction, startReviewAction } from "@/app/actions";
import { QuestionView } from "./question-view";
import { Button, Card, LinkButton, Notice, Progress } from "./ui";

export function ReviewRunner({ due }: { due: number }) {
  const [run, setRun] = useState<{ runId: string; questions: PublicQuestion[]; early: boolean } | null>(null);
  const [i, setI] = useState(0);
  const [stats, setStats] = useState({ correct: 0, xp: 0 });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [empty, setEmpty] = useState(false);

  async function start() {
    setBusy(true);
    const r = await startReviewAction();
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    if (!r.runId) return setEmpty(true);
    setRun({ runId: r.runId, questions: r.questions, early: r.early });
    setI(0);
    setStats({ correct: 0, xp: 0 });
  }

  if (empty)
    return (
      <Card className="text-center">
        <p className="text-slate-300">Nothing to review yet. Complete a lesson and the questions you answer will come back here at the right time.</p>
        <LinkButton href="/learn" className="mt-4">Go to lessons</LinkButton>
      </Card>
    );
  if (!run)
    return (
      <Card className="space-y-4 text-center">
        <Repeat className="mx-auto text-cool-300" size={40} />
        <div className="font-display text-4xl font-bold text-white">{due}</div>
        <p className="text-slate-300">{due ? "concepts are due. Missed questions come back sooner; mastered ones space out over weeks." : "Nothing is due right now — you can still practice the cards coming up next."}</p>
        {err && <Notice tone="bad">{err}</Notice>}
        <Button size="lg" onClick={start} disabled={busy}>
          {busy ? "Loading…" : due ? "Start review" : "Practice anyway"}
        </Button>
      </Card>
    );
  if (i >= run.questions.length)
    return (
      <Card className="space-y-3 text-center">
        <div className="font-display text-3xl font-bold text-white">Review complete</div>
        <p className="text-slate-300">
          {stats.correct}/{run.questions.length} correct · +{stats.xp} XP
        </p>
        <div className="flex justify-center gap-3">
          <Button onClick={start}>Another round</Button>
          <LinkButton href="/dashboard" variant="secondary">Dashboard</LinkButton>
        </div>
      </Card>
    );
  const q = run.questions[i];
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {run.early && <Notice tone="cool">Nothing was due, so these are your next upcoming cards.</Notice>}
      <Progress value={(i / run.questions.length) * 100} label="Review progress" />
      <QuestionView
        key={q.id + i}
        q={q}
        allowRetry={false}
        onCheck={async (resp) => {
          const r = await answerReviewAction(run.runId, q.id, resp);
          if (!r.ok) return { error: r.error };
          setStats((s) => ({ correct: s.correct + (r.correct ? 1 : 0), xp: s.xp + r.xp }));
          return r;
        }}
        onContinue={() => setI(i + 1)}
      />
    </div>
  );
}
