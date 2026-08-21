import { describe, expect, it } from "vitest";

import {
  checkDigit,
  findMrzLines,
  parseMrz,
  parseMrzDate,
  parseNameField,
  readMrzFromText,
} from "./mrz";

/**
 * THE MRZ RULES.
 * ---------------------------------------------------------------------------
 * The primary vector is the specimen published in ICAO 9303 Part 3 — Anna Maria
 * Eriksson, Utopia. Testing against a specimen from the standard rather than
 * against a zone this code generated is the entire point: a check-digit routine
 * verified with its own output verifies nothing. Every digit below was computed
 * by the people who wrote the specification.
 */
// Line 1 is padded to length rather than written out: counting a filler run by
// eye is how the first draft of this file ended up 45 characters long and every
// assertion below failed for a reason that had nothing to do with the parser.
const ICAO_LINE_1 = "P<UTOERIKSSON<<ANNA<MARIA".padEnd(44, "<");
const ICAO_LINE_2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10";

describe("the ICAO specimen", () => {
  it("is the length the standard says it is", () => {
    // If this fails every other assertion here is meaningless, so it is checked
    // first and separately.
    expect(ICAO_LINE_1).toHaveLength(44);
    expect(ICAO_LINE_2).toHaveLength(44);
  });

  it("reads every field", () => {
    const result = parseMrz(ICAO_LINE_1, ICAO_LINE_2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.fields).toEqual({
      surname: "ERIKSSON",
      givenNames: "ANNA MARIA",
      issuingState: "UTO",
      nationality: "UTO",
      passportNumber: "L898902C3",
      dateOfBirth: "1974-08-12",
      dateOfExpiry: "2012-04-15",
      sex: "female",
    });
  });

  it("passes every check digit", () => {
    const result = parseMrz(ICAO_LINE_1, ICAO_LINE_2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.checks).toEqual({
      passportNumber: true,
      dateOfBirth: true,
      dateOfExpiry: true,
      composite: true,
    });
    expect(result.allChecksPassed).toBe(true);
  });
});

describe("check digits catch a misread", () => {
  /**
   * The whole reason for preferring the MRZ over reading the printed page: a
   * wrong character does not quietly become a wrong passport number on the
   * application, it fails a digit and can be reported.
   */
  it("fails when a passport number character is misread", () => {
    // `0` for `O` is the classic OCR-B confusion, and exactly what the check
    // digit exists to catch.
    const corrupted = ICAO_LINE_2.replace("L898902C3", "L898902C0");
    const result = parseMrz(ICAO_LINE_1, corrupted);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.checks.passportNumber).toBe(false);
    expect(result.allChecksPassed).toBe(false);
  });

  it("names which field failed, not just that something did", () => {
    // A digit wrong in the birth date only. The passport number must still
    // report as good, because "retake the photo" and "check the date of birth"
    // are different instructions to give somebody.
    const corrupted = `${ICAO_LINE_2.slice(0, 13)}740813${ICAO_LINE_2.slice(19)}`;
    const result = parseMrz(ICAO_LINE_1, corrupted);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.checks.dateOfBirth).toBe(false);
    expect(result.checks.passportNumber).toBe(true);
  });

  it("catches a transposition the field digits miss", () => {
    // Swapping two characters inside the personal-number field leaves every
    // field-level digit intact — that field's own digit is the only one that
    // covers it, and the composite is what covers the rest of the line.
    const result = parseMrz(ICAO_LINE_1, ICAO_LINE_2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const flipped = `${ICAO_LINE_2.slice(0, 28)}EZ184226B<<<<<${ICAO_LINE_2.slice(42)}`;
    const bad = parseMrz(ICAO_LINE_1, flipped);
    expect(bad.ok).toBe(true);
    if (!bad.ok) return;

    expect(bad.checks.composite).toBe(false);
  });

  it("refuses a character that cannot appear in an MRZ", () => {
    // A lowercase letter or punctuation means the OCR produced something that
    // is not MRZ text. Scoring it as zero would let a misread pass.
    expect(Number.isNaN(checkDigit("L8989 2C3"))).toBe(true);
  });
});

describe("the check digit itself", () => {
  it("weights 7, 3, 1 and takes the remainder", () => {
    // Worked by hand: L=21, 8, 9, 8, 9, 0, 2, C=12, 3 against weights 7,3,1
    //   147 + 24 + 9 + 56 + 27 + 0 + 14 + 36 + 3 = 316,  316 % 10 = 6
    // which is the digit the specimen carries at position 10.
    expect(checkDigit("L898902C3")).toBe(6);
  });

  it("treats the filler as zero", () => {
    expect(checkDigit("<<<<<<")).toBe(0);
  });
});

describe("dates", () => {
  it("puts a birth year in the past, never the future", () => {
    // `74` is 1974, not 2074. The pivot is computed from the clock rather than
    // hardcoded, so this stays true after 2050.
    expect(parseMrzDate("740812", "past")).toBe("1974-08-12");
  });

  it("puts an expiry in the future", () => {
    expect(parseMrzDate("320901", "future")).toBe("2032-09-01");
  });

  it("keeps an expiry that has already passed in the past", () => {
    // The case that matters most. An expiry is bounded above — ten years of
    // validity — and not below: expired passports exist and get scanned. An
    // earlier rule pushed anything well behind us into the next century, so
    // the ICAO specimen's 2012 came back as 2112, reading an expired passport
    // as valid for another eighty-six years.
    expect(parseMrzDate("120415", "future")).toBe("2012-04-15");
  });

  it("puts an expiry far beyond any validity period in the previous century", () => {
    // No passport issued now expires in 2099.
    expect(parseMrzDate("990101", "future")).toBe("1999-01-01");
  });

  it("rejects a day that does not exist", () => {
    // 31 February. Left to `Date` this rolls into March and hands the form a
    // date the passport does not show.
    expect(parseMrzDate("740231", "past")).toBeNull();
  });

  it("rejects a month that does not exist", () => {
    expect(parseMrzDate("741312", "past")).toBeNull();
  });

  it("rejects anything that is not six digits", () => {
    expect(parseMrzDate("7408", "past")).toBeNull();
    expect(parseMrzDate("74081<", "past")).toBeNull();
  });
});

describe("names", () => {
  it("splits surname from given names on the double filler", () => {
    expect(parseNameField("ERIKSSON<<ANNA<MARIA<<<<<<<<")).toEqual({
      surname: "ERIKSSON",
      givenNames: "ANNA MARIA",
    });
  });

  it("handles a single given name", () => {
    expect(parseNameField("UMAT<<MANVENDRA<<<<<<")).toEqual({
      surname: "UMAT",
      givenNames: "MANVENDRA",
    });
  });

  it("handles a surname with no given names", () => {
    expect(parseNameField("SINGH<<<<<<<<<<")).toEqual({
      surname: "SINGH",
      givenNames: "",
    });
  });
});

describe("finding the zone in OCR output", () => {
  it("picks the two lines out of a whole scanned page", () => {
    // What Tesseract actually returns: headings, printed fields, then the zone.
    const page = [
      "REPUBLIC OF UTOPIA",
      "PASSPORT",
      "Surname / Nom",
      "ERIKSSON",
      "Given names",
      "ANNA MARIA",
      ICAO_LINE_1,
      ICAO_LINE_2,
    ].join("\n");

    expect(findMrzLines(page)).toEqual([ICAO_LINE_1, ICAO_LINE_2]);
  });

  it("strips the spaces OCR inserts into filler runs", () => {
    const spaced = `${ICAO_LINE_1.slice(0, 20)} ${ICAO_LINE_1.slice(20)}`;
    expect(findMrzLines(`${spaced}\n${ICAO_LINE_2}`)).toEqual([
      ICAO_LINE_1,
      ICAO_LINE_2,
    ]);
  });

  it("does not correct O for 0 on the way through", () => {
    // Tempting, and wrong: the check digits exist to catch exactly that
    // confusion, and silently repairing it here would defeat them.
    const corrupted = ICAO_LINE_2.replace("L898902C3", "L8989O2C3");
    const found = findMrzLines(`${ICAO_LINE_1}\n${corrupted}`);
    expect(found?.[1]).toContain("L8989O2C3");
  });

  it("reports when there is no zone rather than guessing", () => {
    const result = readMrzFromText("REPUBLIC OF UTOPIA\nPASSPORT\nERIKSSON");
    expect(result).toEqual({ ok: false, reason: "no-mrz-found" });
  });
});

describe("documents that are not passports", () => {
  it("refuses an identity card rather than misreading it", () => {
    // TD1 is three lines of 30. Read as TD3 every field would land in the
    // wrong place and produce confident nonsense.
    const td1 = "I<UTOD231458907<<<<<<<<<<<<<<<";
    expect(readMrzFromText(`${td1}\n${td1}`)).toEqual({
      ok: false,
      reason: "no-mrz-found",
    });
  });

  it("refuses a line of the right length that is not a passport", () => {
    const notPassport = `I${ICAO_LINE_1.slice(1)}`;
    expect(parseMrz(notPassport, ICAO_LINE_2)).toEqual({
      ok: false,
      reason: "not-a-passport",
    });
  });

  it("refuses lines of the wrong length", () => {
    expect(parseMrz(ICAO_LINE_1.slice(0, 43), ICAO_LINE_2)).toEqual({
      ok: false,
      reason: "wrong-line-length",
    });
  });
});

describe("what the check digits do and do not cover", () => {
  it("still reports all checks passed when the name is misread", () => {
    // The property that has to be stated somewhere, because it is the one that
    // will mislead someone. Every check digit is on line 2; line 1 carries the
    // name and has none. A corrupted name therefore produces a fully
    // "verified" result, and any interface showing it has to say so.
    const misread = "P<UTOERIKSSON<<ANNA<MARIAK".padEnd(44, "<");
    const result = parseMrz(misread, ICAO_LINE_2);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.allChecksPassed).toBe(true);
    expect(result.fields.givenNames).toBe("ANNA MARIAK");
  });
});
