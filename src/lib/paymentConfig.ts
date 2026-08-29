/**
 * ABIZON PAYMENT TERMS — where "can we take money yet" is answered once.
 * ---------------------------------------------------------------------------
 * This file exists for the same reason `pricingConfig.ts` does, one step
 * further along. `pricingConfig` holds figures nobody has agreed and marks them
 * `provisional` so no surface can quote them as settled. This holds something
 * blunter: whether there is a payment gateway at all.
 *
 * THERE IS NOT. `gateway` is `"none"`. What has changed is what that means for
 * the flow: the screen was hidden while no gateway existed, and is now shown,
 * because it was asked for on the live site. So the app is in a third state
 * that needs naming rather than fudging —
 *
 *   gateway: "razorpay" …  LIVE. A real acquirer answers. Money moves.
 *   gateway: "none",
 *   preview: true       …  PREVIEW. The step is in the flow, the form is real,
 *                          the animation runs, and NOTHING IS CHARGED.
 *   gateway: "none",
 *   preview: false      …  OFF. `stepSequence` drops the step entirely.
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
 * They come out when `gateway` names a real integration, at which point they
 * stop rendering on their own.
 *
 * ── TO GO LIVE ─────────────────────────────────────────────────────────────
 * 1. Set `CONFIG.gateway` to the gateway that was actually integrated, and
 *    `CONFIG.preview` to false.
 * 2. Replace the simulated `onPay` in `lib/application/previewPayment.ts` with
 *    the real call. Nothing else in the flow needs editing: the rail, the
 *    progress percentage, the draft resume and the review step's CTA all read
 *    the sequence from here.
 * 3. Build a panel for any non-card method the gateway supports. Only the card
 *    form was designed; the others say so on the step rather than guessing at
 *    screens the provider will supply itself.
 */

/**
 * The gateways worth naming. Members other than `"none"` are the candidates
 * that were on the table, not integrations that exist — adding one here does
 * not integrate it, it only makes it expressible.
 */
export type PaymentGateway = "none" | "razorpay" | "stripe" | "payu" | "cashfree";

/**
 * NO GATEWAY IS INTEGRATED. Change `gateway` here and nowhere else.
 *
 * ── WHY THIS IS A PROPERTY AND NOT A BARE CONST ────────────────────────────
 *
 * It was `export const PAYMENT_GATEWAY: PaymentGateway = "none"` first, on the
 * assumption that the annotation would keep the declared type wide. It does
 * not: TypeScript narrows a `const` to its initialiser through control-flow
 * analysis whatever the annotation says, and the narrowing sticks because the
 * binding can never be reassigned. So `PAYMENT_GATEWAY !== "none"` type-checked
 * only while the value *was* `"none"`, and became
 *
 *   error TS2367: This comparison appears to be unintentional because the
 *   types '"razorpay"' and '"none"' have no overlap.
 *
 * the moment a real gateway was named. The config was rigged to break the build
 * at the one moment it is ever edited, and it would have looked like the
 * integration's fault rather than this file's.
 *
 * A property of an annotated object keeps its declared type — a property access
 * is not narrowed at a declaration site — so the comparison below stays legal
 * for every member of the union. Checked by setting this to "razorpay" and
 * running `tsc` before putting it back.
 */
const CONFIG: { gateway: PaymentGateway; preview: boolean } = {
  gateway: "none",
  /**
   * Show the payment step even though no gateway answers.
   *
   * On, deliberately: the screen is wanted on the live site before the gateway
   * is chosen. Everything preview mode owes the applicant is described in the
   * header, and enforced in `paymentConfig.test.ts` rather than left to whoever
   * reads this next.
   */
  preview: true,
};

export const PAYMENT_GATEWAY = CONFIG.gateway;

/**
 * Whether the step appears in the flow at all. `stepSequence` reads it, and
 * nothing else should branch on the gateway's name directly.
 */
export const paymentEnabled: boolean = PAYMENT_GATEWAY !== "none" || CONFIG.preview;

/**
 * Whether the step is showing without an acquirer behind it.
 *
 * True means: simulate the authorisation, show the notice, stamp the receipt.
 * It is derived from the gateway rather than stored separately, so it cannot be
 * left true after a real integration lands — naming a gateway turns it off.
 */
export const paymentIsPreview: boolean = PAYMENT_GATEWAY === "none";

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
