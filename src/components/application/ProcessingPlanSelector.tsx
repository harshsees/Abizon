"use client";

/**
 * Processing speed — standard or express.
 *
 * Replaces `VisaTypeSelector`. What was worth keeping came across intact: the
 * `radiogroup` role with a single tab stop, arrow keys moving the selection,
 * and one `layoutId` ring that Framer tweens between options so selection
 * slides rather than blinks.
 *
 * What did NOT come across is the `VisaPlan` data model. Its four entries
 * carried `price: "₹7,499"`, `processing: "3-5 working days"` and
 * `validity: "30 days"` as display strings, invented and identical for every
 * destination — a second pricing system sitting beside `computeTotals`, and a
 * third if you counted the fee ledger further down the same file.
 *
 * Both prices here are `computeTotals(config.pricing, { express })`. The
 * express delta is whatever the pricing model says it is, and the delivery days
 * come from the destination's real SLA. Where express cannot actually be
 * faster — a one-day destination like Dubai — the option says "priority
 * handling" rather than inventing a shorter number, matching what
 * `CountryApplicationPanel` already says one page earlier.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { useId, useRef } from "react";

import { computeTotals, type CountryVisaConfig } from "@/lib/countryVisa";
import { planDeliveryDays, planLabel } from "@/lib/application/state";
import { SPRING, TRANSITION } from "@/lib/motion";
import { cn } from "@/lib/utils";

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

type ProcessingPlanSelectorProps = {
  config: CountryVisaConfig;
  value: number;
  onChange: (plan: number) => void;
};

export function ProcessingPlanSelector({
  config,
  value,
  onChange,
}: ProcessingPlanSelectorProps) {
  const reduced = useReducedMotion();
  const baseId = useId();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const options = [0, 1].map((index) => {
    const totals = computeTotals(config.pricing, { express: index === 1 });
    const days = planDeliveryDays(config, index);
    return {
      index,
      label: planLabel(index),
      perTraveller: totals.perTraveller,
      days,
      // Express on a one-day destination cannot be a day sooner.
      sameSpeed: index === 1 && days === config.deliveryDays,
    };
  });

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;

    event.preventDefault();
    const next = (index + delta + options.length) % options.length;
    onChange(options[next].index);
    optionRefs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label="Processing speed" className="grid gap-3 sm:grid-cols-2">
      {options.map((option, index) => {
        const selected = value === option.index;

        return (
          <motion.button
            key={option.label}
            ref={(node) => {
              optionRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            // One tab stop for the whole group; arrows move within it. `plan`
            // always holds 0 or 1, so exactly one option is ever selected.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.index)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            whileTap={reduced ? undefined : { scale: 0.985 }}
            transition={SPRING.press}
            className={cn(
              "relative cursor-pointer rounded-xl border p-4 text-left",
              "transition-[background-color,border-color] duration-[--duration-base] ease-[--ease-out]",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected
                ? "border-primary bg-primary-subtle"
                : "border-border bg-surface hover:border-border-strong",
            )}
          >
            {selected && !reduced && (
              <motion.span
                layoutId={`${baseId}-selection`}
                aria-hidden="true"
                transition={SPRING.snappy}
                className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-primary"
              />
            )}

            <span className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                {option.index === 1 && <Zap aria-hidden className="size-3.5" />}
                {option.label}
              </span>
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{ opacity: selected ? 1 : 0, scale: selected ? 1 : 0.6 }}
                transition={selected ? SPRING.press : TRANSITION.exit}
                className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-on-primary"
              >
                <Check className="size-3" strokeWidth={3} />
              </motion.span>
            </span>

            <span className="mt-1 block text-2xs text-muted-foreground">
              {option.sameSpeed
                ? "Priority handling"
                : `${option.days} ${option.days === 1 ? "day" : "days"}`}
            </span>
            <span
              data-numeric
              className="mt-2 block text-sm font-bold tracking-tight text-foreground"
            >
              {inr(option.perTraveller)}
              <span className="ml-1 text-2xs font-medium text-muted-foreground">
                per traveller
              </span>
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
