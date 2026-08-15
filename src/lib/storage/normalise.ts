import "server-only";

import { createHash } from "node:crypto";

import sharp from "sharp";

/**
 * NORMALISATION — what happens between "uploaded" and "stored".
 * ---------------------------------------------------------------------------
 * THE ONE THAT MATTERS: **EXIF is stripped.** A photograph taken on a phone
 * carries the coordinates where it was taken, the device, and the exact second.
 * A passport data page photographed at home is therefore a document containing
 * both a passport number and the applicant's home address, and we would have
 * created that document ourselves by storing the file as uploaded. `sharp`
 * drops all metadata unless explicitly asked to keep it, and we do not ask.
 *
 * THE OTHERS, in order of how likely they are to bite:
 *
 *   - **Re-encoding.** The output is bytes this process produced from a decoded
 *     pixel buffer. A file that was a polyglot — valid JPEG and valid something
 *     else — is not one afterwards. This is not virus scanning and is not a
 *     substitute for it (see the note at the end), but it does mean the thing
 *     an ops person opens is an image we made.
 *
 *   - **Declared type versus actual content.** `image/jpeg` in the upload
 *     header means the client said so. `sharp` reports what the bytes are, and
 *     a disagreement is a rejection.
 *
 *   - **Dimension cap.** A 108-megapixel phone photograph of a passport is not
 *     more legible than a 2400px one; it is a slower page and a bigger bill.
 *     The floor is the more important limit — below it, print is genuinely not
 *     resolvable, and `lib/application/passport.ts` already refuses those on the
 *     client for the same reason.
 *
 *   - **Decompression bombs.** A small file that decodes to something enormous
 *     is a way to exhaust a function's memory. `sharp`'s pixel limit rejects it
 *     during decode rather than after.
 */

/** 2400px on the long edge. Comfortably past what a consulate asks for, and
 *  small enough that an ops screen loads at once. */
const MAX_EDGE = 2400;

/** Mirrors `MIN_SHORT_EDGE` in `lib/application/passport.ts`. Both numbers come
 *  from the same place — 88mm at ~200dpi — and if one moves the other must. */
const MIN_SHORT_EDGE = 640;

/** 100 megapixels. Above this we are decoding an attack, not a passport. */
const MAX_PIXELS = 100_000_000;

export type NormaliseResult =
  | {
      ok: true;
      bytes: Buffer;
      contentType: "image/jpeg";
      width: number;
      height: number;
      checksum: string;
      /** What came off the original before it was discarded. Recorded in the
       *  audit metadata so "did this file carry location data" is answerable
       *  after the fact — without keeping the coordinates themselves. */
      hadExif: boolean;
    }
  | { ok: false; error: string };

export async function normaliseDocumentImage(input: Buffer): Promise<NormaliseResult> {
  try {
    const image = sharp(input, {
      limitInputPixels: MAX_PIXELS,
      // A truncated upload should fail here, loudly, rather than be stored as
      // half a passport scan that nobody notices until a consulate rejects it.
      failOn: "truncated",
    });

    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return { ok: false, error: "That file is not an image we can read." };
    }

    if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
      return {
        ok: false,
        error: "Upload a JPEG, PNG or WebP. Other formats cannot be processed.",
      };
    }

    const shortEdge = Math.min(metadata.width, metadata.height);
    if (shortEdge < MIN_SHORT_EDGE) {
      return {
        ok: false,
        error: `That image is too small to read — it needs to be at least ${MIN_SHORT_EDGE} pixels on its shorter side.`,
      };
    }

    const hadExif = Boolean(metadata.exif);

    const bytes = await image
      // Applies the EXIF orientation flag and then discards it. Without this,
      // stripping metadata turns a correctly-displayed portrait photograph into
      // a sideways one — the rotation lived only in the tag being removed.
      .rotate()
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        // Never scale a small image up. It adds bytes and no detail, and it
        // would defeat the minimum check above by making everything pass.
        withoutEnlargement: true,
      })
      // JPEG for everything. One output format means one code path in the ops
      // viewer and one content type in the signed URL. Quality 85 is where the
      // artefacts stop being visible on printed text.
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    const output = await sharp(bytes).metadata();

    return {
      ok: true,
      bytes,
      contentType: "image/jpeg",
      width: output.width ?? 0,
      height: output.height ?? 0,
      checksum: createHash("sha256").update(bytes).digest("hex"),
      hadExif,
    };
  } catch (error) {
    // `sharp` throws on unreadable input, on the pixel limit, and on truncation.
    // All three mean the same thing to the applicant.
    console.error("[normalise] failed", error);
    return {
      ok: false,
      error: "We could not process that image. Try taking the photograph again.",
    };
  }
}

/**
 * NOT DONE HERE, AND SAID OUT LOUD: malware scanning.
 *
 * Re-encoding through `sharp` means the stored file is an image this process
 * generated, which defeats the polyglot and the malformed-header cases. It does
 * not defeat a file that is simply a working image *and* something else's
 * payload, and it does nothing about the general risk of an ops person
 * downloading applicant-supplied files onto a Windows laptop.
 *
 * The two real answers are a scanning step before the file reaches the console,
 * or a console that renders images in a sandboxed viewer and never offers a
 * download. The ops console in this repository does the second — see
 * `app/ops/applications/[id]`. If a download button is ever added, the first
 * becomes mandatory rather than advisable.
 */
