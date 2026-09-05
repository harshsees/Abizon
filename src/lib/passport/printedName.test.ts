import { describe, expect, it } from "vitest";

import { preferPrinted, resolveName } from "./names";
import {
  findFieldValue,
  isMrzWord,
  readPrintedNames,
  withoutMrz,
  type Line,
  type Word,
} from "./printedName";

/**
 * The scanner's geometry, exercised without an OCR engine.
 *
 * Everything here builds word boxes by hand, which is the whole reason
 * `printedName.ts` takes `{ text, bbox }` rather than a Tesseract result: the
 * back-page reader has the same shape of logic buried in a method that needs a
 * worker and a photograph of somebody's passport to run at all, and it is
 * consequently the part of the scanner nobody dares change.
 */

/** A row of words at a given height, laid out left to right. */
function row(y: number, entries: Array<[string, number, number?]>): Line {
  const words: Word[] = entries.map(([text, x0, width]) => ({
    text,
    bbox: { x0, y0: y, x1: x0 + (width ?? text.length * 10), y1: y + 20 },
  }));

  return {
    words,
    bbox: {
      x0: Math.min(...words.map((w) => w.bbox.x0)),
      y0: y,
      x1: Math.max(...words.map((w) => w.bbox.x1)),
      y1: y + 20,
    },
  };
}

/* -------------------------------------------------------------------------- */

describe("isMrzWord", () => {
  it("catches a zone line by its fillers, wherever it sits on the page", () => {
    expect(isMrzWord("P<INDKUMARI<<ASHA<<<<<<<<<<<<<<<<<<<<<<")).toBe(true);
    expect(isMrzWord("KUMARI<<ASHA")).toBe(true);
    // OCR mangles the chevrons in predictable ways.
    expect(isMrzWord("KUMARI«ASHA")).toBe(true);
  });

  it("catches an unbroken run of capitals too long to be a printed field", () => {
    expect(isMrzWord("Z12345671IND9403025F3209018")).toBe(true);
  });

  it("leaves printed words alone", () => {
    expect(isMrzWord("KUMARI")).toBe(false);
    expect(isMrzWord("Surname")).toBe(false);
    expect(isMrzWord("Z1234567")).toBe(false);
    expect(isMrzWord("THIRUVANANTHAPURAM")).toBe(false);
  });
});

describe("withoutMrz", () => {
  it("removes the zone so the page cannot corroborate itself", () => {
    const words: Word[] = [
      { text: "KUMARI", bbox: { x0: 0, y0: 0, x1: 10, y1: 10 } },
      { text: "KUMARI<<ASHA<<<<<<<<", bbox: { x0: 0, y0: 90, x1: 90, y1: 100 } },
    ];

    expect(withoutMrz(words).map((w) => w.text)).toEqual(["KUMARI"]);
  });
});

/* -------------------------------------------------------------------------- */

describe("findFieldValue — the two layouts a data page uses", () => {
  const SURNAME = new Set(["SURNAME", "NOM"]);
  const GIVEN = new Set(["GIVEN", "PRENOMS"]);

  it("reads a value printed below its label, which is the Indian layout", () => {
    const lines = [
      row(0, [["Surname", 40], ["/", 130], ["Nom", 145]]),
      row(26, [["GUPTA", 40]]),
      row(60, [["Given", 40], ["Name(s)", 100], ["/", 190], ["Prénoms", 205]]),
      row(86, [["RAHUL", 40], ["KUMAR", 110]]),
    ];

    expect(findFieldValue(lines, SURNAME)?.text).toBe("GUPTA");
    expect(findFieldValue(lines, GIVEN)?.text).toBe("RAHUL KUMAR");
  });

  it("reads a value printed to the right of its label", () => {
    const lines = [row(0, [["Surname", 40], [":", 130], ["GUPTA", 150]])];
    expect(findFieldValue(lines, SURNAME)?.text).toBe("GUPTA");
  });

  it("does not walk into the next column of a two-column page", () => {
    // The value sits under the label; a second column's value sits 400px to
    // the right at the same height, and `groupIntoLines` merges them.
    const lines = [
      row(0, [["Surname", 40], ["/", 130], ["Nom", 145]]),
      row(26, [["GUPTA", 40], ["MUMBAI", 600]]),
    ];

    expect(findFieldValue(lines, SURNAME)?.text).toBe("GUPTA");
  });

  it("does not read the label of the field below as its own value", () => {
    // Nothing under Surname — the page put the value somewhere this cannot
    // reach — and the next line is the following label. Silence beats a guess.
    const lines = [
      row(0, [["Surname", 40], ["/", 130], ["Nom", 145]]),
      row(26, [["Nationality", 40]]),
    ];

    expect(findFieldValue(lines, SURNAME)).toBeUndefined();
  });

  it("does not reach past a gap into an unrelated part of the page", () => {
    const lines = [
      row(0, [["Surname", 40], ["/", 130], ["Nom", 145]]),
      // 200px below, which is well past the two-label-heights allowance.
      row(200, [["GUPTA", 40]]),
    ];

    expect(findFieldValue(lines, SURNAME)).toBeUndefined();
  });

  it("refuses a value carrying digits — that is a number, not a name", () => {
    const lines = [
      row(0, [["Surname", 40]]),
      row(26, [["Z1234567", 40]]),
    ];

    expect(findFieldValue(lines, SURNAME)).toBeUndefined();
  });

  it("does not let `Prénoms` open the surname field", () => {
    // `NOM` is a surname label and a substring of `PRENOMS`. Matching on
    // substrings would make every page report its given names as its surname.
    const lines = [
      row(0, [["Given", 40], ["Name(s)", 100], ["/", 190], ["Prénoms", 205]]),
      row(26, [["RAHUL", 40]]),
    ];

    expect(findFieldValue(lines, SURNAME)).toBeUndefined();
  });
});

describe("readPrintedNames", () => {
  it("returns both fields from one page", () => {
    const lines = [
      row(0, [["Type", 40], ["Country", 120], ["Code", 220]]),
      row(26, [["P", 40], ["IND", 120]]),
      row(60, [["Surname", 40], ["/", 130], ["Nom", 145]]),
      row(86, [["D'SOUZA", 40]]),
      row(120, [["Given", 40], ["Name(s)", 100]]),
      row(146, [["MARIA", 40], ["ANNE", 110]]),
    ];

    expect(readPrintedNames(lines)).toMatchObject({
      surname: { text: "D'SOUZA" },
      givenNames: { text: "MARIA ANNE" },
    });
  });
});

/* -------------------------------------------------------------------------- */

describe("preferPrinted — when the page is allowed to overrule the zone", () => {
  it("adopts the page where the zone truncated the name", () => {
    // TD3 line 1 has 39 characters for the whole name and gives no sign when
    // it runs out. This is the reported bug.
    expect(preferPrinted("RAJENDRAKUM", "RAJENDRAKUMAR")).toBe("RAJENDRAKUMAR");
  });

  it("adopts the page where the zone lost a whole given name", () => {
    expect(preferPrinted("ASHA", "ASHA DEVI")).toBe("ASHA DEVI");
  });

  it("adopts the page where the two agree, to keep the accents", () => {
    expect(preferPrinted("JOSE", "José")).toBe("JOSÉ");
    // The zone transliterates; the page does not.
    expect(preferPrinted("MUELLER", "Müller")).toBe("MÜLLER");
  });

  it("adopts the page where the zone misread a letter", () => {
    expect(preferPrinted("OBRIKSSON", "ERIKSSON")).toBe("ERIKSSON");
  });

  it("refuses a page value that shares nothing with the zone", () => {
    // A bad positional grab. The zone's reading stands, which is the behaviour
    // that existed before any of this.
    expect(preferPrinted("ERIKSSON", "NATIONALITY")).toBeNull();
    expect(preferPrinted("GUPTA", "MUMBAI")).toBeNull();
  });

  it("refuses to SHORTEN a name, however close the page's reading is", () => {
    // The page being a prefix of the zone means OCR stopped early on the
    // printed line. Adopting it would cut somebody's name to fit a misread.
    expect(preferPrinted("RAJENDRAKUMAR", "RAJENDRAKUM")).toBeNull();
  });

  it("does nothing when no printed field was found", () => {
    expect(preferPrinted("GUPTA", undefined)).toBeNull();
  });
});

describe("resolveName", () => {
  it("prefers the printed field over the word-by-word correction", () => {
    expect(resolveName("ASHA", "ASHA DEVI", ["ASHA", "DEVI"])).toBe("ASHA DEVI");
  });

  it("falls back to correcting the zone when the page cannot be believed", () => {
    // No printed field found, but the page carries the correct spelling as a
    // loose word — the behaviour this had before, unchanged.
    expect(resolveName("OBRIKSSON", undefined, ["ERIKSSON", "PASSPORT"])).toBe(
      "ERIKSSON",
    );
  });

  it("leaves the zone's reading alone when neither source helps", () => {
    expect(resolveName("GUPTA", "MUMBAI", ["MUMBAI", "INDIA"])).toBe("GUPTA");
  });
});
