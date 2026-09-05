/**
 * REQUIRED DOCUMENTS — THE SINGLE SOURCE OF TRUTH
 * ---------------------------------------------------------------------------
 * Before this file there were three answers to "what does this country ask
 * for", and they disagreed:
 *
 *   `VisaRequirements.requirementsFor()`     passport / photograph, with copy
 *   `CountryApplicationPanel.documentList()` the same split, as bare strings
 *   `app/apply/page.tsx`                     "Photo" AND "Passport", hardcoded
 *                                            for all 154 destinations
 *
 * The third one is the reason this exists. The application flow asked every
 * applicant for a face photograph and a passport scan regardless of
 * destination, while the country page one click earlier told them — correctly,
 * from `country.documents` — that Dubai needs the passport alone. A flow that
 * contradicts the page that fed it is not a data problem, it is a source-of-
 * truth problem.
 *
 * `country.documents` has exactly three values, so this module has exactly
 * three answers and invents nothing. Copy lives here so the requirements
 * section, the application panel and the application flow cannot drift apart
 * again; icons stay in the components, because those are a presentation choice.
 */

import type { Country } from "@/data/countries";

/**
 * Stable key. Used in state maps and as a React key — never displayed.
 *
 * `passportBack` is a client-only member and deliberately so. The reference
 * flow asks for the passport's back page straight after the photo page ("Now
 * flip to the back page"), and this flow does too — but `document_kind` in the
 * database is a Postgres enum with two values, so there is nowhere on the
 * server to put a third. Until that enum gains a value, the back page is held
 * in the tab like every document was before the backend existed: shown on the
 * review screen beside the photo page, and gone when the tab closes.
 *
 * Two consequences, both intentional:
 *
 *   - It is NOT returned by `requiredDocuments`, so it gates nothing. A step
 *     cannot be blocked by a document that cannot be stored.
 *   - `sync.ts` iterates a literal `["passport", "photograph"]`, so it is never
 *     queued for upload. Nothing needs to know to skip it.
 */
export type DocumentKind =
  | "passport"
  | "passportBack"
  | "photograph"
  | "panCard"
  | "returnTicket"
  | "hotelStay";

/**
 * The kinds the server has somewhere to put.
 *
 * `document_kind` is a Postgres enum, and it has two values. Naming the subset
 * here means the sync layer's signatures say which kinds they can actually
 * handle, so a back page cannot be passed to an upload that has no column to
 * write it to — the compiler stops it rather than the database.
 */
export type StoredDocumentKind = Exclude<DocumentKind, "passportBack">;

export const STORED_DOCUMENT_KINDS: readonly StoredDocumentKind[] = [
  "passport",
  "photograph",
  "panCard",
  "returnTicket",
  "hotelStay",
];

/**
 * How a document can be supplied.
 *
 * `capture: "camera"` marks the ones a live capture makes sense for. Phase 5D
 * owns the capture implementation; this field is what tells it which documents
 * to offer it on, so the flow does not have to name specific documents.
 */
export type DocumentCapture = "upload" | "camera" | "either";

/**
 * WHO A DOCUMENT IS ASKED OF.
 *
 *   traveller  one per person. Two people travelling together supply two
 *              passports, and neither can use the other's.
 *   party      one per application. A PAN card, a return booking and a hotel
 *              reservation describe the TRIP, not a traveller — a family of
 *              four does not hold four hotel bookings, and asking for four
 *              would be asking three of them to upload the same PDF again.
 *
 * The distinction is not cosmetic: it is what makes "the PAN card of one of
 * the main family members" expressible. Party documents render on the lead
 * traveller's card (the first in the party) and are keyed under that
 * traveller, so they are supplied once, count once towards completion, and
 * attach to a real person on the server rather than to a phantom row.
 *
 * The consequence, and it is the right one: removing the lead traveller takes
 * the party documents with them. If the PAN holder is no longer on the
 * application, their PAN is no longer the one to file.
 */
export type DocumentScope = "traveller" | "party";

export type DocumentRequirement = {
  kind: DocumentKind;
  /** Full label. Used in the requirements section and the review summary. */
  label: string;
  /** Compact label for buttons and per-traveller cards. */
  shortLabel: string;
  detail: string;
  capture: DocumentCapture;
  scope: DocumentScope;
  /**
   * Shown under the row on the traveller card when `scope` is `"party"`, so a
   * family does not sit waiting for three more upload buttons that are never
   * going to appear on the other cards.
   */
  sharedNote?: string;
};

const PASSPORT: DocumentRequirement = {
  kind: "passport",
  label: "Passport front page",
  shortLabel: "Passport",
  detail:
    "A clear scan or photo of the page carrying your details. Must be valid for at least six months beyond your travel date.",
  capture: "either",
  scope: "traveller",
};

const PHOTOGRAPH: DocumentRequirement = {
  kind: "photograph",
  label: "Passport-size photograph",
  shortLabel: "Photo",
  detail:
    "Plain light background, face square to the camera, no headwear or tinted glasses. You can take this in the application.",
  capture: "either",
  scope: "traveller",
};

/**
 * The passport's back page.
 *
 * Not part of `requiredDocuments` — see the note on `DocumentKind`. It is
 * exported on its own because exactly one caller wants it: the passport
 * capture, which walks photo page → back page → review.
 */
export const PASSPORT_BACK: DocumentRequirement = {
  kind: "passportBack",
  label: "Passport back page",
  shortLabel: "Back page",
  detail:
    "The page carrying your address and the details of your parents or guardian.",
  capture: "either",
  scope: "traveller",
};

/* -------------------------------------------------------------------------- */
/* The party documents                                                        */
/* -------------------------------------------------------------------------- */

/**
 * PAN CARD, RETURN TICKET, HOTEL BOOKING.
 *
 * ── Why these are not keyed off `country.documents` ──
 *
 * `country.documents` answers one question: what does the DESTINATION'S
 * consulate ask an Indian passport holder for. These three are not that. They
 * are what Abizon must hold to file an application on somebody's behalf at
 * all — identity for the payment (PAN), and the two things every consulate on
 * earth treats as the difference between a visitor and an intending migrant:
 * a booked way home, and a booked place to sleep.
 *
 * So they are constant across the catalogue, including the destinations the
 * dataset marks "No Documents Required". That row was never a claim that the
 * application needs nothing — it is a claim about the destination — and the
 * requirements section is written to say which is which rather than leaving a
 * visa-free destination reading as a contradiction.
 *
 * ── Why they are `party` and not `traveller` ──
 *
 * See `DocumentScope`. Four people on one trip hold one hotel booking, one
 * return itinerary, and — for the purposes of who is paying — one PAN. Asking
 * each of them for their own would be asking three people to upload the same
 * file, and in the PAN's case would ask a child travelling with their parents
 * for a document they do not have.
 *
 * ── Why images and not PDFs ──
 *
 * `lib/storage/limits.ts` accepts JPEG, PNG and WebP and nothing else, because
 * every upload is re-encoded through `sharp` to strip EXIF and there is no PDF
 * engine in this project. A ticket and a hotel voucher are the two documents an
 * applicant is most likely to hold as a PDF, so the copy below says
 * "screenshot" rather than leaving them to discover the restriction in the file
 * picker.
 */
const PAN_CARD: DocumentRequirement = {
  kind: "panCard",
  label: "PAN card",
  shortLabel: "PAN Card",
  detail:
    "A photo of the card itself, with the number and the name readable. One card covers the whole party — use the PAN of whoever is paying for the trip.",
  capture: "upload",
  scope: "party",
  sharedNote: "Covers everyone on this application",
};

const RETURN_TICKET: DocumentRequirement = {
  kind: "returnTicket",
  label: "Return ticket",
  shortLabel: "Return Ticket",
  detail:
    "The confirmed onward or return flight, showing the date and every passenger's name. A screenshot of the airline's confirmation is fine.",
  capture: "upload",
  scope: "party",
  sharedNote: "Covers everyone on this application",
};

const HOTEL_STAY: DocumentRequirement = {
  kind: "hotelStay",
  label: "Hotel stay",
  shortLabel: "Hotel Stay",
  detail:
    "A confirmed booking covering the whole trip, showing the address and the dates. A screenshot of the reservation is fine.",
  capture: "upload",
  scope: "party",
  sharedNote: "Covers everyone on this application",
};

/**
 * Asked of every application, whatever the destination. Ordered easiest-first:
 * the PAN is in a wallet, the other two are in an inbox.
 */
const PARTY_DOCUMENTS: readonly DocumentRequirement[] = [
  PAN_CARD,
  RETURN_TICKET,
  HOTEL_STAY,
];

/* -------------------------------------------------------------------------- */

/**
 * Everything an application must supply, destination-specific first.
 *
 * There is deliberately no "optional" or "conditional" tier: the dataset does
 * not distinguish them, and inventing the distinction would mislead a
 * traveller who reads "optional" and skips a document. Everything returned
 * here is required.
 */
export function requiredDocuments(
  documents: Country["documents"],
): DocumentRequirement[] {
  return [...destinationDocuments(documents), ...PARTY_DOCUMENTS];
}

/**
 * The destination's half, on its own.
 *
 * Split out because the requirements section shows the two groups under
 * separate headings — "what {country} asks for" against "what we need to file
 * for you" — and a visa-free destination has an empty first group and a full
 * second one. Collapsing them into one list is what would make that page read
 * as though Japan and Nepal ask for the same things.
 */
export function destinationDocuments(
  documents: Country["documents"],
): DocumentRequirement[] {
  switch (documents) {
    case "Photo + Passport":
      /**
       * PASSPORT FIRST, FACE LAST.
       *
       * The field names the photo first and the first build followed it, which
       * put the live face capture — a camera permission prompt, a countdown and
       * a framing heuristic — in front of an applicant who had so far typed one
       * name. It is the heaviest ask in the flow and it was the opening one.
       *
       * The order here also decides the order the capture screens chain in, so
       * flipping it makes the passport errand (upload → scan → back page → scan
       * → review) run first and lands the face scan at the end, as the last
       * thing between the applicant and checkout. Everything the face capture
       * needs — the camera, both hands, the applicant's attention — is
       * available then and was not at the start.
       */
      return [PASSPORT, PHOTOGRAPH];
    case "Passport Only":
      return [PASSPORT];
    case "No Documents Required":
      return [];
    default:
      return [];
  }
}

/** The application-wide half, on its own. Same list for every destination. */
export function partyDocuments(): DocumentRequirement[] {
  return [...PARTY_DOCUMENTS];
}

/** Convenience for callers that only need the labels (the application panel). */
export function requiredDocumentLabels(
  documents: Country["documents"],
): string[] {
  return requiredDocuments(documents).map((requirement) => requirement.label);
}
