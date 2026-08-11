/**
 * THE COUNTRY CATALOGUE — one resolver for the whole product.
 *
 * WHY THIS EXISTS. Phase 7A found `Morocco` and `Jordan` each present twice in
 * the dataset with different data, and found THREE modules independently
 * de-duplicating them with different tie-breaks:
 *
 *   app/visa/[countrySlug]/page.tsx   `new Map(...)`   → LAST row wins
 *   lib/countryVisa.countryFromSlug   `Array.find`     → FIRST row wins
 *   components/RelatedVisas           a `seen` Set     → FIRST row wins
 *
 * The consequence was measurable: `/visa/morocco` quoted ₹5,169 from the
 * 90-day row while `/apply?country=morocco` quoted ₹4,669 from the 30-day row.
 * The page and the application disagreed about the price of the same visa by
 * ₹500, and every check passed, because each module was individually correct.
 *
 * The fix is not a better tie-break. It is having ONE.
 *
 * FIRST-ROW-WINS, and why. The duplicates are a data defect, not a product
 * decision — nobody chose which Morocco is the real one. First-wins is chosen
 * because it matches source order, is stable under appends, and was already the
 * behaviour of two of the three call sites. It is a deterministic placeholder
 * for a decision that belongs in the dataset: `DUPLICATE_SLUGS` names the rows
 * so they stay visible until someone resolves them properly.
 */

import { countriesData, getCountrySlug, type Country } from "@/data/countries";

/**
 * Slugs claimed by more than one dataset row. Kept as data so the validator,
 * the audit and any future fix can all see the same list.
 */
export const DUPLICATE_SLUGS: ReadonlyArray<{ slug: string; rows: number }> = (() => {
  const counts = new Map<string, number>();
  for (const country of countriesData) {
    const slug = getCountrySlug(country.name);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, rows]) => rows > 1)
    .map(([slug, rows]) => ({ slug, rows }));
})();

/**
 * The canonical slug → country map. Built once at module load.
 *
 * `Map.set` overwrites, so the insertion loop skips a slug it has already seen
 * — that is what makes this first-wins rather than last-wins.
 */
const BY_SLUG: ReadonlyMap<string, Country> = (() => {
  const map = new Map<string, Country>();
  for (const country of countriesData) {
    const slug = getCountrySlug(country.name);
    if (!map.has(slug)) map.set(slug, country);
  }
  return map;
})();

/** Every destination exactly once, in dataset order. The catalogue. */
export const catalogue: readonly Country[] = [...BY_SLUG.values()];

/** Every routable slug. The single source for `generateStaticParams`. */
export const countrySlugs: readonly string[] = [...BY_SLUG.keys()];

/**
 * Resolve a destination.
 *
 * Accepts a slug (`dubai`) or, for links already in circulation, a raw country
 * name (`United Arab Emirates`). Returns `undefined` for anything unrecognised
 * so callers render a flow with no country rather than a flow with a wrong one.
 */
export function resolveCountry(value: string | null | undefined): Country | undefined {
  if (!value) return undefined;
  const needle = value.trim().toLowerCase();

  const bySlug = BY_SLUG.get(needle);
  if (bySlug) return bySlug;

  // Name fallback, resolved through the same map so it cannot pick a different
  // row than the slug lookup would.
  for (const country of BY_SLUG.values()) {
    if (country.name.toLowerCase() === needle) return country;
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/* Readiness — what a destination can actually support                        */
/* -------------------------------------------------------------------------- */

/**
 * Deliberately NOT the same as Phase 7A's A–D grade.
 *
 * 7A graded 127 destinations "D", almost entirely because their photograph is a
 * generic stock landscape. That is a credibility problem, not an application
 * problem — the fee, validity, delivery time and document list are all present
 * and correct for those countries. Withholding 127 working applications over a
 * photograph would be the wrong trade.
 *
 * So readiness asks only: can this destination's application be operated
 * truthfully? Imagery is handled separately by `countryImagery`, which the hero
 * uses to decide between a real photograph and no photograph — never another
 * country's.
 */
export type CountryReadiness =
  /** An application can be filed and every figure on the page is real. */
  | "supported"
  /** No visa exists, so the page is informational by nature. */
  | "informational"
  /** A core fact is missing; an application would have to invent something. */
  | "incomplete";

export function countryReadiness(country: Country): CountryReadiness {
  const missingCore =
    !country.validity?.trim() ||
    !country.fees?.trim() ||
    !country.documents ||
    !Number.isFinite(country.deliveryDays) ||
    country.deliveryDays <= 0;

  if (missingCore) return "incomplete";
  if (country.visaType === "Visa Free") return "informational";
  return "supported";
}

/**
 * PHASE 8B: this question moved, because this module could not answer it.
 *
 * What lived here was a set of five known-generic ids and eight known-dead ids,
 * and an image was "authentic" if it was on neither list. That is a test for
 * *absence*, and it passed every one of the 26 surviving photographs — including
 * the Bangkok street the dataset files under France and the Italian lake it
 * files under both Switzerland and Malaysia.
 *
 * Trust in an image cannot be derived from its URL. It comes from someone having
 * looked at the frame, which is what `countryImagery` records. Re-exported here
 * so the catalogue remains the one import a caller needs.
 */
export { hasVerifiedPhoto } from "@/lib/countryImagery";
