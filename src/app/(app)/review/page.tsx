import { and, eq, sql } from "drizzle-orm";
import { pageCtx } from "@/server/page-ctx";
import { reviewCards } from "@/server/db/schema";
import { SectionTitle } from "@/components/ui";
import { ReviewRunner } from "@/components/review-runner";

export const metadata = { title: "Spaced review" };

export default async function ReviewPage() {
  const { user, db } = await pageCtx("/review");
  const [{ due }] = await db.select({ due: sql<number>`count(*)::int` }).from(reviewCards).where(and(eq(reviewCards.userId, user.id), sql`${reviewCards.dueAt} <= now()`));
  return (
    <div>
      <SectionTitle eyebrow="Spaced repetition" title="Review">Short sessions of the concepts you&apos;re most likely to forget — scheduled automatically from your answers.</SectionTitle>
      <ReviewRunner due={due} />
    </div>
  );
}
