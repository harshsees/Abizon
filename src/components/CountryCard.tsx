"use client";

/**
 * Country card, rebuilt to the reference site's mechanic.
 *
 * The previous version lifted the card 8px, scaled it 1.03 and rotated it
 * 1.5deg on hover via Framer. The reference does none of those things — the
 * card body never moves. Instead a frosted panel pinned to the bottom edge
 * grows from 42% to 72% of the card height, and a detail block unrolls inside
 * it from max-height 0. Their exact values, lifted from the shipped markup:
 *
 *   transition-[height] duration-400 h-[42%] group-hover:h-[72%]
 *   backdrop-blur-[10px] backdrop-brightness-[60%]
 *   transition-transform duration-300 scale-100 group-hover:scale-110  (image)
 *   max-h-0 group-hover:max-h-[260px]                                  (detail)
 *
 * Two deliberate departures:
 *
 *   1. The reveal is also bound to `group-focus-within`, so a keyboard user
 *      tabbing to the card gets the same detail a mouse user gets on hover.
 *      Hover-only disclosure is unreachable without a pointer.
 *   2. The whole card is a real <a>, not a div with an onClick, so it
 *      middle-clicks, opens in a new tab, and is announced as a link.
 *
 * No Framer here by design: this is one property transitioning on hover, which
 * CSS does on the compositor for free. The global prefers-reduced-motion block
 * in globals.css collapses these transitions to ~0ms, so the panel snaps to its
 * expanded state instead of growing — the content stays reachable either way.
 */

import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { Country, getCountrySlug } from "@/data/countries";

/** "29th Jul" — the guaranteed-by date shown under every card. */
function formatGuaranteedDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);

  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });

  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${day}${suffix} ${month}`;
}

interface CountryCardProps {
  country: Country;
}

export function CountryCard({ country }: CountryCardProps) {
  const guaranteedDate = formatGuaranteedDate(country.deliveryDays);

  const stats = [
    { label: "Type", value: country.visaType },
    { label: "Valid", value: country.validity },
    {
      label: country.fees.toLowerCase() === "free" ? "Cost" : "Fees",
      value: country.fees,
    },
  ];

  return (
    // The emergency link is a sibling of the main card link rather than a
    // child: an <a> inside an <a> is invalid and browsers silently unnest it,
    // which breaks both. `group` sits on the wrapper so both still respond to
    // one hover.
    <div className="group relative w-full select-none">
      <Link
        href={`/visa/${getCountrySlug(country.name)}`}
        className="block rounded-[25px] lg:rounded-[30px]"
      >
        <div className="relative aspect-[3/4.4] w-full overflow-hidden rounded-[25px] bg-slate-900 shadow-e2 lg:rounded-[30px]">
        <img
          src={country.imageUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full scale-100 object-cover transition-transform duration-300 ease-out group-hover:scale-110 group-focus-visible:scale-110"
        />

        {/* Top scrim keeps the flag legible against bright skies. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/40 to-transparent" />

        {/* The frosted panel. This is the animation — height only, which the
            compositor handles without touching layout of anything around it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] rounded-b-[25px] backdrop-blur-[10px] backdrop-brightness-[60%] transition-[height] duration-[var(--duration-panel)] ease-out-back group-hover:h-[72%] group-focus-within:h-[72%] lg:rounded-b-[30px]"
        />

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-3 pb-4">
          <div className="mb-2 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white/60 bg-white/20 shadow-e1 backdrop-blur-sm">
            <img
              src={`https://flagcdn.com/w80/${country.code}.png`}
              alt=""
              loading="lazy"
              className="h-full w-full scale-110 object-cover"
            />
          </div>

          <h3 className="text-center text-lg font-bold uppercase leading-tight tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {country.name}
          </h3>

          <p className="mt-1.5 text-center text-2xs font-medium text-white/80">
            Guaranteed by <span className="font-bold text-white">{guaranteedDate}</span>
          </p>

          {/* Unrolls on hover/focus. Desktop only — on touch there is no hover
              state to trigger it, so the collapsed card carries the essentials
              and the full detail lives on the country page. */}
          <div className="hidden max-h-0 w-full overflow-hidden transition-all duration-[var(--duration-panel)] ease-out-back group-hover:max-h-[260px] group-focus-within:max-h-[260px] lg:block">
            <div className="mt-3 grid grid-cols-3 divide-x divide-white/15 text-center">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center px-1">
                  <span className="text-2xs font-bold uppercase tracking-wider text-white/70">
                    {stat.label}
                  </span>
                  <span className="mt-0.5 whitespace-nowrap text-xs font-extrabold uppercase text-white">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5 rounded-[30px] bg-white/10 px-[9px] py-[6px] backdrop-blur-sm transition-colors group-hover:bg-white/15">
              <ShieldCheck className="h-3.5 w-3.5 text-white/80" />
              <span className="text-2xs font-semibold text-white">
                {country.documents}
              </span>
            </div>

            {/* Space reserved for the emergency link, which is a sibling of
                this Link and overlays here. Without the reserve it would sit
                on top of the document pill. */}
            <div className="h-7" />
          </div>
        </div>
      </div>
      </Link>

      {/* Emergency assistance — the reference site puts this on every card, and
          it is the one control it animates continuously. */}
      <Link
        href="/emergency-helpline"
        className="absolute inset-x-0 bottom-4 z-10 hidden max-h-0 items-center justify-center gap-1 overflow-hidden transition-all duration-[var(--duration-panel)] ease-out-back group-hover:max-h-10 group-focus-within:max-h-10 lg:flex"
      >
        <span
          data-on-dark="true"
          className="animate-emergency-cta-shimmer bg-clip-text text-2xs font-semibold tracking-[0.02em] text-transparent underline decoration-white/70 decoration-dotted underline-offset-[3px]"
        >
          Get emergency assistance
        </span>
        <ArrowUpRight className="h-3 w-3 text-white/80" />
      </Link>
    </div>
  );
}
