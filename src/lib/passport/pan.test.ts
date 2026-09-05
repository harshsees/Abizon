import { describe, expect, it } from "vitest";

import { findPan, parsePan, surnameAgrees } from "./pan";

/**
 * Every PAN below is invented and none of them is issued to anybody. They are
 * built to the published FORMAT — five letters, four digits, a letter, with a
 * holder-type code in position four — which is the only thing this module
 * claims to check.
 */

describe("parsePan", () => {
  it("accepts a well-formed individual's PAN", () => {
    expect(parsePan("BQEPG1234F")).toMatchObject({
      number: "BQEPG1234F",
      holderType: "P",
      holderTypeLabel: "Individual",
      surnameInitial: "G",
    });
  });

  it("accepts the number as OCR returns it — spaced, and in any case", () => {
    // A card sets the number with wide tracking and OCR splits it. The joining
    // happens in `findPan`; this is the same value arriving with the spaces
    // still in.
    expect(parsePan("bqepg 1234 f")?.number).toBe("BQEPG1234F");
  });

  it("recognises the other holder types", () => {
    expect(parsePan("AABCG1234M")?.holderTypeLabel).toBe("Company");
    expect(parsePan("AABHG1234M")?.holderTypeLabel).toBe("Hindu undivided family");
    expect(parsePan("AABTG1234M")?.holderTypeLabel).toBe("Trust");
  });

  it("refuses a fourth character that is not a holder type", () => {
    // This is most of the value of the test: `0`/`O` and `1`/`I` are what OCR
    // confuses on a laminated card, and a wrong letter in position four lands
    // here rather than being believed.
    expect(parsePan("BQEXG1234F")).toBeNull();
    expect(parsePan("BQEZG1234F")).toBeNull();
  });

  it("refuses anything not shaped like a PAN", () => {
    expect(parsePan("BQEPG12345")).toBeNull(); // digit where the last letter goes
    expect(parsePan("BQEP1234F")).toBeNull(); // four letters, not five
    expect(parsePan("BQEPG123F")).toBeNull(); // three digits
    expect(parsePan("")).toBeNull();
    expect(parsePan("PERMANENT ACCOUNT NUMBER")).toBeNull();
  });

  it("does not repair a near-miss into a valid number", () => {
    // `O` for `0` is the obvious substitution and making it would manufacture
    // the validation this exists to perform.
    expect(parsePan("BQEPG1O34F")).toBeNull();
  });
});

describe("findPan", () => {
  it("finds the number among the rest of the card", () => {
    const words = [
      "INCOME",
      "TAX",
      "DEPARTMENT",
      "Permanent",
      "Account",
      "Number",
      "BQEPG1234F",
      "Name",
      "ASHA",
      "KUMARI",
    ];

    expect(findPan(words)?.number).toBe("BQEPG1234F");
  });

  it("joins the pieces a wide-tracked number is split into", () => {
    expect(findPan(["Number", "BQEPG", "1234", "F"])?.number).toBe("BQEPG1234F");
    expect(findPan(["BQEPG1234", "F"])?.number).toBe("BQEPG1234F");
  });

  it("does not join more than three words", () => {
    // A wider window starts stitching the number to the date of birth beneath
    // it, and a ten-character shape can be found inside almost any long
    // enough run of capitals and digits.
    expect(findPan(["B", "QEPG", "12", "34F"])).toBeNull();
  });

  it("returns nothing when the card carries no PAN", () => {
    expect(findPan(["DRIVING", "LICENCE", "DL", "0420110149646"])).toBeNull();
  });

  it("takes the first valid reading, which is the printed one", () => {
    expect(findPan(["BQEPG1234F", "AABCG9999M"])?.number).toBe("BQEPG1234F");
  });
});

describe("surnameAgrees", () => {
  const individual = parsePan("BQEPG1234F")!;
  const company = parsePan("AABCG1234M")!;

  it("matches when the fifth character is the surname's initial", () => {
    expect(surnameAgrees(individual, "GUPTA")).toBe("match");
    expect(surnameAgrees(individual, "  gupta ")).toBe("match");
  });

  it("reports a mismatch, which is a fact and not an error", () => {
    // The requirement is the PAN of whoever is paying, which is routinely a
    // parent or a spouse. See `panOutcomeToPhase`.
    expect(surnameAgrees(individual, "SHARMA")).toBe("mismatch");
  });

  it("declines to compare a company's PAN against a traveller's surname", () => {
    // The fifth letter of a company's PAN comes from the company's name.
    expect(surnameAgrees(company, "GUPTA")).toBe("unknown");
  });

  it("declines when there is no surname to compare against", () => {
    expect(surnameAgrees(individual, undefined)).toBe("unknown");
    expect(surnameAgrees(individual, "   ")).toBe("unknown");
  });
});
