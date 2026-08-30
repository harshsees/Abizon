import { describe, expect, it } from "vitest";

import { editDistance, refineName, refineWord } from "./names";

/**
 * The words a passport data page actually puts in front of the matcher. The
 * decoys matter more than the target: the risk in preferring "the closest word
 * on the page" is preferring the wrong one, so most of these cases exist to
 * prove that a near-miss is refused.
 */
const PAGE = [
  "REPUBLIC",
  "OF",
  "UTOPIA",
  "PASSPORT",
  "SURNAME",
  "ERIKSSON",
  "GIVEN",
  "NAMES",
  "ANNA",
  "MARIA",
  "L898902C3",
  "12",
  "AUG",
  "1974",
];

describe("editDistance", () => {
  it("is zero for the same string", () => {
    expect(editDistance("ERIKSSON", "ERIKSSON")).toBe(0);
  });

  it("counts a substitution as one", () => {
    expect(editDistance("ERIKSSON", "ERIKSSAN")).toBe(1);
  });

  it("counts an insertion and a substitution", () => {
    // What the zone actually produced: an extra character and a wrong one.
    expect(editDistance("OBRIKSSON", "ERIKSSON")).toBe(2);
  });
});

describe("refineWord — the zone's spelling against the page's", () => {
  it("adopts the page spelling when the zone misread it", () => {
    expect(refineWord("OBRIKSSON", PAGE)).toBe("ERIKSSON");
  });

  it("leaves a correct read alone", () => {
    expect(refineWord("ERIKSSON", PAGE)).toBe("ERIKSSON");
  });

  it("refuses a word that is merely the nearest, not near", () => {
    // `PASSPORT` is the closest thing on this page to `PASPORTO`, and it is
    // still four edits away on an eight-letter word — over the budget.
    expect(refineWord("XYLOPHON", PAGE)).toBe("XYLOPHON");
  });

  it("never rewrites a short name, where one edit is a different name", () => {
    // `LI` and `LU` are two people. A two-character word gets a budget of
    // zero, so only an exact match counts.
    expect(refineWord("LI", ["LU", "SURNAME"])).toBe("LI");
    expect(refineWord("LI", ["LI", "SURNAME"])).toBe("LI");
  });

  it("ignores anything with a digit in it", () => {
    // The passport number is the same length as some names and would otherwise
    // be a candidate.
    expect(refineWord("L8989O2C3", PAGE)).toBe("L8989O2C3");
  });

  it("ignores a word of a very different length", () => {
    expect(refineWord("ANN", ["ANNABELLINA"])).toBe("ANN");
  });

  it("prefers the closest of two plausible candidates", () => {
    expect(refineWord("ERIKSON", ["ERIKSSEN", "ERIKSSON"])).toBe("ERIKSSON");
  });
});

describe("refineName — several words", () => {
  it("corrects each word on its own", () => {
    // The zone joins given names with a filler and the page with a space, so
    // they never arrive as one comparable string.
    expect(refineName("ANNB MARIB", PAGE)).toBe("ANNA MARIA");
  });

  it("corrects one word and leaves the other", () => {
    expect(refineName("ANNA MARIB", PAGE)).toBe("ANNA MARIA");
  });

  it("returns the original when the page has nothing to say", () => {
    expect(refineName("ANNA MARIA", [])).toBe("ANNA MARIA");
  });
});
