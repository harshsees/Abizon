"use client";

/**
 * THE SWEEP — capture → preview.
 *
 * MEASURED FROM THE REFERENCE (`image_video/2.mp4`, 30fps). A bright green
 * line crosses the aperture top to bottom:
 *
 *   pass 1   f386 (12.87s) y=-155  →  f416 (13.87s) y=+223   378px in 1.00s
 *   pass 2   f446 (14.87s) y=-174  →  f488 (16.27s) y=+223   397px in 1.40s
 *   colour   peak rgb(20,255,43); the softer halo around rgb(70,250,90)
 *
 * So: a full-height pass in roughly 1.2s. `SWEEP_SECONDS` takes the midpoint.
 *
 * WHAT IS DELIBERATELY NOT REPRODUCED, and why. In the reference the sweep
 * repeats for ~3.9 seconds under a pill reading "SCANNING" before the preview
 * appears. Nothing in this project scans anything — there is no OCR, no MRZ
 * reader, no classifier (see `lib/application/passport.ts`). Holding a user for
 * four seconds under a label claiming analysis would be a fake backend, which
 * §29 forbids and §4 names explicitly. So this runs ONE pass, as the transition
 * between the shutter and the preview, and nothing on screen says "scanning",
 * "detected" or "verified".
 *
 * PERFORMANCE (§18/§26): the only animated property is `transform: translateY`,
 * which composites on the GPU. No width, height, top or left. The gradient is
 * static and painted once.
 */

import { motion, useReducedMotion } from "framer-motion";

import { EASE } from "@/lib/motion";

/** Seconds for one top-to-bottom pass. Midpoint of the two measured passes. */
export const SWEEP_SECONDS = 1.2;

export function ScanSweep({ onDone }: { onDone?: () => void }) {
  const reduced = useReducedMotion();

  // Under reduced motion the travelling line is exactly the thing being opted
  // out of, so the transition collapses to a single short flash of the same
  // colour — the state change stays perceivable without anything moving.
  if (reduced) {
    return (
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.35, 0] }}
        transition={{ duration: 0.3, times: [0, 0.4, 1] }}
        onAnimationComplete={onDone}
        className="pointer-events-none absolute inset-0 z-raised bg-success"
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-raised overflow-hidden">
      <motion.div
        aria-hidden
        initial={{ y: "-12%" }}
        animate={{ y: "112%" }}
        transition={{ duration: SWEEP_SECONDS, ease: EASE.inOut }}
        onAnimationComplete={onDone}
        className="absolute inset-x-0 h-[14%]"
        style={{
          // Core line plus halo, in the measured greens. One static gradient —
          // only the element's transform changes.
          background:
            "linear-gradient(to bottom, rgb(20 255 43 / 0) 0%, rgb(70 250 90 / 0.28) 42%, rgb(20 255 43 / 0.95) 50%, rgb(70 250 90 / 0.28) 58%, rgb(20 255 43 / 0) 100%)",
        }}
      />
    </div>
  );
}
