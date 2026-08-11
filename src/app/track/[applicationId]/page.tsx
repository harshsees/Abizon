import type { Metadata } from "next";
import Link from "next/link";
import { Info } from "lucide-react";

import { TrackingTimeline } from "@/components/TrackingTimeline";
import { lookupApplicationStatus } from "@/lib/application/status";

/**
 * /track/<reference>
 *
 * The page now goes through `lookupApplicationStatus`, the one seam a real
 * applications API would fill. Today that returns `{ available: false }` and
 * this page renders the truthful consequence.
 *
 * THE DISTINCTION THAT MATTERS. "We cannot look this up" and "we looked and
 * found nothing" are very different sentences to someone with a flight booked.
 * The lookup never consults the reference, so the copy never implies it was
 * checked. The heading calls it a *reference you entered*, not an application
 * number — nothing in this project issues application numbers, and calling it
 * one would imply a record exists.
 *
 * HISTORY. Before Phase 5A this page printed "Current status: Documents under
 * review" and drew the timeline at `activeIndex={1}` — a constant, for every
 * visitor, for an application that did not exist. Phase 6B removed the last of
 * that by giving the component a status model rather than its own stage list.
 *
 * Wiring a backend: implement `lookupApplicationStatus`. This file's only
 * change is that the `available: true` branch starts being taken.
 */
export const metadata: Metadata = {
  title: "Track Application | Keyrise",
  description:
    "The stages a Keyrise visa application passes through, and what Keyrise can currently report.",
};

type Props = {
  params: Promise<{ applicationId: string }>;
};

export default async function TrackingPage({ params }: Props) {
  const { applicationId } = await params;
  const lookup = await lookupApplicationStatus(applicationId);

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 bg-background">
      <section className="mx-auto max-w-2xl px-5 py-12 md:px-6 md:py-16">
        <p className="text-2xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Reference you entered
        </p>
        <h1
          data-numeric
          className="mt-2 break-all text-2xl font-bold tracking-tight text-foreground md:text-3xl"
        >
          {applicationId}
        </h1>

        {!lookup.available && (
          <div
            role="status"
            className="mt-6 flex gap-3 rounded-xl border border-border bg-surface p-5"
          >
            <Info
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            />
            <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
              <p className="text-sm font-semibold text-foreground">
                Live tracking is not available yet
              </p>
              <p>
                Keyrise has no online status service, so this reference has not
                been checked against anything — we are not reporting that it was
                not found, only that we cannot look it up. Nothing below
                describes your application.
              </p>
              <p>
                For the status of an application already filed, contact support
                with your reference.
              </p>
            </div>
          </div>
        )}

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-foreground">
            How a Keyrise application progresses
          </h2>
          <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
            The route every application takes. The first two stages are decided
            on your own device; the rest need a status service Keyrise does not
            run yet.
          </p>

          <div className="mt-4">
            <TrackingTimeline
              status={lookup.available ? lookup.status : undefined}
              events={lookup.available ? lookup.events : []}
            />
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="mailto:support@keyrise.com"
            className="inline-flex h-12 items-center rounded-xl border border-border bg-surface px-5 sm:h-11 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
          >
            Contact support
          </a>
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-xl bg-primary px-5 sm:h-11 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
          >
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}
