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

/** Stable key. Used in state maps and as a React key — never displayed. */
export type DocumentKind = "passport" | "photograph";

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
      return [PASSPORT, PHOTOGRAPH];
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
