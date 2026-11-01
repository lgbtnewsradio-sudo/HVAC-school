import { lessonSchema, questionSchema, type Lesson, type Question } from "./types";
import { LEVEL1 } from "./lessons/level1";
import { LEVEL2 } from "./lessons/level2";
import { LEVEL3 } from "./lessons/level3";
import { LEVEL4 } from "./lessons/level4";
import { LEVEL5 } from "./lessons/level5";
import { LEVEL6 } from "./lessons/level6";
import { LEVEL7 } from "./lessons/level7";
import { LEVEL8 } from "./lessons/level8";
import { LEVEL9 } from "./lessons/level9";
import { LEVEL10 } from "./lessons/level10";
import { CERT_BANKS, CERT_TRACKS } from "./cert";
import { LEVELS } from "./levels";

/** Bundled curriculum, validated against the schema at load time. */
export const BASE_LESSONS: Lesson[] = [LEVEL1, LEVEL2, LEVEL3, LEVEL4, LEVEL5, LEVEL6, LEVEL7, LEVEL8, LEVEL9, LEVEL10]
  .flat()
  .map((l) => lessonSchema.parse(l));

export const BASE_CERT_QUESTIONS: Record<string, Question[]> = Object.fromEntries(
  Object.entries(CERT_BANKS).map(([bank, qs]) => [bank, qs.map((q) => questionSchema.parse(q))]),
);

export type Curriculum = {
  lessons: Lesson[];
  lessonById: Map<string, Lesson>;
  lessonsByLevel: Map<string, Lesson[]>;
  /** Every gradable question (lesson checks + cert banks), by id. */
  questions: Map<string, Question>;
  /** question id → lesson id (for lesson questions) */
  questionLesson: Map<string, string>;
  certBanks: Record<string, Question[]>;
};

export function buildCurriculum(lessons: Lesson[], certBanks: Record<string, Question[]> = BASE_CERT_QUESTIONS, extraQuestions: Question[] = []): Curriculum {
  const sorted = [...lessons].sort((a, b) => {
    const la = LEVELS.findIndex((l) => l.id === a.levelId);
    const lb = LEVELS.findIndex((l) => l.id === b.levelId);
    return la - lb || a.order - b.order;
  });
  const lessonById = new Map(sorted.map((l) => [l.id, l]));
  const lessonsByLevel = new Map<string, Lesson[]>();
  for (const lvl of LEVELS) lessonsByLevel.set(lvl.id, sorted.filter((l) => l.levelId === lvl.id));
  const questions = new Map<string, Question>();
  const questionLesson = new Map<string, string>();
  for (const l of sorted)
    for (const s of l.steps)
      if (s.kind === "question") {
        questions.set(s.question.id, s.question);
        questionLesson.set(s.question.id, l.id);
      }
  for (const qs of Object.values(certBanks)) for (const q of qs) questions.set(q.id, q);
  for (const q of extraQuestions) questions.set(q.id, q);
  return { lessons: sorted, lessonById, lessonsByLevel, questions, questionLesson, certBanks };
}

export const BASE_CURRICULUM = buildCurriculum(BASE_LESSONS);

export function lessonQuestions(l: Lesson): Question[] {
  return l.steps.flatMap((s) => (s.kind === "question" ? [s.question] : []));
}

export { LEVELS, CERT_TRACKS };
