"use client";

/**
 * The preview harness.
 *
 * THE SIMULATION IS HERE AND NOWHERE ELSE. `PaymentPanel` has no fake payment
 * path in it — it takes an `onPay` and has one only if something gives it one.
 * This file is the only thing in the repository that does, which is why it sits
 * inside a route that 404s in production rather than beside the component.
 *
 * It offers all three outcomes a gateway produces — settled, declined, and
 * unreachable — because the declined and unreachable paths are the ones that
 * are never exercised by clicking through a happy path, and they are the ones
 * where a payment screen actually has to behave.
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-[34rem] px-5 py-10">
      <header className="mb-7 rounded-xl border border-warning-subtle-foreground/30 bg-warning-subtle px-4 py-3.5">
        <p className="text-sm font-bold text-warning-subtle-foreground">
          Preview — this is a simulation
        </p>
        <p className="mt-1.5 text-2xs leading-relaxed text-warning-subtle-foreground">
          No gateway is connected and no card is charged. The result below is
          chosen here, not by a bank. This page does not exist in production, and
          the payment step is not part of the application flow until{" "}
          <code className="font-mono">PAYMENT_GATEWAY</code> in{" "}
          <code className="font-mono">lib/paymentConfig.ts</code> names a real
          one.
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
            // the way `PaymentStep` formats `summary.fees.total`.
            amount="₹12,340"
            amountUnavailableLabel="Fee not published"
            destination="United Arab Emirates e-Visa"
            fallbackName="Cardholder"
            onPay={onPay}
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
