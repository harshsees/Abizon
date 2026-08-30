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
export type DocumentKind = "passport" | "passportBack" | "photograph";

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
];

/**
 * How a document can be supplied.
 *
 * `capture: "camera"` marks the ones a live capture makes sense for. Phase 5D
 * owns the capture implementation; this field is what tells it which documents
 * to offer it on, so the flow does not have to name specific documents.
 */
export type DocumentCapture = "upload" | "camera" | "either";

export type DocumentRequirement = {
  kind: DocumentKind;
  /** Full label. Used in the requirements section and the review summary. */
  label: string;
  /** Compact label for buttons and per-traveller cards. */
  shortLabel: string;
  detail: string;
  capture: DocumentCapture;
};

const PASSPORT: DocumentRequirement = {
  kind: "passport",
  label: "Passport front page",
  shortLabel: "Passport",
  detail:
    "A clear scan or photo of the page carrying your details. Must be valid for at least six months beyond your travel date.",
  capture: "either",
};

const PHOTOGRAPH: DocumentRequirement = {
  kind: "photograph",
  label: "Passport-size photograph",
  shortLabel: "Photo",
  detail:
    "Plain light background, face square to the camera, no headwear or tinted glasses. You can take this in the application.",
  capture: "either",
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
};

/**
 * What a destination requires, from the one field that actually carries it.
 *
 * There is deliberately no "optional" or "conditional" tier: the dataset does
 * not distinguish them, and inventing the distinction would mislead a
 * traveller who reads "optional" and skips a document. Everything returned
 * here is required.
 */
export function requiredDocuments(
  documents: Country["documents"],
): DocumentRequirement[] {
  switch (documents) {
    case "Photo + Passport":
      // Photo first, which is the order the field itself names and the order
      // the reference asks in. It also decides the order the capture screens
      // chain in, and the photograph is the quicker of the two — finishing one
      // before starting the passport's four-screen errand.
      return [PHOTOGRAPH, PASSPORT];
    case "Passport Only":
      return [PASSPORT];
    case "No Documents Required":
      return [];
    default:
      return [];
  }
}

/** Convenience for callers that only need the labels (the application panel). */
export function requiredDocumentLabels(
  documents: Country["documents"],
): string[] {
  return requiredDocuments(documents).map((requirement) => requirement.label);
}
