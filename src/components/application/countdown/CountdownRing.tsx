"use client";

/**
 * LAYER 2 — the progress ring.
 *
 * An SVG circle outside the capture aperture, filling clockwise from twelve
 * o'clock as the countdown runs.
 *
 * MEASURED FROM THE REFERENCE (image_video/2.mp4):
 *   colour  rgb(9,142,77) = #098E4D, sampled at the ring's peak
 *   radius  270.5px against a 233px capture-circle radius → 1.16×
 *   stroke  2px on a 466px diameter → 0.43% of diameter
 *   sweep   clockwise from 12 o'clock
 *
 * Everything is expressed as a ratio of the aperture rather than in pixels, so
 * the ring holds its proportions from a 390px phone to an 1800px desktop
 * instead of being right at exactly one size.
 *
 * PERFORMANCE (§14): the only animated property is `stroke-dashoffset`, which
 * is paint-only — no layout, no reflow. The rotation that puts 0° at the top is
 * a static transform, not an animation. Nothing here animates width, height,
 * top or left.
 *
 * The reference's ring advances in six irregular steps (0.40, 0.50, 0.60, 0.63,
 * 0.64s apart) because it is driven by a face-detection confidence counter.
 * This one is driven by the countdown clock, so it is smooth — see the note in
 * `lib/application/countdown.ts` for why that departure is deliberate.
 */

import { COUNTDOWN } from "@/lib/motion";

type CountdownRingProps = {
  /** 0 → 1. */
  progress: number;
  /** Diameter of the capture aperture, in px. Everything scales off this. */
  apertureSize: number;
};

export function CountdownRing({ progress, apertureSize }: CountdownRingProps) {
  const { ring, ringColor } = COUNTDOWN;

  /**
   * Everything in px, with the viewBox matching, so the numbers below are the
   * numbers on screen and the ratios can be checked by hand:
   *
   *   size    the SVG box, circumscribing the ring       = 1.16 × aperture
   *   stroke  0.43% of aperture diameter (2px at the reference's 466px)
   *   radius  (size − stroke) / 2, so the stroke's OUTER edge meets the box
   *           → 0.578 × aperture diameter = 1.156 × aperture radius ✓
   *
   * An earlier version mixed a fixed 200-unit viewBox with px sizing and landed
   * at 1.33 × instead of 1.16 × — visibly too far out. Keeping one unit system
   * makes that class of error impossible to write.
   */
  const size = apertureSize * ring.radiusRatio;
  // The reference's 2px stroke scales to ~1.1px on a 256px phone aperture,
  // which disappears on a 1x display. The floor keeps it a hairline rather
  // than nothing; above ~350px the measured ratio takes over.
  const stroke = Math.max(1.5, apertureSize * ring.strokeRatio);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      {/* -90° puts the start of the arc at twelve o'clock, matching the
          reference. Static — this is geometry, not motion. */}
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </g>
    </svg>
  );
}
