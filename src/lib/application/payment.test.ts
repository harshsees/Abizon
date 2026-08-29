import { describe, expect, it } from "vitest";

import {
  cardBlockingReason,
  cardLastFour,
  cardNumberComplete,
  cvvLength,
  detectCardBrand,
  expiryIsUsable,
  expiryParts,
  formatCardName,
  formatCardNumber,
  formatCvv,
  formatExpiry,
  invalidCardFields,
  passesLuhn,
  type CardFields,
} from "./payment";

/**
 * Test numbers are the published scheme test BINs — they pass Luhn and are
 * issued by nobody. There is no real card number anywhere in this file.
 */
const VISA = "4111 1111 1111 1111";
const MASTERCARD = "5555 5555 5555 4444";
const MASTERCARD_2_SERIES = "2223 0031 2200 3222";
const AMEX = "3782 822463 10005";
const RUPAY = "6521 1111 1111 1110";

/** Fixed clock, so "expired" never depends on the day the suite runs. */
const NOW = new Date("2026-08-29T00:00:00Z");

describe("detectCardBrand", () => {
  it("reads the brand from the prefix", () => {
    expect(detectCardBrand("4111")).toBe("visa");
    expect(detectCardBrand("5555")).toBe("mastercard");
    expect(detectCardBrand("3782")).toBe("amex");
    expect(detectCardBrand("6521")).toBe("rupay");
    expect(detectCardBrand("6011")).toBe("discover");
  });

  it("recognises the Mastercard 2-series", () => {
    // Matching only 51-55 would leave every card issued since 2017 unbadged.
    expect(detectCardBrand("2223")).toBe("mastercard");
    expect(detectCardBrand("2720")).toBe("mastercard");
    // Just outside the range on both sides.
    expect(detectCardBrand("2220")).toBeUndefined();
    expect(detectCardBrand("2721")).toBeUndefined();
  });

  it("claims nothing when the prefix is ambiguous", () => {
    expect(detectCardBrand("")).toBeUndefined();
    expect(detectCardBrand("9")).toBeUndefined();
    // A 6 that is neither a known RuPay nor a known Discover range.
    expect(detectCardBrand("6300")).toBeUndefined();
  });
});

describe("formatCardNumber", () => {
  it("groups in fours", () => {
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
  });

  it("groups Amex 4-6-5, as it is printed on the card", () => {
    expect(formatCardNumber("378282246310005")).toBe("3782 822463 10005");
  });

  it("keeps partial input stable as it is typed", () => {
    expect(formatCardNumber("4")).toBe("4");
    expect(formatCardNumber("41111")).toBe("4111 1");
  });

  it("strips anything that is not a digit and caps the length", () => {
    expect(formatCardNumber("4111-1111-1111-1111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("41111111111111119999")).toBe("4111 1111 1111 1111 999");
  });
});

describe("formatExpiry", () => {
  it("inserts the separator once there is a year to separate", () => {
    expect(formatExpiry("12")).toBe("12");
    expect(formatExpiry("122")).toBe("12 / 2");
    expect(formatExpiry("1229")).toBe("12 / 29");
  });

  it("pads a first digit that can only be a month", () => {
    // "3" cannot begin a month, so it is March rather than a dead end.
    expect(formatExpiry("3")).toBe("03");
    expect(formatExpiry("1")).toBe("1");
  });

  it("parses back to numbers without re-reading the display string", () => {
    expect(expiryParts("12 / 29")).toEqual({ month: 12, year: 2029 });
    expect(expiryParts("12")).toBeUndefined();
  });
});

describe("formatCardName", () => {
  it("drops digits, because no card carries them", () => {
    expect(formatCardName("PRIYA4 SHARMA9")).toBe("PRIYA SHARMA");
  });

  it("keeps the punctuation real names use", () => {
    expect(formatCardName("D'SOUZA-RAO JR.")).toBe("D'SOUZA-RAO JR.");
  });
});

describe("formatCvv", () => {
  it("allows four digits for Amex and three for everyone else", () => {
    expect(formatCvv("1234", "amex")).toBe("1234");
    expect(formatCvv("1234", "visa")).toBe("123");
    expect(cvvLength(undefined)).toBe(3);
  });
});

describe("passesLuhn", () => {
  it("accepts the scheme test numbers", () => {
    for (const number of [VISA, MASTERCARD, MASTERCARD_2_SERIES, AMEX, RUPAY]) {
      expect(passesLuhn(number.replace(/\D/g, ""))).toBe(true);
    }
  });

  it("catches a single transposed digit", () => {
    expect(passesLuhn("4111111111111112")).toBe(false);
  });
});

describe("cardNumberComplete", () => {
  it("holds each brand to its own length", () => {
    expect(cardNumberComplete(VISA)).toBe(true);
    expect(cardNumberComplete(AMEX)).toBe(true);
    // A valid Amex checksum is still not a valid 16-digit card.
    expect(cardNumberComplete("3782 822463 1000")).toBe(false);
  });

  it("rejects a number that is long enough but does not check out", () => {
    expect(cardNumberComplete("4111 1111 1111 1112")).toBe(false);
  });
});

describe("expiryIsUsable", () => {
  it("treats the expiry month as inclusive", () => {
    // NOW is August 2026, so a card marked 08/26 is good all month.
    expect(expiryIsUsable("08 / 26", NOW)).toBe(true);
    expect(expiryIsUsable("07 / 26", NOW)).toBe(false);
    expect(expiryIsUsable("09 / 26", NOW)).toBe(true);
  });

  it("rejects an impossible month and an implausible year", () => {
    expect(expiryIsUsable("13 / 29", NOW)).toBe(false);
    expect(expiryIsUsable("00 / 29", NOW)).toBe(false);
    expect(expiryIsUsable("06 / 99", NOW)).toBe(false);
  });
});

describe("cardBlockingReason", () => {
  const valid: CardFields = {
    number: VISA,
    name: "PRIYA SHARMA",
    expiry: "09 / 29",
    cvv: "123",
  };

  it("passes a complete card", () => {
    expect(cardBlockingReason(valid, NOW)).toBeUndefined();
  });

  it("names the first problem going down the form, not the last rule to fail", () => {
    // Everything below the number is empty too; the number is still what it
    // reports, because that is the field the applicant is looking at.
    expect(
      cardBlockingReason({ number: "", name: "", expiry: "", cvv: "" }, NOW),
    ).toBe("Enter your card number.");
  });

  it("distinguishes an unfinished number from an impossible one", () => {
    expect(cardBlockingReason({ ...valid, number: "4111 11" }, NOW)).toBe(
      "That card number looks too short.",
    );
    expect(cardBlockingReason({ ...valid, number: "4111 1111 1111 1112" }, NOW)).toBe(
      "Check the card number — one of the digits is not right.",
    );
  });

  it("says where the security code is printed, which differs on Amex", () => {
    expect(cardBlockingReason({ ...valid, cvv: "12" }, NOW)).toContain(
      "back of the card",
    );
    expect(
      cardBlockingReason({ ...valid, number: AMEX, cvv: "123" }, NOW),
    ).toContain("front of the card");
  });

  it("reports a past expiry rather than an incomplete one", () => {
    expect(cardBlockingReason({ ...valid, expiry: "01 / 20" }, NOW)).toBe(
      "That expiry date has passed.",
    );
    expect(cardBlockingReason({ ...valid, expiry: "01" }, NOW)).toBe(
      "Enter the expiry date.",
    );
  });

  it("never claims a card will work — only that its shape is possible", () => {
    // A made-up number that satisfies Luhn passes, and that is the ceiling of
    // what a client can honestly assert. See the header of payment.ts.
    expect(cardBlockingReason({ ...valid, number: "4000 0000 0000 0002" }, NOW)).toBeUndefined();
  });
});

describe("invalidCardFields", () => {
  it("marks every field that is wrong, not just the first", () => {
    const invalid = invalidCardFields(
      { number: "4111", name: "", expiry: "01 / 20", cvv: "" },
      NOW,
    );
    expect([...invalid].sort()).toEqual(["cvv", "expiry", "name", "number"]);
  });

  it("marks nothing on a complete card", () => {
    const invalid = invalidCardFields(
      { number: MASTERCARD, name: "PRIYA SHARMA", expiry: "09 / 29", cvv: "123" },
      NOW,
    );
    expect(invalid.size).toBe(0);
  });
});

describe("cardLastFour", () => {
  it("returns the last four digits once there are four", () => {
    expect(cardLastFour(VISA)).toBe("1111");
    expect(cardLastFour("411")).toBeUndefined();
  });
});
