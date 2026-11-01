import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { pageCtx } from "@/server/page-ctx";
import { lessonAccess, publicLesson } from "@/server/learning";
import { bookmarks } from "@/server/db/schema";
import { levelById } from "@/content/levels";
import { LessonPlayer } from "@/components/lesson-player";
import { Card, LinkButton, SectionTitle } from "@/components/ui";

export async function generateMetadata({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  return { title: lessonId.replace(/^l\d+-/, "").replace(/-/g, " ") };
}

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const { user, db, cur } = await pageCtx(`/learn/${lessonId}`);
  const lesson = cur.lessonById.get(lessonId);
  if (!lesson) notFound();
  const denied = await lessonAccess(db, user, cur, lesson);
  if (denied?.code === "pro") redirect("/pricing?from=lesson");
  if (denied)
    return (
      <Card className="mx-auto max-w-lg text-center">
        <SectionTitle title="Lesson locked">{denied.error}</SectionTitle>
        <LinkButton href="/learn">Back to the learning path</LinkButton>
      </Card>
    );
  const bm = await db.select().from(bookmarks).where(and(eq(bookmarks.userId, user.id), eq(bookmarks.kind, "lesson"), eq(bookmarks.refId, lesson.id)));
  const lvl = levelById(lesson.levelId)!;
  return <LessonPlayer lesson={publicLesson(lesson)} bookmarked={bm.length > 0} levelTitle={`Level ${lvl.number}: ${lvl.title}`} />;
}
