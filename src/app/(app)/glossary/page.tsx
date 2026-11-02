import { and, eq } from "drizzle-orm";
import { pageCtx } from "@/server/page-ctx";
import { bookmarks } from "@/server/db/schema";
import { GLOSSARY } from "@/content/glossary";
import { SectionTitle } from "@/components/ui";
import { GlossaryList } from "@/components/glossary-list";

export const metadata = { title: "Glossary" };

export default async function GlossaryPage() {
  const { user, db } = await pageCtx("/glossary");
  const bm = await db.select({ ref: bookmarks.refId }).from(bookmarks).where(and(eq(bookmarks.userId, user.id), eq(bookmarks.kind, "term")));
  return (
    <div>
      <SectionTitle eyebrow="Reference" title="HVAC glossary">Every term in plain English. Press &ldquo;/&rdquo; anywhere in the app to search it.</SectionTitle>
      <GlossaryList terms={GLOSSARY} bookmarked={bm.map((b) => b.ref)} />
    </div>
  );
}
