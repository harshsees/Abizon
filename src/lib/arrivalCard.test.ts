import { describe, expect, it } from "vitest";

import {
  ARRIVAL_CARDS,
  arrivalCardFor,
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
    // Every entry ships unverified, so this is presently the whole table.
    for (const slug of pendingArrivalCardSlugs()) {
      expect(arrivalCardFor(slug)).toBeUndefined();
    }
  });

  it("has no way to fetch one regardless of status", () => {
    // Reaching into ARRIVAL_CARDS directly is possible and is the thing the
    // accessor exists to discourage. This pins the accessor's contract: status
    // is checked inside it, not left to each caller to remember.
    expect(ARRIVAL_CARDS.thailand?.status).toBe("unverified");
    expect(arrivalCardFor("thailand")).toBeUndefined();
  });

  it("returns nothing for a destination with no scheme at all", () => {
    expect(arrivalCardFor("france")).toBeUndefined();
    expect(arrivalCardFor("")).toBeUndefined();
  });
});

describe("the table itself", () => {
  it("points every scheme at its own government", () => {
    // The applicant can always be sent to the real submission page, and a
    // wrong host here would send them to whoever registered the lookalike.
    for (const [slug, card] of Object.entries(ARRIVAL_CARDS)) {
      const url = new URL(card.officialUrl);
      expect(url.protocol, `${slug} must be https`).toBe("https:");
      expect(
        /\.gov(\.[a-z]{2})?$|\.go\.[a-z]{2}$|\.gov\.[a-z]{2}$/.test(url.hostname),
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

  it("lists the pending entries in a stable order", () => {
    // So the "still to confirm" list reads the same on every machine.
    const pending = pendingArrivalCardSlugs();
    expect(pending).toEqual([...pending].sort());
  });
});
