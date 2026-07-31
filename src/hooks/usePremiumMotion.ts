"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";

gsap.registerPlugin(ScrollTrigger);

/**
 * SplitType text heading reveal animation.
 * Splits headings into lines, wraps them in overflow-hidden masks,
 * and staggers them line-by-line with translateY and opacity.
 */
export function useHeadingReveal(containerRef: React.RefObject<HTMLElement | null>, selector: string) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const targets = container.querySelectorAll(selector);
      targets.forEach((target) => {
        const textElement = target as HTMLElement;
        // Split text by lines
        const split = new SplitType(textElement, {
          types: "lines",
          lineClass: "overflow-hidden-line-wrapper inline-block w-full"
        });

        if (!split.lines) return;

        // Wrap each line's inner content in a secondary animated span for clip masking
        split.lines.forEach((line) => {
          const text = line.innerHTML;
          line.innerHTML = `<span class="inline-block translate-y-full opacity-0 will-change-transform">${text}</span>`;
        });

        const animatedLines = textElement.querySelectorAll(".overflow-hidden-line-wrapper span");

        gsap.to(animatedLines, {
          yPercent: -100, // moves the text from yPercent 100% (translate-y-full) to 0
          opacity: 1,
          duration: 1.1,
          stagger: 0.05, // 50ms stagger
          ease: "power4.out",
          scrollTrigger: {
            trigger: textElement,
            start: "top 88%",
            toggleActions: "play none none none", // animate only once
          },
        });
      });
    }, container);

    return () => ctx.revert();
  }, [containerRef, selector]);
}

/**
 * Magnetic button hover effect.
 * Attracts buttons toward the cursor when the mouse gets near.
 */
export function useMagneticHover(containerRef: React.RefObject<HTMLElement | null>, selector: string) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const targets = container.querySelectorAll(selector);
      targets.forEach((target) => {
        const button = target as HTMLElement;

        const handleMouseMove = (e: MouseEvent) => {
          const rect = button.getBoundingClientRect();
          const btnX = rect.left + rect.width / 2;
          const btnY = rect.top + rect.height / 2;

          const distanceX = e.clientX - btnX;
          const distanceY = e.clientY - btnY;
          const distance = Math.hypot(distanceX, distanceY);

          // Active pull radius
          if (distance < 75) {
            gsap.to(button, {
              x: distanceX * 0.35,
              y: distanceY * 0.35,
              scale: 1.05,
              duration: 0.3,
              ease: "power2.out",
            });
          } else {
            // Return back to center
            gsap.to(button, {
              x: 0,
              y: 0,
              scale: 1,
              duration: 0.3,
              ease: "power2.out",
            });
          }
        };

        const handleMouseLeave = () => {
          gsap.to(button, {
            x: 0,
            y: 0,
            scale: 1,
            duration: 0.4,
            ease: "elastic.out(1, 0.3)",
          });
        };

        window.addEventListener("mousemove", handleMouseMove);
        button.addEventListener("mouseleave", handleMouseLeave);
      });
    }, container);

    return () => ctx.revert();
  }, [containerRef, selector]);
}

/**
 * Standard luxury section entrance animation.
 * Fades in, slides up, staggers children elements, and triggers only once.
 */
export function useSectionReveal(sectionRef: React.RefObject<HTMLElement | null>, childrenSelector: string) {
  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const ctx = gsap.context(() => {
      const children = element.querySelectorAll(childrenSelector);

      // Animate container and stagger animate kids
      gsap.fromTo(
        children,
        {
          y: 50,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          stagger: 0.15,
          ease: "power3.out", // generous easing
          scrollTrigger: {
            trigger: element,
            start: "top 85%",
            toggleActions: "play none none none", // trigger once
          },
        }
      );
    }, element);

    return () => ctx.revert();
  }, [sectionRef, childrenSelector]);
}

/**
 * Parallax effect for backgrounds or slow-moving floating elements.
 */
export function useParallaxEffect(
  containerRef: React.RefObject<HTMLElement | null>,
  selector: string,
  speed = 0.15
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const targets = container.querySelectorAll(selector);
      targets.forEach((target) => {
        gsap.to(target, {
          yPercent: speed * 100,
          ease: "none",
          scrollTrigger: {
            trigger: container,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    }, container);

    return () => ctx.revert();
  }, [containerRef, selector, speed]);
}
