import type { Metadata } from "next";
import { Boxes, Cpu, GitBranch, Radar, ScanLine, Workflow } from "lucide-react";

import {
  CTABand,
  Callout,
  FeatureGrid,
  PageHero,
  PageShell,
  Section,
  StatGrid,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Engineering | abizon",
  description:
    "How abizon builds visa filing infrastructure — document intelligence, portal automation, and the systems that keep working when governments change theirs.",
};

const systems = [
  {
    icon: <ScanLine className="h-5 w-5" />,
    title: "Document intelligence",
    description:
      "MRZ extraction, face-geometry checks against 40+ national photo specs, and a classifier that rejects a bad scan while the traveller is still on the upload screen rather than three days later.",
  },
  {
    icon: <Workflow className="h-5 w-5" />,
    title: "Filing orchestration",
    description:
      "Every destination is a state machine with its own retry semantics, session handling and business-hours windows. 60+ of them run concurrently against portals with no API and no changelog.",
  },
  {
    icon: <Radar className="h-5 w-5" />,
    title: "Portal drift detection",
    description:
      "Government sites change without warning. Synthetic filings run hourly against every lane and page a human within minutes of a form field moving.",
  },
  {
    icon: <Cpu className="h-5 w-5" />,
    title: "Rejection risk scoring",
    description:
      "A model trained on historical outcomes is intended to flag the specific field most likely to sink an application before it is submitted. It is not in production yet.",
  },
  {
    icon: <GitBranch className="h-5 w-5" />,
    title: "Requirements graph",
    description:
      "Passport nationality × destination × purpose × residency, resolved to a definitive answer in under 200ms. Roughly 40,000 edges, each with a source and a last-verified date.",
  },
  {
    icon: <Boxes className="h-5 w-5" />,
    title: "Guarantee accounting",
    description:
      "The on-time promise is enforced in code: a filing that crosses its committed delivery time triggers the refund automatically, with no ticket and no request from the traveller.",
  },
];

export default function EngineeringPage() {
  return (
    <PageShell>
      <PageHero
        tone="dark"
        eyebrow="Engineering"
        title="Automating a process designed not to be"
        description="Consular filing has no API, no sandbox and no versioning. Portals change on a Tuesday with no notice. This is a write-up of the systems we built to make that reliable anyway."
      />

      <Section eyebrow="Scale" title="What the systems handle">
        <StatGrid
          stats={[
            { value: null, label: "Portal integrations", hint: "None with an API" },
            { value: null, label: "Requirement edges", hint: "Each source-dated" },
            { value: null, label: "Training outcomes", hint: "Rejection model" },
            { value: null, label: "On-time delivery", hint: "Trailing 90 days" },
          ]}
        />
      </Section>

      <Section muted eyebrow="Architecture" title="Six systems that matter">
        <FeatureGrid items={systems} columns={3} />
      </Section>

      <Section eyebrow="Principles" title="What we've learned the hard way">
        <div className="space-y-4">
          <Callout tone="info" title="Treat every portal as hostile infrastructure">
            Not malicious — just indifferent. It will change its markup, expire your session
            mid-form and rate-limit you at random. Anything that assumes stability will page
            someone at 3am. Every lane is built to fail loudly and resume exactly where it
            stopped.
          </Callout>
          <Callout tone="warning" title="Never let a model make an irreversible call">
            Document intelligence decides what to *show* a traveller, never what to submit
            on their behalf. A false negative wastes thirty seconds of their time; a false
            positive costs them a rejected application and a non-refundable government fee.
            The asymmetry sets the threshold.
          </Callout>
          <Callout tone="success" title="Make the guarantee mechanical">
            A promise enforced by a support team is a promise with an escape hatch. Ours is
            a scheduled job: it reads committed delivery times, compares them to actual
            issuance, and refunds without anyone asking. Nobody has to argue with us to
            collect.
          </Callout>
        </div>
      </Section>

      <CTABand
        title="We're hiring engineers"
        description="Backend, ML and infrastructure roles working on exactly the systems described above."
        href="/careers"
        label="See open roles"
      />
    </PageShell>
  );
}
