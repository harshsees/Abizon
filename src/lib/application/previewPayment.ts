/**
 * THE SIMULATED AUTHORISATION.
 * ---------------------------------------------------------------------------
 * The one place in shipped code that resolves a payment without an acquirer.
 * It has its own file, and a name with "preview" in it, so that it is obvious
 * in an import list and impossible to reach for by accident — the alternative
 * being a `setTimeout` tucked inside a component, which is how this sort of
 * thing normally survives to production unnoticed.
 *
 * IT EXISTS BECAUSE THE SCREEN IS WANTED ON THE LIVE SITE before a gateway has
 * been chosen. What makes that acceptable is not this file, which is a lie by
 * construction — it is the two disclosures in `paymentConfig.ts` that ride
 * along with it, and the fact that the money side of the app still tells the
 * truth: `pricingConfig` marks the fee provisional, `ApplicationComplete` says
 * nothing has been charged, and no ledger, order or receipt is written
 * anywhere. Nothing downstream believes a payment happened, because nothing
 * downstream is told.
 *
 * WHAT IT DOES NOT DO, and must not start doing:
 *
 *   - It does not touch the card fields it is handed. They stay in React state
 *     for the life of the tab and reach no network, no log and no store. A
 *     preview that collected real card numbers would be worse than no preview.
 *   - It never fails. A declined card the applicant cannot un-decline is a dead
 *     end on a screen with nothing behind it; the failure paths are real code
 *     in `PaymentPanel` and are exercised from `/dev/payment-preview`.
 *   - It returns nothing a caller could mistake for an authorisation — no id,
 *     no reference, no token.
 *
 * ── TO GO LIVE ─────────────────────────────────────────────────────────────
 * Replace the body with the gateway call and delete the delay. The signature is
 * already the one `PaymentPanel` expects, so nothing else changes.
 */

import type { PaymentOutcome } from "@/components/application/payment/PaymentPanel";

/**
 * Long enough that the authorising state is legible rather than a flicker,
 * short enough that nobody waits. Real acquirers take longer; pretending to
 * take longer would only make a fake screen slower than it needs to be.
 */
const SIMULATED_LATENCY_MS = 2000;

/**
 * TAKES NO ARGUMENTS, ON PURPOSE.
 *
 * `PaymentPanel` calls its `onPay` with the card fields, and a zero-parameter
 * function satisfies that type — so declaring none means this cannot read the
 * card even by accident. "It does not touch the card details" stops being a
 * promise in a comment and becomes something the signature enforces.
 */
export async function previewAuthorise(): Promise<PaymentOutcome> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
  return { ok: true };
}
