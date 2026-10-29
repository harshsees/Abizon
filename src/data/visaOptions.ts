/**
 * WHAT ABIZON SELLS — every destination on the site, and every visa option
 * offered for it, at the price the customer pays.
 *
 * This is the catalogue. A destination that is not in `VISA_CATALOGUE` is not
 * listed on the site at all (see `countriesData`), and the order of the
 * catalogue is the order destinations are shown in: the Gulf priorities first.
 *
 * PRICES ARE ALL-INCLUSIVE (29 Oct 2026). Each `price` is the whole amount for
 * one applicant: the government's fee, abizon's handling and tax are inside it,
 * and nothing is added on top anywhere. The old model — a government fee from
 * the dataset plus a provisional ₹1,499 service fee plus 18% GST — no longer
 * prices anything.
 *
 * The option details (stay, validity, processing) are as the visa supplier
 * lists them. Where the business gave a price but no details, the detail is
 * left out rather than guessed.
 *
 * Changing a price here changes it everywhere at once: the country page, the
 * application, the receipt, and the amount the server charges, which is
 * recomputed from this file and never taken from the browser.
 */

export type VisaEntry = "Single" | "Double" | "Multiple" | "Single or multiple";

export type VisaOption = {
  /** Stable, for analytics and support conversations. Never shown. */
  id: string;
  title: string;
  entry: VisaEntry;
  stay?: string;
  validity?: string;
  /** As the supplier states it ("3–4 days", "4 working hours"). */
  processing?: string;
  /**
   * The upper end of `processing` in days, for the "guaranteed by" date.
   * Absent where no processing time was given; the destination's own delivery
   * estimate is used instead.
   */
  processingDays?: number;
  /** A faster version of another option on the same destination. */
  express?: boolean;
  /** Per applicant, in rupees, everything included. */
  price: number;
  /**
   * Where children are priced differently. A child is a traveller under
   * `CHILD_UNDER` on the day the price is worked out. The first child in the
   * party pays `first`, every further child pays `additional`.
   */
  child?: { first: number; additional: number };
  /**
   * Set when `price` covers a fixed party rather than one person — the New
   * Zealand couple visa is one price for two people. The application must
   * have exactly this many travellers.
   */
  partySize?: number;
};

export type VisaCatalogueEntry =
  | { code: string; kind: "options"; options: VisaOption[] }
  /**
   * Sticker visas (Schengen, USA, Canada). Nothing is priced or applied for
   * online: the visitor leaves their details and the team calls them back.
   */
  | { code: string; kind: "callback" };

/** What a sticker-visa destination shows where a price would be. */
export const CALLBACK_FEE_LABEL = "On request";

/** Under this age on the day of pricing, a traveller is a child. */
export const CHILD_UNDER = 18;

const options = (code: string, list: VisaOption[]): VisaCatalogueEntry => ({
  code,
  kind: "options",
  options: list,
});

const callback = (code: string): VisaCatalogueEntry => ({ code, kind: "callback" });

/**
 * Every Schengen member in the dataset. One application covers the whole
 * area, so they all lead to the same callback.
 */
const SCHENGEN = [
  "at", "be", "bg", "hr", "cz", "dk", "fi", "fr", "de", "gr", "hu",
  "is", "it", "mt", "nl", "pl", "pt", "ro", "es", "se", "ch",
];

export const VISA_CATALOGUE: VisaCatalogueEntry[] = [
  /* ── The six priorities ──────────────────────────────────────────────── */
  options("ae", [
    {
      id: "ae-30-single",
      title: "30 days single entry",
      entry: "Single",
      stay: "30 days",
      validity: "60 days",
      processing: "3–4 days",
      processingDays: 4,
      price: 8400,
      child: { first: 8800, additional: 3500 },
    },
    {
      id: "ae-30-single-express",
      title: "30 days single entry · Express",
      entry: "Single",
      stay: "30 days",
      express: true,
      price: 13999,
    },
    {
      id: "ae-60-single",
      title: "60 days single entry",
      entry: "Single",
      stay: "60 days",
      price: 13999,
      child: { first: 5000, additional: 5000 },
    },
  ]),
  options("om", [
    {
      id: "om-26m-30",
      title: "Unsponsored tourist visa (26M) · 30 days",
      entry: "Single",
      stay: "30 days",
      price: 4000,
    },
    {
      id: "om-26m-10",
      title: "Unsponsored tourist visa (26M) · 10 days",
      entry: "Single",
      stay: "10 days",
      price: 2750,
    },
  ]),
  options("qa", [
    {
      id: "qa-30",
      title: "30 days A1 visa",
      entry: "Single",
      stay: "30 days",
      price: 1500,
    },
  ]),
  options("au", [
    {
      id: "au-600-multiple",
      title: "Visitor visa (subclass 600) · Multiple entry",
      entry: "Multiple",
      stay: "As per consulate",
      validity: "As per consulate",
      processing: "60 days",
      processingDays: 60,
      price: 20250,
    },
  ]),
  options("bh", [
    {
      id: "bh-14-single",
      title: "14 days single entry",
      entry: "Single",
      stay: "14 days",
      validity: "90 days",
      processing: "6–7 days",
      processingDays: 7,
      price: 4000,
    },
    {
      id: "bh-30-multiple",
      title: "30 days multiple entry",
      entry: "Multiple",
      stay: "30 days",
      validity: "90 days",
      processing: "6–7 days",
      processingDays: 7,
      price: 5700,
    },
  ]),
  options("az", [
    {
      id: "az-standard",
      title: "Standard e-visa",
      entry: "Single",
      stay: "30 days",
      validity: "90 days",
      processing: "3–4 days",
      processingDays: 4,
      price: 4350,
    },
    {
      id: "az-urgent",
      title: "Urgent e-visa",
      entry: "Single",
      stay: "30 days",
      validity: "90 days",
      processing: "1 day",
      processingDays: 1,
      express: true,
      price: 8600,
    },
  ]),

  /* ── Everything else on offer ────────────────────────────────────────── */
  options("ge", [
    {
      id: "ge-multiple",
      title: "E-visa · Multiple entry",
      entry: "Multiple",
      stay: "30 days",
      validity: "120 days",
      processing: "8–10 days",
      processingDays: 10,
      price: 5200,
    },
  ]),
  options("th", [
    {
      id: "th-tdac",
      title: "Thailand Digital Arrival Card",
      entry: "Single",
      stay: "As per ticket",
      validity: "As per ticket",
      processing: "1–2 days",
      processingDays: 2,
      price: 1200,
    },
  ]),
  options("my", [
    {
      id: "my-mdac",
      title: "Malaysia Digital Arrival Card (MDAC)",
      entry: "Single",
      stay: "30 days",
      validity: "As per ticket",
      processing: "0–1 working days",
      processingDays: 1,
      price: 1200,
    },
  ]),
  options("nz", [
    {
      id: "nz-individual",
      title: "Tourist / family visit / business · Individual",
      entry: "Single or multiple",
      stay: "180 days",
      validity: "365 days",
      processing: "20–30 days",
      processingDays: 30,
      price: 28300,
    },
    {
      id: "nz-couple",
      title: "Tourist / family visit / business · Couple",
      entry: "Single",
      stay: "30 days",
      validity: "90 days",
      processing: "20–30 days",
      processingDays: 30,
      // One price for the two of them.
      price: 34800,
      partySize: 2,
    },
  ]),
  options("id", [
    {
      id: "id-evoa-30",
      title: "Visa on arrival (B1 e-VOA) · 30 days stay",
      entry: "Single",
      stay: "30 days",
      validity: "90 days",
      processing: "1–2 days",
      processingDays: 2,
      price: 4300,
    },
  ]),
  options("sa", [
    {
      id: "sa-tourist",
      title: "Tourist e-visa",
      entry: "Multiple",
      stay: "90 days",
      validity: "365 days",
      processing: "1–2 days",
      processingDays: 2,
      price: 12500,
    },
  ]),
  options("ug", [
    {
      id: "ug-tourist",
      title: "Tourist single entry",
      entry: "Single",
      stay: "30 days",
      validity: "90 days",
      processing: "6–7 days",
      processingDays: 7,
      price: 6600,
    },
  ]),
  options("vn", [
    {
      id: "vn-30-single",
      title: "E-visa · 30 days single",
      entry: "Single",
      stay: "As per ticket",
      validity: "30 days",
      processing: "3–4 days",
      processingDays: 4,
      price: 3750,
    },
    {
      id: "vn-30-express",
      title: "E-visa · Express, 4 working hours",
      entry: "Single",
      stay: "As per ticket",
      validity: "30 days",
      processing: "4 working hours",
      processingDays: 1,
      express: true,
      price: 10500,
    },
  ]),
  options("ru", [
    {
      id: "ru-single",
      title: "E-visa",
      entry: "Single",
      stay: "As per ticket",
      validity: "90 days",
      processing: "6–7 days",
      processingDays: 7,
      price: 7550,
    },
  ]),
  options("tz", [
    {
      id: "tz-business",
      title: "Single entry business visa",
      entry: "Single",
      stay: "90 days",
      validity: "90 days",
      processing: "10–12 days",
      processingDays: 12,
      price: 6450,
    },
    {
      id: "tz-tourist",
      title: "Single entry tourist visa",
      entry: "Single",
      stay: "30 days",
      validity: "90 days",
      processing: "10–12 days",
      processingDays: 12,
      price: 26750,
    },
  ]),
  options("lk", [
    {
      id: "lk-eta",
      title: "Tourist ETA",
      entry: "Double",
      stay: "30 days",
      validity: "180 days",
      processing: "1–2 days",
      processingDays: 2,
      price: 1250,
    },
  ]),
  options("hk", [
    {
      id: "hk-pre-arrival",
      title: "Pre-arrival registration",
      entry: "Multiple",
      stay: "14 days",
      validity: "180 days",
      processing: "1–2 days",
      processingDays: 2,
      price: 1350,
    },
  ]),
  options("tr", [
    {
      id: "tr-single",
      title: "E-visa",
      entry: "Single",
      stay: "30 days",
      validity: "180 days",
      processing: "1–2 days",
      processingDays: 2,
      price: 6400,
    },
  ]),

  /* ── Sticker visas: a callback, not an application ──────────────────── */
  ...SCHENGEN.map(callback),
  callback("us"),
  callback("ca"),
];

const BY_CODE = new Map(VISA_CATALOGUE.map((entry) => [entry.code, entry]));

export function catalogueEntry(code: string): VisaCatalogueEntry | undefined {
  return BY_CODE.get(code);
}

/** The options for a destination, or an empty list for a callback or unlisted one. */
export function visaOptionsFor(code: string): VisaOption[] {
  const entry = BY_CODE.get(code);
  return entry?.kind === "options" ? entry.options : [];
}

export function isCallbackDestination(code: string): boolean {
  return BY_CODE.get(code)?.kind === "callback";
}

/** Position in the catalogue, which is the order destinations are listed in. */
export function catalogueRank(code: string): number {
  const index = VISA_CATALOGUE.findIndex((entry) => entry.code === code);
  return index === -1 ? Number.POSITIVE_INFINITY : index;
}
