"use client";

/**
 * Button — adapted from 21st.dev `@coss.com/coss-button`.
 *
 * Changes from source:
 *  - palette classes swapped for Abizon semantic tokens
 *  - size ramp raised so mobile heights clear the 44px touch-target minimum
 *    (source used h-9/h-8, i.e. 36px/32px), tightening only at `sm:` and up
 *  - added `success` variant for confirm/approved actions
 */

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2",
    "whitespace-nowrap rounded-md border font-semibold outline-none",
    "transition-[background-color,border-color,box-shadow,transform] duration-[--duration-fast] ease-[--ease-out]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    /**
     * Press feedback. The lift is 1px and the press is a 2% scale — small
     * enough to register as tactile without the button appearing to jump.
     * `active:` resolves after `hover:`, so the press cancels the lift and
     * the button settles *into* the click rather than fighting it.
     */
    "hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
    "motion-reduce:transform-none motion-reduce:hover:transform-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
    "[&_svg:not([class*='size-'])]:size-4",
    // Icons trailing a label drift forward on hover — the standard cue that
    // a control advances you somewhere.
    "[&_svg[data-arrow]]:transition-transform [&_svg[data-arrow]]:duration-[--duration-fast]",
    "hover:[&_svg[data-arrow]]:translate-x-0.5",
  ],
  {
    defaultVariants: { size: "default", variant: "default" },
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-on-primary shadow-e2 hover:bg-primary-hover hover:border-primary-hover hover:shadow-e3 active:bg-primary-active active:shadow-e1",
        secondary:
          "border-border bg-surface text-foreground shadow-e1 hover:bg-surface-sunken hover:border-border-strong hover:shadow-e2",
        outline:
          "border-primary-border bg-transparent text-primary-subtle-foreground hover:bg-primary-subtle",
        ghost:
          "border-transparent bg-transparent text-subtle-foreground hover:bg-surface-sunken hover:text-foreground",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
        destructive:
          "border-destructive bg-destructive text-white shadow-e2 hover:bg-destructive-hover",
        success:
          "border-success bg-success text-white shadow-e2 hover:brightness-95",
      },
      size: {
        xs: "h-8 gap-1 rounded-sm px-2.5 text-2xs",
        sm: "h-10 gap-1.5 px-3 text-xs sm:h-9",
        default: "h-11 px-4 text-sm sm:h-10",
        lg: "h-12 px-5 text-sm sm:h-11",
        xl: "h-14 px-7 text-base sm:h-12",
        icon: "size-11 sm:size-10",
        "icon-sm": "size-10 sm:size-9",
        "icon-xs": "size-8 rounded-sm [&_svg:not([class*='size-'])]:size-3.5",
      },
      block: { true: "w-full", false: "" },
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant,
      size,
      block,
      asChild = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, block, className }))}
        disabled={Boolean(loading || disabled)}
        aria-busy={loading || undefined}
        data-slot="button"
        type={asChild ? undefined : "button"}
        {...props}
      >
        {loading ? (
          <span className="invisible inline-flex items-center gap-2">{children}</span>
        ) : (
          children
        )}
        {loading ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading</span>
          </span>
        ) : null}
      </Comp>
    );
  },
);
