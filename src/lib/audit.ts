import "server-only";

import { headers } from "next/headers";

import { db } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";
import { clientIp, ipPrefix, shortUserAgent } from "@/lib/request";

/**
 * THE AUDIT LOG — the answer to "whose data, and when".
 * ---------------------------------------------------------------------------
 * DPDP breach notification is mandatory, and it is a question about *access*,
 * not about errors. Sentry can tell you an exception was thrown. It cannot tell
 * you that a member of staff opened forty passport scans on a Sunday evening
 * from an address nobody recognises. That has an answer only if every read of
 * personal data wrote a row here first, before the breach, when nobody thought
 * it mattered.
 *
 * ── Three rules ──
 *
 * 1. **Writing here never fails the operation.** An audit write that throws and
 *    takes down a document view is a worse outcome than a gap in the log, and a
 *    system that breaks when logging breaks is a system people disable logging
 *    in. Failures are reported to the error tracker and swallowed.
 *
 * 2. **No personal data in the log.** The subject is referenced by id. The
 *    metadata column holds counts, statuses, and reasons — never a name, a
 *    number, or a document. The log will be read by whoever is investigating an
 *    incident, possibly a regulator, and it must not itself be a second copy of
 *    the thing that leaked.
 *
 * 3. **Past tense, dotted names.** `document.viewed`, not `viewDocument` and not
 *    `document.view`. A log records what happened, and the grammar should stop
 *    anyone from writing an entry for something they were merely about to do.
 */

/**
 * The closed set. A free-string action name means the log accumulates
 * `document.viewed`, `documentViewed` and `view_document` over three years and
 * becomes unqueryable exactly when somebody needs to query it.
 */
export type AuditAction =
  /* Applicant */
  | "user.signed_in"
  | "user.signed_out"
  | "user.sessions_revoked"
  | "application.created"
  | "application.updated"
  | "application.submitted"
  | "application.withdrawn"
  | "document.uploaded"
  | "document.deleted"
  /* Payments.
     Four actions and not one, because "a payment happened" is not a single
     event: an order is created far more often than it is paid, a capture is
     the only one that means money moved, and a failure is the one somebody
     will come asking about. Collapsing them into `payment.updated` with the
     detail in `metadata` would make the audit log unqueryable for the only
     question anybody asks it — "when were we paid". */
  | "payment.order_created"
  | "payment.authorized"
  | "payment.captured"
  | "payment.failed"
  /* Staff */
  | "staff.signed_in"
  | "staff.sign_in_failed"
  | "staff.signed_out"
  | "staff.totp_enrolled"
  | "application.viewed"
  | "application.status_changed"
  | "document.viewed"
  | "document.reviewed"
  | "traveller.decrypted"
  /* System */
  | "retention.documents_deleted"
  | "retention.challenges_purged"
  | "erasure.requested"
  | "erasure.completed"
  | "email.sent";

export type AuditEntry = {
  action: AuditAction;
  actorType: "applicant" | "staff" | "system";
  actorId?: string;
  subjectType?: string;
  subjectId?: string;
  /** Counts, statuses, reasons. Never personal data — see rule 2. */
  metadata?: Record<string, string | number | boolean | null>;
};

/**
 * `traveller.decrypted` is in the list above and deserves its own note, because
 * it is the entry that matters most and the easiest one to forget to write.
 *
 * Encrypting passport numbers stops a database dump from being useful. It does
 * nothing about the person who is *supposed* to have access using it wrongly,
 * because the application decrypts for them by design. The only control left
 * for that case is that every decryption is recorded and attributable — which
 * turns "somebody read this" from unknowable into a query.
 */
export async function audit(entry: AuditEntry): Promise<void> {
  const database = db();

  // No database means development, where the log has nowhere to go. Print
  // rather than drop, so the fact that an auditable thing happened is still
  // visible to whoever is working on it.
  if (!database) {
    if (process.env.NODE_ENV !== "test") {
      console.info(`[audit] ${entry.action}`, entry.subjectId ?? "", entry.metadata ?? "");
    }
    return;
  }

  try {
    // Request headers are unavailable outside a request — cron jobs, background
    // work. That is expected, and an audit row with no address is better than
    // no audit row.
    let prefix: string | undefined;
    let agent: string | undefined;

    try {
      const headerList = await headers();
      prefix = ipPrefix(clientIp(headerList));
      agent = shortUserAgent(headerList);
    } catch {
      /* Not in a request context. */
    }

    await database.insert(auditLog).values({
      action: entry.action,
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      subjectType: entry.subjectType ?? null,
      subjectId: entry.subjectId ?? null,
      ipPrefix: prefix ?? null,
      userAgent: agent ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (error) {
    // Rule 1. Loud, but not fatal.
    console.error(`[audit] failed to record ${entry.action}`, error);
  }
}
