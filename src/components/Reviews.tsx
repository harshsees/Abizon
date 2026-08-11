/**
 * Customer reviews.
 *
 * PHASE 8C: there are none, so this says so.
 *
 * What was here: eighteen invented testimonials — nine per marquee row — with
 * invented Indian names, invented avatars, invented relative timestamps ("2
 * days ago", recomputed never), a uniform five stars, and a `[Country]` token
 * substituted at render so the same eighteen people praised all 152
 * destinations. Two of them still referred to the Google attribution that
 * Phase 4.1 had already stripped from the UI: "the Google review theme is
 * totally deserved", "completely verified Google review experience".
 *
 * The previous header comment said DO NOT ADD MORE ENTRIES and described the
 * array as placeholder. That was honest about the code and invisible from the
 * page — a traveller reading "Got my Peru visa in less than 48 hours" from
 * "Karan Malhotra, 4 days ago" has no way to know it was written by a
 * developer. A comment cannot carry a disclosure that the UI does not make.
 *
 * So the array is deleted rather than extended, exactly as that comment asked.
 *
 * WHY A SECTION STILL RENDERS. The country page's sub-navigation has a
 * "Reviews" entry and its scroll-spy resolves against `#reviews`; removing the
 * anchor would break the nav on all 152 routes, which is a bigger change than
 * this phase permits. More to the point, §4 asks for a tasteful informational
 * state rather than a hole. An empty shelf, honestly labelled, is not the same
 * as a shelf stocked with props.
 *
 * WHAT WOULD REPLACE THIS. Reviews from a source with an author, a date and a
 * verifiable origin — a platform export or Keyrise's own records — rendered
 * with the count and average they actually carry. Not a rating invented to
 * fill the space: §5 is explicit that 4.9/5 and "98% satisfaction" are only
 * publishable if something measured them.
 */

import { MessageSquareDashed } from "lucide-react";

interface ReviewsProps {
  countryName?: string;
}

export function Reviews({ countryName }: ReviewsProps) {
  const destination = countryName ?? "this destination";

  return (
    <section
      id="reviews"
      // PHASE 8D §17: `py-8` measured 32px against the 40px every neighbouring
      // section carries on mobile. One step, but it is the step that makes a
      // run of sections read as one column rather than a stack of imports.
      className="w-full scroll-mt-28 space-y-6 border-t border-border/50 py-10 md:space-y-8 md:py-12"
    >
      <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        What our customers say
      </h2>

      <div className="flex max-w-2xl flex-col items-start gap-3 rounded-2xl border border-border bg-surface-sunken p-5 md:p-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface">
          <MessageSquareDashed aria-hidden className="h-5 w-5 text-muted-foreground" />
        </span>

        <p className="text-sm font-bold text-foreground">
          No published reviews for {destination} yet
        </p>

        {/* States the policy, not an excuse. A reader who wants evidence of
            reliability is pointed at the two things Keyrise can actually
            evidence — what it charges, and what it owes on a missed date. */}
        <p className="text-sm leading-relaxed text-muted-foreground">
          Keyrise publishes reviews only where the traveller, the date and the
          application behind them can be verified. We would rather show you
          nothing than show you something written in an office. Until there are
          reviews to publish, the fee breakdown above and the{" "}
          <a
            href="/refunds-policy"
            className="font-semibold text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
          >
            refunds policy
          </a>{" "}
          are the commitments we will be held to.
        </p>
      </div>
    </section>
  );
}
