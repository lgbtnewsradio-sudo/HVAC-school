import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { getDb, resetDbForTests, type DB } from "@/server/db";
import { loginUser, registerUser, userForToken } from "@/server/auth-core";
import { BASE_CURRICULUM, lessonQuestions } from "@/content";
import { checkLessonAnswer, completeLesson, startLesson } from "@/server/learning";
import { dashboardSummary } from "@/server/progress";

/**
 * Exercises the production code path (node-postgres over TCP) against a real Postgres wire
 * server, so the driver, migrations and parallel dashboard queries are covered — not just PGlite.
 */
let server: PGLiteSocketServer;
let pglite: PGlite;
let db: DB;
const prevUrl = process.env.DATABASE_URL;

beforeAll(async () => {
  pglite = await PGlite.create();
  server = new PGLiteSocketServer({ db: pglite, port: 54329, host: "127.0.0.1" });
  await server.start();
  process.env.DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54329/postgres";
  process.env.DB_POOL_MAX = "1"; // pglite-socket serves one connection at a time
  resetDbForTests();
  db = await getDb();
});

afterAll(async () => {
  resetDbForTests();
  process.env.DATABASE_URL = prevUrl;
  delete process.env.DB_POOL_MAX;
  await server?.stop();
  await pglite?.close();
});

describe("node-postgres production driver", () => {
  it("migrates, registers, logs in, completes a lesson and builds the dashboard", async () => {
    const reg = await registerUser(db, { email: "pg@example.com", displayName: "Pg Tech", password: "hvacrocks123" });
    expect(reg.ok).toBe(true);
    const login = await loginUser(db, "pg@example.com", "hvacrocks123");
    if (!login.ok) throw new Error(login.error);
    const user = (await userForToken(db, login.token))!;
    const lesson = BASE_CURRICULUM.lessons[0];
    const s = await startLesson(db, user, BASE_CURRICULUM, lesson.id);
    if (!s.ok) throw new Error(s.error);
    for (const q of lessonQuestions(lesson)) {
      const resp = q.type === "single" || q.type === "multi" || q.type === "truefalse" || q.type === "numeric" ? q.answer : q.type === "order" ? q.items.map((i) => i.id) : Object.fromEntries(q.pairs.map((p) => [p.id, p.id]));
      await checkLessonAnswer(db, user, BASE_CURRICULUM, s.runId, q.id, resp as never);
    }
    const done = await completeLesson(db, user, BASE_CURRICULUM, s.runId);
    expect(done.ok).toBe(true);
    const fresh = (await userForToken(db, login.token))!;
    const sum = await dashboardSummary(db, fresh, BASE_CURRICULUM);
    expect(sum.lessonsDone).toBe(1);
    expect(sum.xp).toBeGreaterThan(0);
  });
});
