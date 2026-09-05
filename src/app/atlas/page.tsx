import type { Metadata } from "next";
import { BookOpen, Building2, Globe2, LineChart, PlaneTakeoff, Users2 } from "lucide-react";

import {
  CTABand,
  FeatureGrid,
  PageHero,
  PageShell,
  Prose,
  Section,
  StatGrid,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "abizon Atlas | Travel & Mobility Research",
  description:
    "abizon Atlas publishes original research on visa policy, mobility trends and outbound travel, built on anonymised filing data.",
};

const reports = [
  {
    icon: <LineChart className="h-5 w-5" />,
    title: "The Outbound Index 2026",
    description:
      "Where Indian travellers went this year versus last, by destination, season and visa category. Includes the first measured effect of Sri Lanka's ETA fee cut on arrival volumes.",
    meta: "Jul 2026",
  },
  {
    icon: <Globe2 className="h-5 w-5" />,
    title: "Visa-free is not the same as frictionless",
    description:
      "Twenty-two destinations require no visa but do require an arrival card, a health declaration or proof of onward travel. We measured how often travellers get caught out.",
    meta: "Jun 2026",
  },
  {
    icon: <Users2 className="h-5 w-5" />,
    title: "Why Schengen applications get refused",
    description:
      "An analysis of 96,000 Schengen filings and the specific fields most associated with refusal. Insufficient financial evidence is the headline, but not the biggest surprise.",
    meta: "May 2026",
  },
  {
    icon: <PlaneTakeoff className="h-5 w-5" />,
    title: "The 72-hour traveller",
    description:
      "One in nine applications is filed within three days of departure. Who they are, where they go, and how often they make the flight.",
    meta: "Apr 2026",
  },
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Business travel's visa tax",
    description:
      "The true cost of visa friction for Indian companies, measured in employee hours rather than fees. The fee turns out to be the smaller number.",
    meta: "Mar 2026",
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "A field guide to processing times",
    description:
      "What governments publish, what actually happens, and the gap between them across 155 destinations.",
    meta: "Feb 2026",
  },
];

export default function AtlasPage() {
  return (
    <PageShell>
      <PageHero
        tone="dark"
        eyebrow="abizon Atlas"
        title="Research on how the world actually moves"
        description="We see several hundred thousand visa applications a quarter. Aggregated and stripped of anything identifying, that is a uniquely direct measure of where people are going and what stops them. Atlas is where we publish it."
      />

      <Section eyebrow="The dataset" title="What Atlas is built on">
        <StatGrid
          stats={[
            { value: null, label: "Applications analysed", hint: "Since 2023" },
            { value: "152", label: "Destinations covered", hint: "All filing lanes" },
            { value: null, label: "Requirement records", hint: "Each source-dated" },
            { value: "Quarterly", label: "Publication", hint: "Free, no registration" },
          ]}
        />
      </Section>

      <Section muted eyebrow="Reports" title="Published research">
        <FeatureGrid items={reports} columns={3} />
      </Section>

      <Section eyebrow="Method" title="How we handle the data">
        <Prose>
          <p>
            Publishing research off the back of customer applications only works if the
            customers are never identifiable in it. The constraints below are not editorial
            preferences — they are enforced in the pipeline that produces every figure.
          </p>
          <h3>Aggregation floor</h3>
          <p>
            No figure is published from a cell containing fewer than{" "}
            <strong>1,000 applications</strong>. Where a destination or category falls below
            that, it is either merged into a broader group or omitted. This is why some small
            destinations never appear in Atlas despite us filing for them.
          </p>
          <h3>No document content, ever</h3>
          <p>
            Atlas draws on application <em>metadata</em> — destination, category, timing,
            outcome. It never touches the contents of a passport scan, a bank statement or a
            photograph. Those are deleted 30 days after an outcome in any case, as described
            in <a href="/security">Security</a>.
          </p>
          <h3>Outcomes are not attributed</h3>
          <p>
            Refusal analysis works on the reason codes governments return, aggregated across
            thousands of filings. We do not publish, and cannot reconstruct, why any
            individual application was refused.
          </p>
          <h3>Corrections</h3>
          <p>
            Where a published figure turns out to be wrong, the report is amended in place
            with a dated correction note at the top. We do not quietly re-publish. The two
            corrections issued so far are both recorded in the{" "}
            <a href="/transparency">transparency report</a>.
          </p>
          <h3>Reuse</h3>
          <p>
            Atlas reports are free to cite, quote and reproduce with attribution. Journalists
            wanting a cut of the data not covered by a published report can request it
            through <a href="/newsroom">the newsroom</a>; we can usually turn those around
            within a working day.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="Put the research to use"
        description="Requirements data, processing times and filing for 155 destinations, available through the partner API."
        href="/partners"
        label="Partner with us"
      />
    </PageShell>
  );
}
