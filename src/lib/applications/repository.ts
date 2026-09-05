import "server-only";

import { randomInt } from "node:crypto";

import { and, desc, eq, isNull } from "drizzle-orm";

import { audit } from "@/lib/audit";
import {
  blindIndex,
  currentKeyVersion,
  decryptField,
  encryptField,
  FIELD_CONTEXT,
} from "@/lib/crypto/fields";
import { requireDb } from "@/lib/db/client";
import {
  applicationEvents,
  applications,
  documentKind,
  documents,
  travellers,
} from "@/lib/db/schema";
import { capabilities } from "@/lib/env";

/**
 * APPLICATIONS — the server side of the flow that until now lived in a tab.
 * ---------------------------------------------------------------------------
 * `lib/applicationDraft.ts` says in its own header that drafts are "a record, in
 * this browser's localStorage" and explicitly not "an account, a synced
 * application, or a submission". It also lists what it deliberately does *not*
 * store: passport numbers, dates of birth, expiry dates, email, phone, and any
 * document — all of which are held in memory for the life of the tab and lost
 * when it closes.
 *
 * This is where those go instead. The reasoning in that file for keeping them
 * out of `localStorage` — readable by any script on the origin, survives
 * indefinitely — is exactly the reasoning for encrypting them here.
 *
 * ── What stays in the browser ──
 *
 * The local draft does not go away and should not. It is what makes "Resume
 * application" work for a visitor who has not signed in, and it costs nothing.
 * Once there is an account, this becomes the record and the local draft becomes
 * a pointer to it. Two stores, two jobs, and `applicationDraft.ts` has been
 * given the seam to tell them apart.
 */

/* -------------------------------------------------------------------------- */
/* References                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Support happens on the telephone, and a UUID cannot be read down one. The
 * alphabet omits I, O, 0 and 1 for the same reason a postcode does: somebody is
 * going to read this aloud to somebody else who is going to write it down.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function newReference(): string {
  let body = "";
  for (let index = 0; index < 8; index += 1) {
    body += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return `ABZ-${body.slice(0, 4)}-${body.slice(4)}`;
}

/* -------------------------------------------------------------------------- */
/* Encryption of traveller fields                                              */
/* -------------------------------------------------------------------------- */

/**
 * When `DATA_ENCRYPTION_KEY` is absent, these throw rather than falling back to
 * plaintext — the one degraded mode this codebase does not offer.
 *
 * Everything else in the application has a documented local fallback: no
 * database means the in-memory store, no Resend means the email is printed to
 * the terminal. Writing an unencrypted passport number would be a fallback whose
 * failure mode is invisible and permanent, so instead the whole write refuses,
 * and `capabilities.encryption()` is what a caller checks first. Production
 * requires the key (see `env.ts`), so this only ever bites in development.
 */
function encryptOptional(value: string | null | undefined, context: string): string | null {
  if (!value) return null;
  return encryptField(value, context);
}

function decryptOptional(value: string | null, context: string): string | null {
  if (!value) return null;

  try {
    return decryptField(value, context);
  } catch (error) {
    // A row written with a key that has since been retired, or a corrupted
    // value. Returning null rather than throwing keeps one bad row from taking
    // down an ops queue that lists two hundred of them — and the error is
    // reported, so it does not pass unnoticed either.
    console.error(`[applications] could not decrypt ${context}`, error);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

export type TravellerInput = {
  position: number;
  fullName?: string | null;
  dateOfBirth?: string | null;
  passportNumber?: string | null;
  passportExpiry?: string | null;
  nationality?: string | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type TravellerRecord = TravellerInput & { id: string };

export type ApplicationRecord = {
  id: string;
  reference: string;
  countrySlug: string;
  status: string;
  plan: number | null;
  travellerCount: number;
  travelDate: string | null;
  travelWindow: string | null;
  step: string | null;
  createdAt: number;
  updatedAt: number;
  submittedAt: number | null;
};

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

function toRecord(row: typeof applications.$inferSelect): ApplicationRecord {
  return {
    id: row.id,
    reference: row.reference,
    countrySlug: row.countrySlug,
    status: row.status,
    plan: row.plan,
    travellerCount: row.travellerCount,
    travelDate: row.travelDate,
    travelWindow: row.travelWindow,
    step: row.step,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    submittedAt: row.submittedAt?.getTime() ?? null,
  };
}

export async function listApplications(userId: string): Promise<ApplicationRecord[]> {
  const db = requireDb();

  const rows = await db
    .select()
    .from(applications)
    .where(and(eq(applications.userId, userId), isNull(applications.deletedAt)))
    .orderBy(desc(applications.updatedAt));

  return rows.map(toRecord);
}

/**
 * Every read is scoped by `userId` in the `where` clause rather than fetched and
 * then checked. It is the same rule as `storage/documents.ts`: a comparison
 * after the fact is a comparison somebody can refactor away, and a `where` is
 * not.
 */
export type DocumentRecord = {
  id: string;
  travellerId: string;
  travellerPosition: number;
  /** Off the Postgres enum — see `storage/documents.ts` for why. */
  kind: (typeof documentKind.enumValues)[number];
  status: string;
  rejectionReason: string | null;
  uploadedAt: number;
};

export async function getApplication(
  userId: string,
  applicationId: string,
): Promise<{
  application: ApplicationRecord;
  travellers: TravellerRecord[];
  documents: DocumentRecord[];
} | null> {
  const db = requireDb();

  const [row] = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.userId, userId),
        isNull(applications.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return null;

  const travellerRows = await db
    .select()
    .from(travellers)
    .where(eq(travellers.applicationId, row.id))
    .orderBy(travellers.position);

  const positionById = new Map(travellerRows.map((t) => [t.id, t.position]));

  const documentRows = await db
    .select({
      id: documents.id,
      travellerId: documents.travellerId,
      kind: documents.kind,
      status: documents.status,
      rejectionReason: documents.rejectionReason,
      uploadedAt: documents.uploadedAt,
    })
    .from(documents)
    .where(and(eq(documents.applicationId, row.id), isNull(documents.deletedAt)));

  return {
    application: toRecord(row),
    documents: documentRows.map((document) => ({
      id: document.id,
      travellerId: document.travellerId,
      travellerPosition: positionById.get(document.travellerId) ?? 0,
      kind: document.kind,
      status: document.status,
      rejectionReason: document.rejectionReason,
      uploadedAt: document.uploadedAt.getTime(),
    })),
    travellers: travellerRows.map((traveller) => ({
      id: traveller.id,
      position: traveller.position,
      fullName: traveller.fullName,
      dateOfBirth: decryptOptional(traveller.dobEncrypted, FIELD_CONTEXT.dob),
      passportNumber: decryptOptional(
        traveller.passportNumberEncrypted,
        FIELD_CONTEXT.passportNumber,
      ),
      passportExpiry: traveller.passportExpiry,
      nationality: traveller.nationality,
      gender: traveller.gender,
      email: traveller.email,
      phone: traveller.phoneE164,
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * One draft per country per applicant. Starting an application for Japan twice
 * resumes the first rather than accumulating a second, because from the
 * applicant's point of view there is one Japan application in progress and the
 * interface says "Resume".
 */
export async function openApplication(
  userId: string,
  countrySlug: string,
): Promise<ApplicationRecord> {
  const db = requireDb();

  const [existing] = await db
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.userId, userId),
        eq(applications.countrySlug, countrySlug),
        eq(applications.status, "draft"),
        isNull(applications.deletedAt),
      ),
    )
    .limit(1);

  if (existing) return toRecord(existing);

  // A collision on an eight-character reference is roughly one in a trillion,
  // which is not zero, and the unique index means the insert fails rather than
  // producing two applications a support agent cannot tell apart. Retrying is
  // three lines.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const [row] = await db
        .insert(applications)
        .values({ userId, countrySlug, reference: newReference(), status: "draft" })
        .returning();

      await audit({
        action: "application.created",
        actorType: "applicant",
        actorId: userId,
        subjectType: "application",
        subjectId: row.id,
        metadata: { countrySlug },
      });

      return toRecord(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("applications_reference_idx")) throw error;
    }
  }

  throw new Error("Could not allocate an application reference.");
}

export type ApplicationPatch = {
  plan?: number | null;
  travellerCount?: number;
  travelDate?: string | null;
  travelWindow?: string | null;
  step?: string | null;
};

export async function updateApplication(
  userId: string,
  applicationId: string,
  patch: ApplicationPatch,
): Promise<ApplicationRecord | null> {
  const db = requireDb();

  const [row] = await db
    .update(applications)
    .set({ ...patch, updatedAt: new Date() })
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.userId, userId),
        // A submitted application is not editable by the applicant. Without
        // this, a stale tab autosaving in the background could rewrite the
        // travel date of something already with a consulate.
        eq(applications.status, "draft"),
        isNull(applications.deletedAt),
      ),
    )
    .returning();

  return row ? toRecord(row) : null;
}

/**
 * Replaces the traveller list wholesale. The alternative — diffing by id —
 * would have the client sending ids back, and an id from the client is a claim
 * about which row to overwrite. Positions come from the form's own ordering and
 * the application is already proven to belong to the caller, so a full replace
 * is both simpler and harder to abuse.
 */
export async function saveTravellers(
  userId: string,
  applicationId: string,
  input: TravellerInput[],
): Promise<Array<{ position: number; id: string }>> {
  if (!capabilities.encryption()) {
    throw new Error(
      "DATA_ENCRYPTION_KEY is not set. Refusing to store passport details in plaintext — " +
        "see lib/crypto/fields.ts.",
    );
  }

  const db = requireDb();

  const [owned] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.userId, userId),
        eq(applications.status, "draft"),
        isNull(applications.deletedAt),
      ),
    )
    .limit(1);

  if (!owned) throw new Error("No such application.");

  const keyVersion = currentKeyVersion();

  /**
   * The ids are returned because the document upload needs them, and it needs
   * them *before* passport details are entered.
   *
   * The step order is setup → documents → details, so an applicant uploads a
   * passport scan for a traveller who so far has nothing but a first name. A
   * document row references a traveller row, so the traveller row has to exist
   * by then — which is why the sync layer saves travellers at the setup step
   * and again as details are filled in, and why this function is a complete
   * replace rather than a patch.
   */
  const assigned: Array<{ position: number; id: string }> = [];

  await db.transaction(async (tx) => {
    // Deleting the travellers cascades to their documents rows, which would
    // orphan the stored objects. So documents move to the traveller in the same
    // position rather than being dropped — an applicant correcting a spelling
    // must not silently lose the passport scan they already uploaded.
    const previous = await tx
      .select({ id: travellers.id, position: travellers.position })
      .from(travellers)
      .where(eq(travellers.applicationId, applicationId));

    const byPosition = new Map(previous.map((row) => [row.position, row.id]));

    for (const traveller of input) {
      const encrypted = {
        fullName: traveller.fullName ?? null,
        passportNumberEncrypted: encryptOptional(
          traveller.passportNumber,
          FIELD_CONTEXT.passportNumber,
        ),
        passportNumberIndex: traveller.passportNumber
          ? blindIndex(traveller.passportNumber, FIELD_CONTEXT.passportNumber)
          : null,
        dobEncrypted: encryptOptional(traveller.dateOfBirth, FIELD_CONTEXT.dob),
        keyVersion,
        passportExpiry: traveller.passportExpiry ?? null,
        nationality: traveller.nationality ?? null,
        gender: traveller.gender ?? null,
        email: traveller.email ?? null,
        phoneE164: traveller.phone ?? null,
        updatedAt: new Date(),
      };

      const existingId = byPosition.get(traveller.position);

      if (existingId) {
        await tx.update(travellers).set(encrypted).where(eq(travellers.id, existingId));
        byPosition.delete(traveller.position);
        assigned.push({ position: traveller.position, id: existingId });
      } else {
        const [row] = await tx
          .insert(travellers)
          .values({ applicationId, position: traveller.position, ...encrypted })
          .returning({ id: travellers.id });
        assigned.push({ position: traveller.position, id: row.id });
      }
    }

    // Travellers removed because the party shrank. Their documents cascade,
    // which is correct here — the person is no longer on the application.
    for (const orphanId of byPosition.values()) {
      await tx.delete(travellers).where(eq(travellers.id, orphanId));
    }

    await tx
      .update(applications)
      .set({ travellerCount: input.length, updatedAt: new Date() })
      .where(eq(applications.id, applicationId));
  });

  await audit({
    action: "application.updated",
    actorType: "applicant",
    actorId: userId,
    subjectType: "application",
    subjectId: applicationId,
    metadata: { travellers: input.length },
  });

  return assigned.sort((a, b) => a.position - b.position);
}

/* -------------------------------------------------------------------------- */
/* Submission                                                                  */
/* -------------------------------------------------------------------------- */

export type SubmitResult =
  | { ok: true; reference: string }
  | { ok: false; error: string };

/**
 * The transition from "this applicant's draft" to "Abizon's work queue".
 *
 * `lib/application/status.ts` is careful that `submitted` and everything after
 * it describe things happening on a server and at a consulate, and refuses to
 * report them without a real source. This is that source for the first of them:
 * the applicant pressed submit, and we recorded it. Everything past `submitted`
 * still requires a human in the ops console to observe it, which is honest —
 * there is no consulate API to ask.
 */
export async function submitApplication(
  userId: string,
  applicationId: string,
): Promise<SubmitResult> {
  const db = requireDb();
  const now = new Date();

  const found = await getApplication(userId, applicationId);
  if (!found) return { ok: false, error: "No such application." };

  if (found.application.status !== "draft") {
    return { ok: false, error: "That application has already been submitted." };
  }

  // Checked here rather than trusted from the client's "ready" state, because
  // the client's state is a rendering decision and this is a commitment.
  if (found.travellers.length === 0) {
    return { ok: false, error: "Add at least one traveller before submitting." };
  }

  const incomplete = found.travellers.find(
    (traveller) => !traveller.fullName || !traveller.passportNumber || !traveller.dateOfBirth,
  );

  if (incomplete) {
    return {
      ok: false,
      error: `Traveller ${incomplete.position + 1} is missing passport details.`,
    };
  }

  const uploaded = await db
    .select({ id: documents.id })
    .from(documents)
    .where(and(eq(documents.applicationId, applicationId), isNull(documents.deletedAt)));

  if (uploaded.length === 0) {
    return { ok: false, error: "Upload the required documents before submitting." };
  }

  await db.transaction(async (tx) => {
    await tx
      .update(applications)
      .set({ status: "submitted", submittedAt: now, updatedAt: now })
      .where(eq(applications.id, applicationId));

    await tx.insert(applicationEvents).values({
      applicationId,
      fromStatus: "draft",
      toStatus: "submitted",
      actorType: "applicant",
      actorId: userId,
    });
  });

  await audit({
    action: "application.submitted",
    actorType: "applicant",
    actorId: userId,
    subjectType: "application",
    subjectId: applicationId,
    metadata: { travellers: found.travellers.length, documents: uploaded.length },
  });

  return { ok: true, reference: found.application.reference };
}

/* -------------------------------------------------------------------------- */
/* Tracking                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The public tracking page takes a reference, which is short and therefore
 * guessable in a way a UUID is not. So it returns the status and the history and
 * nothing else — no name, no passport number, no document. Somebody who guesses
 * a reference learns that an application exists and where it has got to, and
 * that is all there is to learn.
 */
export async function trackByReference(reference: string): Promise<{
  reference: string;
  countrySlug: string;
  status: string;
  events: Array<{ status: string; note: string | null; at: number }>;
} | null> {
  const db = requireDb();

  const [row] = await db
    .select({
      id: applications.id,
      reference: applications.reference,
      countrySlug: applications.countrySlug,
      status: applications.status,
    })
    .from(applications)
    .where(
      and(eq(applications.reference, reference.toUpperCase()), isNull(applications.deletedAt)),
    )
    .limit(1);

  if (!row) return null;

  const events = await db
    .select({
      status: applicationEvents.toStatus,
      note: applicationEvents.note,
      createdAt: applicationEvents.createdAt,
    })
    .from(applicationEvents)
    .where(eq(applicationEvents.applicationId, row.id))
    .orderBy(applicationEvents.createdAt);

  return {
    reference: row.reference,
    countrySlug: row.countrySlug,
    status: row.status,
    events: events.map((event) => ({
      status: event.status,
      note: event.note,
      at: event.createdAt.getTime(),
    })),
  };
}
