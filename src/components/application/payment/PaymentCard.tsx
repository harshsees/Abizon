"use client";

/**
 * THE CARD.
 *
 * A live rendering of what is being typed, which is the whole idea of the
 * design this implements: the applicant is copying sixteen digits off a piece
 * of plastic, and the fastest way to check they got it right is to look at a
 * picture of the same plastic rather than at a form field. So the number, name
 * and expiry appear here in the positions they occupy on a real card, and
 * focusing the CVV field turns the card over to where the CVV is printed.
 *
 * ── REDRAWN TO THE REFERENCE RECORDING ──
 *
 * `payment-ui/screen-20260829-140424.mp4`. The card there is a dark navy
 * "platinum" card and it is laid out the way real cards are, which the version
 * this replaces was not:
 *
 *   WAS                                   NOW
 *   a "Card number" label above the       no label. Nothing on a real card
 *   digits                                names its own number, and the field
 *                                         six inches to the right already does
 *   name / valid / brand on one           name and expiry on the left under
 *   crowded row, the brand mark           their printed captions, the scheme
 *   fighting the expiry for space         mark alone on the right
 *   `text-lg` digits at 0.18em            `text-xl` at 0.14em, which is the
 *                                         ratio the recording sets and is what
 *                                         makes the number the object on the
 *                                         card rather than one of five things
 *   a flat mid-blue                       the recording's navy-to-indigo
 *   a bare black bar for the mag stripe   an oxide stripe and a printed
 *   and a white box for the CVV           signature panel with the security
 *                                         tint, which is what the applicant is
 *                                         being asked to look at
 *
 * TIER AND PRODUCT LINE ("PLATINUM", "INFINITE") are set from props with no
 * default that asserts anything false. They are the card's own printing, not a
 * claim this app makes: `tier` defaults to the neutral "PLATINUM" the reference
 * shows, and the product line under the scheme mark only renders when a brand
 * has actually been recognised.
 *
 * PURELY PRESENTATIONAL. It holds no state, validates nothing, and knows
 * nothing about payment — `flipped` and `authorising` are told to it. That is
 * what lets the same component render inside the step, inside the success
 * overlay, and inside the dev preview without three variants of it.
 *
 * THE MATERIAL IS IN CSS, not here. See section 7 of `globals.css` for why the
 * gradients, the chip, the stripe and the 3D transforms are written there.
 *
 * ACCESSIBILITY. The card is `aria-hidden`. Every value on it is a duplicate of
 * a form field that already has a label, and a screen reader reading a
 * half-typed card number twice — once as the field, once as this — is noise. It
 * is a picture of the form, and it is announced as one: nothing.
 */

import { CARD_BRAND_LABEL, type CardBrand } from "@/lib/application/payment";

/**
 * The product line printed under each scheme mark.
 *
 * Real, and specific to the scheme: Visa Infinite, World Mastercard and Amex
 * Platinum are the actual premium tiers those three sell. RuPay's is "Select".
 * They are texture on a mock card and nothing reads them, but a card printed
 * with a tier its own scheme does not offer is the kind of detail that makes
 * an otherwise convincing object look wrong without the viewer knowing why.
 */
const BRAND_LINE: Record<CardBrand, string> = {
  visa: "INFINITE",
  mastercard: "WORLD",
  amex: "PLATINUM",
  rupay: "SELECT",
  discover: "SIGNATURE",
};

export type PaymentCardProps = {
  /** Already grouped for display. This component does no formatting. */
  number: string;
  name: string;
  /** "MM / YY", already formatted. */
  expiry: string;
  cvv: string;
  brand?: CardBrand;
  /** Show the back, where the security code is printed. */
  flipped?: boolean;
  /** A payment is in flight: the contactless mark ripples. */
  authorising?: boolean;
  /** The tier printed top-right. The reference's card says PLATINUM. */
  tier?: string;
};

export function PaymentCard({
  number,
  name,
  expiry,
  cvv,
  brand,
  flipped = false,
  authorising = false,
  tier = "PLATINUM",
}: PaymentCardProps) {
  return (
    <div
      className="pay-card h-full w-full"
      data-flipped={flipped ? "true" : "false"}
      aria-hidden
    >
      {/* ------------------------------------------------------------------ */}
      {/* Front                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="pay-face flex flex-col justify-between p-6 sm:p-7">
        {/* Row one: the physical furniture on the left, the tier on the
            right. Both are printed at the top of a real card and neither is
            data, which is why they share a row nothing else is in. */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="pay-chip" />
            <ContactlessMark live={authorising} />
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
            {tier}
          </span>
        </div>

        {/* THE NUMBER, on its own, in the middle band — where it is embossed.
            Monospaced and tracked out, so a digit checked against the card in
            the applicant's hand lands under the same digit every time.
            Placeholder dots rather than an empty line: the card should look
            like a card before anything is typed. */}
        <p
          data-numeric
          className="font-mono text-[19px] font-medium tracking-[0.14em] [text-shadow:0_1px_3px_rgb(0_0_0/0.45)] sm:text-xl"
        >
          {number || "•••• •••• •••• ••••"}
        </p>

        {/* Row three: the two printed values on the left under their captions,
            the scheme mark alone on the right. The previous build put all
            three on one flex row with the brand between the expiry and the
            edge, which on a phone truncated the cardholder name to make room
            for a wordmark. */}
        <div className="flex items-end justify-between gap-5">
          <div className="flex min-w-0 items-end gap-7">
            <div className="min-w-0">
              <CardLabel>Cardholder name</CardLabel>
              <p className="mt-1 truncate text-[13px] font-semibold uppercase tracking-wide">
                {name || "Your name"}
              </p>
            </div>
            <div className="flex-shrink-0">
              <CardLabel>Expires</CardLabel>
              <p
                data-numeric
                className="mt-1 text-[13px] font-semibold uppercase tracking-wide"
              >
                {expiry || "MM / YY"}
              </p>
            </div>
          </div>

          {/* The slot is always there so the row does not reflow when a brand
              is recognised mid-typing; only the mark arrives. */}
          <div className="flex min-w-[52px] flex-shrink-0 flex-col items-end">
            <BrandMark brand={brand} className="text-[19px]" />
            {brand && (
              <span className="mt-0.5 text-[7px] font-semibold uppercase tracking-[0.3em] text-white/55">
                {BRAND_LINE[brand]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Back                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="pay-face pay-face--back flex flex-col">
        {/* The stripe runs edge to edge, high on the card, exactly as it does
            on the plastic. It is the landmark that tells the applicant they
            are looking at the back without anything having to say so. */}
        <div className="pay-stripe mt-5" />

        <div className="px-6 pt-4 sm:px-7">
          <CardLabel className="block text-right">Security code (CVV)</CardLabel>

          {/* The panel, and the code set to its right — which is where it is
              printed. Dots rather than digits: the applicant already sees what
              they typed in the field, and the card is showing them WHERE it
              lives, not repeating it to the room. */}
          <div className="pay-signature mt-1.5">
            <span
              data-numeric
              className="font-mono text-[15px] tracking-[0.35em] text-slate-900"
            >
              {cvv ? "•".repeat(cvv.length) : ""}
            </span>
          </div>

          {/* Verbatim from a card back. It is set unreadably small on purpose —
              it is texture that makes the object convincing, not copy, which is
              also why nothing here needs to be translated or maintained. */}
          <p className="mt-3.5 text-justify text-[7.5px] leading-relaxed text-white/55">
            This card is issued by the bank named on the reverse and remains its
            property. Use of this card is governed by the cardholder agreement.
            It is not transferable. If found, please return it to any branch of
            the issuing bank.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * The scheme mark.
 *
 * WHY MASTERCARD IS DRAWN AND THE REST ARE SET.
 *
 * Because that is what they are. Visa and Amex are wordmarks; Mastercard is two
 * interlocking circles and has been since long before it stopped printing its
 * name beside them. Setting "MASTERCARD" as text is not just less recognisable,
 * it is nine characters wide in a slot sized for four — on a phone it truncated
 * the cardholder name beside it and, in the number field, ran under the digits.
 * The circles are ~30px whatever the brand name's length.
 *
 * Shared by the card face and the number field so a brand can never be shown
 * one way in one place and another way six inches below it.
 */
export function BrandMark({
  brand,
  className = "",
}: {
  brand?: CardBrand;
  className?: string;
}) {
  if (!brand) return null;

  if (brand === "mastercard") {
    return (
      <svg
        viewBox="0 0 36 22"
        className={`h-[18px] w-[30px] ${className}`.trim()}
        role="img"
        aria-label={CARD_BRAND_LABEL.mastercard}
      >
        <circle cx="13" cy="11" r="10" fill="#eb001b" />
        <circle cx="23" cy="11" r="10" fill="#f79e1b" />
        {/* The overlap. Mastercard's own mark renders it as a distinct blend
            rather than either circle simply covering the other. */}
        <path
          d="M18 3.2a10 10 0 0 0 0 15.6 10 10 0 0 0 0-15.6Z"
          fill="#ff5f00"
        />
      </svg>
    );
  }

  return (
    <span
      className={`whitespace-nowrap text-[15px] font-extrabold italic leading-none tracking-wide ${className}`.trim()}
    >
      {CARD_BRAND_LABEL[brand]}
    </span>
  );
}

function CardLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-[8px] uppercase tracking-[0.16em] text-white/50 ${className}`.trim()}
    >
      {children}
    </p>
  );
}

/**
 * The contactless mark, drawn rather than imported.
 *
 * Three arcs and a dot, rotated 90° so the waves travel to the right as they do
 * on a real card. `data-wave` indices drive the staggered ripple in CSS —
 * innermost first, so the signal reads as leaving the card rather than
 * arriving at it.
 */
function ContactlessMark({ live }: { live: boolean }) {
  return (
    <svg
      className="pay-wifi size-[22px]"
      data-live={live ? "true" : "false"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
    >
      <circle data-wave="0" cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
      <path data-wave="1" d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <path data-wave="2" d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path data-wave="3" d="M1.42 9a16 16 0 0 1 21.16 0" />
    </svg>
  );
}
