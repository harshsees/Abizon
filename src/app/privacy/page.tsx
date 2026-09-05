import type { Metadata } from "next";

import { Callout, PageHero, PageShell, Prose, Section } from "@/components/PageKit";
import { StatutoryDisclosures } from "@/components/legal/StatutoryDisclosures";
import {
  GRIEVANCE_ACKNOWLEDGEMENT_HOURS,
  GRIEVANCE_RESOLUTION_DAYS,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | abizon",
  description:
    "What personal data abizon collects, why, who it is shared with, how long it is kept, and the rights you have over it.",
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="Written to be read. Where a section could be summarised in one sentence, it is."
        badge={
          <span className="rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground">
            Last updated 14 July 2026
          </span>
        }
      />

      <Section>
        <div className="mb-8">
          <Callout tone="info" title="The short version">
            We collect what is needed to file your visa and nothing else. Your documents go to
            the relevant government and to no one else. Scans are deleted 30 days after your
            application reaches an outcome. We do not sell your data, and we do not train
            models on your documents.
          </Callout>
        </div>

        <Prose>
          <h2>1. Who we are</h2>
          <p>
            abizon operates this website and the visa filing service described on it. For the
            purposes of Indian data protection law and the GDPR, abizon is the data
            controller for the personal data described below. Questions go to{" "}
            <a href="mailto:privacy@abizon.com">privacy@abizon.com</a>.
          </p>

          <h2>2. What we collect</h2>
          <h3>Information you give us</h3>
          <ul>
            <li>Identity details — name, date of birth, nationality, passport number</li>
            <li>Contact details — email address, phone number, postal address</li>
            <li>
              Travel details — destination, dates, itinerary, accommodation and flight
              bookings
            </li>
            <li>
              Documents — passport scans, photographs, bank statements, tax returns,
              employment letters and any other document a destination requires
            </li>
            <li>Payment details, processed by our payment provider and never stored by us</li>
          </ul>
          <h3>Information we collect automatically</h3>
          <ul>
            <li>Device and browser type, and approximate location derived from IP address</li>
            <li>Pages viewed and actions taken, to diagnose faults and improve the service</li>
          </ul>

          <h2>3. Why we use it</h2>
          <ul>
            <li>
              <strong>To file your application.</strong> This is the primary purpose and the
              legal basis is performance of our contract with you.
            </li>
            <li>
              <strong>To keep you informed.</strong> Status updates, document requests and
              delivery confirmations.
            </li>
            <li>
              <strong>To meet legal obligations.</strong> Payment records are retained for
              seven years as Indian tax law requires.
            </li>
            <li>
              <strong>To improve the service.</strong> Using aggregated data only, subject to
              the constraints described in section 6.
            </li>
          </ul>

          <h2>4. Who we share it with</h2>
          <p>
            <strong>Government authorities</strong> of the destination you are applying to,
            and their appointed visa application centres. This is the point of the service and
            cannot be opted out of while still applying.
          </p>
          <p>
            <strong>Payment processors</strong>, who receive the transaction details necessary
            to take payment. We never receive or store your full card number.
          </p>
          <p>
            <strong>Infrastructure providers</strong> who host our systems under contract, and
            who are bound to process data only on our instructions.
          </p>
          <p>
            We do not sell personal data. We do not share it with advertisers or data brokers.
            We do not disclose it to third parties for their own purposes.
          </p>

          <h2>5. How long we keep it</h2>
          <ul>
            <li>
              <strong>Documents</strong> — deleted 30 days after your application reaches a
              final outcome
            </li>
            <li>
              <strong>Application records</strong> — destination, dates and outcome, retained
              while your account is open
            </li>
            <li>
              <strong>Payment records</strong> — seven years, as required by law
            </li>
            <li>
              <strong>Analytics</strong> — 26 months, in aggregated form
            </li>
          </ul>
          <p>
            Deletion can be requested earlier at any time. See{" "}
            <a href="/security">Security</a> for the technical detail of how documents are
            stored and destroyed.
          </p>

          <h2>6. What we never do with your documents</h2>
          <p>
            Your passport scans, photographs and financial documents are not used to train
            machine learning models, are not used for analytics, and are not used for
            advertising. Our document intelligence models are trained on licensed and synthetic
            datasets. Our published research uses application metadata only, subject to a
            minimum aggregation threshold of 1,000 records — see{" "}
            <a href="/atlas">abizon Atlas</a>.
          </p>

          <h2>7. Your rights under the DPDP Act</h2>
          <p>
            This section used to be written in the vocabulary of the GDPR — legitimate
            interests, the right to object, data portability. Those are European concepts and
            two of the three have no counterpart in Indian law, so the list described rights we
            could not actually offer and omitted two that we owe you. What follows is the
            Digital Personal Data Protection Act 2023, which is the law that governs your data
            here.
          </p>
          <ul>
            <li>
              <strong>Access</strong> (s.11) — a summary of the personal data we process about
              you, what we do with it, and who else we have shared it with.
            </li>
            <li>
              <strong>Correction, completion and erasure</strong> (s.12) — we correct
              inaccurate data, complete incomplete data, and erase what we no longer need for
              the purpose you gave it for or to meet a legal obligation.
            </li>
            <li>
              <strong>Grievance redressal</strong> (s.13) — a route to complain to us that does
              not depend on our goodwill, with published periods. See below.
            </li>
            <li>
              <strong>Nomination</strong> (s.14) — you may nominate someone to exercise these
              rights on your behalf if you die or become incapacitated. Ask and we will record
              it.
            </li>
            <li>
              <strong>Withdrawal of consent</strong> (s.6(4)) — as easily as you gave it. An
              application already filed with a consulate cannot be unfiled, so withdrawal stops
              future processing rather than reversing what a government already holds.
            </li>
          </ul>
          <p>
            Write to <a href="mailto:privacy@abizon.com">privacy@abizon.com</a>. We do not
            charge for exercising any of these.
          </p>

          <h2>8. Children</h2>
          <p>
            Section 9 of the DPDP Act treats anyone under 18 as a child, and children travel.
            Where an applicant is a minor we process their data only on the verifiable consent
            of a parent or lawful guardian, obtained through the adult who is making the
            application. We do not track a child, profile them, or serve them advertising —
            none of which we do to adults either.
          </p>

          <h2>9. If something goes wrong</h2>
          <p>
            A personal data breach is reported to the Data Protection Board of India and to
            every affected person, without a threshold and without waiting to establish harm —
            the Act does not provide for one and we do not apply one of our own.
          </p>

          <h2>10. Complaining, and escalating</h2>
          <p>
            Raise it with our Grievance Officer, named below. Every complaint is acknowledged
            within {GRIEVANCE_ACKNOWLEDGEMENT_HOURS} hours with a ticket number and resolved
            within {GRIEVANCE_RESOLUTION_DAYS} days.
          </p>
          <p>
            If you are not satisfied, you may complain to the{" "}
            <strong>Data Protection Board of India</strong>. Section 13(3) requires you to
            exhaust our process first, which is the reason the periods above are published:
            they are what tells you when you are entitled to escalate.
          </p>

          <h2>11. Where your data is held</h2>
          <p>
            Data for Indian applicants is stored in India. Data for GCC applicants is stored in
            the UAE. Neither is replicated outside its region. Where a document must reach a
            government outside that region, it is transmitted for that purpose only.
          </p>

          <h2>12. Cookies</h2>
          <p>
            We use cookies necessary for the site to function — session management and security
            — and, with your consent, analytics cookies that help us understand where the
            application flow is failing people. Analytics can be declined without any loss of
            functionality.
          </p>

          <h2>13. Changes</h2>
          <p>
            Material changes are notified by email at least 30 days in advance. The revision
            date at the top of this page always reflects the current version.
          </p>

          <h2>14. Who to contact</h2>
        </Prose>

        <div className="mt-6">
          <StatutoryDisclosures />
        </div>
      </Section>
    </PageShell>
  );
}
