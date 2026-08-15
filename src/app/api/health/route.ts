import { sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { announceDegradedModes, capabilities } from "@/lib/env";

/**
 * HEALTH.
 * ---------------------------------------------------------------------------
 * Answers one question — "which halves of this system are actually switched on"
 * — and answers it from `capabilities`, the same object every subsystem branches
 * on. That is the point: a health endpoint that maintains its own opinion of
 * what is configured is a health endpoint that eventually disagrees with the
 * code and reports green while email has been off for a fortnight.
 *
 * WHAT IT DOES NOT SAY. No version, no environment name, no connection string,
 * no error text. It is unauthenticated, because an uptime monitor has no
 * credentials, so everything here is readable by anyone — booleans and a
 * database round trip.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  announceDegradedModes();

  const checks: Record<string, boolean> = {
    database: capabilities.database(),
    encryption: capabilities.encryption(),
    storage: capabilities.storage(),
    email: capabilities.email(),
    botProtection: capabilities.turnstile(),
    distributedRateLimit: capabilities.distributedRateLimit(),
    opsConsole: capabilities.opsConsole(),
  };

  // Configured is not the same as reachable. One trivial query is the
  // difference between "the URL is set" and "the database answers", and it is
  // the only check here that costs anything.
  let databaseReachable = false;

  if (checks.database) {
    try {
      await db()!.execute(sql`select 1`);
      databaseReachable = true;
    } catch {
      databaseReachable = false;
    }
  }

  // The database is the only hard dependency; everything else degrades in a
  // documented way. A 503 here should mean "stop sending traffic", not "one
  // optional integration is unconfigured".
  const healthy = !checks.database || databaseReachable;

  return Response.json(
    { status: healthy ? "ok" : "degraded", databaseReachable, configured: checks },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
