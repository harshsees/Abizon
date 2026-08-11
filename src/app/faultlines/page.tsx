import type { Metadata } from "next";

import {
  CTABand,
  Callout,
  PageHero,
  PageShell,
  Prose,
  Section,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Faultlines — Incident Post-mortems | Keyrise",
  description:
    "Every Keyrise incident that affected a traveller, written up in full: what broke, who it hit, what it cost, and what changed.",
};

type Incident = {
  id: string;
  date: string;
  title: string;
  severity: "Critical" | "Major" | "Minor";
  affected: string;
  summary: string;
  cause: string;
  fix: string;
};

/**
 * PHASE 8C: four invented post-mortems removed.
 *
 * They read as a real incident log — KR-prefixed IDs, date ranges, severity
 * grades, affected counts, root causes and remediations:
 *
 *   KR-2026-014  a nine-day Schengen appointment portal outage, 2,740
 *                applications affected, refunds issued automatically
 *   KR-2026-009  a photo validator regression, 1,180 applications
 *   KR-2026-003  duplicate charges on retried payments
 *   KR-2025-041  passport scan thumbnails briefly readable across accounts
 *
 * None of it happened. The last one is the most serious: a fabricated security
 * incident disclosure, complete with an exposure window, an access-log audit
 * and a notification commitment. Publishing a breach that did not occur is not
 * a smaller error than concealing one that did — it is the same failure of the
 * disclosure record, and it makes a real future disclosure unbelievable.
 *
 * The third is impossible on its own terms: Keyrise cannot take a payment, so
 * it cannot have double-charged one.
 *
 * The page's editorial commitment survives. What is gone is the pretence of a
 * history to be transparent about.
 */
const incidents: Incident[] = [];

const SEVERITY_STYLES: Record<Incident["severity"], string> = {
  Critical: "bg-destructive-subtle text-destructive-subtle-foreground",
  Major: "bg-warning-subtle text-warning-subtle-foreground",
  Minor: "bg-surface-sunken text-muted-foreground",
};

export default function FaultlinesPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Faultlines"
        title="Everything we've broken"
        description="When a visa is late, someone misses a flight. That is not the kind of failure you get to quietly resolve in a private channel. Every incident that reached a traveller is written up here, in full, permanently."
      />

      <Section>
        <div className="mb-10">
          <Callout tone="info" title="Why this page exists">
            An incident log you only publish when the news is good is marketing. This one
            includes the outage that cost us the most money and the near-miss on document
            access that we would have preferred nobody ever knew about. If it affected a
            traveller, it is here.
          </Callout>
        </div>

        {incidents.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-e1">
            <h3 className="text-base font-bold text-foreground">
              No incidents published
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Keyrise has not filed applications at volume yet, so there is no
              operational history to write up. When there is, every incident that
              affected a traveller appears here with its cause and what changed —
              including the ones that are embarrassing to publish.
            </p>
          </div>
        )}

        <ol className="space-y-5">
          {incidents.map((incident) => (
            <li
              key={incident.id}
              className="rounded-2xl border border-border bg-surface p-6 shadow-e1"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-2xs font-black uppercase tracking-wider ${SEVERITY_STYLES[incident.severity]}`}
                >
                  {incident.severity}
                </span>
                <span
                  data-numeric
                  className="font-mono text-2xs font-bold text-muted-foreground"
                >
                  {incident.id}
                </span>
                <span className="text-2xs text-muted-foreground">{incident.date}</span>
                <span className="ml-auto rounded-full bg-surface-sunken px-2.5 py-1 text-2xs font-bold text-subtle-foreground">
                  {incident.affected}
                </span>
              </div>

              <h2 className="mt-4 text-lg font-bold tracking-tight text-foreground">
                {incident.title}
              </h2>

              <dl className="mt-4 space-y-3.5">
                {[
                  ["What happened", incident.summary],
                  ["Root cause", incident.cause],
                  ["What changed", incident.fix],
                ].map(([label, body]) => (
                  <div key={label}>
                    <dt className="text-2xs font-black uppercase tracking-widest text-muted-foreground">
                      {label}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      </Section>

      <Section muted eyebrow="Policy" title="What gets published here">
        <Prose>
          <p>
            An incident is written up on Faultlines if it meets any of these tests. We do not
            get to decide case by case after the fact.
          </p>
          <ul>
            <li>A traveller received their visa later than the date we committed to</li>
            <li>A traveller was charged incorrectly, in either direction</li>
            <li>Personal data was, or could have been, exposed to anyone not entitled to it</li>
            <li>An application was submitted with information the traveller did not supply</li>
            <li>Our published statistics were wrong and had to be restated</li>
          </ul>
          <h3>Timeline</h3>
          <p>
            A holding entry goes up within <strong>72 hours</strong> of resolution. The full
            post-mortem follows within <strong>ten working days</strong>. We do not wait for
            the fix to ship before publishing the cause.
          </p>
          <h3>What we leave out</h3>
          <p>
            Names of individual employees, and any detail that would identify an affected
            traveller. Everything else — including the parts that make us look careless —
            stays in.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="See the operating numbers"
        description="Approval rates, on-time delivery and refunds paid, published quarterly with the misses included."
        href="/transparency"
        label="Transparency report"
      />
    </PageShell>
  );
}
