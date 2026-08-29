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
 * IN PREVIEW MODE THE RECEIPT IS STAMPED. The screen is live ahead of a
 * gateway, so this state is reachable without an acquirer having answered, and
 * a document that looks like a payment record but is not one must say so on its
 * face. `PAYMENT_PREVIEW_RECEIPT_STAMP` is printed across it the way a specimen
 * receipt is printed — because the receipt outlives the screen it appeared on,
 * in a screenshot or forwarded to somebody who never saw the notice on the
 * form. Nothing else about the state changes: the design is the design.
 */

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { DURATION, EASE, SPRING } from "@/lib/motion";
import { PAYMENT_PREVIEW_RECEIPT_STAMP } from "@/lib/paymentConfig";

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
  preview = false,
  onDone,
  doneLabel = "Continue",
}: {
  phase: "authorising" | "settled";
  receipt: PaymentReceipt;
  /** The card, passed in so the shared-layout element has one owner. */
  card: React.ReactNode;
  /** No acquirer answered. Stamps the receipt and softens the headline. */
  preview?: boolean;
  onDone: () => void;
  doneLabel?: string;
}) {
  const settled = phase === "settled";

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={
        settled
          ? preview
            ? "Payment preview complete"
            : "Payment complete"
          : "Authorising payment"
      }
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.out }}
      className="fixed inset-0 z-modal flex flex-col items-center justify-center bg-background/95 px-5 backdrop-blur-md"
    >
      {/* Everything the settled state draws lives inside one scaled stage, so a
          laptop viewport shrinks the composition instead of cropping the top
          off the receipt. See section 8 of globals.css. */}
      <div className="pay-stage flex flex-col items-center">
      {/* THE RECEIPT IS IN NORMAL FLOW, ABOVE THE CARD, and that is the whole
          trick. Three earlier attempts positioned it absolutely — anchored to
          the viewport centre, then to the card's box — and every one of them
          clipped, because an absolutely positioned element contributes no
          height, so the flex centring below had no idea the paper was there and
          happily pushed 200-400px of it off the top of the screen. On a laptop
          that took the "not a real payment" stamp with it.

          In flow, the mask reserves the paper's own height, the column centres
          around the whole composition, and nothing can be pushed out of view at
          any viewport. `-mb-14` pulls the card up over the paper's last 56px —
          the blank band `pb-16` leaves for exactly this — so it still reads as
          printing out from under the card.

          The mask is only rendered once settled, so the card is centred on its
          own while authorising and then eases down as the paper rises behind
          it. That movement is the shared-layout animation doing its job, not a
          jump: `layoutId` makes the card animate to its new place. */}
      {settled && (
        <div className="w-[320px] overflow-hidden pt-1.5 -mb-14">
          <Receipt receipt={receipt} preview={preview} />
        </div>
      )}

      <motion.div
        layoutId="payment-card"
        transition={SPRING.gentle}
        animate={{ scale: settled ? 0.97 : 1 }}
        style={{ zIndex: 10 }}
        className="pay-scene relative mb-10 h-[240px] w-full max-w-[420px] drop-shadow-[0_20px_40px_rgba(59,130,246,0.3)]"
      >
        {card}
        {settled ? <span className="pay-settled" /> : <span className="pay-radar" />}
      </motion.div>

      {settled ? (
        <motion.div
          key="settled"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: DURATION.slow, ease: EASE.out }}
          className="relative z-modal flex flex-col items-center text-center"
        >
          <SuccessTick />

          {/* THE HEADLINE IS THE LOUDEST CLAIM ON THE SCREEN, so in preview it
              is the one sentence that cannot be borrowed from the design. The
              tick, the receipt, the timing and the layout are all exactly as
              drawn — only the words change, because "Payment received" over a
              payment nobody received is the whole failure this mode is guarding
              against. One string, and it stops rendering when a gateway lands. */}
          <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">
            {preview ? "That is how payment will look" : "Payment received"}
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {preview ? (
              <>
                Nothing was charged and no card was used — card payment is not
                switched on yet.
              </>
            ) : (
              <>
                {receipt.amount} paid
                {receipt.lastFour ? ` with the card ending ${receipt.lastFour}` : ""}.
              </>
            )}
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
      </div>
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
function Receipt({
  receipt,
  preview,
}: {
  receipt: PaymentReceipt;
  preview: boolean;
}) {
  return (
    <motion.div
      // 100% of its own height, so the travel is correct whatever the paper
      // ends up containing. See the note on the mask above.
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      transition={{ delay: 0.1, type: "spring", stiffness: 70, damping: 15 }}
      className="pay-receipt relative w-full px-6 pb-16 pt-7 font-mono text-slate-800 shadow-[0_-10px_25px_rgba(0,0,0,0.1)]"
      style={{ background: "var(--pay-receipt-paper, #fdfdfd)" }}
    >
      <p className="text-center text-lg font-bold tracking-wider">ABIZON</p>
      <p className="mt-0.5 text-center text-[11px] tracking-wide text-slate-500">
        PAYMENT RECEIPT
      </p>

      {preview && (
        <p className="mt-2 border-y-2 border-slate-900 py-1 text-center text-[11px] font-bold tracking-wide text-slate-900">
          {PAYMENT_PREVIEW_RECEIPT_STAMP}
        </p>
      )}

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
