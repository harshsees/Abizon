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

const incidents: Incident[] = [
  {
    id: "KR-2026-014",
    date: "09–18 May 2026",
    title: "Schengen appointment portal outage",
    severity: "Critical",
    affected: "2,740 applications",
    summary:
      "The shared appointment system used by fifteen Schengen missions in India was unavailable for nine days. We could not book slots, and we had sold delivery dates that assumed we could.",
    cause:
      "A third-party dependency with no contractual SLA and no status page. Our monitoring detected the outage in eleven minutes; it did not help, because there was no alternative filing path.",
    fix:
      "We stopped selling committed Schengen dates during confirmed outages, and now show a range instead. We also built a manual walk-in fallback with three missions. Refunds were issued automatically to all 2,740.",
  },
  {
    id: "KR-2026-009",
    date: "22 Mar 2026",
    title: "Photo validator rejected valid Japanese-spec photos",
    severity: "Major",
    affected: "1,180 applications",
    summary:
      "A model update tightened head-height tolerance beyond the actual Japanese specification. Travellers with compliant photos were told to retake them, some repeatedly.",
    cause:
      "The tolerance change shipped without a regression suite covering per-country specs. Our test set was dominated by Schengen photos, where the tighter bound happens to be correct.",
    fix:
      "Per-destination golden test sets, run on every model change. The validator now fails open — an uncertain photo is flagged for human review rather than rejected outright.",
  },
  {
    id: "KR-2026-003",
    date: "07 Feb 2026",
    title: "Duplicate charges on retried payments",
    severity: "Major",
    affected: "412 travellers",
    summary:
      "A payment gateway timeout caused our retry logic to submit a second charge for applications where the first had actually succeeded.",
    cause:
      "Retries keyed on our internal request ID rather than an idempotency key shared with the gateway. A timeout is not a failure, and we were treating it as one.",
    fix:
      "Proper idempotency keys on every payment call. All duplicates were refunded within 36 hours of detection, before most travellers noticed.",
  },
  {
    id: "KR-2025-041",
    date: "14 Nov 2025",
    title: "Passport scans briefly readable across accounts",
    severity: "Critical",
    affected: "0 confirmed accesses",
    summary:
      "For 43 minutes, a misconfigured cache could return another traveller's document thumbnail to a logged-in user requesting their own.",
    cause:
      "A CDN caching rule added for performance did not include the session identifier in its cache key. Document blobs were correctly scoped; the thumbnail path was not.",
    fix:
      "Thumbnails now share the document store's access path and are never cached at the edge. We audited all access logs for the window and found no cross-account reads. Every affected traveller was notified within 24 hours regardless.",
  },
];

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
