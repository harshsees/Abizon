"use client";

/**
 * THE ABIZON MARK, AND THE LOCKUP IT SITS IN.
 *
 * ── What this replaces ──
 *
 * First, five hand-copied `<svg>` blocks — site header, footer (twice), profile
 * header, login header — each drawing an outlined triangle, a crossbar and a
 * short tick hanging off the apex. They drifted in the way copies always do
 * (stroke width 8 in four places and 10 in the fifth), and a hairline outline
 * reads as a wireframe at 32px.
 *
 * Then a solid amber triangle with an "A" counter cut out of it. That fixed the
 * legibility and was rejected on sight: too heavy, and the yellow was the
 * problem rather than the fix.
 *
 * ── What it is now: a peak on a horizon ──
 *
 * `abizon` ends in `zon`, and a horizon is the one idea a company that sends
 * people abroad can claim without reaching for ornament. So the mark is two
 * elements and no more: a folded peak, and a rule that runs past it on both
 * sides. Nothing here is decoration — remove either piece and there is no mark
 * left.
 *
 * ── What was taken from the reference, and what was not ──
 *
 * The reference supplied (`image_video/logo.PNG`) is another brand's emblem
 * entirely: a faceted rosette inside a broken ring, over Devanagari
 * calligraphy. Copying its shapes would be copying somebody's logo. What is
 * borrowed is its TREATMENT, which is the part that made it read as premium:
 *
 *   monochrome     one ink. No gradient, no second colour.
 *   faceted        the emblem is not a flat silhouette; it is planes meeting at
 *                  a seam, so it reads as an object with a fold in it.
 *   air            the drawing occupies far less of its box than it could.
 *
 * The enclosing ring was drawn and tried alongside this. It thins to a hairline
 * at 32px — the size the mark actually lives at in the header — and is the one
 * element that asks more of the small size than it gives back. It is not here.
 *
 * ── Black, and why through a token ──
 *
 * `--color-wordmark` resolves to the foreground now rather than to amber-600.
 * Going through the token rather than hard-coding a hex means the mark tracks
 * the theme's ink: it is the same black the headings are set in, not a second
 * black that drifts from them by a few points of lightness.
 *
 * ── Why this file is a client component ──
 *
 * `useId`. The facet is a clip, clips are referenced by id, and most routes
 * render two logos — header and footer — so a fixed id would have both resolve
 * `url(#facet)` to whichever appeared first in the document. Working while
 * there is one instance and breaking silently when a second arrives is the
 * worst failure available, so the id is per-instance and stable across
 * hydration.
 */

import { useId } from "react";

import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/Wordmark";

/**
 * The peak, rounded by the same stroke trick the old triangle used: a fill AND
 * a same-coloured stroke with a round join, so every corner is curved without a
 * single arc command in the path.
 *
 * As before, these numbers are the SKELETON and not the silhouette. An 11-unit
 * stroke grows the shape 5.5 units in every direction, so the drawn peak runs
 * from y≈20 to y≈75, not the 26→70 written here. Change the stroke and the
 * whole thing moves.
 */
const PEAK = "M50 26 L78 70 L22 70 Z";
const PEAK_STROKE = 11;

/**
 * The horizon.
 *
 * Deliberately wider than the peak on both sides. A rule that stopped at the
 * peak's feet would read as an underline, and one that stopped short of them
 * would read as a shadow; running past on both sides is what makes it a line
 * the peak is standing on.
 */
const HORIZON = "M6 80 L94 80";

type MarkTone = "brand" | "current";

export function BrandMark({
  tone = "brand",
  className,
}: {
  tone?: MarkTone;
  className?: string;
}) {
  const facetId = `${useId()}-facet`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={cn(
        "flex-shrink-0",
        tone === "brand" ? "text-wordmark" : "text-current",
        className,
      )}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* The clip is the peak itself, drawn with the same stroke, so the
            lightened plane below can be a plain rectangle and still stop
            exactly at the peak's rounded edge. */}
        <clipPath id={facetId}>
          <path
            d={PEAK}
            stroke="#000"
            strokeWidth={PEAK_STROKE}
            strokeLinejoin="round"
          />
        </clipPath>
      </defs>

      <path
        d={PEAK}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={PEAK_STROKE}
        strokeLinejoin="round"
      />

      {/* THE FOLD.
          White at 18% rather than a second colour, so it lightens whatever ink
          the mark is currently set in — the facet therefore survives
          `tone="current"` on a dark surface and needs no palette of its own.
          A hairline seam was tried instead: at 32px it is 0.8px and aliases
          into nothing, which is why the fold is a plane and not a line. */}
      <g clipPath={`url(#${facetId})`}>
        <path d="M50 0 L50 100 L0 100 L0 0 Z" fill="#FFFFFF" opacity={0.18} />
      </g>

      <path
        d={HORIZON}
        stroke="currentColor"
        strokeWidth={5}
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Mark plus word, as one link-able unit.
 *
 * The word is at the size it has always been — 20px, stepping to 22px on
 * desktop — after a pass that shrank it was reverted. The numbers below are the
 * ones each call site carried before this component existed, and they are fixed
 * per size rather than left to callers, because "small" is the only instruction
 * a call site should have to give.
 */
const SIZES = {
  /** The footer's legal-bar credit, and nothing else. */
  sm: { mark: "size-5", word: "text-xs", gap: "gap-1.5" },
  /** Site header, footer brand, profile header, login header. */
  md: { mark: "size-7 md:size-8", word: "text-xl md:text-[1.375rem]", gap: "gap-2" },
  lg: { mark: "size-10", word: "text-3xl", gap: "gap-2.5" },
} as const;

export function BrandLogo({
  size = "md",
  tone = "brand",
  wordTone,
  className,
}: {
  size?: keyof typeof SIZES;
  /** Colour of the mark. */
  tone?: MarkTone;
  /** Colour of the word, if it must differ — the footer's legal-bar credit. */
  wordTone?: "brand" | "muted";
  className?: string;
}) {
  const scale = SIZES[size];

  return (
    <span className={cn("inline-flex items-center", scale.gap, className)}>
      <BrandMark tone={tone} className={scale.mark} />
      <Wordmark tone={wordTone ?? "brand"} className={scale.word} />
    </span>
  );
}
