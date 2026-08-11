"use client";

/**
 * The top of every step: eyebrow, heading, explanation.
 *
 * One component so the three never drift apart in size, spacing or order
 * across five screens — the reason the flow reads as one product rather than
 * five forms.
 *
 * TYPOGRAPHY (Phase 1 rules, §7 of this phase). The heading is `type-h2`,
 * which is Newsreader — this is the one editorial moment on the screen, and
 * it is the only serif in the application. The eyebrow and the explanation are
 * Inter, as is every label, input and button below them. No form control in
 * this flow is ever set in the serif.
 *
 * The heading is the focus target on step change, so it takes `tabIndex={-1}`
 * and loses the focus ring — a heading that shows a ring on programmatic focus
 * reads as a bug, and the visible step change is itself the indicator.
 */

import { forwardRef, type ReactNode } from "react";

type StepHeaderProps = {
  eyebrow: string;
  heading: string;
  description?: ReactNode;
};

export const StepHeader = forwardRef<HTMLHeadingElement, StepHeaderProps>(
  function StepHeader({ eyebrow, heading, description }, ref) {
    return (
      <div className="max-w-xl">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-primary-subtle-foreground">
          {eyebrow}
        </p>
        <h1
          ref={ref}
          tabIndex={-1}
          className="type-h2 mt-2.5 text-balance text-foreground outline-none"
        >
          {heading}
        </h1>
        {description && (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    );
  },
);
