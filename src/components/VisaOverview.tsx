"use client";

/**
 * The at-a-glance visa facts: type, validity, method.
 *
 * Split out of the 1237-line `VisaInfoAndPlans`.
 *
 * `method` is DERIVED, not sourced — mapped from `visaType` by the same rule as
 * `deriveVisaFlow`, which is a restatement of data already held rather than a
 * new claim. `CountryVisaConfig` has a real `applicationMethod` field waiting;
 * once it is populated, delete the helper below and read the config instead.
 *
 * Phase 8D removed "Length of Stay" and "Entry" — see the note in the markup.
 */

import { Clock3, FolderOpen, Smartphone } from "lucide-react";

import { Country } from "@/data/countries";
import { displayCountryName } from "@/lib/countryVisa";

const deriveMethod = (visaType: Country["visaType"]) =>
  visaType === "E-Visa"
    ? "Paperless"
    : visaType === "Visa on Arrival"
      ? "On Arrival"
      : "Consulate/VFS";

export function VisaOverview({ country }: { country: Country }) {
  const displayName = displayCountryName(country);
  const methodType = deriveMethod(country.visaType);

  return (
      <div>
        {/* PHASE 8D §23: was an <h1>, which gave every country page two of them
            — the hero's headline and this. A document has one h1; a screen
            reader listing headings saw two competing page titles, and the
            section headings below were structurally siblings of the page
            title rather than children of it. `id` and styling are unchanged,
            so the sub-nav anchor and scroll-spy are unaffected. */}
        <h2 id="visa-info-section" className="text-2xl font-bold text-foreground scroll-mt-28 js-reveal-heading">
          {displayName} visa information
        </h2>
        {/**
         * PHASE 8D. Two of the five facts were removed, and both removals are
         * corrections to Phase 8C rather than visual changes:
         *
         * "Length of Stay" rendered `country.validity` — the same field, the
         * same number, as the "Validity" cell two columns to its right — under
         * a tooltip explaining that it meant something different ("the maximum
         * duration you are allowed to remain"). Stay length and validity are
         * genuinely different facts, and the dataset holds only one of them, so
         * this labelled one number as two. 8C §13 asks for exactly this: use
         * the dataset where it exists, otherwise hide the field.
         *
         * "Entry: Single" was inferred from `visaType` by a two-line helper and
         * presented with an authoritative tooltip — "you can enter the country
         * only once during the visa's validity period and cannot re-enter". For
         * 152 destinations, unverified. 8C §14 forbids guessing single vs
         * multiple entry; the guess survived that phase because it lives in a
         * component rather than in the config fields 8C audited.
         *
         * What remains is sourced or safely derived: `visaType` and `validity`
         * come from the dataset, and `method` maps from `visaType` by the same
         * rule as `deriveVisaFlow`, which 8C classified as legitimately derived.
         *
         * Three cells also grid more cleanly than five across two rows, which
         * is why §10's clutter reduction and this correction land together.
         */}
        <div className="mt-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-1">
            {/* 1. Visa Type */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-sunken text-muted-foreground">
                <Smartphone className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Visa Type:</p>
                <p className="text-base md:text-lg font-extrabold text-foreground mt-0.5">{country.visaType}</p>
              </div>
            </div>

            {/* 3. Validity */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-sunken text-muted-foreground">
                <Clock3 className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Validity:</p>
                <div className="relative group inline-block mt-0.5">
                  <span className="text-base md:text-lg font-extrabold text-foreground underline decoration-slate-400 decoration-dotted underline-offset-4 cursor-pointer">
                    {country.validity}
                  </span>
                  {/* Tooltip Box */}
                  <div className="absolute top-full left-0 mt-2.5 hidden group-hover:block w-[280px] max-w-[calc(100vw-2.5rem)] bg-surface border border-border rounded-2xl p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] z-30 pointer-events-none">
                    <p className="text-sm font-bold text-foreground">Validity Period: {country.validity}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {`The number of days your visa is active after the date of issuance. We ensure your visa is valid based on your travel dates.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Method */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface-sunken text-muted-foreground">
                <FolderOpen className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Method:</p>
                <div className="relative group inline-block mt-0.5">
                  <span className="text-base md:text-lg font-extrabold text-foreground underline decoration-slate-400 decoration-dotted underline-offset-4 cursor-pointer">
                    {methodType}
                  </span>
                  {/* Tooltip Box */}
                  <div className="absolute top-full left-0 mt-2.5 hidden group-hover:block w-[280px] max-w-[calc(100vw-2.5rem)] bg-surface border border-border rounded-2xl p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] z-30 pointer-events-none">
                    <p className="text-sm font-bold text-foreground">Method: {methodType}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {`Apply and receive your visa fully online. No paperwork needed.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
  );
}
