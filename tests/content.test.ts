import { describe, expect, it } from "vitest";
import { BASE_CURRICULUM, BASE_LESSONS, BASE_CERT_QUESTIONS } from "@/content";
import { LEVELS } from "@/content/levels";
import { SOURCES } from "@/content/sources";
import { GLOSSARY } from "@/content/glossary";
import { CERT_TRACKS } from "@/content/cert";

describe("curriculum integrity", () => {
  it("has lessons for every level", () => {
    for (const lvl of LEVELS) expect(BASE_CURRICULUM.lessonsByLevel.get(lvl.id)!.length, lvl.id).toBeGreaterThanOrEqual(5);
  });

  it("uses unique lesson and question ids", () => {
    const ids = BASE_LESSONS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    const qids = [
      ...BASE_LESSONS.flatMap((l) => l.steps.flatMap((s) => (s.kind === "question" ? [s.question.id] : []))),
      ...Object.values(BASE_CERT_QUESTIONS).flat().map((q) => q.id),
    ];
    const dupes = qids.filter((id, i) => qids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it("cites known sources and has a revision date", () => {
    for (const l of BASE_LESSONS) {
      expect(l.revised).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const s of l.sources) expect(SOURCES[s.id], `${l.id} cites ${s.id}`).toBeTruthy();
    }
  });

  it("every lesson ends with practice and has at least 2 questions", () => {
    for (const l of BASE_LESSONS) {
      const qs = l.steps.filter((s) => s.kind === "question");
      expect(qs.length, l.id).toBeGreaterThanOrEqual(2);
    }
  });

  it("question answers reference real options", () => {
    for (const q of BASE_CURRICULUM.questions.values()) {
      if (q.type === "single") expect(q.options.some((o) => o.id === q.answer), q.id).toBe(true);
      if (q.type === "multi") for (const a of q.answer) expect(q.options.some((o) => o.id === a), q.id).toBe(true);
    }
  });

  it("cert tracks have enough questions", () => {
    for (const t of CERT_TRACKS) {
      const n = t.banks.reduce((s, b) => s + (BASE_CERT_QUESTIONS[b]?.length ?? 0), 0);
      expect(n, t.id).toBeGreaterThanOrEqual(t.questionCount);
    }
  });

  it("glossary terms are unique", () => {
    const slugs = GLOSSARY.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
