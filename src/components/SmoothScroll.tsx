"use client";

import { ReactLenis } from "lenis/react";
import { ReactNode, useMemo } from "react";
import { MotionConfig, useReducedMotion } from "framer-motion";

interface SmoothScrollProps {
  children: ReactNode;
}

// GSAP's ScrollTrigger is kept in step with Lenis by `useScrollTriggerSync`
// (hooks/usePremiumMotion), on the pages that have triggers — not here, where
// it would ship GSAP to every page and re-measure pages that never use it.

export function SmoothScroll({ children }: SmoothScrollProps) {
  const reduced = useReducedMotion();

  const options = useMemo(
    () => ({
      /**
       * Interpolation factor per frame — the single value that decides whether
       * smooth scrolling feels expensive or broken.
       *
       * This was 0.05 with `duration: 1.8`, which takes roughly half a second
       * to catch up to the wheel. That isn't luxury, it's latency: the page
       * visibly lags the input device. Linear and Vercel both sit near 0.1,
       * close enough to track the wheel while still shaving off the harsh
       * step of a native scroll. `duration` is dropped because it and `lerp`
       * are mutually exclusive in Lenis — passing both meant the intended
       * easing never applied to wheel input at all.
       */
      lerp: 0.12,
      smoothWheel: !reduced,
      /**
       * Touch devices already have excellent momentum scrolling in the OS.
       * Overriding it costs a frame of latency and breaks pull-to-refresh
       * and browser-chrome hiding, so let native handle it.
       */
      syncTouch: false,
      wheelMultiplier: 1,
    }),
    [reduced],
  );

  return (
    /**
     * `reducedMotion="user"` is the single global lever for Framer: it strips
     * transform and layout animation from every `motion` element in the tree
     * when the OS asks, while leaving opacity intact so state changes still
     * read. Individual components no longer have to remember to check.
     */
    <MotionConfig reducedMotion="user">
      <ReactLenis root options={options}>
        {children}
      </ReactLenis>
    </MotionConfig>
  );
}
