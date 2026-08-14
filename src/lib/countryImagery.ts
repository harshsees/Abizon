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
 * WHAT THIS USED TO SAY, and why it no longer does. The original note here
 * refused to source new photographs: 141 of 152 destinations had none, and
 * "blind bulk replacement" — handing every country an attractive stock
 * landscape — would have reintroduced the exact failure the manifest exists to
 * prevent. That reasoning still holds. What has changed is that there is now a
 * sourcing method which is not blind.
 *
 * `countryPhotoManifest.ts` carries one photograph for every destination,
 * derived from a NAMED LANDMARK's own encyclopedia article rather than from a
 * stock search. The identity of the subject is established before the image is
 * chosen, which is the opposite order to the process that filed Bangkok under
 * France. Every row was filtered against maps, flags, collages and satellite
 * frames, and every URL was requested before it was written down. See that
 * file's header for the full method.
 *
 * The verdict vocabulary below is unchanged and still governs: only
 * `depicts-country` renders, and the designed plate still sits beneath every
 * photograph so a failure lands somewhere deliberate.
 */

import { countriesData, getCountrySlug, type Country } from "@/data/countries";
import { GENERATED_COUNTRY_PHOTOS } from "@/lib/countryPhotoManifest";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * `unsplash`  — served from images.unsplash.com, cropped server-side per use.
 * `local`     — a file in `public/`, which needs card and hero as separate files
 *               because nothing crops it for us.
 * `wikimedia` — served from upload.wikimedia.org, which resizes but does NOT
 *               crop. Card and hero therefore share one rendition ladder and the
 *               framing is done by `object-cover` in CSS. That is a real
 *               difference from Unsplash and it is why `widths` exists.
 */
export type PhotoOrigin = "unsplash" | "local" | "wikimedia";

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
  /**
   * Unsplash photo id, a path under `public/`, or — for `wikimedia` — the
   * upload path after `upload.wikimedia.org/wikipedia/`, e.g.
   * `commons/9/90/Burj_Khalifa.jpg`. The hash directories are part of the
   * address, not decoration, so they are stored rather than recomputed.
   */
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
  /**
   * The rendition ladder a `wikimedia` file can actually serve.
   *
   * Wikimedia rejects any hotlinked thumbnail width outside its published
   * standard set, and rejects upscales past the original — so this is the
   * intersection of the two, measured per file. It is not a preference and it
   * cannot be widened by hand without producing a 400.
   */
  widths?: number[];
  /**
   * The source file's width ÷ height.
   *
   * Needed because Wikimedia will not crop: an 0.6 portrait of the Eiffel
   * Tower dropped into a 2.4 hero band is centre-cropped to the tower's
   * midsection, with the top and the base both outside the frame. `heroFocus`
   * below turns this number into an `object-position`, which is the one lever
   * CSS gives us over which part of an uncroppable source survives.
   */
  aspect?: number;
  /** The photographer, where the licence requires naming them. */
  credit?: string;
  /** The article or file page this came from, so a claim can be checked. */
  source?: string;
  /** Why a failing verdict was reached, where it is not self-evident. */
  note?: string;
};

/* -------------------------------------------------------------------------- */
/* The manifest                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Keyed by route slug, not by ISO code, because the slug is what the product
 * resolves on everywhere else (`/visa/dubai`, not `/visa/ae`).
 *
 * The rows themselves live in `countryPhotoManifest.ts` because they are
 * generated and this file is not. Aliasing rather than re-exporting keeps every
 * existing consumer — the validator, the audit, the resolvers below — pointed
 * at one name.
 */
export const COUNTRY_PHOTOS: Record<string, CountryPhoto> = GENERATED_COUNTRY_PHOTOS;

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

/**
 * Wikimedia's thumbnail address: the file's own path, with `thumb/` spliced in
 * before the hash directories and the width prefixed to a repeat of the
 * filename. It resizes only — there is no crop parameter — so the same ladder
 * serves the card and the hero, and `object-cover` does the framing.
 */
function wikimediaRendition(ref: string, width: number): string {
  const slash = ref.lastIndexOf("/");
  const dir = ref.slice(0, slash);
  const name = ref.slice(slash + 1);
  // `commons/9/90/x.jpg` -> `commons/thumb/9/90/x.jpg/960px-x.jpg`
  const project = dir.slice(0, dir.indexOf("/"));
  const hashes = dir.slice(dir.indexOf("/") + 1);
  return `https://upload.wikimedia.org/wikipedia/${project}/thumb/${hashes}/${name}/${width}px-${name}`;
}

/** The full ladder as a srcSet, largest last. */
function wikimediaSources(photo: CountryPhoto): ImageSources {
  const widths = photo.widths ?? [960];
  return {
    src: wikimediaRendition(photo.ref, widths[widths.length - 1]),
    srcSet: widths.map((w) => `${wikimediaRendition(photo.ref, w)} ${w}w`).join(", "),
    alt: photo.subject,
  };
}

export function countryCardImage(slug: string): ImageSources | undefined {
  const photo = COUNTRY_PHOTOS[slug];
  if (!photo || photo.verdict !== "depicts-country") return undefined;

  const alt = photo.subject;

  if (photo.origin === "local") {
    return { src: photo.ref, alt };
  }

  if (photo.origin === "wikimedia") return wikimediaSources(photo);

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

  if (photo.origin === "wikimedia") return wikimediaSources(photo);

  return {
    src: unsplashRendition(photo.ref, 1600, 900),
    srcSet: [1200, 1600, 2400]
      .map((w) => `${unsplashRendition(photo.ref, w, Math.round(w * 0.5625))} ${w}w`)
      .join(", "),
    alt,
  };
}

/**
 * Which part of an uncroppable source the hero band should keep.
 *
 * The band is roughly 2.4:1. A landscape source loses a little top and bottom
 * to `object-cover` and the centre is the right answer. A PORTRAIT source loses
 * most of its height, and the centre is the *wrong* answer: 18 of the 152
 * photographs are portraits of tall things — the Eiffel Tower, the Statue of
 * Liberty, Kuwait Towers, Cristo Rei — and centre-cropping one frames the
 * middle of the shaft with the subject's head and feet both outside the frame.
 * Biasing upward keeps the part that identifies the place.
 *
 * 0.9 rather than 1.0 as the threshold: a near-square photograph still crops
 * hard enough for the bias to help, and nothing in the set sits close enough to
 * 0.9 for the boundary to be delicate.
 */
export function countryHeroFocus(slug: string): string {
  const aspect = COUNTRY_PHOTOS[slug]?.aspect;
  if (aspect === undefined || aspect >= 0.9) return "center";
  // Not `top`: the very top of a tower shot is usually sky. A third of the way
  // down puts the subject's upper body in the band.
  return "center 30%";
}

/**
 * The attribution a photograph's licence requires, as one line, or nothing when
 * the licence asks for nothing. CC BY and CC BY-SA both require naming the
 * author; CC0 and public-domain files do not.
 */
export function countryPhotoCredit(slug: string): string | undefined {
  const photo = COUNTRY_PHOTOS[slug];
  if (!photo || photo.verdict !== "depicts-country") return undefined;
  if (photo.origin !== "wikimedia") return undefined;
  if (!photo.credit) return photo.license;
  return `${photo.credit} · ${photo.license}`;
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

  if (photo.origin === "wikimedia") {
    // Wikimedia will not crop, so the declared box has to be the box the file
    // actually is — claiming 1200x630 for an uncropped portrait would tell a
    // crawler to letterbox it. 1280 is the widest standard step every file in
    // the manifest can serve; height is left unstated for the same reason.
    const widths = photo.widths ?? [960];
    const width = widths.includes(1280) ? 1280 : widths[widths.length - 1];
    return {
      url: wikimediaRendition(photo.ref, width),
      width,
      height: Math.round(width * 0.5625),
      alt: photo.subject,
    };
  }

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
