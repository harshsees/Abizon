"use client";

/**
 * LAYER 3 — the numeral.
 *
 * WHAT THE REFERENCE ACTUALLY DOES, and why this looks so plain:
 *
 * The numerals do not animate. Measured frame by frame from
 * `image_video/2.mp4` at 30fps:
 *
 *   - 3 → 2 and 2 → 1 are SINGLE-FRAME cuts. Verified at four brightness
 *     thresholds at once (120/160/200/240): frame 207 → 208 goes from 666 to
 *     2667 white pixels at every threshold simultaneously. A cross-fade would
 *     make the low threshold lead the high one by several frames. It does not.
 *   - Cap height is 75 / 74 / 73px for 3 / 2 / 1. That 2px spread is the
 *     overshoot on the curved glyphs, not a scale animation.
 *   - Opacity is pinned: the peak channel reads 255 in every frame.
 *   - Position is fixed; centroid drift is glyph shape alone.
 *
 * So: constant size, constant opacity, hard cut, dead centre.
 *
 * This is a deliberate conflict with Phase 5C §4 ("should not be three numbers
 * fading in and out") and §5 ("the incoming number should not simply appear").
 * The reference does exactly what those clauses warn against. §1, §2 and §9 say
 * the recording is authoritative and that nothing absent from it may be added,
 * so the recording wins and no scale, blur, travel or rotation is invented.
 *
 * `AnimatePresence` is still used, and §5's engineering point is still honoured:
 * the outgoing numeral leaves through a real exit rather than being torn out of
 * the tree mid-frame. The dissolve is 80ms — 2.4 frames at 30fps, below what
 * the source could have resolved, so it cannot be told apart from the hard cut
 * while still guaranteeing the exit completes.
 *
 * Size is a ratio of the aperture (23% of diameter, from cap height 75px ÷ 0.70
 * em ÷ 466px) so the numeral holds its proportion at every breakpoint.
 */

import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";

import { COUNTDOWN, EASE } from "@/lib/motion";

type CountdownNumeralProps = {
  digit: number | null;
  apertureSize: number;
};

/**
 * Memoised (§14). The clock ticks at 60fps to drive the ring, but the numeral
 * changes three times in the whole run — without this it would re-render ~234
 * times to display the same character.
 */
export const CountdownNumeral = memo(function CountdownNumeral({
  digit,
  apertureSize,
}: CountdownNumeralProps) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {/* `mode="wait"` would leave a gap between numerals; the reference has
          none, so the two overlap for the length of the dissolve. */}
      <AnimatePresence initial={false}>
        {digit !== null && (
          <motion.span
            key={digit}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: COUNTDOWN.swap, ease: EASE.out }}
            className="absolute font-black leading-none text-white"
            style={{
              fontSize: apertureSize * COUNTDOWN.numeralSizeRatio,
              // The reference sets the numeral straight over the video with no
              // plate or scrim behind it. A faint shadow is the only thing
              // keeping it legible against a light face, and the reference has
              // one too — it is not a glow effect.
              textShadow: "0 2px 12px rgb(0 0 0 / 0.35)",
            }}
          >
            {digit}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
});
