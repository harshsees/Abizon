"use client";

/**
 * The payment step, wired to the application.
 *
 * A container and nothing else: it reads the shared summary model, formats the
 * figures, and hands `PaymentPanel` the values and the two callbacks it needs.
 * All of the UI is in the panel, which is what lets `/dev/payment-preview`
 * render the identical screen without an `ApplicationProvider` around it.
 *
 * NO ARITHMETIC HERE (§16). Every number below is already computed:
 * `summary.fees` is the quote `buildSummary` took from `quoteVisa`, and this
 * file only formats it.
 *
 * WHAT THE RECEIPT PRINTS: one row per line of the quote — the travellers, and
 * the children separately where a destination prices them differently. Prices
 * are all-inclusive, so there is no fee or tax row to add.
 *
 * A PARTY THAT CANNOT BE PRICED PRINTS NO TOTAL. The New Zealand couple visa
 * with anything but two travellers has no price; the panel shows the reason in
 * place of an amount rather than charging a guess.
 *
 * ── TWO SCREENS, AND WHY THEY ARE NOT THE SAME SCREEN ──
 *
 * With Razorpay keys configured this renders `LiveCheckout`: the amount, the
 * breakdown, and one button that opens Razorpay's own modal. Without them it
 * renders `PaymentPanel` with its hand-built card form and a simulated
 * authorisation.
 *
 * That is not a stylistic split. Razorpay Checkout collects the card in an
 * iframe on Razorpay's origin, and never seeing a card number is what keeps
 * this codebase out of PCI-DSS scope — a property of not having the data rather
 * than of being careful with it. There is no way to keep the pretty form and
 * hand what it collects to Razorpay: no standard account exposes an API that
 * would accept it, and building one would move the compliance burden here.
 *
 * So the form survives as the PREVIEW screen and as `/dev/payment-preview`, and
 * the two disclosures that make preview honest — the notice above the form and
 * the stamp across the receipt — travel with it. When keys are configured,
 * `paymentIsPreview()` goes false and this component renders the other branch
 * entirely.
 */

import { previewAuthorise } from "@/lib/application/previewPayment";
import { useApplication } from "@/lib/application/context";
import { paymentIsPreview } from "@/lib/paymentConfig";
import { FEE_NOT_PUBLISHED } from "@/lib/pricingConfig";

import { LiveCheckout } from "./LiveCheckout";
import { PaymentPanel } from "./PaymentPanel";
import type { ReceiptLine } from "./ReceiptPrinter";

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

/** "2 × " for a party, nothing for a solo traveller — a "1 ×" on every row of
 *  a receipt for one person is noise that reads as a quantity worth checking. */
const times = (count: number) => (count > 1 ? `${count} × ` : "");

export function PaymentStep() {
  const { summary, state, next, back, sync } = useApplication();
  if (!summary) return null;

  const { fees } = summary;
  const amount = fees.total === null ? null : inr(fees.total);
  const unavailable = fees.problem ?? FEE_NOT_PUBLISHED;
  const destination = `${summary.country.displayName} · ${summary.plan.label}`;

  const lines: ReceiptLine[] =
    fees.total === null
      ? []
      : fees.lines.map((line) => ({
          label: `${times(line.count)}${line.label}`,
          amount: inr(line.amount),
        }));

  /**
   * THE LIVE BRANCH, and the one condition that gates it besides the keys.
   *
   * `sync.applicationId` is the server's row, and there is no row while the
   * applicant is signed out or the deployment has no database. Razorpay prices
   * an order FROM that row — see `createPaymentOrderAction`, which recomputes
   * the amount rather than trusting the screen — so with no row there is
   * nothing to charge for.
   *
   * That case falls through to the preview panel, which is the right screen for
   * it: an applicant who never signed in cannot be charged, and the notice above
   * the form says so. It is not a silent downgrade — it is the same disclosure
   * every preview render carries.
   */
  if (!paymentIsPreview() && sync.applicationId) {
    return (
      <LiveCheckout
        applicationId={sync.applicationId}
        amount={amount}
        amountUnavailableLabel={unavailable}
        destination={destination}
        receiptLines={lines}
        prefill={{
          name:
            state.details[state.travellers[0]?.id]?.fullName ||
            summary.travellers.names[0],
          email: state.contact.email,
          contact: state.contact.phone,
        }}
        onPaid={next}
        onBack={back}
      />
    );
  }

  return (
    <PaymentPanel
      amount={amount}
      amountUnavailableLabel={unavailable}
      destination={destination}
      receiptLines={lines}
      // The lead traveller, so a receipt is never addressed to nobody. The
      // cardholder name the applicant types wins over this whenever it exists —
      // the two are frequently different people.
      fallbackName={
        state.details[state.travellers[0]?.id]?.fullName ||
        summary.travellers.names[0]
      }
      preview
      onPay={previewAuthorise}
      onComplete={next}
      onBack={back}
    />
  );
}
