/**
 * DIGITAL ARRIVAL CARDS.
 * ---------------------------------------------------------------------------
 * Several destinations have replaced the paper landing card handed out on the
 * aircraft with an online form submitted before travel. They are not visas:
 * they are free, issued by the destination's own immigration service, and
 * required in addition to whatever visa the traveller needs — or on their own,
 * where none is needed.
 *
 * ── Which destinations are in here ──
 *
 * The set was chosen to match the destinations a competitor offers a free
 * arrival-card flow for, because that was the brief. That decision is theirs
 * and could change tomorrow, so it is recorded here as provenance rather than
 * left to look like a fact about the world: see PROVENANCE below.
 *
 * What is NOT taken from them is any of the data. Each entry's scheme name,
 * official URL, submission window and field list were checked against the
 * immigration service's own site, which is also why the applicant can always
 * be handed the government page instead of ours.
 *
 * ── STATUS ──
 *
 * Arrival-card rules move: Thailand's became mandatory in 2025, and schemes
 * are added and withdrawn with little notice. So the status travels with the
 * data, exactly as it does for the service fee in `pricingConfig.ts`.
 * `unverified` entries are inert: `arrivalCardFor` returns nothing for them,
 * no flow appears, and no claim is made. This is the same shape of mistake the
 * fee flag exists to prevent, in a place where being wrong costs somebody
 * entry to a country.
 *
 * ── What the flow may and may not say ──
 *
 * Abizon does not file these. There is no API to submit an arrival card on
 * somebody's behalf, and none of these services offers one. The flow collects
 * the details, reads the passport, and hands the traveller to the official
 * page. Nothing here should ever be worded as though we submitted it.
 */

/** When the entry was last checked against the official URL below. */
export const ARRIVAL_CARDS_CHECKED_ON = "2026-08-22";

/**
 * PROVENANCE.
 *
 * The destination list mirrors the countries carrying a free arrival-card
 * offer on atlys.com/en-IN as measured on the date above, by loading each of
 * their 120 destination pages and testing for the offer. Recorded so that the
 * next person to touch this knows the list is an editorial decision copied
 * from a competitor rather than a property of the world, and re-measures it
 * instead of trusting it.
 */
export const ARRIVAL_CARD_LIST_SOURCE =
  "Destinations offering a free arrival-card flow on atlys.com/en-IN, measured 2026-08-22.";

export type ArrivalCardStatus = "verified" | "unverified";

/**
 * The fields these forms ask for. A closed union rather than free strings:
 * every one has to map to something the form can render and the validator
 * knows how to check, and a typo in a country's field list should not
 * silently produce a field nobody can fill.
 */
export type ArrivalCardFieldKey =
  | "firstName"
  | "lastName"
  | "dateOfBirth"
  | "gender"
  | "maritalStatus"
  | "nationality"
  | "passportNumber"
  | "passportIssuedOn"
  | "passportValidTill"
  | "passportPlaceOfIssue";

export type ArrivalCardField = {
  key: ArrivalCardFieldKey;
  /** Set as a small tracked uppercase line above the value. */
  label: string;
  placeholder: string;
  kind: "text" | "date" | "select";
  required: boolean;
  /** For `select` only. */
  options?: readonly string[];
  /** Lay the field across both columns on desktop. */
  wide?: boolean;
};

export type ArrivalCardFaq = { question: string; answer: string };

export type ArrivalCard = {
  /** The scheme's own name, as its government uses it. */
  scheme: string;
  /** The acronym travellers will see at the airport, where there is one. */
  abbreviation?: string;
  /**
   * What to call the thing in a sentence — "arrival card", "traveller
   * declaration", "entry form". Several of these schemes are not called an
   * arrival card by the service that runs them, and the headline should say
   * what the traveller will actually be filling in.
   */
  noun: string;
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
  /**
   * The fields this destination's form asks for, in the order they are shown.
   * Defaults to `DEFAULT_ARRIVAL_CARD_FIELDS`; a destination that wants
   * something different states the whole list.
   */
  fields?: readonly ArrivalCardField[];
  /** Shown behind the FAQ control. The button is hidden when there are none. */
  faqs?: readonly ArrivalCardFaq[];
  status: ArrivalCardStatus;
};

/* -------------------------------------------------------------------------- */
/* The default form                                                           */
/* -------------------------------------------------------------------------- */

const GENDERS = ["Male", "Female", "Other"] as const;
const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"] as const;

/**
 * The fields every one of these schemes asks for, which is why they are the
 * default rather than repeated per destination.
 *
 * `required` is the scheme's own requirement, not a guess: a field marked
 * required here is one the government form will not submit without. Anything
 * a destination merely offers is optional, and shows no asterisk.
 */
export const DEFAULT_ARRIVAL_CARD_FIELDS: readonly ArrivalCardField[] = [
  {
    key: "firstName",
    label: "First name",
    placeholder: "First name",
    kind: "text",
    required: true,
  },
  {
    key: "lastName",
    label: "Last name",
    placeholder: "Last name",
    kind: "text",
    required: true,
  },
  {
    key: "dateOfBirth",
    label: "Date of birth",
    placeholder: "dd/mm/yyyy",
    kind: "date",
    required: true,
  },
  {
    key: "gender",
    label: "Gender",
    placeholder: "Select gender",
    kind: "select",
    required: false,
    options: GENDERS,
  },
  {
    key: "maritalStatus",
    label: "Marital status",
    placeholder: "Select marital status",
    kind: "select",
    required: false,
    options: MARITAL_STATUSES,
  },
  {
    key: "passportNumber",
    label: "Passport number",
    placeholder: "Passport number",
    kind: "text",
    required: true,
  },
  {
    key: "passportIssuedOn",
    label: "Passport issued on",
    placeholder: "dd/mm/yyyy",
    kind: "date",
    required: true,
  },
  {
    key: "passportValidTill",
    label: "Passport valid till",
    placeholder: "dd/mm/yyyy",
    kind: "date",
    required: true,
  },
  {
    key: "passportPlaceOfIssue",
    label: "Passport place of issue",
    placeholder: "City of issue",
    kind: "text",
    required: true,
    wide: true,
  },
];

/** The fields a destination's form actually asks for. */
export function arrivalCardFields(card: ArrivalCard): readonly ArrivalCardField[] {
  return card.fields ?? DEFAULT_ARRIVAL_CARD_FIELDS;
}

/* -------------------------------------------------------------------------- */
/* Shared FAQ copy                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Built per destination from that destination's own facts, so the answers are
 * about the scheme in front of the traveller rather than arrival cards in
 * general. Nothing here describes anything Abizon does not do.
 */
function standardFaqs(card: Omit<ArrivalCard, "faqs" | "status">): ArrivalCardFaq[] {
  const name = card.abbreviation ? `${card.scheme} (${card.abbreviation})` : card.scheme;
  const host = new URL(card.officialUrl).hostname;

  const faqs: ArrivalCardFaq[] = [
    {
      question: `What is the ${name}?`,
      answer:
        `It is the ${card.noun} run by the destination's own immigration service. ` +
        `It ${card.mandatory ? "is required for" : "is available to"} travellers entering the country, ` +
        `and it is not a visa — you may still need one of those as well.`,
    },
    {
      question: "Does it cost anything?",
      answer:
        card.free
          ? `No. The ${card.noun} is free on the government's own site at ${host}. ` +
            `Anyone charging you for it is charging for the typing, and that includes us — ` +
            `abizon does not take a fee for this form.`
          : `The destination charges for this one. The fee is payable on ${host}.`,
    },
    {
      question: "Does abizon submit it for me?",
      answer:
        `No, and no one can — the immigration service has no way for a third party to file it. ` +
        `This page gets your details together and checks the passport reads correctly, then hands you ` +
        `to ${host} to submit it yourself. Nothing you type here is sent anywhere.`,
    },
  ];

  if (card.submitWithinDaysOfArrival !== undefined) {
    faqs.push({
      question: "When should I submit it?",
      answer:
        `Within ${card.submitWithinDaysOfArrival} ${card.submitWithinDaysOfArrival === 1 ? "day" : "days"} ` +
        `of arriving. Filing earlier than the window is the most common way this gets rejected, ` +
        `so fill it in whenever you like and submit it inside the window.`,
    });
  }

  faqs.push({
    question: "What happens to my passport photo?",
    answer:
      "It is read in your own browser and never uploaded. The machine-readable strip at the bottom " +
      "of the photo page is decoded on your device, the check digits are verified, and the image is " +
      "discarded when you leave the page. It is not stored, logged or sent to us.",
  });

  return faqs;
}

/* -------------------------------------------------------------------------- */
/* The table                                                                  */
/* -------------------------------------------------------------------------- */

type ArrivalCardEntry = Omit<ArrivalCard, "faqs"> & { faqs?: readonly ArrivalCardFaq[] };

function entry(card: ArrivalCardEntry): ArrivalCard {
  return { ...card, faqs: card.faqs ?? standardFaqs(card) };
}

/**
 * Keyed by the same slug `getCountrySlug` produces.
 *
 * `verified` means somebody opened the official URL, confirmed the scheme
 * exists under that name, and checked the window and the fee. Re-check on the
 * date above.
 */
export const ARRIVAL_CARDS: Record<string, ArrivalCard> = {
  "sri-lanka": entry({
    // Sri Lanka's is an ETA rather than a landing card: one online form, no
    // fee for Indian passport holders since the February 2026 waiver, and it
    // is what a traveller presents on arrival. Named for what it is.
    scheme: "Electronic Travel Authorisation",
    abbreviation: "ETA",
    noun: "travel authorisation",
    officialUrl: "https://eta.gov.lk",
    free: true,
    mandatory: true,
    status: "verified",
  }),
  thailand: entry({
    scheme: "Thailand Digital Arrival Card",
    abbreviation: "TDAC",
    noun: "arrival card",
    officialUrl: "https://tdac.immigration.go.th",
    submitWithinDaysOfArrival: 3,
    free: true,
    mandatory: true,
    status: "verified",
  }),
  malaysia: entry({
    scheme: "Malaysia Digital Arrival Card",
    abbreviation: "MDAC",
    noun: "arrival card",
    officialUrl: "https://imigresen-online.imi.gov.my/mdac/main",
    submitWithinDaysOfArrival: 3,
    free: true,
    mandatory: true,
    status: "verified",
  }),
  maldives: entry({
    scheme: "Maldives Traveller Declaration",
    abbreviation: "IMUGA",
    noun: "traveller declaration",
    officialUrl: "https://imuga.immigration.gov.mv/traveller",
    // The service states 96 hours before arrival, which is 4 days.
    submitWithinDaysOfArrival: 4,
    free: true,
    mandatory: true,
    status: "verified",
  }),
  mauritius: entry({
    scheme: "Mauritius All-in-One Travel Digital Form",
    noun: "travel form",
    officialUrl: "https://safemauritius.govmu.org",
    // The service states 72 hours before arrival.
    submitWithinDaysOfArrival: 3,
    free: true,
    mandatory: true,
    status: "verified",
  }),

  /* --- Schemes that exist, but are not part of the brief ---------------- */

  /*
   * These four operate real free arrival-card schemes and were in this table
   * before Phase 9. They are held `unverified` — inert, no route, no CTA —
   * because the brief was to light up the destinations a competitor offers
   * this for, and these are not among them. Nothing about them is wrong; they
   * simply have not been checked to the standard above, and shipping a flow
   * for a scheme nobody re-read is how a traveller gets told the wrong window.
   */
  singapore: entry({
    scheme: "Singapore Arrival Card",
    abbreviation: "SGAC",
    noun: "arrival card",
    officialUrl: "https://eservices.ica.gov.sg/sgarrivalcard",
    submitWithinDaysOfArrival: 3,
    free: true,
    mandatory: true,
    status: "unverified",
  }),
  philippines: entry({
    scheme: "eTravel",
    noun: "arrival card",
    officialUrl: "https://etravel.gov.ph",
    submitWithinDaysOfArrival: 3,
    free: true,
    mandatory: true,
    status: "unverified",
  }),
  cambodia: entry({
    scheme: "Cambodia e-Arrival",
    noun: "arrival card",
    officialUrl: "https://arrival.gov.kh",
    submitWithinDaysOfArrival: 7,
    free: true,
    mandatory: true,
    status: "unverified",
  }),
};

/**
 * The card for a destination, or nothing.
 *
 * Returns `undefined` for an unverified entry as well as an absent one, so a
 * caller cannot accidentally render an unchecked claim by forgetting to look
 * at the status. There is deliberately no way to ask for one regardless.
 */
export function arrivalCardFor(slug: string): ArrivalCard | undefined {
  const card = ARRIVAL_CARDS[slug];
  if (!card || card.status !== "verified") return undefined;
  return card;
}

/** Every destination whose flow is live, in a stable order. */
export function arrivalCardSlugs(): string[] {
  return Object.entries(ARRIVAL_CARDS)
    .filter(([, card]) => card.status === "verified")
    .map(([slug]) => slug)
    .sort();
}

/** Every destination that would light up once its entry is confirmed. */
export function pendingArrivalCardSlugs(): string[] {
  return Object.entries(ARRIVAL_CARDS)
    .filter(([, card]) => card.status === "unverified")
    .map(([slug]) => slug)
    .sort();
}
