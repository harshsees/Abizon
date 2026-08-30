import { describe, expect, it } from "vitest";

import { normaliseLine, recoverMrz } from "./recover";

/**
 * These are the shapes OCR actually returns, and every one of them used to be
 * discarded by `findMrzLines`. That is the bug: not that the reader was wrong
 * about what an MRZ is, but that it required a photograph to produce a perfect
 * one before it would look at it.
 *
 * The specimen is ICAO 9303's own, so the check digits below are the
 * standard's rather than something computed to fit.
 */
const LINE_1 = "P<UTOERIKSSON<<ANNA<MARIA".padEnd(44, "<");
const LINE_2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10";

describe("normaliseLine", () => {
  it("folds the shapes OCR reports where a chevron was printed", () => {
    expect(normaliseLine("P«UTOERIKSSON««ANNA")).toBe("P<UTOERIKSSON<<ANNA");
  });

  it("drops a stray mark rather than turning it into a filler", () => {
    // A mark mapped to `<` would shift every field after it by one; dropped, it
    // leaves a short line, which padding then fixes at the end.
    expect(normaliseLine("L8989•02C3")).toBe("L898902C3");
  });

  it("strips the spaces OCR inserts into filler runs", () => {
    expect(normaliseLine("ANNA < < MARIA")).toBe("ANNA<<MARIA");
  });
});

describe("recoverMrz — the reads that used to be thrown away", () => {
  it("reads a clean zone", () => {
    const found = recoverMrz(`${LINE_1}\n${LINE_2}`);
    expect(found?.result.allChecksPassed).toBe(true);
    expect(found?.result.fields.passportNumber).toBe("L898902C3");
    expect(found?.result.fields.surname).toBe("ERIKSSON");
  });

  it("reads it out of a page of other text", () => {
    const page = [
      "REPUBLIC OF UTOPIA",
      "PASSPORT",
      "Surname ERIKSSON",
      "Given Names ANNA MARIA",
      LINE_1,
      LINE_2,
      "",
    ].join("\n");

    expect(recoverMrz(page)?.result.allChecksPassed).toBe(true);
  });

  it("recovers a line whose trailing filler run came back short", () => {
    // Six characters missing off the end of line 1 — the single most common
    // real read, and previously an instant rejection on length.
    const short = LINE_1.slice(0, 38);
    const found = recoverMrz(`${short}\n${LINE_2}`);

    expect(found?.result.allChecksPassed).toBe(true);
    expect(found?.result.fields.givenNames).toBe("ANNA MARIA");
  });

  it("recovers a line with a spurious trailing character", () => {
    const found = recoverMrz(`${LINE_1}<\n${LINE_2}`);
    expect(found?.result.allChecksPassed).toBe(true);
  });

  it("survives a stray fragment wedged between the two lines", () => {
    const found = recoverMrz(`${LINE_1}\nP<<<<\n${LINE_2}`);
    expect(found?.result.allChecksPassed).toBe(true);
  });

  it("corrects O for 0 in a date, because the check digit says so", () => {
    // `740812` misread as `74O812`. In a numeric run the substitution is safe
    // to TRY, and the check digit is what makes it safe to keep.
    const misread = LINE_2.slice(0, 13) + "74O812" + LINE_2.slice(19);
    const found = recoverMrz(`${LINE_1}\n${misread}`);

    expect(found?.result.allChecksPassed).toBe(true);
    expect(found?.result.fields.dateOfBirth).toBe("1974-08-12");
  });

  it("corrects I for 1 in an expiry", () => {
    const misread = LINE_2.slice(0, 21) + "I20415" + LINE_2.slice(27);
    const found = recoverMrz(`${LINE_1}\n${misread}`);

    expect(found?.result.allChecksPassed).toBe(true);
    expect(found?.result.fields.dateOfExpiry).toBe("2012-04-15");
  });

  it("puts the document code back when OCR lost the P", () => {
    const found = recoverMrz(`F<UTOERIKSSON<<ANNA<MARIA`.padEnd(44, "<") + `\n${LINE_2}`);
    expect(found?.result.allChecksPassed).toBe(true);
  });

  it("still refuses a page with no zone on it at all", () => {
    const page = [
      "REPUBLIC OF UTOPIA",
      "PASSPORT",
      "Surname ERIKSSON",
      "Given Names ANNA MARIA",
    ].join("\n");

    expect(recoverMrz(page)).toBeNull();
  });

  it("returns the failing checks rather than a silent pass", () => {
    // A passport number altered in a way no substitution can rescue: the
    // recovery is allowed to try, and must then report that it did not work.
    const broken = "L898902C99UTO7408122F1204159ZE184226B<<<<<10";
    const found = recoverMrz(`${LINE_1}\n${broken}`);

    expect(found).not.toBeNull();
    expect(found?.result.allChecksPassed).toBe(false);
    expect(found?.result.checks.passportNumber).toBe(false);
  });
});
