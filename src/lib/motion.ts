/**
 * KEYRISE MOTION SYSTEM
 * ---------------------------------------------------------------------------
 * The JS counterpart to the `--duration-*` / `--ease-*` tokens in globals.css.
 * Both halves must agree, or a CSS hover and a Framer entrance on the same
 * element will disagree by a few frames and read as sloppy.
 *
 * House style, borrowed from Linear / Vercel / Framer:
 *
 *   1. FAST. Premium reads as confident, not slow. UI motion lives in
 *      150–350ms. Nothing an operator waits on exceeds 400ms.
 *   2. SHORT TRAVEL. 8–24px. Long slides (the 50px this app used) look
 *      cheap and cost a frame budget in overdraw.
 *   3. TRANSFORM + OPACITY ONLY. Both composite on the GPU. Animating
 *      width/height/top/left forces layout on every frame.
 *   4. SPRINGS FOR INPUT, CURVES FOR ENTRANCES. Anything the user directly
 *      manipulates gets a spring so it can be interrupted mid-flight;
 *      scripted entrances get a decisive ease-out.
 *   5. EXITS ARE ~65% OF ENTRANCES. Leaving should feel quicker than
 *      arriving.
 */

import type { Transition, Variants } from "framer-motion";

/** Seconds, mirroring `--duration-*`. Framer takes seconds; CSS takes ms. */
export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  base: 0.22,
  slow: 0.32,
  exit: 0.14,
  /**
   * The live-capture countdown, mirroring `--duration-countdown`.
   *
   * CORRECTED IN PHASE 5C. Phase 1 declared this as 3.0s from an eyeballed
   * reading of the reference recording, with a note claiming "the numeral
   * swaps every ~1.05s". Frame-by-frame measurement of that recording
   * (image_video/2.mp4, 30fps) says otherwise: the numerals swap every
   * ~1.30s, so the countdown runs 3 × 1.30 = 3.9s. The 3.0s figure was close
   * to the ARC sweep alone (measured 2.833s), which is a different thing.
   *
   * See COUNTDOWN below — that is what the countdown actually reads.
   */
  countdown: 3.9,
} as const;

/**
 * LIVE-CAPTURE COUNTDOWN
 * ---------------------------------------------------------------------------
 * Every number here was measured from `image_video/2.mp4` — the project's
 * screen recording of the reference live-capture screen — at 30fps. Nothing is
 * rounded to a comfortable value, and nothing is here that the recording does
 * not show.
 *
 * MEASURED, FRAME-EXACT:
 *   "3" appears  f208 = 6.933s     held 41 frames = 1.367s
 *   "2" appears  f249 = 8.300s     held 37 frames = 1.233s
 *   "1" appears  f286 = 9.533s     held 88 frames = 2.933s *
 *   numerals go  f374 = 12.467s
 *
 *   * The long "1" is not a design choice. The reference's ring advances in six
 *     irregular increments (0.40, 0.50, 0.60, 0.63, 0.64s apart) — the
 *     signature of a face-detection confidence counter, not an easing curve.
 *     The capture waited on that loop. `digitHold` therefore takes the mean of
 *     the two clean holds, which agree closely with each other.
 *
 * WHAT THE RECORDING DOES NOT CONTAIN, verified rather than assumed:
 *   - No fade. Frames 207→208 jump 666→2667 white pixels simultaneously at
 *     thresholds 120, 160, 200 and 240. A fade would stagger those.
 *   - No scale. Glyph cap height is 75/74/73px for 3/2/1 — that spread is
 *     glyph overshoot, not animation.
 *   - No blur, no travel, no rotation, no background zoom/pan/darkening. A
 *     background patch measures 255,255,255 and the heading 223.63,223.87,
 *     223.87 at six sample frames spanning the whole countdown — identical to
 *     two decimal places.
 *
 * So the countdown is a hard cut between numerals of constant size and
 * opacity, over a ring that fills. `swap` exists only so the outgoing numeral
 * leaves through AnimatePresence rather than being torn out of the tree; at
 * 80ms it is 2.4 frames, under what the 30fps source could have resolved.
 */
export const COUNTDOWN = {
  /** Numerals counted down, inclusive: 3, 2, 1. */
  from: 3,
  /** Seconds each numeral is held. Mean of the two uninterrupted holds. */
  digitHold: 1.3,
  /** Seconds for the whole run. */
  total: 3.9,
  /** Seconds for the numeral cross-dissolve. Opacity only. */
  swap: 0.08,
  /**
   * Ring geometry, as a ratio of the capture circle so it scales with the
   * viewport instead of carrying pixel values that only hold at one size.
   *   radius  270.5px / 233px circle radius
   *   stroke  2px on a 466px diameter
   *   numeral cap height 75px / 0.70 em ÷ 466px diameter
   */
  ring: { radiusRatio: 1.16, strokeRatio: 0.0043 },
  numeralSizeRatio: 0.23,
  /** Sampled from the reference ring at its peak: rgb(9, 142, 77). */
  ringColor: "#098E4D",
} as const;

/** Cubic-bezier control points, mirroring `--ease-*`. */
export const EASE = {
  /** Decisive arrival. The default for anything entering. */
  out: [0.22, 1, 0.36, 1],
  /** Quick departure. Pairs with DURATION.exit. */
  in: [0.64, 0, 0.78, 0],
  inOut: [0.65, 0, 0.35, 1],
} as const satisfies Record<string, [number, number, number, number]>;

/**
 * Constant rate, mirroring `--ease-linear`. Framer takes the string form.
 * Reserved for progress that represents elapsed time — the countdown ring,
 * the marquees. Never for entrances: a linear entrance reads as mechanical.
 */
export const EASE_LINEAR = "linear" as const;

/**
 * Springs, for anything the user is directly manipulating. Tuned by feel:
 * `press` is near-critically damped so taps never wobble; `gentle` carries
 * the most weight and is reserved for large surfaces.
 */
export const SPRING = {
  press: { type: "spring", stiffness: 600, damping: 30, mass: 0.6 },
  snappy: { type: "spring", stiffness: 420, damping: 36, mass: 0.9 },
  gentle: { type: "spring", stiffness: 260, damping: 32, mass: 1 },
} as const satisfies Record<string, Transition>;

export const TRANSITION = {
  enter: { duration: DURATION.slow, ease: EASE.out },
  exit: { duration: DURATION.exit, ease: EASE.in },
  hover: { duration: DURATION.fast, ease: EASE.out },
} as const satisfies Record<string, Transition>;

/**
 * Fire once, slightly before the element is fully on screen — waiting for a
 * dead-centre intersection makes the page feel like it lags the scroll.
 */
export const VIEWPORT = { once: true, margin: "0px 0px -12% 0px" } as const;

/** Distance presets. Deliberately small — see rule 2. */
export const TRAVEL = { sm: 8, md: 16, lg: 24 } as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: TRAVEL.md },
  visible: { opacity: 1, y: 0, transition: TRANSITION.enter },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: TRANSITION.enter },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: SPRING.snappy },
};

/**
 * Parent for staggered groups. Children inherit `hidden`/`visible` through
 * Framer's variant propagation, so list items need no props of their own.
 */
export function staggerContainer(stagger = 0.06, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

/**
 * Collapses a variant set to pure cross-fades. Position and scale changes are
 * what trigger vestibular symptoms; opacity alone is the accepted fallback,
 * so reduced-motion users still get the state change, just without travel.
 */
export function withoutTravel(variants: Variants): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: DURATION.fast, ease: EASE.out },
    },
    ...("exit" in variants ? { exit: { opacity: 0 } } : {}),
  };
}

/**
 * True when the OS asks for reduced motion. Shared by the GSAP hooks, which
 * can't use Framer's `useReducedMotion`.
 *
 * Note this is genuinely needed: the global `prefers-reduced-motion` block in
 * globals.css neutralises CSS animations and transitions, but GSAP writes
 * inline transforms frame by frame and sails straight through it.
 */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Magnetic hover and custom cursors are meaningless without a fine pointer. */
export const FINE_POINTER_QUERY = "(min-width: 768px) and (pointer: fine)";

export function hasFinePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}
