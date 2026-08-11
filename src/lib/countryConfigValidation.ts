/**
 * COUNTRY CONFIG VALIDATION
 * ---------------------------------------------------------------------------
 * A development-time check over the country dataset. It reports what is
 * missing; it never fills anything in.
 *
 * WHY THIS EXISTS. Phase 2 found eight dead image ids and several shared
 * photographs. Phase 7A found them still present, plus two duplicate slugs that
 * make one destination unreachable — because nothing in the build had any
 * opinion about the data. A page renders happily with a broken image and a
 * colliding route; only a person looking at it would notice, and nobody looks
 * at all 154.
 *
 * WHAT IT DELIBERATELY DOES NOT DO: fetch. Image liveness needs the network and
 * belongs in a script, not in a validator that a component might call. This
 * checks structure, consistency and presence.
 */

import { countriesData, getCountrySlug, type Country } from "@/data/countries";
import { requiredDocuments } from "@/lib/application/documents";
import { deriveVisaFlow, parseGovernmentFee, resolveHeroImage } from "@/lib/countryVisa";

export type Severity = "error" | "warning" | "info";

export type ConfigIssue = {
  severity: Severity;
  field: string;
  message: string;
};

/**
 * A — complete. B — usable, minor gaps. C — incomplete, core facts missing.
 * D — unsafe to publish: the page would show something wrong, not merely thin.
 */
export type Completeness = "A" | "B" | "C" | "D";

export type CountryConfigReport = {
  name: string;
  code: string;
  slug: string;
  grade: Completeness;
  issues: ConfigIssue[];
};

/**
 * The five generic photographs `countries.ts` rotates through for any country
 * without a mapped image. A landscape that belongs to no particular country,
 * presented as that country, is a factual error on a page about travelling
 * there — so it is an error, not a style note.
 */
const GENERIC_CATEGORY_IDS = new Set([
  "photo-1507525428034-b723cf961d3e",
  "photo-1470071459604-3b5ec3a7fe05",
  "photo-1477959858617-67f85cf4f1df",
  "photo-1464822759023-fed622ff2c3b",
  "photo-1500530855697-b586d89ba3ee",
]);

/**
 * Image ids that returned HTTP 404 when probed in Phase 7A.
 *
 * Recorded here so the validator fails on them until they are replaced. This is
 * a snapshot, not a live check — re-probe with the audit script and update it.
 */
export const KNOWN_DEAD_IMAGE_IDS = new Set([
  "photo-1485081661445-7e753080975f", // United Kingdom
  "photo-1509060464153-44667396260f", // Mauritius
  "photo-1512813583145-baaa340ef29f", // Mexico
  "photo-1513581166391-887a96ded73a", // United States
  "photo-1528181304800-2f5373a29587", // Thailand
  "photo-1531816458010-fb76819ec72f", // Peru
  "photo-1588598130794-3d9ad5a266db", // Sri Lanka
  "photo-1589979482837-e74f2e145060", // Seychelles
]);

function imageIdOf(url: string): string | undefined {
  return /unsplash\.com\/(photo-[^?]+)/.exec(url)?.[1];
}

/** Everything checkable about one destination, in isolation. */
export function validateCountryConfig(country: Country): CountryConfigReport {
  const issues: ConfigIssue[] = [];
  const push = (severity: Severity, field: string, message: string) =>
    issues.push({ severity, field, message });

  const slug = getCountrySlug(country.name);
  const flow = deriveVisaFlow(country.visaType);
  const governmentFee = parseGovernmentFee(country.fees);

  /* --- identity ---------------------------------------------------------- */
  if (!country.name?.trim()) push("error", "name", "Missing country name.");
  if (!/^[a-z]{2}$/.test(country.code)) {
    push("error", "code", `"${country.code}" is not a 2-letter ISO code.`);
  }
  if (!slug) push("error", "slug", "Name does not produce a usable slug.");

  /* --- core page facts --------------------------------------------------- */
  if (!country.validity?.trim()) push("error", "validity", "Missing validity.");
  if (!country.fees?.trim()) push("error", "fees", "Missing fee label.");
  if (!Number.isFinite(country.deliveryDays) || country.deliveryDays <= 0) {
    push("error", "deliveryDays", "Delivery days must be a positive number.");
  }
  if (!country.documents) push("error", "documents", "Missing documents label.");

  /* --- pricing ----------------------------------------------------------- */
  // ₹0 is legitimate — 40 destinations are genuinely free — but it must SAY so,
  // or the fee breakdown prints "₹0" where every peer prints "Free".
  if (governmentFee === 0 && !/free/i.test(country.fees)) {
    push(
      "warning",
      "fees",
      `Parses to ₹0 but is labelled "${country.fees}". Label it "Free" or give the real fee.`,
    );
  }
  if (governmentFee < 0) push("error", "fees", "Negative government fee.");
  if (flow === "visa-free" && governmentFee > 0) {
    push(
      "error",
      "fees",
      "Marked Visa Free but carries a government fee — one of the two is wrong.",
    );
  }

  /* --- documents --------------------------------------------------------- */
  const documents = requiredDocuments(country.documents);
  if (documents.length === 0 && country.documents !== "No Documents Required") {
    push("error", "documents", `"${country.documents}" maps to no known requirement.`);
  }
  if (flow === "visa-free" && documents.length > 0) {
    push(
      "warning",
      "documents",
      "Visa Free but asks for documents — there is no application to attach them to.",
    );
  }

  /* --- imagery ----------------------------------------------------------- */
  const imageId = imageIdOf(country.imageUrl);
  if (!imageId) {
    push("error", "imageUrl", "No resolvable card image.");
  } else if (KNOWN_DEAD_IMAGE_IDS.has(imageId)) {
    push("error", "imageUrl", `Card image ${imageId} returns HTTP 404.`);
  } else if (GENERIC_CATEGORY_IDS.has(imageId)) {
    push(
      "error",
      "imageUrl",
      "Card image is a generic stock category, not this country — a photograph of somewhere else presented as here.",
    );
  }
  if (!resolveHeroImage(country)) {
    push("warning", "heroImage", "No hero image resolves.");
  } else if (/^https?:/.test(resolveHeroImage(country) ?? "")) {
    push(
      "info",
      "heroImage",
      "Hero is an upscaled remote card image, not a hi-res local asset.",
    );
  }

  /* --- grade ------------------------------------------------------------- */
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  const grade: Completeness = errors.some((issue) =>
    ["imageUrl", "fees", "documents"].includes(issue.field),
  )
    ? "D"
    : errors.length > 0
      ? "C"
      : warnings.length > 0 || issues.length > 0
        ? "B"
        : "A";

  return { name: country.name, code: country.code, slug, grade, issues };
}

/* -------------------------------------------------------------------------- */
/* Dataset-wide                                                               */
/* -------------------------------------------------------------------------- */

export type DatasetReport = {
  total: number;
  byGrade: Record<Completeness, number>;
  duplicateSlugs: Array<{ slug: string; names: string[] }>;
  reports: CountryConfigReport[];
};

/**
 * Checks that only exist across the whole set — chiefly slug collisions, which
 * no per-country validator can see. A collision means `countryFromSlug` returns
 * the first match and the second destination is unreachable at its own URL
 * while still appearing in the grid.
 */
export function validateCountryDataset(
  countries: readonly Country[] = countriesData,
): DatasetReport {
  const reports = countries.map(validateCountryConfig);

  const bySlug = new Map<string, string[]>();
  for (const country of countries) {
    const slug = getCountrySlug(country.name);
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), country.name]);
  }

  const duplicateSlugs = [...bySlug.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([slug, names]) => ({ slug, names }));

  for (const duplicate of duplicateSlugs) {
    for (const report of reports) {
      if (report.slug === duplicate.slug) {
        report.issues.push({
          severity: "error",
          field: "slug",
          message: `Slug "${duplicate.slug}" is claimed by ${duplicate.names.length} rows. Only the first is reachable at /visa/${duplicate.slug}.`,
        });
        report.grade = "D";
      }
    }
  }

  const byGrade: Record<Completeness, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const report of reports) byGrade[report.grade] += 1;

  return { total: countries.length, byGrade, duplicateSlugs, reports };
}
