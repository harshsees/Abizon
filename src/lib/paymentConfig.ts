/**
 * ABIZON PAYMENT TERMS — where "can we take money yet" is answered once.
 * ---------------------------------------------------------------------------
 * This file exists for the same reason `pricingConfig.ts` does, one step
 * further along. `pricingConfig` holds figures nobody has agreed and marks them
 * `provisional` so no surface can quote them as settled. This holds something
 * blunter: whether there is a payment gateway at all.
 *
 * ── THE ANSWER IS NO LONGER A CONSTANT ──
 *
 * It was `gateway: "none"`, hand-edited, with a note saying to change it when
 * an integration landed. Razorpay has landed, and a hardcoded flag beside a
 * working integration is a switch somebody has to remember to throw — the
 * failure being a deployment with real keys, a real webhook and a checkout that
 * still simulates.
 *
 * So the gateway is DERIVED from whether the keys are present. One deployment
 * can be live and another preview with no code difference between them, which
 * is exactly the difference between production and a preview branch.
 *
 *   keys present  …  LIVE. Razorpay Checkout opens, money moves.
 *   keys absent   …  PREVIEW. The step is in the flow, the card form is real,
 *                    the animation runs, and NOTHING IS CHARGED.
 *
 * The third state the old file described — step hidden entirely — is gone with
 * the constant, because `preview` was always true and nothing could reach it.
 *
 * ── WHAT PREVIEW MODE OWES THE APPLICANT ───────────────────────────────────
 *
 * A checkout that takes a card number, waits, and prints "Payment received" is
 * indistinguishable from a real one. That is the whole problem: the deleted
 * `MultiStepApplicationForm` announced a submission on a 1400ms timer and minted
 * a reference for it, and somebody could have flown to an airport believing a
 * visa was in progress. A fake receipt is the same failure with a number on it.
 *
 * So preview mode is never silent. Two things are non-negotiable while
 * `paymentIsPreview` is true, and both are asserted by `paymentConfig.test.ts`:
 *
 *   1. `PAYMENT_PREVIEW_NOTICE` sits above the form, before a card is typed.
 *   2. The receipt is stamped `PAYMENT_PREVIEW_RECEIPT_STAMP` — the same thing
 *      a specimen receipt has printed across it, for the same reason.
 *
 * Neither is decoration and neither should be removed to tidy the screen up.
 * They stop rendering on their own the moment the keys are configured.
 *
 * ── WHY THE CARD FORM IS NOT THE LIVE PATH ─────────────────────────────────
 *
 * Razorpay Checkout collects the card in an iframe on Razorpay's own origin,
 * and that is the property keeping this codebase out of PCI-DSS scope — a
 * property of not having the data rather than of being careful with it. The
 * hand-built card form in `PaymentPanel` therefore survives as the PREVIEW
 * screen and as `/dev/payment-preview`, and the live screen is an amount, a
 * breakdown and one button. See `RazorpayCheckout`.
 */

import { publicCapabilities } from "@/lib/env.public";

/**
 * The gateways worth naming. Members other than `"none"` are the candidates
 * that were on the table, not integrations that exist — adding one here does
 * not integrate it, it only makes it expressible.
 */
export type PaymentGateway = "none" | "razorpay" | "stripe" | "payu" | "cashfree";

/**
 * WHICH GATEWAY IS INTEGRATED, read from the environment.
 *
 * Razorpay is the only member this can currently return, because Razorpay is
 * the only one with an implementation behind it. The others stay in the union
 * as names that were on the table; adding one here would not integrate it.
 *
 * ── Why a function and not a const ──
 *
 * Partly because it now reads something. But the original note on this is worth
 * keeping, because it describes a trap that is easy to fall back into:
 * TypeScript narrows a `const` to its initialiser through control-flow analysis
 * whatever the annotation says, so `export const PAYMENT_GATEWAY: PaymentGateway
 * = "none"` made `PAYMENT_GATEWAY !== "none"` a compile error —
 *
 *   error TS2367: This comparison appears to be unintentional because the
 *   types '"razorpay"' and '"none"' have no overlap.
 *
 * — the moment a real gateway was named. The config was rigged to break the
 * build at the one moment it is ever edited, and it would have looked like the
 * integration's fault rather than this file's. A function's return type is
 * declared rather than inferred from a literal, so every member of the union
 * stays comparable.
 */
export function paymentGateway(): PaymentGateway {
  return publicCapabilities.payments ? "razorpay" : "none";
}

/**
 * Whether the step appears in the flow at all. `stepSequence` reads it, and
 * nothing else should branch on the gateway's name directly.
 *
 * Always true: the step is wanted on the live site whether or not a gateway
 * answers, and preview mode is what makes that honest. It stays as a named
 * export rather than being inlined so that turning the step off — which a
 * future incident might want — is one edit here.
 */
export const paymentEnabled = true;

/**
 * Whether the step is showing without an acquirer behind it.
 *
 * A FUNCTION, not a constant, and that is the one behavioural change in this
 * file. `capabilities.payments()` reads the environment, and a module-level
 * constant would freeze the answer at import time — which is fine on a server
 * and wrong in a bundle that is built once and served to deployments with
 * different configuration.
 */
export function paymentIsPreview(): boolean {
  return paymentGateway() === "none";
}

/* -------------------------------------------------------------------------- */
/* Methods                                                                    */
/* -------------------------------------------------------------------------- */

export type PaymentMethodId = "card" | "upi" | "netbanking";

export type PaymentMethod = {
  id: PaymentMethodId;
  /** Tab label. */
  label: string;
  /** One line under the tabs when this method is selected. */
  hint: string;
};

/**
 * THE THREE METHODS, AND WHY THESE THREE.
 *
 * The design this implements offers three tabs. Which three is a product
 * decision that follows the gateway, so these are the sensible defaults for an
 * INR checkout aimed at Indian applicants — every fee in this app is in rupees
 * and carries 18% GST — rather than a settled list. Renaming or reordering
 * them is an edit to this array and nothing else.
 *
 * Only `card` has a form, because only the card form was designed. The other
 * two render a short panel saying what they are waiting for, which is honest
 * and is a great deal better than an invented UPI flow that would have to be
 * thrown away the moment a gateway supplies its own.
 *
 * THERE IS NO PER-METHOD `available` FLAG, and there was one here for a while.
 * It could not be consumed honestly: with the gateway off it would have read
 * `false` for all three, so a panel that actually gated on it would have hidden
 * the card form behind a "not available" notice and left this screen with
 * nothing to review. Gating on it only once a gateway exists would have made it
 * a field that does nothing until somebody remembers it — a comment, but harder
 * to notice going stale. The gateway flag above already answers "can we take
 * money", and which methods a provider supports is knowledge the integration
 * has and this file does not.
 */
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  {
    id: "card",
    label: "Card",
    // Describes the method and nothing more. An earlier draft promised that
    // card details are never stored by Abizon — true of a correctly integrated
    // gateway, and not something this codebase may assert before one exists and
    // has been checked. Say it once it is true.
    hint: "Credit or debit card.",
  },
  {
    id: "upi",
    label: "UPI",
    hint: "Pay from any UPI app.",
  },
  {
    id: "netbanking",
    label: "Netbanking",
    hint: "Pay directly from your bank account.",
  },
] as const;

export const DEFAULT_PAYMENT_METHOD: PaymentMethodId = "card";

export function paymentMethod(id: PaymentMethodId): PaymentMethod {
  const found = PAYMENT_METHODS.find((method) => method.id === id);
  // The id type makes this unreachable; the fallback exists so a future member
  // added to the union but not to the array fails loudly at the call site
  // rather than rendering an undefined label.
  if (!found) throw new Error(`Unknown payment method: ${id}`);
  return found;
}

/**
 * What to say instead of taking a payment, in the applicant's words.
 *
 * One sentence, shown on the step itself, and it does not promise a date.
 * Used where the button is disabled outright — no gateway and no preview.
 */
export const PAYMENT_UNAVAILABLE_NOTICE =
  "Abizon cannot take a card payment online yet. Fees are settled with you directly before anything is filed.";

/**
 * THE PREVIEW NOTICE. Shown above the form whenever `paymentIsPreview`.
 *
 * Written for somebody who has just reached a checkout with their wallet out,
 * so it leads with the fact that decides what they do next — the card will not
 * be charged — and does not bury it behind an explanation. It says what will
 * happen instead, because "you cannot pay" without "so how do I pay" is not a
 * complete sentence on a payment screen.
 */
export const PAYMENT_PREVIEW_NOTICE =
  "Card payment is not switched on yet. You can go through this screen, but no card is charged and no money moves — we will settle the fee with you directly before anything is filed.";

/**
 * Printed across the receipt in preview mode.
 *
 * A specimen receipt has exactly this, for exactly this reason: the document
 * has to be readable as not-a-record even out of context, screenshotted, or
 * forwarded to somebody who never saw the notice on the form.
 */
export const PAYMENT_PREVIEW_RECEIPT_STAMP = "PREVIEW — NOT A REAL PAYMENT";
