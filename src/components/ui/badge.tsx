"use client";

/**
 * Badge — status and metadata pill.
 *
 * Built in-house on the same cva + token pattern as `Button` (the 21st.dev
 * Badge was unavailable at build time due to a retrieval limit).
 *
 * Replaces ~15 hand-rolled pills that each invented their own padding,
 * radius, font size and colour pairing.
 */

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-bold leading-none",
  {
    defaultVariants: { variant: "neutral", size: "md" },
    variants: {
      variant: {
        neutral:
          "border-border bg-surface-sunken text-subtle-foreground",
        primary:
          "border-primary-border bg-primary-subtle text-primary-subtle-foreground",
        accent:
          "border-transparent bg-accent-subtle text-accent-subtle-foreground",
        success:
          "border-transparent bg-success-subtle text-success-subtle-foreground",
        warning:
          "border-transparent bg-warning-subtle text-warning-subtle-foreground",
        destructive:
          "border-transparent bg-destructive-subtle text-destructive-subtle-foreground",
        solid: "border-primary bg-primary text-on-primary",
        inverse: "border-transparent bg-foreground text-white",
      },
      size: {
        sm: "px-2 py-0.5 text-2xs",
        md: "px-2.5 py-1 text-2xs",
        lg: "px-3 py-1.5 text-xs",
      },
    },
  },
);

const DOT_COLOR: Record<string, string> = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  solid: "bg-on-primary",
  inverse: "bg-white",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Leading status dot. Pairs colour with a shape so meaning isn't colour-only. */
  dot?: boolean;
  /** Pulse the dot — for genuinely live state only. */
  pulse?: boolean;
}

export function Badge({
  className,
  variant,
  size,
  dot = false,
  pulse = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {dot ? (
        <span className="relative flex size-1.5 shrink-0">
          {pulse ? (
            <span
              className={cn(
                "absolute inline-flex size-full animate-ping rounded-full opacity-75 motion-reduce:hidden",
                DOT_COLOR[variant ?? "neutral"],
              )}
            />
          ) : null}
          <span
            className={cn(
              "relative inline-flex size-1.5 rounded-full",
              DOT_COLOR[variant ?? "neutral"],
            )}
          />
        </span>
      ) : null}
      {children}
    </span>
  );
}
