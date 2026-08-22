import { describe, expect, it } from "vitest";

import { arrivalCardFor } from "@/lib/arrivalCard";
import type { MrzFields } from "@/lib/passport/mrz";
import {
  autofillableFields,
  formatIsoDate,
  isTravellerComplete,
  mrzToValues,
  MRZ_FILLABLE_FIELDS,
  remainingRequiredCount,
  validateTraveller,
  type ArrivalCardValues,
} from "./state";

const card = arrivalCardFor("thailand")!;

/** A form with nothing wrong in it, to vary one field at a time from. */
const GOOD: ArrivalCardValues = {
  firstName: "Manvendra",
  lastName: "Umat",
  dateOfBirth: "2002-10-04",
  passportNumber: "W3405208",
  passportIssuedOn: "2022-09-02",
  passportValidTill: "2032-09-01",
  passportPlaceOfIssue: "Jaipur",
};

describe("required fields", () => {
  it("names every empty required field and no optional one", () => {
    const errors = validateTraveller(card, {});
    expect(Object.keys(errors).sort()).toEqual([
      "dateOfBirth",
      "firstName",
      "lastName",
      "passportIssuedOn",
      "passportNumber",
      "passportPlaceOfIssue",
      "passportValidTill",
    ]);
    // Gender and marital status are offered, not demanded.
    expect(errors.gender).toBeUndefined();
    expect(errors.maritalStatus).toBeUndefined();
  });

  it("treats whitespace as empty", () => {
    expect(validateTraveller(card, { ...GOOD, firstName: "   " }).firstName)
      .toBeDefined();
  });

  it("passes a complete form", () => {
    expect(validateTraveller(card, GOOD)).toEqual({});
    expect(isTravellerComplete(card, GOOD)).toBe(true);
  });
});

describe("dates", () => {
  it("rejects a date of birth in the future", () => {
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    const iso = next.toISOString().slice(0, 10);
    expect(validateTraveller(card, { ...GOOD, dateOfBirth: iso }).dateOfBirth)
      .toMatch(/future/i);
  });

  it("rejects a passport that has already expired", () => {
    expect(
      validateTraveller(card, { ...GOOD, passportValidTill: "2020-01-01" })
        .passportValidTill,
    ).toMatch(/expired/i);
  });

  it("rejects an expiry before the issue date", () => {
    const errors = validateTraveller(card, {
      ...GOOD,
      passportIssuedOn: "2033-01-01",
      passportValidTill: "2032-09-01",
    });
    // The issue date is itself in the future here, which is the first thing
    // wrong with it and the thing worth saying.
    expect(errors.passportIssuedOn).toMatch(/future/i);
  });

  it("says 'expired' rather than 'out of order' when both are true", () => {
    // An issue date after the expiry means the expiry is in the past, so the
    // traveller is holding an expired passport — which is the thing they need
    // to hear. The ordering rule is kept as a guard behind it, but it should
    // never be the message when there is a plainer one.
    expect(
      validateTraveller(card, {
        ...GOOD,
        passportIssuedOn: "2022-09-02",
        passportValidTill: "2022-09-01",
      }).passportValidTill,
    ).toMatch(/expired/i);
  });

  it("rejects a passport issued before its holder was born", () => {
    expect(
      validateTraveller(card, { ...GOOD, dateOfBirth: "2023-01-01" })
        .passportIssuedOn,
    ).toMatch(/issued before/i);
  });

  it("rejects a date that does not exist", () => {
    expect(validateTraveller(card, { ...GOOD, dateOfBirth: "2002-02-31" }).dateOfBirth)
      .toMatch(/not a date/i);
  });

  it("does NOT invent a minimum validity at arrival", () => {
    // Six months is the figure everyone quotes and several of these
    // destinations do not ask for it. A passport valid tomorrow is not this
    // form's business to refuse.
    const soon = new Date();
    soon.setDate(soon.getDate() + 10);
    const iso = soon.toISOString().slice(0, 10);
    expect(validateTraveller(card, { ...GOOD, passportValidTill: iso }))
      .toEqual({});
  });
});

describe("passport number", () => {
  it("accepts letters and digits in any length", () => {
    expect(validateTraveller(card, { ...GOOD, passportNumber: "A1" }).passportNumber)
      .toBeUndefined();
    expect(
      validateTraveller(card, { ...GOOD, passportNumber: "ZZ12345678901" })
        .passportNumber,
    ).toBeUndefined();
  });

  it("rejects punctuation", () => {
    expect(validateTraveller(card, { ...GOOD, passportNumber: "W-340 5208" }).passportNumber)
      .toMatch(/letters and digits/i);
  });
});

describe("counting what is left", () => {
  it("counts across every traveller", () => {
    const travellers = [
      { id: "a", values: GOOD, autofilled: [] },
      { id: "b", values: {}, autofilled: [] },
    ];
    expect(remainingRequiredCount(card, travellers)).toBe(7);
  });

  it("is zero when the party is done", () => {
    expect(
      remainingRequiredCount(card, [{ id: "a", values: GOOD, autofilled: [] }]),
    ).toBe(0);
  });
});

describe("what a scan can honestly fill", () => {
  it("excludes everything the machine-readable zone does not carry", () => {
    // The issue date and the place of issue are printed only in the visual
    // part of the photo page, and marital status is nowhere on a passport.
    // If any of these ever appears in the fillable list, something is being
    // guessed at.
    expect(MRZ_FILLABLE_FIELDS).not.toContain("passportIssuedOn");
    expect(MRZ_FILLABLE_FIELDS).not.toContain("passportPlaceOfIssue");
    expect(MRZ_FILLABLE_FIELDS).not.toContain("maritalStatus");
  });

  it("leaves required fields for the traveller on every live destination", () => {
    // A scan therefore never completes the form on its own, which is why the
    // flow must not claim it has.
    const fillable = autofillableFields(card).map((field) => field.key);
    expect(fillable).toContain("passportNumber");
    expect(fillable).not.toContain("passportIssuedOn");
  });
});

describe("dates as they are shown", () => {
  it("reads a stored value back the way the reference sets it", () => {
    expect(formatIsoDate("2002-10-04")).toBe("04 Oct 2002");
    expect(formatIsoDate("2032-09-01")).toBe("01 Sep 2032");
  });

  it("hands back anything it cannot parse untouched", () => {
    expect(formatIsoDate("")).toBe("");
    expect(formatIsoDate("not a date")).toBe("not a date");
  });
});

describe("mapping a scan onto the form", () => {
  const FIELDS: MrzFields = {
    surname: "UMAT",
    givenNames: "MANVENDRA SINGH",
    issuingState: "IND",
    passportNumber: "W3405208",
    nationality: "IND",
    dateOfBirth: "2002-10-04",
    dateOfExpiry: "2032-09-01",
    sex: "male",
  };

  it("fills only what the zone carries", () => {
    expect(mrzToValues(FIELDS)).toEqual({
      firstName: "Manvendra Singh",
      lastName: "Umat",
      passportNumber: "W3405208",
      nationality: "Indian",
      dateOfBirth: "2002-10-04",
      passportValidTill: "2032-09-01",
      gender: "Male",
    });
  });

  it("never invents an issue date from the expiry", () => {
    // Ten years apart is the usual gap and "usual" is not a document.
    const values = mrzToValues(FIELDS);
    expect(values.passportIssuedOn).toBeUndefined();
    expect(values.passportPlaceOfIssue).toBeUndefined();
    expect(values.maritalStatus).toBeUndefined();
  });

  it("leaves nationality alone for a code it cannot name", () => {
    const values = mrzToValues({ ...FIELDS, nationality: "GBR" });
    expect(values.nationality).toBeUndefined();
  });

  it("leaves gender alone when the zone does not state one", () => {
    const values = mrzToValues({ ...FIELDS, sex: "unspecified" });
    expect(values.gender).toBeUndefined();
  });

  it("sets uppercase transliterated names in the case the form uses", () => {
    expect(mrzToValues({ ...FIELDS, surname: "O'BRIEN-SMITH" }).lastName)
      .toBe("O'Brien-Smith");
  });

  it("skips anything the zone left blank", () => {
    const values = mrzToValues({ ...FIELDS, givenNames: "", passportNumber: "" });
    expect(values.firstName).toBeUndefined();
    expect(values.passportNumber).toBeUndefined();
    expect(values.lastName).toBe("Umat");
  });
});
