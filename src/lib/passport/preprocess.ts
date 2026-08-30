"use client";

/**
 * GETTING AN IMAGE INTO A STATE TESSERACT CAN READ
 * ---------------------------------------------------------------------------
 * The scan used to hand the raw photograph straight to the engine, whole. That
 * is the second reason autofill never fired, and it is the bigger one.
 *
 * ── What was wrong with feeding it the whole page ──
 *
 * A passport data page photographed on a phone is perhaps 3000px wide, and the
 * machine-readable zone is a 40px-tall strip across the bottom of it. Handing
 * the engine the whole page means:
 *
 *   - it spends its effort on the printed fields, the portrait, the security
 *     pattern and the emblem, none of which anybody wants read;
 *   - the character whitelist (`A-Z 0-9 <`) is applied to ALL of that, so every
 *     piece of printed text comes back as garbage in the MRZ alphabet, and the
 *     line-finder has fifty plausible-looking wrong answers to sift;
 *   - `tessedit_pageseg_mode: 6` — "one uniform block of text" — is simply
 *     false about a passport page, so the layout analysis it disables was the
 *     thing that might have found the zone.
 *
 * Cropping to the bottom third makes mode 6 true, removes the competing text
 * entirely, and lets the whitelist do what it is for.
 *
 * ── And why it is upscaled ──
 *
 * Tesseract wants roughly 30px of glyph height. A phone photo of a whole
 * passport puts OCR-B at 20-25px, and a photo taken a little far back at 12.
 * Scaling the crop to ~2000px wide is the single change that moves most reads
 * from "no zone found" to "found, check digits pass".
 *
 * Grayscale and a contrast stretch follow for the same reason: OCR-B is a
 * high-contrast face printed on a patterned, tinted security background, and
 * normalising the luminance separates the ink from the pattern.
 *
 * Everything here runs on a canvas in the applicant's own browser. The
 * photograph still never leaves the device.
 */

export type PreparedImage = {
  /** PNG, ready for the engine. */
  blob: Blob;
  /** Where this crop sits in the original, as fractions of it. */
  region: { x: number; y: number; width: number; height: number };
  /** Pixel size of the prepared image. */
  width: number;
  height: number;
};

/** What the engine wants a crop scaled to. Wider gains nothing and costs time. */
const TARGET_WIDTH = 2000;
const MAX_HEIGHT = 2600;
/** Wide enough that the glyphs are already big; scaling would only soften. */
const ALREADY_SHARP_WIDTH = 1500;

async function decode(blob: Blob): Promise<ImageBitmap> {
  return createImageBitmap(blob);
}

function makeCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function toBlob(
  canvas: OffscreenCanvas | HTMLCanvasElement,
): Promise<Blob> {
  if ("convertToBlob" in canvas) {
    return canvas.convertToBlob({ type: "image/png" });
  }
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas produced no blob"))),
      "image/png",
    );
  });
}

/**
 * Grayscale, then stretch the histogram between its 5th and 95th percentiles.
 *
 * Percentiles rather than the true min and max, because one specular highlight
 * off a laminate — which every phone photograph of a passport has — pins the
 * maximum at 255 and the stretch does nothing. Clipping the tails throws that
 * highlight away and spreads the range the text actually occupies.
 */
function normalise(data: ImageData): ImageData {
  const pixels = data.data;
  const histogram = new Uint32Array(256);

  for (let index = 0; index < pixels.length; index += 4) {
    const luma =
      (pixels[index]! * 299 + pixels[index + 1]! * 587 + pixels[index + 2]! * 114) /
      1000;
    const value = luma | 0;
    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
    histogram[value]! += 1;
  }

  const total = pixels.length / 4;
  const lowTarget = total * 0.05;
  const highTarget = total * 0.95;

  let low = 0;
  let high = 255;
  let running = 0;
  for (let value = 0; value < 256; value += 1) {
    running += histogram[value]!;
    if (running >= lowTarget) {
      low = value;
      break;
    }
  }
  running = 0;
  for (let value = 255; value >= 0; value -= 1) {
    running += histogram[value]!;
    if (running >= total - highTarget) {
      high = value;
      break;
    }
  }

  const span = Math.max(1, high - low);
  const lookup = new Uint8Array(256);
  for (let value = 0; value < 256; value += 1) {
    lookup[value] = Math.max(0, Math.min(255, ((value - low) / span) * 255));
  }

  for (let index = 0; index < pixels.length; index += 4) {
    const value = lookup[pixels[index]!]!;
    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
  }

  return data;
}

/**
 * Crop, scale and normalise.
 *
 * `region` is in fractions of the source so callers can say "the bottom third"
 * without knowing the pixel size, and so the result can be mapped back onto the
 * original for drawing.
 */
export async function prepare(
  source: Blob | ImageBitmap,
  region: { x: number; y: number; width: number; height: number } = {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  },
): Promise<PreparedImage> {
  const bitmap = source instanceof Blob ? await decode(source) : source;

  const sx = Math.round(region.x * bitmap.width);
  const sy = Math.round(region.y * bitmap.height);
  const sw = Math.max(1, Math.round(region.width * bitmap.width));
  const sh = Math.max(1, Math.round(region.height * bitmap.height));

  /**
   * Scale up a small crop; leave a large one alone.
   *
   * Upscaling exists to get OCR-B to the ~30px of glyph height the engine wants,
   * and it is the single most effective change here on a photograph taken a
   * little far back. It is also actively harmful once the source is already
   * sharp: interpolating a crisp 1600px crop up to 2000 softens every edge the
   * engine is looking for, and measurably degraded the read on a clean image.
   *
   * So there is a floor, not a target: below it, scale up to the target; above
   * it, do nothing.
   */
  const scale =
    sw >= ALREADY_SHARP_WIDTH
      ? 1
      : Math.min(Math.max(1, TARGET_WIDTH / sw), MAX_HEIGHT / Math.max(1, sh));
  const width = Math.max(1, Math.round(sw * scale));
  const height = Math.max(1, Math.round(sh * scale));

  const canvas = makeCanvas(width, height);
  const context = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!context) throw new Error("no 2d context");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);

  try {
    const data = context.getImageData(0, 0, width, height);
    context.putImageData(normalise(data), 0, 0);
  } catch {
    // A tainted canvas cannot be read back. Every path here uses a Blob the
    // page itself produced, so this should not happen — but an unreadable
    // canvas is a reason to skip the contrast pass, not to fail the scan.
  }

  if (source instanceof Blob) bitmap.close();

  return { blob: await toBlob(canvas), region, width, height };
}

/** Decoded once and shared by both attempts, so a 4MB JPEG is parsed once. */
export async function decodeOnce(blob: Blob): Promise<ImageBitmap> {
  return decode(blob);
}
