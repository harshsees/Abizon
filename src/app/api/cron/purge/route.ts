import { lt } from "drizzle-orm";

import { audit } from "@/lib/audit";
import { cronAuthorised, cronDenied, cronResponse } from "@/lib/cron";
import { db } from "@/lib/db/client";
import { authChallenges, authSends } from "@/lib/db/schema";

/**
 * HOURLY HOUSEKEEPING.
 * ---------------------------------------------------------------------------
 * Two tables grow without limit unless something empties them. None of this is
 * urgent in any single hour, and all of it is expensive after a year of nobody
 * noticing.
 *
 * ── Who calls this ──
 *
 * Celery beat, in the backend service, at 17 minutes past every hour
 * (`web-purge` in `backend/app/worker/celery_app.py`), with the same bearer
 * secret Vercel Cron used to send. On Vercel's Hobby plan this was held to once
 * a day; that constraint left with Vercel.
 *
 * ── What moved out ──
 *
 * Orphaned raw uploads in `incoming/` used to be collected here. The backend
 * owns the bucket now and purges them itself every hour
 * (`maintenance.purge_incoming`), with an S3 lifecycle rule as the backstop —
 * so unprocessed passport photographs with EXIF intact sit for at most an hour,
 * not a day.
 *
 * ── Why expired challenges are not deleted at expiry ──
 *
 * A code that expired ninety seconds ago must still be *findable*, so that
 * `verifyCode` can say "that code has expired" rather than the misleading "we
 * have no record of that sign-in" — which sends the applicant back to the phone
 * step for no reason. The in-memory store keeps them for an hour past expiry for
 * this exact reason; this matches it.
 *
 * ── Why the send log is kept for a day ──
 *
 * The widest window anything asks about is an hour. A day of history is kept so
 * that a question about yesterday's SMS spend has an answer, and no longer,
 * because the log is a list of which numbers were sent codes and when.
 */

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!cronAuthorised(request)) return cronDenied();

  const database = db();
  if (!database) return cronResponse("purge", { skipped: "no database" });

  const now = Date.now();

  const challenges = await database
    .delete(authChallenges)
    .where(lt(authChallenges.expiresAt, new Date(now - 60 * 60 * 1000)))
    .returning({ id: authChallenges.id });

  const sends = await database
    .delete(authSends)
    .where(lt(authSends.sentAt, new Date(now - 24 * 60 * 60 * 1000)))
    .returning({ id: authSends.id });

  await audit({
    action: "retention.challenges_purged",
    actorType: "system",
    metadata: { challenges: challenges.length, sends: sends.length },
  });

  return cronResponse("purge", {
    challenges: challenges.length,
    sends: sends.length,
  });
}
