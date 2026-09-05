import { describe, expect, it } from "vitest";

import {
  findSkew,
  largestBrightBox,
  otsuThreshold,
  rowProfileVariance,
} from "./orient";

/**
 * The numerics only.
 *
 * `orientDocument` needs a canvas, an `ImageBitmap` and `getImageData`, none of
 * which exist in this runner — which is precisely why the three decisions it
 * makes are pure functions over a `Uint8Array` rather than steps inside it.
 * What is tested here is every judgement the pass makes; what is not is the
 * `drawImage` that acts on them.
 */

/** A grey field with a brighter rectangle painted into it. */
function field(
  width: number,
  height: number,
  background: number,
  rect: { x: number; y: number; width: number; height: number; value: number },
): Uint8Array {
  const data = new Uint8Array(width * height).fill(background);
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      data[y * width + x] = rect.value;
    }
  }
  return data;
}

/* -------------------------------------------------------------------------- */

describe("otsuThreshold", () => {
  /**
   * The contract is the CLASSIFICATION, not the number.
   *
   * On a histogram with two spikes and nothing between them, every level in
   * the gap scores the same between-class variance, and which of them a given
   * implementation returns is arbitrary — this one returns the lowest, which
   * is the background's own level. That is correct for the only consumer
   * there is: `largestBrightBox` tests `grey > threshold`, so a threshold
   * sitting exactly on the background excludes it and includes the page. A
   * test that asserted the number would be asserting the tie-break.
   */
  const separates = (grey: Uint8Array, dark: number, bright: number) => {
    const threshold = otsuThreshold(grey);
    return dark <= threshold && bright > threshold;
  };

  it("separates a dark table from a bright page", () => {
    expect(
      separates(field(40, 30, 40, { x: 10, y: 5, width: 20, height: 20, value: 210 }), 40, 210),
    ).toBe(true);
  });

  it("separates them when the whole scene is brighter", () => {
    // The point of Otsu over a constant: a passport on a white desk has both
    // populations above any threshold a fixed number could name.
    expect(
      separates(field(40, 30, 150, { x: 10, y: 5, width: 20, height: 20, value: 250 }), 150, 250),
    ).toBe(true);
  });

  it("separates a low-contrast pair a fixed threshold would miss", () => {
    expect(
      separates(field(40, 30, 96, { x: 10, y: 5, width: 20, height: 20, value: 132 }), 96, 132),
    ).toBe(true);
  });
});

describe("largestBrightBox", () => {
  it("finds the page", () => {
    const grey = field(40, 30, 30, { x: 8, y: 6, width: 20, height: 15, value: 220 });

    expect(largestBrightBox(grey, 40, 30, 128)).toEqual({
      x: 8,
      y: 6,
      width: 20,
      height: 15,
    });
  });

  it("ignores a highlight elsewhere in the frame", () => {
    // The reason this looks for the largest CONNECTED region and not simply a
    // box around every bright pixel: one reflection off a laminate would
    // otherwise stretch the box to the corner of the image.
    const grey = field(40, 30, 30, { x: 8, y: 6, width: 20, height: 15, value: 220 });
    grey[2 * 40 + 37] = 255;
    grey[2 * 40 + 38] = 255;

    expect(largestBrightBox(grey, 40, 30, 128)).toEqual({
      x: 8,
      y: 6,
      width: 20,
      height: 15,
    });
  });

  it("returns nothing when there is no bright region at all", () => {
    expect(largestBrightBox(new Uint8Array(40 * 30).fill(20), 40, 30, 128)).toBeNull();
  });

  it("does not bridge two regions touching only at a corner", () => {
    // Four-connected, deliberately. Eight-connected would join the page to a
    // highlight that meets it diagonally and take the box around both.
    const grey = new Uint8Array(10 * 10).fill(0);
    for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) grey[y * 10 + x] = 200;
    grey[4 * 10 + 4] = 200;

    expect(largestBrightBox(grey, 10, 10, 128)).toEqual({
      x: 0,
      y: 0,
      width: 4,
      height: 4,
    });
  });
});

/* -------------------------------------------------------------------------- */

/** Ink drawn as horizontal rules, optionally tilted by `degrees`. */
function ruledPage(
  width: number,
  height: number,
  rows: number[],
  degrees = 0,
): Uint8Array {
  const ink = new Uint8Array(width * height);
  const radians = (degrees * Math.PI) / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  const cx = width / 2;
  const cy = height / 2;

  for (const row of rows) {
    for (let x = 4; x < width - 4; x += 1) {
      const dx = x - cx;
      const dy = row - cy;
      const rx = Math.round(cx + dx * cos - dy * sin);
      const ry = Math.round(cy + dx * sin + dy * cos);
      if (rx < 0 || rx >= width || ry < 0 || ry >= height) continue;
      ink[ry * width + rx] = 1;
    }
  }

  return ink;
}

describe("rowProfileVariance", () => {
  it("is higher for level text than for tilted text", () => {
    const level = ruledPage(80, 60, [15, 25, 35, 45]);
    const tilted = ruledPage(80, 60, [15, 25, 35, 45], 6);

    expect(rowProfileVariance(level, 80, 60, 0)).toBeGreaterThan(
      rowProfileVariance(tilted, 80, 60, 0),
    );
  });

  it("is zero on an empty image rather than dividing by nothing", () => {
    expect(rowProfileVariance(new Uint8Array(100), 10, 10, 3)).toBe(0);
  });
});

describe("findSkew", () => {
  it("reports zero for a page that is already square", () => {
    expect(findSkew(ruledPage(120, 90, [20, 32, 44, 56, 68]), 120, 90)).toBe(0);
  });

  it("finds the tilt of a page photographed off square", () => {
    // Rotated 5 degrees clockwise, so the correction is 5 degrees back.
    const skew = findSkew(ruledPage(120, 90, [20, 32, 44, 56, 68], 5), 120, 90);
    expect(skew).toBeGreaterThanOrEqual(4);
    expect(skew).toBeLessThanOrEqual(6);
  });

  it("finds the tilt in the other direction too", () => {
    const skew = findSkew(ruledPage(120, 90, [20, 32, 44, 56, 68], -4), 120, 90);
    expect(skew).toBeLessThanOrEqual(-3);
    expect(skew).toBeGreaterThanOrEqual(-5);
  });
});
