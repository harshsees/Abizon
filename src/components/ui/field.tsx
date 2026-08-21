"use client";

/**
 * Field + Input — the form primitives.
 *
 * Encodes the form rules the audit found missing across the app:
 *  - a visible label per input (never placeholder-only)
 *  - persistent helper text, distinct from the error slot
 *  - errors rendered below the field, wired via aria-describedby
 *  - aria-invalid + role="alert" so screen readers announce failures
 *  - inputs are 44px tall on mobile to clear the touch-target minimum
 *  - focus is visible (the old global CSS stripped it from every input)
 */

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

export const inputVariants = cva(
  [
    "w-full text-foreground",
    "placeholder:text-muted-foreground",
    "transition-[border-color,box-shadow] duration-[--duration-fast] ease-[--ease-out]",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ],
  {
    defaultVariants: { inputSize: "default", invalid: false, tone: "boxed" },
    variants: {
      /**
       * `boxed` is the original: a bordered box on a surface, correct for a
       * control sitting on its own among prose.
       *
       * `underline` is a rule under the value and nothing else, for the
       * application flow — a dense two-column grid of fields inside a card,
       * where a box around each one draws twelve competing rectangles and the
       * card already provides the containment a border would be repeating.
       * The line is the only thing that moves on focus, which is also what
       * makes a long form feel calm to move through.
       */
      tone: {
        boxed: "rounded-md border bg-surface",
        underline: "rounded-none border-0 border-b bg-transparent px-0",
      },
      inputSize: {
        sm: "h-10 px-3 text-sm sm:h-9",
        default: "h-11 px-3.5 text-sm sm:h-10",
        lg: "h-12 px-4 text-base sm:h-11",
      },
      invalid: {
        true: "border-destructive",
        false: "border-input hover:border-border-strong",
      },
    },
    compoundVariants: [
      // The size variants carry horizontal padding, which is wrong for a rule:
      // the value has to start on the same vertical as its label, or the
      // column stops reading as a column.
      //
      // They also carry a box height, which leaves the rule floating a long way
      // under its label with nothing in between — the value is centred in a
      // 44px box that no longer has edges to be centred in. On a pointer the
      // control shortens so the rule sits just under the text. On touch it
      // keeps the 44px, because the tap target is the whole box whether or not
      // it is drawn.
      { tone: "underline", inputSize: "sm", class: "px-0 h-11 sm:h-8" },
      { tone: "underline", inputSize: "default", class: "px-0 h-11 sm:h-9" },
      { tone: "underline", inputSize: "lg", class: "px-0 h-12 sm:h-10" },
      // Focus is the rule thickening to the foreground rather than a ring —
      // a ring around a borderless input draws the box the design just removed.
      {
        tone: "underline",
        invalid: false,
        class: "focus:border-foreground focus-visible:border-foreground focus-visible:outline-none",
      },
    ],
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  // Every variant key has to be destructured here, not just typed. Anything
  // left in `...props` is spread onto the DOM node instead of reaching
  // `inputVariants` — so the class is never generated, the input silently keeps
  // its default styling, and React is handed an unknown `tone` attribute.
  // TypeScript cannot catch it: the prop is valid on the component either way.
  { className, inputSize, invalid, tone, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(inputVariants({ inputSize, invalid, tone, className }))}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export interface FieldProps {
  label: string;
  /** Visually hide the label but keep it for assistive tech. */
  hideLabel?: boolean;
  /**
   * `micro` sets the label as a small tracked uppercase line above the value,
   * to pair with the `underline` input. The label stops being a sentence
   * introducing a control and becomes a column heading over it, which is what
   * lets four fields sit in a two-by-two grid and still be scannable.
   *
   * It is a presentation change only: same element, same `htmlFor`, same
   * required announcement.
   */
  labelTone?: "default" | "micro";
  htmlFor?: string;
  required?: boolean;
  /** Always-visible guidance. Survives the error state. */
  helper?: React.ReactNode;
  error?: string;
  className?: string;
  children: (props: {
    id: string;
    invalid: boolean;
    "aria-describedby": string | undefined;
  }) => React.ReactNode;
}

export function Field({
  label,
  hideLabel = false,
  labelTone = "default",
  htmlFor,
  required = false,
  helper,
  error,
  className,
  children,
}: FieldProps) {
  const generatedId = React.useId();
  const id = htmlFor ?? generatedId;
  const helperId = helper ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div
      className={cn(
        "flex flex-col",
        labelTone === "micro" ? "gap-1" : "gap-1.5",
        className,
      )}
    >
      <label
        htmlFor={id}
        className={cn(
          labelTone === "micro"
            ? "text-2xs font-semibold uppercase tracking-[0.11em] text-muted-foreground"
            : "text-sm font-semibold text-foreground",
          hideLabel && "sr-only",
        )}
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </label>

      {children({ id, invalid: Boolean(error), "aria-describedby": describedBy })}

      {helper ? (
        <p id={helperId} className="text-2xs leading-relaxed text-muted-foreground">
          {helper}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-2xs font-semibold leading-relaxed text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
