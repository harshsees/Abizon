"use client";

/**
 * THE LIVE CHECKOUT SCREEN
 * ---------------------------------------------------------------------------
 * What the applicant sees when a Razorpay key is configured: what they are
 * paying for, what it costs, and one button.
 *
 * ── Why this is not `PaymentPanel` with the form hidden ──
 *
 * Because almost none of `PaymentPanel` applies. That component's substance is
 * a card form, a card that flips to show the CVV side, per-field validation, a
 * method switcher and an authorising animation — and every one of those belongs
 * to collecting a card, which this screen must not do. What is left after
 * hiding them is a total and a button, which is this file. Threading a
 * `hosted` flag through the other component would leave two thirds of it
 * unreachable and every future edit to it having to ask which mode it was in.
 *
 * `PaymentPanel` keeps its own job: it is the preview screen, and it is the
 * thing `/dev/payment-preview` renders. Neither of them is dead code.
 *
 * ── The breakdown is shown BEFORE the button, not after ──
 *
 * Razorpay's modal shows one figure. This is the last screen on which the
 * applicant can see what that figure is made of — a government fee that is
 * unrecoverable once filed, our fee, and the GST on the second and not the
 * first. Putting it behind the payment would be putting it after the decision.
 */

import { ArrowLeft, Loader2, Lock, ShieldCheck } from "lucide-react";

import type { ReceiptLine } from "./ReceiptPrinter";
import { useRazorpayCheckout } from "./RazorpayCheckout";

export function LiveCheckout({
  applicationId,
  amount,
  amountUnavailableLabel,
  destination,
  receiptLines = [],
  receiptTax,
  prefill,
  onPaid,
  onBack,
}: {
  applicationId: string;
  /** Formatted, or `null` where a fee component is unpublished. */
  amount: string | null;
  amountUnavailableLabel: string;
  destination: string;
  receiptLines?: ReceiptLine[];
  receiptTax?: ReceiptLine;
  prefill?: { name?: string; email?: string; contact?: string };
  onPaid: () => void;
  onBack?: () => void;
}) {
  const { phase, pay } = useRazorpayCheckout({
    applicationId,
    destination,
    prefill,
    onPaid,
  });

  const working = phase.kind === "working";
  /**
   * An amount nobody has agreed is an amount nobody may be charged.
   * `pricingConfig.ts` exists to stop a `null` fee becoming a zero, and this is
   * the last place that null can still be honoured.
   */
  const payable = amount !== null;

  return (
    <div className="mx-auto w-full max-w-[560px]">
      <header className="text-center">
        <h1 className="text-balance text-[23px] font-bold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[26px] md:text-[30px]">
          Pay for your application
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{destination}</p>
      </header>

      <section className="mt-8 overflow-hidden rounded-[24px] bg-surface shadow-e4">
        <div className="px-6 pt-7 md:px-8">
          <p className="text-2xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Total to pay
          </p>
          <p
            data-numeric
            className="mt-1.5 text-[34px] font-bold leading-none tracking-tight text-foreground"
          >
            {amount ?? (
              <span className="text-[17px] font-semibold text-muted-foreground">
                {amountUnavailableLabel}
              </span>
            )}
          </p>
        </div>

        {receiptLines.length > 0 && (
          <dl className="mt-6 space-y-2.5 border-t border-border px-6 pt-5 md:px-8">
            {receiptLines.map((line) => (
              <div key={line.label} className="flex items-baseline justify-between gap-4">
                <dt className="text-[13px] leading-relaxed text-muted-foreground">
                  {line.label}
                </dt>
                <dd data-numeric className="text-[13px] font-semibold text-foreground">
                  {line.amount}
                </dd>
              </div>
            ))}

            {receiptTax && (
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-[13px] leading-relaxed text-muted-foreground">
                  {receiptTax.label}
                </dt>
                <dd data-numeric className="text-[13px] font-semibold text-foreground">
                  {receiptTax.amount}
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="px-6 pb-7 pt-6 md:px-8">
          <button
            type="button"
            onClick={pay}
            disabled={!payable || working}
            className="inline-flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-foreground text-base font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-subtle-foreground active:scale-[0.99] disabled:cursor-default disabled:bg-muted-foreground/60 disabled:shadow-none motion-reduce:transform-none"
          >
            {working ? (
              <>
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Opening secure checkout…
              </>
            ) : (
              <>
                <Lock aria-hidden className="size-4" />
                Pay {amount ?? ""} securely
              </>
            )}
          </button>

          {/* Said once, plainly, and only because it is true: the card is typed
              into Razorpay's own window and this application never receives it.
              `paymentConfig.ts` refused to make this claim while no gateway
              existed, which is the standard it should keep meeting. */}
          <p className="mt-3.5 flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground">
            <ShieldCheck aria-hidden className="mt-px size-3.5 flex-shrink-0" />
            Card details are entered in Razorpay&rsquo;s own secure window and
            never reach Abizon.
          </p>

          {phase.kind === "failed" && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-destructive-subtle px-4 py-3 text-[13px] leading-relaxed text-destructive"
            >
              {phase.message}
            </p>
          )}

          {/* Authorised, or confirmed by a call we could not complete. Not a
              failure and not yet a success — and the applicant must not be
              invited to pay again from this state, which is why there is no
              retry beside it. */}
          {phase.kind === "pending" && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-primary-subtle px-4 py-3 text-[13px] leading-relaxed text-primary-subtle-foreground"
            >
              Your payment is going through. Do not pay again — we will confirm
              it here and by email within a minute.
            </p>
          )}

          {phase.kind === "paid" && (
            <p
              role="status"
              className="mt-4 rounded-xl bg-success-subtle px-4 py-3 text-[13px] leading-relaxed text-success-subtle-foreground"
            >
              Payment received. Taking you to the next step…
            </p>
          )}
        </div>
      </section>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          disabled={working || phase.kind === "paid"}
          className="mx-auto mt-6 flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-50"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Back to documents
        </button>
      )}
    </div>
  );
}
