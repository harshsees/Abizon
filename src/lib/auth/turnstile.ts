import "server-only";

import { env } from "@/lib/env";

/**
 * BOT PROTECTION ON THE ONE ACTION THAT SPENDS MONEY.
 * ---------------------------------------------------------------------------
 * `sendCode` is a public POST endpoint that causes an SMS. Every call costs
 * roughly ₹0.15 of the client's money and consumes one of the five sends that
 * number is allowed per hour. A script with a list of Indian mobile numbers can
 * therefore do two things at once: empty the SMS balance, and lock real people
 * out of their own accounts by exhausting their hourly allowance before they
 * ever try to sign in.
 *
 * The rate limiter in `otp.ts` caps sends *per number*. It does not cap an
 * attacker who has a lot of numbers. That is what this is for.
 *
 * WHY TURNSTILE RATHER THAN A CAPTCHA. It is free at any volume this site will
 * see, and for a real applicant it is usually invisible — no traffic lights, no
 * bicycles. The comparison that matters is not "Turnstile vs reCAPTCHA", it is
 * "an invisible check vs an image grid in front of every login on a phone".
 *
 * WHERE IT IS *NOT* APPLIED. Verification. A wrong code is already capped at
 * five attempts and the challenge dies permanently after that, so a bot gains
 * nothing by guessing; adding a widget there would only slow down the honest
 * applicant who mistyped a digit.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * The explicit opt-out. Setting the secret to this string turns the check off
 * in production and is meant to be an uncomfortable thing to find in a
 * dashboard — the alternative was an unset variable meaning "off", which is
 * indistinguishable from somebody forgetting.
 */
const DISABLED = "disabled";

export type TurnstileOutcome =
  | { ok: true; skipped: boolean }
  | { ok: false; error: string };

type SiteVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

/**
 * Cloudflare's documented codes, translated into something an applicant can act
 * on. The distinction that matters to the user is "try again" versus "something
 * is misconfigured and trying again will not help".
 */
function explain(codes: string[]): string {
  if (codes.includes("timeout-or-duplicate")) {
    return "That check expired. Try again.";
  }
  if (codes.includes("missing-input-response") || codes.includes("invalid-input-response")) {
    return "We could not confirm you are not a robot. Reload the page and try again.";
  }
  if (
    codes.includes("invalid-input-secret") ||
    codes.includes("missing-input-secret") ||
    codes.includes("bad-request")
  ) {
    // Ours, not theirs. Say so rather than implying the applicant did something
    // wrong, and log loudly — this one does not fix itself.
    console.error(`[turnstile] Misconfigured: ${codes.join(", ")}`);
    return "Sign-in is temporarily unavailable. Please try again shortly.";
  }
  return "We could not confirm you are not a robot. Try again.";
}

export async function verifyTurnstile(
  token: string | undefined | null,
  remoteIp?: string,
): Promise<TurnstileOutcome> {
  const secret = env().TURNSTILE_SECRET_KEY;

  // Not configured. In development this is the normal state and the flow must
  // keep working; `env.ts` makes it mandatory in production, so this branch
  // cannot be reached by a deploy that has not explicitly opted out.
  if (!secret || secret === DISABLED) {
    return { ok: true, skipped: true };
  }

  if (!token) {
    return { ok: false, error: "We could not confirm you are not a robot. Reload and try again." };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      // Cloudflare being slow must not become the login being slow. Five
      // seconds is far past their normal response and short enough that a
      // stalled request fails rather than hanging the form.
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      // FAIL CLOSED. This is the deliberate opposite of the rate limiter in
      // `lib/rateLimit.ts`, which fails open on browsing routes. The asymmetry
      // is the point: an unavailable limiter costs an unthrottled page view,
      // an unavailable bot check costs the SMS budget.
      console.error(`[turnstile] siteverify returned ${response.status}`);
      return { ok: false, error: "Sign-in is temporarily unavailable. Please try again shortly." };
    }

    const result = (await response.json()) as SiteVerifyResponse;

    if (!result.success) {
      return { ok: false, error: explain(result["error-codes"] ?? []) };
    }

    return { ok: true, skipped: false };
  } catch (error) {
    console.error("[turnstile] verification failed", error);
    return { ok: false, error: "Sign-in is temporarily unavailable. Please try again shortly." };
  }
}
