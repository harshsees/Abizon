"use client";

/**
 * "Explore instant visas & arrival cards" — the strip Atlys closes every
 * country page with.
 *
 * Its job is to catch the visitor who has just decided this destination
 * isn't for them, so the selection is deliberately biased toward the easiest
 * wins available: fastest delivery, fewest documents.
 */

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";

import { Country, getCountrySlug } from "@/data/countries";
import { catalogue } from "@/lib/countryCatalogue";
import { staggerContainer, fadeUp, VIEWPORT } from "@/lib/motion";

type RelatedVisasProps = {
  /** The country currently being viewed — excluded from its own suggestions. */
  current: Country;
  count?: number;
};

export function RelatedVisas({ current, count = 8 }: RelatedVisasProps) {
  const related = useMemo(() => {
    const currentSlug = getCountrySlug(current.name);

    // Suggestions come from the catalogue — already deduplicated, by the same
    // rule the route and the application use. This component used to run its
    // own `seen` Set, which was one of three competing de-duplications.
    return catalogue
      .filter((country) => getCountrySlug(country.name) !== currentSlug)
      .sort((a, b) => {
        // Fastest first; break ties toward the lighter document requirement.
        if (a.deliveryDays !== b.deliveryDays) return a.deliveryDays - b.deliveryDays;
        const weight = (c: Country) =>
          c.documents === "No Documents Required" ? 0 : c.documents === "Passport Only" ? 1 : 2;
        return weight(a) - weight(b);
      })
      .slice(0, count);
  }, [current, count]);

  return (
    /**
     * PHASE 9. Rebuilt to the reference's closing strip (screenshot 13).
     *
     * The reference sets these as a single row of wide, low pills — flag,
     * destination, speed, chevron — not as a grid of stacked cards. That shape
     * is doing a job: this strip appears after the FAQ, when the reader has
     * either decided or given up, and a row of quiet pills reads as "here are
     * some others" where a four-up card grid reads as a second product listing
     * competing with the page above it.
     *
     * The row scrolls horizontally rather than wrapping, and the speed label is
     * the destination's real `deliveryDays`, which is what makes "Instant" mean
     * something when it appears.
     */
    <section id="related" className="scroll-mt-28 py-14 md:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="type-h2 text-foreground js-reveal-heading">
          Explore instant visas &amp; arrival cards
        </h2>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-e1 transition-colors hover:border-border-strong"
        >
          View all destinations
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* The rail. Masked at the right edge so a clipped final pill reads as
          "there are more" rather than as a broken layout — the same treatment
          the sub-nav uses on its own overflowing rail. */}
      <motion.ul
        variants={staggerContainer(0.05)}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        className="mt-8 flex gap-4 overflow-x-auto scrollbar-none pb-2 [mask-image:linear-gradient(to_right,#000_0,#000_calc(100%-48px),transparent_100%)] lg:[mask-image:none]"
      >
        {related.map((country) => (
          <motion.li key={country.id} variants={fadeUp} className="shrink-0">
            <Link
              href={`/visa/${getCountrySlug(country.name)}`}
              className="group flex items-center gap-3 rounded-full border border-border bg-surface py-2.5 pl-2.5 pr-4 shadow-e1 transition-[box-shadow,border-color] duration-[--duration-base] hover:border-border-strong hover:shadow-e2"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-sunken">
                <img
                  src={`https://flagcdn.com/w80/${country.code}.png`}
                  alt=""
                  loading="lazy"
                  className="h-full w-full scale-110 object-cover"
                />
              </span>

              <span className="whitespace-nowrap text-sm font-bold text-foreground">
                {country.name}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold ${
                  country.deliveryDays === 1
                    ? "text-success-subtle-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {country.deliveryDays > 1 && (
                  <Clock aria-hidden className="h-3 w-3" />
                )}
                {country.deliveryDays === 1
                  ? "Within 24 hours"
                  : `${country.deliveryDays} days`}
              </span>

              <ArrowRight
                aria-hidden
                className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-[--duration-fast] group-hover:translate-x-0.5 motion-reduce:transform-none"
              />
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
