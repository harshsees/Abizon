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
 * The hover mechanic is still a height transition on a frosted panel plus a
 * scale on the image, but the panel's top edge is now masked rather than cut:
 *
 *   transition-[height] duration-400 h-[46%] group-hover:h-[76%]
 *   backdrop-blur-[12px] backdrop-brightness-[65%] + a linear-gradient mask
 *   transition-transform duration-300 scale-100 group-hover:scale-110  (image)
 *
 * The mask is the fix for what read as a *line* sweeping up the card on hover.
 * A backdrop-filter is applied at full strength to the element's exact box, so
 * however soft the blur is, the boundary where it begins is a hard edge — and
 * animating the height animates that edge. Masking the panel's alpha ramps the
 * filter in instead, so what moves is a soft shadow rather than a rule.
 *
 * The geometry is otherwise scaled down from the 312px reference card: the
 * grid now runs up to six columns and the card lands around 225px, so the type
 * ramp, the flag and the insets all step down with it. Only the 5:8 aspect and
 * the 24px radius are held.
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

import { CountryImagePlate } from "@/components/CountryImagePlate";
import { Country, getCountrySlug } from "@/data/countries";
import { countryCardImage } from "@/lib/countryImagery";
import { formatGovernmentFee, isGovernmentFeeFree } from "@/lib/countryVisa";

/**
 * `complete` with a zero intrinsic width means the request finished and
 * produced no image — a 404, or Unsplash's error body being blocked by ORB,
 * which is how its dead photo IDs actually surface in a browser.
 *
 * PHASE 8B note: the manifest means no card should ever request a dead id
 * again, so this is now a net rather than a mechanism. It stays because a live
 * id can still fail in the wild — an outage, a blocked third party, a photo
 * withdrawn after review — and the plate underneath makes that failure land
 * somewhere designed.
 */
function hideIfBroken(node: HTMLImageElement | null) {
  if (node?.complete && node.naturalWidth === 0) node.style.display = "none";
}

const IMAGE_SIZES = [
  "(min-width: 1536px) 17vw",
  "(min-width: 1280px) 20vw",
  "(min-width: 1024px) 25vw",
  "(min-width: 768px) 33vw",
  "(min-width: 640px) 50vw",
  "100vw",
].join(", ");

interface CountryCardProps {
  country: Country;
}

export function CountryCard({ country }: CountryCardProps) {
  const photo = countryCardImage(getCountrySlug(country.name));

  const stats = [
    { label: "Type", value: country.visaType, align: "text-left" },
    { label: "Valid", value: country.validity, align: "text-center" },
    {
      // PHASE 8C §9: both tests go through the same parser, so Japan's "₹0"
      // and Mauritius's "Free" render identically instead of one card saying
      // "FEES ₹0" and the other "COST Free" for the same fact.
      label: isGovernmentFeeFree(country.fees) ? "Cost" : "Fees",
      value: formatGovernmentFee(country.fees),
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
        {/* PHASE 8B. This used to read `country.imageUrl` — whatever the
            dataset held, dead or generic or another country's — and lean on a
            gradient to catch the failures. It now asks the manifest, which
            answers only for photographs someone has opened and confirmed. 141
            of 152 destinations have no such photograph and render the plate,
            which is a designed surface rather than the absence of one.

            The card no longer resizes a URL by string replacement either: the
            manifest derives a 5:8 card rendition and a 16:9 hero rendition
            independently, so neither can ever become the other. */}
        <div className="relative aspect-[5/8] w-full overflow-hidden rounded-card shadow-e2">
          <CountryImagePlate seed={country.code} />

          {photo && (
            <img
              src={photo.src}
              srcSet={photo.srcSet}
              // `sizes` only means anything alongside a `srcSet` with width
              // descriptors. Local assets ship one file, so it would be a
              // misleading no-op there.
              sizes={photo.srcSet ? IMAGE_SIZES : undefined}
              // Decorative: the country name sits in text directly beneath it,
              // inside the same link. Describing the photograph as well would
              // make a screen reader announce the destination twice.
              alt=""
              loading="lazy"
              decoding="async"
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
          )}

          {/* The scrim. A gradient over the bottom 45%, three-stop so it fades
              into the photograph instead of banding against it — the reference
              darkens toward the content rather than laying a slab over it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/85 via-black/45 to-transparent"
          />

          {/* The frosted panel. This is the animation — height only, which the
              compositor handles without touching the layout around it.

              THE TOP EDGE. A backdrop-filter applies at full strength right up
              to the element's boundary, so a panel with a straight top edge
              draws a hard horizontal seam across the photograph — the blur is
              soft but the line where it starts is not, and on hover that line
              visibly slides up the card. Masking the element's own alpha fixes
              it at the source: the filter is sampled through the mask, so the
              blur and the dimming both ramp in over the top ~45% of the panel
              and there is no edge to see. `to_top` because the panel is
              anchored at the bottom and the fade belongs at the far end. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] rounded-b-card backdrop-blur-[12px] backdrop-brightness-[65%] [mask-image:linear-gradient(to_top,#000_0%,#000_55%,rgba(0,0,0,0.55)_78%,transparent_100%)] transition-[height] duration-[var(--duration-panel)] ease-out-back group-hover:h-[76%] group-focus-within:h-[76%]"
          />

          {/* Bottom-anchored content stack. */}
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-4 pb-5 xl:px-5">
            <div className="mb-2.5 h-[22px] w-[22px] overflow-hidden rounded-full shadow-e1">
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
            <h3 className="text-center font-serif text-[17px] font-medium uppercase leading-[1.05] tracking-[0.01em] text-white text-balance drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] sm:text-[18px] xl:text-[20px]">
              {country.name}
            </h3>

            <div
              aria-hidden
              className="mt-2.5 h-px w-full bg-white/25"
            />

            <dl className="mt-2.5 grid w-full grid-cols-3 gap-1">
              {stats.map((stat) => (
                <div key={stat.label} className={stat.align}>
                  <dt className="text-[9px] font-semibold uppercase tracking-[0.06em] text-white/65">
                    {stat.label}
                  </dt>
                  <dd className="mt-0.5 whitespace-nowrap text-2xs font-bold uppercase text-white">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>

            {/* Revealed on hover/focus — only what the resting card cannot
                hold. Desktop only: on touch there is no hover to trigger it,
                and everything essential is already visible above. */}
            <div className="hidden max-h-0 w-full overflow-hidden transition-all duration-[var(--duration-panel)] ease-out-back group-hover:max-h-[200px] group-focus-within:max-h-[200px] lg:block">
              <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-2 py-1.5 backdrop-blur-sm transition-colors group-hover:bg-white/15">
                <ShieldCheck className="h-3 w-3 flex-shrink-0 text-white/80" />
                <span className="whitespace-nowrap text-[10px] font-semibold text-white">
                  {country.documents}
                </span>
              </div>

              {/* Space reserved for the emergency link, which is a sibling of
                  this Link and overlays here. Without the reserve it would sit
                  on top of the documents pill. */}
              <div className="h-6" />
            </div>
          </div>
        </div>
      </Link>

      {/* Emergency assistance — the reference carries this on every card, and
          it is the one control it animates continuously. */}
      <Link
        href="/emergency-helpline"
        className="absolute inset-x-0 bottom-5 z-raised hidden max-h-0 items-center justify-center gap-1 overflow-hidden transition-all duration-[var(--duration-panel)] ease-out-back group-hover:max-h-10 group-focus-within:max-h-10 lg:flex"
      >
        <span
          data-on-dark="true"
          className="animate-emergency-cta-shimmer bg-clip-text text-[10px] font-semibold tracking-[0.02em] text-transparent underline decoration-white/70 decoration-dotted underline-offset-[3px]"
        >
          Get emergency assistance
        </span>
        <ArrowUpRight className="h-2.5 w-2.5 text-white/80" />
      </Link>
    </div>
  );
}
