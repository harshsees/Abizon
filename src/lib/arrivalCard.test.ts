import { describe, expect, it } from "vitest";

import {
  ARRIVAL_CARDS,
  arrivalCardFields,
  arrivalCardFor,
  arrivalCardSlugs,
  DEFAULT_ARRIVAL_CARD_FIELDS,
  pendingArrivalCardSlugs,
} from "./arrivalCard";

/**
 * The rule worth testing here is not "does the table contain Thailand". It is
 * that an unchecked entry cannot reach a page — because the failure mode is
 * telling somebody a card is optional when their airline will not board them
 * without it.
 */
describe("unverified entries stay off the site", () => {
  it("returns nothing for an entry that has not been confirmed", () => {
    for (const slug of pendingArrivalCardSlugs()) {
      expect(arrivalCardFor(slug)).toBeUndefined();
    }
  });

  it("has no way to fetch one regardless of status", () => {
    // Reaching into ARRIVAL_CARDS directly is possible and is the thing the
    // accessor exists to discourage. This pins the accessor's contract: status
    // is checked inside it, not left to each caller to remember.
    expect(ARRIVAL_CARDS.singapore?.status).toBe("unverified");
    expect(arrivalCardFor("singapore")).toBeUndefined();
  });

  it("returns nothing for a destination with no scheme at all", () => {
    expect(arrivalCardFor("france")).toBeUndefined();
    expect(arrivalCardFor("")).toBeUndefined();
  });

  it("lists the pending entries in a stable order", () => {
    const pending = pendingArrivalCardSlugs();
    expect(pending).toEqual([...pending].sort());
  });
});

/**
 * The live set. Pinned because it is an editorial decision — the destinations
 * a competitor offers a free arrival-card flow for, measured on the date in
 * `ARRIVAL_CARDS_CHECKED_ON` — and not something derivable from the data. A
 * sixth destination appearing here should be a decision somebody made, not a
 * diff nobody noticed.
 */
describe("the destinations that are live", () => {
  it("is exactly the five that were measured", () => {
    expect(arrivalCardSlugs()).toEqual([
      "malaysia",
      "maldives",
      "mauritius",
      "sri-lanka",
      "thailand",
    ]);
  });

  it("resolves each of them", () => {
    for (const slug of arrivalCardSlugs()) {
      expect(arrivalCardFor(slug), slug).toBeDefined();
    }
  });
});

describe("the table itself", () => {
  it("points every scheme at its own government", () => {
    // The applicant can always be sent to the real submission page, and a
    // wrong host here would send them to whoever registered the lookalike.
    //
    // `govmu.org` is in the list because that is the domain the Mauritian
    // government actually uses for its own services — there is no .gov.mu.
    const GOVERNMENT_HOST =
      /(^|\.)gov(\.[a-z]{2})?$|(^|\.)go\.[a-z]{2}$|(^|\.)govmu\.org$/;

    for (const [slug, card] of Object.entries(ARRIVAL_CARDS)) {
      const url = new URL(card.officialUrl);
      expect(url.protocol, `${slug} must be https`).toBe("https:");
      expect(
        GOVERNMENT_HOST.test(url.hostname),
        `${slug} points at ${url.hostname}, which is not a government host`,
      ).toBe(true);
    }
  });

  it("describes every scheme as free, because none of them charge", () => {
    // If one ever does, it is a visa or a service fee and does not belong in
    // this table — the whole premise of the flow is that it costs nothing.
    for (const card of Object.values(ARRIVAL_CARDS)) {
      expect(card.free).toBe(true);
    }
  });

  it("gives a submission window wherever it claims one", () => {
    // Submitting too early is the most common way this goes wrong, so a window
    // of zero or a negative number would be worse than none at all.
    for (const [slug, card] of Object.entries(ARRIVAL_CARDS)) {
      if (card.submitWithinDaysOfArrival === undefined) continue;
      expect(card.submitWithinDaysOfArrival, slug).toBeGreaterThan(0);
    }
  });

  it("gives every scheme a noun that reads in a sentence", () => {
    // The headline is built as "your {noun}", so a scheme name here — "your
    // Thailand Digital Arrival Card" — would read as a proper noun in the
    // middle of a sentence that is not about one.
    for (const [slug, card] of Object.entries(ARRIVAL_CARDS)) {
      expect(card.noun, slug).toMatch(/^[a-z][a-z ]+$/);
    }
  });
});

describe("the form each destination asks for", () => {
  it("falls back to the default field set", () => {
    const card = arrivalCardFor("thailand");
    expect(card).toBeDefined();
    expect(arrivalCardFields(card!)).toBe(DEFAULT_ARRIVAL_CARD_FIELDS);
  });

  it("gives every select its options, and nothing else any", () => {
    // A select with no options renders a control whose only choice is the
    // placeholder, which is a field the traveller cannot fill.
    for (const [slug, card] of Object.entries(ARRIVAL_CARDS)) {
      for (const field of arrivalCardFields(card)) {
        if (field.kind === "select") {
          expect(field.options?.length, `${slug}.${field.key}`).toBeGreaterThan(0);
        } else {
          expect(field.options, `${slug}.${field.key}`).toBeUndefined();
        }
      }
    }
  });

  it("never lists the same field twice", () => {
    for (const [slug, card] of Object.entries(ARRIVAL_CARDS)) {
      const keys = arrivalCardFields(card).map((field) => field.key);
      expect(new Set(keys).size, slug).toBe(keys.length);
    }
  });
});

describe("the questions behind the FAQ control", () => {
  it("answers them for every live destination", () => {
    for (const slug of arrivalCardSlugs()) {
      const card = arrivalCardFor(slug)!;
      expect(card.faqs?.length, slug).toBeGreaterThan(0);
      for (const faq of card.faqs ?? []) {
        expect(faq.question.length, slug).toBeGreaterThan(0);
        expect(faq.answer.length, slug).toBeGreaterThan(0);
      }
    }
  });

  it("never says Abizon submits the form", () => {
    // The one claim this flow must never make. Abizon cannot file any of
    // these, and a FAQ answer is exactly where a reassuring sentence would
    // get written by somebody who did not know that.
    for (const slug of arrivalCardSlugs()) {
      const card = arrivalCardFor(slug)!;
      const text = (card.faqs ?? [])
        .map((faq) => `${faq.question} ${faq.answer}`)
        .join(" ")
        .toLowerCase();
      expect(text, slug).not.toMatch(/we (will )?submit|we file|on your behalf we/);
    }
  });
});
