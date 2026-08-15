"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { INITIAL_LOGIN_STATE, type LoginState } from "@/lib/auth/loginState";
import { requestCode, resendCode, verifyCode, OTP_POLICY } from "@/lib/auth/otp";
import { parsePhone } from "@/lib/auth/phone";
import { createSession, destroySession } from "@/lib/auth/session";
import { smsDriver } from "@/lib/auth/sms";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { checkLimit } from "@/lib/rateLimit";
import { clientIp, ipPrefix } from "@/lib/request";

/**
 * THE LOGIN SERVER ACTIONS.
 * ---------------------------------------------------------------------------
 * Treated as public API endpoints, because that is what they are — a Server
 * Action is a POST route with a generated name, reachable by anything that can
 * make a request. Nothing here trusts a value because the form sent it: the
 * phone number is re-parsed server-side, and the challenge id is only ever used
 * to look a challenge up, never to carry a claim about who the user is.
 *
 * The one thing the client is trusted with is the challenge id, and that is
 * safe because holding it proves nothing. Verification still needs the code,
 * which only reached the handset.
 *
 * Next.js checks the Origin header on Server Actions, which covers CSRF.
 *
 * WHY ONE ACTION AND NOT THREE. The login screen is a two-step state machine,
 * and `useActionState` owns exactly one state. Three actions would mean three
 * states to keep in agreement and three `pending` flags to merge — the phone
 * step could be mid-submit while the code step believed itself idle. A single
 * entry point dispatched on `intent` makes the transition the *server's*
 * decision, which is where it belongs, since only the server knows whether the
 * SMS actually went out.
 */

/** Kept to internal paths so a crafted `?next=` cannot bounce someone to
 *  another site immediately after they sign in. */
function safeDestination(raw: string | undefined | null): string {
  if (!raw) return "/profile";
  // A leading `//` is protocol-relative and leaves the site.
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/profile";
  return raw;
}

/* -------------------------------------------------------------------------- */

async function start(formData: FormData): Promise<LoginState> {
  const iso = String(formData.get("iso") ?? "IN");
  const national = String(formData.get("national") ?? "");

  // Shape first, then the bot check, then the send. Ordering matters: a
  // malformed number is rejected without spending a Turnstile verification, and
  // a bot is rejected without spending an SMS. Each gate is cheaper than the
  // one after it.
  const parsed = parsePhone(national, iso);
  if (!parsed.ok) {
    return { step: "phone", error: parsed.error, iso, national };
  }

  const headerList = await headers();
  const ip = clientIp(headerList);

  // Per-address ceiling, above the per-number one in `otp.ts`. That one stops
  // someone hammering a single handset; this one stops someone working through
  // a list of numbers, which never trips a per-number limit and empties the SMS
  // balance just the same.
  const limit = await checkLimit("otpSendPerIp", ipPrefix(ip) ?? "unknown");
  if (!limit.ok) {
    return {
      step: "phone",
      error: `Too many sign-in attempts from this network. Try again in ${Math.ceil(
        limit.retryAfterSeconds / 60,
      )} minutes.`,
      iso,
      national,
    };
  }

  const bot = await verifyTurnstile(formData.get("turnstileToken")?.toString(), ip);

  if (!bot.ok) {
    return { step: "phone", error: bot.error, iso, national };
  }

  const outcome = await requestCode(parsed.e164);
  if (!outcome.ok) {
    return { step: "phone", error: outcome.error, iso, national };
  }

  return {
    step: "code",
    challengeId: outcome.challengeId,
    phoneE164: parsed.e164,
    expiresAt: outcome.expiresAt,
    resendAvailableAt: outcome.resendAvailableAt,
  };
}

async function verify(previous: LoginState, formData: FormData): Promise<LoginState> {
  // A verify submitted against a state that is not on the code step is either a
  // stale form or a probe. Either way there is nothing to verify against.
  if (previous.step !== "code") return INITIAL_LOGIN_STATE;

  // The per-challenge ceiling is five wrong guesses, after which the challenge
  // dies. That is bypassed by starting a fresh challenge for each batch of
  // five, so the guessing budget is also capped per address.
  const ip = ipPrefix(clientIp(await headers())) ?? "unknown";
  const limit = await checkLimit("otpVerifyPerIp", ip);
  if (!limit.ok) {
    return {
      ...previous,
      error: "Too many attempts from this network. Try again later.",
      fatal: true,
    };
  }

  const outcome = await verifyCode(previous.challengeId, String(formData.get("code") ?? ""));

  if (!outcome.ok) {
    return {
      ...previous,
      error: outcome.error,
      attemptsRemaining: outcome.attemptsRemaining,
      fatal: outcome.fatal,
    };
  }

  await createSession(outcome.userId, outcome.tokenVersion);

  // The caller reads "code step, no error" as success and redirects. Clearing
  // the failure fields matters because a wrong guess followed by a right one
  // would otherwise leave `fatal` set on a state that just succeeded.
  return { ...previous, error: undefined, attemptsRemaining: undefined, fatal: undefined };
}

async function resend(previous: LoginState): Promise<LoginState> {
  if (previous.step !== "code") return INITIAL_LOGIN_STATE;

  const outcome = await resendCode(previous.challengeId);
  if (!outcome.ok) return { ...previous, error: outcome.error };

  return {
    ...previous,
    expiresAt: outcome.expiresAt,
    resendAvailableAt: outcome.resendAvailableAt,
    error: undefined,
    attemptsRemaining: undefined,
    fatal: undefined,
  };
}

/* -------------------------------------------------------------------------- */

export async function loginAction(
  previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const intent = String(formData.get("intent") ?? "");

  switch (intent) {
    case "start":
      return start(formData);

    case "resend":
      return resend(previous);

    case "verify": {
      const next = await verify(previous, formData);

      // Success is "we are still on the code step and nothing went wrong".
      // The redirect lives here rather than inside `verify` so that the one
      // throwing call is not buried under two layers of helper.
      if (next.step === "code" && !next.error) {
        redirect(safeDestination(formData.get("next")?.toString()));
      }
      return next;
    }

    case "restart":
      return INITIAL_LOGIN_STATE;

    default:
      return previous;
  }
}

export async function signOut(): Promise<void> {
  await destroySession();
  redirect("/");
}

/**
 * Read by the login page so it can say, in development, that no SMS is
 * actually going out. Server-side because `SMS_PROVIDER` is not a public
 * variable and must not be inlined into the client bundle.
 */
export async function smsDeliveryNotice(): Promise<{
  delivers: boolean;
  driver: string;
  ttlMinutes: number;
}> {
  const driver = smsDriver();
  return {
    delivers: driver.deliversToHandset,
    driver: driver.name,
    ttlMinutes: OTP_POLICY.ttlMinutes,
  };
}
