"use client";

/**
 * Card — the single surface primitive.
 *
 * Replaces the ad-hoc mix of rounded-[2rem] / [28px] / [32px] / 3xl / 2xl
 * containers, each with its own border colour and shadow.
 */

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

export const cardVariants = cva("bg-surface", {
  defaultVariants: { elevation: "e1", radius: "lg", bordered: true },
  variants: {
    elevation: {
      flat: "shadow-none",
      e1: "shadow-e1",
      e2: "shadow-e2",
      e3: "shadow-e3",
      e4: "shadow-e4",
    },
    radius: {
      md: "rounded-md",
      lg: "rounded-lg",
      xl: "rounded-xl",
      "2xl": "rounded-2xl",
    },
    bordered: {
      true: "border border-border",
      false: "border-0",
    },
    interactive: {
      /**
       * Hover lift. Shadow and transform move together so the card reads as
       * rising off the page rather than just gaining a drop shadow; the
       * press settles it back down. 4px is the largest travel in the system
       * — anything more and a grid of cards ripples as the pointer crosses.
       */
      true: [
        "cursor-pointer",
        "transition-[transform,box-shadow] duration-[--duration-base] ease-[--ease-out]",
        "hover:-translate-y-1 hover:shadow-e3",
        "active:-translate-y-0.5 active:shadow-e2 active:duration-[--duration-instant]",
        "focus-within:-translate-y-1 focus-within:shadow-e3",
        "motion-reduce:transform-none motion-reduce:hover:transform-none",
      ].join(" "),
      false: "",
    },
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, elevation, radius, bordered, interactive, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        cardVariants({ elevation, radius, bordered, interactive, className }),
      )}
      {...props}
    />
  );
});

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />;
}

export function CardTitle({
  className,
  as: Comp = "h3",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: React.ElementType }) {
  return (
    <Comp
      className={cn("text-lg font-bold tracking-tight text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center gap-3 border-t border-border p-5", className)}
      {...props}
    />
  );
}
