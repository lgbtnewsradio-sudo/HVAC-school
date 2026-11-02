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
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    // Serverless + Supabase pooler: keep the pool small, drop idle connections quickly, and fail
    // fast instead of hanging. attachDatabasePool keeps a Vercel instance alive just long enough
    // to close idle connections before it is frozen, so a frozen instance never wakes up holding
    // a socket the pooler has already dropped (which made requests hang until they timed out).
    const pool = new Pool({
      connectionString: url,
      max: Number(process.env.DB_POOL_MAX ?? 5),
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (err) => console.error("[db] idle client error", err.message));
    if (process.env.VERCEL) (await import("@vercel/functions")).attachDatabasePool(pool);
    const db = drizzle(pool, { schema });
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
