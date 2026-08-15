import type { Metadata } from "next";
import { Banknote, CalendarClock, FileStack, GraduationCap, Mic, Plane } from "lucide-react";

import {
  CTABand,
  Callout,
  FeatureGrid,
  PageHero,
  PageShell,
  Prose,
  Section,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Student Visa | Abizon",
  description:
    "Student visa filing for the US, UK, Canada, Australia and Schengen — financial documentation, interview preparation and deadline management.",
};

const destinations = [
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "United States — F-1",
    description:
      "I-20 review, SEVIS fee, DS-160 and interview preparation. The interview is the decision point, and preparation for it is where most of the value sits.",
    meta: "3–8 weeks",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "United Kingdom — Student Route",
    description:
      "CAS verification, the 28-day maintenance funds rule, and the ATAS clearance that catches postgraduate applicants in technical subjects.",
    meta: "3–6 weeks",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "Canada — Study Permit",
    description:
      "Provincial attestation letter, GIC set-up, and a statement of purpose that addresses the return-intent question directly rather than avoiding it.",
    meta: "6–12 weeks",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "Australia — Subclass 500",
    description:
      "CoE, OSHC cover and the Genuine Student requirement, which replaced GTE in 2024 and changed what the statement needs to argue.",
    meta: "4–8 weeks",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "Schengen — National D visa",
    description:
      "Admission letter, blocked account where required, and appointment capture — which for German and Italian missions is the real constraint.",
    meta: "6–12 weeks",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "Others",
    description:
      "Ireland, New Zealand, Singapore, UAE and Japan student categories, filed on the same terms.",
    meta: "Varies",
  },
];

const support = [
  {
    icon: <Banknote className="h-5 w-5" />,
    title: "Financial documentation",
    description:
      "The most common cause of a student refusal. We work out exactly what your destination needs to see, in what form, and how far back the history must run.",
  },
  {
    icon: <Mic className="h-5 w-5" />,
    title: "Interview preparation",
    description:
      "For US applicants, structured mock interviews against the questions that actually get asked, with feedback on the answers most likely to sink you.",
  },
  {
    icon: <CalendarClock className="h-5 w-5" />,
    title: "Deadline management",
    description:
      "Course start dates are immovable. We work backwards from yours and flag every point where a delay puts the intake at risk.",
  },
  {
    icon: <FileStack className="h-5 w-5" />,
    title: "Document assembly",
    description:
      "Transcripts, English test scores, funding proof and attestations, checked against the destination's current requirements before anything is submitted.",
  },
  {
    icon: <Plane className="h-5 w-5" />,
    title: "Dependants and onward travel",
    description:
      "Spouse and child visas filed alongside yours, plus any transit visas your route requires.",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "Post-study routes",
    description:
      "Guidance on the work rights attached to your visa and the transition into post-study work, before you commit to a destination.",
  },
];

export default function StudentVisaPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Student Visa"
        title="The application that decides your year"
        description="A student visa is not a bigger tourist visa. The financial evidence is scrutinised harder, the deadlines are fixed by someone else, and for several destinations an interview decides it. This is filing built around that."
      />

      <Section eyebrow="Destinations" title="Where we file student visas">
        <FeatureGrid items={destinations} columns={3} />
      </Section>

      <Section muted eyebrow="Support" title="What's included">
        <FeatureGrid items={support} columns={3} />
      </Section>

      <Section eyebrow="Preparation" title="Start earlier than you think you need to">
        <Prose>
          <p>
            The single most useful thing a student applicant can do costs nothing and cannot
            be bought later: begin the financial history early.
          </p>
          <h3>Six months before you apply</h3>
          <p>
            Start maintaining the account that will evidence your funding. Most destinations
            want to see a consistent balance over time, not a sum that appeared recently. A
            deposit made three weeks before applying is the single most common trigger for a
            refusal on financial grounds — regardless of the amount.
          </p>
          <h3>Three months before</h3>
          <p>
            Sit your English test if you have not already, and request transcripts. University
            administrative offices are slow in ways that will surprise you, and a missing
            transcript can cost an entire intake.
          </p>
          <h3>As soon as you have your offer</h3>
          <p>
            File. For Canada and Schengen national visas, processing routinely runs to twelve
            weeks and appointment availability is the binding constraint. Waiting to be certain
            about your choice of university costs more than applying and withdrawing.
          </p>
          <h3>Two weeks before an interview</h3>
          <p>
            Begin preparation. US F-1 interviews typically last under four minutes, and the
            officer is assessing whether you are a genuine student with a plan and the means to
            follow it. Practised, specific answers matter enormously in that time.
          </p>
        </Prose>

        <div className="mt-8 max-w-3xl">
          <Callout tone="warning" title="Declare previous refusals">
            If you have been refused a visa before — any country, any category — declare it.
            Immigration authorities share this information, and an undeclared prior refusal is
            treated as misrepresentation, which is far more serious and can carry a multi-year
            bar. A declared refusal with an honest explanation is frequently approved.
          </Callout>
        </div>
      </Section>

      <CTABand
        title="Talk to someone about your intake"
        description="Tell us the destination and the start date, and we'll work backwards to tell you when to file."
        href="/contact"
        label="Get in touch"
      />
    </PageShell>
  );
}
