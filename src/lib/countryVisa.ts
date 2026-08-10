/**
 * KEYRISE COUNTRY VISA CONFIGURATION
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
 * Every field that Keyrise does not actually have is optional and defaults to
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

import { Country, countriesData, getCountrySlug } from "@/data/countries";

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
  /** Paid to the destination's authority. The only figure Keyrise has today. */
  governmentFee?: Money;
  /** Keyrise's handling charge. Not in the dataset — see PLACEHOLDER_PRICING. */
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
  additionalSections?: Array<"emirates">;

  /**
   * Which authorities to show. Previously every destination displayed all
   * three, so Japan's page claimed a partnership with the Government of Dubai.
   * Only definitional attributions are derived: the two UAE bodies are UAE
   * bodies, IATA is a global industry association.
   */
  partners: Array<"uae-mofa" | "dubai-government" | "iata">;
};

/* -------------------------------------------------------------------------- */
/* Pricing placeholders                                                       */
/* -------------------------------------------------------------------------- */

/**
 * UNVERIFIED. These two numbers are not Keyrise data.
 *
 * They were previously hardcoded in three separate components —
 * `ApplicationCard` used 499/1999, `FeeBreakdown` used 1499, and
 * `VisaPlanSelector` adds a flat 1500 for express — so the same page quoted
 * three different service fees depending on where you looked. Centralising them
 * here does not make them true; it makes them *one* lie instead of three, and
 * gives a single place to replace when the real commercial terms arrive.
 *
 * Do not treat these as authoritative, and do not add per-country variants
 * here: per-country pricing belongs in the dataset, via `VisaPricing`.
 */
export const PLACEHOLDER_PRICING = {
  serviceFee: 1499,
  gstRate: 0.18,
  /** Carried over from the plan selector's existing "+1500" for express. */
  expressSurcharge: 1500,
} as const;

/**
 * `ApplicationCard` multiplied the government fee by 1.5 for a business visa,
 * on the reasoning that "business visas are typically more expensive". That is
 * a guess applied uniformly to 154 countries, and a user could budget on it.
 *
 * It is deliberately NOT reproduced here. Until a country supplies a real
 * `businessGovernmentFee`, the business option quotes the fee Keyrise actually
 * knows rather than a scaled invention of one. This constant exists only to
 * record what was removed and why.
 */
export const REMOVED_BUSINESS_FEE_MULTIPLIER = 1.5;

/** The per-traveller total, computed one way for the whole app. */
export function computeTotals(
  pricing: VisaPricing,
  options: { express?: boolean; business?: boolean } = {},
) {
  const base = pricing.governmentFee ?? 0;
  const governmentFee = options.business
    ? (pricing.businessGovernmentFee ?? base)
    : base;

  const serviceFee =
    (pricing.serviceFee ?? 0) +
    (options.express ? (pricing.expressSurcharge ?? 0) : 0);

  /**
   * Rounded to whole rupees here, once, rather than left for each caller to
   * round at display time. 1499 x 18% is 269.82: the card was rendering
   * "₹9,867.82" while the breakdown rounded its own total to ₹9,868, so the two
   * still disagreed by a rupee after being put on shared maths. Money is
   * rounded where it is computed, not where it is printed.
   */
  const gst = Math.round(serviceFee * (pricing.gstRate ?? 0));

  return {
    governmentFee,
    serviceFee,
    gst,
    /** What is owed up front — the authority's fee. */
    payNow: governmentFee,
    /** What is owed once the visa is granted — Keyrise's fee plus tax. */
    payOnApproval: serviceFee + gst,
    perTraveller: governmentFee + serviceFee + gst,
  };
}

/** Country fees are authored as display strings ("₹8,099", "Free"). */
export function parseGovernmentFee(fees: string): number {
  if (/free/i.test(fees)) return 0;
  const digits = fees.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
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
  if (!value) return undefined;
  const needle = value.trim().toLowerCase();

  return countriesData.find(
    (country) =>
      getCountrySlug(country.name) === needle ||
      country.name.toLowerCase() === needle,
  );
}

/**
 * Hero artwork, at hero resolution.
 *
 * Two problems this solves. First, `countries.ts` requests every photo at
 * w=400 — sized for a card, then stretched across a ~1230px hero, where it
 * reads as a blurred smudge under the scrim. Unsplash crops server-side, so the
 * hero simply asks for a hero-sized crop.
 *
 * Second, some destinations already have a real, local, correct photograph
 * shipped in `public/`. Those beat a generic remote stock image on quality and
 * on not depending on a third party staying up, so they win where they exist.
 * This is a lookup of assets that are actually in the repository — not a place
 * to invent artwork for countries that have none.
 */
const LOCAL_HERO_IMAGES: Record<string, string> = {
  ae: "/images/emirates/dubai.jpg",
};

export function resolveHeroImage(country: Country): string | undefined {
  const local = LOCAL_HERO_IMAGES[country.code];
  if (local) return local;
  if (!country.imageUrl) return undefined;

  return country.imageUrl
    .replace(/w=\d+/, "w=1600")
    .replace(/h=\d+/, "h=900");
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
 * source Keyrise does not have yet, and every consuming component is written to
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

    visaType: country.visaType,
    flow: deriveVisaFlow(country.visaType),

    validity: country.validity,

    pricing: {
      governmentFee: parseGovernmentFee(country.fees),
      serviceFee: PLACEHOLDER_PRICING.serviceFee,
      gstRate: PLACEHOLDER_PRICING.gstRate,
      expressSurcharge: PLACEHOLDER_PRICING.expressSurcharge,
      // Sticker visas are collected at the mission, which is a property of the
      // flow rather than of an individual country, so it is safe to derive.
      paidAtEmbassy: country.visaType === "Sticker Visa" || undefined,
    },
    feesLabel: country.fees,

    deliveryDays: country.deliveryDays,

    documentsLabel: country.documents,

    additionalSections:
      country.name === "United Arab Emirates" ? ["emirates"] : undefined,

    partners:
      country.code === "ae"
        ? ["uae-mofa", "dubai-government", "iata"]
        : ["iata"],
  };
}
