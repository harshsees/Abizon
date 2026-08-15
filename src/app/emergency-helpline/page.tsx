import type { Metadata } from "next";
import { MessageSquare, Phone, PlaneTakeoff, Siren, Timer, UserCheck } from "lucide-react";

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
  title: "Emergency Visa Helpline | Abizon",
  description:
    "Flying in under 72 hours with a visa problem? The Abizon emergency desk is staffed 24/7 and escalates straight to a filing specialist.",
};

const situations = [
  {
    icon: <PlaneTakeoff className="h-5 w-5" />,
    title: "Your flight is in under 72 hours",
    description:
      "We identify which destinations are still achievable in the time you have, and file into the fastest available lane. For some destinations that is same-day.",
  },
  {
    icon: <Siren className="h-5 w-5" />,
    title: "Your visa was refused days before travel",
    description:
      "A refusal is not always final. We assess whether an immediate refile is viable, or whether an alternative visa category would be approved in time.",
  },
  {
    icon: <Timer className="h-5 w-5" />,
    title: "Your application has stalled",
    description:
      "Filed elsewhere and heard nothing? We can often establish where it actually sits, and whether a parallel application is your better option.",
  },
  {
    icon: <UserCheck className="h-5 w-5" />,
    title: "A document problem at the last minute",
    description:
      "Expired passport, name mismatch, missing NOC. Some of these are fixable in hours; the desk will tell you honestly which ones are not.",
  },
  {
    icon: <MessageSquare className="h-5 w-5" />,
    title: "You're already abroad",
    description:
      "Overstay risk, a transit visa you did not know you needed, or an onward leg that requires one. Handled on local hours wherever you are.",
  },
  {
    icon: <Phone className="h-5 w-5" />,
    title: "You just need a straight answer",
    description:
      "No application, no obligation. If the answer is that you cannot make this trip, we would rather tell you now than sell you a filing that will not land.",
  },
];

export default function EmergencyHelplinePage() {
  return (
    <PageShell>
      <PageHero
        tone="dark"
        eyebrow="Emergency Helpline"
        title="Flying soon and something's wrong"
        description="The emergency desk exists for the applications where a day matters. It is staffed around the clock by filing specialists — not a first-line queue that takes a message and promises a callback."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            Open now · median answer 90 seconds
          </span>
        }
        actions={
          <>
            <a
              href="tel:+911140845678"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
            >
              <Phone className="h-4 w-4" />
              +91 11 4084 5678
            </a>
            <a
              href="mailto:emergency@abizon.com"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-bold text-white hover:border-slate-600"
            >
              <MessageSquare className="h-4 w-4" />
              emergency@abizon.com
            </a>
          </>
        }
      />

      <Section eyebrow="Performance" title="What the desk delivers">
        <StatGrid
          stats={[
            { value: null, label: "Median answer time", hint: "Voice, 24/7" },
            { value: "24/7", label: "Staffed", hint: "Including public holidays" },
            { value: null, label: "Fastest filing to visa", hint: "UAE, achieved" },
            { value: null, label: "Made their flight", hint: "Of emergency cases" },
          ]}
        />
      </Section>

      <Section muted eyebrow="When to call" title="Six situations we handle daily">
        <FeatureGrid items={situations} columns={3} />
      </Section>

      <Section eyebrow="Honesty" title="What we will and won't tell you">
        <div className="max-w-3xl space-y-4">
          <Callout tone="warning" title="Some trips genuinely cannot be saved">
            If your flight is in 36 hours and you need a Schengen visa, no service on earth
            can deliver it — the appointment alone takes longer. The desk will say so in the
            first minute rather than taking a payment against a filing that cannot land. That
            is the whole reason to call someone who files these rather than someone who sells
            them.
          </Callout>
          <Callout tone="info" title="Emergency handling is not a separate fee">
            There is no surcharge for calling the emergency desk, and no premium tier that
            buys you a faster government. Where a destination offers an official expedited
            category, we will tell you what it costs and whether it is worth it — the
            government fee is theirs, not ours.
          </Callout>
          <Callout tone="success" title="You do not have to be a customer">
            The desk answers whether or not you filed with us. If the right answer is that you
            should go directly to a consulate tomorrow morning, that is the advice you will
            get.
          </Callout>
        </div>
      </Section>

      <CTABand
        title="Not an emergency?"
        description="Standard applications get the same specialists, just without the 90-second phone queue."
        href="/contact"
        label="Regular support"
      />
    </PageShell>
  );
}
