import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { audit } from "@/lib/audit";
import { BackendError, type BackendPrincipal, type StaffRole } from "@/lib/backend/client";
import { requireDb } from "@/lib/db/client";
import { applications, documentKind, documents, travellers } from "@/lib/db/schema";
import { checkLimit } from "@/lib/rateLimit";
import { ACCEPTED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, objectStore, type Area } from "./client";
import { normaliseDocumentImage } from "./normalise";

/**
 * DOCUMENTS — upload, normalise, view, delete.
 * ---------------------------------------------------------------------------
 * ── Why the browser uploads directly, and does not post the file to us ──
 *
 * The obvious design is a form that posts the image to a server action, which
 * stores it. It does not work and it is worth knowing why before someone
 * simplifies it back:
 *
 *   1. Server Actions cap request bodies at 1MB by default, and the reverse
 *      proxy in front of the app caps them again. A phone camera passport scan
 *      is routinely larger than both.
 *   2. Every byte would travel through this server twice — in, then out to
 *      storage — for no benefit, since the bytes are not inspected on the way
 *      past.
 *
 * So: the backend issues a **presigned S3 upload URL** scoped to one key, the
 * browser PUTs to S3 directly, and then tells us it is done. This server never
 * sees the upload; it sees a key it composed, in a bucket only the backend can
 * read.
 *
 * ── The three-step shape, and the failure it is built around ──
 *
 *   ticket   → authorise, decide the key, get a short-lived upload URL
 *   upload   → browser to S3, no server of ours involved
 *   finalise → read back, normalise, store, record
 *
 * The interesting case is an applicant who uploads and then closes the tab.
 * There is now an object in `incoming/` with no database row. That is fine and
 * by design: the backend purges `incoming/` hourly, and a document only exists
 * once `finalise` has written the row. An orphan file expires; an orphan row
 * would be a broken document forever.
 *
 * ── Who the backend is told is asking ──
 *
 * The applicant, with the key prefix of the one traveller this server has just
 * verified they own. See `lib/backend/client.ts`.
 */

/**
 * Read off the Postgres enum rather than written out again.
 *
 * This was a hand-maintained `"passport" | "photograph"`, and it was the type
 * that made adding the PAN card a compile error in four files instead of a
 * silent runtime rejection in one — which is the good outcome, but only
 * because somebody had to come here and edit it. Derived, the enum in
 * `schema.ts` is the single place a new kind is declared, and this follows.
 */
export type DocumentKind = (typeof documentKind.enumValues)[number];

export type UploadTicket = {
  /** Where the browser PUTs, with `Content-Type` set to what was declared.
   *  Expires in minutes, not hours. */
  uploadUrl: string;
  /** Passed back to `finaliseUpload` — the server re-derives everything else
   *  from it rather than trusting a second set of claims from the client. */
  path: string;
};

/* -------------------------------------------------------------------------- */
/* Ownership                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * THE CHECK EVERY ENTRY POINT MAKES.
 *
 * A client legitimately says *which* traveller it is uploading for. It does not
 * get to say whose traveller that is. So the lookup is by traveller id **and**
 * the owning application's user id, together, in one query — not "find the
 * traveller, then compare its owner", which is the same thing right up until
 * somebody refactors the comparison out.
 *
 * Returns the application id, because callers need it and because returning it
 * from the ownership check means the caller cannot use one it was given.
 */
async function assertOwnedTraveller(
  userId: string,
  travellerId: string,
): Promise<{ applicationId: string }> {
  const db = requireDb();

  const [row] = await db
    .select({ applicationId: travellers.applicationId })
    .from(travellers)
    .innerJoin(applications, eq(applications.id, travellers.applicationId))
    .where(
      and(
        eq(travellers.id, travellerId),
        eq(applications.userId, userId),
        isNull(applications.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    // Deliberately the same message whether the traveller does not exist or
    // belongs to somebody else. The difference is exactly what an enumeration
    // attack is looking for.
    throw new Error("No such traveller.");
  }

  return row;
}

/** The only principal an applicant's storage call is ever made as. The prefix
 *  comes from ids `assertOwnedTraveller` has just verified, never from input. */
function applicantPrincipal(userId: string, applicationId: string, travellerId: string): BackendPrincipal {
  return { type: "applicant", id: userId, keyPrefix: `${applicationId}/${travellerId}/` };
}

/**
 * Cleanup that must not fail the applicant's upload. A raw file left behind is
 * collected by the hourly purge; a replaced document left behind is logged,
 * because nothing else will find it.
 */
async function removeQuietly(principal: BackendPrincipal, area: Area, keys: string[]): Promise<void> {
  try {
    await objectStore.remove(principal, area, keys);
  } catch (error) {
    console.error(`[documents] could not remove ${keys.length} ${area} object(s)`, error instanceof Error ? error.message : error);
  }
}

/* -------------------------------------------------------------------------- */
/* 1 — the ticket                                                              */
/* -------------------------------------------------------------------------- */

export async function issueUploadTicket(input: {
  userId: string;
  travellerId: string;
  kind: DocumentKind;
  contentType: string;
  byteSize: number;
}): Promise<UploadTicket> {
  const { applicationId } = await assertOwnedTraveller(input.userId, input.travellerId);

  const limit = await checkLimit("uploadUrlPerUser", input.userId);
  if (!limit.ok) {
    throw new Error("Too many uploads in a short time. Wait a few minutes and try again.");
  }

  // Both checks are advisory — the client controls what it actually PUTs — and
  // both are worth making, because catching the wrong file here produces a
  // useful message before a 12MB upload rather than after it. The binding
  // versions are the backend's size check on read-back and `normaliseDocumentImage`.
  if (!ACCEPTED_UPLOAD_TYPES.includes(input.contentType as (typeof ACCEPTED_UPLOAD_TYPES)[number])) {
    throw new Error("Upload a JPEG, PNG or WebP image.");
  }

  if (input.byteSize > MAX_UPLOAD_BYTES) {
    throw new Error(
      `That file is ${Math.round(input.byteSize / 1024 / 1024)}MB. The limit is ${
        MAX_UPLOAD_BYTES / 1024 / 1024
      }MB.`,
    );
  }

  // The key is composed by the server from ids it has just verified. Nothing
  // from the client reaches it — a client-supplied filename is how a `../`
  // ends up in an object key.
  const path = `${applicationId}/${input.travellerId}/${input.kind}-${randomUUID()}`;

  try {
    const presigned = await objectStore.uploadUrl(
      applicantPrincipal(input.userId, applicationId, input.travellerId),
      "incoming",
      path,
      input.contentType,
    );
    return { uploadUrl: presigned.url, path };
  } catch (error) {
    console.error("[documents] could not issue upload url", error instanceof Error ? error.message : error);
    throw new Error("Could not prepare the upload. Try again.");
  }
}

/* -------------------------------------------------------------------------- */
/* 2 — finalising                                                              */
/* -------------------------------------------------------------------------- */

export type FinaliseResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

export async function finaliseUpload(input: {
  userId: string;
  travellerId: string;
  kind: DocumentKind;
  path: string;
}): Promise<FinaliseResult> {
  const { applicationId } = await assertOwnedTraveller(input.userId, input.travellerId);
  const db = requireDb();
  const principal = applicantPrincipal(input.userId, applicationId, input.travellerId);

  // The path was minted by `issueUploadTicket` from verified ids, so re-deriving
  // its expected prefix and comparing is a complete check: a client that hands
  // back somebody else's path fails here, before anything is read.
  const expectedPrefix = `${applicationId}/${input.travellerId}/${input.kind}-`;
  if (!input.path.startsWith(expectedPrefix)) {
    return { ok: false, error: "That upload does not belong to this application." };
  }

  let original: Buffer;
  try {
    original = await objectStore.read(principal, "incoming", input.path);
  } catch (error) {
    // 413: the backend measured the object, found it over the limit, and has
    // already deleted it. Its message says how large it was.
    if (error instanceof BackendError && error.status === 413) {
      return { ok: false, error: error.message };
    }
    return {
      ok: false,
      error: "We could not find that upload. It may have expired — try again.",
    };
  }

  const normalised = await normaliseDocumentImage(original);

  // Whatever happens next, the raw file goes. It has served its only purpose
  // and it is the copy that still carries the applicant's GPS coordinates.
  await removeQuietly(principal, "incoming", [input.path]);

  if (!normalised.ok) {
    return { ok: false, error: normalised.error };
  }

  const storedPath = `${applicationId}/${input.travellerId}/${input.kind}-${randomUUID()}.jpg`;

  try {
    await objectStore.write(principal, "documents", storedPath, normalised.bytes, normalised.contentType);
  } catch (error) {
    console.error("[documents] could not store document", error instanceof Error ? error.message : error);
    return { ok: false, error: "We could not store that document. Try again." };
  }

  // One document of each kind per traveller. Re-uploading replaces, which is
  // what "retake photo" means to the applicant — so the old row is marked
  // deleted and its object removed rather than left as a second passport scan
  // nobody will look at but everybody is liable for.
  const [previous] = await db
    .select({ id: documents.id, storagePath: documents.storagePath })
    .from(documents)
    .where(
      and(
        eq(documents.travellerId, input.travellerId),
        eq(documents.kind, input.kind),
        isNull(documents.deletedAt),
      ),
    )
    .limit(1);

  const [row] = await db
    .insert(documents)
    .values({
      applicationId,
      travellerId: input.travellerId,
      kind: input.kind,
      storagePath: storedPath,
      contentType: normalised.contentType,
      byteSize: normalised.bytes.byteLength,
      checksum: normalised.checksum,
      normalised: true,
    })
    .returning({ id: documents.id });

  if (previous) {
    await removeQuietly(principal, "documents", [previous.storagePath]);
    await db
      .update(documents)
      .set({ deletedAt: new Date() })
      .where(eq(documents.id, previous.id));
  }

  await audit({
    action: "document.uploaded",
    actorType: "applicant",
    actorId: input.userId,
    subjectType: "document",
    subjectId: row.id,
    metadata: {
      kind: input.kind,
      bytes: normalised.bytes.byteLength,
      width: normalised.width,
      height: normalised.height,
      // Recorded because "was location data present in what applicants sent us"
      // is a question worth being able to answer, and the answer is not
      // recoverable once the original is gone.
      strippedExif: normalised.hadExif,
      replacedPrevious: Boolean(previous),
    },
  });

  return { ok: true, documentId: row.id };
}

/* -------------------------------------------------------------------------- */
/* 3 — viewing                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * A URL is minted per view and never stored. A stored URL outlives the
 * signature inside it and becomes either a broken link or — if the expiry was
 * generous — a passport scan reachable by anyone who has ever seen the address.
 * The `documents` table holds the *path*, and this turns a path into sixty
 * seconds of access (the backend's `VIEW_URL_TTL_SECONDS`).
 *
 * The staff member's role is passed through so the backend's RBAC makes its own
 * decision; `requireRole` has already made this app's.
 */
export async function documentViewUrl(
  storagePath: string,
  staff: { id: string; role: StaffRole },
): Promise<string | null> {
  try {
    return await objectStore.viewUrl({ type: "staff", id: staff.id, role: staff.role }, storagePath);
  } catch (error) {
    console.error("[documents] could not sign view url", error instanceof Error ? error.message : error);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* 4 — deletion                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Removes the object and marks the row. The row survives on purpose: "we held a
 * passport scan for this application and deleted it on this date" is a claim the
 * client may have to make to a regulator, and a deleted row cannot make it.
 *
 * The backend is asked as `system`: by the time this runs the caller — an
 * erasure, a retention run, an admin action — has already decided the deletion
 * is allowed, and `actor` is what the audit log records.
 */
export async function deleteDocument(documentId: string, actor: {
  type: "applicant" | "staff" | "system";
  id?: string;
}): Promise<void> {
  const db = requireDb();

  const [row] = await db
    .select({ id: documents.id, storagePath: documents.storagePath })
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1);

  if (!row) return;

  await objectStore.remove({ type: "system" }, "documents", [row.storagePath]);
  await db.update(documents).set({ deletedAt: new Date() }).where(eq(documents.id, row.id));

  await audit({
    action: "document.deleted",
    actorType: actor.type,
    actorId: actor.id,
    subjectType: "document",
    subjectId: row.id,
  });
}
