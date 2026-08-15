import type { Metadata } from "next";

import { CTABand, Callout, PageHero, PageShell, Prose, Section } from "@/components/PageKit";
import { VisaRequirementsTool } from "@/components/tools/VisaRequirementsTool";

export const metadata: Metadata = {
  title: "Visa Requirements Checker — 155 Destinations | Abizon",
  description:
    "Check visa requirements, fees, validity and processing time for any of 155 destinations on an Indian passport.",
};

export default function VisaRequirementsPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Visa Requirements"
        title="Do you need a visa?"
        description="Search any destination and get the visa type, government fee, validity, processing time and exact document list — resolved from the same data that drives our filing lanes."
      />

      <Section>
        <VisaRequirementsTool />
      </Section>

      <Section muted eyebrow="Reading the result" title="What the visa types mean">
        <Prose>
          <h3>Visa free</h3>
          <p>
            You can board with just your passport. Some visa-free destinations still require
            an arrival card, a health declaration or proof of onward travel — those are not
            visas, but being without one will still stop you at the gate.
          </p>
          <h3>Visa on arrival</h3>
          <p>
            Issued at the border. You do not apply in advance, but you do need to arrive with
            the required documents and, usually, the fee in cash. Approval is at the
            discretion of the officer at the counter, which is the part people underestimate.
          </p>
          <h3>e-Visa</h3>
          <p>
            Applied for and issued online before you travel. The visa is linked to your
            passport number electronically; most countries no longer require you to print it,
            though carrying a copy costs nothing.
          </p>
          <h3>Sticker visa</h3>
          <p>
            A physical label placed in your passport, which means your passport has to
            physically reach the consulate. These take the longest, require the most
            supporting documents, and often involve an appointment.
          </p>
        </Prose>

        <div className="mt-8">
          <Callout tone="warning" title="Requirements change without notice">
            Governments revise entry rules — sometimes with a few days&apos; notice, sometimes
            with none. Every record here carries a last-verified date internally and is
            re-checked against the issuing authority several times a day. If you are
            travelling within a week, confirm on the destination&apos;s own page before you
            book anything non-refundable.
          </Callout>
        </div>
      </Section>

      <CTABand
        title="Already know where you're going?"
        description="Browse all 155 destinations with live fees, processing times and guaranteed delivery dates."
        href="/"
        label="Browse destinations"
      />
    </PageShell>
  );
}
