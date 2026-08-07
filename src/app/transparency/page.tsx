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
  title: "Transparency Report | Keyrise",
  description:
    "Published approval rates, on-time delivery, refunds paid and misses — the numbers behind the Keyrise guarantee, updated quarterly.",
};

/** Trailing-quarter operating figures, restated each quarter. */
const performance = [
  { destination: "United Arab Emirates", filed: "184,220", approved: "99.1%", onTime: "99.7%", median: "18 hrs" },
  { destination: "Thailand", filed: "141,905", approved: "98.8%", onTime: "99.4%", median: "2.1 days" },
  { destination: "Schengen Area", filed: "96,430", approved: "91.2%", onTime: "97.1%", median: "8.4 days" },
  { destination: "United Kingdom", filed: "44,118", approved: "93.7%", onTime: "98.0%", median: "6.9 days" },
  { destination: "United States", filed: "38,602", approved: "88.4%", onTime: "96.2%", median: "on appointment" },
  { destination: "Singapore", filed: "31,744", approved: "97.9%", onTime: "99.1%", median: "3.2 days" },
  { destination: "Vietnam", filed: "28,910", approved: "99.4%", onTime: "99.6%", median: "2.8 days" },
  { destination: "Japan", filed: "19,265", approved: "95.1%", onTime: "97.8%", median: "4.6 days" },
];

export default function TransparencyPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Transparency"
        title="The numbers, including the bad ones"
        description="Every visa company claims a high approval rate and none of them show the working. This page is our attempt at the opposite — published quarterly, restated when we get it wrong, with the misses left in."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success" />
            Covering Q2 2026 · published 14 Jul 2026
          </span>
        }
      />

      <Section eyebrow="Headline" title="Where we landed last quarter">
        <StatGrid
          stats={[
            { value: "612,481", label: "Applications filed", hint: "Q2 2026" },
            { value: "96.4%", label: "Approval rate", hint: "All destinations" },
            { value: "99.2%", label: "Delivered on time", hint: "Against committed date" },
            { value: "₹41.8L", label: "Refunds paid", hint: "4,903 late filings" },
          ]}
        />

        <div className="mt-8">
          <Callout tone="warning" title="The 0.8% we missed">
            4,903 applications were delivered after the date we committed to. Every one
            triggered an automatic refund without the traveller asking. The largest single
            cause was a nine-day outage of the Schengen appointment portal in May, which
            accounted for 2,740 of them — we could not file, and we had promised we could.
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
                {["Destination", "Filed", "Approved", "On time", "Median time"].map((h) => (
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
            <tbody className="divide-y divide-border">
              {performance.map((row) => (
                <tr key={row.destination} className="hover:bg-surface-sunken">
                  <th
                    scope="row"
                    className="px-5 py-3.5 text-sm font-semibold text-foreground"
                  >
                    {row.destination}
                  </th>
                  <td data-numeric className="px-5 py-3.5 text-sm text-muted-foreground">
                    {row.filed}
                  </td>
                  <td data-numeric className="px-5 py-3.5 text-sm font-bold text-foreground">
                    {row.approved}
                  </td>
                  <td data-numeric className="px-5 py-3.5 text-sm text-muted-foreground">
                    {row.onTime}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-muted-foreground">{row.median}</td>
                </tr>
              ))}
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
            This is the number most open to flattery, so we publish the count of declined
            filings alongside it: 8,114 last quarter.
          </p>
          <h3>On-time delivery</h3>
          <p>
            Measured against the delivery date shown at checkout, not an internal target set
            afterwards. If we told you the 14th and delivered on the 15th, that is a miss,
            regardless of cause — including causes outside our control, like the portal
            outage above.
          </p>
          <h3>Refunds</h3>
          <p>
            The full service fee, returned automatically. Government fees are not refundable
            to us once filed, so they are not included. Where a filing never reached the
            government at all, the government fee is refunded too.
          </p>
          <h3>Restatements</h3>
          <p>
            We have restated published figures twice. In Q4 2025 our on-time number was
            overstated by 0.4% because cancelled applications were being counted as
            delivered. In Q1 2026 the Schengen approval rate was understated by 1.1% after a
            batch of late consulate confirmations arrived past our cut-off. Both corrections
            are reflected in the archive.
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
