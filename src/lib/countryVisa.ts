/**
 * ABIZON COUNTRY VISA CONFIGURATION
 * ---------------------------------------------------------------------------
 * The data contract the country page is built against.
 *
 * The page must serve ~154 destinations from one shell. That only works if the
 * shell reads a single, explicit description of a country rather than
 * re-deriving facts from `visaType` in eight different components — which is
 * how the previous page ended up inferring entry type in one place, payment
 * channel in another, and appointment requirements nowhere at all.
 *
 * THE RULE THIS FILE ENFORCES
 *
 * Every field that Abizon does not actually have is optional and defaults to
 * `undefined` — never to a plausible-looking value. A component that receives
 * `undefined` must omit its section, not fill the gap. That is deliberate: a
 * fabricated processing time on a visa page is worse than a missing one,
 * because the user cannot tell the difference and will plan a trip around it.
 *
 * WHAT IS REAL TODAY
 *
 * `src/data/countries.ts` carries exactly nine fields per country: id, name,
 * code, visaType, validity, fees, deliveryDays, documents, imageUrl. Everything
 * else in `CountryVisaConfig` is a slot waiting for data, and
 * `resolveCountryVisaConfig` leaves those slots empty rather than guessing.
 *
 * The dataset is not modified by this file. The resolver adapts it, so the
 * richer model can be populated country by country without a migration.
 */

import { arrivalCardFor, type ArrivalCard } from "./arrivalCard";
import { Country, countriesData, getCountrySlug } from "@/data/countries";
import { resolveCountry } from "@/lib/countryCatalogue";
import {
  countryHeroFocus,
  countryHeroImage,
  countryPhotoCredit,
} from "@/lib/countryImagery";
import { ABIZON_TERMS, feesAreProvisional } from "@/lib/pricingConfig";

/* -------------------------------------------------------------------------- */
/* Visa flow                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * How an application is actually conducted. This is the axis the page branches
 * on — not `visaType`, which is a product label.
 *
 *   electronic  applied for and delivered online; no in-person step
 *   embassy     requires a consulate/VAC appointment, usually biometrics
 *   on-arrival  issued at the border; the page is informational
 *   visa-free   no application exists; the page is informational
 */
export type VisaFlow = "electronic" | "embassy" | "on-arrival" | "visa-free";

/**
 * Derived from `visaType`, which is the only signal the dataset gives.
 *
 * This mapping is safe in a way the per-country details are not: a sticker visa
 * is an embassy process by definition, and a visa-free destination has no
 * application by definition. What it cannot tell you is whether a *particular*
 * embassy country needs biometrics — that stays `undefined` until someone says
 * so, and `AppointmentRequirements` renders nothing without it.
 */
export function deriveVisaFlow(visaType: Country["visaType"]): VisaFlow {
  switch (visaType) {
    case "Sticker Visa":
      return "embassy";
    case "Visa on Arrival":
      return "on-arrival";
    case "Visa Free":
      return "visa-free";
    case "E-Visa":
    default:
      return "electronic";
  }
}

/* -------------------------------------------------------------------------- */
/* The contract                                                               */
/* -------------------------------------------------------------------------- */

/** A money amount in paise-free rupees. `undefined` means "not known". */
export type Money = number;

export type ProcessingTime = {
  /** Business days. */
  min?: number;
  max?: number;
  /** Free text for cases a range cannot express ("2-3 weeks after biometrics"). */
  note?: string;
};

export type VisaPricing = {
  /** Paid to the destination's authority. The only figure Abizon has today. */
  governmentFee?: Money;
  /** Abizon's handling charge. Not in the dataset — see PLACEHOLDER_PRICING. */
  serviceFee?: Money;
  /** Applied to the service component only, never to the government fee. */
  gstRate?: number;
  /** Added on top for expedited processing. Not in the dataset. */
  expressSurcharge?: Money;
  /**
   * The government fee for a business visa, where it differs. Absent means
   * "unknown", and callers must then quote the tourist fee rather than scaling
   * it — see the multiplier note in PLACEHOLDER_PRICING.
   */
  businessGovernmentFee?: Money;
  /** Set when a country's fee is collected in person rather than online. */
  paidAtEmbassy?: boolean;
};

export type VisaRequirementItem = {
  label: string;
  detail?: string;
};

export type ApplicationStep = {
  title: string;
  description?: string;
};

export type CountryFaq = {
  question: string;
  answer: string;
};

/**
 * The country page's input. Required fields are the ones `countries.ts`
 * actually guarantees; everything else is optional by design.
 */
export type CountryVisaConfig = {
  /* --- identity: always present --- */
  slug: string;
  name: string;
  /** "Dubai" where the marketing name differs from the country name. */
  displayName: string;
  code: string;
  flagUrl: string;
  heroImage?: string;
  /**
   * The rendition ladder for the same photograph. The hero band is the widest
   * image on the site — up to 1232px at the container's ceiling — and shipping
   * one fixed file to a phone as well is most of a megabyte nobody asked for.
   */
  heroImageSrcSet?: string;
  /**
   * What the hero photograph shows. Empty when there is none — the plate that
   * renders instead is decoration and announces nothing.
   */
  heroImageAlt: string;
  /**
   * The `object-position` for the hero band. Portrait sources need to be held
   * near their top or the band frames the middle of a tower.
   */
  heroImageFocus?: string;
  /**
   * "Photographer · CC BY-SA 4.0", where the licence requires it. The country
   * page is where that obligation is discharged, because a grid of 152 cards
   * cannot carry 152 credits and still be a grid.
   */
  heroImageCredit?: string;

  /* --- classification: always present --- */
  visaType: Country["visaType"];
  flow: VisaFlow;

  /* --- terms: validity is real, the rest are not yet --- */
  validity?: string;
  /** How long you may remain. Distinct from validity; not in the dataset. */
  stayDuration?: string;
  /** Single / Multiple. Not in the dataset. */
  entryType?: string;
  /** Paperless / Consulate / On arrival. Not in the dataset. */
  applicationMethod?: string;

  /* --- money --- */
  pricing: VisaPricing;
  /** The authored display string ("₹8,099", "Free"), kept for fidelity. */
  feesLabel: string;

  /* --- timing --- */
  /** Guaranteed delivery, in days. Real. */
  deliveryDays: number;
  /** A true processing range. Not in the dataset. */
  processingTime?: ProcessingTime;

  /* --- requirements --- */
  /** The authored documents string. Real. */
  documentsLabel: Country["documents"];
  /** A structured checklist. Not in the dataset. */
  requirements?: VisaRequirementItem[];
  /** Only ever true when a country explicitly declares it. */
  appointmentRequired?: boolean;
  biometricsRequired?: boolean;

  /* --- narrative --- */
  applicationSteps?: ApplicationStep[];
  faqs?: CountryFaq[];
  /**
   * Country-scoped extra sections, keyed by name. Keeps destination-specific
   * content (the UAE's seven-emirates block) out of the universal shell.
   */
  /**
   * The destination's digital arrival card, when it operates one and the entry
   * has been confirmed. Absent for everywhere else — and absent for an entry
   * still marked unverified, so an unchecked claim cannot reach a page by
   * someone forgetting to look. See `lib/arrivalCard.ts`.
   */
  arrivalCard?: ArrivalCard;

  additionalSections?: Array<"emirates">;

  /*
   * There is deliberately no `partners` field.
   *
   * Phase 4 gated a "Partners We Work With" block on one, so that only the UAE
   * pages showed the two UAE bodies and every page showed IATA. Phase 4.1
   * removed the block outright: the three marks were hand-drawn SVG
   * approximations, not licensed logos, and Abizon holds no record of a
   * partnership with the Ministry of Foreign Affairs, the Government of Dubai
   * or IATA. Showing an authority's name and crest on a commercial visa page
   * asserts an endorsement, and "it is a UAE body and this is a UAE page" is
   * not evidence of one.
   *
   * If verified relationships are ever documented, they belong in the dataset
   * per country, with the counterparty's own approved mark — not derived from
   * a country code.
   */
};

/* -------------------------------------------------------------------------- */
/* Pricing placeholders                                                       */
/* -------------------------------------------------------------------------- */

/**
 * PHASE 8C: moved to `lib/pricingConfig.ts`, and the status came with it.
 *
 * `PLACEHOLDER_PRICING` was a plain object of numbers under a comment saying
 * they were unverified. Consumers read `.serviceFee` and received `1499` — at
 * the type level, and on the page, indistinguishable from an agreed fee. The
 * provisional status now travels with the values instead of sitting above them.
 *
 * Re-exported so callers that only want the numbers keep one import.
 */
export { ABIZON_TERMS, feesAreProvisional };

/**
 * `ApplicationCard` multiplied the government fee by 1.5 for a business visa,
 * on the reasoning that "business visas are typically more expensive". That is
 * a guess applied uniformly to 154 countries, and a user could budget on it.
 *
 * It is deliberately NOT reproduced here. Until a country supplies a real
 * `businessGovernmentFee`, the business option quotes the fee Abizon actually
 * knows rather than a scaled invention of one. This constant exists only to
 * record what was removed and why.
 */
export const REMOVED_BUSINESS_FEE_MULTIPLIER = 1.5;

/**
 * The per-traveller total, computed one way for the whole app.
 *
 * PHASE 8C changed one thing, and it is the whole point of the change: a
 * service fee that is *unknown* no longer collapses to zero.
 *
 * The old body read `pricing.serviceFee ?? 0`. That is the right default for
 * arithmetic and the wrong one for meaning — a missing fee and a waived fee
 * produced the same total, so a country with no commercial terms on file would
 * quote the government fee alone and present it as the full price. §7 asks the
 * architecture to support a missing fee rather than invent one; `null` is how
 * it does that, and `null` propagates through every derived figure so a caller
 * cannot accidentally add it to something.
 *
 * `payNow` is deliberately never null. The government fee is the one number in
 * this system that comes from the dataset and is real for every destination.
 */
export function computeTotals(
  pricing: VisaPricing,
  options: { express?: boolean; business?: boolean } = {},
) {
  const base = pricing.governmentFee ?? 0;
  const governmentFee = options.business
    ? (pricing.businessGovernmentFee ?? base)
    : base;

  // Absent, not zero. `0` would be a claim that Abizon charges nothing.
  const baseServiceFee = pricing.serviceFee ?? null;
  const surcharge = options.express ? (pricing.expressSurcharge ?? null) : 0;

  /**
   * Express is unknown only when express was actually asked for. A standard
   * quote is unaffected by an undecided express surcharge, so it stays whole.
   */
  const serviceFee =
    baseServiceFee === null || surcharge === null
      ? null
      : baseServiceFee + surcharge;

  /**
   * Rounded to whole rupees here, once, rather than left for each caller to
   * round at display time. 1499 x 18% is 269.82: the card was rendering
   * "₹9,867.82" while the breakdown rounded its own total to ₹9,868, so the two
   * still disagreed by a rupee after being put on shared maths. Money is
   * rounded where it is computed, not where it is printed.
   */
  const gst =
    serviceFee === null ? null : Math.round(serviceFee * (pricing.gstRate ?? 0));

  const payOnApproval =
    serviceFee === null || gst === null ? null : serviceFee + gst;

  return {
    governmentFee,
    serviceFee,
    gst,
    /** What is owed up front — the authority's fee. Always known. */
    payNow: governmentFee,
    /** What is owed once the visa is granted — Abizon's fee plus tax. */
    payOnApproval,
    /** `null` when any Abizon component of the price is undecided. */
    perTraveller: payOnApproval === null ? null : governmentFee + payOnApproval,
    /**
     * Whether the Abizon components above are agreed commercial terms. Carried
     * on the result so a component showing a price does not have to reach for a
     * second import to find out whether it may present it as final.
     */
    provisional: feesAreProvisional,
  };
}

/** Country fees are authored as display strings ("₹8,099", "Free"). */
export function parseGovernmentFee(fees: string): number {
  if (/free/i.test(fees)) return 0;
  const digits = fees.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

/**
 * PHASE 8C §9: "₹0" and "Free" are the same fact, so they must read the same.
 *
 * The dataset authors Japan's government fee as the string `"₹0"` and 30-odd
 * other destinations as `"Free"`. `FeeBreakdown` normalised them — its row
 * tests `governmentFee === 0` and prints "Free" — but the country card and the
 * related-visa list printed `country.fees` raw. So Japan's card said "FEES ₹0"
 * under a label that switched to "COST" only for the literal string "Free",
 * while Japan's own fee breakdown three sections later said "Free".
 *
 * The numeric value is untouched, exactly as §9 requires: `parseGovernmentFee`
 * still returns 0 and every total is unaffected. This is presentation only.
 */
export function formatGovernmentFee(fees: string): string {
  return parseGovernmentFee(fees) === 0 ? "Free" : fees;
}

/** True where the destination's authority charges nothing, however authored. */
export function isGovernmentFeeFree(fees: string): boolean {
  return parseGovernmentFee(fees) === 0;
}

/* -------------------------------------------------------------------------- */
/* Presentation helpers                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The UAE is marketed as Dubai throughout the product, and the mapping was
 * previously repeated inline in five components. One definition.
 */
export function displayCountryName(country: Pick<Country, "name">): string {
  return country.name === "United Arab Emirates" ? "Dubai" : country.name;
}

/**
 * Resolve a country from a URL parameter.
 *
 * Accepts the slug the country page now sends (`dubai`) and, for links already
 * in circulation, a raw country name (`United Arab Emirates`). Returns
 * `undefined` for anything unrecognised so callers can render a flow with no
 * country rather than a flow with a wrong one.
 */
export function countryFromSlug(value: string | null | undefined): Country | undefined {
  // Delegates to the catalogue so the application and the country page cannot
  // resolve a duplicated slug to different rows. This used to be its own
  // `Array.find`, which is how /visa/morocco and /apply?country=morocco ended
  // up quoting prices ₹500 apart. See lib/countryCatalogue.ts.
  return resolveCountry(value);
}

/**
 * PHASE 7B: no photograph beats the wrong photograph.
 * PHASE 8B: and a photograph nobody has looked at is a wrong photograph waiting.
 *
 * 7B blew the dataset's card URL up to 1600x900 whenever its id was not on a
 * known-bad list. That produced, among others, a full-width photograph of a
 * Bangkok street under the headline "France Visa for Indians" — the id was on
 * neither list, so the check passed.
 *
 * The hero now asks `countryImagery` for a rendition that was *derived for a
 * hero* from a photograph someone has reviewed. Anything else resolves to
 * `undefined` and `CountryHero` draws its designed plate instead. Note what is
 * no longer here: the string-replace that turned a card URL into a hero URL.
 * Card and hero are separate derivations now (§5), which is what keeps a local
 * portrait asset from ever being stretched across a desktop band.
 */
export function resolveHeroImage(country: Country): string | undefined {
  return countryHeroImage(getCountrySlug(country.name))?.src;
}

/**
 * What is actually in the hero photograph, for the `alt` attribute — empty when
 * there is no photograph, because the plate beneath is decoration and has
 * nothing to announce.
 */
export function resolveHeroImageAlt(country: Country): string {
  return countryHeroImage(getCountrySlug(country.name))?.alt ?? "";
}

/** "29th Jul" — shared by the plan selector and the guarantee. */
export function formatShortDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);

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

/* -------------------------------------------------------------------------- */
/* Resolver                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Adapts a dataset row into the page's contract.
 *
 * Note what this does NOT do: it does not fill `stayDuration`, `entryType`,
 * `processingTime`, `requirements`, `appointmentRequired`, `biometricsRequired`,
 * `applicationSteps` or `faqs`. Every one of those is knowable only from a
 * source Abizon does not have yet, and every consuming component is written to
 * render nothing when they are absent.
 */
export function resolveCountryVisaConfig(country: Country): CountryVisaConfig {
  return {
    slug: getCountrySlug(country.name),
    name: country.name,
    displayName: displayCountryName(country),
    code: country.code,
    flagUrl: `https://flagcdn.com/w80/${country.code}.png`,
    heroImage: resolveHeroImage(country),
    heroImageSrcSet: countryHeroImage(getCountrySlug(country.name))?.srcSet,
    heroImageAlt: resolveHeroImageAlt(country),
    heroImageFocus: countryHeroFocus(getCountrySlug(country.name)),
    heroImageCredit: countryPhotoCredit(getCountrySlug(country.name)),

    visaType: country.visaType,
    flow: deriveVisaFlow(country.visaType),

    validity: country.validity,

    pricing: {
      governmentFee: parseGovernmentFee(country.fees),
      // `?? undefined` rather than `?? 0`: an undecided fee is absent from the
      // pricing object, and `computeTotals` reports the total as unavailable
      // instead of quoting the government fee as if it were the whole price.
      serviceFee: ABIZON_TERMS.serviceFee ?? undefined,
      gstRate: ABIZON_TERMS.gstRate,
      expressSurcharge: ABIZON_TERMS.expressSurcharge ?? undefined,
      // Sticker visas are collected at the mission, which is a property of the
      // flow rather than of an individual country, so it is safe to derive.
      paidAtEmbassy: country.visaType === "Sticker Visa" || undefined,
    },
    feesLabel: country.fees,

    deliveryDays: country.deliveryDays,

    documentsLabel: country.documents,

    arrivalCard: arrivalCardFor(getCountrySlug(country.name)),

    additionalSections:
      country.name === "United Arab Emirates" ? ["emirates"] : undefined,
  };
}
