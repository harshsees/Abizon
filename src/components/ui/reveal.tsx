"use client";

/**
 * Reveal / Stagger — declarative scroll entrances.
 *
 * The GSAP hooks in `usePremiumMotion` drive motion by querying for CSS
 * classes (`.js-plan-card`), which means the animation lives far away from
 * the markup it animates and breaks silently when a class is renamed. These
 * are for new work: the intent sits on the element itself.
 *
 * Both honour `prefers-reduced-motion` by collapsing to a plain cross-fade —
 * the state change still reads, it just doesn't travel.
 */

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";

import {
  VIEWPORT,
  fadeIn,
  fadeUp,
  scaleIn,
  staggerContainer,
  withoutTravel,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

const PRESETS = { fadeUp, fadeIn, scaleIn } satisfies Record<string, Variants>;

export type RevealPreset = keyof typeof PRESETS;

export interface RevealProps extends HTMLMotionProps<"div"> {
  preset?: RevealPreset;
  /** Seconds to hold before starting. Use sparingly — delays read as lag. */
  delay?: number;
  /** Re-run every time the element re-enters the viewport. */
  repeat?: boolean;
}

export function Reveal({
  preset = "fadeUp",
  delay = 0,
  repeat = false,
  className,
  children,
  ...props
}: RevealProps) {
  const reduced = useReducedMotion();
  const variants = reduced ? withoutTravel(PRESETS[preset]) : PRESETS[preset];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ ...VIEWPORT, once: !repeat }}
      variants={variants}
      transition={{ delay }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerProps extends HTMLMotionProps<"div"> {
  /** Gap between each child, in seconds. */
  stagger?: number;
  delayChildren?: number;
  repeat?: boolean;
}

/**
 * Parent for a staggered group. Children rendered as `<Stagger.Item>` inherit
 * the `hidden`/`visible` state through Framer's variant propagation, so they
 * need no viewport observer of their own — one observer for the whole list.
 */
export function Stagger({
  stagger = 0.06,
  delayChildren = 0,
  repeat = false,
  className,
  children,
  ...props
}: StaggerProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ ...VIEWPORT, once: !repeat }}
      variants={staggerContainer(stagger, delayChildren)}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface StaggerItemProps extends HTMLMotionProps<"div"> {
  preset?: RevealPreset;
}

function StaggerItem({
  preset = "fadeUp",
  className,
  children,
  ...props
}: StaggerItemProps) {
  const reduced = useReducedMotion();
  const variants = reduced ? withoutTravel(PRESETS[preset]) : PRESETS[preset];

  return (
    <motion.div variants={variants} className={cn(className)} {...props}>
      {children}
    </motion.div>
  );
}

Stagger.Item = StaggerItem;
