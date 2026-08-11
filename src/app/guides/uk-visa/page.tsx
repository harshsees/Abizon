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
  title: "UK Visa Guide for Indians (Standard Visitor) | Keyrise",
  description:
    "How to apply for a UK Standard Visitor visa from India — online application, biometrics, the cover letter that matters, fees and processing times.",
};

const steps = [
  {
    title: "Apply online",
    description:
      "The application is completed on the UK government portal and paid for before you book anything. Save your progress often — sessions expire without warning.",
  },
  {
    title: "Book biometrics",
    description:
      "Fingerprints and a photograph at a visa application centre. Slots are generally available within a few days across major Indian cities.",
  },
  {
    title: "Upload supporting documents",
    description:
      "Uploaded to the portal rather than handed over on the day. Naming files clearly makes a genuine difference — the caseworker is scanning, not studying.",
  },
  {
    title: "Write the cover letter",
    description:
      "Optional, and the single highest-leverage document in a UK application. It is your only chance to explain your circumstances in your own words.",
  },
  {
    title: "Submit your passport",
    description:
      "Left at the centre while the application is decided. Priority services can return it faster if you have travel booked.",
  },
  {
    title: "Decision",
    description:
      "Standard service is around 15 working days from biometrics. You are notified by email and collect the passport from the centre.",
  },
];

export default function UkVisaGuidePage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Guide"
        title="The UK Standard Visitor visa"
        description="No interview — the decision is made on paper by a caseworker who has never met you. That changes everything about how you should assemble the application."
      />

      <Section eyebrow="At a glance" title="The essentials">
        <StatGrid
          stats={[
            { value: "₹12,500", label: "Government fee", hint: "6-month visitor" },
            { value: "15 days", label: "Standard processing", hint: "Working days" },
            { value: "180 days", label: "Maximum stay", hint: "Per visit" },
            { value: null, label: "Our approval rate", hint: "Trailing quarter" },
          ]}
        />
      </Section>

      <Section muted eyebrow="Process" title="Six steps, in order">
        <div className="max-w-2xl">
          <StepList steps={steps} />
        </div>
      </Section>

      <Section eyebrow="The difference that matters" title="Decided on paper, not in person">
        <Prose>
          <p>
            The UK does not interview standard visitor applicants. A caseworker reads your file
            and decides. They cannot ask you a clarifying question, and they will not give you
            the benefit of the doubt on something ambiguous.
          </p>
          <h3>Every gap is filled unfavourably</h3>
          <p>
            If your bank statement shows a large credit with no explanation, the caseworker
            cannot ask where it came from. They record that the source of funds is
            unexplained, and that becomes a refusal reason. In an interview you would simply
            have answered.
          </p>
          <h3>This is what the cover letter is for</h3>
          <p>
            The cover letter is technically optional and is the most valuable thing you can
            add. Use it to pre-empt every question the caseworker might otherwise have to guess
            at:
          </p>
          <ul>
            <li>Why you are travelling, and what you will do day to day</li>
            <li>Who is paying, and if it is not you, why they are</li>
            <li>The source of any unusual credit in your statements</li>
            <li>What ties you to India — job, family, property, business</li>
            <li>Any previous visa refusal, from any country, and what has changed since</li>
          </ul>
          <h3>Keep it short and factual</h3>
          <p>
            One page. No emotional appeals, no assertions you cannot evidence. Every claim you
            make should correspond to a document in the upload. A cover letter that says things
            the file does not support is worse than none at all.
          </p>
        </Prose>

        <div className="mt-8 max-w-3xl">
          <Callout tone="warning" title="Never submit a false document">
            A document found to be false results in a mandatory refusal and a{" "}
            <strong>ten-year ban</strong> on entering the UK. This applies to fabricated bank
            statements and employment letters, which some agents still supply. It is the single
            most damaging thing that can happen to an application, and it is not recoverable.
          </Callout>
        </div>
      </Section>

      <Section muted eyebrow="Long-term options" title="Two, five and ten-year visitor visas">
        <Prose>
          <p>
            The UK offers long-term visitor visas that are worth considering if you travel
            regularly. They cost more up front and less over time.
          </p>
          <ul>
            <li>
              <strong>2-year:</strong> roughly ₹47,000. Sensible from around three trips.
            </li>
            <li>
              <strong>5-year:</strong> roughly ₹85,000. Common for people with family in the UK.
            </li>
            <li>
              <strong>10-year:</strong> roughly ₹1,06,000. Rarely economic unless you travel
              very frequently.
            </li>
          </ul>
          <p>
            Each still permits a maximum of six months per visit, and the caseworker assesses
            whether your circumstances justify the longer validity. A first-time applicant
            requesting ten years without a travel history to support it invites scrutiny that a
            six-month application would not attract.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="Apply for a UK visa"
        description="Document review, cover letter preparation and filing, with a guaranteed delivery date."
        href="/visa/united-kingdom"
        label="Start an application"
      />
    </PageShell>
  );
}
