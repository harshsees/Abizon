/**
 * UPLOAD LIMITS — the one definition, shared by both sides.
 * ---------------------------------------------------------------------------
 * Deliberately NOT `server-only`, unlike everything else in this folder, and
 * deliberately not duplicated into the uploader component.
 *
 * Before this file the two halves disagreed. `DocumentUploader` accepted PDFs
 * up to 5MB; the server accepts JPEG, PNG and WebP up to 15MB. Both numbers
 * were defensible on their own and together they produced the worst outcome
 * available: an applicant chose a PDF of their passport, the client said it was
 * fine, and the upload failed on the server after the file had been sent —
 * with an error about image formats, on a screen that had just told them PDF
 * was allowed.
 *
 * A client-side limit is a courtesy: it produces a readable message before a
 * 12MB upload rather than after it. The server's is the one that binds. They
 * only work together if they are the same numbers, so they are the same
 * constants.
 *
 * WHY NO PDF. The normaliser in `normalise.ts` re-encodes every upload through
 * `sharp`, which strips EXIF — a passport photographed at home otherwise
 * carries the applicant's home coordinates. There is no PDF engine in this
 * project (`lib/application/passport.ts` says the same about OCR), so a PDF
 * cannot be normalised, cannot have its metadata stripped, and cannot be
 * checked for legibility. Accepting one would mean storing a file we have not
 * looked at.
 */

/** 15MB. Beyond this a phone camera is not producing a better passport scan —
 *  it is producing a slower upload on a connection that may be a train. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const ACCEPTED_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** For the file input's `accept`. Extensions rather than MIME types because
 *  some Android pickers ignore the MIME list entirely. */
export const ACCEPTED_UPLOAD_EXTENSIONS = ".jpg,.jpeg,.png,.webp";

/**
 * The same list again, in the words an applicant reads.
 *
 * This module exists because the client and the server disagreed about PDFs —
 * and the copy disagreed too, in a third place nobody thought of as code.
 * `PassportCapture` offered "JPG, PNG or PDF" on the card that opens the file
 * picker, months after PDF was removed, so an applicant was invited to choose a
 * file the picker then greyed out. Two constants and one sentence, and the
 * sentence was the one that reached the person.
 *
 * Derived rather than written, so a format added above cannot leave the copy
 * behind a fourth time.
 */
const TYPE_LABELS: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

export const ACCEPTED_UPLOAD_LABEL = ((): string => {
  const names = ACCEPTED_UPLOAD_TYPES.map((type) => TYPE_LABELS[type] ?? type);
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
})();

export type AcceptedUploadType = (typeof ACCEPTED_UPLOAD_TYPES)[number];

export function isAcceptedUploadType(type: string): type is AcceptedUploadType {
  return (ACCEPTED_UPLOAD_TYPES as readonly string[]).includes(type);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The single validation both sides run. Returns a message written for the
 * applicant, or `undefined`.
 */
export function validateUpload(file: { type: string; size: number }): string | undefined {
  if (!isAcceptedUploadType(file.type)) {
    return "That file type is not accepted. Use a JPG, PNG or WebP image — a photograph of the page is fine.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `That file is ${formatBytes(file.size)}. The limit is ${formatBytes(
      MAX_UPLOAD_BYTES,
    )} — try photographing the page instead of scanning it.`;
  }

  return undefined;
}
