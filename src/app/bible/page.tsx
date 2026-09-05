import type { Metadata } from "next";
import {
  Banknote,
  BookOpen,
  Briefcase,
  FileSignature,
  Landmark,
  Luggage,
  Plane,
  ShieldQuestion,
  Users,
} from "lucide-react";

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
  title: "The Visa Bible | abizon",
  description:
    "A complete reference on visa categories, documentation, refusals and appeals — written to be understood, not just followed.",
};

const chapters = [
  {
    icon: <Luggage className="h-5 w-5" />,
    title: "1. Tourist and visitor visas",
    description:
      "The most common category and the most misunderstood. What officers are actually assessing, and why 'proving you'll come back' is the whole exercise.",
    meta: "12 min",
  },
  {
    icon: <Briefcase className="h-5 w-5" />,
    title: "2. Business visas",
    description:
      "Where the line between permitted business activity and unauthorised work sits, and why crossing it accidentally is easier than most travellers realise.",
    meta: "9 min",
  },
  {
    icon: <Plane className="h-5 w-5" />,
    title: "3. Transit visas",
    description:
      "The category people discover at the airport. Which airports require one even when you never leave the terminal, and which do not.",
    meta: "6 min",
  },
  {
    icon: <Banknote className="h-5 w-5" />,
    title: "4. Financial documentation",
    description:
      "What a bank statement is actually being read for, why a lump-sum deposit hurts you, and how far back the history needs to run by destination.",
    meta: "15 min",
  },
  {
    icon: <FileSignature className="h-5 w-5" />,
    title: "5. Cover and invitation letters",
    description:
      "The two documents applicants most often write badly. Structure, what to include, and the claims that create problems rather than solving them.",
    meta: "11 min",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "6. Family and dependant visas",
    description:
      "Travelling with children, sole-custody consent letters, and the documentation that trips up separated or blended families.",
    meta: "10 min",
  },
  {
    icon: <ShieldQuestion className="h-5 w-5" />,
    title: "7. Refusals and appeals",
    description:
      "How to read a refusal notice, which grounds are appealable, and when refiling is a better use of your time than appealing.",
    meta: "14 min",
  },
  {
    icon: <Landmark className="h-5 w-5" />,
    title: "8. Interviews",
    description:
      "What is being assessed in the four minutes you get, the questions that recur across missions, and the answers that cause problems.",
    meta: "13 min",
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "9. Glossary",
    description:
      "Every term you'll meet — CAS, MRZ, VoA, ETA, ESTA, VFS, biometric enrolment — defined without circular reference to other jargon.",
    meta: "Reference",
  },
];

export default function BiblePage() {
  return (
    <PageShell>
      <PageHero
        tone="dark"
        eyebrow="The Visa Bible"
        title="Understand it, don't just complete it"
        description="Most visa guidance tells you which boxes to tick. This explains what the person reading your application is trying to establish — which is the only way to work out what your specific case actually needs."
      />

      <Section eyebrow="Contents" title="Nine chapters">
        <FeatureGrid items={chapters} columns={3} />
      </Section>

      <Section muted eyebrow="Start here" title="The one idea that explains most refusals">
        <Prose>
          <p>
            Almost every visa decision comes down to a single question the officer is trying to
            answer, and it is rarely the one applicants think they are being asked.
          </p>
          <h2>They are not assessing whether you deserve to travel</h2>
          <p>
            They are assessing <strong>risk</strong> — specifically, the probability that you
            will do something other than what you said you would. Overstay, work without
            authorisation, or claim asylum. Nothing in a standard application is a moral
            judgement about you, which is why taking a refusal personally leads people to
            refile the same application with more indignation and no more evidence.
          </p>
          <h2>Everything you submit is evidence toward that question</h2>
          <p>
            Your employment letter is not proof that you have a job. It is evidence that you
            have a reason to return. Your bank statement is not proof that you can afford the
            trip; it is evidence that the trip is ordinary for someone with your finances. Once
            you see documents this way, it becomes obvious why a sudden large deposit weakens
            an application that a smaller, older balance would have carried.
          </p>
          <h2>The strongest applications are consistent</h2>
          <p>
            An officer spends a few minutes on your file. What they notice is friction —
            dates that do not line up, a hotel booked for four nights against a seven-night
            stay, a salary that does not match the trip. Each individually is minor. Together
            they read as a story that does not hold, and that is what a refusal usually is.
          </p>
          <p>
            Chapter 4 covers financial evidence in detail, and chapter 7 covers what to do
            when a decision has already gone against you.
          </p>
        </Prose>

        <div className="mt-8 max-w-3xl">
          <Callout tone="info" title="This is general guidance">
            Immigration rules change frequently and vary by nationality, and nothing here is
            legal advice. For a definitive answer on a specific case, check the{" "}
            <a href="/tools/visa-requirements">requirements checker</a>, which is kept current
            against the issuing authorities.
          </Callout>
        </div>
      </Section>

      <CTABand
        title="Apply with this already handled"
        description="Every application through abizon is checked against the destination's requirements before it's submitted."
        href="/"
        label="Browse destinations"
      />
    </PageShell>
  );
}
