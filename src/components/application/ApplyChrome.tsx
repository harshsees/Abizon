"use client";

/**
 * THE APPLICATION CHROME
 * ---------------------------------------------------------------------------
 * Three fixed pieces that frame every screen of the flow: a Back pill at the
 * top left, a progress meter at the top centre, and a step rail down the left
 * edge. They are `fixed` rather than laid out, and that is the point — the
 * content of each screen is centred on the *viewport*, not on the space left
 * over beside a rail. In the reference the question "Who's going on this trip
 * to United Arab Emirates?" sits on the page's true centre line with the rail
 * floating over the margin beside it; laying the rail out in the flow would
 * push every headline ~50px right of where it belongs.
 *
 * WHAT REPLACED WHAT
 *
 * This is the chrome for the rebuilt flow. It replaces `ApplicationHeader`
 * (a 64px bar with a wordmark, the destination and a "saved" pill) and
 * `ApplicationProgress` (a labelled vertical rail with descriptions and
 * checkmarks). Both were competent and both were loud: between them they spent
 * the top of the screen and 176px of the left column on telling the applicant
 * where they were, on a flow with three steps.
 *
 * The reference spends a percentage, a 165px bar and three icons on the same
 * job, and gives the rest of the screen to the one question being asked. That
 * is the whole design: one question per screen, nothing else competing with it.
 */

import { CalendarDays, FileText, ShoppingCart, Star, Users } from "lucide-react";
import { ChevronLeft } from "lucide-react";

import type { ApplicationStepId } from "@/lib/application/state";

/* -------------------------------------------------------------------------- */
/* Back                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The one control that always means "undo the last thing".
 *
 * A single pill, floating, at a fixed spot on every screen — including the
 * capture takeovers, which is why it lives here rather than inside the shell's
 * layout. Its `onClick` is whatever the current screen considers backwards:
 * the previous step, or, inside a capture, the screen that opened it.
 */
export function ApplyBack({
  onClick,
  label = "Back",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed left-4 top-4 z-nav inline-flex h-9 cursor-pointer items-center gap-1 rounded-full bg-surface pl-2.5 pr-4 text-sm font-semibold text-foreground shadow-e2 transition-[background-color,transform,box-shadow] duration-[--duration-fast] ease-[--ease-out] hover:shadow-e3 active:scale-[0.97] motion-reduce:transform-none md:left-5 md:top-5"
    >
      <ChevronLeft aria-hidden className="size-4" />
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * "33% COMPLETED", over a 165px track.
 *
 * The number is `progressPercent` — completed steps over gated steps — so it
 * counts what has actually been satisfied rather than which screen is on show.
 * Three gated steps means the meter reads 0 / 33 / 67 / 100, which is exactly
 * the ramp the reference recording moves through.
 *
 * The fill is a gradient rather than a flat colour, and it is painted at the
 * width of the WHOLE track with the track clipping it. A gradient painted at
 * the width of the fill would compress into itself as the bar grew — every
 * value would show the full amber-to-blue sweep, and the colour would stop
 * meaning anything. Clipping means the fill reveals a fixed sweep, so early
 * progress is amber and only a nearly-finished application reaches the blue.
 */
export function ApplyProgress({ percent }: { percent: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-sticky flex flex-col items-center gap-1.5 md:top-4"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Application progress"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {clamped}% completed
      </p>
      <div className="h-[3px] w-[165px] overflow-hidden rounded-full bg-border">
        <div
          className="h-full w-[165px] origin-left rounded-full bg-[linear-gradient(90deg,var(--color-primary)_0%,var(--amber-500)_35%,var(--color-accent)_100%)] transition-transform duration-[--duration-slow] ease-[--ease-out] motion-reduce:transition-none"
          style={{ transform: `scaleX(${clamped / 100})` }}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Rail                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * One glyph per step.
 *
 * `Star` for the sponsor is the reference's own choice and is not an obvious
 * one — a star usually means "favourite". It earns its place because the
 * alternatives are worse: a wallet or a rupee reads as the payment step two
 * icons below it, and a person reads as the travellers step two icons above.
 * What is left has to be abstract, and the rail carries a text label under
 * every glyph anyway.
 */
const RAIL_ICONS: Record<string, typeof Users> = {
  dates: CalendarDays,
  travellers: Users,
  sponsor: Star,
  documents: FileText,
  payment: ShoppingCart,
};

export type RailStep = {
  id: ApplicationStepId;
  label: string;
  /** Reachable steps are buttons; the rest are inert. */
  reachable: boolean;
  done: boolean;
};

/**
 * Three icons down the left margin.
 *
 * The states are the reference's, and they are only three, because a step in
 * this flow is only ever in one of three conditions:
 *
 *   current    accent. The one being worked on.
 *   done       ink. Passed, and still reachable — clicking goes back to it.
 *   upcoming   muted, and not a button. Not reachable yet, and it does not
 *              pretend otherwise by being clickable and then refusing.
 *
 * The `ready` step is deliberately absent: it is the screen shown after the
 * flow finishes, and a rail item for "you have finished" is a destination
 * nobody navigates to. `stepSequence` still carries it; this filters it out.
 */
export function ApplyRail({
  steps,
  current,
  onJump,
}: {
  steps: RailStep[];
  current: ApplicationStepId;
  onJump: (step: ApplicationStepId) => void;
}) {
  return (
    <nav
      aria-label="Application steps"
      className="fixed inset-y-0 left-0 z-sticky hidden w-[100px] flex-col justify-center border-r border-border/70 md:flex"
    >
      <ol className="flex flex-col gap-9">
        {steps.map((step) => {
          const Icon = RAIL_ICONS[step.id] ?? Users;
          const isCurrent = step.id === current;
          const interactive = step.reachable && !isCurrent;

          return (
            <li key={step.id} className="flex justify-center">
              <button
                type="button"
                disabled={!interactive}
                onClick={() => onJump(step.id)}
                aria-current={isCurrent ? "step" : undefined}
                className={[
                  "flex w-full flex-col items-center gap-1.5 py-1 transition-colors duration-[--duration-fast] ease-[--ease-out]",
                  interactive ? "cursor-pointer" : "cursor-default",
                  isCurrent
                    ? "text-primary"
                    : step.done
                      ? "text-foreground hover:text-primary"
                      : "text-muted-foreground/70",
                ].join(" ")}
              >
                <Icon
                  aria-hidden
                  className="size-[22px]"
                  strokeWidth={isCurrent || step.done ? 2.1 : 1.8}
                />
                <span className="text-[13px] font-semibold leading-none">
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The rail's mobile form.
 *
 * Below `md` there is no left margin to float in — 100px of a 390px screen is
 * a quarter of the width — so the same three states are laid out as a row
 * beneath the progress meter. Same colours, same rules, same order.
 */
export function ApplyRailMobile({
  steps,
  current,
  onJump,
}: {
  steps: RailStep[];
  current: ApplicationStepId;
  onJump: (step: ApplicationStepId) => void;
}) {
  return (
    <nav
      aria-label="Application steps"
      className="fixed inset-x-0 top-[52px] z-sticky flex justify-center gap-7 md:hidden"
    >
      {steps.map((step) => {
        const Icon = RAIL_ICONS[step.id] ?? Users;
        const isCurrent = step.id === current;
        const interactive = step.reachable && !isCurrent;

        return (
          <button
            key={step.id}
            type="button"
            disabled={!interactive}
            onClick={() => onJump(step.id)}
            aria-current={isCurrent ? "step" : undefined}
            className={[
              "flex items-center gap-1.5 transition-colors duration-[--duration-fast]",
              interactive ? "cursor-pointer" : "cursor-default",
              isCurrent
                ? "text-primary"
                : step.done
                  ? "text-foreground"
                  : "text-muted-foreground/70",
            ].join(" ")}
          >
            <Icon aria-hidden className="size-4" strokeWidth={2} />
            <span className="text-2xs font-semibold">{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
