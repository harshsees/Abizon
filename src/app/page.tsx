"use client";

/**
 * Country discovery.
 *
 * The page is one dark, continuous space now. The destination stage — Mirror
 * Hall's ring of cards over Ascend's planet — fills the first screen, and the
 * sections beneath it are set on the same background, so the planet sinks into
 * the page instead of ending at a seam.
 *
 * What changed, and why:
 *
 * - The site header is gone from this page. A light bar above a full-bleed
 *   scene cut the page in two; `HomeNav` floats the parts of it a visitor
 *   needs (home, search, tools, tracking, account) over the stage instead.
 * - The card grid and the map are gone. The hall is the way to browse
 *   destinations now; the grid repeated it below in a second visual language.
 *   The List/Map switch went with them, since there is nothing left to switch.
 * - The filters stay, in a dark tone, and still drive the hall: the stage is
 *   handed the same filtered list the grid used to be.
 *
 * What is left here is what belongs to the page: the search and filter state,
 * the query that applies it, and the order of the sections.
 */

import { useState, useMemo, useEffect } from "react";
import { RotateCcw, Search } from "lucide-react";

import { countriesData } from "@/data/countries";
import {
  CountryFilters,
  DEFAULT_FILTERS,
  type FilterKey,
  type FilterValues,
} from "@/components/CountryFilters";
import { CountryStage } from "@/components/country-stage/CountryStage";
import { HomeNav } from "@/components/home/HomeNav";
import { HomeFooter } from "@/components/home/HomeFooter";
import { Collections, CtaCard, Eyebrow, Faq, Steps, Tools } from "@/components/home/HomeSections";

const CONTAINER = "mx-auto w-full max-w-[1240px] px-4 md:px-6";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);

  /**
   * Seed from the URL once on mount. The value comes from `window.location`,
   * which does not exist during the server render, so a lazy `useState`
   * initialiser would make the two renders disagree; an effect after
   * hydration is the correct shape, and the extra render is its cost.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get("search");

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (searchVal) setSearchQuery(searchVal);
  }, []);

  /**
   * The document behind the page is the light canvas every other route uses.
   * Overscroll and the moment before hydration would flash it at the edges of
   * this one, so the root takes the space colour while the homepage is mounted.
   */
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.backgroundColor;
    root.style.backgroundColor = "#04060f";
    return () => {
      root.style.backgroundColor = previous;
    };
  }, []);

  const handleFilterChange = (key: FilterKey, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }));

  const filteredCountries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return countriesData.filter((country) => {
      if (query && !country.name.toLowerCase().includes(query)) return false;

      if (filters.delivery === "Within 24 Hours" && country.deliveryDays > 1) return false;
      if (filters.delivery === "Within 3 Days" && country.deliveryDays > 3) return false;
      if (filters.delivery === "Within 7 Days" && country.deliveryDays > 7) return false;

      if (filters.type !== "All Visa Types" && country.visaType !== filters.type) return false;

      if (filters.documents !== "Any Documents" && country.documents !== filters.documents) {
        return false;
      }

      if (filters.holidays === "Tomorrow (24h)" && country.deliveryDays > 1) return false;
      if (filters.holidays === "This Week (3 Days)" && country.deliveryDays > 3) return false;
      if (filters.holidays === "Next Week (7 Days)" && country.deliveryDays > 7) return false;

      return true;
    });
  }, [searchQuery, filters]);

  const hasActiveFilters =
    searchQuery !== "" ||
    (Object.keys(DEFAULT_FILTERS) as FilterKey[]).some(
      (key) => filters[key] !== DEFAULT_FILTERS[key],
    );

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSearchQuery("");
  };

  const backToHall = () => window.scrollTo({ top: 0, behavior: "smooth" });

  // A collection's "All N in the hall" sets exactly its filters and returns
  // to the stage, where the hall now holds only that collection.
  const showInHall = (next: Partial<FilterValues>) => {
    setSearchQuery("");
    setFilters({ ...DEFAULT_FILTERS, ...next });
    backToHall();
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-space font-sans text-white antialiased">
      {/* The stars the planet is set among carry on behind the whole page. */}
      <div aria-hidden className="space-stars pointer-events-none fixed inset-0 -z-0" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[70vh] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(70,55,170,0.10),transparent_70%)]"
      />

      <HomeNav searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <CountryStage countries={filteredCountries} totalCount={countriesData.length} />

      <main id="main-content" tabIndex={-1} className={`${CONTAINER} relative flex flex-1 flex-col`}>
        {/* Refine the hall. Directly under the stage, so a change is seen
            landing in the ring above it. */}
        <section aria-label="Filter destinations" className="relative z-10 -mt-6 flex flex-col items-center md:-mt-10">
          <Eyebrow>Refine the hall</Eyebrow>

          {/* The nav's search field is desktop-only; mobile keeps its own. */}
          <div className="relative mt-5 w-full max-w-5xl md:hidden">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-white/40"
            />
            <input
              type="search"
              aria-label="Search countries"
              placeholder="Search country"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 w-full rounded-full border border-white/10 bg-white/[0.04] pl-11 pr-4 text-sm text-white placeholder:text-white/40 outline-none backdrop-blur-xl focus:border-white/25"
            />
          </div>

          <div className="mt-4 w-full max-w-5xl md:mt-5">
            <CountryFilters values={filters} onChange={handleFilterChange} tone="dark" />
          </div>

          <p className="mt-4 flex items-center gap-3 text-xs text-white/45" aria-live="polite">
            <span>
              <span className="font-medium text-white/80">{filteredCountries.length}</span> of{" "}
              {countriesData.length} destinations in the hall
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-white/70 transition-colors hover:border-white/25 hover:text-white"
              >
                <RotateCcw className="h-3 w-3" aria-hidden />
                Reset
              </button>
            )}
          </p>
        </section>

        <Collections onShowInHall={showInHall} />
        <Steps />
        <Tools />
        <CtaCard onBackToHall={backToHall} />
        <Faq />
      </main>

      <HomeFooter />
    </div>
  );
}
