import type { Metadata } from "next";

import {
  CTABand,
  Callout,
  PageHero,
  PageShell,
  Prose,
  Section,
  StatGrid,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Refunds Policy | abizon",
  description:
    "When abizon refunds you, how much, and how fast — including the automatic refund that fires whenever a visa misses its committed delivery date.",
};

const scenarios = [
  {
    situation: "Your visa arrives after the date we committed to",
    refund: "100% of the service fee",
    timing: "Automatic, within 24 hours",
    note: "No ticket, no request. A scheduled job compares committed delivery to actual issuance and refunds on its own.",
    tone: "success" as const,
  },
  {
    situation: "We never managed to file your application",
    refund: "100% of everything, including the government fee",
    timing: "Automatic, within 24 hours",
    note: "If it did not reach the government, we hold no unrecoverable cost, so nothing is withheld.",
    tone: "success" as const,
  },
  {
    situation: "You cancel before we file",
    refund: "100% of everything",
    timing: "3–5 working days",
    note: "Cancel from your profile at any point before the application enters the filing queue.",
    tone: "success" as const,
  },
  {
    situation: "You cancel after we file",
    refund: "Service fee only, minus work completed",
    timing: "3–5 working days",
    note: "The government fee is gone the moment it is submitted. We cannot recover it and neither can anyone else.",
    tone: "warning" as const,
  },
  {
    situation: "The government refuses your visa",
    refund: "No refund — but a free refile",
    timing: "Refile within 30 days",
    note: "We were paid to file correctly, and we did. Rejection Recovery covers the second attempt at no service cost.",
    tone: "warning" as const,
  },
  {
    situation: "Refused because we made an error",
    refund: "100% of everything, plus the refile",
    timing: "Automatic on confirmation",
    note: "If the refusal traces to a mistake on our side, you are made whole including the government fee.",
    tone: "success" as const,
  },
];

export default function RefundsPolicyPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Refunds"
        title="When you get your money back"
        description="Six situations, what each one returns, and how long it takes. The important one is the first: if we miss the date we promised, the refund fires by itself."
      />

      <Section eyebrow="Last quarter" title="What we actually paid out">
        <StatGrid
          stats={[
            { value: null, label: "Refunded", hint: "Q2 2026" },
            { value: null, label: "Automatic refunds", hint: "Late deliveries" },
            { value: null, label: "Median refund time", hint: "From trigger" },
            { value: null, label: "Disputes escalated", hint: "Nothing to argue about" },
          ]}
        />
      </Section>

      <Section muted eyebrow="The table" title="Every refund situation">
        <ul className="space-y-3">
          {scenarios.map((s) => (
            <li
              key={s.situation}
              className="rounded-2xl border border-border bg-surface p-5 shadow-e1"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <h3 className="max-w-md text-sm font-bold text-foreground">
                  {s.situation}
                </h3>
                <div className="text-right">
                  <p
                    className={`text-sm font-black ${
                      s.tone === "success"
                        ? "text-success-subtle-foreground"
                        : "text-warning-subtle-foreground"
                    }`}
                  >
                    {s.refund}
                  </p>
                  <p className="mt-0.5 text-2xs text-muted-foreground">{s.timing}</p>
                </div>
              </div>
              <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
                {s.note}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Detail" title="The parts people ask about">
        <div className="mb-8">
          <Callout tone="warning" title="Government fees are genuinely not refundable">
            This is the one that causes friction, so it is worth being blunt. Once an
            application is submitted, the destination country keeps its fee whether they
            approve you or not. Nobody — not us, not any competitor — can return it. Any
            service promising a full refund after a government refusal is either quietly
            excluding the government fee or is not telling you the truth.
          </Callout>
        </div>

        <Prose>
          <h3>How the automatic refund works</h3>
          <p>
            At checkout we store a committed delivery timestamp. A job runs hourly comparing
            that timestamp against actual issuance. Where issuance is later, it initiates a
            full service-fee refund to the original payment method and emails you. You are
            not asked to confirm anything, and there is no window in which you must claim it.
          </p>
          <p>
            This is deliberate. A guarantee that requires the customer to notice, ask, and
            then argue is a guarantee that mostly goes unpaid — which makes it worth less
            than the discount it replaced.
          </p>
          <h3>&ldquo;Work completed&rdquo; on a post-filing cancellation</h3>
          <p>
            Where you cancel after filing, we retain the portion of the service fee covering
            work already done — document review, form preparation and submission. The
            remainder is returned. The split is shown to you before you confirm the
            cancellation, not calculated afterwards.
          </p>
          <h3>Where refunds go</h3>
          <p>
            Always to the original payment method. Card refunds appear in 3–5 working days
            depending on your issuer; UPI is usually same-day. We cannot redirect a refund to
            a different account, which is a fraud control rather than an inconvenience.
          </p>
          <h3>If something is wrong</h3>
          <p>
            Write to <a href="mailto:refunds@abizon.com">refunds@abizon.com</a> with your
            application ID. Refund queries are answered by the team that owns the filing, not
            a separate billing desk that has to go and ask them.
          </p>
        </Prose>
      </Section>

      <CTABand
        title="Refused, and want to try again?"
        description="Rejection Recovery refiles your application at no service cost, with the specific reason for refusal addressed."
        href="/rejection-recovery"
        label="Rejection Recovery"
      />
    </PageShell>
  );
}
