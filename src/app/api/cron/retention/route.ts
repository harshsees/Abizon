import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";

import { audit } from "@/lib/audit";
import { cronAuthorised, cronDenied, cronResponse } from "@/lib/cron";
import { db } from "@/lib/db/client";
import { applications, documents, erasureRequests, travellers, users } from "@/lib/db/schema";
import { BUCKETS, storage } from "@/lib/storage/client";

/**
 * RETENTION AND ERASURE — the DPDP job.
 * ---------------------------------------------------------------------------
 * The handover document is direct about this: "passport scans should have a
 * deletion schedule after an application closes. Keeping them forever is the
 * default only if nobody decides otherwise." This is the decision, written as
 * code so that it happens whether or not anybody remembers.
 *
 * ── Two clocks ──
 *
 *   NINETY DAYS after an application closes, its documents are deleted. Not the
 *   application: the record that it existed, for which country, and how it
 *   ended, is kept — the client may need to show a consulate or a regulator that
 *   an application was filed. What goes is the passport scan and the
 *   photograph, which have no purpose once the visa is issued or refused.
 *
 *   ERASURE REQUESTS run on their own schedule, because a data principal can
 *   ask sooner. They cannot ask for an application currently with a consulate
 *   to be un-filed, so a request against a live application is *scheduled*
 *   rather than refused, and runs once it closes.
 *
 * ── What survives an erasure, and why that is not a loophole ──
 *
 * The `users` row stays, with its phone number cleared and `deleted_at` set.
 * Applications reference it, and a dangling reference would make the remaining
 * records incoherent — including the audit log entries that prove the erasure
 * happened. Nothing identifying is left: no number, no name, no document, no
 * passport number. What remains is that an account existed and was erased on a
 * date, which is a record the Act expects to be kept rather than one it
 * prohibits.
 *
 * ── Ninety days is a placeholder with a real default ──
 *
 * It is long enough to handle a re-application or a consulate query and short
 * enough to be defensible. It is a business decision as much as a technical one
 * and the client should confirm it — but it is a *number*, working, rather than
 * a note in a document saying somebody should pick one.
 */

export const dynamic = "force-dynamic";

const DOCUMENT_RETENTION_DAYS = 90;

export async function GET(request: Request) {
  if (!cronAuthorised(request)) return cronDenied();

  const database = db();
  if (!database) return cronResponse("retention", { skipped: "no database" });

  const client = storage();
  const now = new Date();
  const cutoff = new Date(now.getTime() - DOCUMENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

  /* --- 1. Documents on long-closed applications ------------------------- */

  const expired = await database
    .select({ id: documents.id, storagePath: documents.storagePath })
    .from(documents)
    .innerJoin(applications, eq(applications.id, documents.applicationId))
    .where(
      and(
        isNull(documents.deletedAt),
        isNotNull(applications.closedAt),
        lt(applications.closedAt, cutoff),
      ),
    );

  let documentsDeleted = 0;

  if (expired.length > 0) {
    if (client) {
      // Storage first, then the row. The other order leaves an object with no
      // row pointing at it, which nothing will ever find or delete — whereas a
      // row whose object is already gone is simply deleted again next run.
      await client.storage
        .from(BUCKETS.documents)
        .remove(expired.map((document) => document.storagePath));
    }

    for (const document of expired) {
      await database
        .update(documents)
        .set({ deletedAt: now })
        .where(eq(documents.id, document.id));
    }

    documentsDeleted = expired.length;
  }

  /* --- 2. Erasure requests that have come due --------------------------- */

  const due = await database
    .select()
    .from(erasureRequests)
    .where(
      and(
        eq(erasureRequests.status, "scheduled"),
        isNotNull(erasureRequests.scheduledFor),
        lt(erasureRequests.scheduledFor, now),
      ),
    );

  let erasuresCompleted = 0;

  for (const requestRow of due) {
    // A request made while an application was live, where the application has
    // since been reopened or is still open. Leave it scheduled rather than
    // deleting documents a consulate is working from.
    const [live] = await database
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.userId, requestRow.userId), isNull(applications.closedAt)))
      .limit(1);

    if (live) continue;

    const owned = await database
      .select({ id: documents.id, storagePath: documents.storagePath })
      .from(documents)
      .innerJoin(applications, eq(applications.id, documents.applicationId))
      .where(and(eq(applications.userId, requestRow.userId), isNull(documents.deletedAt)));

    if (owned.length > 0 && client) {
      await client.storage
        .from(BUCKETS.documents)
        .remove(owned.map((document) => document.storagePath));
    }

    await database.transaction(async (tx) => {
      for (const document of owned) {
        await tx.update(documents).set({ deletedAt: now }).where(eq(documents.id, document.id));
      }

      // The encrypted columns are nulled rather than left encrypted. Ciphertext
      // is not erasure — it is erasure contingent on a key staying lost, and a
      // key can be restored from a backup by someone who does not know why it
      // should not be.
      const owning = await tx
        .select({ id: applications.id })
        .from(applications)
        .where(eq(applications.userId, requestRow.userId));

      for (const application of owning) {
        await tx
          .update(travellers)
          .set({
            fullName: null,
            passportNumberEncrypted: null,
            passportNumberIndex: null,
            dobEncrypted: null,
            passportExpiry: null,
            nationality: null,
            gender: null,
            email: null,
            phoneE164: null,
          })
          .where(eq(travellers.applicationId, application.id));
      }

      await tx
        .update(users)
        .set({
          // The number is the account identifier, so it cannot be left. Replaced
          // with a value that is unique (the unique index still applies) and
          // discloses nothing.
          phoneE164: `erased:${requestRow.userId}`,
          deletedAt: now,
          tokenVersion: 0,
        })
        .where(eq(users.id, requestRow.userId));

      await tx
        .update(erasureRequests)
        .set({ status: "completed", completedAt: now })
        .where(eq(erasureRequests.id, requestRow.id));
    });

    await audit({
      action: "erasure.completed",
      actorType: "system",
      subjectType: "user",
      subjectId: requestRow.userId,
      metadata: { documents: owned.length },
    });

    erasuresCompleted += 1;
  }

  if (documentsDeleted > 0) {
    await audit({
      action: "retention.documents_deleted",
      actorType: "system",
      metadata: { count: documentsDeleted, retentionDays: DOCUMENT_RETENTION_DAYS },
    });
  }

  return cronResponse("retention", { documentsDeleted, erasuresCompleted });
}
