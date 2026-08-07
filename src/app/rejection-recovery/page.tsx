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
  title: "Rejection Recovery | Keyrise",
  description:
    "Refused a visa? Keyrise identifies the likely reason and refiles at no service cost. 71% of applications refiled through the programme are subsequently approved.",
};

const steps = [
  {
    title: "Send us the refusal",
    description:
      "Upload the refusal notice and the application that produced it. If you applied elsewhere and no longer have the application, we can usually reconstruct it from your documents.",
  },
  {
    title: "We identify the likely cause",
    description:
      "Most authorities give a generic reason or none at all. We score your application against 2M+ historical outcomes to find the fields most associated with refusal in your specific category and destination.",
  },
  {
    title: "You get a written assessment",
    description:
      "What we believe went wrong, how confident we are, and — crucially — whether we think a refile will succeed. Roughly one in six assessments concludes that it will not.",
  },
  {
    title: "We refile at no service cost",
    description:
      "If you proceed, you pay the government fee only. The government fee is unavoidable; ours is not, and charging it twice for a second attempt would be hard to defend.",
  },
];

export default function RejectionRecoveryPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Rejection Recovery"
        title="A refusal is not always the end"
        description="Most visa refusals are procedural, not personal — a document that didn't demonstrate what the officer needed to see, in a form they'd accept. Those are fixable. The ones that aren't, we'll tell you about before you spend anything."
      />

      <Section eyebrow="Results" title="How the programme has performed">
        <StatGrid
          stats={[
            { value: "71%", label: "Approved on refile", hint: "First 12 months" },
            { value: "₹0", label: "Service fee", hint: "Government fee only" },
            { value: "17%", label: "We advise against", hint: "Refile unlikely to succeed" },
            { value: "6 days", label: "Median to assessment", hint: "From upload" },
          ]}
        />
      </Section>

      <Section muted eyebrow="Process" title="How it works">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <StepList steps={steps} />
          <div className="space-y-4">
            <Callout tone="success" title="The 17% matters more than the 71%">
              A programme that refiled everything would show a worse approval rate and take
              money from people with no realistic path. Where the refusal reflects something
              structural — a prior overstay, an adverse immigration record, a genuine
              eligibility gap — we say so and do not file.
            </Callout>
            <Callout tone="warning" title="Government fees are still payable">
              Each submission carries its own government fee, and the destination keeps it
              regardless of outcome. We waive our service fee, which is the part we control.
            </Callout>
          </div>
        </div>
      </Section>

      <Section eyebrow="Causes" title="Why applications actually get refused">
        <Prose>
          <p>
            Across 2M+ filings, refusals cluster far more tightly than most applicants expect.
            These five account for the large majority of what we see.
          </p>
          <h3>1. Financial evidence that doesn&apos;t demonstrate what it needs to</h3>
          <p>
            Not <em>insufficient funds</em> — insufficient <em>demonstration</em>. A healthy
            balance that appeared as a lump sum three days before applying reads as borrowed.
            Six months of consistent statements showing an ordinary income pattern outperforms
            a larger balance with no history, every time.
          </p>
          <h3>2. Weak ties to your home country</h3>
          <p>
            The officer is assessing whether you will return. Employment letters, property
            records, family dependants and prior travel history all speak to this. Its absence
            is the most common cause of refusal for first-time travellers, and the most
            fixable.
          </p>
          <h3>3. Itinerary inconsistencies</h3>
          <p>
            Dates that do not match your bookings, a hotel booked for fewer nights than your
            stated stay, or a return flight after your visa would expire. These are read as
            carelessness at best and misrepresentation at worst.
          </p>
          <h3>4. Photo and document non-compliance</h3>
          <p>
            Entirely avoidable and still common. The{" "}
            <a href="/tools/visa-photo-creator">photo specification</a> differs by country in
            ways that catch people who reused a previous photo.
          </p>
          <h3>5. Prior immigration history</h3>
          <p>
            A previous refusal you did not declare is significantly more damaging than the
            refusal itself. Authorities share this data. Declaring a prior refusal and
            explaining it is almost always the stronger position.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="Been refused? Send it over"
        description="A written assessment within six days, and an honest answer about whether a refile is worth attempting."
        href="/contact"
        label="Start an assessment"
      />
    </PageShell>
  );
}
