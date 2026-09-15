import "server-only";

import { backendRequest, type BackendPrincipal } from "@/lib/backend/client";
import { capabilities } from "@/lib/env";

/**
 * DOCUMENT STORAGE — S3, reached through the backend service.
 * ---------------------------------------------------------------------------
 * ONE PRIVATE BUCKET, TWO PREFIXES, and the split is the whole design:
 *
 *   `incoming/`   what the browser uploads. Raw camera output. May contain EXIF
 *                 GPS, may be forty megabytes, may not be an image at all. Read
 *                 by exactly one thing — the normalisation step — and purged
 *                 hourly by the backend's Celery beat.
 *
 *   `documents/`  what everyone else sees. Re-encoded by `sharp`, EXIF stripped,
 *                 dimensions capped, content type known because we produced it.
 *
 * Nothing writes directly to `documents`, and nothing but the normaliser reads
 * `incoming`. That means a file an applicant uploaded has been through code we
 * control before any member of staff opens it, which is the point: an ops
 * person clicking a document on a Windows machine should not be the first thing
 * to interpret those bytes.
 *
 * ── Why this app holds no AWS credentials ──
 *
 * The backend (`backend/app/services/storage.py`) runs under the only IAM role
 * that can touch the bucket. This app asks it for presigned URLs, as a named
 * principal (`lib/backend/client.ts`), and the bytes then move directly between
 * S3 and whoever holds the URL. A leaked environment file from this container
 * is therefore not a passport archive.
 *
 * The bucket blocks all public access, encrypts at rest, and expires anything
 * left in `incoming/` after a day (`infra/aws/`). Those are the second lock —
 * defence that only exists in application code ends at the first missing check.
 */

export type Area = "incoming" | "documents";

/**
 * Re-exported from `limits.ts`, which is not `server-only` because the uploader
 * component enforces the same rules before sending anything. One definition,
 * two enforcement points — see that file for why the alternative produced an
 * upload the client accepted and the server rejected.
 *
 * HEIC is absent on purpose: Safari converts on upload, and `sharp` without a
 * licensed HEIF codec cannot read it, so accepting it would mean accepting
 * files that fail at normalisation rather than at the door.
 */
export { ACCEPTED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, validateUpload } from "./limits";

export type PresignedRequest = {
  url: string;
  method: "GET" | "PUT";
  /** Headers the request must send. For a PUT this is the signed Content-Type. */
  headers: Record<string, string>;
  expires_in: number;
};

const TRANSFER_TIMEOUT_MS = 30_000;

function assertConfigured(): void {
  if (!capabilities.storage()) {
    throw new Error(
      "Document storage is not configured. Set BACKEND_URL and SERVICE_JWT_SECRET. " +
        "See backend/README.md.",
    );
  }
}

async function uploadUrl(
  principal: BackendPrincipal,
  area: Area,
  key: string,
  contentType: string,
): Promise<PresignedRequest> {
  assertConfigured();
  return backendRequest<PresignedRequest>(principal, "POST", `/v1/storage/${area}/upload-url`, {
    key,
    content_type: contentType,
  });
}

export const objectStore = {
  uploadUrl,

  /**
   * Reads a raw upload back. The backend checks the object's size *before*
   * signing the GET — a presigned PUT cannot limit size, so this is the first
   * point an oversized upload can be refused. It answers 413 and deletes it.
   */
  async read(principal: BackendPrincipal, area: "incoming", key: string): Promise<Buffer> {
    assertConfigured();
    const presigned = await backendRequest<PresignedRequest & { byte_size: number }>(
      principal,
      "POST",
      `/v1/storage/${area}/download-url`,
      { key },
    );

    const response = await fetch(presigned.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(TRANSFER_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`S3 GET failed with ${response.status}`);

    return Buffer.from(await response.arrayBuffer());
  },

  /** Keys are composed with a fresh UUID, so a PUT never lands on an existing object. */
  async write(
    principal: BackendPrincipal,
    area: Area,
    key: string,
    bytes: Buffer,
    contentType: string,
  ): Promise<void> {
    const presigned = await uploadUrl(principal, area, key, contentType);

    const response = await fetch(presigned.url, {
      method: "PUT",
      body: new Uint8Array(bytes),
      headers: presigned.headers,
      signal: AbortSignal.timeout(TRANSFER_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`S3 PUT failed with ${response.status}`);
  },

  async remove(principal: BackendPrincipal, area: Area, keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    assertConfigured();
    const { deleted } = await backendRequest<{ deleted: number }>(principal, "POST", "/v1/storage/delete", {
      area,
      keys,
    });
    return deleted;
  },

  /** Sixty seconds, rendered inline. The backend sets both. */
  async viewUrl(principal: BackendPrincipal, key: string): Promise<string> {
    assertConfigured();
    const presigned = await backendRequest<PresignedRequest>(principal, "POST", "/v1/storage/documents/view-url", {
      key,
    });
    return presigned.url;
  },
};
