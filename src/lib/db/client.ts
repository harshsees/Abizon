import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env, capabilities } from "@/lib/env";
import * as schema from "./schema";

/**
 * THE DATABASE CONNECTION, and the two settings that are not optional.
 * ---------------------------------------------------------------------------
 *
 * ── 1. `prepare: false` ────────────────────────────────────────────────────
 *
 * Supabase offers two connection strings and they are not interchangeable:
 *
 *   port 6543  Supavisor, transaction mode  ← the application uses this
 *   port 5432  direct to Postgres           ← migrations use this
 *
 * Serverless functions open and abandon connections faster than Postgres
 * retires them, so a direct connection from Vercel exhausts the pool under
 * mild load. The pooler exists for exactly this.
 *
 * But transaction-mode pooling multiplexes many clients over few backends, so a
 * prepared statement created on one request is not there on the next.
 * `postgres.js` prepares by default. The failure is not immediate and not
 * obvious: it works in development against a direct connection, works in
 * staging under one request at a time, and starts throwing
 * `prepared statement "s1" does not exist` in production under concurrency.
 *
 * Hence `prepare: false`, and hence this comment being longer than the code.
 *
 * DDL still needs a session, so `drizzle.config.ts` points at `DIRECT_URL`.
 * The two variables are not a redundancy.
 *
 * ── 2. One client per process, not one per request ─────────────────────────
 *
 * Next.js re-evaluates modules on every hot reload in development, which
 * without the global below means a new connection pool every time a file is
 * saved — and Postgres refusing connections after a few minutes of editing.
 * The global is the standard workaround and it is as ugly as it looks.
 *
 * ── When there is no database ──────────────────────────────────────────────
 *
 * `db()` returns null rather than throwing, and every caller is written to
 * handle that by falling back to the in-memory implementation. A fresh clone
 * with no `.env.local` has to start, or the 150 destination pages become
 * unworkable for anyone doing front-end work. Production requires
 * `DATABASE_URL` (see `env.ts`), so the fallback cannot survive a deploy.
 */

export type Database = ReturnType<typeof create>;

function create(url: string) {
  const client = postgres(url, {
    // See above. Removing this line breaks production and nothing else.
    prepare: false,

    // Serverless: many short-lived instances, each needing very few
    // connections. A large per-instance pool multiplied by the instance count
    // is how a connection limit gets hit while every individual instance looks
    // idle.
    max: 5,

    // Reap idle connections quickly for the same reason.
    idle_timeout: 20,

    // A query that has not returned in thirty seconds is not going to. Failing
    // is better than holding a function open until the platform kills it,
    // because a failure has a stack trace and a timeout has a bill.
    connect_timeout: 10,

    // `postgres.js` logs the full statement including bound parameters on
    // error. Those parameters include phone numbers and passport ciphertext.
    onnotice: () => {},
  });

  return drizzle(client, { schema });
}

declare global {
  var __abizonDb: Database | undefined;
}

/**
 * The database, or null when none is configured. Null is a supported state, not
 * an error — see the header.
 */
export function db(): Database | null {
  if (!capabilities.database()) return null;

  globalThis.__abizonDb ??= create(env().DATABASE_URL!);
  return globalThis.__abizonDb;
}

/**
 * For code paths that genuinely cannot proceed without storage — the ops
 * console, the retention job — where falling back to an in-memory store would
 * be worse than stopping, because it would quietly report success against data
 * nobody will ever see again.
 */
export function requireDb(): Database {
  const database = db();
  if (!database) {
    throw new Error(
      "This operation requires a database and DATABASE_URL is not set. " +
        "See docs/backend/stack.md §2.",
    );
  }
  return database;
}

export { schema };
