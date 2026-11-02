import path from "node:path";
import type { PgDatabase } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/**
 * Database access. Uses Postgres (e.g. Supabase) when DATABASE_URL is a postgres:// URL,
 * otherwise an embedded PGlite (real Postgres in WASM) for local dev and tests.
 * DATABASE_URL=memory:// gives an ephemeral in-memory database.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DB = PgDatabase<any, typeof schema>;

const g = globalThis as unknown as { __hvacDb?: Promise<DB> };

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function create(): Promise<DB> {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    // prepare:false keeps compatibility with Supabase's transaction pooler.
    const client = postgres(url, { prepare: false, max: Number(process.env.DB_POOL_MAX ?? 5) });
    const db = drizzle(client, { schema });
    if (process.env.DB_AUTO_MIGRATE !== "false") await migrate(db, { migrationsFolder: MIGRATIONS });
    return db as unknown as DB;
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  // On serverless hosts only /tmp is writable. Without DATABASE_URL there this is an EPHEMERAL demo database.
  const fallback = process.env.VERCEL ? "/tmp/hvac-pglite" : path.join(process.cwd(), ".data", "pglite");
  const dataDir = url === "memory://" ? undefined : url.replace(/^file:\/\//, "") || fallback;
  if (process.env.VERCEL && !url) console.warn("[db] DATABASE_URL is not set — using an ephemeral PGlite database in /tmp. Data will not persist.");
  if (dataDir) (await import("node:fs")).mkdirSync(dataDir, { recursive: true });
  const client = new PGlite(dataDir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  if (!g.__hvacDb) {
    g.__hvacDb = create().catch((e) => {
      g.__hvacDb = undefined;
      throw e;
    });
  }
  return g.__hvacDb;
}

/** Test helper: drop the cached connection so the next getDb() builds a fresh one. */
export function resetDbForTests() {
  g.__hvacDb = undefined;
}

export { schema };
