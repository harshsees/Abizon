"use client";

/**
 * PASSPORT IMAGE — WHAT CAN ACTUALLY BE CHECKED
 * ---------------------------------------------------------------------------
 * Phase 5D §14 and §15 draw a hard line: validate only what is technically
 * real, and do not invent an OCR pipeline.
 *
 * WHAT THIS PROJECT ACTUALLY HAS: nothing. There is no OCR, no MRZ reader, no
 * classifier and no dependency capable of any of them — the codebase's only
 * mentions of "MRZ" are marketing sentences on `/engineering`, `/careers`,
 * `/status` and `/bible` describing capability that does not exist in this
 * repository. Verified by grep across `src/` and against `package.json`.
 *
 * So this module checks three things, all of which are properties of the bytes
 * in hand and none of which are claims about the document:
 *
 *   1. the image decodes at all;
 *   2. it is large enough that the print could be legible;
 *   3. it is not a blank frame (a lens cap, a dark room, a covered camera).
 *
 * NOT checked, because nothing here can: name, passport number, date of birth,
 * expiry, nationality, MRZ, whether the document is genuine, whether it is a
 * passport at all, or whether it is the right person's.
 */

/** ISO/IEC 7810 ID-3 — the passport data page. 125 × 88 mm. */
export const PASSPORT_ASPECT = 125 / 88; // 1.4205

/**
 * Below this the data page's print stops being resolvable at all. Chosen
 * against the page's short edge: 88mm at ~200dpi ≈ 690px, so 640 is a
 * permissive floor rather than a quality bar.
 */
const MIN_SHORT_EDGE = 640;

export type ImageProblem =
  | { kind: "undecodable" }
  | { kind: "too-small"; shortEdge: number; minimum: number }
  | { kind: "blank" };

export type ImageCheck =
  | { ok: true; width: number; height: number }
  | { ok: false; problem: ImageProblem; message: string };

function describe(problem: ImageProblem): string {
  switch (problem.kind) {
    case "undecodable":
      return "That image could not be opened. Try again, or upload a different file.";
    case "too-small":
      return `That image is ${problem.shortEdge}px on its short edge, which is too small to read a passport page. Move closer, or upload a higher-resolution scan.`;
    case "blank":
      return "That frame came out blank — check the lens is not covered and there is enough light.";
  }
}

/**
 * Mean luminance and spread over a downsampled copy.
 *
 * A frame captured with the lens covered, or in the dark, is near-uniform. This
 * measures that directly rather than inferring it; it is a property of the
 * pixels, not a judgement about the document.
 */
function isBlank(image: HTMLImageElement): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;

  context.drawImage(image, 0, 0, 32, 32);
  const { data } = context.getImageData(0, 0, 32, 32);

  let sum = 0;
  const luma: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const value = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    luma.push(value);
    sum += value;
  }
  const mean = sum / luma.length;
  const variance =
    luma.reduce((total, value) => total + (value - mean) ** 2, 0) / luma.length;

  // Near-uniform in any brightness, or simply almost black.
  return Math.sqrt(variance) < 6 || mean < 12;
}

export function checkCapturedImage(dataUrl: string): Promise<ImageCheck> {
  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = image;
      const shortEdge = Math.min(width, height);

      if (shortEdge < MIN_SHORT_EDGE) {
        const problem: ImageProblem = {
          kind: "too-small",
          shortEdge,
          minimum: MIN_SHORT_EDGE,
        };
        resolve({ ok: false, problem, message: describe(problem) });
        return;
      }

      if (isBlank(image)) {
        const problem: ImageProblem = { kind: "blank" };
        resolve({ ok: false, problem, message: describe(problem) });
        return;
      }

      resolve({ ok: true, width, height });
    };

    image.onerror = () => {
      const problem: ImageProblem = { kind: "undecodable" };
      resolve({ ok: false, problem, message: describe(problem) });
    };

    image.src = dataUrl;
  });
}

/* -------------------------------------------------------------------------- */
/* The seam for a real reader                                                 */
/* -------------------------------------------------------------------------- */

export type PassportFields = {
  documentNumber: string;
  surname: string;
  givenNames: string;
  nationality: string;
  dateOfBirth: string;
  expiryDate: string;
  sex: string;
};

/**
 * `parsePassport` exists so that the day an MRZ reader is added, there is one
 * function to implement and one call site to satisfy — not so that anything
 * today can pretend to read a passport.
 *
 * It returns `{ available: false }`, always. That is not a stub that will be
 * forgotten: `ApplicantDetailsStep` does not call it, no field is prefilled
 * from it, and no UI anywhere says a document was read. If it ever returns
 * `{ available: true, fields }`, the fields must come from an actual reader
 * and must land in the form as EDITABLE values the applicant confirms — a
 * misread passport number that nobody checked is worse than a typed one.
 */
export type PassportParseResult =
  | { available: false; reason: "no-reader-configured" }
  | { available: true; fields: PassportFields; confidence: number };

export async function parsePassport(
  imageDataUrl: string,
): Promise<PassportParseResult> {
  // Referenced so the signature the real reader will need is not quietly
  // dropped, and so nothing here can be mistaken for a working implementation.
  void imageDataUrl;
  return { available: false, reason: "no-reader-configured" };
}
