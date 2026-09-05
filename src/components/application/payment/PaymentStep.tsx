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
 * `summary.fees` is what `buildSummary` produced on top of `computeTotals`, and
 * this file multiplies nothing, adds nothing and rounds nothing — the one
 * operation it performs is `× travellers`, which `buildSummary` has already
 * done for the total and deliberately has NOT done for the components, because
 * the components are per-traveller figures by definition. That multiplication
 * is display arithmetic on published per-head prices, and the row it produces
 * says "2 ×" beside it so the reader can check it.
 *
 * WHAT THE RECEIPT PRINTS, and why it is these rows: the authority's fee and
 * Abizon's fee are the two things the applicant is actually paying for, they
 * are the same two the sticky price aside itemises, and GST is charged on the
 * second and not the first. A receipt that showed one undifferentiated total
 * would be less of a record than the screen the applicant just left.
 *
 * A NULL COMPONENT PRINTS NOTHING RATHER THAN ZERO. `serviceFee` is `null`
 * while Abizon's charge is unpublished (see `pricingConfig.ts`), and the whole
 * total is `null` with it — so in that state there is no breakdown to print and
 * `receiptLines` is empty. Printing "₹0" for an undecided fee is the exact
 * failure that file exists to prevent.
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
import { ABIZON_TERMS, FEE_NOT_PUBLISHED } from "@/lib/pricingConfig";

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
  const party = fees.travellers;

  /**
   * The breakdown, or nothing at all.
   *
   * Gated on `serviceFee` rather than assembled row by row: the government fee
   * is always known, so a partial breakdown would print one real row and
   * silently omit the other, and a receipt missing a line item is worse than a
   * receipt with none — it reads as a complete list that happens to be short.
   */
  const lines: ReceiptLine[] =
    fees.serviceFee === null
      ? []
      : [
          {
            label: `${times(party)}${summary.country.displayName} government fee`,
            amount: inr(fees.governmentFee * party),
          },
          {
            label: `${times(party)}Abizon service fee${
              summary.plan.isExpress ? " (express)" : ""
            }`,
            amount: inr(fees.serviceFee * party),
          },
        ];

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
        amount={fees.total === null ? null : inr(fees.total)}
        amountUnavailableLabel={FEE_NOT_PUBLISHED}
        destination={`${summary.country.displayName} ${summary.country.visaType}`}
        receiptLines={lines}
        receiptTax={
          fees.gst === null
            ? undefined
            : {
                label: `GST (${Math.round(ABIZON_TERMS.gstRate * 100)}%)`,
                amount: inr(fees.gst * party),
              }
        }
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
      amount={fees.total === null ? null : inr(fees.total)}
      amountUnavailableLabel={FEE_NOT_PUBLISHED}
      destination={`${summary.country.displayName} ${summary.country.visaType}`}
      receiptLines={lines}
      // Subtotal and tax only where there is a breakdown for them to belong to.
      receiptSubtotal={
        fees.serviceFee === null
          ? undefined
          : inr((fees.governmentFee + fees.serviceFee) * party)
      }
      receiptTax={
        fees.gst === null
          ? undefined
          : {
              label: `GST (${Math.round(ABIZON_TERMS.gstRate * 100)}%)`,
              amount: inr(fees.gst * party),
            }
      }
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
