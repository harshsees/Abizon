import type { Metadata } from "next";
import {
  CalendarSearch,
  Camera,
  FileSearch,
  Globe2,
  IdCard,
  Radar,
  ScrollText,
  Siren,
} from "lucide-react";

import { CTABand, FeatureGrid, PageHero, PageShell, Section } from "@/components/PageKit";

export const metadata: Metadata = {
  title: "Visa Tools | Abizon",
  description:
    "Free tools for visa applicants — requirements checker, photo creator, appointment monitoring, status checkers and the passport mobility index.",
};

const tools = [
  {
    icon: <FileSearch className="h-5 w-5" />,
    title: "Visa Requirements Checker",
    description:
      "Visa type, fee, validity, processing time and the exact document list for any of 155 destinations.",
    href: "/tools/visa-requirements",
    meta: "Free",
  },
  {
    icon: <Camera className="h-5 w-5" />,
    title: "Visa Photo Creator",
    description:
      "Turn a phone selfie into a compliant visa photo. Checks head height, background and dimensions against 40+ national specs.",
    href: "/tools/visa-photo-creator",
    meta: "Free",
  },
  {
    icon: <CalendarSearch className="h-5 w-5" />,
    title: "Schengen Appointment Checker",
    description:
      "Live appointment availability across 15 Schengen missions in India, with alerts the moment a slot opens.",
    href: "/tools/schengen-appointment-checker",
    meta: "Free",
  },
  {
    icon: <Radar className="h-5 w-5" />,
    title: "UAE Visa Status Checker",
    description:
      "Check the status of any UAE visa application by application or passport number, whether or not you applied through us.",
    href: "/tools/uae-visa-status-checker",
    meta: "Free",
  },
  {
    icon: <Globe2 className="h-5 w-5" />,
    title: "Passport Mobility Index",
    description:
      "How far every passport in the world actually takes you, ranked by visa-free and visa-on-arrival access.",
    href: "/passport-index",
    meta: "Free",
  },
  {
    icon: <ScrollText className="h-5 w-5" />,
    title: "The Visa Bible",
    description:
      "Long-form guidance on every visa category, written for people who want to understand the process rather than just complete it.",
    href: "/bible",
  },
  {
    icon: <IdCard className="h-5 w-5" />,
    title: "Rejection Recovery",
    description:
      "Refused before? We identify the likely reason and refile at no service cost. 71% of refiled applications are subsequently approved.",
    href: "/rejection-recovery",
  },
  {
    icon: <Siren className="h-5 w-5" />,
    title: "Emergency Helpline",
    description:
      "Flying in under 72 hours with a visa problem. Straight to a filing specialist, 24 hours a day.",
    href: "/emergency-helpline",
  },
];

export default function ToolsPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Tools"
        title="Everything you need before you apply"
        description="Most of the cost of a visa application is not the fee — it is the time spent working out what is required and redoing the parts you got wrong. These are free, and you do not need an account."
      />

      <Section>
        <FeatureGrid items={tools} columns={3} />
      </Section>

      <CTABand
        title="Ready to apply?"
        description="155 destinations, guaranteed delivery dates, and a full refund if we miss one."
        href="/"
        label="Browse destinations"
      />
    </PageShell>
  );
}
