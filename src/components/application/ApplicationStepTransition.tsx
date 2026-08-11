"use client";

/**
 * Direction-aware step transition.
 *
 * Salvaged from `MultiStepApplicationForm`, which was otherwise deleted. The
 * idea worth keeping: a step arriving after "Back" should enter from the side
 * it left on, or the flow loses its sense of place.
 *
 * The reason it is a component rather than variants copied into each step is
 * Phase 5A §20 — the state logic must not be coupled to Framer Motion. The
 * reducer stores `direction: 1 | -1` and knows nothing about animation; this
 * file is the only place in the application flow that imports a motion
 * library. Swapping it for CSS, or for nothing at all, touches one file.
 *
 * Under `prefers-reduced-motion` the travel is dropped and only the cross-fade
 * remains: horizontal movement is the part that causes trouble, and a step
 * change still needs to be perceivable.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { TRANSITION, TRAVEL } from "@/lib/motion";

type ApplicationStepTransitionProps = {
  /** Changes when the step changes. Drives the swap. */
  stepKey: string;
  direction: 1 | -1;
  children: ReactNode;
};

export function ApplicationStepTransition({
  stepKey,
  direction,
  children,
}: ApplicationStepTransitionProps) {
  const reduced = useReducedMotion();
  const travel = reduced ? 0 : TRAVEL.lg;

  return (
    // `mode="wait"` so two steps are never stacked mid-transition — with forms
    // inside, an overlap means two inputs share one label id.
    <AnimatePresence mode="wait" custom={direction} initial={false}>
      <motion.div
        key={stepKey}
        custom={direction}
        initial="enter"
        animate="settled"
        exit="leave"
        variants={{
          enter: (dir: 1 | -1) => ({ opacity: 0, x: dir * travel }),
          settled: { opacity: 1, x: 0, transition: TRANSITION.enter },
          leave: (dir: 1 | -1) => ({
            opacity: 0,
            x: dir * -travel,
            transition: TRANSITION.exit,
          }),
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
