import "server-only";

import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * STAFF PASSWORDS.
 * ---------------------------------------------------------------------------
 * WHY THERE ARE PASSWORDS HERE AT ALL, when the whole applicant side is
 * deliberately passwordless. Different threat, different trade.
 *
 * Phone OTP is right for an applicant: it is what someone can do at 11 p.m. on
 * a train, with no account to remember. Its weakness is SIM swap, which costs
 * an attacker very little and is common in India specifically. For an applicant
 * the reward is one person's application. For the account that can open every
 * passport scan Abizon holds, the reward is the whole database — so staff get a
 * factor that a mobile operator's retention desk cannot hand over, plus TOTP on
 * top.
 *
 * ── Why scrypt and not argon2 or bcrypt ──
 *
 * Both are better-studied choices and both are npm packages with native
 * builds. scrypt is in Node's standard library, is memory-hard (which is the
 * property that matters against GPU cracking, and the one bcrypt lacks), and is
 * the OWASP-listed alternative when argon2 is unavailable. For a table that
 * will hold perhaps a dozen rows, adding a native dependency to improve on it
 * is not a trade worth making.
 *
 * ── Parameters ──
 *
 * N=2^16, r=8, p=1 — the OWASP recommendation, costing roughly 64MB and about
 * 100ms per hash. That is deliberately slow: it is the entire defence if the
 * table is ever dumped. `maxmem` has to be raised explicitly or Node refuses,
 * because its default ceiling is below what these parameters need.
 */

const N = 2 ** 16;
const R = 8;
const P = 1;
const KEY_BYTES = 64;
const SALT_BYTES = 16;
const MAXMEM = 128 * N * R * 2;

/**
 * `scrypt$N$r$p$salt$hash`. Self-describing, so raising the parameters later
 * does not invalidate existing hashes — each one carries the cost it was made
 * with, and a login can transparently re-hash at the new setting.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(password.normalize("NFKC"), salt, KEY_BYTES, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });

  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);

  // A stored hash claiming absurd parameters would let anyone with write access
  // to the table turn one login attempt into an out-of-memory crash.
  if (!Number.isInteger(n) || n > 2 ** 20 || r > 32 || p > 16) return false;

  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");

  const derived = await scrypt(password.normalize("NFKC"), salt, expected.length, {
    N: n,
    r,
    p,
    maxmem: 128 * n * r * 2,
  });

  // Constant time. A byte-by-byte comparison leaks how much of the hash matched,
  // which over enough attempts is a way to recover it.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/**
 * Generated for a new staff member rather than chosen by them. People choose
 * passwords they have used elsewhere, and this account is not the place to find
 * that out. Twenty base64url characters is about 120 bits.
 */
export function generatePassword(): string {
  return randomBytes(15).toString("base64url");
}
