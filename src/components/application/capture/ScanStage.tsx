"use client";

/**
 * THE SCAN
 * ---------------------------------------------------------------------------
 * What the applicant watches while `BrowserMrzScanner` reads the passport they
 * just supplied: the page itself, washed green, a bar sweeping down it, a
 * SCANNING pill, and then the fields appearing one by one as they verify.
 *
 * ── The one liberty this does not take ──
 *
 * The reference draws labelled boxes over the passport — First Name, Date of
 * Birth, Passport No — each one framing the printed field it claims to have
 * read. It looks superb and we cannot honestly draw it: the scanner reads the
 * MACHINE-READABLE ZONE, the two lines of monospace across the foot of the
 * page, and it returns values with no coordinates. Boxes over the printed
 * fields would be an animation of a detection that did not happen, positioned
 * by guesswork on an image whose layout we have not measured.
 *
 * So the highlight sits on the MRZ band, which is where the data actually came
 * from, and the fields appear beside the page as they are confirmed. Same
 * choreography, same reveal, same green — pointed at the part of the document
 * the work was really done on.
 *
 * ── Why the fields stagger ──
 *
 * They are not arriving one at a time; the scan returns all six at once. The
 * stagger is presentation, and it is honest presentation: it gives the eye time
 * to read six values it is about to be asked to check, which is the entire
 * purpose of the screen that follows. A single flash of six fields is a screen
 * nobody reads.
 */

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { ScanProgress } from "@/lib/passport/scan";

export type ScanStagePhase =
  | { kind: "scanning"; progress: ScanProgress | null }
  | { kind: "read"; fields: Array<{ label: string; value: string }> }
  | { kind: "failed"; reason: string };

const PHASE_LABEL: Record<ScanProgress["phase"], string> = {
  starting: "Starting the reader",
  reading: "Reading the machine-readable zone",
  verifying: "Verifying the check digits",
};

export function ScanStage({
  imageUrl,
  phase,
  onRetake,
}: {
  imageUrl: string;
  phase: ScanStagePhase;
  onRetake: () => void;
}) {
  const scanning = phase.kind === "scanning";

  /**
   * How many confirmed fields have been revealed.
   *
   * Driven by a timer rather than by CSS `animation-delay` so that it survives
   * the list changing length, and so the reduced-motion path can skip straight
   * to the end instead of running six delays at 0.01ms and looking like a
   * glitch.
   */
  const revealed = useStaggeredCount(
    phase.kind === "read" ? phase.fields.length : 0,
    260,
  );

  return (
    <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center lg:gap-12">
      <figure className="relative w-full max-w-[560px] overflow-hidden rounded-2xl shadow-e3">
        {/* eslint-disable-next-line @next/next/no-img-element -- a blob: URL for
            a file the user chose seconds ago; there is nothing for the image
            optimiser to fetch or cache. */}
        <img
          src={imageUrl}
          alt="The passport page you supplied"
          className="block w-full"
        />

        {/* The wash. Green because that is the colour this product already uses
            for "checked and good" — the guarantee, the refund rows, the
            document ticks — so it is the same promise, applied to a page. */}
        <div
          aria-hidden
          className={[
            "pointer-events-none absolute inset-0 transition-opacity duration-[--duration-slow] motion-reduce:transition-none",
            scanning ? "bg-success/25 opacity-100" : "bg-success/10 opacity-100",
          ].join(" ")}
        />

        {scanning && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-passport-scan-sweep bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--color-success)_45%,transparent))]"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground/85 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-background backdrop-blur-sm">
                <Loader2 aria-hidden className="size-3 animate-spin" />
                Scanning
              </span>
            </div>
          </>
        )}

        {/* The MRZ band. Two lines of monospace across the foot of every
            passport data page, and the only region this scan actually reads —
            so it is the only region marked. */}
        {phase.kind === "read" && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[4%] bottom-[5%] h-[15%] rounded-md border-2 border-success bg-success/15"
          >
            <span className="absolute -top-6 left-0 rounded bg-success px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white">
              Machine-readable zone
            </span>
          </div>
        )}
      </figure>

      <div className="w-full max-w-[320px]">
        {scanning && (
          <p role="status" className="text-sm font-medium text-muted-foreground">
            {phase.progress ? PHASE_LABEL[phase.progress.phase] : "Preparing"}
            {phase.progress?.phase === "reading" &&
              ` — ${Math.round(phase.progress.percent)}%`}
          </p>
        )}

        {phase.kind === "read" && (
          <>
            <p className="text-2xs font-bold uppercase tracking-[0.08em] text-success">
              Read from the passport
            </p>
            <dl className="mt-4 space-y-3.5">
              {phase.fields.map((field, index) => (
                <div
                  key={field.label}
                  className={[
                    "flex items-start justify-between gap-4 border-b border-border pb-3",
                    "transition-[opacity,transform] duration-[--duration-base] ease-[--ease-out] motion-reduce:transition-none",
                    index < revealed
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1.5 opacity-0",
                  ].join(" ")}
                >
                  <dt className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="flex items-center gap-1.5 text-right text-sm font-bold text-foreground">
                    {field.value || "—"}
                    <Check aria-hidden className="size-3.5 flex-shrink-0 text-success" />
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {phase.kind === "failed" && (
          <div className="rounded-2xl border border-border bg-surface-sunken p-5">
            <p className="text-sm font-bold text-foreground">
              We could not read this one
            </p>
            <p className="mt-1.5 text-2xs leading-relaxed text-muted-foreground">
              {phase.reason} You can supply a clearer image, or carry on and
              type the details yourself on the next screen.
            </p>
            <button
              type="button"
              onClick={onRetake}
              className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-full border border-border-strong bg-surface px-5 text-2xs font-bold text-foreground transition-colors hover:bg-surface-sunken"
            >
              Try another image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Counts 0 → `total`, one step per `stepMs`. Returns `total` at once when the
 * OS asks for reduced motion.
 *
 * The tick count is the only stored value and it is written from the interval
 * alone — never from the effect body. What the caller gets is derived from it
 * at render, which is why there is no reset to write when `total` changes:
 * `Math.min` already clamps a tick count that ran past a shorter list, and a
 * list that grows simply reveals its new rows on the following ticks.
 */
function useStaggeredCount(total: number, stepMs: number): number {
  const [ticks, setTicks] = useState(0);

  // Read once, at mount. This component only ever renders on the client — the
  // apply route is behind a Suspense boundary that renders its fallback on the
  // server — so there is no server value for this to disagree with.
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (total === 0 || reduced) return;
    const id = setInterval(() => setTicks((value) => value + 1), stepMs);
    return () => clearInterval(id);
  }, [total, stepMs, reduced]);

  if (reduced) return total;
  return Math.min(total, ticks);
}
