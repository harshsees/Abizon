import { describe, expect, it } from "vitest";

import { countriesData } from "@/data/countries";
import { VISA_CATALOGUE, visaOptionsFor } from "@/data/visaOptions";

import { ageOn, quoteVisa } from "./visaPricing";

const ON = new Date("2026-10-29T12:00:00Z");
const ADULT = { dateOfBirth: "1990-05-01" };
const CHILD = { dateOfBirth: "2018-03-01" };

describe("quoteVisa", () => {
  it("prices a UAE 30-day family: adults, the first child, then each further child", () => {
    const quote = quoteVisa("ae", 0, [ADULT, ADULT, CHILD, CHILD], ON);
    // 2 × 8,400 + 8,800 + 3,500
    expect(quote?.total).toBe(29100);
    expect(quote?.lines.map((l) => [l.label, l.count, l.amount])).toEqual([
      ["Adults", 2, 16800],
      ["Child", 1, 8800],
      ["Additional child", 1, 3500],
    ]);
  });

  it("prices every UAE 60-day child at 5,000", () => {
    expect(quoteVisa("ae", 2, [ADULT, CHILD, CHILD], ON)?.total).toBe(13999 + 5000 + 5000);
  });

  it("prices a traveller with no date of birth as an adult", () => {
    expect(quoteVisa("ae", 0, [ADULT, {}], ON)?.total).toBe(16800);
  });

  it("does not split children where the option does not price them", () => {
    expect(quoteVisa("ae", 1, [ADULT, CHILD], ON)?.total).toBe(2 * 13999);
  });

  it("charges the New Zealand couple visa once, and only for two travellers", () => {
    expect(quoteVisa("nz", 1, 2, ON)?.total).toBe(34800);
    const single = quoteVisa("nz", 1, 1, ON);
    expect(single?.total).toBeNull();
    expect(single?.problem).toMatch(/exactly 2 travellers/);
  });

  it("uses the corrected prices", () => {
    expect(quoteVisa("id", 0, 1, ON)?.total).toBe(4300);
    expect(quoteVisa("tz", 0, 1, ON)?.option.title).toMatch(/business/);
    expect(quoteVisa("tz", 0, 1, ON)?.total).toBe(6450);
    expect(quoteVisa("tz", 1, 1, ON)?.total).toBe(26750);
  });

  it("falls back to the first option for an index the destination does not have", () => {
    expect(quoteVisa("qa", 5, 1, ON)?.index).toBe(0);
  });

  it("has no price for a callback destination", () => {
    expect(quoteVisa("fr", 0, 1, ON)).toBeNull();
    expect(quoteVisa("us", 0, 1, ON)).toBeNull();
  });
});

describe("ageOn", () => {
  it("counts a birthday not yet reached this year", () => {
    expect(ageOn("2008-11-01", ON)).toBe(17);
    expect(ageOn("2008-10-29", ON)).toBe(18);
  });
});

describe("the catalogue", () => {
  it("lists exactly the catalogue's destinations, priorities first", () => {
    expect(countriesData.map((c) => c.code)).toEqual(VISA_CATALOGUE.map((e) => e.code));
    expect(countriesData.slice(0, 6).map((c) => c.code)).toEqual(["ae", "om", "qa", "au", "bh", "az"]);
  });

  it("summarises each priced destination by its cheapest option", () => {
    const uae = countriesData.find((c) => c.code === "ae");
    expect(uae?.fees).toBe("₹8,400");
    const nz = countriesData.find((c) => c.code === "nz");
    expect(nz?.fees).toBe("₹17,400"); // the couple visa, per person
  });

  it("gives every priced option a whole-rupee price", () => {
    for (const entry of VISA_CATALOGUE) {
      for (const option of visaOptionsFor(entry.code)) {
        expect(Number.isInteger(option.price)).toBe(true);
        expect(option.price).toBeGreaterThan(0);
      }
    }
  });
});
