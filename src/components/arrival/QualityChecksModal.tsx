"use client";

/**
 * THE CHECKING DIALOG.
 * ---------------------------------------------------------------------------
 * Reproduces the reference recording's composition — dark backdrop, a square
 * white panel, a pale document mark, a bold centred title, and a checklist
 * that fills in as the work completes — and changes every word of it.
 *
 * ── Why the wording is different ──
 *
 * The reference shows "Checking global security databases" and "Identifying
 * any travel restrictions" while a passport uploads. Abizon has no connection
 * to any security database and no travel-restriction feed; a flow that said
 * those lines would be telling a traveller their passport had been screened
 * when it had been read by an OCR engine in their own browser. So the panel
 * keeps the pattern and states the three things that actually happen:
 *
 *   Starting the reader                    the engine is several megabytes and
 *                                          genuinely takes a moment
 *   Reading the machine-readable zone      real OCR, real percentage
 *   Verifying the check digits             the MRZ's own checksums
 *
 * Each line is driven by `ScanProgress` from the scanner itself rather than a
 * timer, so a line marked done is done and a slow phone shows a slow read
 * instead of a fiction that finishes on schedule. §47 of the brief asks for
 * exactly this: no invented delay standing in for work.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, Check, IdCard } from "lucide-react";
import { useMemo } from "react";
import { createPortal } from "react-dom";

import { useModal } from "@/components/ui/modal";
import { DURATION, EASE, SPRING } from "@/lib/motion";
import type { ScanOutcome, ScanProgress } from "@/lib/passport/scan";
import { cn } from "@/lib/utils";

export const CHECK_STEPS = [
  { key: "start", label: "Starting the reader" },
  { key: "read", label: "Reading the machine-readable zone" },
  { key: "verify", label: "Verifying the check digits" },
] as const;

type StepState = "waiting" | "active" | "done" | "stopped";

/** Which of the three the scanner had reached when `progress` was reported. */
function stepReached(progress: ScanProgress | null): number {
  // `null` means the file was accepted but the first callback has not landed
  // yet, which is still step one.
  if (progress === null || progress.phase === "starting") return 0;
  return progress.phase === "reading" ? 1 : 2;
}

function stepStateAt(
  progress: ScanProgress | null,
  index: number,
  settled: "running" | "done" | "failed",
): StepState {
  if (settled === "done") return "done";

  const reached = stepReached(progress);
  if (index < reached) return "done";

  // A run that failed did not finish the step it was on, and it is no longer
  // working on it either. Freezing it — rather than leaving a ring spinning
  // under a title saying the read failed — is the difference between "still
  // going" and "stopped here", which is the one thing the list has to say.
  if (index === reached) return settled === "failed" ? "stopped" : "active";
  return "waiting";
}

/** The ring that spins while a step runs, and fills when it lands. */
function StepMark({ state, reduced }: { state: StepState; reduced: boolean }) {
  if (state === "done") {
    return (
      <motion.span
        initial={reduced ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={reduced ? { duration: 0 } : SPRING.snappy}
        className="grid size-[18px] shrink-0 place-items-center rounded-full bg-success"
      >
        <Check aria-hidden className="size-3 text-white" strokeWidth={3} />
      </motion.span>
    );
  }

  return (
    <span
      className={cn(
        "size-[18px] shrink-0 rounded-full border-2",
        state === "active" &&
          "animate-spin border-success/25 border-t-success [animation-duration:0.9s] motion-reduce:animate-none",
        state === "stopped" && "border-border-strong",
        state === "waiting" && "border-border-strong/70",
      )}
    />
  );
}

export type QualityChecksState =
  | { phase: "scanning"; progress: ScanProgress | null }
  /**
   * `progress` is the last thing the scanner reported before it stopped, so a
   * settled panel can show how far the run actually got. Carried on the state
   * rather than remembered in here: the value belongs to the scan, and the
   * component that ran it is the one that knows it.
   */
  | { phase: "settled"; outcome: ScanOutcome; progress: ScanProgress | null };

export function QualityChecksModal({
  open,
  state,
  filledCount,
  onClose,
  onRetry,
  onEnterManually,
}: {
  open: boolean;
  state: QualityChecksState;
  /** How many fields the scan actually wrote. Reported, never rounded up. */
  filledCount: number;
  onClose: () => void;
  onRetry: () => void;
  onEnterManually: () => void;
}) {
  const reduced = useReducedMotion();
  const scanning = state.phase === "scanning";

  // While the scan runs the dialog cannot be dismissed by accident: the engine
  // is mid-file and a stray backdrop click would lose the work with nothing to
  // show for it. Once it settles, both routes out are open.
  const { target, titleId, descriptionId, overlayProps, panelProps } = useModal({
    open,
    onClose,
    closeOnEscape: !scanning,
    closeOnBackdrop: !scanning,
  });

  const variants = useMemo(() => {
    if (reduced) {
      const instant = {
        closed: { opacity: 0 },
        open: { opacity: 1, transition: { duration: 0 } },
        gone: { opacity: 0, transition: { duration: 0 } },
      };
      return { backdrop: instant, panel: instant };
    }
    return {
      backdrop: {
        closed: { opacity: 0 },
        open: { opacity: 1, transition: { duration: DURATION.base, ease: EASE.out } },
        gone: { opacity: 0, transition: { duration: DURATION.exit, ease: EASE.in } },
      },
      panel: {
        closed: { opacity: 0, scale: 0.96, y: 10 },
        open: { opacity: 1, scale: 1, y: 0, transition: SPRING.snappy },
        gone: {
          opacity: 0,
          scale: 0.98,
          y: 6,
          transition: { duration: DURATION.exit, ease: EASE.in },
        },
      },
    };
  }, [reduced]);

  if (!target) return null;

  const outcome = state.phase === "settled" ? state.outcome : null;
  const failed = outcome !== null && outcome.status !== "verified";

  const title = scanning
    ? "Reading your passport"
    : outcome?.status === "verified"
      ? "Passport read"
      : outcome?.status === "unverified"
        ? "That read did not check out"
        : "Could not read this image";

  const description = scanning
    ? "This runs in your browser. The image is not uploaded."
    : outcome?.status === "verified"
      ? filledCount === 1
        ? "One field was filled in. Check it against your passport before you submit."
        : `${filledCount} fields were filled in. Check them against your passport before you submit.`
      : outcome?.status === "unverified"
        ? // Naming the field matters: a checksum failure means at least one
          // character is wrong and we cannot tell which of the rest to trust,
          // so nothing is filled. Saying which one failed is the difference
          // between "try again" and knowing what to look at.
          `The ${formatList(outcome.failed)} did not match ${
            outcome.failed.length === 1 ? "its" : "their"
          } check ${outcome.failed.length === 1 ? "digit" : "digits"}, so nothing was filled in. ` +
          "A sharper photo of the two lines at the bottom of the page usually fixes it."
        : "No machine-readable zone was found. Photograph the whole photo page, including the two lines of " +
          "letters and chevrons along the bottom, with no glare.";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="quality-checks"
          {...overlayProps}
          initial="closed"
          animate="open"
          exit="gone"
          variants={{ closed: {}, open: {}, gone: {} }}
          className="fixed inset-0 z-modal grid place-items-center p-4 sm:p-6"
        >
          {/* The reference's backdrop is a flat dim, not a blur: the form
              behind stays legible enough to read as the thing being worked
              on. */}
          <motion.div
            aria-hidden="true"
            variants={variants.backdrop}
            style={{ touchAction: "none" }}
            className="absolute inset-0 bg-black/60"
          />

          <motion.div
            {...panelProps}
            aria-describedby={descriptionId}
            variants={variants.panel}
            className={cn(
              "relative flex w-full max-w-[26rem] flex-col items-center overflow-hidden text-center outline-none",
              "rounded-[1.75rem] bg-surface px-7 py-10 shadow-e5 sm:px-9",
              // The reference panel is close to square. Held on desktop, let
              // go on a phone where a 450px-tall box with four lines in it is
              // mostly empty and pushes the actions off screen.
              "sm:min-h-[25rem] sm:justify-center",
            )}
          >
            <IdCard
              aria-hidden
              strokeWidth={1.25}
              className="size-16 text-border-strong"
            />

            <h2
              id={titleId}
              className="mt-6 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
            >
              {title}
            </h2>

            <p
              id={descriptionId}
              className="mt-2.5 max-w-[38ch] text-2xs leading-relaxed text-muted-foreground"
            >
              {description}
            </p>

            {/* Progress is announced rather than only drawn: a screen-reader
                user gets the same three beats a sighted one does. */}
            <ol
              aria-live="polite"
              aria-atomic="false"
              className="mt-7 flex w-full flex-col gap-3 text-left"
            >
              {CHECK_STEPS.map((step, index) => {
                // Drawn from the last report the scanner made, which is how
                // far it actually got before it finished or gave up.
                const stepState = stepStateAt(
                  state.progress,
                  index,
                  state.phase === "scanning" ? "running" : failed ? "failed" : "done",
                );

                const percent =
                  step.key === "read" &&
                  state.phase === "scanning" &&
                  state.progress?.phase === "reading"
                    ? state.progress.percent
                    : null;

                return (
                  <motion.li
                    key={step.key}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: DURATION.base, ease: EASE.out, delay: index * 0.06 }
                    }
                    className="flex items-center gap-3"
                  >
                    <StepMark state={stepState} reduced={Boolean(reduced)} />
                    <span
                      className={cn(
                        "text-sm leading-snug",
                        stepState === "waiting"
                          ? "text-muted-foreground"
                          : "font-medium text-foreground",
                      )}
                    >
                      {step.label}
                      {percent !== null && (
                        <span data-numeric className="ml-1.5 text-muted-foreground">
                          {percent}%
                        </span>
                      )}
                    </span>
                  </motion.li>
                );
              })}
            </ol>

            {/* §52: never trap the traveller. A failed read offers another go
                and a way past it; a good one gets out of the way. */}
            {state.phase === "settled" && (
              <div className="mt-8 flex w-full flex-col gap-2.5">
                {failed ? (
                  <>
                    <button
                      type="button"
                      onClick={onRetry}
                      className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-foreground px-6 text-sm font-bold text-background transition-colors hover:bg-subtle-foreground"
                    >
                      Try another photo
                    </button>
                    <button
                      type="button"
                      onClick={onEnterManually}
                      className="flex h-11 w-full cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface px-6 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
                    >
                      Enter details manually
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-12 w-full cursor-pointer items-center justify-center rounded-full bg-foreground px-6 text-sm font-bold text-background transition-colors hover:bg-subtle-foreground"
                  >
                    Check the details
                  </button>
                )}
              </div>
            )}

            {failed && (
              <p className="mt-4 flex items-start gap-2 text-left text-[11px] leading-relaxed text-muted-foreground">
                <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
                <span>
                  Nothing was filled in from a read that failed its own checks —
                  a wrong passport number you believe was scanned is worse than
                  an empty field.
                </span>
              </p>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    target,
  );
}

/** "passport number and date of birth", not "passport number,date of birth". */
function formatList(items: readonly string[]): string {
  if (items.length === 0) return "read";
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
