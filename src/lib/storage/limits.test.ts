import { describe, expect, it } from "vitest";

import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  ACCEPTED_UPLOAD_TYPES,
  isAcceptedUploadType,
  MAX_UPLOAD_BYTES,
  validateUpload,
} from "./limits";

/**
 * These exist because the client and the server disagreed, and the disagreement
 * produced the worst available outcome: an applicant chose a PDF of their
 * passport, the uploader said it was fine, and the server rejected it after the
 * file had been sent — with a message about image formats, on a screen that had
 * just offered PDF.
 */

describe("validateUpload", () => {
  it("accepts the three formats sharp can normalise", () => {
    for (const type of ACCEPTED_UPLOAD_TYPES) {
      expect(validateUpload({ type, size: 1024 })).toBeUndefined();
    }
  });

  it("rejects PDFs, and says what to do instead", () => {
    // There is no PDF engine in this project, so a PDF cannot have its EXIF
    // stripped, cannot be re-encoded, and cannot be checked for legibility.
    const message = validateUpload({ type: "application/pdf", size: 1024 });
    expect(message).toBeDefined();
    expect(message).toMatch(/JPG, PNG or WebP/);
  });

  it("rejects HEIC rather than accepting a file that fails at normalisation", () => {
    expect(validateUpload({ type: "image/heic", size: 1024 })).toBeDefined();
  });

  it("rejects a file over the limit and names the size in the message", () => {
    const message = validateUpload({ type: "image/jpeg", size: MAX_UPLOAD_BYTES + 1 });
    expect(message).toBeDefined();
    expect(message).toMatch(/15\.0 MB/);
  });

  it("accepts a file exactly on the limit", () => {
    expect(validateUpload({ type: "image/jpeg", size: MAX_UPLOAD_BYTES })).toBeUndefined();
  });
});

describe("the accept attribute", () => {
  it("offers an extension for every accepted type", () => {
    // Some Android pickers ignore the MIME list entirely and read extensions,
    // so the two lists have to agree or the picker greys out valid files.
    const extensions = ACCEPTED_UPLOAD_EXTENSIONS.split(",");

    expect(extensions).toContain(".jpg");
    expect(extensions).toContain(".png");
    expect(extensions).toContain(".webp");

    for (const type of ACCEPTED_UPLOAD_TYPES) {
      const suffix = type.replace("image/", "");
      expect(
        extensions.some((extension) => extension.includes(suffix.slice(0, 3))),
      ).toBe(true);
    }
  });

  it("narrows the type", () => {
    expect(isAcceptedUploadType("image/jpeg")).toBe(true);
    expect(isAcceptedUploadType("application/pdf")).toBe(false);
  });
});
