import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * RATE LIMITING — the layer above the per-number OTP ceiling.
 * ---------------------------------------------------------------------------
 * `otp.ts` already caps sends per phone number, and that cap is now correct
 * across instances because it counts rows in Postgres. What it cannot see is an
 * attacker with a *list* of numbers: five sends each against ten thousand
 * numbers never trips a per-number limit and still empties the SMS balance.
 *
 * Turnstile is the first answer to that. This is the second, and it is the one
 * that still works when a bot solves the widget: a per-IP ceiling on the
 * expensive endpoints.
 *
 * ── Why this is not in `proxy.ts` ──
 *
 * The obvious place for an IP limiter is the edge, before anything renders.
 * It is the wrong place here:
 *
 *   - the proxy runs on every matched request including link prefetches, so a
 *     limiter there is a network round trip paid on hover;
 *   - it would fire on all 150 destination pages, which are static and cost us
 *     nothing to serve, to protect two endpoints that are not;
 *   - and the limit that matters is per *action*, not per path — "five code
 *     requests an hour" is a different budget from "sixty page views a minute".
 *
 * So it sits in the actions and route handlers that actually spend something.
 *
 * ── The degraded mode, and why it is honest about being useless ──
 *
 * With no Upstash credentials this falls back to an in-process counter. That
 * counter has exactly the flaw the in-memory auth store had: on serverless each
 * instance counts separately, so N instances allow N times the limit. It is
 * fine on one long-lived dev server and worthless in production, and it says so
 * on first use rather than quietly appearing to work.
 */

type Window = { limit: number; windowSeconds: number };

/**
 * Every limit in the application, named and in one place, so that "what are we
 * actually allowing" is a question with a single answer rather than a grep.
 */
export const LIMITS = {
  /** Code requests from one address. Deliberately above the per-number ceiling
   *  of five per hour — a family or an office behind one NAT is a real thing,
   *  and this is meant to stop a script, not a household. */
  otpSendPerIp: { limit: 20, windowSeconds: 3600 },

  /** Verification attempts from one address. The per-challenge ceiling is five
   *  wrong guesses; this stops someone cycling challenges to get more. */
  otpVerifyPerIp: { limit: 60, windowSeconds: 3600 },

  /** Staff sign-in. Low, because there are perhaps a dozen staff and none of
   *  them needs thirty attempts an hour. */
  staffLoginPerIp: { limit: 10, windowSeconds: 900 },

  /** Signed upload URLs. One application needs a handful; a thousand means
   *  somebody is using the bucket as free storage. */
  uploadUrlPerUser: { limit: 40, windowSeconds: 3600 },

  /** Writes to an application draft. Generous — the apply flow autosaves. */
  applicationWritePerUser: { limit: 300, windowSeconds: 3600 },

  /**
   * Razorpay orders opened by one applicant.
   *
   * Low, because opening an order is a write to somebody else's system that we
   * are judged on. A person paying for one application legitimately opens two
   * or three — a card declined, a method changed, a tab reloaded — and twenty
   * an hour is a dashboard full of abandoned orders, which is exactly the
   * pattern a payment provider's fraud review looks for.
   */
  paymentOrderPerUser: { limit: 20, windowSeconds: 3600 },
} as const satisfies Record<string, Window>;

export type LimitName = keyof typeof LIMITS;

export type LimitResult = {
  ok: boolean;
  /** Seconds until the caller may try again. Surfaced to the applicant, so it
   *  needs to be a number somebody can act on rather than a bare refusal. */
  retryAfterSeconds: number;
  remaining: number;
};

/* -------------------------------------------------------------------------- */
/* Upstash                                                                     */
/* -------------------------------------------------------------------------- */

const limiters = new Map<LimitName, Ratelimit>();
let redis: Redis | null | undefined;

function client(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

function limiter(name: LimitName): Ratelimit | null {
  const connection = client();
  if (!connection) return null;

  let existing = limiters.get(name);
  if (existing) return existing;

  const { limit, windowSeconds } = LIMITS[name];

  existing = new Ratelimit({
    redis: connection,
    // Sliding window rather than fixed. A fixed window lets someone spend the
    // whole allowance in the last second of one window and the whole of the
    // next in the first second of the following — twice the limit in two
    // seconds, which is exactly the burst the limit exists to stop.
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: `abizon:${name}`,
    // Counting is fire-and-forget on the response path; the decision is not.
    analytics: false,
  });

  limiters.set(name, existing);
  return existing;
}

/* -------------------------------------------------------------------------- */
/* In-process fallback                                                         */
/* -------------------------------------------------------------------------- */

const local = new Map<string, number[]>();
let warned = false;

function warnOnce() {
  if (warned || process.env.NODE_ENV === "test") return;
  warned = true;
  console.warn(
    "\n  [ratelimit] No Upstash credentials — counting in process memory.\n" +
      "  On serverless each instance counts separately, so the real allowance\n" +
      "  is the stated limit times the instance count. Fine locally, useless\n" +
      "  in production. See docs/backend/stack.md §3.2.\n",
  );
}

function localCheck(name: LimitName, identifier: string): LimitResult {
  warnOnce();

  const { limit, windowSeconds } = LIMITS[name];
  const key = `${name}:${identifier}`;
  const now = Date.now();
  const cutoff = now - windowSeconds * 1000;

  const hits = (local.get(key) ?? []).filter((at) => at > cutoff);

  if (hits.length >= limit) {
    const oldest = hits[0];
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowSeconds * 1000 - now) / 1000)),
      remaining: 0,
    };
  }

  hits.push(now);
  local.set(key, hits);

  // Without this the map grows for the life of the process, one entry per
  // address ever seen.
  if (local.size > 10_000) {
    for (const [existing, times] of local) {
      if (times.every((at) => at <= cutoff)) local.delete(existing);
    }
  }

  return { ok: true, retryAfterSeconds: 0, remaining: limit - hits.length };
}

/* -------------------------------------------------------------------------- */

/**
 * `identifier` is whatever the limit is per: an IP prefix, a user id, a phone
 * number. It is namespaced by the limit name, so the same address counted
 * against two different limits does not share a budget.
 *
 * FAILS OPEN when Upstash is unreachable, and this is a deliberate asymmetry
 * with `turnstile.ts`, which fails closed. The reasoning: an unavailable
 * limiter that blocks means one vendor's outage takes the whole login flow
 * down, and the thing behind it — the per-number OTP ceiling in Postgres — is
 * still enforcing the limit that actually protects the SMS budget. Turnstile
 * has nothing behind it, so it cannot afford the same generosity.
 */
export async function checkLimit(name: LimitName, identifier: string): Promise<LimitResult> {
  const instance = limiter(name);

  if (!instance) return localCheck(name, identifier);

  try {
    const result = await instance.limit(identifier);

    return {
      ok: result.success,
      retryAfterSeconds: result.success
        ? 0
        : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
      remaining: result.remaining,
    };
  } catch (error) {
    console.error(`[ratelimit] ${name} check failed, allowing request`, error);
    return { ok: true, retryAfterSeconds: 0, remaining: 0 };
  }
}

/** Test seam. */
export function clearLocalLimitsForTests(): void {
  local.clear();
}
