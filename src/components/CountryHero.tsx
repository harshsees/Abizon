"use client";

/**
 * The country page hero — rebuilt to the reference composition.
 *
 * The reference leads with the destination and the *commitment* on two lines,
 * the second in green, then a strip of three hard facts, then a single quiet
 * action. That ordering is the whole idea: what is this, when will it arrive,
 * what does it cost, what do I do. The previous hero stated the destination and
 * then a page-contents subtitle ("Fees, Requirements, and Apply Online"), which
 * describes the document rather than the product.
 *
 * WHAT IS DIFFERENT FROM THE REFERENCE, and why:
 *
 *   The reference's strip reads VALID / PURPOSE / MAX STAY. Abizon's dataset
 *   has `validity` and nothing for purpose or maximum stay — those were the
 *   exact fields Phase 8C §13/§14 and Phase 8D removed as unsupported. The
 *   strip therefore carries three facts the dataset actually holds: validity,
 *   visa type, and the government fee.
 *
 *   The green line is generated from `deliveryDays`, so it states Abizon's own
 *   guarantee rather than a number copied from a competitor. Dubai is 1 day
 *   here, not 2.
 *
 * The headline is generated from data, never hardcoded per country, and the
 * shape stays overridable: `headline` on the config wins where a destination
 * needs different wording.
 */

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import React from "react";

import { CountryImagePlate } from "@/components/CountryImagePlate";
import type { CountryVisaConfig } from "@/lib/countryVisa";

/**
 * "Dubai Visa for Indians" + "in exactly 1 day".
 *
 * Split so the two can be typeset differently — the destination carries the
 * weight, the commitment carries the colour.
 */
export function buildCountryHeadline(config: CountryVisaConfig): {
  lead: string;
  accent: string;
} {
  const lead = `${config.displayName} Visa for Indians`;

  if (config.flow === "visa-free") {
    // Nothing is being delivered, so there is no delivery promise to make.
    return { lead: `${config.displayName} for Indians`, accent: "no visa needed" };
  }

  const days = config.deliveryDays;
  return {
    lead,
    accent: `in exactly ${days} ${days === 1 ? "day" : "days"}`,
  };
}

/**
 * The three facts under the headline. Every one is read from the dataset — the
 * strip shrinks rather than inventing a third column if a fact is missing.
 */
function heroFacts(config: CountryVisaConfig): Array<{ label: string; value: string }> {
  const facts: Array<{ label: string; value: string }> = [];

  if (config.validity) facts.push({ label: "Valid", value: config.validity });
  facts.push({ label: "Type", value: config.visaType });

  const fee = config.pricing.governmentFee;
  if (typeof fee === "number") {
    facts.push({
      label: fee === 0 ? "Govt. fee" : "Govt. fee",
      value: fee === 0 ? "Free" : `₹${fee.toLocaleString("en-IN")}`,
    });
  }

  return facts;
}

type CountryHeroProps = {
  config: CountryVisaConfig;
  /** Scrolls to the documents section — the reference's primary hero action. */
  onCheckDocuments?: () => void;
};

export function CountryHero({ config, onCheckDocuments }: CountryHeroProps) {
  const { lead, accent } = buildCountryHeadline(config);
  const facts = heroFacts(config);
  const applicable = config.flow !== "visa-free";

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-6 md:pt-6">
      <div className="relative overflow-hidden rounded-[28px] border border-border bg-foreground shadow-e4">
        {/* The plate is always beneath, never instead — a photograph that fails
            uncovers a designed surface rather than a flat near-black. */}
        <CountryImagePlate seed={config.code} />

        {config.heroImage && (
          <img
            src={config.heroImage}
            srcSet={config.heroImageSrcSet}
            /* The band is the container's full width up to its 1280px ceiling,
               and full viewport width below `md`. Without this the browser
               assumes 100vw of a *layout* pixel and pulls the 1920 rendition
               onto a phone. */
            sizes={config.heroImageSrcSet ? "(min-width: 1280px) 1232px, 100vw" : undefined}
            alt={config.heroImageAlt}
            fetchPriority="high"
            /* Inline because the value is data — 152 destinations, two
               possible answers, computed from each file's own aspect. Tailwind
               cannot see a class name assembled at runtime, and safelisting the
               pair to save one style attribute is a worse trade. */
            style={{ objectPosition: config.heroImageFocus }}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}

        {/* Scrim, not a dimmer. Heavier in the middle band where the headline
            and the strip sit, lighter at top and bottom so the photograph still
            reads as a photograph at its edges. */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.42)_0%,rgba(2,6,23,0.66)_45%,rgba(2,6,23,0.72)_100%)]" />

        {/* The band's height.
            It was a flat 520/640px, which on a 1080p laptop left the hero
            hanging past the fold with the sub-nav below it — the section could
            never be seen whole, which is the one thing a hero has to manage.
            It is now bounded by the viewport instead: whatever is left after
            the header, the 24px of top gutter and enough room for the sub-nav
            to show underneath, with a floor so it cannot collapse on a short
            window and a ceiling so it cannot balloon on a tall one. `dvh`
            rather than `vh` so a mobile URL bar collapsing does not resize it
            mid-scroll. */}
        <div className="relative flex min-h-[420px] flex-col items-center justify-center px-5 py-14 text-center md:min-h-[clamp(440px,calc(100dvh-var(--header-h-compact)-9rem),580px)] md:px-10 md:py-20">
          <h1 className="max-w-4xl text-balance">
            <span className="type-h1 block text-white">{lead}</span>
            {/* The commitment, in the one accent this page uses for it. Green
                reads as "settled" next to the amber that means "act". */}
            <span className="type-h1 mt-1 block text-[#5DE28E]">{accent}</span>
          </h1>

          {facts.length > 0 && (
            <dl className="mt-10 flex flex-wrap items-start justify-center gap-x-10 gap-y-5 md:mt-12 md:gap-x-16">
              {facts.map((fact) => (
                <div key={fact.label} className="min-w-[84px]">
                  <dt className="text-2xs font-bold uppercase tracking-[0.14em] text-white/60">
                    {fact.label}
                  </dt>
                  <dd
                    data-numeric
                    className="mt-1.5 text-sm font-bold uppercase tracking-[0.02em] text-white md:text-base"
                  >
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {/* ONE action, and it is the low-commitment one.
              The reference's hero has a single white pill reading "Check
              Required Documents" and keeps "Start Application" in the sub-nav.
              This used to render a second, ghost-styled "Start Application"
              beside it — which put the page's two primary journeys 12px apart,
              at the one moment the reader has read nothing yet. The sub-nav
              carries the application CTA from the moment the hero leaves the
              screen, so nothing is lost by asking for a look first. */}
          {onCheckDocuments && (
            <div className="mt-10 flex justify-center md:mt-12">
              <button
                type="button"
                onClick={onCheckDocuments}
                className="inline-flex h-13 cursor-pointer items-center rounded-full bg-white px-8 text-sm font-bold text-slate-900 shadow-e2 transition-[background-color,transform] duration-[--duration-fast] ease-[--ease-out] hover:bg-white/90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transform-none"
              >
                {applicable ? "Check Required Documents" : "Check Entry Rules"}
              </button>
            </div>
          )}

          {/* PHASE 9 §69. The arrival card, for the handful of destinations
              that operate one — and only where `lib/arrivalCard.ts` has an
              entry somebody has checked, so a hero cannot advertise a form
              nobody confirmed exists.

              Set below the hero's own action and in a quieter treatment,
              because for most of these destinations the visa is still the
              thing the visitor came for. It is a separate free product, not a
              second front door to the same one, and the wording says so —
              a visitor who mistakes it for the visa has been misled by us. */}
          {config.arrivalCard && (
            <div className="mt-5 flex justify-center">
              <Link
                href={`/arrival-card/${config.slug}`}
                className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-2xs font-semibold text-white/85 underline decoration-white/40 decoration-dotted underline-offset-4 transition-colors hover:text-white hover:decoration-white/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Get your {config.displayName} {config.arrivalCard.noun} — free
                <ArrowUpRight
                  aria-hidden
                  className="size-3.5 transition-transform duration-[--duration-fast] group-hover:translate-x-px group-hover:-translate-y-px motion-reduce:transform-none"
                />
              </Link>
            </div>
          )}
        </div>

        {/* Attribution.
            Most of these photographs are CC BY or CC BY-SA, which require the
            author to be named wherever the work is shown. Set at the smallest
            size the type scale allows and at 55% white so it discharges the
            obligation without joining the composition — a credit that competes
            with the headline is a worse answer than no credit at all. Rendered
            only when there is a licence to satisfy. */}
        {config.heroImage && config.heroImageCredit && (
          <p className="absolute bottom-2 right-4 text-[10px] leading-none text-white/55">
            {config.heroImageCredit}
          </p>
        )}
      </div>
    </section>
  );
}
