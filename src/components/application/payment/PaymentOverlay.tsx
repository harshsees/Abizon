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
 *   authorising  the contactless mark ripples and a warm halo breathes against
 *                the card edge. No progress bar: nobody knows how long an
 *                acquirer will take, and a bar that fills at a made-up rate is
 *                a claim about a duration this code cannot know.
 *   settled      the halo turns green and holds, and a terminal beneath the
 *                card feeds out the receipt.
 *
 * ── THE TWO THINGS THE REFERENCE MATERIAL CHANGED HERE ──
 *
 * THE HALO, from `payment-ui/screen-20260829-140424.mp4`. What was a blue ring
 * pulsing outward — a spinner drawn as a shadow — is now the recording's warm
 * halo while waiting and green the moment it settles. The colour carries the
 * outcome, which the blue ring never did: blue is the colour of every resting
 * surface in this app.
 *
 * THE RECEIPT, from `reciept-ui/`. What was a paper rectangle rising from
 * below the fold is now a thermal dispenser feeding paper downward out of a
 * slot. See `ReceiptPrinter` for why that is a better idea than the sliding
 * rectangle and not merely a more elaborate one.
 *
 * THE RECEIPT IS A RECORD, NOT DECORATION. Every figure on it comes from the
 * summary model and the card fields — there is no placeholder amount and no
 * invented reference number. It shows what was charged, to which card, for
 * which destination, broken into the same fee components the price aside
 * shows, and nothing it cannot source.
 *
 * THE PREVIEW STAMP HAS BEEN REMOVED at the product owner's request, along
 * with the banner that used to sit above the form. `preview` is still threaded
 * through this component and still softens the headline — "That is how payment
 * will look" rather than "Payment received", which is the one claim on the
 * screen that would be false — but nothing is printed across the receipt any
 * more.
 *
 * `PAYMENT_PREVIEW_RECEIPT_STAMP` still exists in `paymentConfig.ts`, is still
 * argued for in that file's header, and is still checked by
 * `paymentConfig.test.ts` for wording. Putting the stamp back is rendering one
 * constant in one place; nothing here was rebuilt around its absence.
 *
 * ── THE ORDER OF THE COMPOSITION, AND WHY THE CARD STAYS PUT ──
 *
 * Card, then printer, then caption. That is the order the events happened in:
 * this card was charged — the halo says so without a word — and here is the
 * paper record of it coming out of the machine. Putting the printer above the
 * card was tried and reads backwards, as though the receipt produced the
 * payment.
 *
 * The card is the FIRST child in both phases and is never moved into another
 * parent. It is a `layoutId` element mid-flight from the form, and re-parenting
 * one is the case shared-layout animation handles least well; keeping its
 * position in the tree fixed means the only thing that changes between phases
 * is what is rendered after it.
 *
 * EVERYTHING IS IN NORMAL FLOW. Three earlier attempts positioned the paper
 * absolutely — anchored to the viewport centre, then to the card's box — and
 * every one of them clipped, because an absolutely positioned element
 * contributes no height, so the flex centring had no idea the paper was there
 * and happily pushed 200-400px of it off the top of the screen. In flow, the
 * printer reserves its own height and the column centres around the whole
 * composition. Section 9 of `globals.css` scales the stage down on a short
 * viewport rather than cropping it, and the overlay scrolls beneath that.
 */

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { DURATION, EASE, SPRING } from "@/lib/motion";

import { ReceiptPrinter, type ReceiptDocument } from "./ReceiptPrinter";

export type { ReceiptLine } from "./ReceiptPrinter";

/** What the paper prints. The overlay does no arithmetic and no formatting. */
export type PaymentReceipt = ReceiptDocument;

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
  /** No acquirer answered. Softens the headline. */
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
      className="fixed inset-0 z-modal flex flex-col items-center justify-center overflow-y-auto bg-background/95 px-5 py-10 backdrop-blur-md"
    >
      <div className="pay-stage flex w-full flex-col items-center">
        {/* THE CARD, first in both phases. See the header. */}
        <motion.div
          layoutId="payment-card"
          transition={SPRING.gentle}
          animate={{ scale: settled ? 0.88 : 1 }}
          style={{ zIndex: 10 }}
          className="pay-scene relative h-[240px] w-full max-w-[420px]"
        >
          {card}
          <span className="pay-glow" data-state={phase} />
        </motion.div>

        {settled ? (
          <motion.div
            key="settled"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: DURATION.slow, ease: EASE.out }}
            className="mt-10 w-[340px]"
          >
            <ReceiptPrinter
              document={receipt}
              title={preview ? "That is how payment will look" : "Payment received"}
              subtitle={
                preview ? (
                  <>
                    Nothing was charged and no card was used — card payment is
                    not switched on yet.
                  </>
                ) : (
                  <>
                    {receipt.amount} paid
                    {receipt.lastFour
                      ? ` with the card ending ${receipt.lastFour}`
                      : ""}
                    .
                  </>
                )
              }
              action={
                <button
                  type="button"
                  onClick={onDone}
                  autoFocus
                  className="inline-flex h-12 cursor-pointer items-center rounded-full bg-foreground px-7 text-sm font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-subtle-foreground active:scale-[0.98] motion-reduce:transform-none"
                >
                  {doneLabel}
                </button>
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="authorising"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION.base, ease: EASE.out }}
            role="status"
            className="mt-10 flex flex-col items-center text-center"
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
