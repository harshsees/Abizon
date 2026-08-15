import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { capabilities, env } from "@/lib/env";
import { ACCEPTED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "./limits";

/**
 * SUPABASE STORAGE — where passport scans live.
 * ---------------------------------------------------------------------------
 * TWO BUCKETS, both private, and the split is the whole design:
 *
 *   `incoming`   what the browser uploads. Raw camera output. May contain EXIF
 *                GPS, may be forty megabytes, may not be an image at all. Read
 *                by exactly one thing — the normalisation step — and emptied
 *                daily by the retention job.
 *
 *   `documents`  what everyone else sees. Re-encoded by `sharp`, EXIF stripped,
 *                dimensions capped, content type known because we produced it.
 *
 * Nothing writes directly to `documents`, and nothing but the normaliser reads
 * `incoming`. That means a file an applicant uploaded has been through code we
 * control before any member of staff opens it, which is the point: an ops
 * person clicking a document on a Windows machine should not be the first thing
 * to interpret those bytes.
 *
 * ── The service-role key ──
 *
 * This client bypasses row-level security. It is used because the server has
 * already done the authorisation — `requireUser()`, then an ownership check on
 * the application — and because minting signed URLs requires it.
 *
 * RLS is still enabled on the bucket, and that is not redundant. It is the
 * second lock: if an anon key ever ends up somewhere it should not be, the
 * policies are what stops it from being a passport archive. Defence that only
 * exists in application code is defence that ends at the first missing `where`
 * clause.
 */

export const BUCKETS = {
  incoming: "incoming",
  documents: "documents",
} as const;

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

let cached: SupabaseClient | null | undefined;

export function storage(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  if (!capabilities.storage()) {
    cached = null;
    return null;
  }

  cached = createClient(env().SUPABASE_URL!, env().SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      // There is no user session on the server and nowhere to persist one to.
      // Left on, the client tries to write to `localStorage` and warns.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cached;
}

export function requireStorage(): SupabaseClient {
  const client = storage();
  if (!client) {
    throw new Error(
      "Document storage is not configured. Set SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY. See docs/backend/stack.md §3.4.",
    );
  }
  return client;
}
