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
  title: "Schengen Visa Guide for Indians | Abizon",
  description:
    "How to apply for a Schengen visa from India — which country to apply to, documents, appointment strategy, fees and the 90/180 rule explained.",
};

const steps = [
  {
    title: "Work out which country handles your application",
    description:
      "Single destination: that country. Multiple: wherever you spend the most nights. Equal nights: wherever you enter first. Applying to the wrong mission is grounds for refusal on its own.",
  },
  {
    title: "Secure an appointment",
    description:
      "This is the real bottleneck, not the paperwork. Waits run from 4 days to over a month depending on mission and city. Book before your documents are complete — you can finish those while you wait.",
  },
  {
    title: "Assemble financial evidence",
    description:
      "Six months of bank statements, ITR for the last two years, and a salary slip or business proof. Consistency over time matters far more than the closing balance.",
  },
  {
    title: "Book refundable travel",
    description:
      "You need flight reservations and accommodation covering the whole stay, but never buy non-refundable tickets before approval. Reservations are sufficient and are what we file.",
  },
  {
    title: "Attend biometrics",
    description:
      "Fingerprints and a photograph at the visa centre, valid for 59 months. If you've given biometrics for a Schengen visa in the last five years, you can usually skip this.",
  },
  {
    title: "Wait, then collect",
    description:
      "Standard processing is 15 calendar days, though it can extend to 45 in peak season. Your passport stays with the mission throughout.",
  },
];

export default function SchengenVisaGuidePage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Guide"
        title="The Schengen visa, explained"
        description="Twenty-nine countries, one visa, and a set of rules that decide which embassy you're allowed to apply to. Get that part wrong and nothing else matters."
      />

      <Section eyebrow="At a glance" title="The essentials">
        <StatGrid
          stats={[
            { value: "₹8,200", label: "Government fee", hint: "€90, adults" },
            { value: "15 days", label: "Standard processing", hint: "Up to 45 in peak" },
            { value: "90/180", label: "Maximum stay", hint: "Rolling window" },
            { value: "29", label: "Countries covered", hint: "One visa" },
          ]}
        />
      </Section>

      <Section muted eyebrow="Process" title="Six steps, in order">
        <div className="max-w-2xl">
          <StepList steps={steps} />
        </div>
      </Section>

      <Section eyebrow="The rule everyone gets wrong" title="90 days in any 180">
        <Prose>
          <p>
            The 90/180 rule is the most misunderstood thing in European travel, and
            miscounting it is an overstay regardless of intent.
          </p>
          <h3>It is not a calendar period</h3>
          <p>
            There is no &ldquo;first half of the year&rdquo; allowance that resets. The window
            is <strong>rolling</strong>: on any given day, look back over the previous 180 days
            and count how many of those you spent inside the Schengen area. That number must
            not exceed 90.
          </p>
          <h3>A worked example</h3>
          <p>
            You spend all of January and February in Spain — 59 days. You return in June for
            40 days. On the last day of that June trip, the preceding 180 days include roughly
            30 days of your winter trip plus all 40 of the current one. You are at 70 and
            fine. Push the June trip to 55 days and you cross 90 without ever having taken a
            trip longer than two months.
          </p>
          <h3>Days of entry and exit both count</h3>
          <p>
            A day on which you are physically present at any point counts as a full day. A
            flight landing at 23:00 and one departing at 06:00 each consume a whole day of your
            allowance.
          </p>
          <h3>Your visa validity is not your permitted stay</h3>
          <p>
            A two-year multiple-entry visa does not permit two years of residence. It permits
            entry over two years, subject to 90 days in any 180 throughout. This is the single
            most common cause of accidental overstay among frequent travellers.
          </p>
        </Prose>

        <div className="mt-8 max-w-3xl">
          <Callout tone="danger" title="Overstaying has long consequences">
            Even a few days can result in an entry ban of one to five years across all 29
            countries, and it will appear on every subsequent visa application you make
            anywhere. If you realise mid-trip that you have miscounted, leave — do not wait to
            see whether anyone notices at the border.
          </Callout>
        </div>
      </Section>

      <Section muted eyebrow="Refusals" title="Why Schengen applications get refused">
        <Prose>
          <p>
            Schengen is among the harder applications to get right. Refusals cluster
            tightly, and almost all of them come down to the same few causes:
          </p>
          <ul>
            <li>
              <strong>Financial evidence.</strong> A large deposit shortly before applying is
              read as borrowed funds. Six months of ordinary, consistent statements beat a
              bigger balance with no history.
            </li>
            <li>
              <strong>Purpose of stay not established.</strong> Usually an itinerary that
              doesn&apos;t hold together — bookings that don&apos;t match stated dates, or a
              trip whose stated purpose doesn&apos;t fit the pattern of travel.
            </li>
            <li>
              <strong>Intention to leave not established.</strong> Weak employment evidence, no
              property or family ties, and no prior international travel history.
            </li>
            <li>
              <strong>Wrong mission.</strong> Applying to a country that is not your main
              destination. Straightforwardly avoidable, and still common.
            </li>
          </ul>
          <p>
            If you have already been refused,{" "}
            <a href="/rejection-recovery">Rejection Recovery</a> assesses the likely cause and
            refiles at no service cost.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="Apply for a Schengen visa"
        description="Includes appointment capture — median wait drops from 47 days to 9."
        href="/visa/france"
        label="Start an application"
      />
    </PageShell>
  );
}
