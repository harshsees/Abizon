import { lt } from "drizzle-orm";

import { audit } from "@/lib/audit";
import { cronAuthorised, cronDenied, cronResponse } from "@/lib/cron";
import { db } from "@/lib/db/client";
import { authChallenges, authSends } from "@/lib/db/schema";
import { BUCKETS, storage } from "@/lib/storage/client";

/**
 * DAILY HOUSEKEEPING.
 * ---------------------------------------------------------------------------
 * Three tables and one bucket grow without limit unless something empties them.
 * None of this is urgent in any single hour, and all of it is expensive after a
 * year of nobody noticing.
 *
 * ── Why daily and not hourly, which is what this wants ──
 *
 * It was `17 * * * *`. Vercel's Hobby plan permits a cron to run at most once a
 * day and rejects the *whole deployment* when one asks for more — so from the
 * moment this file arrived, every deploy failed with "Hobby accounts are
 * limited to daily cron jobs" and the site froze on its last good build. Days
 * of unrelated work sat on `main` looking pushed and were never live. The
 * schedule is the thing that has to give until the account is on Pro.
 *
 * WHAT THAT COSTS, precisely: raw camera output sits in `incoming` for up to
 * 24 hours instead of up to one. Those are unprocessed passport photographs
 * with EXIF intact, in a private bucket, readable only by the service role.
 * The exposure is the retention window, not access — but it is a real change
 * to a number the DPDP retention story quotes, so it belongs in that
 * conversation rather than in a config file nobody rereads.
 *
 * On Pro, put `17 * * * *` back and delete this note.
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

  /**
   * Orphaned uploads. An applicant who uploads and then closes the tab leaves an
   * object in `incoming` with no database row — see the header of
   * `lib/storage/documents.ts`, where that is described as fine and by design
   * precisely because this job exists to collect them.
   *
   * A day is generous. Nothing legitimately sits in `incoming` for more than the
   * few seconds between the browser's PUT and the finalise call.
   */
  let orphans = 0;
  const client = storage();

  if (client) {
    const { data } = await client.storage.from(BUCKETS.incoming).list("", { limit: 1000 });
    const stale = (data ?? []).filter((object) => {
      const created = object.created_at ? Date.parse(object.created_at) : now;
      return now - created > 24 * 60 * 60 * 1000;
    });

    if (stale.length > 0) {
      await client.storage.from(BUCKETS.incoming).remove(stale.map((object) => object.name));
      orphans = stale.length;
    }
  }

  await audit({
    action: "retention.challenges_purged",
    actorType: "system",
    metadata: { challenges: challenges.length, sends: sends.length, orphanUploads: orphans },
  });

  return cronResponse("purge", {
    challenges: challenges.length,
    sends: sends.length,
    orphanUploads: orphans,
  });
}
