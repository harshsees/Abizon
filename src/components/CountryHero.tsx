"use client";

/**
 * The country page hero.
 *
 * Replaces `TopHero`, which centred a single sans-serif line over a photo. The
 * reference leads with an editorial headline that states the destination and
 * what the page will answer, then the guarantee, then the action — in that
 * order, because the guarantee is the reason to trust the action.
 *
 * The headline is generated from data, never hardcoded per country, but the
 * shape is overridable: `headline` on the config wins if a destination needs
 * different wording (an arrival card is not "a visa", and a visa-free country
 * has nothing to apply for).
 */

import { ArrowRight } from "lucide-react";
import React from "react";

import { CountryImagePlate } from "@/components/CountryImagePlate";
import { VisaGuarantee } from "@/components/VisaGuarantee";
import type { CountryVisaConfig } from "@/lib/countryVisa";

/**
 * "Dubai Visa for Indians: Fees, Requirements, and Apply Online"
 *
 * Split into a lead and a trail so the two can be typeset differently — the
 * destination carries the weight, the rest is the promise of the page.
 */
export function buildCountryHeadline(config: CountryVisaConfig): {
  lead: string;
  trail: string;
} {
  const lead = `${config.displayName} Visa for Indians`;

  if (config.flow === "visa-free") {
    return { lead, trail: "Entry Rules, Stay Limits, and What to Carry" };
  }
  if (config.flow === "on-arrival") {
    return { lead, trail: "Fees, Requirements, and Arrival Process" };
  }
  return { lead, trail: "Fees, Requirements, and Apply Online" };
}

type CountryHeroProps = {
  config: CountryVisaConfig;
  onStart?: () => void;
};

export function CountryHero({ config, onStart }: CountryHeroProps) {
  const { lead, trail } = buildCountryHeadline(config);
  // Nothing to apply for; the page is informational.
  const applicable = config.flow !== "visa-free";

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-6 md:pt-6">
      <div className="relative overflow-hidden rounded-[28px] border border-border bg-foreground shadow-e4">
        {/* PHASE 8B: the plate is always beneath, never instead.

            It costs nothing — no request, no bytes — and it means a photograph
            that fails in the browser uncovers a designed surface rather than
            the flat near-black that 8A found on 124 pages. The `onError` below
            no longer has to leave a hole behind it. */}
        <CountryImagePlate seed={config.code} />

        {config.heroImage && (
          <img
            src={config.heroImage}
            // Described, not decorative. The headline states the destination;
            // this states what the reader is looking at, which is a different
            // fact and the only one a screen reader would otherwise miss.
            alt={config.heroImageAlt}
            // The hero is the largest image on the page and sits above the
            // fold, so it must not wait for the lazy queue.
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}

        {/* Scrim, not a dimmer. The photograph used to be knocked back to 45%
            opacity AND covered by a gradient, which left the Dubai skyline
            reading as a black rectangle. The image is now at full strength and
            only the gradient carries the text contrast: light at the top where
            nothing sits, heavy behind the heading and CTA. */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.30)_0%,rgba(2,6,23,0.62)_45%,rgba(2,6,23,0.80)_100%)]" />

        <div className="relative flex min-h-[420px] flex-col items-center justify-center px-5 py-14 text-center md:min-h-[520px] md:px-10 md:py-20">
          <h1 className="max-w-4xl text-white">
            <span className="type-h1 block">{lead}</span>
            <span className="type-h2 mt-2 block text-white/70">{trail}</span>
          </h1>

          <VisaGuarantee
            className="mt-7"
            deliveryDays={config.deliveryDays}
            countryName={config.displayName}
          />

          {applicable && onStart && (
            <button
              type="button"
              onClick={onStart}
              className="mt-7 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover"
            >
              Start Application
              <ArrowRight aria-hidden className="h-4 w-4" data-arrow />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
