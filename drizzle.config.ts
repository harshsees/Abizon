import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

/**
 * `.env.local` FIRST, and this is not a detail.
 *
 * `import "dotenv/config"` reads `.env` and nothing else. Next.js reads
 * `.env.local` and gives it precedence, and `.env.example` tells everyone to
 * put their credentials there — so the two disagreed, and `drizzle-kit`
 * reported `url: ''` on a machine whose `.env.local` was correctly filled in.
 * The message names the driver rather than the file, so it reads as a broken
 * connection string rather than a file that was never opened.
 *
 * Listed in Next's own precedence order. `dotenv` keeps the first value it sees
 * for a given key, so `.env.local` wins and `.env` fills any gaps — which is
 * what the application itself does at runtime.
 */
config({ path: [".env.local", ".env"] });

/**
 * MIGRATIONS.
 * ---------------------------------------------------------------------------
 * `DIRECT_URL`, not `DATABASE_URL`. DDL runs inside a session and the transaction
 * pooler on port 6543 does not give you one — `drizzle-kit push` against it
 * appears to hang and then fails in a way that does not mention pooling.
 *
 * The generated SQL is committed. The handover document is explicit that the
 * schema must be reproducible from the repository rather than being "whatever
 * someone clicked into a dashboard", and that only holds if the files are in
 * git and applied in order.
 *
 *   npm run db:generate   write a migration from the schema diff
 *   npm run db:migrate    apply pending migrations
 *   npm run db:studio     browse the data
 *
 * `push` is deliberately not in the scripts. It edits the database to match the
 * schema without leaving a migration behind, which is convenient exactly once
 * and then leaves production and the repository silently disagreeing.
 */

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  // Prints the SQL before it runs. On a table holding passport data, seeing the
  // statement before it executes is worth the extra keystroke.
  verbose: true,
  strict: true,
});
