"use client";

/**
 * The preview harness.
 *
 * WHAT THIS IS FOR NOW THAT THE STEP IS LIVE. The payment screen is in the
 * application flow in preview mode, so it can be reached the ordinary way; what
 * cannot be reached there is a payment that FAILS. `previewAuthorise` always
 * succeeds, deliberately — a declined card the applicant cannot un-decline is a
 * dead end on a screen with nothing behind it.
 *
 * So the failure paths live here. Declined and provider-down are real branches
 * in `PaymentPanel`, they are the ones a checkout is actually judged on, and
 * this is the only place they can be exercised without an acquirer. That is
 * also why the route still 404s in production: choosing your own payment
 * outcome is a developer tool, not a page.
 */

import { useState } from "react";

import { PaymentPanel, type PaymentOutcome } from "@/components/application/payment/PaymentPanel";

type Outcome = "settled" | "declined" | "unreachable";

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: "settled", label: "Settles" },
  { id: "declined", label: "Declined" },
  { id: "unreachable", label: "Provider down" },
];

/** Long enough to watch the authorising state, short enough to iterate on. */
const LATENCY_MS = 2200;

export function PaymentPreview() {
  const [outcome, setOutcome] = useState<Outcome>("settled");
  const [completed, setCompleted] = useState(false);

  const onPay = async (): Promise<PaymentOutcome> => {
    await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

    if (outcome === "declined") {
      return {
        ok: false,
        message: "Your bank declined this payment. Nothing has been charged.",
      };
    }
    if (outcome === "unreachable") throw new Error("simulated provider outage");
    return { ok: true };
  };

  /*
   * 34rem was the panel's own width when it was a single column. It is two
   * now — the card and the total on the left, the form on the right — and at
   * 34rem the right column came out ~150px wide, which stacked the floating
   * labels on top of each other and made this harness useless for reviewing
   * the thing it exists to review. Matched to the width the application flow
   * gives the step (`max-w-[1000px]`) plus this page's own chrome.
   */
  return (
    <main className="mx-auto min-h-screen w-full max-w-[68rem] px-5 py-10">
      <header className="mb-7 rounded-xl border border-warning-subtle-foreground/30 bg-warning-subtle px-4 py-3.5">
        <p className="text-sm font-bold text-warning-subtle-foreground">
          Preview — this is a simulation
        </p>
        <p className="mt-1.5 text-2xs leading-relaxed text-warning-subtle-foreground">
          No gateway is connected and no card is charged. The result below is
          chosen here, not by a bank, which is what this page is for — the
          declined and provider-down branches cannot be reached from the live
          step, where the simulated authorisation always succeeds. This page
          does not exist in production. Set{" "}
          <code className="font-mono">CONFIG.gateway</code> in{" "}
          <code className="font-mono">lib/paymentConfig.ts</code> to take real
          payments.
        </p>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {OUTCOMES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setOutcome(option.id)}
              aria-pressed={outcome === option.id}
              className={`inline-flex h-8 cursor-pointer items-center rounded-full border px-3.5 text-2xs font-semibold transition-colors ${
                outcome === option.id
                  ? "border-transparent bg-foreground text-background"
                  : "border-border-strong bg-surface text-foreground hover:bg-surface-sunken"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </header>

      <div className="rounded-card border border-border bg-surface px-5 py-7 shadow-e2 sm:px-8 sm:py-9">
        <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Payment
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">
          Pay for your application
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The government fee for United Arab Emirates and Abizon&rsquo;s charge,
          in one payment.
        </p>

        <div className="mt-8">
          <PaymentPanel
            // A plausible total: two travellers, standard processing. Formatted
            // the way `PaymentStep` formats `summary.fees.total`, and — unlike
            // the flat figure this replaces — arithmetically consistent with
            // the rows beneath it, so the receipt printer can be reviewed here
            // without the totals on the paper contradicting each other.
            //
            //   government   ₹3,500 x 2 = ₹7,000
            //   service      ₹1,500 x 2 = ₹3,000
            //   subtotal                 ₹10,000
            //   GST 18% of the service fee only    ₹540
            //   total                    ₹10,540
            amount="₹10,540"
            amountUnavailableLabel="Fee not published"
            destination="United Arab Emirates e-Visa"
            receiptLines={[
              { label: "2 × United Arab Emirates government fee", amount: "₹7,000" },
              { label: "2 × Abizon service fee", amount: "₹3,000" },
            ]}
            receiptSubtotal="₹10,000"
            receiptTax={{ label: "GST (18%)", amount: "₹540" }}
            fallbackName="Cardholder"
            onPay={onPay}
            preview
            onComplete={() => setCompleted(true)}
            onBack={() => undefined}
          />
        </div>

        {completed && (
          <p
            role="status"
            className="mt-6 rounded-xl border border-border bg-surface-sunken px-4 py-3 text-2xs text-muted-foreground"
          >
            In the flow, this is where the applicant lands on the final step. Here
            there is nowhere to go — reload to run it again.
          </p>
        )}
      </div>
    </main>
  );
}
