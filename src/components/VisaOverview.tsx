"use client";

/**
 * The at-a-glance visa facts: type, stay, validity, entry, method.
 *
 * Split out of the 1237-line `VisaInfoAndPlans`. Markup is unchanged.
 *
 * `entry` and `method` are DERIVED, not sourced. The dataset carries neither,
 * so they are inferred from `visaType`. They are plausible, not verified for
 * any individual country. `CountryVisaConfig` has real `entryType` and
 * `applicationMethod` fields waiting; once those are populated, delete the two
 * derive helpers below and read the config instead.
 */

import { CalendarDays, Clock3, FileText, FolderOpen, Smartphone } from "lucide-react";

import { Country } from "@/data/countries";
import { displayCountryName } from "@/lib/countryVisa";

/** Inferred, not data — see the note above. */
const deriveEntry = (visaType: Country["visaType"]) =>
  visaType === "Sticker Visa" ? "Single/Multiple" : "Single";

const deriveMethod = (visaType: Country["visaType"]) =>
  visaType === "E-Visa"
    ? "Paperless"
    : visaType === "Visa on Arrival"
      ? "On Arrival"
      : "Consulate/VFS";

export function VisaOverview({ country }: { country: Country }) {
  const displayName = displayCountryName(country);
  const entryType = deriveEntry(country.visaType);
  const methodType = deriveMethod(country.visaType);

  return (
      <div>
        <h1 id="visa-info-section" className="text-2xl font-bold text-foreground scroll-mt-28 js-reveal-heading">
          {displayName} visa information
        </h1>
        {/* Scaled up borderless visa info details aligned in a column grid */}
        <div className="mt-5 space-y-5">
          {/* Row 1: 3 components scaled up */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-b border-border/50 pb-5">
            {/* 1. Visa Type */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Smartphone className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Visa Type:</p>
                <p className="text-base md:text-lg font-extrabold text-foreground mt-0.5">{country.visaType}</p>
              </div>
            </div>

            {/* 2. Length of Stay */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <CalendarDays className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Length of Stay:</p>
                <div className="relative group inline-block mt-0.5">
                  <span className="text-base md:text-lg font-extrabold text-foreground underline decoration-slate-400 decoration-dotted underline-offset-4 cursor-pointer">
                    {country.validity}
                  </span>
                  {/* Tooltip Box */}
                  <div className="absolute top-full left-0 mt-2.5 hidden group-hover:block w-[280px] bg-surface border border-border rounded-2xl p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] z-30 pointer-events-none">
                    <p className="text-sm font-bold text-foreground">Length of Stay: {country.validity}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {`The maximum duration that you are allowed to remain in ${displayName} after entering with that particular visa.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Validity */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-success-subtle-foreground">
                <Clock3 className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Validity:</p>
                <div className="relative group inline-block mt-0.5">
                  <span className="text-base md:text-lg font-extrabold text-foreground underline decoration-slate-400 decoration-dotted underline-offset-4 cursor-pointer">
                    {country.validity}
                  </span>
                  {/* Tooltip Box */}
                  <div className="absolute top-full left-0 mt-2.5 hidden group-hover:block w-[280px] bg-surface border border-border rounded-2xl p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] z-30 pointer-events-none">
                    <p className="text-sm font-bold text-foreground">Validity Period: {country.validity}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {`The number of days your visa is active after the date of issuance. We ensure your visa is valid based on your travel dates.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: remaining 2 components scaled up and aligned */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-1">
            {/* 4. Entry */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <FileText className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Entry:</p>
                <div className="relative group inline-block mt-0.5">
                  <span className="text-base md:text-lg font-extrabold text-foreground underline decoration-slate-400 decoration-dotted underline-offset-4 cursor-pointer">
                    {entryType}
                  </span>
                  {/* Tooltip Box */}
                  <div className="absolute top-full left-0 mt-2.5 hidden group-hover:block w-[280px] bg-surface border border-border rounded-2xl p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] z-30 pointer-events-none">
                    <p className="text-sm font-bold text-foreground">Entry: {entryType}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {`You can enter the country only once during the visa's validity period and cannot re-enter using the same visa once you've exited.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Method */}
            <div className="flex items-center gap-3.5 js-info-item">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-primary-subtle-foreground">
                <FolderOpen className="h-5.5 w-5.5" />
              </div>
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Method:</p>
                <div className="relative group inline-block mt-0.5">
                  <span className="text-base md:text-lg font-extrabold text-foreground underline decoration-slate-400 decoration-dotted underline-offset-4 cursor-pointer">
                    {methodType}
                  </span>
                  {/* Tooltip Box */}
                  <div className="absolute top-full left-0 mt-2.5 hidden group-hover:block w-[280px] bg-surface border border-border rounded-2xl p-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] z-30 pointer-events-none">
                    <p className="text-sm font-bold text-foreground">Method: {methodType}</p>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                      {`Apply and receive your visa fully online. No paperwork needed.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 3rd Column is empty for alignment balance */}
            <div className="hidden sm:block" />
          </div>
        </div>
      </div>
  );
}
