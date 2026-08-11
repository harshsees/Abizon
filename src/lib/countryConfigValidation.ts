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
import { CATEGORY_PHOTO_IDS, countryPhoto } from "@/lib/countryImagery";
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
  /**
   * PHASE 8B: the validator no longer inspects `country.imageUrl` at all.
   *
   * It used to check the dataset's URL against two id lists, which is exactly
   * the test that let a photograph of Bangkok through as France. What matters
   * is not what the dataset holds but what the product will actually render,
   * and that is the manifest's verdict.
   *
   * The one thing still worth checking about the raw dataset is the assumption
   * the manifest is built on: that any country it does not name is on one of
   * the five known category landscapes. If `countries.ts` ever gains a new
   * unmapped photograph, that country would silently be treated as reviewed
   * generic stock when in truth nobody has seen it.
   */
  const photo = countryPhoto(slug);

  switch (photo?.verdict) {
    case "depicts-country":
      break;
    case "wrong-country":
      push(
        "error",
        "imageUrl",
        `Dataset image shows somewhere else: ${photo.note ?? photo.subject}. Suppressed from render.`,
      );
      break;
    case "dead":
      push("error", "imageUrl", `Dataset image ${photo.ref} returns HTTP 404. Suppressed from render.`);
      break;
    case "not-identifiable":
      push(
        "warning",
        "imageUrl",
        `Dataset image cannot be confirmed as this country: ${photo.subject}. Suppressed from render.`,
      );
      break;
    default: {
      // Unnamed by the manifest — assert the generic-stock assumption holds.
      const imageId = imageIdOf(country.imageUrl);
      if (!imageId) {
        push("error", "imageUrl", "No resolvable card image.");
      } else if (!CATEGORY_PHOTO_IDS.has(imageId)) {
        push(
          "error",
          "imageUrl",
          `Image ${imageId} is neither a reviewed photograph nor a known category landscape — nobody has looked at it.`,
        );
      } else {
        push(
          "warning",
          "imageUrl",
          "Generic stock category landscape, not this country. Suppressed from render; needs a destination photograph.",
        );
      }
    }
  }

  if (!resolveHeroImage(country)) {
    push("info", "heroImage", "No verified photograph; renders the designed plate.");
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
