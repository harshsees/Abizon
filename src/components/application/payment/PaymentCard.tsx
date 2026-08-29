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
 * PURELY PRESENTATIONAL. It holds no state, validates nothing, and knows
 * nothing about payment — `flipped` and `authorising` are told to it. That is
 * what lets the same component render inside the step, inside the success
 * overlay, and inside the dev preview without three variants of it.
 *
 * THE MATERIAL IS IN CSS, not here. See section 7 of `globals.css` for why the
 * gradients, the chip and the 3D transforms are written there.
 *
 * ACCESSIBILITY. The card is `aria-hidden`. Every value on it is a duplicate of
 * a form field that already has a label, and a screen reader reading a
 * half-typed card number twice — once as the field, once as this — is noise. It
 * is a picture of the form, and it is announced as one: nothing.
 */

import { CARD_BRAND_LABEL, type CardBrand } from "@/lib/application/payment";

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
};

export function PaymentCard({
  number,
  name,
  expiry,
  cvv,
  brand,
  flipped = false,
  authorising = false,
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
      <div className="pay-face flex flex-col justify-between p-6">
        <div className="flex items-start justify-between">
          <div className="pay-chip" />
          <ContactlessMark live={authorising} />
        </div>

        {/* Four rows spread by `justify-between`, as on the source design and
            on a real card: the chip sits high, the number occupies the middle
            band, and the name and expiry run along the bottom. Grouping the
            last three into one block instead left the number hard against the
            details and a dead gap under the chip. */}
        <CardLabel>Card number</CardLabel>

        {/* Monospaced and tracked out, so a digit checked against the card in
            the applicant's hand lands under the same digit every time.
            Placeholder dots rather than an empty line: the card should look
            like a card before anything is typed. */}
        <p
          data-numeric
          className="font-mono text-lg font-medium tracking-[0.18em] [text-shadow:1px_1px_2px_rgb(0_0_0/0.4)]"
        >
          {number || "•••• •••• •••• ••••"}
        </p>

        <div className="flex items-center gap-5">
          <div className="min-w-0 flex-1">
            <CardLabel>Name</CardLabel>
            <p className="truncate text-[13px] font-medium uppercase">
              {name || "Your name"}
            </p>
          </div>
          <div className="flex-shrink-0 text-center">
            <CardLabel>Valid</CardLabel>
            <p data-numeric className="text-[13px] font-medium uppercase">
              {expiry || "MM / YY"}
            </p>
          </div>
          {/* The slot is always there so the row does not reflow when a brand
              is recognised mid-typing; only the mark arrives. */}
          <div className="flex min-w-[52px] flex-shrink-0 justify-end">
            <BrandMark brand={brand} />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Back                                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="pay-face pay-face--back">
        <div className="mt-6 h-10 w-full bg-[#111]" />

        <div className="px-6 py-4">
          <CardLabel>Security code</CardLabel>
          <div
            data-numeric
            className="mt-1.5 flex h-9 w-full items-center justify-end rounded bg-white px-4 font-mono text-base tracking-[0.25em] text-slate-900"
          >
            {"•".repeat(cvv.length)}
          </div>

          {/* Verbatim from a card back. It is set unreadably small on purpose —
              it is texture that makes the object convincing, not copy, which is
              also why nothing here needs to be translated or maintained. */}
          <p className="mt-3 text-justify text-[7.5px] leading-relaxed opacity-60">
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
      className={`text-[9px] uppercase tracking-[0.1em] opacity-50 ${className}`.trim()}
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
      className="pay-wifi size-6"
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
