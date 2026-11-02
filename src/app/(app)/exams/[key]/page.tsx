import { notFound } from "next/navigation";
import { pageCtx } from "@/server/page-ctx";
import { examDef } from "@/server/learning";
import { ExamRunner } from "@/components/exam-runner";

export const metadata = { title: "Exam" };

export default async function ExamPage({ params }: { params: Promise<{ key: string }> }) {
  const key = decodeURIComponent((await params).key);
  const { cur } = await pageCtx(`/exams/${key}`);
  const def = examDef(cur, key);
  if (!def) notFound();
  const intro = key.startsWith("level:")
    ? "Questions are drawn from every lesson in this level. Pass to unlock the next level (or to test out of this one)."
    : key === "final"
      ? "A comprehensive exam across all ten levels."
      : "Questions are drawn at random from the study bank, with full explanations after you submit.";
  return <ExamRunner examKey={key} title={def.title} intro={intro} count={def.count} minutes={def.minutes} passMark={def.passMark} disclaimer={def.disclaimer} />;
}
