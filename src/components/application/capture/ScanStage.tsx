"use client";

/**
 * THE SCAN
 * ---------------------------------------------------------------------------
 * What the applicant watches while the passport they just supplied is read: the
 * page itself, washed green, a bar sweeping down it, a SCANNING pill — and then
 * labelled rectangles landing one by one on the fields that were found.
 *
 * ── Every rectangle is a real detection ──
 *
 * The first version of this screen drew a single box over the machine-readable
 * zone and listed the values beside the page, because the scanner returned
 * values with no coordinates and boxes over the printed fields would have been
 * an animation of something that did not happen.
 *
 * The scanner returns coordinates now. Once the MRZ has been read and its check
 * digits have passed, a second pass reads the printed page normally and looks
 * for the words matching the values already verified — so the box over
 * `Z1234567` is the word box OCR returned for that string, and the label on it
 * reads `Passport no` because the MRZ says that is what it is. Nothing is
 * placed by guesswork, and a value the page pass could not find gets no box at
 * all rather than an approximate one.
 *
 * ── Why they stagger ──
 *
 * They are not arriving one at a time; they arrive together. The stagger is
 * presentation, and it is honest presentation: it gives the eye time to read
 * the values it is about to be asked to check on the next screen, which is the
 * whole purpose of that screen. Five boxes appearing at once is a screen nobody
 * reads.
 */

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { FieldBox, ScanProgress } from "@/lib/passport/scan";

export type ScanStagePhase =
  | { kind: "scanning"; progress: ScanProgress | null }
  | {
      kind: "read";
      fields: Array<{ label: string; value: string }>;
      /** Where those values sit on the page. May be empty. */
      boxes: FieldBox[];
    }
  | { kind: "failed"; reason: string };

const PHASE_LABEL: Record<ScanProgress["phase"], string> = {
  starting: "Starting the reader",
  reading: "Reading the machine-readable zone",
  verifying: "Verifying the check digits",
  locating: "Finding the fields on the page",
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

  /** How many boxes, then how many list rows, have been revealed. */
  const revealed = useStaggeredCount(
    phase.kind === "read" ? Math.max(phase.boxes.length, phase.fields.length) : 0,
    300,
  );

  return (
    <div className="flex w-full flex-col items-center gap-7 lg:flex-row lg:items-start lg:justify-center lg:gap-10">
      <figure className="relative w-full max-w-[540px] overflow-hidden rounded-xl shadow-e3">
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
            document ticks — so it is the same promise, applied to a page. It
            drops back once the read is done so the boxes have something to
            stand out against. */}
        <div
          aria-hidden
          className={[
            "pointer-events-none absolute inset-0 transition-opacity duration-[--duration-slow] motion-reduce:transition-none",
            scanning ? "bg-success/25" : "bg-success/[0.07]",
          ].join(" ")}
        />

        {scanning && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1/3 animate-passport-scan-sweep bg-[linear-gradient(to_bottom,transparent,color-mix(in_oklab,var(--color-success)_45%,transparent))]"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-foreground/85 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-background backdrop-blur-sm">
                <Loader2 aria-hidden className="size-3 animate-spin" />
                Scanning
              </span>
            </div>
          </>
        )}

        {/* THE BOXES. Positioned in percentages of the image, so they hold
            wherever the figure ends up being drawn. */}
        {phase.kind === "read" &&
          phase.boxes.map((box, index) => (
            <span
              key={box.key}
              aria-hidden
              className={[
                "pointer-events-none absolute rounded-[3px] border-2 border-success bg-success/15",
                "transition-[opacity,transform] duration-[--duration-base] ease-out-back motion-reduce:transition-none",
                index < revealed ? "scale-100 opacity-100" : "scale-90 opacity-0",
              ].join(" ")}
              style={{
                // A little breathing room around the word, so the border sits
                // outside the glyphs rather than clipping their ascenders.
                left: `${Math.max(0, box.x * 100 - 1)}%`,
                top: `${Math.max(0, box.y * 100 - 1.5)}%`,
                width: `${box.width * 100 + 2}%`,
                height: `${box.height * 100 + 3}%`,
              }}
            >
              {/* Above the box, tight. A passport page shown at 480px puts its
                  printed fields at about 10px, so the label has to be smaller
                  than the thing it labels or it stops being an annotation and
                  becomes the content. */}
              <span className="absolute -top-[13px] left-0 whitespace-nowrap rounded-[2px] bg-success px-1 text-[8px] font-bold uppercase leading-[13px] tracking-[0.05em] text-white">
                {box.label}
              </span>
            </span>
          ))}
      </figure>

      <div className="w-full max-w-[280px]">
        {scanning && (
          <p role="status" className="font-mono text-[12px] text-muted-foreground">
            {phase.progress ? PHASE_LABEL[phase.progress.phase] : "Preparing"}
            {phase.progress?.phase === "reading" &&
              ` ${Math.round(phase.progress.percent)}%`}
          </p>
        )}

        {/* A READ THAT FOUND NOTHING.
            Reachable only from the back page, which has no machine-readable
            zone and on many designs carries a handwritten address and little
            else. The page WAS read; there was simply nothing on it in a shape
            the reader recognises, and saying so is different from saying the
            scan failed — the failure state offers "try another image", which
            here would send somebody to retake a photograph that was fine. */}
        {phase.kind === "read" && phase.fields.length === 0 && (
          <div className="rounded-xl border border-border bg-surface-sunken p-4">
            <p className="text-[14px] font-bold text-foreground">Page saved</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
              Nothing on this side needed reading — it is attached to your
              application as it is.
            </p>
          </div>
        )}

        {phase.kind === "read" && phase.fields.length > 0 && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-success">
              Read from the passport
            </p>
            <dl className="mt-3.5 space-y-3">
              {phase.fields.map((field, index) => (
                <div
                  key={field.label}
                  className={[
                    "flex items-start justify-between gap-4 border-b border-border pb-2.5",
                    "transition-[opacity,transform] duration-[--duration-base] ease-[--ease-out] motion-reduce:transition-none",
                    index < revealed
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1.5 opacity-0",
                  ].join(" ")}
                >
                  <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="flex items-center gap-1.5 text-right text-[13px] font-bold text-foreground">
                    {field.value || "—"}
                    <Check aria-hidden className="size-3 flex-shrink-0 text-success" />
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}

        {phase.kind === "failed" && (
          <div className="rounded-xl border border-border bg-surface-sunken p-4">
            <p className="text-[14px] font-bold text-foreground">
              We could not read this one
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
              {phase.reason} Try a clearer image, or type the details on the next
              screen.
            </p>
            <button
              type="button"
              onClick={onRetake}
              className="mt-3.5 inline-flex h-9 cursor-pointer items-center rounded-full border border-border-strong bg-surface px-4 text-[12px] font-bold text-foreground transition-colors hover:bg-surface-sunken"
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
