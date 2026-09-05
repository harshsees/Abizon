import type { Metadata } from "next";

import {
  CTABand,
  Callout,
  PageHero,
  PageShell,
  Prose,
  Section,
  StatGrid,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Transparency Report | abizon",
  description:
    "How abizon will publish approval rates, on-time delivery and refunds — the method, ahead of the first quarterly report.",
};

/**
 * PHASE 8C: the data behind this page was invented, which made it the single
 * worst credibility problem on the site.
 *
 * What was here: eight destinations with filing counts (184,220 UAE filings,
 * 96,430 Schengen), approval rates, on-time rates and median times, under a
 * headline of 612,481 applications and ₹41.8L of refunds, badged "Covering Q2
 * 2026 · published 14 Jul 2026". The callout described a specific incident — a
 * nine-day outage of the Schengen appointment portal in May accounting for
 * 2,740 late filings — and the methodology cited 8,114 declined filings.
 *
 * None of it happened. A page titled "The numbers, including the bad ones",
 * whose entire argument is that competitors quote figures without showing the
 * working, was showing invented working. That is a worse failure than the
 * invented reviews: a testimonial is a claim about an opinion, and this was a
 * claim about audited fact, dated and quantified.
 *
 * WHAT SURVIVES, deliberately: the commitment and the method. Saying "here is
 * how we will calculate an approval rate, and here is the trap in calculating
 * it that way" is a real editorial position and costs nothing to publish before
 * the first filing. Only the measurements are gone.
 *
 * The columns are kept as the published schema so the first real report has a
 * shape to land in.
 */
const REPORT_COLUMNS = ["Destination", "Filed", "Approved", "On time", "Median time"];

export default function TransparencyPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Transparency"
        title="The numbers, including the bad ones"
        description="Every visa company claims a high approval rate and none of them show the working. This page is our commitment to the opposite — published quarterly once filing begins, restated when we get it wrong, with the misses left in."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-warning" />
            First report not yet published
          </span>
        }
      />

      <Section eyebrow="Headline" title="What the first report will carry">
        <StatGrid
          stats={[
            { value: null, label: "Applications filed", hint: "Per quarter" },
            { value: null, label: "Approval rate", hint: "All destinations" },
            { value: null, label: "Delivered on time", hint: "Against committed date" },
            { value: null, label: "Refunds paid", hint: "On late filings" },
          ]}
        />

        <div className="mt-8">
          <Callout tone="warning" title="Why this page is empty">
            abizon has not filed applications at volume yet, so there is nothing
            measured to report. Publishing a figure before there is something to
            measure would defeat the point of the page. The first report covers
            the first full quarter of filing, and every quarter after it —
            including the quarters we would rather not publish.
          </Callout>
        </div>
      </Section>

      <Section muted eyebrow="Detail" title="Performance by destination">
        {/* Wide table: scrolls inside its own container so the page body never
            scrolls horizontally on a phone. */}
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-e1">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-sunken">
                {REPORT_COLUMNS.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-5 py-3 text-2xs font-black uppercase tracking-widest text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  colSpan={REPORT_COLUMNS.length}
                  className="px-5 py-10 text-center text-sm text-muted-foreground"
                >
                  No destination has reached a reportable volume yet. This table
                  fills in with the first quarterly report.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section eyebrow="Method" title="How these numbers are calculated">
        <Prose>
          <h3>Approval rate</h3>
          <p>
            Approvals divided by applications that reached a final government decision in the
            quarter. Applications we declined to file — because the traveller was clearly
            ineligible — are <strong>excluded from the numerator and the denominator</strong>.
            This is the number most open to flattery, so the count of declined filings is
            published alongside it every quarter.
          </p>
          <h3>On-time delivery</h3>
          <p>
            Measured against the delivery date shown at checkout, not an internal target set
            afterwards. If we told you the 14th and delivered on the 15th, that is a miss,
            regardless of cause — including causes outside our control, such as a
            destination&apos;s appointment portal going down.
          </p>
          <h3>Refunds</h3>
          <p>
            The full service fee, returned automatically. Government fees are not refundable
            to us once filed, so they are not included. Where a filing never reached the
            government at all, the government fee is refunded too.
          </p>
          <h3>Restatements</h3>
          <p>
            Nothing has been published, so nothing has been restated. When a figure in a
            published report turns out to be wrong, the correction appears here with the
            original number, the corrected number and the reason — rather than the report
            being quietly reissued.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="See the fee side of this"
        description="Every government fee movement we detect, when we detected it, and when we passed it on."
        href="/fee-change-audit"
        label="Fee Change Audit"
      />
    </PageShell>
  );
}
