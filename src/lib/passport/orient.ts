"use client";

/**
 * GETTING A PHOTOGRAPH OF A DOCUMENT INTO THE SHAPE THE READER EXPECTS
 * ---------------------------------------------------------------------------
 * `preprocess.ts` crops to a region, scales it and stretches its contrast. It
 * assumes the image it is handed is a document, upright, filling the frame.
 * An upload is none of those things.
 *
 * What people actually upload is a passport lying on a table, photographed at
 * arm's length: the page occupies perhaps half the frame, the rest is
 * tablecloth; the phone was held in portrait so the page is on its side; and
 * the page is a few degrees off square because nobody lines a phone up with a
 * book. The machine-readable zone is a 40px band inside that, so all three
 * compound — and the scan reports "no zone found", which reads to the
 * applicant as "your passport is not good enough".
 *
 * This module fixes what can be fixed before the engine ever runs:
 *
 *   1. ORIENTATION FROM EXIF. A phone does not rotate the pixels when you turn
 *      it; it writes a tag and leaves them. Decoding without honouring that tag
 *      reads a sideways passport.
 *   2. CROP TO THE DOCUMENT. Find the page in the photograph and throw the
 *      table away. This is the change that matters most, because everything
 *      downstream measures itself in fractions of the image: "the bottom third"
 *      only contains the zone when the image IS the page.
 *   3. DESKEW. Straighten the few degrees of rotation, which is what turns two
 *      dense lines of OCR-B from a smear back into rows.
 *
 * The quadrant rotations — 90, 180, 270 — are NOT decided here. They cannot be
 * decided from geometry: a passport photographed upside down looks exactly like
 * one photographed the right way up. `scan.ts` resolves them by trying, and
 * only when a straight read has already failed, so a good upload never pays
 * for it.
 *
 * ── Everything is measured on a proxy ──
 *
 * The analysis runs on a 320px-wide copy, and only the final crop and rotate
 * touch the full-resolution image. A 12-megapixel phone photograph is 48MB of
 * RGBA; thresholding it, flood-filling it and then rotating it seventeen times
 * to find the skew is not something to do on the main thread of a phone. At
 * 320px every one of those is a fraction of a frame, and none of the decisions
 * being made — where the page is, how far it is tilted — need more resolution
 * than that.
 *
 * As everywhere in this folder: this runs in the applicant's own browser and
 * the photograph does not leave the device.
 */

/** Long edge of the analysis copy. Big enough to find a page, small enough to
 *  threshold and flood-fill in a frame. */
const PROXY_WIDTH = 320;

/** How far off square a hand-held photograph is worth correcting. Beyond this
 *  the page is not tilted, it is on its side, and that is a quadrant rotation
 *  `scan.ts` has to resolve by trying. */
const MAX_SKEW_DEGREES = 8;

/* -------------------------------------------------------------------------- */
/* Canvas plumbing                                                            */
/* -------------------------------------------------------------------------- */

function makeCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function context2d(canvas: OffscreenCanvas | HTMLCanvasElement) {
  const context = canvas.getContext("2d") as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!context) throw new Error("no 2d context");
  return context;
}

/**
 * Decode with the EXIF orientation applied.
 *
 * `imageOrientation: "from-image"` is the default in current browsers and was
 * NOT the default in older ones, and the difference is a passport read
 * sideways. Stating it costs nothing and removes the question.
 */
export async function decodeUpright(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    // Some engines reject the options bag rather than ignoring the member.
    return createImageBitmap(blob);
  }
}

/* -------------------------------------------------------------------------- */
/* The numerics — pure, and therefore testable                                */
/* -------------------------------------------------------------------------- */

/**
 * Otsu's threshold: the grey level that best separates the histogram into two
 * classes, by maximising the variance between them.
 *
 * Chosen over a fixed threshold because there is no fixed threshold that works
 * on both a passport on a white desk and a passport on a dark one. Otsu asks
 * the image where its two populations are rather than being told.
 */
export function otsuThreshold(grey: Uint8Array): number {
  const histogram = new Uint32Array(256);
  for (const value of grey) histogram[value]! += 1;

  const total = grey.length;
  let sum = 0;
  for (let level = 0; level < 256; level += 1) sum += level * histogram[level]!;

  let sumBackground = 0;
  let weightBackground = 0;
  let best = 0;
  let bestVariance = -1;

  for (let level = 0; level < 256; level += 1) {
    weightBackground += histogram[level]!;
    if (weightBackground === 0) continue;

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += level * histogram[level]!;

    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const between =
      weightBackground *
      weightForeground *
      (meanBackground - meanForeground) *
      (meanBackground - meanForeground);

    if (between > bestVariance) {
      bestVariance = between;
      best = level;
    }
  }

  return best;
}

export type Box = { x: number; y: number; width: number; height: number };

/**
 * The bounding box of the largest connected bright region.
 *
 * ── Why the LARGEST region and not simply "every bright pixel" ──
 *
 * A bounding box around all the bright pixels is a box around the whole image
 * the moment there is one specular highlight on the tablecloth, which there
 * always is. The page is the biggest connected bright thing in the frame by a
 * wide margin, so finding components and taking the largest is what makes this
 * robust to reflections, a white mug, or a second document lying alongside.
 *
 * ── Why an explicit stack ──
 *
 * A recursive flood fill on a 320x240 region is up to 76,800 frames deep and
 * overflows the stack on every engine. The stack is a `Int32Array` used as a
 * ring-free LIFO of pixel indices, which is also several times faster than an
 * array of coordinate pairs.
 */
export function largestBrightBox(
  grey: Uint8Array,
  width: number,
  height: number,
  threshold: number,
): Box | null {
  const seen = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);

  let best: Box | null = null;
  let bestArea = 0;

  for (let start = 0; start < grey.length; start += 1) {
    if (seen[start] || grey[start]! <= threshold) continue;

    let top = 0;
    stack[top++] = start;
    seen[start] = 1;

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let area = 0;

    while (top > 0) {
      const index = stack[--top]!;
      const x = index % width;
      const y = (index - x) / width;

      area += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      // Four-connected. Eight would bridge the page to a highlight touching it
      // only at a corner, which is exactly the join not worth making.
      if (x > 0 && !seen[index - 1] && grey[index - 1]! > threshold) {
        seen[index - 1] = 1;
        stack[top++] = index - 1;
      }
      if (x + 1 < width && !seen[index + 1] && grey[index + 1]! > threshold) {
        seen[index + 1] = 1;
        stack[top++] = index + 1;
      }
      if (y > 0 && !seen[index - width] && grey[index - width]! > threshold) {
        seen[index - width] = 1;
        stack[top++] = index - width;
      }
      if (y + 1 < height && !seen[index + width] && grey[index + width]! > threshold) {
        seen[index + width] = 1;
        stack[top++] = index + width;
      }
    }

    if (area > bestArea) {
      bestArea = area;
      best = { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
    }
  }

  return best;
}

/**
 * How strongly a binary image is organised into horizontal rows, at one angle.
 *
 * This is the whole of the deskew. Rotate the ink by a candidate angle, count
 * the ink in each output row, and take the variance of those counts: text that
 * is level piles into a few rows and leaves the gaps between lines empty, so
 * the counts swing hard and the variance is high. Text that is tilted smears
 * every line across many rows and the counts flatten out.
 *
 * The angle with the highest variance is the angle at which the text is level,
 * and rotating by its negation squares the page up. It is the classic
 * projection-profile method and it is here rather than a Hough transform
 * because the MRZ is two long dense lines — the single most favourable input
 * this technique has.
 *
 * Returned in ink-count units squared; only the comparison between angles
 * means anything.
 */
export function rowProfileVariance(
  ink: Uint8Array,
  width: number,
  height: number,
  degrees: number,
): number {
  const radians = (degrees * Math.PI) / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  const centreX = width / 2;
  const centreY = height / 2;

  const rows = new Uint32Array(height);
  let total = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!ink[y * width + x]) continue;
      const dx = x - centreX;
      const dy = y - centreY;
      // Where this ink lands after rotating by -degrees. Only the row matters.
      const row = Math.round(centreY - dx * sin + dy * cos);
      if (row < 0 || row >= height) continue;
      rows[row]! += 1;
      total += 1;
    }
  }

  if (total === 0) return 0;

  const mean = total / height;
  let variance = 0;
  for (let row = 0; row < height; row += 1) {
    const delta = rows[row]! - mean;
    variance += delta * delta;
  }

  return variance / height;
}

/** The angle, in degrees, the content is tilted by. Zero when it is level. */
export function findSkew(ink: Uint8Array, width: number, height: number): number {
  let best = 0;
  let bestVariance = rowProfileVariance(ink, width, height, 0);

  for (let degrees = -MAX_SKEW_DEGREES; degrees <= MAX_SKEW_DEGREES; degrees += 1) {
    if (degrees === 0) continue;
    const variance = rowProfileVariance(ink, width, height, degrees);
    if (variance > bestVariance) {
      bestVariance = variance;
      best = degrees;
    }
  }

  return best;
}

/* -------------------------------------------------------------------------- */
/* The pass itself                                                            */
/* -------------------------------------------------------------------------- */

export type OrientResult = {
  bitmap: ImageBitmap;
  /** What was actually done, for the scan screen and for debugging. */
  cropped: boolean;
  /** Degrees of skew corrected. Negative is anticlockwise. */
  deskewed: number;
};

/**
 * Crop the document out of the photograph and square it up.
 *
 * ── Every step can decline ──
 *
 * A crop that would take almost the whole frame is not a crop, and a crop that
 * would take a sliver is a mistake. A skew of zero degrees is not worth a
 * re-render. In each case the original is returned unchanged, because the cost
 * of doing nothing is a scan that works exactly as well as it did before this
 * function existed, and the cost of a bad crop is a scan that cannot work at
 * all. This is a best-effort improvement on the input and it must never be the
 * reason a good photograph fails.
 *
 * The caller owns the bitmap it passes in and this may hand back that same
 * bitmap, so ownership does not change: close what you passed, once, when the
 * scan is done. Nothing here closes anything it did not create.
 */
export async function orientDocument(bitmap: ImageBitmap): Promise<OrientResult> {
  try {
    return await run(bitmap);
  } catch {
    // A tainted canvas, a zero-sized decode, an engine without
    // `getImageData` — none of them is a reason to fail a scan.
    return { bitmap, cropped: false, deskewed: 0 };
  }
}

async function run(bitmap: ImageBitmap): Promise<OrientResult> {
  const scale = Math.min(1, PROXY_WIDTH / Math.max(1, bitmap.width));
  const proxyWidth = Math.max(1, Math.round(bitmap.width * scale));
  const proxyHeight = Math.max(1, Math.round(bitmap.height * scale));

  const proxy = makeCanvas(proxyWidth, proxyHeight);
  const proxyContext = context2d(proxy);
  proxyContext.drawImage(bitmap, 0, 0, proxyWidth, proxyHeight);

  const pixels = proxyContext.getImageData(0, 0, proxyWidth, proxyHeight).data;
  const grey = new Uint8Array(proxyWidth * proxyHeight);
  for (let index = 0; index < grey.length; index += 1) {
    const at = index * 4;
    grey[index] =
      (pixels[at]! * 299 + pixels[at + 1]! * 587 + pixels[at + 2]! * 114) / 1000;
  }

  /* --- 1. Where is the page ------------------------------------------- */

  const threshold = otsuThreshold(grey);
  const box = largestBrightBox(grey, proxyWidth, proxyHeight, threshold);
  const crop = usableCrop(box, proxyWidth, proxyHeight);

  /* --- 2. How far is it tilted ----------------------------------------- */

  /**
   * The ink INSIDE the crop, at the same threshold.
   *
   * Measured on the crop rather than the whole proxy because the tablecloth's
   * texture is ink by this definition and it has no rows in it — including it
   * would flatten the very variance the skew search is looking for.
   */
  const region = crop ?? { x: 0, y: 0, width: proxyWidth, height: proxyHeight };
  const ink = new Uint8Array(region.width * region.height);
  for (let y = 0; y < region.height; y += 1) {
    for (let x = 0; x < region.width; x += 1) {
      ink[y * region.width + x] =
        grey[(y + region.y) * proxyWidth + (x + region.x)]! <= threshold ? 1 : 0;
    }
  }

  const skew = findSkew(ink, region.width, region.height);

  if (!crop && skew === 0) return { bitmap, cropped: false, deskewed: 0 };

  /* --- 3. Redraw, once, at full resolution ----------------------------- */

  // Back to source pixels. The proxy was only ever a measuring instrument.
  const sx = crop ? crop.x / scale : 0;
  const sy = crop ? crop.y / scale : 0;
  const sw = crop ? crop.width / scale : bitmap.width;
  const sh = crop ? crop.height / scale : bitmap.height;

  const radians = (-skew * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  // The bounding box a rotated rectangle needs, so the corners are not clipped.
  const outWidth = Math.max(1, Math.round(sw * cos + sh * sin));
  const outHeight = Math.max(1, Math.round(sw * sin + sh * cos));

  const canvas = makeCanvas(outWidth, outHeight);
  const context = context2d(canvas);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  // White, not transparent: the gaps a rotation leaves in the corners become
  // black under `normalise` otherwise, and a black wedge across the end of the
  // machine-readable zone is read as characters.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, outWidth, outHeight);

  context.translate(outWidth / 2, outHeight / 2);
  context.rotate(radians);
  context.drawImage(bitmap, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);

  return {
    bitmap: await createImageBitmap(canvas),
    cropped: Boolean(crop),
    deskewed: skew,
  };
}

/**
 * Is this box worth cropping to?
 *
 * Three refusals, and each has a photograph behind it:
 *
 *   too big     the page already fills the frame, or the whole image came back
 *               as one bright component because it was shot on white paper.
 *               Cropping gains nothing and risks shaving the zone.
 *   too small   the largest bright thing was a highlight, a watch face, a
 *               window behind the desk. Cropping to it would throw the
 *               passport away.
 *   wrong shape a box more than four times as long as it is tall is a strip of
 *               something, not a document.
 */
function usableCrop(box: Box | null, width: number, height: number): Box | null {
  if (!box) return null;

  const coverage = (box.width * box.height) / (width * height);
  if (coverage > 0.92 || coverage < 0.15) return null;

  const aspect = box.width / Math.max(1, box.height);
  if (aspect > 4 || aspect < 0.25) return null;

  // A little of the surround, kept deliberately. The threshold cuts at the
  // page's edge and the machine-readable zone runs close to it; a crop tight to
  // the detected boundary can clip the descenders off the bottom line.
  const padX = Math.round(box.width * 0.02);
  const padY = Math.round(box.height * 0.02);

  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);

  return {
    x,
    y,
    width: Math.min(width - x, box.width + padX * 2),
    height: Math.min(height - y, box.height + padY * 2),
  };
}

/* -------------------------------------------------------------------------- */
/* Quadrant rotation                                                          */
/* -------------------------------------------------------------------------- */

export type Quadrant = 0 | 90 | 180 | 270;

/**
 * The order `scan.ts` tries quadrants in, after a straight read has failed.
 *
 * 90 before 270 because a right-handed person photographing a document in
 * portrait turns the phone clockwise; 180 last because a document held upside
 * down is rare and a read at 180 is the one an applicant would have noticed
 * themselves.
 */
export const QUADRANTS: readonly Quadrant[] = [90, 270, 180];

/** The same image, turned. The caller owns both. */
export async function rotateQuadrant(
  bitmap: ImageBitmap,
  degrees: Quadrant,
): Promise<ImageBitmap> {
  if (degrees === 0) return bitmap;

  const swap = degrees !== 180;
  const width = swap ? bitmap.height : bitmap.width;
  const height = swap ? bitmap.width : bitmap.height;

  const canvas = makeCanvas(width, height);
  const context = context2d(canvas);
  context.translate(width / 2, height / 2);
  context.rotate((degrees * Math.PI) / 180);
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);

  return createImageBitmap(canvas);
}
