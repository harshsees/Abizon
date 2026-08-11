"use client";

/**
 * The application lifecycle, and where an application sits in it.
 *
 * PHASE 6B GAVE THIS A DATA SOURCE INSTEAD OF ASSUMPTIONS.
 *
 * Originally the component took `activeIndex: number` and both callers passed
 * the literal `1`, so every visitor to `/track/<anything>` was told their
 * application was at "Documents under review" — a specific operational claim,
 * invented, about an application that does not exist. Phase 5A replaced that
 * with a required `status` prop. Phase 6B replaces the component's own private
 * list of stage strings with `APPLICATION_STATUSES` from the status model, and
 * adds `events`.
 *
 * The contract is now: give it a status and a history, and it draws them; give
 * it neither and it draws the lifecycle as an explanation with nothing marked.
 * Wiring a real backend means implementing `lookupApplicationStatus` — this
 * file does not change.
 *
 * WHY UNSUPPORTED STAGES ARE STILL SHOWN. Hiding the five stages Keyrise cannot
 * observe would make the journey look shorter than it is. They are shown, and
 * marked as needing a status service, so the picture is complete and the limit
 * is legible.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Check, Circle } from "lucide-react";

import {
  APPLICATION_STATUSES,
  statusIndex,
  type ApplicationStatusId,
  type TrackingEvent,
} from "@/lib/application/status";
import { TRANSITION, VIEWPORT, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

const when = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

type TrackingTimelineProps = {
  /**
   * Where the application currently is. `undefined` means unknown — which is
   * what every caller passes today, because nothing can determine it.
   */
  status?: ApplicationStatusId;
  /** Observed transitions, newest last. Empty when there is no source. */
  events?: TrackingEvent[];
  className?: string;
};

export function TrackingTimeline({
  status,
  events = [],
  className,
}: TrackingTimelineProps) {
  const reduced = useReducedMotion();
  const activeIndex = status ? statusIndex(status) : -1;

  const eventFor = (id: ApplicationStatusId) =>
    events.find((event) => event.status === id);

  return (
    <motion.ol
      className={cn("relative space-y-2", className)}
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT}
      variants={staggerContainer(0.05)}
      aria-label={
        status
          ? `Application status: ${status}. Stage ${activeIndex + 1} of ${APPLICATION_STATUSES.length}.`
          : `The ${APPLICATION_STATUSES.length} stages of a Keyrise application. Current stage unknown.`
      }
    >
      {APPLICATION_STATUSES.map((stage, index) => {
        const reached = activeIndex >= 0 && index <= activeIndex;
        const current = activeIndex >= 0 && index === activeIndex;
        const event = eventFor(stage.id);

        return (
          <motion.li
            key={stage.id}
            variants={{
              hidden: { opacity: 0, x: reduced ? 0 : -8 },
              visible: { opacity: 1, x: 0, transition: TRANSITION.enter },
            }}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-3.5",
              "transition-[background-color,border-color] duration-[--duration-base]",
              reached
                ? "border-transparent bg-success-subtle"
                : "border-border bg-surface",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 shrink-0",
                reached ? "text-success-subtle-foreground" : "text-muted-foreground",
              )}
            >
              {reached ? <Check className="size-4" /> : <Circle className="size-4" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p
                  className={cn(
                    "text-sm font-semibold",
                    reached ? "text-success-subtle-foreground" : "text-foreground",
                  )}
                >
                  {stage.label}
                </p>

                {event ? (
                  <time
                    dateTime={event.at}
                    data-numeric
                    className="text-2xs text-muted-foreground"
                  >
                    {when.format(new Date(event.at))}
                  </time>
                ) : (
                  !stage.supported && (
                    // Not a status. A statement about what Keyrise can see.
                    <span className="text-2xs text-muted-foreground">
                      Needs a status service
                    </span>
                  )
                )}
              </div>

              <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                {event?.note ?? stage.description}
              </p>
            </div>

            {current && (
              <span className="ml-auto flex shrink-0 items-center gap-1.5 self-center text-2xs font-bold uppercase tracking-wider text-success-subtle-foreground">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75 motion-reduce:hidden" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                </span>
                Now
              </span>
            )}
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
