"use client";

/**
 * The discovery filter capsule.
 *
 * Previously four near-identical 50-line blocks inline in `page.tsx` — same
 * markup, same dropdown, four copies, so restyling meant editing the same
 * thing four times and the fourth one drifted. It is one config array now.
 *
 * Desktop geometry:
 *
 *   height    64px, matching --header-h-compact
 *   shape     fully rounded, surface background, hairline border, soft shadow
 *   badges    28px circles, one hue per facet
 *   label     sentence case with a colon, 12px, muted, normal weight
 *   value     15px bold
 *   dividers  hairlines between groups, inset from the capsule's edges
 *
 * It was built at 82px against a reference capture and cut to 64px, because at
 * 82px it filled most of the gap between the header and the first row of cards
 * to display four values that are one word each — two stacked bars of chrome
 * before any content. Everything inside came down with the box; scaling the
 * capsule alone would have padded the same contents.
 *
 * Mobile does not get the bar at all: it becomes a 2x2 grid in a rounded card
 * at a compact type scale. Forcing four groups onto a 390px screen either
 * overflows or truncates every value, and the value is the part that matters.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronDown,
  ClipboardList,
  Plane,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type FilterKey = "delivery" | "type" | "documents" | "holidays";
export type FilterValues = Record<FilterKey, string>;

export const DEFAULT_FILTERS: FilterValues = {
  delivery: "Any Time",
  type: "All Visa Types",
  documents: "Any Documents",
  holidays: "Select Dates",
};

type FacetConfig = {
  key: FilterKey;
  label: string;
  Icon: LucideIcon;
  /** Maps to a --color-facet-* token. */
  badge: string;
  check: string;
  options: string[];
  /** Optional heading above the option list. */
  heading?: string;
  /** Dropdowns anchor left except the last, which would overflow the capsule. */
  align?: "left" | "right";
  width: string;
};

const FACETS: FacetConfig[] = [
  {
    key: "delivery",
    label: "Visa delivery",
    Icon: Zap,
    badge: "bg-facet-delivery",
    check: "text-facet-delivery",
    options: ["Any Time", "Within 24 Hours", "Within 3 Days", "Within 7 Days"],
    width: "w-56",
  },
  {
    key: "type",
    label: "Type",
    Icon: Plane,
    badge: "bg-facet-type",
    check: "text-facet-type",
    options: [
      "All Visa Types",
      "E-Visa",
      "Visa on Arrival",
      "Sticker Visa",
      "Visa Free",
    ],
    width: "w-56",
  },
  {
    key: "documents",
    label: "Documents",
    Icon: ClipboardList,
    badge: "bg-facet-documents",
    check: "text-facet-documents",
    options: [
      "Any Documents",
      "Passport Only",
      "Photo + Passport",
      "No Documents Required",
    ],
    width: "w-64",
  },
  {
    key: "holidays",
    label: "Holidays",
    Icon: Calendar,
    badge: "bg-facet-holidays",
    check: "text-facet-holidays",
    heading: "Select travel date",
    options: [
      "Select Dates",
      "Tomorrow (24h)",
      "This Week (3 Days)",
      "Next Week (7 Days)",
    ],
    align: "right",
    width: "w-64",
  },
];

type CountryFiltersProps = {
  values: FilterValues;
  onChange: (key: FilterKey, value: string) => void;
};

export function CountryFilters({ values, onChange }: CountryFiltersProps) {
  const [openKey, setOpenKey] = useState<FilterKey | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape. The listener lives here rather than
  // on the page, so the capsule owns its own dismissal.
  useEffect(() => {
    if (!openKey) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenKey(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenKey(null);
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [openKey]);

  return (
    <div
      ref={rootRef}
      className={[
        // 64px on desktop, down from 82. The capsule was reading as a second
        // header rather than a control strip: at 82px it was most of the space
        // between the real header and the first row of cards, for four values
        // that are one word each. Everything inside steps down with it — badge,
        // both type sizes, the glyph — because scaling the box alone would just
        // pad the same contents.
        //
        // 64px is not arbitrary: it is `--header-h-compact`, so the strip and
        // the condensed header are the same height and the page has one
        // horizontal rhythm instead of two near-misses.
        "relative grid w-full grid-cols-2 gap-1 rounded-2xl border border-border bg-surface p-2 shadow-e2",
        "md:flex md:h-16 md:items-stretch md:gap-0 md:rounded-full md:p-0",
      ].join(" ")}
    >
      {FACETS.map((facet, index) => (
        // `contents` so the separator and the group become siblings in the
        // capsule's own grid/flex, rather than nesting a box that would break
        // the 2-up mobile grid.
        <div key={facet.key} className="contents">
          {index > 0 && (
            <span
              aria-hidden
              className="hidden w-px flex-shrink-0 bg-border md:my-4 md:block"
            />
          )}

          <div className="relative min-w-0 md:flex-1">
            <button
              type="button"
              onClick={() =>
                setOpenKey((current) =>
                  current === facet.key ? null : facet.key,
                )
              }
              aria-haspopup="menu"
              aria-expanded={openKey === facet.key}
              className={[
                "flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left",
                "transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] hover:bg-surface-sunken",
                "md:h-full md:gap-2.5 md:rounded-full md:px-4 md:py-0",
              ].join(" ")}
            >
              <span
                aria-hidden
                className={[
                  "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white",
                  "md:h-7 md:w-7",
                  facet.badge,
                ].join(" ")}
              >
                <Facet Icon={facet.Icon} />
              </span>

              <span className="flex min-w-0 flex-col">
                <span className="truncate text-2xs font-normal leading-none text-muted-foreground md:text-xs">
                  {facet.label}:
                </span>
                <span className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-bold leading-none text-foreground md:mt-1 md:text-[15px]">
                  <span className="truncate">{values[facet.key]}</span>
                  <ChevronDown
                    aria-hidden
                    className={[
                      "h-4 w-4 flex-shrink-0 text-muted-foreground",
                      "transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]",
                      openKey === facet.key ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </span>
              </span>
            </button>

            <AnimatePresence>
              {openKey === facet.key && (
                <motion.div
                  role="menu"
                  aria-label={facet.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className={[
                    "absolute top-[calc(100%+8px)] z-overlay rounded-2xl border border-border bg-surface p-2 shadow-e4",
                    facet.align === "right" ? "right-0" : "left-0",
                    facet.width,
                  ].join(" ")}
                >
                  {facet.heading && (
                    <p className="px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                      {facet.heading}
                    </p>
                  )}

                  {facet.options.map((option) => {
                    const selected = values[facet.key] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        role="menuitemradio"
                        aria-checked={selected}
                        onClick={() => {
                          onChange(facet.key, option);
                          setOpenKey(null);
                        }}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold text-subtle-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
                      >
                        <span>{option}</span>
                        {selected && (
                          <Check
                            aria-hidden
                            className={`h-4 w-4 flex-shrink-0 ${facet.check}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Glyph sizing lives in one place so all four badges stay identical. */
function Facet({ Icon }: { Icon: LucideIcon }) {
  return <Icon className="h-4 w-4 md:h-[15px] md:w-[15px]" strokeWidth={2.25} />;
}
