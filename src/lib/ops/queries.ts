import "server-only";

import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";

import { audit } from "@/lib/audit";
import { decryptField, FIELD_CONTEXT } from "@/lib/crypto/fields";
import { requireDb } from "@/lib/db/client";
import {
  applicationEvents,
  applications,
  documents,
  travellers,
  users,
} from "@/lib/db/schema";
import type { Staff } from "./dal";

/**
 * WHAT THE CONSOLE READS.
 * ---------------------------------------------------------------------------
 * Separate from `lib/applications/repository.ts` on purpose. That file scopes
 * every query to one applicant's `user_id`, which is the property that makes it
 * safe. This one deliberately does not — staff see across applicants, which is
 * the job — so it needs a different set of guarantees, and mixing the two would
 * mean a function whose safety depends on which argument you passed.
 *
 * The guarantees here are:
 *
 *   - the caller is a `Staff` object, which only `requireStaff()` can produce;
 *   - anything that decrypts a passport number writes an audit row *before*
 *     returning it, attributed to that staff member.
 */

export type QueueRow = {
  id: string;
  reference: string;
  countrySlug: string;
  status: string;
  travellerCount: number;
  documentCount: number;
  pendingDocuments: number;
  submittedAt: number | null;
  updatedAt: number;
};

/** The default view. Everything that needs a human, oldest first — because the
 *  application that has been waiting longest is the one somebody is chasing. */
export const ACTIVE_STATUSES = ["submitted", "received", "processing"] as const;

export async function queue(input: {
  status?: string;
  limit?: number;
}): Promise<QueueRow[]> {
  const db = requireDb();
  const limit = Math.min(input.limit ?? 50, 200);

  const rows = await db
    .select({
      id: applications.id,
      reference: applications.reference,
      countrySlug: applications.countrySlug,
      status: applications.status,
      travellerCount: applications.travellerCount,
      submittedAt: applications.submittedAt,
      updatedAt: applications.updatedAt,
    })
    .from(applications)
    .where(
      and(
        isNull(applications.deletedAt),
        input.status
          ? eq(applications.status, input.status as (typeof ACTIVE_STATUSES)[number])
          : inArray(applications.status, [...ACTIVE_STATUSES]),
      ),
    )
    .orderBy(asc(applications.updatedAt))
    .limit(limit);

  if (rows.length === 0) return [];

  // One grouped query rather than a count per row. At fifty rows the N+1
  // version is fifty round trips to a pooled connection, and the queue is the
  // page somebody keeps open all day.
  const counts = await db
    .select({
      applicationId: documents.applicationId,
      status: documents.status,
      total: count(),
    })
    .from(documents)
    .where(
      and(
        inArray(
          documents.applicationId,
          rows.map((row) => row.id),
        ),
        isNull(documents.deletedAt),
      ),
    )
    .groupBy(documents.applicationId, documents.status);

  const byApplication = new Map<string, { total: number; pending: number }>();

  for (const row of counts) {
    const entry = byApplication.get(row.applicationId) ?? { total: 0, pending: 0 };
    entry.total += row.total;
    if (row.status === "pending") entry.pending += row.total;
    byApplication.set(row.applicationId, entry);
  }

  return rows.map((row) => ({
    id: row.id,
    reference: row.reference,
    countrySlug: row.countrySlug,
    status: row.status,
    travellerCount: row.travellerCount,
    documentCount: byApplication.get(row.id)?.total ?? 0,
    pendingDocuments: byApplication.get(row.id)?.pending ?? 0,
    submittedAt: row.submittedAt?.getTime() ?? null,
    updatedAt: row.updatedAt.getTime(),
  }));
}

/* -------------------------------------------------------------------------- */

export type OpsTraveller = {
  id: string;
  position: number;
  fullName: string | null;
  passportNumber: string | null;
  dateOfBirth: string | null;
  passportExpiry: string | null;
  nationality: string | null;
  gender: string | null;
  email: string | null;
  phone: string | null;
};

export type OpsApplication = {
  id: string;
  reference: string;
  countrySlug: string;
  status: string;
  plan: number | null;
  travelDate: string | null;
  travelWindow: string | null;
  applicantPhone: string;
  createdAt: number;
  submittedAt: number | null;
  travellers: OpsTraveller[];
  documents: Array<{
    id: string;
    travellerId: string;
    kind: string;
    status: string;
    rejectionReason: string | null;
    storagePath: string;
    uploadedAt: number;
  }>;
  events: Array<{ status: string; note: string | null; at: number; actorType: string }>;
};

/**
 * THE ONE FUNCTION THAT DECRYPTS.
 *
 * Encrypting passport numbers stops a database dump from being useful. It does
 * nothing about the person who is supposed to have access using it wrongly,
 * because the application decrypts for them by design. The only control left for
 * that case is that every decryption is attributable — which is why the audit
 * row is written here, in the same function, rather than being left to whichever
 * page happens to call it.
 *
 * Written *before* the return, not after, so a caller that throws mid-render
 * still leaves the record. An audit trail that only records successful reads is
 * an audit trail with a gap exactly where an incident would be.
 */
export async function applicationForOps(
  staff: Staff,
  applicationId: string,
): Promise<OpsApplication | null> {
  const db = requireDb();

  const [row] = await db
    .select({
      application: applications,
      applicantPhone: users.phoneE164,
    })
    .from(applications)
    .innerJoin(users, eq(users.id, applications.userId))
    .where(and(eq(applications.id, applicationId), isNull(applications.deletedAt)))
    .limit(1);

  if (!row) return null;

  const [travellerRows, documentRows, eventRows] = await Promise.all([
    db
      .select()
      .from(travellers)
      .where(eq(travellers.applicationId, applicationId))
      .orderBy(asc(travellers.position)),
    db
      .select()
      .from(documents)
      .where(and(eq(documents.applicationId, applicationId), isNull(documents.deletedAt)))
      .orderBy(asc(documents.uploadedAt)),
    db
      .select()
      .from(applicationEvents)
      .where(eq(applicationEvents.applicationId, applicationId))
      .orderBy(desc(applicationEvents.createdAt)),
  ]);

  const decryptedCount = travellerRows.filter((t) => t.passportNumberEncrypted).length;

  await audit({
    action: "application.viewed",
    actorType: "staff",
    actorId: staff.id,
    subjectType: "application",
    subjectId: applicationId,
    metadata: { travellersDecrypted: decryptedCount },
  });

  if (decryptedCount > 0) {
    await audit({
      action: "traveller.decrypted",
      actorType: "staff",
      actorId: staff.id,
      subjectType: "application",
      subjectId: applicationId,
      metadata: { count: decryptedCount },
    });
  }

  const safeDecrypt = (value: string | null, context: string) => {
    if (!value) return null;
    try {
      return decryptField(value, context);
    } catch {
      // One unreadable row must not take down a queue that lists two hundred.
      // The console shows "unreadable" rather than a blank, so it is visible
      // rather than looking like a traveller who typed nothing.
      return "— unreadable —";
    }
  };

  return {
    id: row.application.id,
    reference: row.application.reference,
    countrySlug: row.application.countrySlug,
    status: row.application.status,
    plan: row.application.plan,
    travelDate: row.application.travelDate,
    travelWindow: row.application.travelWindow,
    applicantPhone: row.applicantPhone,
    createdAt: row.application.createdAt.getTime(),
    submittedAt: row.application.submittedAt?.getTime() ?? null,
    travellers: travellerRows.map((traveller) => ({
      id: traveller.id,
      position: traveller.position,
      fullName: traveller.fullName,
      passportNumber: safeDecrypt(
        traveller.passportNumberEncrypted,
        FIELD_CONTEXT.passportNumber,
      ),
      dateOfBirth: safeDecrypt(traveller.dobEncrypted, FIELD_CONTEXT.dob),
      passportExpiry: traveller.passportExpiry,
      nationality: traveller.nationality,
      gender: traveller.gender,
      email: traveller.email,
      phone: traveller.phoneE164,
    })),
    documents: documentRows.map((document) => ({
      id: document.id,
      travellerId: document.travellerId,
      kind: document.kind,
      status: document.status,
      rejectionReason: document.rejectionReason,
      storagePath: document.storagePath,
      uploadedAt: document.uploadedAt.getTime(),
    })),
    events: eventRows.map((event) => ({
      status: event.toStatus,
      note: event.note,
      at: event.createdAt.getTime(),
      actorType: event.actorType,
    })),
  };
}

/** Counts for the queue's filter tabs. One query rather than one per status. */
export async function statusCounts(): Promise<Record<string, number>> {
  const db = requireDb();

  const rows = await db
    .select({ status: applications.status, total: count() })
    .from(applications)
    .where(isNull(applications.deletedAt))
    .groupBy(applications.status);

  return Object.fromEntries(rows.map((row) => [row.status, row.total]));
}
