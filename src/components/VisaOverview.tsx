"use client";

/**
 * The at-a-glance visa facts, rebuilt to the reference composition.
 *
 * The reference presents these as an editorial heading, a one-line description
 * of the process, and a row of three quiet rounded cards — icon, label, value.
 * The previous version was a two-row grid of icon chips in five accent colours,
 * which Phase 8D reduced to one neutral; this takes the next step and adopts
 * the card geometry.
 *
 * WHAT THE CARDS CARRY, and why it is not what the reference carries.
 *
 * The reference's three are Length of Stay / Validity / Entry. Abizon holds
 * only one of those. Phase 8D removed the other two and the note there explains
 * why at length: "Length of Stay" was rendering the same `validity` number as
 * the cell beside it under a tooltip claiming a different meaning, and "Entry:
 * Single" was a guess presented with an authoritative tooltip across 152
 * destinations. Reproducing the reference's three columns would mean putting
 * both back.
 *
 * So the cards are Validity, Visa Type and Method — the same geometry, three
 * facts the dataset can stand behind. `method` maps from `visaType` by the same
 * rule as `deriveVisaFlow`, a restatement of held data rather than a new claim.
 */

import { Clock3, FolderOpen, Smartphone } from "lucide-react";

import { Country } from "@/data/countries";
import { deriveVisaFlow, displayCountryName } from "@/lib/countryVisa";

const deriveMethod = (visaType: Country["visaType"]) =>
  visaType === "E-Visa"
    ? "Paperless"
    : visaType === "Visa on Arrival"
      ? "On Arrival"
      : "Consulate/VFS";

/**
 * The reference's subtitle is "A 100% online visa application process", which
 * is true of an e-visa and false of a sticker visa — the applicant attends a
 * mission in person. Branching on the flow keeps the line and its accuracy.
 */
function describeProcess(country: Country): string {
  switch (deriveVisaFlow(country.visaType)) {
    case "visa-free":
      return "No application, no fee — entry is granted at the border";
    case "on-arrival":
      return "Prepared online, issued to you on arrival";
    case "embassy":
      return "Prepared and filed online, collected at the mission";
    default:
      return "A 100% online visa application process";
  }
}

export function VisaOverview({ country }: { country: Country }) {
  const displayName = displayCountryName(country);
  const methodType = deriveMethod(country.visaType);

  const facts = [
    { icon: Clock3, label: "Validity", value: country.validity },
    { icon: Smartphone, label: "Visa Type", value: country.visaType },
    { icon: FolderOpen, label: "Method", value: methodType },
  ];

  return (
    <div>
      {/* Serif, and at display size — the reference treats each section title
          as an editorial header rather than a UI label, which is most of what
          makes the page read as a magazine and not a dashboard.

          h2, not h1: the hero carries the page's one h1 (Phase 8D §23). */}
      <h2
        id="visa-info-section"
        className="type-h2 scroll-mt-28 text-foreground js-reveal-heading"
      >
        Visa Information
      </h2>
      <p className="mt-2.5 text-base text-muted-foreground">
        {describeProcess(country)}
      </p>

      <dl className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="rounded-3xl border border-border bg-surface-sunken p-5"
          >
            <fact.icon
              aria-hidden
              className="h-6 w-6 text-foreground"
              strokeWidth={1.6}
            />
            <dt className="mt-5 text-sm font-medium text-muted-foreground">
              {fact.label}
            </dt>
            <dd className="mt-1 text-lg font-bold tracking-tight text-foreground">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      <span className="sr-only">
        These facts apply to the {displayName} visa described on this page.
      </span>
    </div>
  );
}
