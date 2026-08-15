import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { env } from "@/lib/env";

/**
 * FIELD-LEVEL ENCRYPTION — passport numbers and dates of birth.
 * ---------------------------------------------------------------------------
 * WHY, GIVEN THAT SUPABASE ALREADY ENCRYPTS ITS DISKS. Disk encryption defends
 * against someone carrying the drive out of the building. It defends against
 * nothing else: a leaked service-role key, a SQL injection, an over-broad RLS
 * policy, a support engineer with console access, and a `pg_dump` in a backup
 * bucket all yield plaintext. Those are the ways this data actually leaks.
 *
 * A passport number is worth this trouble because it cannot be rotated. A
 * leaked password is a bad afternoon; a leaked passport number is a lifetime
 * identifier attached to a named human being, and there is no reset link.
 *
 * WHAT IS AND IS NOT ENCRYPTED, and why the line is there. Names are not:
 * they are on every ops screen, in the email greeting, and in every sort order,
 * and encrypting them would break all of that to protect a field that an
 * attacker holding the row can mostly infer anyway. Passport number and date of
 * birth are, because together they are the pair that makes a row usable for
 * impersonation.
 *
 * THE COST, STATED PLAINLY. An encrypted column cannot be indexed, sorted,
 * range-queried, or searched with `LIKE`. Exact-match lookup is available
 * through the blind index at the bottom of this file and nothing else is. If a
 * future feature needs "all travellers born before 1990", it cannot have it
 * from this column, and the right answer will be to reconsider the feature
 * rather than to decrypt the table.
 */

/* -------------------------------------------------------------------------- */
/* Keys                                                                        */
/* -------------------------------------------------------------------------- */

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12; // 96 bits — the size GCM is defined for and fastest at.

type KeyRing = {
  /** Highest version number. Everything written from now on uses this. */
  currentVersion: number;
  /** Version → key. Holds every key still needed to *read* existing rows. */
  byVersion: Map<number, Buffer>;
};

let keyRing: KeyRing | null = null;

function decodeKey(raw: string, label: string): Buffer {
  const key = Buffer.from(raw.trim(), "base64");

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `${label} must be ${KEY_BYTES} bytes of base64 (got ${key.length}). ` +
        `Generate one with: openssl rand -base64 32`,
    );
  }

  return key;
}

/**
 * ROTATION MODEL. `DATA_ENCRYPTION_KEY` is the current key.
 * `DATA_ENCRYPTION_KEY_PREVIOUS` is a comma-separated list of retired keys,
 * newest first. Versions are assigned so that the current key is always the
 * highest number, which means rotating is: move the old current into the front
 * of the previous list, put the new key in, deploy. Old rows keep decrypting;
 * new writes use the new key; the `key_version` column on each row says which.
 *
 * Nothing re-encrypts automatically. That is deliberate — a rotation that
 * rewrites every traveller row on deploy is a migration disguised as a config
 * change. Re-encryption is a job someone runs when they mean to.
 */
function ring(): KeyRing {
  if (keyRing) return keyRing;

  const current = env().DATA_ENCRYPTION_KEY;
  if (!current) {
    throw new Error(
      "DATA_ENCRYPTION_KEY is not set, so passport numbers cannot be encrypted. " +
        "Refusing to write them in plaintext. Generate one with " +
        "`openssl rand -base64 32`.",
    );
  }

  const previous = (env().DATA_ENCRYPTION_KEY_PREVIOUS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const byVersion = new Map<number, Buffer>();
  const currentVersion = previous.length + 1;

  byVersion.set(currentVersion, decodeKey(current, "DATA_ENCRYPTION_KEY"));

  // Newest first, so the first entry is version currentVersion - 1.
  previous.forEach((raw, offset) => {
    byVersion.set(currentVersion - 1 - offset, decodeKey(raw, "DATA_ENCRYPTION_KEY_PREVIOUS"));
  });

  keyRing = { currentVersion, byVersion };
  return keyRing;
}

/** Test seam. Nothing in the application calls this. */
export function resetKeyRingForTests(): void {
  keyRing = null;
}

/* -------------------------------------------------------------------------- */
/* Encrypting                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The stored form: `v1.<keyVersion>.<iv>.<tag>.<ciphertext>`, base64url parts.
 *
 * Self-describing on purpose. A column of opaque base64 is a column nobody can
 * reason about in five years; this one announces its format version and its key
 * version, so a future reader can tell an old row from a corrupt one.
 */
const FORMAT = "v1";

/**
 * `context` is authenticated but not encrypted (GCM additional data). Pass the
 * column it is being stored in. It means a ciphertext lifted from
 * `passport_number_encrypted` and pasted into `dob_encrypted` fails to
 * decrypt rather than silently succeeding — an attacker with write access to
 * the database cannot shuffle values between columns to see what happens.
 */
export function encryptField(plaintext: string, context: string): string {
  const { currentVersion, byVersion } = ring();
  const key = byVersion.get(currentVersion)!;

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    FORMAT,
    String(currentVersion),
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptField(stored: string, context: string): string {
  const parts = stored.split(".");

  if (parts.length !== 5 || parts[0] !== FORMAT) {
    throw new Error(`Not an encrypted field value (format "${parts[0]}").`);
  }

  const version = Number(parts[1]);
  const key = ring().byVersion.get(version);

  if (!key) {
    // The specific cause matters: this is what a rotation that dropped a key
    // still in use looks like, and the fix is to put the key back, not to
    // delete the row.
    throw new Error(
      `No key for version ${version}. It was retired while rows still use it — ` +
        `restore it to DATA_ENCRYPTION_KEY_PREVIOUS.`,
    );
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(parts[2], "base64url"));
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(Buffer.from(parts[3], "base64url"));

  // `final()` throws if the tag does not verify, which is the whole point of
  // GCM: a tampered ciphertext fails loudly rather than decrypting to garbage.
  return Buffer.concat([
    decipher.update(Buffer.from(parts[4], "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** The version new writes use. Stored on the row so a re-encryption job can
 *  find everything still on an old key with one indexed query. */
export function currentKeyVersion(): number {
  return ring().currentVersion;
}

/* -------------------------------------------------------------------------- */
/* Blind index                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * "Find the traveller with passport L898902C" is a real operational need — a
 * consulate queries a specific document and somebody has to locate it. An
 * encrypted column cannot answer that without decrypting every row.
 *
 * A blind index is a keyed hash of the normalised value, stored alongside and
 * indexed. Searching means hashing the query and looking for equality. What it
 * leaks is exactly one bit per pair of rows — whether two travellers share a
 * passport number — and nothing about the value itself, because the key is not
 * in the database.
 *
 * The key is *derived* from `DATA_ENCRYPTION_KEY` rather than being a separate
 * variable. One fewer secret to distribute, and HKDF guarantees the derived key
 * tells an attacker nothing about the encryption key even if the index is
 * fully exposed.
 */
let blindIndexKey: Buffer | null = null;

function indexKey(): Buffer {
  if (blindIndexKey) return blindIndexKey;

  const { currentVersion, byVersion } = ring();

  // Derived from the *current* key, which means rotating the encryption key
  // invalidates every blind index. That is a genuine consequence and the
  // re-encryption job has to rebuild them; it is preferable to a second
  // independent secret that somebody forgets to rotate at all.
  blindIndexKey = Buffer.from(
    hkdfSync("sha256", byVersion.get(currentVersion)!, Buffer.alloc(0), "abizon-blind-index", 32),
  );

  return blindIndexKey;
}

/**
 * Normalisation decides what counts as the same value. Passport numbers are
 * written with spaces on some documents and not on others, and in mixed case in
 * hand-typed forms; without this, the same passport indexes to two different
 * values and the search silently misses.
 */
export function normaliseForIndex(value: string): string {
  return value.replace(/[\s-]/g, "").toUpperCase();
}

export function blindIndex(value: string, context: string): string {
  return createHmac("sha256", indexKey())
    .update(`${context}:${normaliseForIndex(value)}`)
    .digest("base64url");
}

/** Constant-time comparison, for the rare case of checking an index in the
 *  application rather than in a `WHERE` clause. */
export function blindIndexMatches(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/* -------------------------------------------------------------------------- */
/* Column contexts                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Every encrypted column's context string, in one place. Named constants rather
 * than string literals at each call site, because a typo in a context string
 * does not fail at write time — it fails at *read* time, months later, on data
 * that can no longer be decrypted by any other means.
 */
export const FIELD_CONTEXT = {
  passportNumber: "travellers.passport_number",
  dob: "travellers.dob",
  totpSecret: "staff_users.totp_secret",
} as const;
