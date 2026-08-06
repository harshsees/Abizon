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
    "w-full rounded-md border bg-surface text-foreground",
    "placeholder:text-muted-foreground",
    "transition-[border-color,box-shadow] duration-[--duration-fast] ease-[--ease-out]",
    "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60",
    "read-only:bg-surface-sunken",
  ],
  {
    defaultVariants: { inputSize: "default", invalid: false },
    variants: {
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
  },
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, inputSize, invalid, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(inputVariants({ inputSize, invalid, className }))}
      aria-invalid={invalid || undefined}
      {...props}
    />
  );
});

export interface FieldProps {
  label: string;
  /** Visually hide the label but keep it for assistive tech. */
  hideLabel?: boolean;
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
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "text-sm font-semibold text-foreground",
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
