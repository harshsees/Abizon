"use client";

/**
 * The destination grid.
 *
 * Column ramp is driven by the card's own proportions rather than by a fixed
 * breakpoint habit.
 *
 *   base   1 col   ~358px card   (390px viewport)
 *   sm     2 cols  ~294px
 *   md     3 cols  ~230px
 *   lg     4 cols  ~223px
 *   xl     5 cols  ~226px
 *   2xl    6 cols  ~223px, ~256px once the container hits its 1680px ceiling
 *
 * Every step above `sm` gained a column. The previous ramp topped out at five
 * and put a 312px card on a 1728px screen — a card at 5:8 is then ~500px tall,
 * so two rows filled a laptop viewport entirely and the grid read as a
 * slideshow rather than a catalogue. At ~225px the card is ~360px tall and
 * three rows are visible, which is what makes 152 destinations feel browsable.
 *
 * Two columns on a phone is still rejected: it puts the card at ~171px, where
 * TYPE / VALID / FEES cannot fit on one line, and those stats being legible at
 * rest is the point of the card.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";

import { CountryCard } from "@/components/CountryCard";
import { Country } from "@/data/countries";

type CountryGridProps = {
  countries: Country[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
};

export function CountryGrid({
  countries,
  hasActiveFilters,
  onResetFilters,
}: CountryGridProps) {
  if (countries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface px-6 py-20 text-center shadow-e1">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-surface-sunken text-muted-foreground">
          <Search className="h-6 w-6" aria-hidden="true" />
        </div>
        <h3 className="type-h3 text-foreground">No countries found</h3>
        <p className="type-small mt-1 max-w-sm text-muted-foreground">
          No destinations match your filters. Try clearing some selections or
          searching for a different country.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-6 cursor-pointer rounded-xl bg-foreground px-6 py-2.5 text-xs font-bold text-surface transition-colors hover:bg-subtle-foreground"
        >
          Reset all filters
        </button>
      </div>
    );
  }

  return (
    /* The width cap sits here rather than on the grid so that the count and the
       "clear filters" link move with it. Capping only the grid centred the
       cards and left "Showing 154 countries" stranded against the far left
       margin, pointing at nothing.

       1460 = five 260px cards, four 24px gaps, and 32px of padding either side.
       The padding is the indent at the start and end of each row, and the cap
       is sized to pay for it so the card keeps its 260px rather than the inset
       being taken out of its width. On a wide screen the indent is invisible
       inside the centring space; it earns its place below ~1460px, where the
       grid would otherwise run to the page margin. */
    <div className="mx-auto w-full max-w-[1460px] px-8">
      {/* Secondary by design: the count reports on the grid, it does not
          compete with it. */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="type-caption" aria-live="polite">
          Showing{" "}
          <span className="font-semibold text-subtle-foreground" data-numeric>
            {countries.length}
          </span>{" "}
          {countries.length === 1 ? "country" : "countries"}
        </p>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="cursor-pointer text-2xs font-medium text-muted-foreground underline decoration-border-strong underline-offset-4 transition-colors hover:text-foreground hover:decoration-current"
          >
            Clear all filters
          </button>
        )}
      </div>

      <motion.div
        layout
        // Four across is the ceiling — the ramp used to carry on to five at
        // `xl` and six at `2xl`.
        //
        // Five across is the ceiling; the ramp used to carry on to six at
        // `2xl`, where the flag, the name and the turnaround were competing
        // for about 180px.
        //
        // The card's width is held by the cap on the wrapper above, not by the
        // column count. Changing columns without a cap does not resize the
        // grid, it resizes every card to fill the same container — going to
        // four columns unpinned took 260px to 402px at 1728, and since the card
        // holds a fixed aspect that made it taller too. 260 is what the card
        // measured at every width from 1440 up under the original steps, and it
        // is what it measures now. Narrower viewports never reach the cap and
        // keep shrinking as before.
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 xl:gap-6"
      >
        {/* `initial={false}` so the first paint is instant. Animating 154
            cards in on mount buys nothing — they are below the fold within two
            rows — and costs a scale/opacity animation on every one of them.
            Adds and removals still animate, which is where filtering needs it. */}
        <AnimatePresence mode="popLayout" initial={false}>
          {countries.map((country) => (
            <motion.div
              layout
              key={`${country.id}-${country.code}`}
              className="js-country-card-wrapper"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <CountryCard country={country} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
