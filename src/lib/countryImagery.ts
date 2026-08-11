/**
 * THE COUNTRY IMAGE MANIFEST — one place that knows what each destination
 * actually looks like, and whether a human has ever looked.
 *
 * WHY THIS EXISTS. Phase 7B introduced `hasAuthenticImagery`, which decided
 * whether a photograph could be trusted by checking its id against two hand-kept
 * sets: five known generic stock ids, and eight ids that returned 404. That test
 * is *structural* — it can tell you an image is missing, and it can tell you an
 * image is one of five it already knows to be generic. It cannot tell you what
 * is in the frame.
 *
 * Phase 8B opened the images. Of the 26 photographs the dataset claims are
 * country-specific and that still load, `hasAuthenticImagery` returned true for
 * every single one, and seven of them show a different country:
 *
 *   France        a neon street of tuk-tuks and Chinese signage — Bangkok
 *   Switzerland   Lago di Braies, in the Italian Dolomites
 *   Malaysia      Lago di Braies again. The same lake, for an equatorial country
 *   Nepal         Mount Fuji, which is in Japan
 *   Brazil        a snow-capped range; Brazil has no snow-capped mountains
 *   New Zealand   a campervan in red-rock desert — the American Southwest
 *   Morocco       the Pyramids of Giza, inherited from Egypt's row
 *
 * A 1600px photograph of Bangkok under the headline "France Visa for Indians"
 * is the same class of error as an invented fee, and the check that was supposed
 * to prevent it passed, because the check never looked.
 *
 * So the unit of trust here is not a URL. It is a REVIEW: a named subject, a
 * verdict, and the date someone looked. An image with no review does not render.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: source new photographs. Section 8 of the
 * phase brief forbids blind bulk replacement, and rightly — 117 destinations
 * cannot be given verified imagery by a process that has not seen them. The
 * countries that need photographs are marked `needs-photo` and are visible to
 * the validator, so the gap stays legible instead of being papered over with
 * something attractive and false.
 */

import { countriesData, getCountrySlug, type Country } from "@/data/countries";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * `unsplash` — served from images.unsplash.com, cropped server-side per use.
 * `local`    — a file in `public/`, which needs card and hero as separate files
 *              because nothing crops it for us.
 */
export type PhotoOrigin = "unsplash" | "local";

/**
 * The verdict is the whole point of this module. Only `depicts-country` renders.
 *
 * `not-identifiable` is separate from `generic-stock` on purpose. Both fail, but
 * they fail for different reasons and a future fix differs: a generic stock
 * landscape was never meant to be the country, whereas a not-identifiable photo
 * may well have been taken there — we simply cannot confirm it, and §3 forbids
 * publishing an image whose location is unknown.
 */
export type PhotoVerdict =
  | "depicts-country"
  | "not-identifiable"
  | "wrong-country"
  | "generic-stock"
  | "dead";

export type CountryPhoto = {
  origin: PhotoOrigin;
  /** Unsplash photo id, or a path under `public/`. */
  ref: string;
  /**
   * What is actually in the frame, in plain words. This is the source of alt
   * text (§15), so it is written to be read aloud, and it is also the record of
   * what the reviewer saw — the two are the same fact.
   */
  subject: string;
  verdict: PhotoVerdict;
  license: string;
  /** ISO date. A review is evidence, and evidence has an age. */
  reviewedOn: string;
  /** Landscape file for `local` photos, whose card crop cannot be derived. */
  heroRef?: string;
  /** Why a failing verdict was reached, where it is not self-evident. */
  note?: string;
};

const UNSPLASH_LICENSE = "Unsplash License (free to use, no attribution required)";
const REVIEWED = "2026-08-11";

/* -------------------------------------------------------------------------- */
/* The manifest                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Keyed by route slug, not by ISO code, because the slug is what the product
 * resolves on everywhere else (`/visa/dubai`, not `/visa/ae`).
 *
 * Only destinations whose image has been *opened and looked at* appear here.
 * Everything absent is `generic-stock` by construction — `countries.ts` assigns
 * one of five category landscapes by array index to every unmapped row, and
 * `countryConfigValidation` asserts that this remains true.
 */
export const COUNTRY_PHOTOS: Record<string, CountryPhoto> = {
  /* ---- Verified: the photograph shows this country --------------------- */

  dubai: {
    origin: "local",
    ref: "/images/emirates/dubai.jpg",
    /**
     * No `heroRef`, deliberately — and this is the one place in the manifest
     * where following the rule costs the product something visible.
     *
     * `dubai.jpg` is 571x1024: a portrait file, correct for a 5:8 card and the
     * sharpest card on the site. Phase 7B also handed it to the hero, where the
     * band is ~1232px wide. `object-cover` therefore scales it 2.16x, and the
     * result is measurably soft — the towers on /visa/dubai render mushy at
     * 1440, which is the blur §5 means by "do not upscale a poor source merely
     * to avoid a gradient".
     *
     * So the card keeps the photograph and the hero takes the plate. The moment
     * a landscape Dubai asset (≥2400px wide) lands in `public/`, naming it here
     * turns the hero back on and nothing else has to change.
     */
    subject: "The Burj Khalifa rising over the Sheikh Zayed Road skyline at dusk",
    verdict: "depicts-country",
    license: "Licensed project asset, shipped in public/",
    reviewedOn: REVIEWED,
  },
  australia: {
    origin: "unsplash",
    ref: "photo-1506973035872-a4ec16b8e8d9",
    subject: "Sydney Opera House and Circular Quay across the harbour",
    verdict: "depicts-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  egypt: {
    origin: "unsplash",
    ref: "photo-1539650116574-8efeb43e2750",
    subject: "The Pyramids of Giza across the desert",
    verdict: "depicts-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  germany: {
    origin: "unsplash",
    ref: "photo-1467269204594-9661b134dd2b",
    subject: "A half-timbered old town street with a medieval gate tower",
    verdict: "depicts-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Regional vernacular rather than a named landmark — unmistakably German, but not a specific identifiable town.",
  },
  india: {
    origin: "unsplash",
    ref: "photo-1564507592333-c60657eea523",
    subject: "The Taj Mahal reflected in its garden canal at Agra",
    verdict: "depicts-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  indonesia: {
    origin: "unsplash",
    ref: "photo-1537996194471-e657df975ab4",
    subject: "A tiered Balinese water temple on the lake at Bedugul",
    verdict: "depicts-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  italy: {
    origin: "unsplash",
    ref: "photo-1516483638261-f4dbaf036963",
    subject: "The painted cliffside houses of the Cinque Terre above the Ligurian sea",
    verdict: "depicts-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  japan: {
    origin: "unsplash",
    ref: "photo-1493976040374-85c8e12f0c0e",
    subject: "The Yasaka Pagoda above a Kyoto lane at dawn",
    verdict: "depicts-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  singapore: {
    origin: "unsplash",
    ref: "photo-1525625293386-3f8f99389edd",
    subject: "Marina Bay Sands and the ArtScience Museum from the air",
    verdict: "depicts-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  spain: {
    origin: "unsplash",
    ref: "photo-1539037116277-4db20889f2d4",
    subject: "The Gran Vía in Madrid lit at dusk, looking toward the Metropolis building",
    verdict: "depicts-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  vietnam: {
    origin: "unsplash",
    ref: "photo-1528127269322-539801943592",
    subject: "Limestone karsts and junk boats in Ha Long Bay",
    verdict: "depicts-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },

  /* ---- Wrong country: actively false, removed -------------------------- */

  france: {
    origin: "unsplash",
    ref: "photo-1508009603885-50cf7c579365",
    subject: "A neon-lit street of tuk-tuks and Chinese shopfront signage at night",
    verdict: "wrong-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Reads as Bangkok Chinatown. Nothing in the frame is French.",
  },
  switzerland: {
    origin: "unsplash",
    ref: "photo-1476514525535-07fb3b4ae5f1",
    subject: "The bow of a wooden rowing boat on a turquoise alpine lake",
    verdict: "wrong-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Lago di Braies, in the Italian Dolomites — the same lake the dataset also gives to Malaysia.",
  },
  malaysia: {
    origin: "unsplash",
    ref: "photo-1542856391-010fb87dcfed",
    subject: "A turquoise alpine lake beneath grey dolomite peaks",
    verdict: "wrong-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Lago di Braies, Italy. Malaysia is equatorial and has no alpine lakes.",
  },
  nepal: {
    origin: "unsplash",
    ref: "photo-1589308078059-be1415eab4c3",
    subject: "A symmetrical snow-capped stratovolcano above a treeline",
    verdict: "wrong-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Mount Fuji, in Japan. Nepal's mountains are Himalayan ridgelines, not a lone cone.",
  },
  brazil: {
    origin: "unsplash",
    ref: "photo-1483728642387-6c3bdd6c93e5",
    subject: "A snow-capped mountain range at dusk",
    verdict: "wrong-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Brazil has no snow-capped mountains; its highest peaks are tropical.",
  },
  "new-zealand": {
    origin: "unsplash",
    ref: "photo-1469854523086-cc02fe5d8800",
    subject: "A yellow campervan on a road through red sandstone desert",
    verdict: "wrong-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Red-rock desert of the American Southwest. New Zealand has no such landscape.",
  },
  morocco: {
    origin: "unsplash",
    ref: "photo-1539650116574-8efeb43e2750",
    subject: "The Pyramids of Giza across the desert",
    verdict: "wrong-country",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Egypt's photograph, shared by the dataset. Correct for Egypt, false for Morocco.",
  },

  /* ---- Real photographs whose location cannot be confirmed ------------- */

  maldives: {
    origin: "unsplash",
    ref: "photo-1514282401047-d79a71a590e8",
    subject: "An arc of overwater villas on a turquoise atoll",
    verdict: "not-identifiable",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Plausibly Maldivian, equally plausibly French Polynesia. Nothing in frame settles it.",
  },
  philippines: {
    origin: "unsplash",
    ref: "photo-1518509562904-e7ef99cdcc86",
    subject: "A limestone cove with clear shallow water and forested karst",
    verdict: "not-identifiable",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Karst coves of this kind occur across Palawan, southern Thailand and Vietnam alike.",
  },
  "south-africa": {
    origin: "unsplash",
    ref: "photo-1516026672322-bc52d61a55d5",
    subject: "A lone acacia on open savanna at sunset",
    verdict: "not-identifiable",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Generic savanna, and the dataset gives the same frame to Kenya.",
  },
  kenya: {
    origin: "unsplash",
    ref: "photo-1516026672322-bc52d61a55d5",
    subject: "A lone acacia on open savanna at sunset",
    verdict: "not-identifiable",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Shared with South Africa's row.",
  },
  argentina: {
    origin: "unsplash",
    ref: "photo-1518495973542-4542c06a5843",
    subject: "Sunlight through the canopy of a large spreading tree",
    verdict: "not-identifiable",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "No landscape, architecture or signage. Could be anywhere temperate.",
  },
  canada: {
    origin: "unsplash",
    ref: "photo-1504280390367-361c6d9f38f4",
    subject: "The interior of a tent looking out onto conifer forest",
    verdict: "not-identifiable",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Camping, not Canada. Nothing in frame is national.",
  },
  georgia: {
    origin: "unsplash",
    ref: "photo-1565008447742-97f6f38c985c",
    subject: "Glass office towers under construction against a cloudy sky",
    verdict: "not-identifiable",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Generic contemporary skyline with no Georgian marker.",
  },
  "south-korea": {
    origin: "unsplash",
    ref: "photo-1555939594-58d7cb561ad1",
    subject: "A platter of grilled meat and potatoes with dipping sauces",
    verdict: "not-identifiable",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Food, not a destination, and not recognisably Korean cuisine.",
  },
  turkey: {
    origin: "unsplash",
    ref: "photo-1504609773096-104ff2c73ba4",
    subject: "A flat-lay of camera, compass, sunglasses and notebook on a wooden desk",
    verdict: "not-identifiable",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "A travel-themed still life, not a place. Also given to Cambodia.",
  },
  cambodia: {
    origin: "unsplash",
    ref: "photo-1504609773096-104ff2c73ba4",
    subject: "A flat-lay of camera, compass, sunglasses and notebook on a wooden desk",
    verdict: "not-identifiable",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "Shared with Turkey's row.",
  },
  fiji: {
    origin: "unsplash",
    ref: "photo-1507525428034-b723cf961d3e",
    subject: "A empty tropical beach at sunset",
    verdict: "generic-stock",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
    note: "This is the dataset's Beach/Tropical category image, mapped to Fiji as though it were specific.",
  },

  /* ---- Dead: the id returns 404 --------------------------------------- */

  thailand: {
    origin: "unsplash",
    ref: "photo-1528181304800-2f5373a29587",
    subject: "—",
    verdict: "dead",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  "sri-lanka": {
    origin: "unsplash",
    ref: "photo-1588598130794-3d9ad5a266db",
    subject: "—",
    verdict: "dead",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  "united-kingdom": {
    origin: "unsplash",
    ref: "photo-1485081661445-7e753080975f",
    subject: "—",
    verdict: "dead",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  "united-states": {
    origin: "unsplash",
    ref: "photo-1513581166391-887a96ded73a",
    subject: "—",
    verdict: "dead",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  mauritius: {
    origin: "unsplash",
    ref: "photo-1509060464153-44667396260f",
    subject: "—",
    verdict: "dead",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  seychelles: {
    origin: "unsplash",
    ref: "photo-1589979482837-e74f2e145060",
    subject: "—",
    verdict: "dead",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  mexico: {
    origin: "unsplash",
    ref: "photo-1512813583145-baaa340ef29f",
    subject: "—",
    verdict: "dead",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
  peru: {
    origin: "unsplash",
    ref: "photo-1531816458010-fb76819ec72f",
    subject: "—",
    verdict: "dead",
    license: UNSPLASH_LICENSE,
    reviewedOn: REVIEWED,
  },
};

/**
 * The five landscapes `countries.ts` rotates through for every unmapped row.
 * Kept here so the validator can assert that a country absent from the manifest
 * really is on one of them, rather than on some new unreviewed photograph.
 */
export const CATEGORY_PHOTO_IDS: ReadonlySet<string> = new Set([
  "photo-1507525428034-b723cf961d3e", // Beach/Tropical
  "photo-1470071459604-3b5ec3a7fe05", // Mountains/Nature
  "photo-1477959858617-67f85cf4f1df", // City/Urban
  "photo-1464822759023-fed622ff2c3b", // Forest/Hills
  "photo-1500530855697-b586d89ba3ee", // Lake/Roadtrip
]);

/* -------------------------------------------------------------------------- */
/* Resolution                                                                 */
/* -------------------------------------------------------------------------- */

/** The review for a destination, or the implied generic-stock one. */
export function countryPhoto(slug: string): CountryPhoto | undefined {
  return COUNTRY_PHOTOS[slug];
}

/**
 * The single question every consumer asks. True only when a person has looked
 * at the frame and confirmed it shows this country.
 */
export function hasVerifiedPhoto(slug: string): boolean {
  return COUNTRY_PHOTOS[slug]?.verdict === "depicts-country";
}

/**
 * §8's grade, derived rather than stored so it cannot drift from the verdict.
 *
 * There is deliberately no `B`. The brief allows "generic but visually
 * acceptable temporary fallback", and the answer here is that there is no such
 * thing: a stock landscape captioned with a country's name is a claim about
 * that country. The designed fallback is the acceptable temporary state, and it
 * is honest, so every non-A destination is C or D.
 */
export function imageGrade(slug: string): "A" | "C" | "D" {
  const verdict = COUNTRY_PHOTOS[slug]?.verdict ?? "generic-stock";
  if (verdict === "depicts-country") return "A";
  if (verdict === "wrong-country" || verdict === "dead") return "D";
  return "C";
}

/**
 * CARD renditions. 5:8, matching the card's measured geometry.
 *
 * Card and hero are separate derivations, never one resized into the other.
 * For `unsplash` that is safe because the service crops from the full-size
 * original at every requested width — a 1600px hero request returns a true
 * 1600x900 crop, not the 400px card blown up. For `local` it is not safe, which
 * is why a local photo must declare `heroRef` explicitly.
 */
const CARD_WIDTHS = [400, 640, 960] as const;

export type ImageSources = {
  src: string;
  srcSet?: string;
  alt: string;
};

function unsplashRendition(ref: string, width: number, height: number): string {
  return `https://images.unsplash.com/${ref}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

export function countryCardImage(slug: string): ImageSources | undefined {
  const photo = COUNTRY_PHOTOS[slug];
  if (!photo || photo.verdict !== "depicts-country") return undefined;

  const alt = photo.subject;

  if (photo.origin === "local") {
    return { src: photo.ref, alt };
  }

  return {
    src: unsplashRendition(photo.ref, 640, 1024),
    srcSet: CARD_WIDTHS.map(
      (w) => `${unsplashRendition(photo.ref, w, Math.round(w * 1.6))} ${w}w`,
    ).join(", "),
    alt,
  };
}

/** HERO rendition. 16:9, sized for a full-width desktop band. */
export function countryHeroImage(slug: string): ImageSources | undefined {
  const photo = COUNTRY_PHOTOS[slug];
  if (!photo || photo.verdict !== "depicts-country") return undefined;

  const alt = photo.subject;

  if (photo.origin === "local") {
    // No heroRef means the only file is card-shaped, and §10 forbids promoting
    // it. The hero falls back rather than stretching a portrait crop.
    if (!photo.heroRef) return undefined;
    return { src: photo.heroRef, alt };
  }

  return {
    src: unsplashRendition(photo.ref, 1600, 900),
    srcSet: [1200, 1600, 2400]
      .map((w) => `${unsplashRendition(photo.ref, w, Math.round(w * 0.5625))} ${w}w`)
      .join(", "),
    alt,
  };
}

/**
 * OG rendition — 1200x630, the size every share surface actually crops to.
 *
 * The previous implementation passed `country.imageUrl` straight through, which
 * is the 400x550 *card* crop: a portrait image in a landscape slot, letterboxed
 * or centre-cropped by whoever renders the card. It also had no absolute host,
 * and an OG image must be absolutely resolvable by a crawler.
 */
export function countryOgImage(slug: string): { url: string; width: number; height: number; alt: string } | undefined {
  const photo = COUNTRY_PHOTOS[slug];
  if (!photo || photo.verdict !== "depicts-country") return undefined;
  if (photo.origin === "local") return undefined;

  return {
    url: unsplashRendition(photo.ref, 1200, 630),
    width: 1200,
    height: 630,
    alt: photo.subject,
  };
}

/* -------------------------------------------------------------------------- */
/* The designed fallback                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A destination with no verified photograph still has to look like something,
 * and 8A found what it currently looks like: 124 country pages rendering an
 * identical near-black rectangle, which reads as a failed image rather than a
 * decision.
 *
 * So the fallback is derived from the country itself. The ISO code seeds a hue,
 * which drives a two-tone plate in the product's dark range. Nothing about it
 * claims to be a photograph of anywhere — it is obviously a graphic — but no two
 * neighbouring destinations look the same, which is what stops a row of cards
 * reading as broken.
 *
 * The hue band is 190°–320° (teal → blue → indigo → violet). Warm hues are
 * excluded on purpose: amber is the product's action colour, and a card that
 * glows amber competes with the CTA next to it.
 */
export function countryFallbackHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 1_000_003;
  }
  return 190 + (hash % 131);
}

/**
 * Returned as CSS custom properties rather than class names: Tailwind cannot
 * see a hue computed at runtime, and 141 hand-written safelist entries would be
 * worse than one inline variable.
 */
export function countryFallbackStyle(seed: string): React.CSSProperties {
  return { "--country-hue": String(countryFallbackHue(seed)) } as React.CSSProperties;
}

/* -------------------------------------------------------------------------- */
/* Audit                                                                      */
/* -------------------------------------------------------------------------- */

export type ImageAuditRow = {
  slug: string;
  name: string;
  code: string;
  grade: "A" | "C" | "D";
  verdict: PhotoVerdict;
  hasCard: boolean;
  hasHero: boolean;
  note?: string;
};

/** Every destination, graded. Used by the validator and by the phase report. */
export function auditCountryImagery(countries: readonly Country[] = countriesData): ImageAuditRow[] {
  const seen = new Set<string>();
  const rows: ImageAuditRow[] = [];

  for (const country of countries) {
    const slug = getCountrySlug(country.name);
    if (seen.has(slug)) continue;
    seen.add(slug);

    const photo = COUNTRY_PHOTOS[slug];
    rows.push({
      slug,
      name: country.name,
      code: country.code,
      grade: imageGrade(slug),
      verdict: photo?.verdict ?? "generic-stock",
      hasCard: Boolean(countryCardImage(slug)),
      hasHero: Boolean(countryHeroImage(slug)),
      note: photo?.note,
    });
  }

  return rows;
}
