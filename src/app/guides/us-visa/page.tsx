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
  title: "US Visa Guide for Indians (B1/B2) | Keyrise",
  description:
    "How to apply for a US B1/B2 visitor visa from India — DS-160, MRV fee, interview slots, what officers assess, and how to prepare.",
};

const steps = [
  {
    title: "Complete the DS-160",
    description:
      "The online application. Long, unforgiving, and it cannot be meaningfully edited after submission. Every answer must match your passport and supporting documents exactly.",
  },
  {
    title: "Pay the MRV fee",
    description:
      "₹15,500, non-refundable, valid for one year from payment. Paying it does not reserve an interview — it only makes you eligible to book one.",
  },
  {
    title: "Book two appointments",
    description:
      "Biometrics at a Visa Application Centre, then the interview at the consulate. They are separate, and biometrics must come first.",
  },
  {
    title: "Prepare for the interview",
    description:
      "This is the decision. It typically lasts under four minutes and the officer has usually formed a view within the first thirty seconds.",
  },
  {
    title: "Attend the interview",
    description:
      "Bring your passport, DS-160 confirmation and appointment letter. Supporting documents are rarely asked for, but not having them when they are is fatal.",
  },
  {
    title: "Passport collection",
    description:
      "Approved passports are returned within roughly a week. You are told the outcome at the counter, not by email.",
  },
];

export default function UsVisaGuidePage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Guide"
        title="The US visitor visa, explained"
        description="The B1/B2 is decided in a conversation lasting less than four minutes. Almost everything about preparing for it is really preparing for that."
      />

      <Section eyebrow="At a glance" title="The essentials">
        <StatGrid
          stats={[
            { value: "₹15,500", label: "MRV fee", hint: "Non-refundable" },
            { value: "10 years", label: "Typical validity", hint: "Multiple entry" },
            { value: "180 days", label: "Maximum stay", hint: "Per entry, at CBP discretion" },
            { value: null, label: "Our approval rate", hint: "Trailing quarter" },
          ]}
        />
      </Section>

      <Section muted eyebrow="Process" title="Six steps, in order">
        <div className="max-w-2xl">
          <StepList steps={steps} />
        </div>
      </Section>

      <Section eyebrow="The interview" title="What is actually being assessed">
        <Prose>
          <p>
            US law starts from a presumption that every visitor applicant intends to
            immigrate. The interview exists for you to overcome that presumption. This is
            written into the statute — section 214(b) — and understanding it reframes the
            whole exercise.
          </p>
          <h3>You are proving you will come back</h3>
          <p>
            Not that you can afford the trip, and not that you deserve to go. The officer is
            assessing your ties to India: employment, family, property, business. Everything
            you say should reinforce that you have a life here you intend to return to.
          </p>
          <h3>Answer the question asked, then stop</h3>
          <p>
            Officers conduct dozens of these a day and read hesitation and over-explanation as
            uncertainty. &ldquo;Why are you going?&rdquo; is best answered in one clear
            sentence, not a paragraph. Volunteering detail you were not asked for invites
            follow-up questions you have not prepared for.
          </p>
          <h3>Consistency with the DS-160 is critical</h3>
          <p>
            The officer has your form open. If you wrote that you are staying 14 days and say
            &ldquo;about three weeks&rdquo;, that is a discrepancy — and discrepancies are what
            the interview is designed to surface.
          </p>
          <h3>Questions that recur</h3>
          <ul>
            <li>Why are you travelling to the United States?</li>
            <li>Who is paying for the trip?</li>
            <li>Do you have relatives in the US? (Answer honestly — they can check)</li>
            <li>What do you do for work, and how long have you been there?</li>
            <li>Have you travelled abroad before?</li>
          </ul>
        </Prose>

        <div className="mt-8 max-w-3xl">
          <Callout tone="warning" title="A 214(b) refusal is not permanent">
            It means you did not overcome the presumption on that day. You can reapply
            immediately — but reapplying with the same profile and the same answers produces
            the same result. Something material has to have changed: a new job, a completed
            trip elsewhere, stronger documented ties.
          </Callout>
        </div>
      </Section>

      <Section muted eyebrow="B1 or B2" title="Which category you need">
        <Prose>
          <p>
            Most applicants are issued a combined B1/B2, which covers both. The distinction
            matters for what you may actually do on arrival.
          </p>
          <h3>B1 — business</h3>
          <p>
            Meetings, conferences, contract negotiation, consulting with associates. You may
            not take employment or be paid by a US source. Attending a conference is fine;
            being paid to speak at it is not.
          </p>
          <h3>B2 — tourism</h3>
          <p>
            Holidays, visiting family, medical treatment, and short recreational courses that
            carry no credit. Enrolling in a degree programme requires an F-1 — see the{" "}
            <a href="/student-visa">student visa</a> page.
          </p>
          <h3>The line people cross accidentally</h3>
          <p>
            Remote work for your Indian employer while on a B1/B2 sits in a genuinely grey
            area. Answering email is universally accepted; running your business from a US
            address for three months is not, and has resulted in entry refusals at the border
            even for people holding valid visas.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="Apply for a US visa"
        description="DS-160 preparation, appointment booking and structured interview practice included."
        href="/visa/united-states"
        label="Start an application"
      />
    </PageShell>
  );
}
