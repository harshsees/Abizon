"use client";

/**
 * The step rail.
 *
 * Two presentations of one list, chosen by breakpoint rather than duplicated:
 *
 *   md and up   a vertical rail with labels and a connecting hairline. There
 *               is room for words, so it uses them.
 *   below md    the labels would truncate to nothing, so the rail collapses to
 *               a row of segments plus "Step 2 of 5 · Documents". A segmented
 *               bar states position and remaining length in the space a single
 *               truncated word would have occupied.
 *
 * Real buttons throughout, gated on `canReach` — the same derived rule the
 * Continue button uses, so the rail can never offer a step the flow refuses.
 * Unreachable steps stay in the list, disabled, so the list length does not
 * change under the user as they progress.
 *
 * The moving indicator is one `layoutId` element shared across items, so it
 * slides between steps instead of blinking. It is skipped under reduced motion,
 * where a travelling box is precisely the thing being opted out of.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

import { useApplication } from "@/lib/application/context";
import { isStepComplete } from "@/lib/application/state";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function ApplicationProgress() {
  const { state, country, steps, currentStep, currentIndex, jumpTo, canReach } =
    useApplication();
  const reduced = useReducedMotion();

  return (
    <nav aria-label="Application steps">
      {/* ---------------------------------------------------------------- */}
      {/* Compact — below md                                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="md:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Step {currentIndex + 1} of {steps.length}
          </p>
          <p className="text-2xs font-semibold text-foreground">{currentStep.label}</p>
        </div>
        <ol className="mt-2 flex gap-1.5" aria-hidden="true">
          {steps.map((step, index) => (
            <li
              key={step.id}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors duration-[--duration-base]",
                index < currentIndex
                  ? "bg-primary/45"
                  : index === currentIndex
                    ? "bg-primary"
                    : "bg-border",
              )}
            />
          ))}
        </ol>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Rail — md and up                                                  */}
      {/* ---------------------------------------------------------------- */}
      <ol className="hidden md:block">
        {steps.map((step, index) => {
          const active = step.id === currentStep.id;
          const done = index < currentIndex && isStepComplete(state, country, step.id);
          const reachable = canReach(step.id);
          const last = index === steps.length - 1;

          return (
            <li key={step.id} className="relative">
              {/* Connector. Sits behind the marker and stops at the last item. */}
              {!last && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-[15px] top-9 h-[calc(100%-1.25rem)] w-px transition-colors duration-[--duration-base]",
                    done ? "bg-primary/35" : "bg-border",
                  )}
                />
              )}

              <button
                type="button"
                onClick={() => jumpTo(step.id)}
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-lg py-2.5 pl-1 pr-2 text-left",
                  "transition-colors duration-[--duration-fast]",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  !reachable ? "" : "cursor-pointer",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "relative z-raised flex size-8 flex-shrink-0 items-center justify-center rounded-full border text-2xs font-bold tabular-nums",
                    "transition-colors duration-[--duration-base]",
                    done
                      ? "border-primary/30 bg-primary-subtle text-primary-subtle-foreground"
                      : active
                        ? "border-primary bg-primary text-on-primary"
                        : "border-border bg-surface text-muted-foreground",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : index + 1}
                </span>

                <span
                  className={cn(
                    "truncate text-sm transition-colors duration-[--duration-fast]",
                    active
                      ? "font-semibold text-foreground"
                      : done
                        ? "font-medium text-subtle-foreground group-hover:text-foreground"
                        : "font-medium text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>

                {active && !reduced && (
                  <motion.span
                    layoutId="application-step-indicator"
                    aria-hidden
                    transition={SPRING.snappy}
                    className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-primary"
                  />
                )}

                <span className="sr-only">
                  {done
                    ? " (completed)"
                    : reachable
                      ? ""
                      : " (not yet available)"}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
