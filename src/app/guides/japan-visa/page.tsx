import type { Metadata } from "next";

import {
  CTABand,
  Callout,
  PageHero,
  PageShell,
  Prose,
  Section,
  StatGrid,
  StepList,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Japan Visa Guide for Indians | Abizon",
  description:
    "How to apply for a Japan tourist visa from India — the daily schedule requirement, documents, eVisa eligibility, fees and processing times.",
};

const steps = [
  {
    title: "Check whether you qualify for the eVisa",
    description:
      "Indian nationals applying for short-term tourism can often use the eVisa rather than filing at a consulate. It is faster and requires no passport submission.",
  },
  {
    title: "Prepare the daily schedule",
    description:
      "Japan requires a day-by-day itinerary on its own prescribed form. This is unusual, mandatory, and the most common reason applications are returned.",
  },
  {
    title: "Assemble financial documents",
    description:
      "Bank statements for six months and ITR for the last two years. Japan is less demanding than Schengen here, but the documents must still be consistent.",
  },
  {
    title: "Book flights and accommodation",
    description:
      "Reservations covering every night of the schedule. These must match the daily itinerary exactly — mismatches are treated as an incomplete application.",
  },
  {
    title: "Submit",
    description:
      "Through the eVisa portal, or at the consulate covering your state. Japan divides India between several missions and applying to the wrong one means starting again.",
  },
  {
    title: "Collect",
    description:
      "Typically 5–7 working days. The eVisa arrives by email; consulate applications require passport collection in person.",
  },
];

export default function JapanVisaGuidePage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Guide"
        title="The Japan tourist visa"
        description="Among the more straightforward applications an Indian passport holder can make — with one requirement almost nobody expects, and which sinks most first attempts."
      />

      <Section eyebrow="At a glance" title="The essentials">
        <StatGrid
          stats={[
            { value: "Free", label: "Government fee", hint: "Waived for Indian nationals" },
            { value: null, label: "Processing", hint: "Working days" },
            { value: "90 days", label: "Maximum stay", hint: "Single or multiple entry" },
            { value: null, label: "Our approval rate", hint: "Trailing quarter" },
          ]}
        />
      </Section>

      <Section muted eyebrow="Process" title="Six steps, in order">
        <div className="max-w-2xl">
          <StepList steps={steps} />
        </div>
      </Section>

      <Section eyebrow="The unusual requirement" title="The daily schedule">
        <Prose>
          <p>
            Japan asks for something no other major destination does: a{" "}
            <strong>day-by-day account of your entire trip</strong>, submitted on its own
            prescribed form. Not a rough outline — every day, with dates.
          </p>
          <h3>What each day must show</h3>
          <ul>
            <li>The date</li>
            <li>Where you will be — city, and the specific areas or attractions</li>
            <li>Where you are staying that night, with the hotel name and contact number</li>
            <li>How you are travelling between cities, if you are moving that day</li>
          </ul>
          <h3>Why it exists</h3>
          <p>
            It is a coherence test. A schedule that has you in Tokyo on Tuesday and Kyoto on
            Wednesday morning with no train booked, or a hotel reserved for four nights against
            a seven-night itinerary, reveals a trip that has not actually been planned. Japan
            reads that as an application whose stated purpose may not be the real one.
          </p>
          <h3>It does not bind you</h3>
          <p>
            You are not held to the schedule once you arrive. Nobody checks whether you
            visited the temple you listed. It has to be internally consistent and match your
            bookings — that is all.
          </p>
          <h3>The most common mistakes</h3>
          <ul>
            <li>Leaving days blank or writing &ldquo;free day&rdquo; — fill every day</li>
            <li>Hotel dates that do not cover the full stay</li>
            <li>Intercity travel with no corresponding train or flight reservation</li>
            <li>Arrival and departure dates that disagree with the flight bookings</li>
          </ul>
        </Prose>

        <div className="mt-8 max-w-3xl">
          <Callout tone="info" title="The fee is genuinely zero">
            Japan waives the visa fee for Indian nationals entirely. Any service quoting a
            government fee for a Japanese tourist visa is charging you their own fee and
            describing it as the government&apos;s. Our{" "}
            <a href="/fee-change-audit">fee change audit</a> exists partly because this is more
            common than it should be.
          </Callout>
        </div>
      </Section>

      <Section muted eyebrow="eVisa" title="Whether you can skip the consulate">
        <Prose>
          <p>
            Japan&apos;s eVisa covers short-term tourism for Indian nationals and is
            substantially easier than a consulate filing — no passport submission, no travel to
            a mission, and the visa arrives by email.
          </p>
          <h3>Suitable for</h3>
          <ul>
            <li>Single-entry tourism of up to 90 days</li>
            <li>Applicants holding an ordinary Indian passport</li>
            <li>Travellers arriving through an airport that accepts eVisa entry</li>
          </ul>
          <h3>You still need the consulate for</h3>
          <ul>
            <li>Multiple-entry visas</li>
            <li>Business travel and visits to relatives</li>
            <li>Any stay beyond 90 days</li>
            <li>Applicants with a previous Japanese visa refusal</li>
          </ul>
          <p>
            The daily schedule is required either way. It is the one part of a Japanese
            application there is no route around.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="Apply for a Japan visa"
        description="We prepare the daily schedule for you and check it against your bookings before filing."
        href="/visa/japan"
        label="Start an application"
      />
    </PageShell>
  );
}
