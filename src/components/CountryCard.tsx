"use client";

/**
 * Country card, rebuilt to the reference's measured geometry.
 *
 * Everything below is taken from the reference screenshot at full resolution
 * (a 1872px-wide capture; the card measures 312 x 498 in it):
 *
 *   aspect        312/498 = 0.6265, i.e. 5/8
 *   radius        ~24px, one value at every breakpoint
 *   flag          ~26px circle, no ring
 *   name          serif, ~26px, uppercase, centred, tight leading
 *   divider       hairline, inset ~28px each side
 *   stats         TYPE / VALID / FEES, left / centre / right, no dividers
 *   content block occupies the bottom ~42% — exactly the resting panel height
 *
 * The single biggest change from the previous version: TYPE / VALID / FEES are
 * visible **at rest**. They used to be behind hover, which meant the card
 * carried no visa information at all until a mouse touched it — and on touch,
 * where there is no hover, never. The reference shows them in the resting
 * state, and that is also the accessible answer.
 *
 * The hover mechanic is deliberately unchanged, because it was already
 * reverse-engineered from the reference's shipped markup and re-deriving it
 * would only introduce drift:
 *
 *   transition-[height] duration-400 h-[42%] group-hover:h-[72%]
 *   backdrop-blur-[10px] backdrop-brightness-[60%]
 *   transition-transform duration-300 scale-100 group-hover:scale-110  (image)
 *
 * What hover reveals is now only what the resting state cannot hold: the
 * documents pill and the emergency link.
 *
 * Two deliberate departures, both retained from the previous version:
 *
 *   1. The reveal is bound to `group-focus-within` as well as hover, so a
 *      keyboard user tabbing to the card gets what a mouse user gets.
 *   2. The whole card is a real <a>, so it middle-clicks, opens in a new tab,
 *      and is announced as a link.
 *
 * No Framer here by design: this is height and transform on hover, which CSS
 * hands to the compositor for free — and there are 154 of these on screen. The
 * global prefers-reduced-motion block in globals.css collapses the transitions
 * to ~0ms, so the panel snaps rather than growing; the content stays reachable
 * either way.
 */

import Link from "next/link";
import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { Country, getCountrySlug } from "@/data/countries";

/**
 * The dataset requests every photo at 400x550 — an 0.727 aspect, for a card
 * that is now 0.625, and only 400px wide for a slot that renders at 624px on a
 * 2x display. Both are fixed here rather than in `countries.ts`, which stays
 * the source of record for visa data and is not a place to encode the current
 * card's pixel dimensions. Unsplash crops server-side from the w/h it is
 * given, so asking for the card's own aspect is what stops the crop drifting.
 */
function sizedImage(url: string, width: number): string {
  const height = Math.round(width * (8 / 5));
  return url.replace(/w=\d+/, `w=${width}`).replace(/h=\d+/, `h=${height}`);
}

/**
 * `complete` with a zero intrinsic width means the request finished and
 * produced no image — a 404, or Unsplash's error body being blocked by ORB,
 * which is how its dead photo IDs actually surface in a browser.
 */
function hideIfBroken(node: HTMLImageElement | null) {
  if (node?.complete && node.naturalWidth === 0) node.style.display = "none";
}

/** Widths the grid actually renders a card at, across its breakpoints. */
const IMAGE_WIDTHS = [400, 640, 960];

const IMAGE_SIZES = [
  "(min-width: 1536px) 312px",
  "(min-width: 1280px) 25vw",
  "(min-width: 1024px) 33vw",
  "(min-width: 640px) 50vw",
  "100vw",
].join(", ");

interface CountryCardProps {
  country: Country;
}

export function CountryCard({ country }: CountryCardProps) {
  const stats = [
    { label: "Type", value: country.visaType, align: "text-left" },
    { label: "Valid", value: country.validity, align: "text-center" },
    {
      label: country.fees.toLowerCase() === "free" ? "Cost" : "Fees",
      value: country.fees,
      align: "text-right",
    },
  ];

  return (
    // The emergency link is a sibling of the main card link rather than a
    // child: an <a> inside an <a> is invalid and browsers silently unnest it,
    // which breaks both. `group` sits on the wrapper so both respond to one
    // hover.
    <div className="group relative w-full select-none">
      <Link
        href={`/visa/${getCountrySlug(country.name)}`}
        className="block rounded-card"
      >
        {/* The gradient is a resilience measure, not decoration. Eight of the
            dataset's 38 Unsplash photos now 404 (Thailand, Sri Lanka, the UK,
            the US, Mexico, Mauritius, Seychelles, Peru), and a card whose image
            fails was rendering as a flat black rectangle. Replacing those IDs
            means editing the dataset and choosing new country imagery, neither
            of which belongs to this phase — so the card degrades to a deliberate
            dark ground instead, on which the flag, name and stats all still
            read. No JS, no per-card state, correct for all 154. */}
        <div className="relative aspect-[5/8] w-full overflow-hidden rounded-card bg-gradient-to-br from-slate-700 via-slate-800 to-slate-950 shadow-e2">
          <img
            src={sizedImage(country.imageUrl, 640)}
            srcSet={IMAGE_WIDTHS.map(
              (w) => `${sizedImage(country.imageUrl, w)} ${w}w`,
            ).join(", ")}
            sizes={IMAGE_SIZES}
            // Decorative: the country name sits in text directly beneath it,
            // inside the same link. Describing the photograph as well would
            // make a screen reader announce the destination twice.
            alt=""
            loading="lazy"
            decoding="async"
            // A dead photo otherwise leaves the browser's broken-image glyph
            // in the corner of the card. Hiding the element uncovers the
            // gradient beneath, which is the intended degraded state.
            //
            // Both hooks are needed. Above-the-fold images finish failing
            // before React hydrates, so `onError` never fires for them — the
            // ref catches those by asking the element whether it already
            // finished loading with no pixels. Lazy images below the fold
            // request later, by which point `onError` is attached.
            ref={hideIfBroken}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
            className="absolute inset-0 h-full w-full scale-100 object-cover transition-transform duration-300 ease-out group-hover:scale-110 group-focus-visible:scale-110"
          />

          {/* The scrim. A gradient over the bottom 45%, three-stop so it fades
              into the photograph instead of banding against it — the reference
              darkens toward the content rather than laying a slab over it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/85 via-black/45 to-transparent"
          />

          {/* The frosted panel. This is the animation — height only, which the
              compositor handles without touching the layout around it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] rounded-b-card backdrop-blur-[10px] backdrop-brightness-[60%] transition-[height] duration-[var(--duration-panel)] ease-out-back group-hover:h-[72%] group-focus-within:h-[72%]"
          />

          {/* Bottom-anchored content stack. Padding matches the reference's
              ~28px content inset and ~30px bottom margin. */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-7 pb-7">
            <div className="mb-3.5 h-[26px] w-[26px] overflow-hidden rounded-full shadow-e1">
              <img
                src={`https://flagcdn.com/w80/${country.code}.png`}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </div>

            {/* Serif display face, from the Phase 1 type system. `text-balance`
                keeps "United Arab Emirates" from breaking to a one-word orphan
                line, which is what the long names did on a 312px card. */}
            <h3 className="text-center font-serif text-[22px] font-medium uppercase leading-[1.05] tracking-[0.01em] text-white text-balance drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] xl:text-[26px]">
              {country.name}
            </h3>

            <div
              aria-hidden
              className="mt-3.5 h-px w-full bg-white/25"
            />

            <dl className="mt-3 grid w-full grid-cols-3 gap-1">
              {stats.map((stat) => (
                <div key={stat.label} className={stat.align}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/65">
                    {stat.label}
                  </dt>
                  <dd className="mt-0.5 whitespace-nowrap text-sm font-bold uppercase text-white">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Revealed on hover/focus — only what the resting card cannot
                hold. Desktop only: on touch there is no hover to trigger it,
                and everything essential is already visible above. */}
            <div className="hidden max-h-0 w-full overflow-hidden transition-all duration-[var(--duration-panel)] ease-out-back group-hover:max-h-[200px] group-focus-within:max-h-[200px] lg:block">
              <div className="mt-3 flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 backdrop-blur-sm transition-colors group-hover:bg-white/15">
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0 text-white/80" />
                <span className="text-2xs font-semibold text-white">
                  {country.documents}
                </span>
              </div>

              {/* Space reserved for the emergency link, which is a sibling of
                  this Link and overlays here. Without the reserve it would sit
                  on top of the documents pill. */}
              <div className="h-7" />
            </div>
          </div>
        </div>
      </Link>

      {/* Emergency assistance — the reference carries this on every card, and
          it is the one control it animates continuously. */}
      <Link
        href="/emergency-helpline"
        className="absolute inset-x-0 bottom-6 z-raised hidden max-h-0 items-center justify-center gap-1 overflow-hidden transition-all duration-[var(--duration-panel)] ease-out-back group-hover:max-h-10 group-focus-within:max-h-10 lg:flex"
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
