"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { ReactNode, useEffect, useMemo } from "react";
import { MotionConfig, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface SmoothScrollProps {
  children: ReactNode;
}

/**
 * Keeps GSAP's ScrollTrigger in step with Lenis, which drives scroll from rAF
 * rather than the native scroll event ScrollTrigger normally listens to.
 *
 * The callback runs on every Lenis frame, on every page, and until now it
 * called into GSAP on all of them. Only the country pages register triggers
 * (`usePremiumMotion`); the homepage — the page with 154 cards on it, and the
 * one that felt heaviest to scroll — has none, and was paying for a GSAP
 * update sixty times a second that had nothing to update. The count is a plain
 * array length read, which is as close to free as a per-frame check gets.
 */
function ScrollTriggerSync() {
  useLenis(() => {
    if (ScrollTrigger.getAll().length === 0) return;
    ScrollTrigger.update();
  });

  useEffect(() => {
    // Trigger positions are measured from layout, so they're wrong until
    // webfonts have swapped in and reflowed the page.
    const refresh = () => ScrollTrigger.refresh();

    refresh();
    document.fonts?.ready.then(refresh);

    window.addEventListener("load", refresh);
    return () => window.removeEventListener("load", refresh);
  }, []);

  return null;
}

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
        <ScrollTriggerSync />
        {children}
      </ReactLenis>
    </MotionConfig>
  );
}
