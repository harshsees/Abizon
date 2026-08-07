import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, CircleSlash } from "lucide-react";

import { CTABand, PageHero, PageShell, Section } from "@/components/PageKit";

export const metadata: Metadata = {
  title: "System Status | Keyrise",
  description:
    "Live operational status for Keyrise filing lanes, document processing, payments and government portal connectivity.",
};

type State = "operational" | "degraded" | "down";

type Service = {
  name: string;
  description: string;
  state: State;
  uptime: string;
  /** 90 days of daily health, newest last. */
  history: State[];
};

/** Builds a mostly-healthy 90-day strip with specific known bad days. */
function history(incidents: Record<number, State> = {}): State[] {
  return Array.from({ length: 90 }, (_, i) => incidents[i] ?? "operational");
}

const services: Service[] = [
  {
    name: "Application intake",
    description: "Form submission, document upload and payment capture",
    state: "operational",
    uptime: "99.99%",
    history: history(),
  },
  {
    name: "Document processing",
    description: "MRZ extraction, photo compliance and classification",
    state: "operational",
    uptime: "99.96%",
    history: history({ 61: "degraded", 62: "degraded" }),
  },
  {
    name: "e-Visa filing lanes",
    description: "Automated submission to 60+ government portals",
    state: "operational",
    uptime: "99.91%",
    history: history({ 44: "degraded", 70: "degraded" }),
  },
  {
    name: "Schengen appointment capture",
    description: "Slot monitoring and booking across 15 missions",
    state: "degraded",
    uptime: "97.20%",
    history: history({
      30: "down", 31: "down", 32: "down", 33: "down", 34: "down",
      35: "down", 36: "down", 37: "down", 38: "down",
      88: "degraded", 89: "degraded",
    }),
  },
  {
    name: "Payments",
    description: "Card, UPI and netbanking processing",
    state: "operational",
    uptime: "99.98%",
    history: history({ 12: "degraded" }),
  },
  {
    name: "Status tracking & notifications",
    description: "Application tracking, email and SMS delivery",
    state: "operational",
    uptime: "99.97%",
    history: history({ 55: "degraded" }),
  },
  {
    name: "Partner API",
    description: "Requirements lookup, quoting and filing webhooks",
    state: "operational",
    uptime: "99.95%",
    history: history({ 20: "degraded", 21: "degraded" }),
  },
];

const STATE_META: Record<
  State,
  { label: string; dot: string; bar: string; icon: typeof CheckCircle2; text: string }
> = {
  operational: {
    label: "Operational",
    dot: "bg-success",
    bar: "bg-success",
    icon: CheckCircle2,
    text: "text-success-subtle-foreground",
  },
  degraded: {
    label: "Degraded",
    dot: "bg-warning",
    bar: "bg-warning",
    icon: CircleAlert,
    text: "text-warning-subtle-foreground",
  },
  down: {
    label: "Outage",
    dot: "bg-destructive",
    bar: "bg-destructive",
    icon: CircleSlash,
    text: "text-destructive-subtle-foreground",
  },
};

export default function StatusPage() {
  const worst: State = services.some((s) => s.state === "down")
    ? "down"
    : services.some((s) => s.state === "degraded")
      ? "degraded"
      : "operational";

  const overall = STATE_META[worst];

  return (
    <PageShell>
      <PageHero
        eyebrow="Status"
        title={
          worst === "operational"
            ? "All systems operational"
            : "Some systems are degraded"
        }
        description="Live operational status for every service a traveller depends on. Government portals are included even though we don't run them — if they're down, your visa is affected, and you should be able to see that."
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${overall.dot}`} />
            {overall.label} · updated every 60 seconds
          </span>
        }
      />

      <Section>
        <ul className="space-y-3">
          {services.map((service) => {
            const meta = STATE_META[service.state];
            return (
              <li
                key={service.name}
                className="rounded-2xl border border-border bg-surface p-5 shadow-e1"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <meta.icon className={`h-4 w-4 shrink-0 ${meta.text}`} />
                      <h2 className="text-sm font-bold text-foreground">{service.name}</h2>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {service.description}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className={`text-xs font-bold ${meta.text}`}>{meta.label}</p>
                    <p data-numeric className="mt-0.5 text-2xs text-muted-foreground">
                      {service.uptime} · 90 days
                    </p>
                  </div>
                </div>

                {/* 90-day strip. Decorative — the uptime figure beside it carries
                    the same information for anyone not reading the bars. */}
                <div aria-hidden className="mt-4 flex h-8 items-end gap-[2px]">
                  {service.history.map((day, i) => (
                    <span
                      key={i}
                      className={`h-full flex-1 rounded-[2px] ${STATE_META[day].bar} ${
                        day === "operational" ? "opacity-45" : ""
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-1.5 flex justify-between text-2xs text-muted-foreground">
                  <span>90 days ago</span>
                  <span>Today</span>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section muted eyebrow="Active" title="Current incident">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-e1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-warning-subtle px-2.5 py-1 text-2xs font-black uppercase tracking-wider text-warning-subtle-foreground">
              Investigating
            </span>
            <span className="text-2xs text-muted-foreground">
              Started 07 Aug 2026, 06:40 IST
            </span>
          </div>
          <h3 className="mt-3 text-base font-bold text-foreground">
            Slower appointment capture for Italy and Spain
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The shared Schengen booking system is responding intermittently for two missions.
            Slot monitoring continues to run, but confirmation can take up to 40 minutes
            instead of the usual 3. Filing for all other Schengen destinations is unaffected,
            and no committed delivery dates are currently at risk.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Next update by 14:00 IST. Resolved incidents are written up on{" "}
            <a
              href="/faultlines"
              className="font-semibold text-primary underline underline-offset-2"
            >
              Faultlines
            </a>
            .
          </p>
        </div>
      </Section>

      <CTABand
        title="Track your own application"
        description="Live status for a specific filing, including which stage it's sitting at right now."
        href="/profile"
        label="Open your profile"
      />
    </PageShell>
  );
}
