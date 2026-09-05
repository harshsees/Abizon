import "server-only";

import { generateSecret, generateURI, verify } from "otplib";

import { decryptField, encryptField, FIELD_CONTEXT } from "@/lib/crypto/fields";

/**
 * THE SECOND FACTOR FOR STAFF.
 * ---------------------------------------------------------------------------
 * A password alone protects the account that can read every passport scan
 * Abizon holds against exactly one thing: somebody not knowing the password.
 * It does nothing about reuse, phishing, or a laptop with a saved session — all
 * three of which are more likely than a brute force against scrypt.
 *
 * TOTP, in an authenticator app. Not SMS: the whole reason staff are not on
 * phone OTP in the first place is that SIM swap is cheap and this is the
 * account worth swapping a SIM for.
 *
 * ── The secret is stored encrypted ──
 *
 * A TOTP secret in plaintext in the database means a database dump reduces two
 * factors to one — the attacker generates valid codes forever. It goes through
 * `lib/crypto/fields.ts` like a passport number, for the same reason: the value
 * is a long-lived credential that cannot be changed without human involvement.
 *
 * ── Enrolment is two steps, and the second one is not optional ──
 *
 * A secret is generated, shown as a QR code, and then **not accepted as a
 * factor until the staff member has proved they can generate a code from it**.
 * `totp_confirmed_at` is null until that happens. Skipping the confirmation
 * produces accounts that are locked out the moment the enforcement is switched
 * on, because the scan silently failed and nobody found out.
 */

/** ±30 seconds. One step either side, which absorbs a phone whose clock has
 *  drifted without meaningfully widening the window a stolen code is valid in. */
const TOLERANCE_SECONDS = 30;

const ISSUER = "abizon Ops";

export type Enrolment = {
  /** Base32, to be encrypted before it goes anywhere near the database. */
  secret: string;
  /** `otpauth://` URI for the QR code. */
  uri: string;
};

export function beginEnrolment(email: string): Enrolment {
  // 20 bytes / 160 bits — the RFC 4226 recommendation and what every
  // authenticator app expects.
  const secret = generateSecret({ length: 20 });

  return {
    secret,
    uri: generateURI({
      issuer: ISSUER,
      // The label is what appears under the entry in the app. Email, because a
      // person with access to two environments needs to tell them apart.
      label: email,
      secret,
    }),
  };
}

export function encryptSecret(secret: string): string {
  return encryptField(secret, FIELD_CONTEXT.totpSecret);
}

/**
 * Returns false rather than throwing on a bad code — a wrong six digits is the
 * expected case, not an exception. It does throw if the stored secret cannot be
 * decrypted, because that is a key-management failure and silently rejecting
 * every login while reporting "wrong code" would send somebody hunting for the
 * wrong problem.
 */
export async function verifyTotp(
  encryptedSecret: string,
  token: string,
): Promise<boolean> {
  const secret = decryptField(encryptedSecret, FIELD_CONTEXT.totpSecret);
  const cleaned = token.replace(/\D/g, "");

  if (cleaned.length !== 6) return false;

  const result = await verify({
    secret,
    token: cleaned,
    epochTolerance: TOLERANCE_SECONDS,
  });

  return result.valid;
}
