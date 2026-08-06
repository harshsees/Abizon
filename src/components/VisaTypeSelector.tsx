"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useId, useRef } from "react";

import { SPRING, TRANSITION } from "@/lib/motion";
import { cn } from "@/lib/utils";

type VisaPlan = {
  id: string;
  title: string;
  price: string;
  processing: string;
  validity: string;
  description: string;
};

type VisaTypeSelectorProps = {
  plans: VisaPlan[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
};

export function VisaTypeSelector({
  plans,
  value,
  onChange,
  error,
}: VisaTypeSelectorProps) {
  const reduced = useReducedMotion();
  const baseId = useId();
  const errorId = error ? `${baseId}-error` : undefined;
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = plans.findIndex((plan) => plan.id === value);

  /**
   * Arrow keys move the selection, per the radiogroup pattern — the group is
   * a single tab stop and the arrows choose within it. These were plain
   * buttons before, so reaching the fourth plan took four tabs and selection
   * was never announced.
   */
  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;

    event.preventDefault();
    const next = (index + delta + plans.length) % plans.length;
    onChange(plans[next].id);
    optionRefs.current[next]?.focus();
  };

  return (
    <div>
      <div
        role="radiogroup"
        aria-label="Visa type"
        aria-describedby={errorId}
        aria-invalid={Boolean(error) || undefined}
        className="grid gap-3 md:grid-cols-2"
      >
        {plans.map((plan, index) => {
          const selected = value === plan.id;
          // Before anything is chosen the first option holds the tab stop, so
          // the group is always reachable.
          const tabbable = selected || (selectedIndex === -1 && index === 0);

          return (
            <motion.button
              key={plan.id}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={tabbable ? 0 : -1}
              onClick={() => onChange(plan.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              whileTap={reduced ? undefined : { scale: 0.985 }}
              transition={SPRING.press}
              className={cn(
                "relative cursor-pointer rounded-lg border p-4 text-left",
                "transition-[background-color,border-color,box-shadow] duration-[--duration-base] ease-[--ease-out]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected
                  ? "border-primary bg-primary-subtle"
                  : "border-border bg-surface hover:border-border-strong hover:shadow-e2",
              )}
            >
              {/* One ring element shared across options via `layoutId`: Framer
                  tweens it from the old card to the new one, so selection
                  slides rather than blinking. Skipped under reduced motion,
                  where a travelling box is the thing being asked about. */}
              {selected && !reduced ? (
                <motion.span
                  layoutId={`${baseId}-selection`}
                  aria-hidden="true"
                  transition={SPRING.snappy}
                  className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-primary"
                />
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <h4 className="text-base font-semibold text-foreground">{plan.title}</h4>
                <motion.span
                  aria-hidden="true"
                  initial={false}
                  animate={{
                    opacity: selected ? 1 : 0,
                    scale: selected ? 1 : 0.6,
                  }}
                  transition={selected ? SPRING.press : TRANSITION.exit}
                  className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-on-primary"
                >
                  <Check className="size-3" strokeWidth={3} />
                </motion.span>
              </div>

              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <div className="mt-3 space-y-1 text-sm text-foreground">
                <p>
                  <span className="font-semibold">Price:</span>{" "}
                  <span className="tabular-nums">{plan.price}</span>
                </p>
                <p>
                  <span className="font-semibold">Processing:</span> {plan.processing}
                </p>
                <p>
                  <span className="font-semibold">Validity:</span> {plan.validity}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
