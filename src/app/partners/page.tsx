import type { Metadata } from "next";
import { Building2, Code2, GraduationCap, Plane, Ticket, Wallet } from "lucide-react";

import {
  CTABand,
  FeatureGrid,
  PageHero,
  PageShell,
  Section,
  StatGrid,
  StepList,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Partners | Keyrise",
  description:
    "Embed visa applications into your booking flow. Keyrise partners with OTAs, airlines, corporate travel desks and universities.",
};

const segments = [
  {
    icon: <Plane className="h-5 w-5" />,
    title: "Airlines & OTAs",
    description:
      "Show real visa requirements at search time, then sell the visa alongside the fare. Requirements resolve from the passenger's passport and route in under 200ms.",
  },
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Corporate travel",
    description:
      "Bulk filing for teams, centralised billing, and a policy layer that blocks bookings to destinations an employee cannot legally enter yet.",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "Universities",
    description:
      "Student visa tracking for incoming cohorts, with document collection that starts before the offer letter is even accepted.",
  },
  {
    icon: <Wallet className="h-5 w-5" />,
    title: "Fintech & cards",
    description:
      "Bundle visa fee coverage or fast-track processing into premium travel card tiers as a redeemable benefit.",
  },
  {
    icon: <Ticket className="h-5 w-5" />,
    title: "Events & sports",
    description:
      "Group visa handling for delegations, crews and touring parties, with a single point of escalation per event.",
  },
  {
    icon: <Code2 className="h-5 w-5" />,
    title: "Direct API",
    description:
      "REST endpoints for requirements, quoting, filing and status webhooks. Sandbox keys issued same day, no call required.",
  },
];

const steps = [
  {
    title: "Scope the integration",
    description:
      "A 30-minute call to work out whether you want the hosted flow, the embedded widget or the raw API. Most partners start hosted and migrate.",
  },
  {
    title: "Sandbox access",
    description:
      "Test keys, full requirements data and simulated filing responses for all 155 destinations. No commercial commitment at this stage.",
  },
  {
    title: "Commercials",
    description:
      "Revenue share or flat per-filing pricing. Both are published in the partner agreement — there is no negotiated rate card you are not seeing.",
  },
  {
    title: "Go live",
    description:
      "Production keys, a named operations contact and a shared escalation channel. Median time from first call to first live filing is 19 days.",
  },
];

export default function PartnersPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Partners"
        title="Visas as a layer in your product"
        description="Your customer has already told you where they're going and when. That is everything needed to tell them whether they can legally board — and to get them the visa without leaving your flow."
      />

      <Section eyebrow="Coverage" title="What partners get access to">
        <StatGrid
          stats={[
            { value: "155", label: "Destinations", hint: "Requirements + filing" },
            { value: "<200ms", label: "Requirements lookup", hint: "p95 response" },
            { value: "19 days", label: "To first filing", hint: "Median onboarding" },
            { value: "99.2%", label: "On-time delivery", hint: "Backed by SLA" },
          ]}
        />
      </Section>

      <Section muted eyebrow="Who we work with" title="Five ways this gets used">
        <FeatureGrid items={segments} columns={3} />
      </Section>

      <Section eyebrow="Onboarding" title="How a partnership starts">
        <StepList steps={steps} />
      </Section>

      <CTABand
        title="Start with sandbox access"
        description="Test keys and full requirements data for all 155 destinations, issued the same day. No commercial commitment."
        href="/contact"
        label="Request access"
      />
    </PageShell>
  );
}
