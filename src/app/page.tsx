"use client";

/**
 * Country discovery.
 *
 * The destination stage — Mirror Hall's ring of cards over Ascend's planet —
 * fills the first screen, set in a daylight sky whose floor is the page's own
 * paper. Its filters sit beneath it, and the sections after them carry on on
 * the same paper: one light, continuous page that stops being a scene and
 * starts explaining what abizon is and does.
 *
 * What changed, and why:
 *
 * - The site header is gone from this page. A light bar above a full-bleed
 *   scene cut the page in two; `HomeNav` floats the parts of it a visitor
 *   needs (home, search, tools, tracking, account) over the stage instead.
 * - The card grid and the map are gone. The hall is the way to browse
 *   destinations now; the grid repeated it below in a second visual language.
 *   The List/Map switch went with them, since there is nothing left to switch.
 * - The filters stay, and still drive the hall: the stage is
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
import { Guilloche } from "@/components/home/PassportMarks";
import { HomeFooter } from "@/components/home/HomeFooter";
import {
  Closing,
  Collections,
  Eyebrow,
  Faq,
  Guarantee,
  HowItWorks,
  Intro,
  Services,
  Tools,
} from "@/components/home/HomeSections";

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
   * The document behind the page is the canvas every other route uses, a
   * cooler grey than this page's paper. Overscroll would show it at the edges,
   * so the root takes the paper while the homepage is mounted.
   */
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.backgroundColor;
    root.style.backgroundColor = "#f9f8f5";
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
    <div className="relative flex min-h-screen flex-col bg-paper font-sans text-ink antialiased">

      <HomeNav searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <CountryStage countries={filteredCountries} totalCount={countriesData.length} />

      <main id="main-content" tabIndex={-1} className="relative flex flex-1 flex-col">
        {/* Refine the hall. Directly under the stage, so a change is seen
            landing in the ring above it. */}
        <section
          aria-label="Filter destinations"
          className={`${CONTAINER} relative z-10 -mt-6 flex flex-col items-center md:-mt-10`}
        >
          <Eyebrow>Refine the hall</Eyebrow>

          {/* The nav's search field is desktop-only; mobile keeps its own. */}
          <div className="relative mt-5 w-full max-w-5xl md:hidden">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="search"
              aria-label="Search countries"
              placeholder="Search country"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 w-full rounded-full border border-rule bg-paper-raised pl-11 pr-4 text-base text-ink placeholder:text-ink-faint outline-none focus:border-ink/40"
            />
          </div>

          <div className="mt-4 w-full max-w-5xl md:mt-5">
            <CountryFilters values={filters} onChange={handleFilterChange} />
          </div>

          <p className="mt-4 flex items-center gap-3 text-xs text-ink-faint" aria-live="polite">
            <span>
              <span className="font-medium text-ink">{filteredCountries.length}</span> of{" "}
              {countriesData.length} destinations in the hall
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rule px-2.5 py-1 text-ink-muted transition-colors hover:border-ink/40 hover:text-ink"
              >
                <RotateCcw className="h-3 w-3" aria-hidden />
                Reset
              </button>
            )}
          </p>
        </section>

        {/* The rest of the page, on the same paper the stage's sky ends in. */}
        <div className="relative z-10 mt-8 overflow-hidden md:mt-12">
          {/* Passport security print, at the top of the sheet and behind the close. */}
          <Guilloche className="top-0 h-[620px]" />
          <Guilloche className="bottom-0 h-[460px]" />
          <div className={`${CONTAINER} relative`}>
            <Intro onShowInHall={showInHall} />
            <Services onShowInHall={showInHall} />
            <HowItWorks />
            <Guarantee />
            <Collections onShowInHall={showInHall} />
            <Tools />
            <Faq />
            <Closing onBackToHall={backToHall} />
          </div>
        </div>
      </main>

      <HomeFooter />
    </div>
  );
}
