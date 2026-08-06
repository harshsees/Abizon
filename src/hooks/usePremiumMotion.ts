"use client";

/**
 * Scroll-driven motion, built on GSAP + ScrollTrigger.
 *
 * Every hook here is wrapped in `gsap.matchMedia()` against
 * `(prefers-reduced-motion: no-preference)`. That guard is load-bearing, not
 * ceremony: the global reduced-motion block in globals.css only neutralises
 * CSS animations and transitions. GSAP writes inline transforms frame by
 * frame and ignores it completely, so without this the entire app kept
 * flying, sliding and parallaxing for users who asked it not to.
 *
 * `matchMedia` also reverts automatically — it restores every property GSAP
 * touched when the query stops matching or the component unmounts.
 */

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";

import { DURATION, FINE_POINTER_QUERY, TRAVEL } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

const NO_PREFERENCE = "(prefers-reduced-motion: no-preference)";

/** GSAP's string form of the shared `EASE.out` curve. */
const EASE_OUT = "power3.out";

/**
 * Masked line-by-line heading reveal.
 *
 * Only runs when motion is allowed — SplitType rewrites the heading's DOM to
 * do its work, so under reduced motion we skip it entirely and leave the
 * original markup untouched rather than splitting and then not animating.
 */
export function useHeadingReveal(
  containerRef: React.RefObject<HTMLElement | null>,
  selector: string,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mm = gsap.matchMedia();

    mm.add(NO_PREFERENCE, () => {
      const splits: SplitType[] = [];

      container.querySelectorAll<HTMLElement>(selector).forEach((heading) => {
        const split = new SplitType(heading, {
          types: "lines",
          lineClass: "overflow-hidden-line-wrapper inline-block w-full",
        });
        if (!split.lines) return;
        splits.push(split);

        // Each line gets an inner span that slides up out of its own mask.
        const inners = split.lines.map((line) => {
          const inner = document.createElement("span");
          inner.className = "inline-block will-change-transform";
          inner.append(...Array.from(line.childNodes));
          line.append(inner);
          return inner;
        });

        gsap.fromTo(
          inners,
          { yPercent: 100, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.045,
            ease: EASE_OUT,
            scrollTrigger: { trigger: heading, start: "top 88%", once: true },
          },
        );
      });

      // SplitType's own revert restores the original text nodes.
      return () => splits.forEach((split) => split.revert());
    });

    return () => mm.revert();
  }, [containerRef, selector]);
}

/**
 * Magnetic hover.
 *
 * Rewritten from a window-level `mousemove`. The previous version attached a
 * listener to `window` for every matched button and never removed it —
 * `gsap.context().revert()` reverts tweens, not DOM listeners — so each mount
 * leaked a handler that ran `getBoundingClientRect()` on every target for
 * every pointer move, forcing layout dozens of times a second.
 *
 * Now each element listens only while the pointer is actually over it, so the
 * cost is zero at rest. The pull is also scoped to the element's own bounds
 * rather than lunging from 75px away, which is both cheaper and closer to how
 * Linear and Framer use the effect — a subtle lean, not a grab.
 */
export function useMagneticHover(
  containerRef: React.RefObject<HTMLElement | null>,
  selector: string,
  strength = 0.2,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mm = gsap.matchMedia();

    // Pointer-fine only: there is no hover on touch, and firing this on a tap
    // just makes the button squirm away from the finger.
    mm.add(`${NO_PREFERENCE} and ${FINE_POINTER_QUERY}`, () => {
      const cleanups: Array<() => void> = [];

      container.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
        const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

        const onPointerMove = (event: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          xTo((event.clientX - (rect.left + rect.width / 2)) * strength);
          yTo((event.clientY - (rect.top + rect.height / 2)) * strength);
        };

        const onPointerEnter = () => {
          el.addEventListener("pointermove", onPointerMove);
          gsap.to(el, { scale: 1.03, duration: DURATION.base, ease: EASE_OUT });
        };

        const onPointerLeave = () => {
          el.removeEventListener("pointermove", onPointerMove);
          xTo(0);
          yTo(0);
          gsap.to(el, { scale: 1, duration: DURATION.slow, ease: EASE_OUT });
        };

        el.addEventListener("pointerenter", onPointerEnter);
        el.addEventListener("pointerleave", onPointerLeave);

        cleanups.push(() => {
          el.removeEventListener("pointerenter", onPointerEnter);
          el.removeEventListener("pointerleave", onPointerLeave);
          el.removeEventListener("pointermove", onPointerMove);
        });
      });

      return () => cleanups.forEach((fn) => fn());
    });

    return () => mm.revert();
  }, [containerRef, selector, strength]);
}

/**
 * Staggered section entrance.
 *
 * Travel dropped from 50px to 16px and duration from 1.2s to 0.55s. The old
 * values meant a card was still visibly moving almost a second and a half
 * after it entered the viewport, which reads as sluggish rather than
 * expensive — and on a fast scroll several rows were mid-flight at once.
 */
export function useSectionReveal(
  sectionRef: React.RefObject<HTMLElement | null>,
  childrenSelector: string,
) {
  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const mm = gsap.matchMedia();

    mm.add(NO_PREFERENCE, () => {
      const children = element.querySelectorAll<HTMLElement>(childrenSelector);
      if (!children.length) return;

      gsap.fromTo(
        children,
        { y: TRAVEL.md, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.06,
          ease: EASE_OUT,
          scrollTrigger: { trigger: element, start: "top 85%", once: true },
        },
      );
    });

    return () => mm.revert();
  }, [sectionRef, childrenSelector]);
}

/**
 * Scrubbed parallax. `scrub: true` ties progress directly to scroll position,
 * so with Lenis driving updates this stays locked to the viewport.
 */
export function useParallaxEffect(
  containerRef: React.RefObject<HTMLElement | null>,
  selector: string,
  speed = 0.12,
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mm = gsap.matchMedia();

    mm.add(NO_PREFERENCE, () => {
      const targets = container.querySelectorAll<HTMLElement>(selector);
      if (!targets.length) return;

      gsap.to(targets, {
        yPercent: speed * 100,
        ease: "none",
        scrollTrigger: {
          trigger: container,
          start: "top bottom",
          end: "bottom top",
          // A small scrub value smooths the catch-up instead of snapping
          // one-to-one with the wheel.
          scrub: 0.5,
        },
      });
    });

    return () => mm.revert();
  }, [containerRef, selector, speed]);
}
