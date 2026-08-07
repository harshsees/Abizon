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

import { Country, countriesData, getCountrySlug } from "@/data/countries";
import { staggerContainer, fadeUp, VIEWPORT } from "@/lib/motion";

type RelatedVisasProps = {
  /** The country currently being viewed — excluded from its own suggestions. */
  current: Country;
  count?: number;
};

export function RelatedVisas({ current, count = 8 }: RelatedVisasProps) {
  const related = useMemo(() => {
    const seen = new Set<string>([getCountrySlug(current.name)]);

    return countriesData
      .filter((country) => {
        // The dataset carries a few duplicate rows (Morocco, Jordan) that
        // collapse to the same slug — first one wins.
        const slug = getCountrySlug(country.name);
        if (seen.has(slug)) return false;
        seen.add(slug);
        return true;
      })
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
    <section id="related" className="scroll-mt-28 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground js-reveal-heading">
            Explore instant visas &amp; arrival cards
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Destinations you can be approved for in days, not weeks.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground shadow-e1 hover:border-border-strong"
        >
          View all destinations
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <motion.ul
        variants={staggerContainer(0.05)}
        initial="hidden"
        whileInView="visible"
        viewport={VIEWPORT}
        className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        {related.map((country) => (
          <motion.li key={country.id} variants={fadeUp}>
            <Link
              href={`/visa/${getCountrySlug(country.name)}`}
              className="group flex h-full flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-4 shadow-e1 transition-shadow duration-[--duration-base] hover:shadow-e3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-sunken">
                  <img
                    src={`https://flagcdn.com/w80/${country.code}.png`}
                    alt=""
                    loading="lazy"
                    className="h-full w-full scale-110 object-cover"
                  />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{country.name}</p>
                  <p className="text-xs text-muted-foreground">{country.visaType}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-subtle px-2.5 py-1 text-2xs font-bold text-success-subtle-foreground">
                  <Clock className="h-3 w-3" />
                  {country.deliveryDays === 1 ? "24 hours" : `${country.deliveryDays} days`}
                </span>
                <span
                  data-numeric
                  className="text-sm font-black tracking-tight text-foreground"
                >
                  {country.fees}
                </span>
              </div>
            </Link>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}
