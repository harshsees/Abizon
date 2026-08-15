import type { Metadata } from "next";
import { BadgeCheck, Clock4, FileCheck2, ShieldCheck, Users2, Wallet } from "lucide-react";

import {
  CTABand,
  Callout,
  FeatureGrid,
  PageHero,
  PageShell,
  Prose,
  Section,
  StepList,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Defense Personnel Programme | Abizon",
  description:
    "Zero service fees on every visa for serving and retired Indian armed forces personnel and their immediate families, plus dedicated NOC handling.",
};

const benefits = [
  {
    icon: <Wallet className="h-5 w-5" />,
    title: "No service fee, ever",
    description:
      "You pay the government fee and nothing else. This is not a discount code that expires — it applies to every application, for every destination, for as long as the programme exists.",
  },
  {
    icon: <FileCheck2 className="h-5 w-5" />,
    title: "NOC and service-record handling",
    description:
      "We know which missions require a No Objection Certificate, which accept a service identity card in its place, and how each wants it attested. You upload once.",
  },
  {
    icon: <Users2 className="h-5 w-5" />,
    title: "Immediate family included",
    description:
      "Spouse, children and dependent parents travelling with you or separately. Same terms, same handling.",
  },
  {
    icon: <Clock4 className="h-5 w-5" />,
    title: "Posting-order priority",
    description:
      "Applications tied to a movement or posting order are escalated to the front of the filing queue automatically, without you needing to ask.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Discretion by default",
    description:
      "Service details are visible only to the specialist handling your filing. They are never used in analytics, never shared, and purged with the rest of your documents.",
  },
  {
    icon: <BadgeCheck className="h-5 w-5" />,
    title: "Veterans included",
    description:
      "Retired personnel and war widows qualify on the same terms. A PPO number or discharge book is sufficient verification.",
  },
];

const steps = [
  {
    title: "Verify once",
    description:
      "Upload a service identity card, PPO number or discharge book. Verification is manual and usually completes within four working hours.",
  },
  {
    title: "It attaches to your profile",
    description:
      "Once verified, the fee waiver applies automatically at checkout for you and any family member you add. You will never need to re-verify.",
  },
  {
    title: "Apply as normal",
    description:
      "The service fee line simply reads ₹0. If a destination requires an NOC, the requirement appears in your checklist with the correct format for that mission.",
  },
];

export default function DefensePersonnelPage() {
  return (
    <PageShell>
      <PageHero
        tone="dark"
        eyebrow="Defense Personnel Programme"
        title="No service fee. Not now, not later."
        description="Serving and retired personnel of the Indian Army, Navy, Air Force, Coast Guard and Central Armed Police Forces pay the government fee and nothing more — on every visa, to every destination."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Verification in ~4 working hours
          </span>
        }
      />

      <Section eyebrow="What you get" title="The programme in full">
        <FeatureGrid items={benefits} columns={3} />
      </Section>

      <Section muted eyebrow="Getting set up" title="Three steps, once">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <StepList steps={steps} />
          <div className="space-y-4">
            <Callout tone="info" title="Who qualifies">
              Serving personnel of the Indian Army, Navy, Air Force, Coast Guard and CAPF;
              retired personnel holding a PPO or discharge book; war widows; and the spouse,
              children and dependent parents of any of the above.
            </Callout>
            <Callout tone="warning" title="What we cannot waive">
              Government fees are set by the destination country and collected by them. We
              have no ability to reduce those, and any service claiming otherwise is not
              describing something real.
            </Callout>
          </div>
        </div>
      </Section>

      <Section eyebrow="NOC guidance" title="Which destinations ask for what">
        <Prose>
          <p>
            The requirement that trips up most service applications is the No Objection
            Certificate. It is not universal, the format differs by mission, and getting it
            wrong costs a full filing cycle.
          </p>
          <h3>Require a formal NOC on unit letterhead</h3>
          <ul>
            <li>Schengen missions — France, Germany, Italy, Netherlands, Switzerland, Spain</li>
            <li>United Kingdom, for both visit and transit categories</li>
            <li>United States, presented at interview rather than at filing</li>
            <li>China, Pakistan and Bangladesh, with additional MEA endorsement</li>
          </ul>
          <h3>Accept a service identity card</h3>
          <ul>
            <li>United Arab Emirates, Qatar, Oman, Bahrain and Kuwait</li>
            <li>Thailand, Vietnam, Malaysia, Indonesia and Singapore</li>
            <li>All visa-free and visa-on-arrival destinations</li>
          </ul>
          <h3>Additional clearance beyond the NOC</h3>
          <p>
            A small number of destinations require clearance from your service headquarters
            in addition to the unit NOC, typically where the posting is to a sensitive
            region. Where that applies, it appears in your document checklist with the
            correct addressee — you will not have to work it out.
          </p>
          <p>
            If you are unsure, the{" "}
            <a href="/emergency-helpline">emergency desk</a> can confirm the requirement for
            a specific mission before you begin.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="Verify your service record"
        description="One upload, roughly four working hours, and the waiver applies to every application you and your family ever make."
        href="/contact"
        label="Start verification"
      />
    </PageShell>
  );
}
