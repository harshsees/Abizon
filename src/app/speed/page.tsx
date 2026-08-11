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
  title: "Speed | Keyrise",
  description:
    "Median and 95th-percentile visa delivery times by destination, measured from payment to visa in hand.",
};

type Lane = {
  destination: string;
  promised: string;
  median: string;
  p95: string;
  /** Median as a share of the promised window — under 100% is good. */
  ratio: number;
};

const lanes: Lane[] = [
  { destination: "United Arab Emirates", promised: "24 hrs", median: "18 hrs", p95: "23 hrs", ratio: 75 },
  { destination: "Thailand", promised: "3 days", median: "2.1 days", p95: "2.9 days", ratio: 70 },
  { destination: "Vietnam", promised: "4 days", median: "2.8 days", p95: "3.8 days", ratio: 70 },
  { destination: "Singapore", promised: "4 days", median: "3.2 days", p95: "3.9 days", ratio: 80 },
  { destination: "Sri Lanka", promised: "3 days", median: "1.4 days", p95: "2.6 days", ratio: 47 },
  { destination: "Malaysia", promised: "3 days", median: "1.9 days", p95: "2.8 days", ratio: 63 },
  { destination: "Japan", promised: "6 days", median: "4.6 days", p95: "5.8 days", ratio: 77 },
  { destination: "United Kingdom", promised: "8 days", median: "6.9 days", p95: "7.9 days", ratio: 86 },
  { destination: "Schengen Area", promised: "10 days", median: "8.4 days", p95: "9.8 days", ratio: 84 },
];

export default function SpeedPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Speed"
        title="How fast, actually"
        description="Not the fastest we've ever managed. The median and the 95th percentile, measured from the moment you pay to the moment the visa is in your inbox — including the time spent waiting on a government."
      />

      <Section eyebrow="Overall" title="Across every destination">
        <StatGrid
          stats={[
            { value: null, label: "Median delivery", hint: "All destinations" },
            { value: null, label: "95th percentile", hint: "19 in 20 arrive by here" },
            { value: null, label: "Inside the promise", hint: "Trailing 90 days" },
            { value: null, label: "Median support reply", hint: "24/7" },
          ]}
        />
      </Section>

      <Section muted eyebrow="By destination" title="Promised versus delivered">
        <ul className="space-y-3">
          {lanes.map((lane) => (
            <li
              key={lane.destination}
              className="rounded-2xl border border-border bg-surface p-5 shadow-e1"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-foreground">{lane.destination}</h3>
                <p className="text-xs text-muted-foreground">
                  Promised <span className="font-bold text-subtle-foreground">{lane.promised}</span>
                  {" · "}
                  median <span className="font-bold text-foreground">{lane.median}</span>
                  {" · "}
                  p95 <span className="font-bold text-subtle-foreground">{lane.p95}</span>
                </p>
              </div>

              {/* Track = the promised window. Fill = where the median lands in it. */}
              <div
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
                role="img"
                aria-label={`Median delivery is ${lane.ratio}% of the promised ${lane.promised} window`}
              >
                <div
                  className="h-full rounded-full bg-success"
                  style={{ width: `${lane.ratio}%` }}
                />
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Callout tone="info" title="Why the bar never reaches the end">
            The track is the window we committed to at checkout; the fill is where the median
            application actually landed. A short bar means we are quoting conservatively — we
            would rather under-promise than explain a miss. Where p95 approaches the promise,
            that lane is a candidate for a shorter quoted window next quarter.
          </Callout>
        </div>
      </Section>

      <Section eyebrow="Method" title="What's being measured">
        <Prose>
          <h3>The clock starts at payment</h3>
          <p>
            Not at submission, not when a specialist picks it up. If you pay at 23:50 and we
            file at 09:00 the next morning, those nine hours count against us. Time spent
            waiting for <strong>you</strong> to upload a missing document is excluded — that
            is the only exclusion.
          </p>
          <h3>The clock stops at delivery</h3>
          <p>
            When the visa document is in your inbox and visible in your profile. Not when the
            government approved it internally, which can be hours earlier and is not something
            you can act on.
          </p>
          <h3>Why the 95th percentile is published</h3>
          <p>
            A median is easy to look good on and tells you nothing about your risk. The p95 is
            the number that matters when you have a flight booked: nineteen applications in
            twenty arrive at or before it. Where we quote a delivery date at checkout, it is
            set from the p95, not the median.
          </p>
          <h3>Appointment-based destinations</h3>
          <p>
            The United States and some Schengen categories require an in-person appointment
            whose date is set by the mission, not by us. Those are excluded from the medians
            above, because including them would measure consulate calendars rather than our
            filing speed. They appear separately in the{" "}
            <a href="/transparency">transparency report</a>.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="See the live picture"
        description="Current operational status for every filing lane, updated every 60 seconds."
        href="/status"
        label="System status"
      />
    </PageShell>
  );
}
