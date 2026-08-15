import type { Metadata } from "next";
import { Download, Mail } from "lucide-react";

import {
  CTABand,
  FeatureGrid,
  PageHero,
  PageShell,
  Section,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Newsroom | Abizon",
  description:
    "Company announcements, product launches, policy analysis and press resources from Abizon.",
};

const releases = [
  {
    title: "Abizon adds 22 African destinations to instant e-Visa coverage",
    description:
      "Tanzania, Rwanda, Zambia and 19 others move to same-week delivery, bringing total coverage to 155 destinations.",
    meta: "12 Jul 2026",
  },
  {
    title: "Rejection Recovery programme opens",
    description:
      "Applications refiled through the programme after an initial refusal carry no additional service cost.",
    meta: "28 Jun 2026",
  },
  {
    title: "Schengen appointment capture goes live across 15 Indian missions",
    description:
      "Automated slot monitoring cuts average wait from 47 days to 9 for France, Germany, Italy, Netherlands and Switzerland.",
    meta: "03 Jun 2026",
  },
  {
    title: "Abizon publishes its first Fee Change Audit",
    description:
      "A public, permanent log of every government fee movement we observe, with the date we detected it and the date we passed it on.",
    meta: "19 May 2026",
  },
  {
    title: "Dubai operations centre opens at Burjuman",
    description:
      "A 40-person filing and escalation team now covers GCC lanes on local hours, including weekend consular windows.",
    meta: "07 Apr 2026",
  },
  {
    title: "On-time delivery guarantee extended to sticker visas",
    description:
      "The money-back guarantee that covered e-Visas now applies to consulate-filed sticker visas in 31 destinations.",
    meta: "22 Feb 2026",
  },
];

const coverage = [
  {
    title: "The startups untangling the visa queue",
    description: "A look at how document automation is changing consular filing in South Asia.",
    meta: "Financial Times",
  },
  {
    title: "What happens when your visa is late and someone owes you money",
    description: "On-time guarantees and what they actually cover.",
    meta: "Condé Nast Traveller",
  },
  {
    title: "India's outbound travel boom needs better rails",
    description: "Analysis of visa infrastructure as a constraint on outbound tourism growth.",
    meta: "Mint",
  },
];

export default function NewsroomPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Newsroom"
        title="What we've shipped, and what we've said about it"
        description="Product launches, coverage expansions and the occasional post-mortem. If a number appears here, you can find the working behind it in Transparency."
        actions={
          <>
            <a
              href="mailto:press@abizon.com"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-on-primary hover:bg-primary-hover"
            >
              <Mail className="h-4 w-4" />
              press@abizon.com
            </a>
            <a
              href="/press-kit.zip"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-6 py-3 text-sm font-bold text-foreground shadow-e1 hover:border-border-strong"
            >
              <Download className="h-4 w-4" />
              Brand assets
            </a>
          </>
        }
      />

      <Section
        eyebrow="Announcements"
        title="Press releases"
        description="Newest first. Each release links to the underlying data where we have it."
      >
        <FeatureGrid items={releases} columns={2} />
      </Section>

      <Section muted eyebrow="In the press" title="Selected coverage">
        <FeatureGrid items={coverage} columns={3} />
      </Section>

      <CTABand
        title="Working on a story?"
        description="We can usually turn around data requests on approval rates, processing times or fee movements within a working day."
        href="/contact"
        label="Contact the press team"
      />
    </PageShell>
  );
}
