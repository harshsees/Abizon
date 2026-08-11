"use client";

/**
 * Required documents.
 *
 * Rebuilt in Phase 4. It previously rendered one or two unlabelled pills
 * floating under a heading, which told a visitor what to bring but nothing
 * about how, or what was checked.
 *
 * Everything shown is derived from `country.documents` — the only requirement
 * data Keyrise has — through `lib/application/documents.ts`.
 *
 * Phase 5A moved the list there rather than leaving a copy here. This component
 * and the application flow have to agree about what a destination asks for, and
 * they did not: the flow demanded a photograph and a passport from everyone
 * while this section correctly told Dubai applicants the passport was enough.
 * The copy now has one home; only the icon mapping is a local presentation
 * choice.
 *
 * `CountryVisaConfig.requirements` is where a richer, per-country checklist
 * goes when it exists.
 */

import { Camera, FileScan, ShieldCheck } from "lucide-react";

import { Country } from "@/data/countries";
import { requiredDocuments, type DocumentKind } from "@/lib/application/documents";
import { displayCountryName } from "@/lib/countryVisa";

const ICONS: Record<DocumentKind, typeof FileScan> = {
  passport: FileScan,
  photograph: Camera,
};

export function VisaRequirements({ country }: { country: Country }) {
  const displayName = displayCountryName(country);
  const requirements = requiredDocuments(country.documents);

  return (
    <section
      id="requirements-section"
      className="scroll-mt-28 border-t border-border pt-10 md:pt-12"
    >
      <h2 className="text-2xl font-bold tracking-tight text-foreground js-reveal-heading">
        What you need for {displayName}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
        {requirements.length === 0
          ? `${displayName} does not ask for documents to be submitted before you travel.`
          : "Everything below is required. You can scan each one with your phone during the application — nothing needs printing or posting."}
      </p>

      {requirements.length > 0 && (
        <ul className="mt-6 divide-y divide-border border-t border-border">
          {requirements.map((requirement) => {
            const Icon = ICONS[requirement.kind];
            return (
            <li
              key={requirement.kind}
              className="js-checklist-item flex gap-4 py-5"
            >
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-sunken text-subtle-foreground">
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {requirement.label}
                </p>
                <p className="mt-1 max-w-xl text-xs leading-relaxed text-muted-foreground">
                  {requirement.detail}
                </p>
              </div>
            </li>
            );
          })}
        </ul>
      )}

      <p className="mt-5 flex items-center gap-2 text-2xs text-muted-foreground">
        <ShieldCheck aria-hidden className="h-3.5 w-3.5 flex-shrink-0 text-success" />
        Each document is checked against {displayName}&rsquo;s requirements before
        your application is filed.
      </p>
    </section>
  );
}
