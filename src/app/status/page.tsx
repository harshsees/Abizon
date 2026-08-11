import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, CircleDashed, CircleSlash } from "lucide-react";

import { CTABand, PageHero, PageShell, Section } from "@/components/PageKit";

export const metadata: Metadata = {
  title: "System Status | Keyrise",
  description:
    "Live operational status for Keyrise filing lanes, document processing, payments and government portal connectivity.",
};

/**
 * PHASE 8C: this page was a fabricated live dashboard.
 *
 * Seven services each carried an invented uptime figure to two decimal places
 * and a 90-day daily health strip built from hardcoded incident indices —
 * including a nine-day Schengen appointment outage, the same invented incident
 * the transparency report described in prose. §21 names this exactly: fake
 * status events and dynamic-looking history.
 *
 * The deeper problem is that most of these services do not exist. There is no
 * payment capture, no e-Visa filing lane, no SMS notification and no partner
 * API, so a green "Operational" dot beside them is not a stale reading — it is
 * a claim that a system is running when there is no system.
 *
 * `planned` is the honest state, and it carries no uptime and no history: a
 * service that has never run has no availability record, and a 90-day strip
 * with nothing in it would still imply 90 days of observation.
 */
type State = "operational" | "degraded" | "down" | "planned";

type Service = {
  name: string;
  description: string;
  state: State;
  /** `null` until the service has actually run and been measured. */
  uptime: string | null;
  /** 90 days of daily health, newest last. Empty where nothing was observed. */
  history: State[];
};

const services: Service[] = [
  {
    name: "Application intake",
    description: "Form submission, document upload and payment capture",
    state: "planned",
    uptime: null,
    history: [],
  },
  {
    name: "Document processing",
    description: "MRZ extraction, photo compliance and classification",
    state: "planned",
    uptime: null,
    history: [],
  },
  {
    name: "e-Visa filing lanes",
    description: "Automated submission to 60+ government portals",
    state: "planned",
    uptime: null,
    history: [],
  },
  {
    name: "Schengen appointment capture",
    description: "Slot monitoring and booking across 15 missions",
    state: "planned",
    uptime: null,
    history: [],
  },
  {
    name: "Payments",
    description: "Card, UPI and netbanking processing",
    state: "planned",
    uptime: null,
    history: [],
  },
  {
    name: "Status tracking & notifications",
    description: "Application tracking, email and SMS delivery",
    state: "planned",
    uptime: null,
    history: [],
  },
  {
    name: "Partner API",
    description: "Requirements lookup, quoting and filing webhooks",
    state: "planned",
    uptime: null,
    history: [],
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
  planned: {
    label: "Not yet live",
    dot: "bg-muted-foreground",
    bar: "bg-muted-foreground",
    icon: CircleDashed,
    text: "text-muted-foreground",
  },
};

export default function StatusPage() {
  // A service that has never run cannot be "operational", so the page reports
  // the honest aggregate rather than defaulting to green.
  const allPlanned = services.every((s) => s.state === "planned");

  const worst: State = allPlanned
    ? "planned"
    : services.some((s) => s.state === "down")
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
          allPlanned
            ? "Nothing is live yet"
            : worst === "operational"
              ? "All systems operational"
              : "Some systems are degraded"
        }
        description={
          allPlanned
            ? "This page will report the live state of every service a traveller depends on, including the government portals Keyrise does not run — if one is down, your visa is affected and you should be able to see that. None of these services is in operation yet, so there is nothing to report."
            : "Live operational status for every service a traveller depends on. Government portals are included even though we don't run them — if they're down, your visa is affected, and you should be able to see that."
        }
        badge={
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${overall.dot}`} />
            {/* No refresh cadence while there is nothing being polled. */}
            {allPlanned ? overall.label : `${overall.label} · updated every 60 seconds`}
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
                    {service.uptime && (
                      <p data-numeric className="mt-0.5 text-2xs text-muted-foreground">
                        {service.uptime} · 90 days
                      </p>
                    )}
                  </div>
                </div>

                {/* 90-day strip. Decorative — the uptime figure beside it carries
                    the same information for anyone not reading the bars.

                    Suppressed entirely where there is no history: an empty
                    90-slot rail still asserts that 90 days were observed. */}
                {service.history.length > 0 && (
                  <>
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
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      {/* PHASE 8C. This block described a live incident that was not happening:
          "Investigating · Started 07 Aug 2026, 06:40 IST — slower appointment
          capture for Italy and Spain", with a promised next update at 14:00.
          A dated, timed, in-progress incident is the most concrete factual
          claim a status page can make, and there was no incident. */}
      <Section muted eyebrow="Active" title="Current incident">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-e1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-surface-sunken px-2.5 py-1 text-2xs font-black uppercase tracking-wider text-muted-foreground">
              None open
            </span>
          </div>
          <h3 className="mt-3 text-base font-bold text-foreground">
            No incident is open
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Nothing is running that could have one. When filing goes live, an open
            incident appears here with the time it started, what it affects and when
            the next update is due — and stays until it is resolved rather than
            disappearing quietly.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Resolved incidents are written up on{" "}
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
