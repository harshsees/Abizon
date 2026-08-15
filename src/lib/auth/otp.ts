import "server-only";

import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

import { authStore, type Challenge } from "./store";
import { smsDriver } from "./sms";

/**
 * ONE-TIME CODES — the rules.
 * ---------------------------------------------------------------------------
 * A six-digit code is a one-in-a-million guess, which sounds strong and is not:
 * unlimited guesses break it in minutes, and unlimited *sends* turn the login
 * form into a way to spend the client's SMS budget on someone else's phone.
 * Every constant below exists to close one of those two doors, and each is
 * written down with the reason rather than left as a number.
 *
 * WHAT IS STORED. Never the code. The store holds an HMAC of it, keyed with a
 * server-side secret that does not live in the database. A dump of the
 * challenges table therefore yields nothing usable: six digits are trivially
 * brute-forced against a plain hash, but not against an HMAC whose key the
 * attacker does not have.
 */

/** Six digits. Longer is not meaningfully safer once attempts are capped, and
 *  every extra digit measurably increases mistyping on a phone keypad. */
const CODE_LENGTH = 6;

/** Long enough to fetch a phone from another room, short enough that a code
 *  read over someone's shoulder is stale before it is useful. */
const TTL_MS = 5 * 60 * 1000;

/** Wrong guesses before the challenge dies. Five leaves room for genuine
 *  mistyping while capping an online attack at 5-in-a-million per challenge. */
const MAX_ATTEMPTS = 5;

/** Resends allowed on one challenge, the original send included. */
const MAX_SENDS_PER_CHALLENGE = 3;

/** The applicant must wait this long before "Resend" does anything. Also the
 *  window in which a slow SMS usually arrives, so it doubles as a prompt not to
 *  ask again too early. */
const RESEND_COOLDOWN_MS = 30 * 1000;

/** Hard ceiling per number per hour, across all challenges. This is the one
 *  that actually protects the SMS budget — the per-challenge limit above is
 *  bypassed by simply starting a new challenge. */
const MAX_SENDS_PER_HOUR = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export const OTP_POLICY = {
  codeLength: CODE_LENGTH,
  ttlMs: TTL_MS,
  ttlMinutes: Math.round(TTL_MS / 60000),
  maxAttempts: MAX_ATTEMPTS,
  resendCooldownMs: RESEND_COOLDOWN_MS,
} as const;

function secret(): string {
  const value = process.env.AUTH_SECRET;

  if (!value) {
    // In production this is fatal. In development, falling back keeps the flow
    // usable on a fresh clone with no .env — the cost is that codes do not
    // survive a server restart, which in development is not a cost at all.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.",
      );
    }
    return "development-only-insecure-secret";
  }

  return value;
}

function hashCode(code: string, challengeId: string): string {
  // The challenge id is mixed in so that the same code issued to two people at
  // the same moment does not produce the same hash. Without it, equal hashes
  // would leak that two live challenges share a code.
  return createHmac("sha256", secret()).update(`${challengeId}:${code}`).digest("hex");
}

function generateCode(): string {
  // `randomInt` is uniform over the range and CSPRNG-backed. `Math.random()`
  // is neither, and a predictable OTP is not an OTP.
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

function codesMatch(supplied: string, expectedHash: string, challengeId: string): boolean {
  const suppliedHash = Buffer.from(hashCode(supplied, challengeId), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  // Equal lengths are guaranteed by both sides being SHA-256, but
  // `timingSafeEqual` throws on a mismatch, so this stays defensive.
  if (suppliedHash.length !== expected.length) return false;
  return timingSafeEqual(suppliedHash, expected);
}

/* -------------------------------------------------------------------------- */
/* Requesting a code                                                          */
/* -------------------------------------------------------------------------- */

export type RequestOutcome =
  | { ok: true; challengeId: string; expiresAt: number; resendAvailableAt: number }
  | { ok: false; error: string; retryAfterMs?: number };

export async function requestCode(phoneE164: string): Promise<RequestOutcome> {
  const store = authStore();
  const now = Date.now();

  const recentSends = await store.countSendsSince(phoneE164, now - RATE_WINDOW_MS);
  if (recentSends >= MAX_SENDS_PER_HOUR) {
    return {
      ok: false,
      error:
        "That number has been sent too many codes in the last hour. " +
        "Try again later, or contact support if you cannot get in.",
      retryAfterMs: RATE_WINDOW_MS,
    };
  }

  const code = generateCode();
  const challengeId = randomUUID();

  const challenge: Challenge = {
    id: challengeId,
    phoneE164,
    codeHash: hashCode(code, challengeId),
    expiresAt: now + TTL_MS,
    attemptsRemaining: MAX_ATTEMPTS,
    sendsRemaining: MAX_SENDS_PER_CHALLENGE - 1,
    lastSentAt: now,
    createdAt: now,
  };

  // Stored before sending. If the send fails we have an orphan row, which is
  // harmless; if we sent first and the write failed, we would have put a live
  // code on someone's phone that this server cannot verify.
  await store.createChallenge(challenge);

  const result = await smsDriver().send({
    to: phoneE164,
    code,
    expiresInMinutes: OTP_POLICY.ttlMinutes,
  });

  if (!result.ok) {
    return {
      ok: false,
      error: result.retryable
        ? "We could not send the code just now. Try again in a moment."
        : "We could not send a code to that number. Check it and try again.",
    };
  }

  return {
    ok: true,
    challengeId,
    expiresAt: challenge.expiresAt,
    resendAvailableAt: now + RESEND_COOLDOWN_MS,
  };
}

/* -------------------------------------------------------------------------- */
/* Resending                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A resend issues a *new* code on the existing challenge rather than
 * re-sending the old one. If the first SMS arrives late, the applicant then has
 * two codes in their inbox and only the newer one works — which is correct, and
 * is why the UI says "we sent a new code" rather than "sent again".
 */
export async function resendCode(challengeId: string): Promise<RequestOutcome> {
  const store = authStore();
  const now = Date.now();
  const challenge = await store.getChallenge(challengeId);

  if (!challenge || challenge.consumedAt) {
    return { ok: false, error: "Start again — that sign-in attempt is no longer open." };
  }

  const waitRemaining = challenge.lastSentAt + RESEND_COOLDOWN_MS - now;
  if (waitRemaining > 0) {
    return {
      ok: false,
      error: `Wait ${Math.ceil(waitRemaining / 1000)} seconds before asking for another code.`,
      retryAfterMs: waitRemaining,
    };
  }

  if (challenge.sendsRemaining <= 0) {
    return {
      ok: false,
      error: "That is the most codes we can send for one sign-in. Start again.",
    };
  }

  const recentSends = await store.countSendsSince(challenge.phoneE164, now - RATE_WINDOW_MS);
  if (recentSends >= MAX_SENDS_PER_HOUR) {
    return {
      ok: false,
      error: "That number has been sent too many codes in the last hour. Try again later.",
      retryAfterMs: RATE_WINDOW_MS,
    };
  }

  const code = generateCode();

  await store.updateChallenge(challengeId, {
    codeHash: hashCode(code, challengeId),
    expiresAt: now + TTL_MS,
    lastSentAt: now,
    sendsRemaining: challenge.sendsRemaining - 1,
    // A new code restores the guess allowance. Otherwise attempts spent on a
    // code that never arrived would follow the applicant to the one that did.
    attemptsRemaining: MAX_ATTEMPTS,
  });

  const result = await smsDriver().send({
    to: challenge.phoneE164,
    code,
    expiresInMinutes: OTP_POLICY.ttlMinutes,
  });

  if (!result.ok) {
    return { ok: false, error: "We could not send another code just now. Try again shortly." };
  }

  return {
    ok: true,
    challengeId,
    expiresAt: now + TTL_MS,
    resendAvailableAt: now + RESEND_COOLDOWN_MS,
  };
}

/* -------------------------------------------------------------------------- */
/* Verifying                                                                  */
/* -------------------------------------------------------------------------- */

export type VerifyOutcome =
  | { ok: true; userId: string; phoneE164: string }
  | { ok: false; error: string; attemptsRemaining?: number; fatal?: boolean };

export async function verifyCode(
  challengeId: string,
  supplied: string,
): Promise<VerifyOutcome> {
  const store = authStore();
  const now = Date.now();
  const challenge = await store.getChallenge(challengeId);

  // `fatal` tells the UI to send the applicant back to the phone step rather
  // than let them keep typing into a challenge that can never succeed.
  if (!challenge) {
    return { ok: false, error: "Start again — we have no record of that sign-in.", fatal: true };
  }

  if (challenge.consumedAt) {
    return { ok: false, error: "That code has already been used.", fatal: true };
  }

  if (now > challenge.expiresAt) {
    return { ok: false, error: "That code has expired. Ask for a new one.", fatal: false };
  }

  if (challenge.attemptsRemaining <= 0) {
    return { ok: false, error: "Too many incorrect attempts. Start again.", fatal: true };
  }

  const cleaned = supplied.replace(/\D/g, "");

  if (cleaned.length !== CODE_LENGTH || !codesMatch(cleaned, challenge.codeHash, challengeId)) {
    const remaining = challenge.attemptsRemaining - 1;
    await store.updateChallenge(challengeId, { attemptsRemaining: remaining });

    if (remaining <= 0) {
      return { ok: false, error: "Too many incorrect attempts. Start again.", fatal: true };
    }

    return {
      ok: false,
      error: remaining === 1 ? "Incorrect code. One attempt left." : "Incorrect code.",
      attemptsRemaining: remaining,
    };
  }

  // Consumed before the user record is touched, so a crash midway cannot leave
  // a code that still works.
  await store.updateChallenge(challengeId, { consumedAt: now });

  const user = await store.findOrCreateUser(challenge.phoneE164);
  return { ok: true, userId: user.id, phoneE164: user.phoneE164 };
}
