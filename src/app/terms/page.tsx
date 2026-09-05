import type { Metadata } from "next";

import { Callout, PageHero, PageShell, Prose, Section } from "@/components/PageKit";
import { StatutoryDisclosures } from "@/components/legal/StatutoryDisclosures";
import {
  GRIEVANCE_ACKNOWLEDGEMENT_HOURS,
  GRIEVANCE_RESOLUTION_DAYS,
  GST_RATE_PERCENT,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service | Abizon",
  description:
    "The terms governing use of Abizon — what we do, what we guarantee, what we cannot control, and how disputes are resolved.",
};

export default function TermsPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        description="The agreement between you and Abizon when you use this service."
        badge={
          <span className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground">
            Last updated 14 July 2026
          </span>
        }
      />

      <Section>
        <div className="mb-8">
          <Callout tone="warning" title="The one thing worth reading twice">
            We file your application correctly and on time, and we guarantee that. We cannot
            guarantee that a government will approve it — nobody can, and any service that
            claims otherwise is misdescribing what it does. If we miss our delivery date you
            get your service fee back automatically. If the government refuses you, you do not,
            because we did the work we were paid for.
          </Callout>
        </div>

        <Prose>
          <h2>1. What this service is</h2>
          <p>
            Abizon prepares and submits visa applications on your behalf. We review your
            documents against the destination&apos;s requirements, complete the application,
            submit it to the relevant authority, and track it to an outcome.
          </p>
          <p>
            <strong>We are not a government agency and we are not immigration lawyers.</strong>{" "}
            We have no influence over any visa decision. We are a filing service, and the
            entirety of what we control is whether your application is complete, correct and
            submitted on time.
          </p>

          <h2>2. Your responsibilities</h2>
          <ul>
            <li>
              Provide accurate and complete information. Applications are refused for
              inaccuracies, and a deliberate misstatement can result in a multi-year entry ban.
            </li>
            <li>
              Supply genuine documents. Submitting a falsified document is grounds for
              immediate termination of service without refund, and we will not file it.
            </li>
            <li>
              Respond promptly to document requests. Time spent waiting for you is excluded
              from our delivery guarantee.
            </li>
            <li>
              Ensure your passport is valid for at least six months beyond your travel dates.
            </li>
          </ul>

          <h2>3. Fees</h2>
          <p>
            Two components, itemised separately at checkout and on every country page:
          </p>
          <ul>
            <li>
              <strong>The government fee</strong>, set by the destination and passed through
              without markup. Once submitted, it is unrecoverable regardless of outcome.
            </li>
            <li>
              <strong>Our service fee</strong>, plus GST at {GST_RATE_PERCENT}% as the Central
              Goods and Services Tax Act 2017 requires. This is the part we control and the
              part covered by the guarantee. A tax invoice carrying our GSTIN is issued for
              every payment.
            </li>
            <li>
              The government fee is collected from you and paid onward unchanged. It is a
              disbursement rather than a supply by us, so no GST is charged on it and it does
              not appear on our invoice as taxable value.
            </li>
          </ul>
          <p>
            Government fees change without notice. Our handling of those changes is published
            in the <a href="/fee-change-audit">Fee Change Audit</a>.
          </p>

          <h2>4. The delivery guarantee</h2>
          <p>
            At checkout we commit to a delivery date. If your visa is issued after that date,
            your service fee is refunded in full, automatically, within 24 hours. You do not
            need to claim it, and there is no window in which the right expires.
          </p>
          <p>The guarantee does not apply where:</p>
          <ul>
            <li>You supplied documents late or supplied incorrect information</li>
            <li>The government requested additional documents and you did not provide them</li>
            <li>The application was refused (a refusal is an outcome, not a delay)</li>
            <li>
              A government suspended visa issuance for your destination entirely during the
              period
            </li>
          </ul>
          <p>
            Full detail, including every other refund situation, is on the{" "}
            <a href="/refunds-policy">refunds policy</a> page.
          </p>

          <h2>5. What we do not guarantee</h2>
          <ul>
            <li>
              <strong>Approval.</strong> Visa decisions rest entirely with the destination
              government.
            </li>
            <li>
              <strong>Entry.</strong> A valid visa permits you to travel to a border. Admission
              is decided by an officer there.
            </li>
            <li>
              <strong>Government processing times.</strong> Where a government exceeds its own
              published timeframe, our guarantee still applies to our committed date — but we
              cannot make them faster.
            </li>
          </ul>

          <h2>6. Liability</h2>
          <p>
            Our liability for any claim arising from the service is limited to the total fees
            you paid us for the application in question. We are not liable for consequential
            losses — including flights, accommodation, tours or lost earnings — arising from a
            visa refusal or delay.
          </p>
          <p>
            This is why we say repeatedly, and will keep saying, that you should not book
            non-refundable travel before your visa is approved.
          </p>

          <h2>7. Cancellation</h2>
          <p>
            You may cancel at any time before filing for a full refund of everything paid.
            After filing, the government fee is unrecoverable and the service fee is refunded
            less work completed, with the split shown to you before you confirm.
          </p>

          <h2>8. Account termination</h2>
          <p>
            We may decline or terminate service where a person submits falsified documents,
            attempts to use the service for a purpose that is unlawful, or is abusive toward
            our staff. Where we terminate for the first two reasons no refund is due; where we
            terminate for any other reason, you are refunded in full.
          </p>

          <h2>9. Complaints, and how to escalate one</h2>
          <p>
            Write to our Grievance Officer, named below. Every complaint is acknowledged
            within {GRIEVANCE_ACKNOWLEDGEMENT_HOURS} hours with a ticket number and resolved
            within {GRIEVANCE_RESOLUTION_DAYS} days of receipt. Those periods are the shorter
            of the ones the Consumer Protection (E-Commerce) Rules 2020 and the Information
            Technology (Intermediary Guidelines) Rules 2021 permit, and we publish the shorter
            one because a published period is a promise rather than a ceiling.
          </p>
          <p>
            If we do not resolve it, or you are not satisfied with how we did, you may take the
            matter to the National Consumer Helpline (1915), to the consumer commission for the
            district in which you live, or to the{" "}
            <a href="https://consumerhelpline.gov.in/" rel="noopener noreferrer">
              e-Daakhil portal
            </a>
            . A complaint about how we handled your personal data goes instead to the Data
            Protection Board of India, once you have raised it with us first — see the{" "}
            <a href="/privacy">privacy policy</a>.
          </p>

          <h2>10. Governing law and disputes</h2>
          <p>
            These terms are governed by the laws of India, and, subject to the paragraph below,
            the courts of New Delhi have exclusive jurisdiction.
          </p>
          <p>
            <strong>That does not apply to you as a consumer.</strong> Section 34 of the
            Consumer Protection Act 2019 lets you file where you live or work, and nothing in
            this agreement takes that away or requires you to travel to Delhi to be heard. An
            exclusive-jurisdiction clause that purported to override it would be an unfair
            contract term under section 2(46) and unenforceable in any case; we would rather say
            so here than have it read out to us.
          </p>
          <p>
            Commercial disputes that are not consumer disputes — with partners, suppliers and
            corporate customers — are referred to arbitration by a sole arbitrator under the
            Arbitration and Conciliation Act 1996, seated in New Delhi, conducted in English.
          </p>

          <h2>11. Events outside anyone's control</h2>
          <p>
            Where a consulate closes, a government suspends issuance, a portal is unavailable
            for a sustained period, or travel to a destination is restricted, our delivery
            guarantee is suspended for the duration and your service fee is refunded in full if
            you would rather not wait. The government fee follows whatever the authority does
            with it, which is usually nothing.
          </p>

          <h2>12. Changes</h2>
          <p>
            Material changes are notified by email at least 30 days in advance. Applications
            already in progress continue under the terms in force when they were submitted —
            we do not apply a new term retrospectively to work you have already paid for.
          </p>

          <h2>13. Who we are</h2>
        </Prose>

        <div className="mt-6">
          <StatutoryDisclosures />
        </div>
      </Section>
    </PageShell>
  );
}
