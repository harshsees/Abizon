import "server-only";

import { and, count, eq, gte, sql } from "drizzle-orm";

import { requireDb } from "@/lib/db/client";
import { authChallenges, authSends, users } from "@/lib/db/schema";
import type { AuthStore, Challenge, User } from "../store";

/**
 * THE REAL AUTH STORE.
 * ---------------------------------------------------------------------------
 * This is the file the handover document points at when it says the in-memory
 * store "must be replaced before any deploy". Nothing upstream changes: `otp.ts`
 * still owns every rule, and it cannot tell which implementation it is talking
 * to. That was the point of the interface.
 *
 * ── The two bugs this fixes, restated because they are the reason it exists ──
 *
 * On Vercel each function instance has its own memory:
 *
 *   1. The instance that sent the code is usually not the instance that
 *      verifies it, so verification failed with "that code has expired" for a
 *      code issued nine seconds earlier.
 *   2. The rate limiter counted per instance, so N instances allowed N times the
 *      stated limit — it passed every test and did nothing under load.
 *
 * Both are properties of *where the state lives*, which is why fixing them is a
 * new file rather than a change to the rules.
 *
 * ── Timestamps ──
 *
 * The interface speaks epoch milliseconds; the schema stores `timestamptz`. The
 * conversion happens here and only here. It exists so that an operations person
 * running `select expires_at from auth_challenges` sees a time rather than
 * 1755230400000 — see the note at the top of `db/schema.ts`.
 */

const toDate = (ms: number) => new Date(ms);
const toMs = (date: Date) => date.getTime();

export const postgresStore: AuthStore = {
  isDurable: true,
  name: "postgres",

  async createChallenge(challenge: Challenge) {
    const db = requireDb();

    // One transaction, because a challenge that exists without its send being
    // counted is a free extra SMS, and a send counted without a challenge is a
    // login the applicant cannot complete. Neither is acceptable on its own.
    await db.transaction(async (tx) => {
      await tx.insert(authChallenges).values({
        id: challenge.id,
        phoneE164: challenge.phoneE164,
        codeHash: challenge.codeHash,
        expiresAt: toDate(challenge.expiresAt),
        attemptsRemaining: challenge.attemptsRemaining,
        sendsRemaining: challenge.sendsRemaining,
        lastSentAt: toDate(challenge.lastSentAt),
        createdAt: toDate(challenge.createdAt),
      });

      await tx.insert(authSends).values({
        phoneE164: challenge.phoneE164,
        sentAt: toDate(challenge.lastSentAt),
      });
    });
  },

  async getChallenge(id: string) {
    const db = requireDb();

    // A malformed id reaches here as a plain string and Postgres rejects it as
    // an invalid uuid. That is a probe, not an error worth reporting, and the
    // honest answer to "is there a challenge with this id" is no.
    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;

    const [row] = await db
      .select()
      .from(authChallenges)
      .where(eq(authChallenges.id, id))
      .limit(1);

    if (!row) return undefined;

    return {
      id: row.id,
      phoneE164: row.phoneE164,
      codeHash: row.codeHash,
      expiresAt: toMs(row.expiresAt),
      attemptsRemaining: row.attemptsRemaining,
      sendsRemaining: row.sendsRemaining,
      lastSentAt: toMs(row.lastSentAt),
      createdAt: toMs(row.createdAt),
      consumedAt: row.consumedAt ? toMs(row.consumedAt) : undefined,
    } satisfies Challenge;
  },

  async updateChallenge(id: string, patch: Partial<Challenge>) {
    const db = requireDb();

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ phoneE164: authChallenges.phoneE164, lastSentAt: authChallenges.lastSentAt })
        .from(authChallenges)
        .where(eq(authChallenges.id, id))
        .limit(1);

      // Matches the in-memory store: updating a challenge that is not there is
      // inert rather than an error. The caller has already decided what a
      // missing challenge means.
      if (!existing) return;

      await tx
        .update(authChallenges)
        .set({
          ...(patch.codeHash !== undefined && { codeHash: patch.codeHash }),
          ...(patch.expiresAt !== undefined && { expiresAt: toDate(patch.expiresAt) }),
          ...(patch.attemptsRemaining !== undefined && {
            attemptsRemaining: patch.attemptsRemaining,
          }),
          ...(patch.sendsRemaining !== undefined && { sendsRemaining: patch.sendsRemaining }),
          ...(patch.lastSentAt !== undefined && { lastSentAt: toDate(patch.lastSentAt) }),
          ...(patch.consumedAt !== undefined && { consumedAt: toDate(patch.consumedAt) }),
        })
        .where(eq(authChallenges.id, id));

      // A bumped `lastSentAt` means a resend went out and the hourly limiter has
      // to see it. Without this a caller resends indefinitely on one challenge
      // and never trips the per-number ceiling.
      if (patch.lastSentAt !== undefined && patch.lastSentAt !== toMs(existing.lastSentAt)) {
        await tx.insert(authSends).values({
          phoneE164: existing.phoneE164,
          sentAt: toDate(patch.lastSentAt),
        });
      }
    });
  },

  async countSendsSince(phoneE164: string, since: number) {
    const db = requireDb();

    const [row] = await db
      .select({ total: count() })
      .from(authSends)
      .where(and(eq(authSends.phoneE164, phoneE164), gte(authSends.sentAt, toDate(since))));

    return row?.total ?? 0;
  },

  async findOrCreateUser(phoneE164: string) {
    const db = requireDb();
    const now = new Date();

    // `on conflict do update` rather than select-then-insert. Two logins from
    // the same number arriving together is not a hypothetical — it is what a
    // double-tapped "Verify" button looks like — and the select-then-insert
    // version loses that race with a unique violation.
    const [row] = await db
      .insert(users)
      .values({ phoneE164, createdAt: now, lastLoginAt: now })
      .onConflictDoUpdate({
        target: users.phoneE164,
        set: { lastLoginAt: now },
      })
      .returning();

    return rowToUser(row);
  },

  async getUser(id: string) {
    const db = requireDb();

    if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;

    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!row) return undefined;

    // An erased account keeps its row so that application history stays
    // coherent, but it is not a user who can sign in. Treated as absent, which
    // `dal.ts` already reads as signed out.
    if (row.deletedAt) return undefined;

    return rowToUser(row);
  },
};

function rowToUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    phoneE164: row.phoneE164,
    tokenVersion: row.tokenVersion,
    createdAt: toMs(row.createdAt),
    lastLoginAt: toMs(row.lastLoginAt),
  };
}

/* -------------------------------------------------------------------------- */
/* Session revocation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Invalidates every session this user currently holds.
 *
 * Sessions are stateless signed cookies — fast, no read per request, and with
 * no way to revoke one short of rotating `AUTH_SECRET`, which signs *everybody*
 * out. That is the correct response to a leaked secret and a wildly
 * disproportionate response to one applicant saying they lost their phone.
 *
 * The version travels in the token and is compared on every authenticated
 * request, so bumping it here takes effect on the next request everywhere.
 */
export async function revokeSessions(userId: string): Promise<void> {
  const db = requireDb();

  await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, userId));
}
