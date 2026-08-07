import type { Metadata } from "next";
import { Compass, Globe2, HeartHandshake, Rocket, Scale, Users } from "lucide-react";

import {
  CTABand,
  FeatureGrid,
  PageHero,
  PageShell,
  Section,
  StatGrid,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Careers | Keyrise",
  description:
    "Build the infrastructure that lets anyone travel anywhere. Open engineering, operations and design roles across New Delhi, Dubai and New York.",
};

const values = [
  {
    icon: <Compass className="h-5 w-5" />,
    title: "Bias to the traveller",
    description:
      "Every argument ends with the same question: does this get someone their visa faster? If a decision is good for us and neutral for them, it is not a good decision.",
  },
  {
    icon: <Scale className="h-5 w-5" />,
    title: "Show the maths",
    description:
      "We publish our fee breakdown, our approval rates and our misses. Nobody here has to defend a number they cannot explain.",
  },
  {
    icon: <Rocket className="h-5 w-5" />,
    title: "Ship the boring half",
    description:
      "The interesting 80% of a feature takes a week. The unglamorous last 20% is what makes it trustworthy. We staff for the second part.",
  },
  {
    icon: <HeartHandshake className="h-5 w-5" />,
    title: "Own the outcome",
    description:
      "When a visa is late, the person who owned it writes the post-mortem and calls the traveller. No queue to hide behind.",
  },
];

const roles = [
  {
    title: "Senior Backend Engineer, Filing Infrastructure",
    description:
      "Own the systems that submit applications to 60+ government portals and keep working when those portals change without notice.",
    meta: "New Delhi",
  },
  {
    title: "Machine Learning Engineer, Document Intelligence",
    description:
      "Passport MRZ extraction, photo compliance scoring and rejection-risk prediction across 40 document types.",
    meta: "New Delhi",
  },
  {
    title: "Product Designer",
    description:
      "Design the application flow itself — the highest-stakes form most people fill in all year.",
    meta: "Remote (IST)",
  },
  {
    title: "Visa Operations Specialist, Schengen",
    description:
      "Run appointment capture and consulate liaison for the fifteen busiest Schengen missions in India.",
    meta: "New Delhi",
  },
  {
    title: "Visa Operations Specialist, GCC",
    description:
      "Own UAE, Saudi and Qatar filing lanes end to end, including same-day escalations.",
    meta: "Dubai",
  },
  {
    title: "Customer Experience Lead",
    description:
      "Build the team that answers at 2am when someone's flight is at 6am. Emergency helpline ownership included.",
    meta: "Dubai",
  },
  {
    title: "Data Analyst, Approval Rates",
    description:
      "Turn 2M+ historical applications into the rejection-risk signals that power Rejection Recovery.",
    meta: "New Delhi",
  },
  {
    title: "Partnerships Manager, Travel",
    description:
      "Bring Keyrise to OTAs, airlines and corporate travel desks as an embedded visa layer.",
    meta: "New York",
  },
];

const benefits = [
  {
    icon: <Globe2 className="h-5 w-5" />,
    title: "A visa budget, obviously",
    description:
      "Every employee gets four fully funded international trips a year. You cannot build this well without using it.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Family cover from day one",
    description:
      "Health insurance for you, your partner, your children and your parents. No waiting period, no tiering by seniority.",
  },
  {
    icon: <Rocket className="h-5 w-5" />,
    title: "Equity in every offer",
    description:
      "Including operations and support roles. A ten-year exercise window, so leaving never costs you what you earned.",
  },
];

export default function CareersPage() {
  return (
    <PageShell>
      <PageHero
        tone="dark"
        eyebrow="Careers"
        title="Make borders boring"
        description="Two billion people need a visa to go almost anywhere. The process is paperwork, queues and guesswork. We are replacing it with software — and we are hiring across engineering, operations and design."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300">
            <span className="h-2 w-2 rounded-full bg-success" />
            {roles.length} open roles across 3 offices
          </span>
        }
      />

      <Section
        eyebrow="By the numbers"
        title="What you would be joining"
        description="Keyrise processes visa applications for travellers across India, the GCC and the United States."
      >
        <StatGrid
          stats={[
            { value: "2M+", label: "Applications filed", hint: "Since launch" },
            { value: "155", label: "Destinations", hint: "e-Visa, sticker and VoA" },
            { value: "99.2%", label: "On-time delivery", hint: "Trailing 90 days" },
            { value: "180", label: "People", hint: "Across 3 offices" },
          ]}
        />
      </Section>

      <Section
        muted
        eyebrow="How we work"
        title="Four things we actually argue about"
        description="Values are only real if they settle disagreements. These settle ours."
      >
        <FeatureGrid items={values} columns={2} />
      </Section>

      <Section
        id="open-roles"
        eyebrow="Open roles"
        title="Where we need people right now"
        description="Every role is open to candidates who need visa sponsorship. It would be strange if it weren't."
      >
        <FeatureGrid items={roles} columns={2} />
      </Section>

      <Section muted eyebrow="Benefits" title="What we offer">
        <FeatureGrid items={benefits} columns={3} />
      </Section>

      <CTABand
        title="Don't see your role?"
        description="We keep a standing file for exceptional operations and infrastructure people. Tell us what you would fix first."
        href="/contact"
        label="Get in touch"
      />
    </PageShell>
  );
}
