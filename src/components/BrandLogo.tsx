/**
 * THE ABIZON MARK, AND THE LOCKUP IT SITS IN.
 *
 * ── What was here before ──
 *
 * Five hand-copied `<svg>` blocks — site header, footer (twice), profile
 * header, login header — each drawing the same three strokes: an outlined
 * triangle, a crossbar, and a short tick hanging off the apex. They drifted in
 * the way copies always do (stroke width 8 in four places and 10 in the fifth,
 * `text-black` in two and `text-foreground` in the others), and the shape
 * itself was the problem rather than the duplication: a hairline outline reads
 * as a wireframe at 32px, the third stroke was a stray the eye reads as damage,
 * and the whole thing was drawn in the text colour, so the brand's own yellow
 * appeared nowhere in its own logo.
 *
 * ── What it is now ──
 *
 * One solid triangle with an "A" counter cut out of it, in the brand yellow,
 * with the corners rounded hard. Three decisions, each load-bearing:
 *
 *   solid, not outline   A filled shape holds its colour at 20px. An 8-unit
 *                        stroke on a 100-unit viewBox is 1.6px at 20px and
 *                        turns into a grey suggestion of a triangle.
 *   the counter          It makes the mark a letter as well as a shape, which
 *                        is what lets it stand alone — as the favicon, as the
 *                        avatar in a receipt, as the footer credit — without
 *                        the word beside it.
 *   rounded joins        The corners are the entire difference between a
 *                        geometric mark and a road sign.
 *
 * ── How the rounding is done, since the path looks wrong on its own ──
 *
 * There is no arc in the path data. The shape is a two-subpath triangle
 * (`fill-rule: evenodd`, so the second subpath is a hole) painted with a fill
 * AND a same-coloured 13-unit stroke with `stroke-linejoin: round`. A stroke
 * straddles its path, so it does three things at once: it grows the outer
 * triangle by 6.5 units, it shrinks the counter by the same 6.5, and it rounds
 * every corner of both. Writing those curves out by hand would be twelve
 * arc commands that no one could edit afterwards.
 *
 * The consequence to remember when tuning it: the numbers in `d` are the
 * SKELETON, not the silhouette. The drawn triangle runs from y≈10 to y≈89.5,
 * not the 23→83 the path says, and the counter comes out ~26 units tall
 * against the 46 its own subpath describes, because the stroke eats 6.5 off
 * every edge of it. Change `strokeWidth` and both move — in opposite
 * directions, which is why the first draft's counter shrank to a slot and the
 * whole mark read as a warning sign rather than a letter.
 *
 * ── Colour ──
 *
 * `--color-wordmark`, the same token the word is set in, because they are one
 * mark. Not `--color-primary`: that is amber-700, shifted dark so body text
 * and filled CTAs clear 4.5:1, and at that step the amber has gone brown. The
 * logo is a non-text graphic with an accessible name on the link around it, so
 * the applicable bar is 3:1 and the brand yellow clears it.
 *
 * `tone="current"` exists for the one place the mark must not be yellow: any
 * context that has already committed to a colour (a dark receipt header, a
 * monochrome print). It inherits `currentColor` and changes nothing else.
 */

import { cn } from "@/lib/utils";
import { Wordmark } from "@/components/Wordmark";

/**
 * The skeleton. Outer triangle, then the counter as a second subpath.
 *
 * Both are wound the same direction; `fill-rule="evenodd"` is what makes the
 * inner one a hole rather than an overpaint, so the winding does not matter and
 * the path stays readable.
 */
const MARK_PATH = "M50 23 L86 83 L14 83 Z M50 36 L76 82 L24 82 Z";

type MarkTone = "brand" | "current";

export function BrandMark({
  tone = "brand",
  className,
}: {
  tone?: MarkTone;
  className?: string;
}) {
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
      <path
        d={MARK_PATH}
        fill="currentColor"
        fillRule="evenodd"
        stroke="currentColor"
        strokeWidth={13}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Mark plus word, as one link-able unit.
 *
 * ── The word is back at the size it always was ──
 *
 * A first pass set it one step DOWN from the mark, on the argument that a mark
 * which is never the loudest element never becomes recognisable alone. The
 * product owner asked for the original size back, and they are right on the
 * facts: the wordmark had been 20px since the site was built, the reference
 * sets its own at the same weight, and shrinking it was solving a problem
 * nobody had reported.
 *
 * What the mark gained instead is being a solid shape rather than a hairline
 * outline, which is what actually made it legible at 32px — that change did the
 * work, and the size change was riding along with it.
 *
 * The numbers below are the ones each call site carried before `BrandLogo`
 * existed: a 32px mark beside a 20px word, stepping to 22px on desktop, and a
 * 20px mark beside a 12px word for the footer's legal-bar credit. They are
 * fixed per size rather than left to callers, because "small" is the only
 * instruction a call site should have to give.
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
  /** Colour of the triangle. */
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
