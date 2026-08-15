import "server-only";

/**
 * WHERE CHALLENGES AND USERS LIVE — the second seam.
 * ---------------------------------------------------------------------------
 * `otp.ts` holds the rules (how long a code lives, how many guesses it takes,
 * how often one number may ask). This file holds the storage those rules act
 * on, behind an interface, so the rules can be written and tested before the
 * database exists and do not change when it arrives.
 *
 * READ THIS BEFORE DEPLOYING. The in-memory implementation at the bottom is
 * correct on one long-lived Node process and *silently wrong* on serverless.
 * On Vercel each function instance has its own memory: the instance that sent
 * the code is usually not the instance that verifies it, so verification fails
 * with "that code has expired" for a code issued nine seconds ago. Worse, the
 * rate limiter counts per instance, so N instances mean N times the allowance —
 * the limiter appears to work in testing and does nothing under load.
 *
 * It is here to unblock development, and it announces itself on first use.
 * Production needs a shared store: the Postgres table sketched in
 * `docs/backend/schema.sql`, or Redis if a dedicated one is already running.
 */

export type Challenge = {
  id: string;
  phoneE164: string;
  /** HMAC of the code. The code itself is never stored — see `otp.ts`. */
  codeHash: string;
  expiresAt: number;
  /** Wrong guesses left before this challenge is dead. */
  attemptsRemaining: number;
  /** Resends left on this challenge. */
  sendsRemaining: number;
  lastSentAt: number;
  createdAt: number;
  /** Set once verified, so a correct code cannot be replayed. */
  consumedAt?: number;
};

export type User = {
  id: string;
  phoneE164: string;
  createdAt: number;
  lastLoginAt: number;
};

export type AuthStore = {
  /**
   * False for stores that do not survive a process restart or share state
   * across instances. Surfaced in the UI in development so nobody mistakes the
   * in-memory store for a working backend.
   */
  readonly isDurable: boolean;
  readonly name: string;

  createChallenge(challenge: Challenge): Promise<void>;
  getChallenge(id: string): Promise<Challenge | undefined>;
  updateChallenge(id: string, patch: Partial<Challenge>): Promise<void>;

  /**
   * How many codes this number has been sent since `since`. The rate limiter
   * asks the store rather than keeping its own counter so that the count is
   * shared across instances the moment the store is.
   */
  countSendsSince(phoneE164: string, since: number): Promise<number>;

  findOrCreateUser(phoneE164: string): Promise<User>;
  getUser(id: string): Promise<User | undefined>;
};

/* -------------------------------------------------------------------------- */
/* In-memory implementation — development only                                */
/* -------------------------------------------------------------------------- */

const challenges = new Map<string, Challenge>();
const users = new Map<string, User>();
const usersByPhone = new Map<string, string>();
/** Append-only send log, used only by the rate limiter. */
const sendLog: Array<{ phoneE164: string; at: number }> = [];

let warned = false;

function warnOnce() {
  if (warned || process.env.NODE_ENV === "test") return;
  warned = true;
  console.warn(
    "\n  [auth] Using the IN-MEMORY auth store.\n" +
      "  Codes, users and rate limits are lost on restart and are not shared\n" +
      "  between server instances. Fine for local development; replace before\n" +
      "  any deployment. See docs/backend/README.md.\n",
  );
}

/**
 * Keeps the maps from growing without bound over a long dev session. Cheap
 * enough to run on every write, and it means the dev store behaves like a real
 * one with a TTL rather than accumulating every code ever issued.
 */
function evictExpired(now: number) {
  for (const [id, challenge] of challenges) {
    // One hour past expiry, not at expiry: a just-expired challenge should
    // still be findable so the user is told "that code expired" rather than
    // the misleading "we have no record of that".
    if (now - challenge.expiresAt > 60 * 60 * 1000) challenges.delete(id);
  }
  const cutoff = now - 24 * 60 * 60 * 1000;
  while (sendLog.length && sendLog[0].at < cutoff) sendLog.shift();
}

export const memoryStore: AuthStore = {
  isDurable: false,
  name: "in-memory (development)",

  async createChallenge(challenge) {
    warnOnce();
    evictExpired(Date.now());
    challenges.set(challenge.id, challenge);
    sendLog.push({ phoneE164: challenge.phoneE164, at: challenge.lastSentAt });
  },

  async getChallenge(id) {
    return challenges.get(id);
  },

  async updateChallenge(id, patch) {
    const existing = challenges.get(id);
    if (!existing) return;
    const next = { ...existing, ...patch };
    challenges.set(id, next);

    // A bumped `lastSentAt` means a resend went out, and the rate limiter must
    // see it. Without this a caller could resend indefinitely on one challenge.
    if (patch.lastSentAt && patch.lastSentAt !== existing.lastSentAt) {
      sendLog.push({ phoneE164: existing.phoneE164, at: patch.lastSentAt });
    }
  },

  async countSendsSince(phoneE164, since) {
    return sendLog.filter((entry) => entry.phoneE164 === phoneE164 && entry.at >= since)
      .length;
  },

  async findOrCreateUser(phoneE164) {
    const existingId = usersByPhone.get(phoneE164);
    const now = Date.now();

    if (existingId) {
      const user = users.get(existingId)!;
      const updated = { ...user, lastLoginAt: now };
      users.set(existingId, updated);
      return updated;
    }

    const user: User = {
      id: crypto.randomUUID(),
      phoneE164,
      createdAt: now,
      lastLoginAt: now,
    };
    users.set(user.id, user);
    usersByPhone.set(phoneE164, user.id);
    return user;
  },

  async getUser(id) {
    return users.get(id);
  },
};

/**
 * Selection point. When the real store lands it is swapped here and nothing
 * upstream changes.
 */
export function authStore(): AuthStore {
  return memoryStore;
}
