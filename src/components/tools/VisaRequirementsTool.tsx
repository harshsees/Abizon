"use client";

/**
 * Visa requirements lookup.
 *
 * Deliberately a real, working tool rather than a screenshot of one: it
 * resolves against the same `countriesData` that drives the rest of the site,
 * so an answer here can never disagree with the country page it links to.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Check,
  FileText,
  Search,
  Wallet,
  X,
} from "lucide-react";

import { Country, countriesData, getCountrySlug } from "@/data/countries";
import { DURATION, EASE, fadeUp, staggerContainer } from "@/lib/motion";

const VISA_TYPE_TONE: Record<Country["visaType"], string> = {
  "Visa Free": "bg-success-subtle text-success-subtle-foreground",
  "Visa on Arrival": "bg-accent-subtle text-accent-subtle-foreground",
  "E-Visa": "bg-primary-subtle text-primary-subtle-foreground",
  "Sticker Visa": "bg-surface-sunken text-subtle-foreground",
};

/** Documents string → an explicit checklist, matching the country pages. */
function documentChecklist(country: Country) {
  const passport = {
    label: "Passport, valid 6+ months beyond travel",
    required: true,
  };
  const photo = {
    label: "Recent passport-size photograph",
    required: country.documents === "Photo + Passport",
  };
  const financials = {
    label: "Bank statements and income proof",
    required: country.visaType === "Sticker Visa",
  };
  const itinerary = {
    label: "Return ticket and accommodation proof",
    required: country.visaType === "Sticker Visa" || country.visaType === "E-Visa",
  };

  return [passport, photo, financials, itinerary];
}

export function VisaRequirementsTool() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Country | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    // Dedupe by slug — the dataset has a couple of repeated rows.
    const seen = new Set<string>();
    return countriesData
      .filter((c) => {
        if (!c.name.toLowerCase().includes(q)) return false;
        const slug = getCountrySlug(c.name);
        if (seen.has(slug)) return false;
        seen.add(slug);
        return true;
      })
      .slice(0, 6);
  }, [query]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-e2 md:p-6">
        <label
          htmlFor="requirements-search"
          className="text-2xs font-black uppercase tracking-widest text-muted-foreground"
        >
          Where are you going?
        </label>

        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="requirements-search"
            type="text"
            role="combobox"
            aria-expanded={matches.length > 0}
            aria-controls="requirements-results"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Search any of 155 destinations…"
            className="w-full rounded-xl border border-input bg-surface py-3.5 pl-11 pr-11 text-sm font-medium text-foreground placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSelected(null);
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-sunken"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <p className="mt-2.5 text-xs text-muted-foreground">
          Results assume an <strong className="font-semibold">Indian passport</strong> and a
          tourist trip. Requirements differ for other nationalities and purposes.
        </p>

        {/* Suggestions */}
        <AnimatePresence>
          {!selected && matches.length > 0 && (
            <motion.ul
              id="requirements-results"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: DURATION.fast, ease: EASE.out }}
              className="mt-4 space-y-1.5"
            >
              {matches.map((country) => (
                <li key={country.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(country)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-left hover:bg-surface-sunken"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border">
                      <img
                        src={`https://flagcdn.com/w80/${country.code}.png`}
                        alt=""
                        className="h-full w-full scale-110 object-cover"
                      />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-foreground">
                      {country.name}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-2xs font-bold ${VISA_TYPE_TONE[country.visaType]}`}
                    >
                      {country.visaType}
                    </span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {query && matches.length === 0 && !selected && (
          <p className="mt-4 rounded-xl bg-surface-sunken px-4 py-3 text-sm text-muted-foreground">
            No destination matches &ldquo;{query}&rdquo;. Try the country&apos;s common English
            name — for Dubai, search &ldquo;United Arab Emirates&rdquo;.
          </p>
        )}
      </div>

      {/* Result */}
      <AnimatePresence mode="wait">
        {selected && (
          <motion.article
            key={selected.id}
            variants={staggerContainer(0.05)}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: 8, transition: { duration: DURATION.exit } }}
            className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface shadow-e2"
          >
            <motion.header
              variants={fadeUp}
              className="flex items-center gap-4 border-b border-border bg-surface-sunken px-5 py-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-surface shadow-e1">
                <img
                  src={`https://flagcdn.com/w160/${selected.code}.png`}
                  alt=""
                  className="h-full w-full scale-110 object-cover"
                />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  {selected.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  For Indian passport holders · tourist travel
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1.5 text-2xs font-black uppercase tracking-wider ${VISA_TYPE_TONE[selected.visaType]}`}
              >
                {selected.visaType}
              </span>
            </motion.header>

            <motion.dl
              variants={fadeUp}
              className="grid grid-cols-3 divide-x divide-border border-b border-border"
            >
              {[
                { icon: CalendarClock, label: "Validity", value: selected.validity },
                {
                  icon: Wallet,
                  label: "Government fee",
                  value: selected.fees,
                },
                {
                  icon: FileText,
                  label: "Processing",
                  value:
                    selected.deliveryDays === 1
                      ? "24 hours"
                      : `${selected.deliveryDays} days`,
                },
              ].map((cell) => (
                <div key={cell.label} className="px-4 py-4 text-center">
                  <cell.icon className="mx-auto h-4 w-4 text-muted-foreground" />
                  <dt className="mt-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                    {cell.label}
                  </dt>
                  <dd
                    data-numeric
                    className="mt-1 text-sm font-extrabold text-foreground"
                  >
                    {cell.value}
                  </dd>
                </div>
              ))}
            </motion.dl>

            <motion.div variants={fadeUp} className="px-5 py-5">
              <h4 className="text-2xs font-black uppercase tracking-widest text-muted-foreground">
                Documents required
              </h4>
              <ul className="mt-3 space-y-2.5">
                {documentChecklist(selected).map((doc) => (
                  <li key={doc.label} className="flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${
                        doc.required
                          ? "bg-success-subtle text-success-subtle-foreground"
                          : "bg-surface-sunken text-muted-foreground"
                      }`}
                    >
                      {doc.required ? (
                        <Check className="h-3 w-3 stroke-[3]" />
                      ) : (
                        <X className="h-3 w-3 stroke-[3]" />
                      )}
                    </span>
                    <span
                      className={`text-sm ${
                        doc.required
                          ? "font-medium text-foreground"
                          : "text-muted-foreground line-through"
                      }`}
                    >
                      {doc.label}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/visa/${getCountrySlug(selected.name)}`}
                className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-on-primary hover:bg-primary-hover"
              >
                Apply for a {selected.name} visa
                <ArrowRight className="h-4 w-4 transition-transform duration-[var(--duration-base)] ease-out group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </motion.article>
        )}
      </AnimatePresence>
    </div>
  );
}
