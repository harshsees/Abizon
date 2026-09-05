import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import { audit } from "@/lib/audit";
import { requireDb } from "@/lib/db/client";
import { applications, documentKind, documents, travellers } from "@/lib/db/schema";
import { checkLimit } from "@/lib/rateLimit";
import {
  ACCEPTED_UPLOAD_TYPES,
  BUCKETS,
  MAX_UPLOAD_BYTES,
  requireStorage,
} from "./client";
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
 *   1. Server Actions cap request bodies at 1MB by default and Vercel caps
 *      function request bodies at about 4.5MB regardless. A phone camera
 *      passport scan is routinely larger than both.
 *   2. Every byte would travel through a billed function twice — in, then out
 *      to storage — for no benefit, since the bytes are not inspected on the
 *      way past.
 *
 * So: the server issues a **signed upload URL** scoped to one path, the browser
 * PUTs to Supabase directly, and then tells us it is done. The server never
 * sees the upload; it sees a path it minted, in a bucket only it can read.
 *
 * ── The three-step shape, and the failure it is built around ──
 *
 *   ticket   → authorise, decide the path, mint a short-lived upload URL
 *   upload   → browser to Supabase, no function involved
 *   finalise → download, normalise, store, record
 *
 * The interesting case is an applicant who uploads and then closes the tab.
 * There is now an object in `incoming` with no database row. That is fine and
 * by design: `incoming` is emptied daily by the retention job, and a document
 * only exists once `finalise` has written the row. An orphan file expires; an
 * orphan row would be a broken document forever.
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
  /** Where the browser PUTs. Expires in minutes, not hours. */
  uploadUrl: string;
  /** Supabase's one-time token for that URL. */
  token: string;
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
  // versions are the bucket's own limits and `normaliseDocumentImage`.
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

  // The path is composed by the server from ids it has just verified. Nothing
  // from the client reaches it — a client-supplied filename is how a `../`
  // ends up in an object key.
  const path = `${applicationId}/${input.travellerId}/${input.kind}-${randomUUID()}`;

  const { data, error } = await requireStorage()
    .storage.from(BUCKETS.incoming)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(`Could not prepare the upload: ${error?.message ?? "unknown error"}`);
  }

  return { uploadUrl: data.signedUrl, token: data.token, path: data.path };
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
  const client = requireStorage();

  // The path was minted by `issueUploadTicket` from verified ids, so re-deriving
  // its expected prefix and comparing is a complete check: a client that hands
  // back somebody else's path fails here, before anything is read.
  const expectedPrefix = `${applicationId}/${input.travellerId}/${input.kind}-`;
  if (!input.path.startsWith(expectedPrefix)) {
    return { ok: false, error: "That upload does not belong to this application." };
  }

  const download = await client.storage.from(BUCKETS.incoming).download(input.path);

  if (download.error || !download.data) {
    return {
      ok: false,
      error: "We could not find that upload. It may have expired — try again.",
    };
  }

  const original = Buffer.from(await download.data.arrayBuffer());
  const normalised = await normaliseDocumentImage(original);

  // Whatever happens next, the raw file goes. It has served its only purpose
  // and it is the copy that still carries the applicant's GPS coordinates.
  await client.storage.from(BUCKETS.incoming).remove([input.path]);

  if (!normalised.ok) {
    return { ok: false, error: normalised.error };
  }

  const storedPath = `${applicationId}/${input.travellerId}/${input.kind}-${randomUUID()}.jpg`;

  const upload = await client.storage
    .from(BUCKETS.documents)
    .upload(storedPath, normalised.bytes, {
      contentType: normalised.contentType,
      // Never overwrite. A path collision would mean a random UUID repeated,
      // which does not happen — and if it somehow did, failing is better than
      // one applicant's passport quietly replacing another's.
      upsert: false,
    });

  if (upload.error) {
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
    await client.storage.from(BUCKETS.documents).remove([previous.storagePath]);
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

/** Sixty seconds. Long enough to render an image, short enough that a URL
 *  pasted into a support ticket is dead before anyone clicks it. */
const VIEW_URL_TTL_SECONDS = 60;

/**
 * A URL is minted per view and never stored. A stored URL outlives the
 * signature inside it and becomes either a broken link or — if the expiry was
 * generous — a passport scan reachable by anyone who has ever seen the address.
 * The `documents` table holds the *path*, and this turns a path into sixty
 * seconds of access.
 */
export async function documentViewUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await requireStorage()
    .storage.from(BUCKETS.documents)
    .createSignedUrl(storagePath, VIEW_URL_TTL_SECONDS);

  if (error || !data) {
    console.error("[documents] could not sign view url", error);
    return null;
  }

  return data.signedUrl;
}

/* -------------------------------------------------------------------------- */
/* 4 — deletion                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Removes the object and marks the row. The row survives on purpose: "we held a
 * passport scan for this application and deleted it on this date" is a claim the
 * client may have to make to a regulator, and a deleted row cannot make it.
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

  await requireStorage().storage.from(BUCKETS.documents).remove([row.storagePath]);
  await db.update(documents).set({ deletedAt: new Date() }).where(eq(documents.id, row.id));

  await audit({
    action: "document.deleted",
    actorType: actor.type,
    actorId: actor.id,
    subjectType: "document",
    subjectId: row.id,
  });
}
