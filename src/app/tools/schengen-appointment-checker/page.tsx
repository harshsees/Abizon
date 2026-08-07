import type { Metadata } from "next";

import { CTABand, Callout, PageHero, PageShell, Prose, Section } from "@/components/PageKit";
import { SchengenAppointmentBoard } from "@/components/tools/SchengenAppointmentBoard";

export const metadata: Metadata = {
  title: "Schengen Appointment Checker | Keyrise",
  description:
    "Current Schengen visa appointment availability across 15 missions in India, with automated slot monitoring and booking.",
};

export default function SchengenAppointmentCheckerPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Schengen Appointments"
        title="Where slots are actually available"
        description="The appointment is the bottleneck in a Schengen application, not the paperwork. Availability differs enormously between missions — and applying through a mission with open slots is often faster than waiting for your first choice."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-success" />
            Monitored continuously · bands updated hourly
          </span>
        }
      />

      <Section>
        <SchengenAppointmentBoard />
      </Section>

      <Section muted eyebrow="Strategy" title="Choosing which mission to apply to">
        <Prose>
          <p>
            You do not always get to pick. Schengen rules determine which country handles your
            application, and applying to the wrong one is grounds for refusal on its own.
          </p>
          <h2>The rules, in order</h2>
          <h3>1. Single destination</h3>
          <p>
            If you are only visiting one Schengen country, you must apply to that country.
            There is no discretion here, regardless of appointment waits.
          </p>
          <h3>2. Multiple destinations — main destination rule</h3>
          <p>
            Apply to the country where you will spend the <strong>most nights</strong>. If you
            are in Italy for six nights and France for three, it is Italy — even if Italian
            appointments are waitlisted and French ones are open.
          </p>
          <h3>3. Equal stays — first entry rule</h3>
          <p>
            Where nights are split evenly, apply to the country you will{" "}
            <strong>enter first</strong>. This is the one genuine lever you have: adjusting
            which country you land in can move your application to a mission with shorter
            waits, and it is entirely legitimate.
          </p>
          <h2>What not to do</h2>
          <p>
            Do not book a token night in a country with open appointments to shift your main
            destination. Consulates compare your stated itinerary against your bookings, and
            an itinerary that exists only to game the mission choice is a common refusal
            reason under &ldquo;justification for purpose of stay not established&rdquo;.
          </p>
        </Prose>

        <div className="mt-8 max-w-3xl">
          <Callout tone="info" title="How our monitoring works">
            Slots at busy missions are frequently released in small batches at unpredictable
            hours and taken within minutes. We poll continuously and book automatically
            against your application the moment a slot matching your travel window appears —
            you are told after it is confirmed, not asked to act in the moment.
          </Callout>
        </div>
      </Section>

      <CTABand
        title="Let us handle the appointment"
        description="Schengen applications through Keyrise include appointment capture. Median wait drops from 47 days to 9."
        href="/guides/schengen-visa"
        label="Schengen visa guide"
      />
    </PageShell>
  );
}
