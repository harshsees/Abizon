"use client";

/**
 * The payment step, wired to the application.
 *
 * A container and nothing else: it reads the shared summary model, formats the
 * total, and hands `PaymentPanel` the values and the two callbacks it needs.
 * All of the UI is in the panel, which is what lets `/dev/payment-preview`
 * render the identical screen without an `ApplicationProvider` around it.
 *
 * NO ARITHMETIC HERE (§16). The amount comes from `summary.fees.total`, which
 * `buildSummary` computed on top of `computeTotals`. This file formats it and
 * stops — the same rule the rest of the flow follows, and the reason the fee
 * shown on this screen cannot disagree with the one in the sticky aside.
 *
 * THE `onPay` IS SIMULATED, and only while `paymentIsPreview`. The step is on
 * the live site ahead of a gateway, so the authorisation is `previewAuthorise`
 * — which has its own file, and a header explaining what it is allowed to be.
 * The two disclosures that make that honest travel with it through `preview`:
 * the notice above the form and the stamp across the receipt. When a gateway is
 * named, `paymentIsPreview` goes false, both disappear, and the import below is
 * the one line that changes.
 */

import { previewAuthorise } from "@/lib/application/previewPayment";
import { useApplication } from "@/lib/application/context";
import { paymentIsPreview } from "@/lib/paymentConfig";
import { FEE_NOT_PUBLISHED } from "@/lib/pricingConfig";

import { PaymentPanel } from "./PaymentPanel";

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

export function PaymentStep() {
  const { summary, state, next, back } = useApplication();
  if (!summary) return null;

  return (
    <PaymentPanel
      amount={summary.fees.total === null ? null : inr(summary.fees.total)}
      amountUnavailableLabel={FEE_NOT_PUBLISHED}
      destination={`${summary.country.displayName} ${summary.country.visaType}`}
      // The lead traveller, so a receipt is never addressed to nobody. The
      // cardholder name the applicant types wins over this whenever it exists —
      // the two are frequently different people.
      fallbackName={
        state.details[state.travellers[0]?.id]?.fullName ||
        summary.travellers.names[0]
      }
      preview={paymentIsPreview}
      onPay={previewAuthorise}
      onComplete={next}
      onBack={back}
    />
  );
}
