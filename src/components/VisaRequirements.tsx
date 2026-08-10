"use client";

/**
 * Required documents.
 *
 * Rebuilt in Phase 4. It previously rendered one or two unlabelled pills
 * floating under a heading, which told a visitor what to bring but nothing
 * about how, or what was checked.
 *
 * Everything shown is derived from `country.documents` — the only requirement
 * data Keyrise has. That field has exactly three values, so this component has
 * exactly three shapes and invents nothing:
 *
 *   "Passport Only"          passport
 *   "Photo + Passport"       passport + photograph
 *   "No Documents Required"  an explicit empty state, not a blank section
 *
 * There is deliberately no "optional" or "conditional" tier. The dataset does
 * not distinguish them, and inventing the distinction would be worse than
 * omitting it — a traveller who reads "optional" and skips a document has been
 * misled by us. Every item here is required. `CountryVisaConfig.requirements`
 * is where a richer, per-country checklist goes when it exists.
 */

import { Camera, FileScan, ShieldCheck } from "lucide-react";

import { Country } from "@/data/countries";
import { displayCountryName } from "@/lib/countryVisa";

type Requirement = {
  Icon: typeof FileScan;
  label: string;
  detail: string;
};

const PASSPORT: Requirement = {
  Icon: FileScan,
  label: "Passport front page",
  detail:
    "A clear scan or photo of the page carrying your details. Must be valid for at least six months beyond your travel date.",
};

const PHOTOGRAPH: Requirement = {
  Icon: Camera,
  label: "Passport-size photograph",
  detail:
    "Plain light background, face square to the camera, no headwear or tinted glasses. You can take this in the application.",
};

function requirementsFor(documents: Country["documents"]): Requirement[] {
  switch (documents) {
    case "Photo + Passport":
      return [PASSPORT, PHOTOGRAPH];
    case "Passport Only":
      return [PASSPORT];
    case "No Documents Required":
      return [];
    default:
      return [];
  }
}

export function VisaRequirements({ country }: { country: Country }) {
  const displayName = displayCountryName(country);
  const requirements = requirementsFor(country.documents);

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h2
          id="requirements-section"
          className="scroll-mt-28 text-2xl font-bold tracking-tight text-foreground js-reveal-heading"
        >
          What you need for {displayName}
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {requirements.length === 0
            ? `${displayName} does not ask for documents to be submitted before you travel.`
            : "Everything below is required. You can scan each one with your phone during the application — nothing needs printing or posting."}
        </p>
      </div>

      {requirements.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {requirements.map((requirement) => (
            <li
              key={requirement.label}
              className="flex items-start gap-4 p-5 js-checklist-item"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-subtle-foreground">
                <requirement.Icon aria-hidden className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">
                  {requirement.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {requirement.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-center gap-2 text-2xs text-muted-foreground">
        <ShieldCheck aria-hidden className="h-3.5 w-3.5 flex-shrink-0 text-success" />
        Each document is checked against {displayName}&rsquo;s requirements before
        your application is filed.
      </p>
    </section>
  );
}
