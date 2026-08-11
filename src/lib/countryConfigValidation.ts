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
import { KEYRISE_TERMS, feesAreProvisional } from "@/lib/pricingConfig";
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
 * PHASE 8C §10–§11: the nine empty configuration slots, classified.
 *
 * §10 says do not fill these with guesses. §11 asks what each one *is*, because
 * "empty" is not one condition — a field that is derivable is a different
 * problem from a field that needs a data source Keyrise does not have, and both
 * differ from a field that should never have existed.
 *
 * `classification`
 *   derived          computable from data already held; no source needed
 *   required         the page is materially incomplete without it
 *   optional         improves the page; its absence is not a defect
 *   not-applicable   does not apply to every destination by nature
 *
 * `presentFor` records reality today, so the gap between intent and state is
 * visible in one place rather than inferred from 152 pages.
 */
export const CONFIG_FIELD_STATUS: Record<
  string,
  {
    classification: "derived" | "required" | "optional" | "not-applicable";
    presentFor: "all" | "some" | "none";
    note: string;
  }
> = {
  stayDuration: {
    classification: "derived",
    presentFor: "all",
    note: "The dataset's `validity` already carries this and the page renders it. The separate slot is redundant, not empty.",
  },
  processingTime: {
    classification: "derived",
    presentFor: "all",
    note: "`deliveryDays` is Keyrise's committed delivery, which is what the guarantee and the plan selector show. Government processing time is a different, unheld fact — and §12 forbids inventing it.",
  },
  entryType: {
    classification: "optional",
    presentFor: "none",
    note: "Single vs multiple entry is a real property of a visa but is not in the dataset. Hidden rather than guessed (§14).",
  },
  applicationMethod: {
    classification: "derived",
    presentFor: "all",
    note: "`deriveVisaFlow` already distinguishes e-visa, on-arrival, sticker and visa-free from `visaType`. Nothing further is claimed (§15).",
  },
  requirements: {
    classification: "optional",
    presentFor: "none",
    note: "Per-destination eligibility rules. Needs a source; the document list is handled separately and is real.",
  },
  appointmentRequired: {
    classification: "derived",
    presentFor: "some",
    note: "Derived from flow — sticker visas imply a mission appointment. Not asserted for any other flow.",
  },
  biometricsRequired: {
    classification: "not-applicable",
    presentFor: "none",
    note: "Never displayed. §16: an unknown biometrics requirement must not be rendered either way, and it is not.",
  },
  applicationSteps: {
    classification: "not-applicable",
    presentFor: "none",
    note: "§17: the shared Keyrise journey is the product UX and is already shown. Country-specific government steps would have to be sourced per destination.",
  },
  faqs: {
    classification: "optional",
    presentFor: "all",
    note: "Phase 8C replaced string substitution with questions composed from `flow` and `documents`. No per-country FAQ dataset is invented (§18).",
  },
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

  /* --- PHASE 8C: credibility -------------------------------------------- */

  /**
   * §24 — placeholder pricing. Reported per destination rather than once,
   * because every country page publishes this number and a reader of any one of
   * them is being shown a figure nobody has agreed.
   */
  if (feesAreProvisional) {
    push(
      "warning",
      "pricing.serviceFee",
      `Keyrise service fee (₹${KEYRISE_TERMS.serviceFee}) and express surcharge (₹${KEYRISE_TERMS.expressSurcharge}) are provisional and require business confirmation. See lib/pricingConfig.ts.`,
    );
  }

  /**
   * §24 — invented-looking values. A dataset written by hand acquires round
   * numbers and repeated numbers, and both are signals worth surfacing even
   * though neither is proof. This does not fail a country; it asks a question.
   */
  const fee = parseGovernmentFee(country.fees);
  if (fee > 0 && fee % 1000 === 0) {
    push(
      "info",
      "fees",
      `Government fee ₹${fee} is a round thousand — check it against the authority's published tariff rather than assuming.`,
    );
  }

  /**
   * §24 — missing critical data. The nine empty configuration slots are not
   * all equal, and §11 asks which are which. The classification lives in
   * `CONFIG_FIELD_STATUS` below; only `required` gaps are raised here, because
   * a warning on all nine for all 152 destinations is noise that hides them.
   */
  for (const [field, status] of Object.entries(CONFIG_FIELD_STATUS)) {
    if (status.classification === "required" && status.presentFor === "none") {
      push("warning", field, `Required but unpopulated for every destination: ${status.note}`);
    }
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

  const bySlug = new Map<string, Country[]>();
  for (const country of countries) {
    const slug = getCountrySlug(country.name);
    bySlug.set(slug, [...(bySlug.get(slug) ?? []), country]);
  }

  const collisions = [...bySlug.entries()].filter(([, rows]) => rows.length > 1);

  const duplicateSlugs = collisions.map(([slug, rows]) => ({
    slug,
    names: rows.map((row) => row.name),
  }));

  /**
   * PHASE 8C §23: report the conflict, do not resolve it.
   *
   * Comparing the competing rows shows these are not accidental duplicates:
   *
   *   Morocco   30 Days / ₹2,900 / 3 days   vs   90 Days / ₹3,400 / 4 days
   *   Jordan    30 Days / ₹4,800 / 1 day    vs   90 Days / ₹4,800 / 1 day
   *
   * A duplicate row would be identical or near-identical. These differ on
   * validity and, for Morocco, on price — which is the signature of two
   * genuine visa *products* for one country, a 30-day and a 90-day variant,
   * flattened into a dataset with one row per destination and no product axis.
   *
   * That means there is no correct row to keep. Picking one silently discards a
   * product Keyrise may sell; merging them invents a price. So the validator
   * names the differing fields and stops, and the catalogue's first-wins rule
   * stays an explicitly-labelled placeholder rather than a decision.
   */
  const FIELDS: Array<keyof Country> = [
    "visaType",
    "validity",
    "fees",
    "deliveryDays",
    "documents",
  ];

  for (const [slug, rows] of collisions) {
    const differing = FIELDS.filter(
      (field) => new Set(rows.map((row) => String(row[field]))).size > 1,
    );

    const detail = differing.length
      ? differing
          .map((field) => `${field}: ${rows.map((row) => String(row[field])).join(" vs ")}`)
          .join("; ")
      : "rows are identical — a true duplicate, safe to delete either";

    const verdict = differing.length
      ? "These look like distinct visa products for one destination, not a duplicate. Resolving this is a product decision: either the dataset gains a product axis, or one row is retired. Do not pick one here."
      : "Identical rows. Remove one.";

    for (const report of reports) {
      if (report.slug === slug) {
        report.issues.push({
          severity: "error",
          field: "slug",
          message: `Slug "${slug}" is claimed by ${rows.length} rows; only the first is reachable at /visa/${slug}. Differences — ${detail}. ${verdict}`,
        });
        report.grade = "D";
      }
    }
  }

  const byGrade: Record<Completeness, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const report of reports) byGrade[report.grade] += 1;

  return { total: countries.length, byGrade, duplicateSlugs, reports };
}
