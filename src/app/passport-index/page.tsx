import type { Metadata } from "next";

import { CTABand, Callout, PageHero, PageShell, Prose, Section } from "@/components/PageKit";
import { PassportIndexTable } from "@/components/tools/PassportIndexTable";

export const metadata: Metadata = {
  title: "Abizon Passport Index — Passport Rankings | Abizon",
  description:
    "How far every passport takes you, ranked by visa-free and visa-on-arrival access across the world.",
};

export default function PassportIndexPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Passport Index"
        title="How far does your passport take you?"
        description="Ranked by the number of destinations reachable without applying for a visa in advance. Search any passport, or sort by the measure you care about."
      />

      <Section>
        <PassportIndexTable />
      </Section>

      <Section muted eyebrow="Method" title="What's being counted">
        <Prose>
          <h3>Visa-free</h3>
          <p>
            Destinations you can enter on your passport alone, with no prior application and
            no fee at the border. Electronic travel authorisations like ESTA and the UK ETA
            are <strong>excluded</strong> from this column — they are cheap and fast, but they
            are still something you have to obtain before you fly, and treating them as
            visa-free overstates mobility.
          </p>
          <h3>On arrival</h3>
          <p>
            Destinations issuing a visa at the border on presentation of your passport. These
            usually carry a fee and are granted at the officer&apos;s discretion, which is why
            they are counted separately rather than folded into the visa-free number.
          </p>
          <h3>Total access</h3>
          <p>
            The sum of the two, and what the ranking is built on. Ranks are competition-style:
            passports with identical totals share a rank, and the following rank skips
            accordingly. Several European passports are genuinely tied, and separating them
            would suggest a precision the underlying counts do not support.
          </p>
          <h3>What the ranking doesn&apos;t tell you</h3>
          <p>
            Mobility is not the same as usefulness. An Indian passport ranks low on total
            access, but the destinations it does reach freely include most of Southeast Asia
            and the Gulf — which is where the large majority of Indian outbound travel actually
            goes. A high-ranking passport with access to countries you have no reason to visit
            is worth less to you than a lower-ranking one that covers your actual travel.
          </p>
        </Prose>

        <div className="mt-8 max-w-3xl">
          <Callout tone="info" title="Figures are indicative">
            Entry rules change frequently, sometimes at a few days&apos; notice. Before booking
            anything non-refundable, confirm your specific case in the{" "}
            <a href="/tools/visa-requirements">requirements checker</a>, which is re-verified
            against issuing authorities several times a day.
          </Callout>
        </div>
      </Section>

      <CTABand
        title="Need a visa for somewhere?"
        description="155 destinations with guaranteed delivery dates and a refund if we miss one."
        href="/"
        label="Browse destinations"
      />
    </PageShell>
  );
}
