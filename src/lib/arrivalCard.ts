/**
 * DIGITAL ARRIVAL CARDS.
 * ---------------------------------------------------------------------------
 * Several destinations have replaced the paper landing card handed out on the
 * aircraft with an online form submitted before travel. They are not visas:
 * they are free, issued by the destination's own immigration service, and
 * required in addition to whatever visa the traveller needs — or on their own,
 * where none is needed.
 *
 * ── Why this is a table and not a scrape ──
 *
 * The obvious way to decide which destinations show an arrival-card flow is to
 * copy whichever ones a competitor lists. That is the wrong source: it is
 * their editorial decision rather than a fact about the destination, their
 * pages are rendered client-side behind a bot check, and a list assembled that
 * way is wrong the moment they change it and nobody here notices.
 *
 * The actual question is which immigration services operate such a scheme for
 * an Indian passport holder. That has an answer, it changes rarely, and it can
 * be cited. So each entry carries the scheme's own name and its official URL —
 * which also means the applicant can always be sent to the government site.
 *
 * ── STATUS, and why every entry starts unverified ──
 *
 * Arrival-card rules move: Thailand's became mandatory in 2025, and schemes
 * are added and withdrawn with little notice. An entry below is a starting
 * point written from public information, not a checked fact, and the site must
 * not tell somebody a card is required — or free, or submittable three days
 * out — on that basis.
 *
 * So the status travels with the data, exactly as it does for the service fee
 * in `pricingConfig.ts`. `unverified` entries are inert: `arrivalCardFor`
 * returns nothing for them, no flow appears, and no claim is made. Confirm one
 * against its official URL, set it to `verified`, and it lights up. This is
 * the same shape of mistake the fee flag exists to prevent, in a place where
 * being wrong costs somebody entry to a country.
 */

export type ArrivalCardStatus = "verified" | "unverified";

export type ArrivalCard = {
  /** The scheme's own name, as its government uses it. */
  scheme: string;
  /** The acronym travellers will see at the airport, where there is one. */
  abbreviation?: string;
  /** The immigration service's own submission page. Always the real one. */
  officialUrl: string;
  /**
   * How far ahead it may be submitted, in days. Most schemes open a short
   * window before arrival and reject anything earlier, which is the single
   * most common way a traveller gets this wrong.
   */
  submitWithinDaysOfArrival?: number;
  /** Whether the destination charges for it. Every scheme here is free. */
  free: boolean;
  /** Whether it is required, or merely available. */
  mandatory: boolean;
  status: ArrivalCardStatus;
};

/**
 * Keyed by the same slug `getCountrySlug` produces.
 *
 * Everything here is `unverified` until somebody has opened the official URL
 * and confirmed the scheme, the window and whether it is mandatory. Until then
 * none of it reaches a page.
 */
export const ARRIVAL_CARDS: Record<string, ArrivalCard> = {
  thailand: {
    scheme: "Thailand Digital Arrival Card",
    abbreviation: "TDAC",
    officialUrl: "https://tdac.immigration.go.th",
    submitWithinDaysOfArrival: 3,
    free: true,
    mandatory: true,
    status: "unverified",
  },
  singapore: {
    scheme: "Singapore Arrival Card",
    abbreviation: "SGAC",
    officialUrl: "https://eservices.ica.gov.sg/sgarrivalcard",
    submitWithinDaysOfArrival: 3,
    free: true,
    mandatory: true,
    status: "unverified",
  },
  malaysia: {
    scheme: "Malaysia Digital Arrival Card",
    abbreviation: "MDAC",
    officialUrl: "https://imigresen-online.imi.gov.my/mdac/main",
    submitWithinDaysOfArrival: 3,
    free: true,
    mandatory: true,
    status: "unverified",
  },
  philippines: {
    scheme: "eTravel",
    officialUrl: "https://etravel.gov.ph",
    submitWithinDaysOfArrival: 3,
    free: true,
    mandatory: true,
    status: "unverified",
  },
  cambodia: {
    scheme: "Cambodia e-Arrival",
    officialUrl: "https://arrival.gov.kh",
    submitWithinDaysOfArrival: 7,
    free: true,
    mandatory: true,
    status: "unverified",
  },
};

/**
 * The card for a destination, or nothing.
 *
 * Returns `undefined` for an unverified entry as well as an absent one, so a
 * caller cannot accidentally render an unchecked claim by forgetting to look
 * at the status. There is deliberately no way to ask for one regardless.
 */
export function arrivalCardFor(slug: string): ArrivalCard | undefined {
  const entry = ARRIVAL_CARDS[slug];
  if (!entry || entry.status !== "verified") return undefined;
  return entry;
}

/** Every destination that would light up once its entry is confirmed. */
export function pendingArrivalCardSlugs(): string[] {
  return Object.entries(ARRIVAL_CARDS)
    .filter(([, card]) => card.status === "unverified")
    .map(([slug]) => slug)
    .sort();
}
