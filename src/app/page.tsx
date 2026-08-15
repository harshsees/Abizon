"use client";

/**
 * Country discovery.
 *
 * This page used to hold the filter capsule (four copies of the same 50-line
 * block), the grid, the map and a slide-over drawer inline, at ~810 lines. The
 * pieces are components now — `CountryFilters`, `CountryGrid`, `CountryMapView`
 * — and what is left here is what actually belongs to the page: the filter
 * state, the query that applies it, and the view/tab switches.
 *
 * The drawer is gone. `selectedCountry` was only ever set back to `null`, so
 * nothing could open it: ~150 lines of markup no user could reach.
 */

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { List, Map, Search, Ticket } from "lucide-react";

import { countriesData, Country, getCountrySlug } from "@/data/countries";
import {
  CountryFilters,
  DEFAULT_FILTERS,
  type FilterKey,
  type FilterValues,
} from "@/components/CountryFilters";
import { CountryGrid } from "@/components/CountryGrid";
import { CountryMapView } from "@/components/CountryMapView";
import { SiteHeader } from "@/components/SiteHeader";

/**
 * The discovery container. Deliberately wider than the app's `max-w-7xl`
 * (1280px) default and deliberately local to this page: the reference's grid
 * runs ~1680px, but widening every page to match would stretch prose layouts
 * that are correct as they are.
 *
 * 1728 minus the 24px gutters leaves exactly 1680 of content, which is
 * 5 x 312px cards + 4 x 30px gaps — the reference's grid, to the pixel.
 */
const DISCOVERY_CONTAINER = "mx-auto w-full max-w-[1728px] px-4 md:px-6";

export default function Home() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"explore" | "events">("explore");
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);

  /**
   * The GSAP scroll reveal used to run over `.js-country-card-wrapper` here.
   * It has been removed, and not for taste: GSAP wrote inline transforms to
   * the same 154 wrappers that Framer's `layout` animates, the two fought over
   * the transform property, and Framer's `initial` scale of 0.97 won and stuck
   * — every card rendered 3% undersized for the life of the page, which read
   * as 45px gutters where the grid actually specifies 30px.
   *
   * One system owns card transforms now, and it is Framer, because `layout` is
   * what makes filtering re-flow smoothly and GSAP has no equivalent. The
   * magnetic-hover hook went with it: nothing on this page carries
   * `.js-magnetic-btn` any more.
   */

  /**
   * Seed from the URL once on mount. The homepage owns this state; the header
   * reads and writes it through props rather than keeping a second copy.
   *
   * The lint rule below flags synchronous `setState` in an effect because it
   * usually means state derived from props, which should be computed during
   * render instead. This is the other case: the value comes from
   * `window.location`, which does not exist during the server render.
   *
   * Seeding it in a lazy `useState` initialiser — the rule's normal remedy —
   * would make the server render "" and the first client render the seeded
   * value, which is a hydration mismatch. An effect after hydration is the
   * correct shape here, and the extra render is the cost of the URL not being
   * available to both sides.
   */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchVal = params.get("search");
    const tabVal = params.get("tab");

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (searchVal) setSearchQuery(searchVal);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tabVal === "explore" || tabVal === "events") setActiveTab(tabVal);
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

  // Map pins navigate imperatively; the cards themselves are real anchors and
  // route on their own.
  const handleCountryClick = (country: Country) =>
    router.push(`/visa/${getCountrySlug(country.name)}`);

  return (
    <div
      className="relative flex min-h-screen flex-col bg-background pb-24 font-sans text-foreground antialiased"
    >
      <SiteHeader
        variant="full"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className={`${DISCOVERY_CONTAINER} flex flex-1 flex-col py-6 md:py-8`}
      >
        {/* The header's search field is desktop-only; on mobile it lives in a
            sheet, so discovery keeps its own always-visible field. */}
        <div className="relative mb-4 w-full md:hidden">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            aria-label="Search countries"
            placeholder="Search Country"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-[var(--control-h-md)] w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Search → filters → count → grid, in that order and with room to
            breathe between them, so the whole thing reads as one system. */}
        {activeTab === "explore" && (
          <div className="mb-8 flex w-full justify-center md:mb-10">
            <div className="w-full max-w-6xl">
              <CountryFilters values={filters} onChange={handleFilterChange} />
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col justify-start">
          {activeTab === "events" ? (
            <EventsPanel onBrowseDestinations={() => setActiveTab("explore")} />
          ) : (
            <AnimatePresence mode="wait">
              {viewMode === "list" ? (
                <motion.div
                  key="list-view"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col"
                >
                  <CountryGrid
                    countries={filteredCountries}
                    hasActiveFilters={hasActiveFilters}
                    onResetFilters={resetFilters}
                  />
                </motion.div>
              ) : (
                <CountryMapView
                  pinCount={filteredCountries.length}
                  onSelectCountry={handleCountryClick}
                />
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* View switch. Kept, but pulled back to a quiet surface control — it was
          a heavy dark capsule competing with the grid it sits over. */}
      {activeTab === "explore" && (
        <div className="fixed bottom-6 left-1/2 z-sticky -translate-x-1/2">
          <div
            role="group"
            aria-label="Result view"
            className="flex items-center gap-1 rounded-full border border-border bg-surface/90 p-1 shadow-e3 backdrop-blur-md"
          >
            {([
              { mode: "list", label: "List", Icon: List },
              { mode: "map", label: "Map", Icon: Map },
            ] as const).map(({ mode, label, Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={[
                  "flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-2xs font-semibold",
                  "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]",
                  viewMode === mode
                    ? "bg-foreground text-surface"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <Icon aria-hidden className="h-3.5 w-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The Events tab.
 *
 * `activeTab` was state that nothing read: clicking Events moved the underline
 * and left the destination grid on screen, so the control claimed to switch
 * views and then didn't. The tab now branches, and this is what it branches to.
 *
 * Deliberately minimal — fixing the state architecture, not designing an
 * Events product. When there is something real to show, this is where it goes.
 */
function EventsPanel({
  onBrowseDestinations,
}: {
  onBrowseDestinations: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-20 text-center shadow-e1">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken text-muted-foreground">
        <Ticket className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="type-h2 text-foreground">Events are on the way</h2>
      <p className="type-small mt-3 max-w-md text-muted-foreground">
        We&rsquo;re putting together visa-ready trips built around concerts,
        matches and festivals abroad. Nothing is bookable here yet.
      </p>
      <button
        type="button"
        onClick={onBrowseDestinations}
        className="mt-7 cursor-pointer rounded-xl bg-foreground px-6 py-3 text-xs font-bold text-surface transition-colors hover:bg-subtle-foreground"
      >
        Browse destinations instead
      </button>
    </div>
  );
}
