"use client";

/**
 * In-person requirements — the sticker/embassy conditional block.
 *
 * This renders for the `embassy` flow and stays absent for every other flow.
 * That branch is safe to derive because it is definitional: a sticker visa IS a
 * consulate or visa-application-centre process, and its fee IS collected at the
 * mission. Nothing country-specific is asserted from it.
 *
 * Biometrics is a different matter. Whether a given embassy captures
 * fingerprints, and how recently a prior capture stays valid, varies by country
 * and by applicant history — it cannot be inferred from "Sticker Visa". So the
 * biometrics line appears only when a country explicitly sets
 * `biometricsRequired`, and today no country in the dataset does. The component
 * is written and wired; it will start showing that row the moment the data
 * exists, with no further changes here.
 *
 * The same applies to `appointmentRequired`: setting it explicitly overrides
 * the flow-derived default, so a country that somehow avoids an appointment can
 * say so.
 */

import { Building2, CalendarCheck, Fingerprint, Landmark } from "lucide-react";

import type { CountryVisaConfig } from "@/lib/countryVisa";

type Row = {
  Icon: typeof Building2;
  label: string;
  detail: string;
};

export function AppointmentRequirements({ config }: { config: CountryVisaConfig }) {
  const isEmbassyFlow = config.flow === "embassy";
  const needsAppointment = config.appointmentRequired ?? isEmbassyFlow;

  // Never inferred — only shown when a country states it.
  const needsBiometrics = config.biometricsRequired === true;
  const paidAtEmbassy = config.pricing.paidAtEmbassy === true;

  if (!needsAppointment && !needsBiometrics && !paidAtEmbassy) return null;

  const rows: Row[] = [];

  if (needsAppointment) {
    rows.push({
      Icon: CalendarCheck,
      label: "Appointment required",
      detail: `A ${config.displayName} sticker visa is issued in person. You will need a slot at the consulate or visa application centre.`,
    });
    rows.push({
      Icon: Building2,
      label: "Visit in person",
      detail:
        "Your documents are submitted and verified at the centre on the day of your appointment.",
    });
  }

  if (needsBiometrics) {
    rows.push({
      Icon: Fingerprint,
      label: "Biometrics required",
      detail: "Fingerprints and a photograph are captured at your appointment.",
    });
  }

  if (paidAtEmbassy) {
    rows.push({
      Icon: Landmark,
      label: "Government fee paid at the mission",
      detail:
        "The embassy collects its own fee directly. Keyrise does not take it on their behalf.",
    });
  }

  return (
    <section className="space-y-5 border-t border-border/50 pt-8">
      <h2
        id="appointment-section"
        className="type-h3 scroll-mt-28 text-xl font-bold tracking-tight text-foreground"
      >
        In-person requirements
      </h2>

      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-e1"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-subtle-foreground">
              <row.Icon aria-hidden className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">{row.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {row.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
