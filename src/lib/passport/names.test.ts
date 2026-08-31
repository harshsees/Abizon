import { describe, expect, it } from "vitest";

import { editDistance, refineName, refineWord, transliterate } from "./names";

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

/**
 * The zone's alphabet. This is the half of the fix that the old matcher did
 * not have: every comparison happens here, so a page spelling and a zone
 * spelling of the same name have to arrive at the same string.
 */
describe("transliterate — into the alphabet the zone writes in", () => {
  it("expands the umlauts rather than dropping them", () => {
    // The old matcher folded this to `MLLER` and then failed to match
    // `MUELLER`, which is why no German name was ever corrected.
    expect(transliterate("Müller")).toBe("MUELLER");
    expect(transliterate("Schröder")).toBe("SCHROEDER");
  });

  it("expands the Nordic letters", () => {
    expect(transliterate("Kjærgård")).toBe("KJAERGAARD");
    expect(transliterate("Sørensen")).toBe("SOERENSEN");
  });

  it("drops a single combining mark to its base letter", () => {
    expect(transliterate("José")).toBe("JOSE");
    expect(transliterate("Muñoz")).toBe("MUNOZ");
    expect(transliterate("Françoise")).toBe("FRANCOISE");
  });

  it("removes the punctuation the zone has no character for", () => {
    expect(transliterate("O'Brien")).toBe("OBRIEN");
    expect(transliterate("Smith-Jones")).toBe("SMITHJONES");
  });

  it("turns the sharp s into a double s", () => {
    expect(transliterate("Weiß")).toBe("WEISS");
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
    // `PASSPORT` is the closest thing on this page to `XYLOPHON`, and it is
    // still far over the budget — as well as being on the stop list.
    expect(refineWord("XYLOPHON", PAGE)).toBe("XYLOPHON");
  });

  it("never substitutes in a short name, where one edit is a different name", () => {
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

  /* ---------------------------------------------------------------------- */
  /* What the rewrite fixed                                                 */
  /* ---------------------------------------------------------------------- */

  it("recovers the accent the zone transliterated away", () => {
    // The zone says MUELLER because that is what the zone can say. The page
    // says Müller, and the page is what the applicant will proof-read.
    expect(refineWord("MUELLER", ["SURNAME", "Müller"])).toBe("MÜLLER");
  });

  it("recovers an accent even on a name too short to have an edit budget", () => {
    // Zero budget means no substitutions are safe. It does not mean the page
    // should not be consulted at all, which is what the old early return did.
    expect(refineWord("JOSE", ["GIVEN", "José"])).toBe("JOSÉ");
  });

  it("recovers a hyphen the zone had no character for", () => {
    expect(refineWord("SMITHJONES", ["SURNAME", "Smith-Jones"])).toBe("SMITH-JONES");
  });

  it("recovers an apostrophe", () => {
    expect(refineWord("OBRIEN", ["SURNAME", "O'Brien"])).toBe("O'BRIEN");
  });

  it("still corrects a misread inside an accented name", () => {
    // One substitution on an eight-character transliteration (SCHROEDER is
    // nine, budget two), with the accent carried through the correction.
    expect(refineWord("SCHROFDER", ["SURNAME", "Schröder"])).toBe("SCHRÖDER");
  });

  it("refuses the boilerplate every passport prints on itself", () => {
    // `SEX` is one edit from a real given name and would otherwise win on a
    // three-letter budget of zero — except that zero budget only takes exact
    // matches, so the real protection is needed at four letters and up.
    expect(refineWord("NAMI", ["NAME", "GIVEN", "NAMES"])).toBe("NAMI");
    expect(refineWord("VALIN", ["VALID", "PASSPORT"])).toBe("VALIN");
  });

  it("takes the page's word over the boilerplate beside it", () => {
    expect(refineWord("VALIN", ["VALID", "VALIA"])).toBe("VALIA");
  });

  it("strips the punctuation a form leaves clinging to a word", () => {
    // "ERIKSSON," on a page with a comma after it used to be rejected
    // outright, so the page could not correct the zone at all.
    expect(refineWord("OBRIKSSON", ["Surname:", "ERIKSSON,"])).toBe("ERIKSSON");
  });

  it("returns one case for the whole name", () => {
    // A page OCR'd as title case must not produce `JOHN Eriksson` when one
    // half of the name came from the zone.
    expect(refineWord("ERIKSON", ["Eriksson"])).toBe("ERIKSSON");
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

  it("carries accents through a multi-word given name", () => {
    expect(refineName("JOSE MARIA", ["José", "María", "GIVEN"])).toBe("JOSÉ MARÍA");
  });
});
