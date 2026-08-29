/**
 * ABIZON PAYMENT TERMS — where "can we take money yet" is answered once.
 * ---------------------------------------------------------------------------
 * This file exists for the same reason `pricingConfig.ts` does, one step
 * further along. `pricingConfig` holds figures nobody has agreed and marks them
 * `provisional` so no surface can quote them as settled. This holds something
 * blunter: whether there is a payment gateway at all.
 *
 * THERE IS NOT. `PAYMENT_GATEWAY` is `"none"`, and every claim the rest of the
 * app makes about money still stands because of it — `ApplicationComplete` says
 * "Abizon cannot take a payment online yet", and that sentence is true as long
 * as this constant is what it is.
 *
 * WHY THE UI SHIPS ANYWAY. The payment screen is built, in full, and gated
 * behind this flag rather than held back on a branch. The flow it belongs to is
 * five screens long and its layout, rail and summary all have to make room for
 * a sixth; discovering that after a gateway is chosen is discovering it late.
 * So the screen exists, `stepSequence` refuses to include it while the gateway
 * is `"none"`, and `/dev/payment-preview` renders it for review.
 *
 * WHAT IS DELIBERATELY NOT HERE. Any code that moves money. `PaymentPanel`
 * collects card fields, validates their *shape*, and stops — its `onPay` prop
 * is optional, `PaymentStep` does not pass one, and without it the button is
 * disabled under a sentence saying why. There is no `setTimeout` anywhere that
 * resolves into a receipt, because that is precisely the lie the deleted
 * `MultiStepApplicationForm` told about submission, and this codebase treats
 * "nothing happened, but the screen says it did" as the worst outcome available
 * to it. The only simulated payment in the repository lives in
 * `app/dev/payment-preview`, which 404s in production.
 *
 * ── TO TURN PAYMENT ON ─────────────────────────────────────────────────────
 * 1. Set `CONFIG.gateway` below to the gateway that was actually integrated.
 * 2. Pass an `onPay` from `PaymentStep` into `PaymentPanel`. Nothing else in
 *    the flow needs editing: the rail, the progress percentage, the draft
 *    resume and the review step's CTA all read the sequence from here.
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
const CONFIG: { gateway: PaymentGateway } = {
  gateway: "none",
};

export const PAYMENT_GATEWAY = CONFIG.gateway;

/**
 * The single gate. `stepSequence` reads it, and nothing else should branch on
 * the gateway's name directly.
 */
export const paymentEnabled: boolean = PAYMENT_GATEWAY !== "none";

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
 */
export const PAYMENT_UNAVAILABLE_NOTICE =
  "Abizon cannot take a card payment online yet. Fees are settled with you directly before anything is filed.";
