"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { clsx } from "clsx";
import { AlertTriangle, ArrowLeft, Bookmark, BookmarkCheck, Clock, Lightbulb, Trophy, X } from "lucide-react";
import type { PublicLesson } from "@/server/learning";
import { SOURCES } from "@/content/sources";
import { checkAnswerAction, completeLessonAction, startLessonAction, toggleBookmarkAction, touchPathAction } from "@/app/actions";
import { Button, LinkButton, Notice, Progress } from "./ui";
import { Diagram } from "./diagrams";
import { Widget } from "./widgets";
import { RichText } from "./rich-text";
import { QuestionView } from "./question-view";
import { Icon } from "./icon";

type Done = { xp: number; firstTry: number; total: number; pct: number; firstCompletion: boolean; badges: { id: string; title: string; icon: string; xp: number }[]; challenges: { title: string; xp: number }[]; nextLessonId: string | null; levelId: string };

export function LessonPlayer({ lesson, bookmarked: initialBm, levelTitle }: { lesson: PublicLesson; bookmarked: boolean; levelTitle: string }) {
  const [runId, setRunId] = useState<string | null>(null);
  const [i, setI] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [busy, setBusy] = useState(false);
  const [bm, setBm] = useState(initialBm);
  const steps = lesson.steps;

  useEffect(() => {
    touchPathAction(`/learn/${lesson.id}`);
  }, [lesson.id]);

  async function begin() {
    setBusy(true);
    setError(null);
    const r = await startLessonAction(lesson.id);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setRunId(r.runId);
    setI(0);
  }

  async function finish() {
    if (!runId) return;
    setBusy(true);
    const r = await completeLessonAction(runId);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setDone(r);
  }

  const next = () => (i + 1 >= steps.length ? finish() : setI(i + 1));

  if (done) return <Complete lesson={lesson} done={done} />;

  if (i < 0)
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/learn" className="focus-ring inline-flex items-center gap-1 rounded text-sm text-slate-400 hover:text-white">
          <ArrowLeft size={16} /> {levelTitle}
        </Link>
        <div className="space-y-3">
          <h1 className="font-display text-3xl font-bold text-white">{lesson.title}</h1>
          <p className="text-lg text-slate-300">{lesson.summary}</p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Clock size={16} /> {lesson.minutes} min
            </span>
            <span>{steps.filter((s) => s.kind === "question").length} practice questions</span>
            <button
              type="button"
              onClick={async () => {
                const r = await toggleBookmarkAction("lesson", lesson.id);
                if (r.ok) setBm(r.bookmarked);
              }}
              className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-white/5 hover:text-white"
              aria-pressed={bm}
            >
              {bm ? <BookmarkCheck size={16} className="text-cool-300" /> : <Bookmark size={16} />} {bm ? "Bookmarked" : "Bookmark"}
            </button>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-cool-400">You&apos;ll learn to</div>
          <ul className="space-y-2">
            {lesson.objectives.map((o) => (
              <li key={o} className="flex gap-2 text-slate-200">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cool-400" /> {o}
              </li>
            ))}
          </ul>
        </div>
        {lesson.scope === "equipment-specific" && (
          <Notice tone="volt" title="Equipment-specific procedure">
            This lesson describes typical practice. On real equipment, the manufacturer&apos;s installation and service instructions always take priority.
          </Notice>
        )}
        {error && <Notice tone="bad">{error}</Notice>}
        <Button size="lg" onClick={begin} disabled={busy} className="w-full sm:w-auto">
          {busy ? "Loading…" : "Start lesson"}
        </Button>
      </div>
    );

  const step = steps[i];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/learn" className="focus-ring grid h-10 w-10 place-items-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white" aria-label="Exit lesson">
          <X size={20} />
        </Link>
        <Progress value={(i / steps.length) * 100} label="Lesson progress" />
        <span className="w-12 text-right text-xs font-semibold text-slate-400">
          {i + 1}/{steps.length}
        </span>
      </div>
      {error && <div className="mb-4"><Notice tone="bad">{error}</Notice></div>}
      <div key={i}>
        {step.kind === "question" ? (
          <QuestionView
            key={step.question.id}
            q={step.question}
            onCheck={async (resp) => {
              const r = await checkAnswerAction(runId!, step.question.id, resp);
              return r.ok ? r : { error: r.error };
            }}
            onContinue={next}
            continueLabel={i + 1 >= steps.length ? (busy ? "Finishing…" : "Finish lesson") : "Continue"}
          />
        ) : (
          <div className="animate-rise space-y-5">
            {step.kind === "safety" ? (
              <div className="rounded-2xl border-2 border-heat-400/50 bg-heat-500/10 p-5">
                <div className="mb-2 flex items-center gap-2 font-display text-xl font-bold text-heat-400">
                  <AlertTriangle aria-hidden /> {step.title}
                </div>
                {step.body.map((b, k) => (
                  <p key={k} className="mt-2 leading-relaxed text-orange-50">
                    <RichText text={b} />
                  </p>
                ))}
              </div>
            ) : (
              <>
                <div>
                  {step.kind === "example" && (
                    <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-volt-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-volt-400">
                      <Lightbulb size={14} /> Real-world example
                    </div>
                  )}
                  {step.kind === "interactive" && <div className="mb-2 inline-flex rounded-full bg-cool-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cool-300">Try it</div>}
                  <h2 className="font-display text-2xl font-bold text-white">{step.title}</h2>
                </div>
                {step.kind === "interactive" ? (
                  <>
                    {step.intro && <p className="text-slate-300">{step.intro}</p>}
                    <Widget name={step.widget} />
                  </>
                ) : (
                  <>
                    {"visual" in step && step.visual && <Diagram name={step.visual} />}
                    <div className="space-y-3 text-[17px] leading-relaxed text-slate-300">
                      {step.body.map((b, k) => (
                        <p key={k}>
                          <RichText text={b} />
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
            <Button size="lg" onClick={next} disabled={busy} className="w-full sm:w-auto">
              {i + 1 >= steps.length ? (busy ? "Finishing…" : "Finish lesson") : "Continue"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function Complete({ lesson, done }: { lesson: PublicLesson; done: Done }) {
  return (
    <div className="mx-auto max-w-xl space-y-6 text-center">
      <div className="animate-pop mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-gradient-to-br from-cool-400 to-heat-400 text-ink-950 shadow-2xl">
        <Trophy size={44} />
      </div>
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Lesson complete!</h1>
        <p className="mt-2 text-slate-300">{lesson.title}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="XP earned" value={`+${done.xp}`} tone="text-cool-300" />
        <Stat label="First try" value={`${done.firstTry}/${done.total}`} tone="text-ok-400" />
        <Stat label="Accuracy" value={`${done.pct}%`} tone="text-heat-400" />
      </div>
      {!done.firstCompletion && <p className="text-sm text-slate-400">Replays earn a small amount of XP once per day — and keep the concepts fresh.</p>}
      {[...done.badges.map((b) => ({ k: b.id, icon: b.icon, t: `Badge unlocked: ${b.title}`, xp: b.xp })), ...done.challenges.map((c) => ({ k: c.title, icon: "Target", t: c.title, xp: c.xp }))].map((x) => (
        <div key={x.k} className="animate-pop flex items-center gap-3 rounded-2xl border border-volt-400/40 bg-volt-400/10 p-4 text-left">
          <Icon name={x.icon} className="text-volt-400" size={28} />
          <div className="flex-1 font-semibold text-white">{x.t}</div>
          <div className="font-bold text-volt-400">+{x.xp} XP</div>
        </div>
      ))}
      <div className="glass rounded-2xl p-4 text-left text-xs text-slate-400">
        <div className="mb-1 font-semibold text-slate-300">Sources · reviewed {lesson.revised}</div>
        <ul className="space-y-1">
          {lesson.sources.map((s) => {
            const src = SOURCES[s.id];
            return (
              <li key={s.id}>
                {src.url ? (
                  <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-cool-300 hover:underline">
                    {src.title}
                  </a>
                ) : (
                  src.title
                )}{" "}
                — {src.publisher}
                {s.note ? ` (${s.note})` : ""}
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        {done.nextLessonId ? (
          <LinkButton href={`/learn/${done.nextLessonId}`} size="lg">
            Next lesson
          </LinkButton>
        ) : (
          <LinkButton href={`/exams/level:${done.levelId}`} size="lg" variant="heat">
            Take the level checkpoint
          </LinkButton>
        )}
        <LinkButton href="/dashboard" variant="secondary" size="lg">
          Dashboard
        </LinkButton>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className={clsx("font-display text-2xl font-bold", tone)}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
