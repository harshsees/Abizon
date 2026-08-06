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
