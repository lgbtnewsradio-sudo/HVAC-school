import { describe, expect, it } from "vitest";
import { gradeQuestion, toPublicQuestion } from "@/engine/grading";
import { questionSchema, type Question } from "@/content/types";
import { BASE_CURRICULUM } from "@/content";

const q = (x: unknown) => questionSchema.parse(x) as Question;

describe("grading", () => {
  it("never leaks answers or explanations to the client", () => {
    for (const question of BASE_CURRICULUM.questions.values()) {
      const pub = JSON.stringify(toPublicQuestion(question));
      expect(pub).not.toContain('"answer"');
      expect(pub).not.toContain('"explanation"');
      expect(pub).not.toContain('"feedback"');
    }
  });

  it("grades single choice", () => {
    const s = q({ id: "x", type: "single", prompt: "p", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], answer: "b", explanation: "e", skills: ["fundamentals"] });
    expect(gradeQuestion(s, "b").correct).toBe(true);
    expect(gradeQuestion(s, "a").correct).toBe(false);
    expect(gradeQuestion(s, 5 as never).correct).toBe(false);
  });

  it("multi requires exact set and gives partial credit", () => {
    const m = q({ id: "m", type: "multi", prompt: "p", options: ["a", "b", "c", "d"].map((id) => ({ id, text: id })), answer: ["a", "b"], explanation: "e", skills: ["fundamentals"] });
    expect(gradeQuestion(m, ["b", "a"]).correct).toBe(true);
    expect(gradeQuestion(m, ["a"]).correct).toBe(false);
    expect(gradeQuestion(m, ["a"]).score).toBe(0.5);
    expect(gradeQuestion(m, ["a", "b", "c"]).correct).toBe(false);
    expect(gradeQuestion(m, ["a", "b", "c", "d"]).score).toBe(0);
  });

  it("order grading and shuffle never shows solved state", () => {
    const o = q({ id: "o", type: "order", prompt: "p", items: [1, 2, 3, 4].map((n) => ({ id: `i${n}`, text: String(n) })), explanation: "e", skills: ["fundamentals"] });
    expect(gradeQuestion(o, ["i1", "i2", "i3", "i4"]).correct).toBe(true);
    expect(gradeQuestion(o, ["i1", "i1", "i3", "i4"]).score).toBe(0);
    for (let seed = 0; seed < 50; seed++) {
      const pub = toPublicQuestion(o, seed) as { items: { id: string }[] };
      expect(pub.items.map((i) => i.id).join()).not.toBe("i1,i2,i3,i4");
    }
  });

  it("match and numeric", () => {
    const mt = q({ id: "mt", type: "match", prompt: "p", pairs: [{ id: "p0", left: "a", right: "1" }, { id: "p1", left: "b", right: "2" }], explanation: "e", skills: ["fundamentals"] });
    expect(gradeQuestion(mt, { p0: "p0", p1: "p1" }).correct).toBe(true);
    expect(gradeQuestion(mt, { p0: "p1", p1: "p0" }).score).toBe(0);
    const n = q({ id: "n", type: "numeric", prompt: "p", answer: 10, tolerance: 0.5, explanation: "e", skills: ["fundamentals"] });
    expect(gradeQuestion(n, 10.4).correct).toBe(true);
    expect(gradeQuestion(n, "10.4" as never).correct).toBe(true);
    expect(gradeQuestion(n, 11).correct).toBe(false);
    expect(gradeQuestion(n, NaN).correct).toBe(false);
  });
});
