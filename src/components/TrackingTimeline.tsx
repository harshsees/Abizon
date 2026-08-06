"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Circle } from "lucide-react";

import { SPRING, TRANSITION, VIEWPORT, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

const timeline = [
  "Application submitted",
  "Documents under review",
  "Sent to embassy/authority",
  "Visa processing",
  "Visa delivered",
];

type TrackingTimelineProps = {
  activeIndex: number;
};

export function TrackingTimeline({ activeIndex }: TrackingTimelineProps) {
  const reduced = useReducedMotion();

  return (
    <motion.ol
      className="relative space-y-3"
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={staggerContainer(0.07)}
      // The list is the meaningful unit; screen readers get the completed
      // count rather than five separate status strings.
      aria-label={`Progress: step ${activeIndex + 1} of ${timeline.length}`}
    >
      {timeline.map((item, index) => {
        const done = index <= activeIndex;
        const current = index === activeIndex;

        return (
          <motion.li
            key={item}
            variants={{
              hidden: { opacity: 0, x: reduced ? 0 : -8 },
              visible: { opacity: 1, x: 0, transition: TRANSITION.enter },
            }}
            className={cn(
              "flex items-center gap-3 rounded-md border p-3",
              "transition-[background-color,border-color] duration-[--duration-base] ease-[--ease-out]",
              done
                ? "border-transparent bg-success-subtle text-success-subtle-foreground"
                : "border-border bg-surface text-muted-foreground",
            )}
          >
            <motion.span
              aria-hidden="true"
              className="shrink-0"
              // Completed steps pop once as they land; pending ones stay put.
              initial={false}
              animate={{ scale: done ? 1 : 0.9 }}
              transition={SPRING.press}
            >
              {done ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Circle className="size-4" />
              )}
            </motion.span>

            <span className="text-sm font-medium">{item}</span>

            {current ? (
              <span className="ml-auto flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider">
                {/* Ping marks the one genuinely live step. `motion-reduce:hidden`
                    in the base layer stops it looping for reduced-motion users. */}
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75 motion-reduce:hidden" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                </span>
                In progress
              </span>
            ) : null}
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
