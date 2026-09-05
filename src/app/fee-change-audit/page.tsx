import type { Metadata } from "next";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

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
  title: "Fee Change Audit | abizon",
  description:
    "A permanent public log of every government visa fee change abizon detects — when we saw it, and when we passed it on to travellers.",
};

type Change = {
  destination: string;
  from: string;
  to: string;
  direction: "up" | "down";
  detected: string;
  applied: string;
  lag: string;
  note: string;
};

const changes: Change[] = [
  {
    destination: "Thailand",
    from: "₹3,720",
    to: "₹3,500",
    direction: "down",
    detected: "02 Aug 2026",
    applied: "02 Aug 2026",
    lag: "Same day",
    note: "Reduction on the 60-day tourist category. Passed on within four hours of detection.",
  },
  {
    destination: "United Kingdom",
    from: "₹11,900",
    to: "₹12,500",
    direction: "up",
    detected: "19 Jul 2026",
    applied: "22 Jul 2026",
    lag: "3 days",
    note: "We absorbed the increase for three days so that applications already quoted were honoured at the old price.",
  },
  {
    destination: "Kenya",
    from: "₹4,900",
    to: "₹4,500",
    direction: "down",
    detected: "11 Jul 2026",
    applied: "11 Jul 2026",
    lag: "Same day",
    note: "eTA fee reduction. 214 in-flight applications were retroactively refunded the difference.",
  },
  {
    destination: "Schengen Area",
    from: "₹7,600",
    to: "₹8,200",
    direction: "up",
    detected: "12 Jun 2026",
    applied: "18 Jun 2026",
    lag: "6 days",
    note: "Scheduled EU-wide revision. Announced in advance, so quotes were honoured until the effective date.",
  },
  {
    destination: "Sri Lanka",
    from: "₹4,100",
    to: "₹2,200",
    direction: "down",
    detected: "28 May 2026",
    applied: "28 May 2026",
    lag: "Same day",
    note: "Substantial ETA reduction. 1,880 open applications were refunded the difference automatically.",
  },
  {
    destination: "United States",
    from: "₹14,700",
    to: "₹15,500",
    direction: "up",
    detected: "04 May 2026",
    applied: "09 May 2026",
    lag: "5 days",
    note: "MRV fee revision. Applications with an appointment already booked were held at the previous rate.",
  },
  {
    destination: "Vietnam",
    from: "₹3,024",
    to: "₹3,024",
    direction: "up",
    detected: "17 Apr 2026",
    applied: "—",
    lag: "Not passed on",
    note: "A processing surcharge was introduced for expedited filings. We chose to absorb it rather than re-quote travellers mid-application.",
  },
];

export default function FeeChangeAuditPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Fee Change Audit"
        title="Every fee movement, with dates"
        description="Government fees change without notice. The question that matters is what a company does in the gap between finding out and telling you — especially when the change is downward. This log makes that gap public and permanent."
      />

      <Section eyebrow="Last 12 months" title="What the log shows">
        <StatGrid
          stats={[
            { value: null, label: "Fee changes detected", hint: "Across 155 destinations" },
            { value: null, label: "Were reductions", hint: "All passed on same day" },
            { value: null, label: "Median lag on cuts", hint: "Detected to applied" },
            { value: null, label: "Refunded on cuts", hint: "To in-flight applications" },
          ]}
        />

        <div className="mt-8">
          <Callout tone="success" title="The asymmetry is intentional">
            Fee <em>reductions</em> are applied the same day, and travellers with applications
            already in flight are refunded the difference automatically. Fee{" "}
            <em>increases</em> are deliberately delayed by several days so that anyone already
            quoted the old price pays it. That is the whole point of publishing this: the
            incentive runs the other way, and a log makes the choice visible.
          </Callout>
        </div>
      </Section>

      <Section muted eyebrow="The log" title="Recent changes">
        <ul className="space-y-3">
          {changes.map((change) => {
            const isCut = change.direction === "down";
            const notPassed = change.applied === "—";
            const Icon = notPassed ? Minus : isCut ? ArrowDownRight : ArrowUpRight;

            return (
              <li
                key={`${change.destination}-${change.detected}`}
                className="rounded-2xl border border-border bg-surface p-5 shadow-e1"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        notPassed
                          ? "bg-surface-sunken text-muted-foreground"
                          : isCut
                            ? "bg-success-subtle text-success-subtle-foreground"
                            : "bg-warning-subtle text-warning-subtle-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {change.destination}
                      </h3>
                      <p data-numeric className="mt-1 text-sm text-muted-foreground">
                        <span className="line-through">{change.from}</span>
                        {" → "}
                        <span className="font-bold text-foreground">{change.to}</span>
                      </p>
                    </div>
                  </div>

                  <dl className="flex flex-wrap gap-x-6 gap-y-1 text-2xs">
                    <div>
                      <dt className="font-bold uppercase tracking-wider text-muted-foreground">
                        Detected
                      </dt>
                      <dd className="mt-0.5 font-semibold text-subtle-foreground">
                        {change.detected}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wider text-muted-foreground">
                        Applied
                      </dt>
                      <dd className="mt-0.5 font-semibold text-subtle-foreground">
                        {change.applied}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold uppercase tracking-wider text-muted-foreground">
                        Lag
                      </dt>
                      <dd
                        className={`mt-0.5 font-bold ${
                          isCut && !notPassed
                            ? "text-success-subtle-foreground"
                            : "text-subtle-foreground"
                        }`}
                      >
                        {change.lag}
                      </dd>
                    </div>
                  </dl>
                </div>

                <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                  {change.note}
                </p>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section eyebrow="Method" title="How changes are detected and applied">
        <Prose>
          <h3>Detection</h3>
          <p>
            Every government fee schedule we depend on is polled several times a day, and the
            fee returned by each portal at quote time is compared against our stored value. A
            mismatch pages the operations team within minutes. Roughly a third of changes we
            find were never publicly announced by the issuing authority.
          </p>
          <h3>Reductions</h3>
          <p>
            Applied immediately, and any application not yet filed is automatically re-quoted
            at the lower fee. Applications already filed at the old rate are refunded the
            difference. Neither requires you to notice or ask.
          </p>
          <h3>Increases</h3>
          <p>
            Held for a minimum of <strong>72 hours</strong>. Anyone who received a quote
            before detection pays the price they were shown, and we absorb the difference. If
            an increase is announced in advance, we hold the old price until its effective
            date regardless of how long that is.
          </p>
          <h3>Changes we absorb entirely</h3>
          <p>
            Small surcharges — typically under ₹200 — are usually absorbed rather than passed
            on, because re-quoting an application mid-flow costs the traveller more in
            confusion than the amount involved. Those still appear in this log, marked as not
            passed on.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="See the rest of the numbers"
        description="Approval rates, on-time delivery and refunds, published quarterly with the misses left in."
        href="/transparency"
        label="Transparency report"
      />
    </PageShell>
  );
}
