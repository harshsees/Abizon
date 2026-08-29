"use client";

/**
 * WHAT HAPPENS AFTER THE BUTTON.
 *
 * Two phases over one shared object. The card the applicant has been filling in
 * lifts out of the form and into the middle of the screen — the same element,
 * moved, via `layoutId`, not a second card that fades in where the first one
 * faded out. Everything else on the page goes behind a scrim, because between
 * pressing pay and knowing the answer there is nothing else to do.
 *
 *   authorising  the contactless mark ripples and a slow ring pushes out from
 *                the card edge. No progress bar: nobody knows how long an
 *                acquirer will take, and a bar that fills at a made-up rate is
 *                a claim about a duration this code cannot know.
 *   settled      the ring turns green once, and a receipt prints upward from
 *                behind the card the way a terminal prints one.
 *
 * THE RECEIPT IS A RECORD, NOT DECORATION. Every figure on it comes from the
 * summary model and the card fields — there is no placeholder amount and no
 * invented reference number. It shows what was charged, to which card, for
 * which destination, and nothing it cannot source.
 *
 * REACHING THIS STATE REQUIRES A REAL PAYMENT. `PaymentStep` only advances the
 * phase when the `onPay` it was given resolves, and in the shipped app there is
 * no `onPay` — see `paymentConfig.ts`. The dev preview supplies a simulated one
 * and says so on the page.
 */

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { DURATION, EASE, SPRING } from "@/lib/motion";

export type PaymentReceipt = {
  /** Formatted, e.g. "₹12,340". The overlay does no arithmetic. */
  amount: string;
  /** Cardholder as typed, or a fallback the caller chooses. */
  name: string;
  destination: string;
  /** Last four digits, or undefined if the number never reached four. */
  lastFour?: string;
  /** When the payment settled. Passed in so the receipt does not re-render
   *  itself a minute later showing a different time. */
  at: Date;
};

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
});

export function PaymentOverlay({
  phase,
  receipt,
  card,
  onDone,
  doneLabel = "Continue",
}: {
  phase: "authorising" | "settled";
  receipt: PaymentReceipt;
  /** The card, passed in so the shared-layout element has one owner. */
  card: React.ReactNode;
  onDone: () => void;
  doneLabel?: string;
}) {
  const settled = phase === "settled";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={settled ? "Payment complete" : "Authorising payment"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.out }}
      className="fixed inset-0 z-modal flex flex-col items-center justify-center bg-background/95 px-5 backdrop-blur-md"
    >
      {/* CARD AND RECEIPT SHARE ONE BOX, and the receipt is positioned against
          it rather than against the viewport centre.

          The first attempt anchored the mask to the middle of the screen and
          gave the paper a fixed 350px of travel, which worked only for a paper
          of exactly the height the source design's was. Ours carries more rows,
          so it over-travelled and came to rest with the amount — the one figure
          the receipt exists to show — hidden behind the card.

          Now the paper is bottom-aligned in its mask and travels a full 100% of
          its own height, so the geometry holds at any content length: it starts
          entirely below the mask (invisible), and ends with its bottom edge at
          the mask's bottom, which overlaps the card's top by 60px. That overlap
          is the tuck that makes it read as printing out from under the card. */}
      <div className="relative mb-10 h-[240px] w-full max-w-[420px]">
        {settled && (
          <div className="pointer-events-none absolute bottom-[180px] left-1/2 h-[480px] w-[320px] -translate-x-1/2 overflow-hidden">
            <Receipt receipt={receipt} />
          </div>
        )}

        {/* The card. `layoutId` matches the one in the step, so this is the
            same object arriving here rather than a copy. */}
        <motion.div
          layoutId="payment-card"
          transition={SPRING.gentle}
          animate={{ scale: settled ? 0.97 : 1 }}
          style={{ zIndex: 10 }}
          className="pay-scene absolute inset-0 drop-shadow-[0_20px_40px_rgba(59,130,246,0.3)]"
        >
          {card}
          {settled ? <span className="pay-settled" /> : <span className="pay-radar" />}
        </motion.div>
      </div>

      {settled ? (
        <motion.div
          key="settled"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: DURATION.slow, ease: EASE.out }}
          className="relative z-modal flex flex-col items-center text-center"
        >
          <SuccessTick />
          <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">
            Payment received
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {receipt.amount} paid
            {receipt.lastFour ? ` with the card ending ${receipt.lastFour}` : ""}.
          </p>

          <button
            type="button"
            onClick={onDone}
            autoFocus
            className="mt-6 inline-flex h-12 cursor-pointer items-center rounded-full bg-foreground px-7 text-sm font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-subtle-foreground active:scale-[0.98] motion-reduce:transform-none sm:h-11"
          >
            {doneLabel}
          </button>
        </motion.div>
      ) : (
        <motion.div
          key="authorising"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DURATION.base, ease: EASE.out }}
          role="status"
          className="flex flex-col items-center text-center"
        >
          <Loader2 aria-hidden className="size-8 animate-spin text-accent" />
          <p className="mt-4 text-lg font-medium text-foreground">
            Authorising with your bank…
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            This can take a few seconds. Do not close this window.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

/**
 * The paper.
 *
 * Starts far below its mask and travels up on a spring, so it decelerates into
 * place rather than stopping dead — a receipt leaving a printer has weight. The
 * mask clips it; the card in front hides the last of its travel.
 */
function Receipt({ receipt }: { receipt: PaymentReceipt }) {
  return (
    <motion.div
      // 100% of its own height, so the travel is correct whatever the paper
      // ends up containing. See the note on the mask above.
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 70, damping: 15 }}
      className="pay-receipt absolute inset-x-0 bottom-0 px-6 pb-7 pt-7 font-mono text-slate-800 shadow-[0_-10px_25px_rgba(0,0,0,0.1)]"
      style={{ background: "var(--pay-receipt-paper, #fdfdfd)" }}
    >
      <p className="text-center text-lg font-bold tracking-wider">ABIZON</p>
      <p className="mt-0.5 text-center text-[11px] tracking-wide text-slate-500">
        PAYMENT RECEIPT
      </p>

      <Rule />
      <ReceiptRow label="Date" value={dateFormat.format(receipt.at)} />
      <ReceiptRow label="Time" value={timeFormat.format(receipt.at)} />

      <Rule />
      <ReceiptRow label="Name" value={receipt.name} />
      <ReceiptRow label="For" value={receipt.destination} />
      {receipt.lastFour && <ReceiptRow label="Card" value={`•••• ${receipt.lastFour}`} />}

      <Rule />
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-[13px]">Amount</span>
        <span data-numeric className="text-[15px] font-bold">
          {receipt.amount}
        </span>
      </div>

      <Rule />
      {/* Texture, not data. A receipt with nothing in this band looks like a
          draft; drawing something scannable would be worse, because it would
          encode nothing while appearing to encode something. */}
      {/* Kept to one line. Wrapped, it stopped reading as a printed band and
          started reading as a broken one. */}
      <p
        aria-hidden
        className="mt-3 select-none overflow-hidden whitespace-nowrap text-center text-xl font-bold tracking-[0.15em] text-slate-900"
      >
        ||| | |||| || |
      </p>
      <p className="mt-3 text-center text-[11px] italic text-slate-500">
        Thank you.
      </p>
    </motion.div>
  );
}

function Rule() {
  return <div className="my-3 border-t border-dashed border-slate-400" />;
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-[13px]">
      <span className="text-slate-500">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}

/**
 * The tick draws itself — circle first, then the check.
 *
 * A static tick that simply appears reads as a state the page was always in; a
 * drawn one reads as something that just happened, which is the difference
 * being communicated. Under reduced motion Framer skips the path animation and
 * the finished mark is what remains, which is the correct fallback.
 */
function SuccessTick() {
  return (
    <motion.svg
      width="72"
      height="72"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-success)"
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <motion.circle
        cx="12"
        cy="12"
        r="10.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, ease: EASE.inOut }}
      />
      <motion.path
        d="M7.5 12.5l3 3 6-6.5"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.45, duration: 0.4, ease: EASE.out }}
      />
    </motion.svg>
  );
}
