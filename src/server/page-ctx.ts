import "server-only";
import { requireUser } from "./auth";
import { getDb } from "./db";
import { loadContent } from "./curriculum";

/** Common context for authenticated server pages. */
export async function pageCtx(next?: string) {
  const user = await requireUser(next);
  const db = await getDb();
  const { curriculum, scenarios } = await loadContent(db);
  return { user, db, cur: curriculum, scenarios };
}
