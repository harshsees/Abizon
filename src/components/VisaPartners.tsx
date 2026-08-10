"use client";

/**
 * Partner authorities.
 *
 * Which partners appear is driven by `CountryVisaConfig.partners` rather than
 * rendered unconditionally. Before this, all ~154 country pages displayed
 * "Ministry of Foreign Affairs" and "Government of Dubai" — so Japan's visa
 * page claimed a partnership with the government of Dubai.
 *
 * The card markup is unchanged from `VisaInfoAndPlans`; only the gating is new.
 * Nothing new is asserted: the two UAE bodies show for the UAE because they are
 * UAE bodies, and IATA shows everywhere because it is a global industry
 * association. Real per-country partner lists belong in the dataset.
 */

import type { CountryVisaConfig } from "@/lib/countryVisa";

export function VisaPartners({ config }: { config: CountryVisaConfig }) {
  const show = (key: CountryVisaConfig["partners"][number]) =>
    config.partners.includes(key);

  return (
    <div className="pt-8 border-t border-border/50 space-y-5">
      <div>
        <h2
          id="partners-section"
          className="text-2xl font-bold text-foreground tracking-tight scroll-mt-28 js-reveal-heading"
        >
          Partners We Work With
        </h2>
      </div>
      <div className="grid grid-cols-3 gap-4 max-w-lg">
        {show("uae-mofa") && (
          <div className="flex flex-col items-center justify-center bg-surface border border-border/40 rounded-3xl p-4 aspect-square shadow-sm hover:shadow-md transition duration-300 gap-2">
            <svg className="h-10 w-10 text-primary-subtle-foreground" viewBox="0 0 100 100" fill="currentColor">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="2 2" />
              <path d="M50 20 C45 35 25 40 15 50 C25 50 35 45 50 35 C65 45 75 50 85 50 C75 40 55 35 50 20 Z" />
              <circle cx="50" cy="45" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M43 45 L43 53 L57 53 L57 45 Z" fill="white" />
              <path d="M43 45 L43 53 L47 53 L47 45 Z" fill="#c2410c" />
              <path d="M47 45 L47 47.6 L57 47.6 L57 45 Z" fill="#15803d" />
              <path d="M47 50.4 L47 53 L57 53 L57 50.4 Z" fill="black" />
            </svg>
            <p className="text-[8px] md:text-[9px] font-bold text-center tracking-tight text-amber-800 uppercase leading-tight mt-1 max-w-[85px]">
              Ministry of Foreign Affairs
            </p>
          </div>
        )}

        {show("dubai-government") && (
          <div className="flex flex-col items-center justify-center bg-surface border border-border/40 rounded-3xl p-4 aspect-square shadow-sm hover:shadow-md transition duration-300 gap-2">
            <svg className="h-10 w-24 text-red-600" viewBox="0 0 120 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 20 C20 10 35 15 45 25 C55 15 70 10 80 20 C90 15 105 15 115 25" />
              <path d="M30 15 C35 5 45 5 50 15" />
              <path d="M75 15 C80 5 90 5 95 15" />
            </svg>
            <p className="text-[8px] md:text-[9px] font-extrabold text-center tracking-wider text-red-600 uppercase leading-none mt-1">
              Government of Dubai
            </p>
          </div>
        )}

        {show("iata") && (
          <div className="flex flex-col items-center justify-center bg-surface border border-border/40 rounded-3xl p-4 aspect-square shadow-sm hover:shadow-md transition duration-300 gap-2">
            <svg className="h-10 w-20 text-sky-800" viewBox="0 0 100 40" fill="currentColor">
              <path d="M10 15 H40 L35 25 H5 Z" />
              <path d="M90 15 H60 L65 25 H95 Z" />
              <circle cx="50" cy="20" r="14" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M36 20 H64" stroke="currentColor" strokeWidth="2" />
              <path d="M50 6 V34" stroke="currentColor" strokeWidth="2" />
              <path d="M39 12 C44 15 56 15 61 12" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M39 28 C44 25 56 25 61 28" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p className="text-[10px] md:text-[11px] font-black text-center tracking-widest text-sky-900 uppercase leading-none mt-1">
              IATA
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
