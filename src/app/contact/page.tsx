import type { Metadata } from "next";
import { Briefcase, LifeBuoy, Mail, MapPin, Newspaper, ShieldAlert } from "lucide-react";

import {
  Callout,
  FeatureGrid,
  PageHero,
  PageShell,
  Section,
} from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Contact Keyrise | Support, Press, Partnerships",
  description:
    "Reach the right team at Keyrise — 24/7 application support, emergency travel escalation, press, partnerships and security disclosure.",
};

const channels = [
  {
    icon: <LifeBuoy className="h-5 w-5" />,
    title: "Application support",
    description:
      "Questions about a live application, documents or refunds. Answered in under 4 minutes on average, 24 hours a day. help@keyrise.com",
  },
  {
    icon: <ShieldAlert className="h-5 w-5" />,
    title: "Emergency travel desk",
    description:
      "Travelling in under 72 hours and something has gone wrong. Escalates straight to a filing specialist, not a queue.",
    href: "/emergency-helpline",
  },
  {
    icon: <Newspaper className="h-5 w-5" />,
    title: "Press",
    description:
      "Interview requests, data requests and fact-checks. press@keyrise.com — usually same working day.",
    href: "/newsroom",
  },
  {
    icon: <Briefcase className="h-5 w-5" />,
    title: "Partnerships",
    description:
      "OTAs, airlines, corporate travel desks and universities embedding Keyrise. partners@keyrise.com",
    href: "/partners",
  },
  {
    icon: <ShieldAlert className="h-5 w-5" />,
    title: "Security disclosure",
    description:
      "Report a vulnerability. We acknowledge within 24 hours and never pursue good-faith researchers.",
    href: "/security",
  },
  {
    icon: <Mail className="h-5 w-5" />,
    title: "Everything else",
    description: "hello@keyrise.com reaches a human who will route it properly.",
  },
];

const offices = [
  {
    city: "New Delhi",
    address: "7 Khullar Farms, New Delhi, India",
    role: "Engineering, filing operations and support",
    hours: "Mon–Sat, 09:00–21:00 IST",
  },
  {
    city: "Dubai",
    address: "3rd Floor, Burjuman Mall, Khalid Bin Al Waleed Rd, Al Mankhool, Dubai",
    role: "GCC filing lanes and consular liaison",
    hours: "Sun–Thu, 09:00–18:00 GST",
  },
  {
    city: "New York",
    address: "447 Broadway STE 851, New York, USA",
    role: "Partnerships and US operations",
    hours: "Mon–Fri, 09:00–18:00 ET",
  },
];

export default function ContactPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Contact"
        title="Talk to a person"
        description="Pick the channel that matches what you need. Every one of these reaches a named team, not a shared inbox nobody owns."
      />

      <Section eyebrow="Channels" title="Where to write">
        <FeatureGrid items={channels} columns={3} />
      </Section>

      <Section muted eyebrow="Offices" title="Where we are">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {offices.map((office) => (
            <div
              key={office.city}
              className="rounded-2xl border border-border bg-surface p-5 shadow-e1"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">{office.city}</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {office.address}
              </p>
              <p className="mt-3 text-xs font-semibold text-subtle-foreground">
                {office.role}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{office.hours}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Callout tone="warning" title="Travelling in the next 72 hours?">
            Don&apos;t use email. The emergency desk is staffed around the clock and can
            escalate a filing directly — email is checked on business hours and you will
            lose time you may not have.
          </Callout>
        </div>
      </Section>
    </PageShell>
  );
}
