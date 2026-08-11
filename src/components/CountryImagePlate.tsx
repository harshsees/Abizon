/**
 * What a destination looks like when there is no photograph of it.
 *
 * Phase 8A's P2: 124 of 152 country pages render an identical near-black
 * rectangle where the hero image should be. Individually it is inoffensive —
 * the Newsreader headline sits well on it. Across three destinations in a row
 * it reads as three failures, because a reader cannot tell a deliberate dark
 * ground from an image that did not load.
 *
 * The fix is not to find 124 photographs. It is to make the absence look
 * chosen. The plate takes its hue from the country's own ISO code, so Peru and
 * Seychelles are visibly different surfaces, while the value range stays inside
 * the product's dark palette so the white headline and the scrim above it keep
 * working unchanged.
 *
 * It is emphatically not a photograph and does not imitate one: no horizon, no
 * vignette, no blurred stand-in landscape. It asserts nothing about the place,
 * which is the entire point — the same reasoning that stopped Phase 7B from
 * showing a stock beach for Peru.
 *
 * `aria-hidden` throughout: there is nothing here to describe, and the country
 * name is already in text in every context that uses this.
 */

import { countryFallbackStyle } from "@/lib/countryImagery";
import { cn } from "@/lib/utils";

type CountryImagePlateProps = {
  /**
   * Anything stable and place-specific: an ISO code for a country, a name for a
   * place that has no code. It only has to be constant, so a destination looks
   * the same on every visit and different from its neighbour.
   */
  seed: string;
  className?: string;
};

export function CountryImagePlate({ seed, className }: CountryImagePlateProps) {
  return (
    <div
      aria-hidden
      style={countryFallbackStyle(seed)}
      className={cn("absolute inset-0 overflow-hidden", className)}
    >
      {/* The plate. Light gathers at the top, where nothing sits, and falls away
          to near-black at the bottom, which is where the card's stats and the
          hero's CTA land. */}
      <div className="absolute inset-0 bg-[radial-gradient(125%_95%_at_50%_0%,hsl(var(--country-hue)_45%_34%)_0%,hsl(var(--country-hue)_40%_17%)_48%,#020617_100%)]" />

      {/* A hairline weave, barely above the threshold of visibility. Without it
          the plate is a flat wash and reads as a placeholder; with it there is
          a surface, and the difference is what makes it look designed. */}
      <div className="absolute inset-0 opacity-[0.055] bg-[repeating-linear-gradient(135deg,#fff_0px,#fff_1px,transparent_1px,transparent_10px)]" />

      {/* A soft highlight off the top-left, so the plate has a direction rather
          than being radially symmetric — symmetry is what makes a gradient look
          machine-made. */}
      <div className="absolute -left-1/4 -top-1/3 h-2/3 w-2/3 rounded-full bg-[hsl(var(--country-hue)_60%_55%)] opacity-[0.16] blur-3xl" />
    </div>
  );
}
