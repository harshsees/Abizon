import type { Metadata } from "next";

import { CTABand, Callout, PageHero, PageShell, Prose, Section } from "@/components/PageKit";
import { UaeStatusForm } from "@/components/tools/UaeStatusForm";

export const metadata: Metadata = {
  title: "UAE Visa Status Checker | Keyrise",
  description:
    "Check the status of a UAE or Dubai visa application by application or passport number, and find the right official channel for visas filed elsewhere.",
};

export default function UaeStatusCheckerPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="UAE Visa Status"
        title="Where is my Dubai visa?"
        description="Look up an application filed through Keyrise, or find the right official channel for one filed elsewhere. UAE visas are issued by two different authorities depending on the emirate, which is why so many people check the wrong one."
      />

      <Section>
        <UaeStatusForm />
      </Section>

      <Section muted eyebrow="Understanding it" title="What the statuses mean">
        <Prose>
          <h3>Under process</h3>
          <p>
            Received and queued. Most UAE tourist visas sit here for between 24 and 72 hours.
            This status carries no signal about the likely outcome — a straightforward
            application and a problematic one look identical from outside.
          </p>
          <h3>Additional documents required</h3>
          <p>
            Immigration wants something more, most often a clearer passport scan or proof of
            onward travel. <strong>This is time-critical</strong>: applications typically lapse
            if the request goes unanswered for 48 hours, and a lapsed application has to be
            filed again with a fresh fee.
          </p>
          <h3>Approved</h3>
          <p>
            The visa is issued. For e-Visas the document is emailed and is also retrievable
            from the issuing authority&apos;s portal. Check the spelling of your name and your
            passport number against your passport immediately — corrections are
            straightforward before travel and very difficult at the airport.
          </p>
          <h3>Rejected</h3>
          <p>
            Refused. The UAE does not publish a reason. The most common causes are a passport
            with under six months of validity, a previous overstay on any GCC visa, or a name
            mismatch between the application and the passport. Our{" "}
            <a href="/rejection-recovery">Rejection Recovery</a> programme covers a refile at
            no service cost.
          </p>
        </Prose>

        <div className="mt-8 max-w-3xl">
          <Callout tone="warning" title="Two authorities, two portals">
            A visa issued in Dubai is tracked through GDRFA. A visa issued in Abu Dhabi,
            Sharjah, Ajman, Fujairah, Ras Al Khaimah or Umm Al Quwain is tracked through ICP.
            Checking the wrong one returns &ldquo;no record found&rdquo;, which people
            reasonably but wrongly read as a rejection.
          </Callout>
        </div>
      </Section>

      <CTABand
        title="Apply for a UAE visa"
        description="Guaranteed delivery in 24 hours, or the service fee comes back automatically."
        href="/visa/dubai"
        label="Dubai visa"
      />
    </PageShell>
  );
}
