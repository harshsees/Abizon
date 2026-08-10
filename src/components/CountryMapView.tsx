"use client";

/**
 * The map view, lifted verbatim out of `page.tsx`.
 *
 * Phase 0 flagged that the reference has no map, and Phase 2 asked whether to
 * remove it. It stays: the bottom List/Map control genuinely reaches it, the
 * pins genuinely navigate, so it is reachable functionality rather than dead
 * code — and removing reachable functionality is not this phase's call.
 *
 * It is a demonstration, though. Five hardcoded pins out of 154 destinations,
 * on a hand-drawn SVG world, captioned "mock data" in its own footnote. It is
 * a candidate for either real data or removal, but as a product decision, not
 * a side effect of a card redesign. Moving it here keeps `page.tsx` readable
 * and makes that decision easy to act on later.
 *
 * Markup is unchanged from the original beyond taking its two inputs as props.
 */

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { Country, countriesData } from "@/data/countries";

/** The five destinations the map pins, with their hand-placed coordinates. */
const PINS = [
  { index: 0, label: "Thailand (E-Visa)", top: "52%", left: "73.5%", dot: "bg-emerald-500" },
  { index: 1, label: "UAE (Express Visa)", top: "42%", left: "62%", dot: "bg-blue-500" },
  { index: 2, label: "Sri Lanka (180 Days)", top: "56%", left: "66.5%", dot: "bg-amber-500" },
  { index: 3, label: "Malaysia (Instant)", top: "57%", left: "75.5%", dot: "bg-indigo-500" },
  { index: 10, label: "France (Schengen)", top: "30%", left: "48%", dot: "bg-rose-500" },
];

type CountryMapViewProps = {
  pinCount: number;
  onSelectCountry: (country: Country) => void;
};

export function CountryMapView({ pinCount, onSelectCountry }: CountryMapViewProps) {
  return (
    <motion.div
      key="map-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="relative flex min-h-[500px] w-full flex-1 flex-col justify-between overflow-hidden rounded-[40px] border border-slate-800/80 bg-slate-900 p-6 shadow-2xl md:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-40 [background-size:24px_24px]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/90 to-slate-900/60" />

      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
            <Sparkles className="h-3 w-3 fill-yellow-400/20 text-yellow-400" /> Interactive Map View
          </span>
          <h2 className="text-xl font-bold leading-tight text-white md:text-2xl">
            Explore Visa-Required Destinations
          </h2>
          <p className="mt-1 max-w-md text-xs text-muted-foreground">
            Interactive globe pins. Click on highlighted destination dots to view details and launch the visa application.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-slate-300">
            {pinCount} active pins shown
          </span>
        </div>
      </div>

      <div className="relative z-10 flex min-h-[350px] w-full flex-1 select-none items-center justify-center py-6">
        <svg className="h-full w-full max-w-4xl text-muted-foreground opacity-20" viewBox="0 0 1000 500" fill="currentColor" aria-hidden="true">
          <path d="M100 80 Q130 50 180 60 T250 80 T280 150 T220 220 T150 200 T100 80 Z" />
          <path d="M220 230 Q250 260 270 320 T280 420 T250 450 T200 350 T220 230 Z" />
          <path d="M420 100 Q480 80 520 120 T560 180 T480 200 T420 100 Z" />
          <path d="M450 210 Q520 200 580 250 T560 380 T500 400 T440 320 T450 210 Z" />
          <path d="M540 100 Q650 60 780 120 T850 220 T720 300 T580 240 T540 100 Z" />
          <path d="M720 310 Q760 320 800 350 T750 380 T700 330 T720 310 Z" />
          <path d="M780 390 Q850 380 880 430 T820 460 T780 390 Z" />
        </svg>

        {PINS.map((pin) => (
          <button
            key={pin.label}
            type="button"
            onClick={() => onSelectCountry(countriesData[pin.index])}
            style={{ top: pin.top, left: pin.left }}
            className="group/pin absolute flex cursor-pointer flex-col items-center"
          >
            <span className="absolute -top-12 whitespace-nowrap rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[10px] font-bold text-white opacity-0 shadow-xl transition-opacity duration-200 group-hover/pin:opacity-100">
              {pin.label}
            </span>
            <span className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white shadow-lg transition-transform duration-200 group-hover/pin:scale-125 ${pin.dot}`}>
              <span className={`absolute inset-0 animate-ping rounded-full opacity-60 scale-200 ${pin.dot}`} />
            </span>
          </button>
        ))}
      </div>

      <div className="relative z-10 text-center text-xs font-medium text-muted-foreground">
        Globe map coordinates mapped using standard projections. Mock data for demonstrational completeness.
      </div>
    </motion.div>
  );
}
