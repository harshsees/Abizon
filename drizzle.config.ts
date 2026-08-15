import "dotenv/config";
import { defineConfig } from "drizzle-kit";

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
