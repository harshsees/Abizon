/**
 * KEYRISE COMMERCIAL TERMS — the one place a business decision lands.
 *
 * WHAT THIS REPLACES. `PLACEHOLDER_PRICING` in `countryVisa.ts`, which held the
 * same two numbers with an honest comment above them. The comment said:
 *
 *   "UNVERIFIED. These two numbers are not Keyrise data. Centralising them here
 *    does not make them true; it makes them *one* lie instead of three."
 *
 * That was correct and it was not enough, because the status lived only in a
 * comment. Every consumer read `PLACEHOLDER_PRICING.serviceFee` and got a plain
 * `1499` — a number indistinguishable, at the type level and on the page, from
 * a fee somebody had actually agreed. Nothing in the code or the UI could tell
 * a provisional figure from a settled one.
 *
 * So the status is now data. `status: "provisional"` travels with the numbers,
 * `computeTotals` propagates it, and the fee breakdown says so on the page.
 *
 * ── TO SET THE REAL TERMS ──────────────────────────────────────────────────
 * Replace the values below and set `status: "verified"`. Nothing else in the
 * codebase needs to change: the provisional labelling disappears from every
 * surface on its own, because every surface reads the status from here.
 *
 * ── IF A FEE IS NOT YET DECIDED ────────────────────────────────────────────
 * Set it to `null`, not to a guess and not to `0`. `null` means "unknown" and
 * propagates as an absent total; `0` would mean "we charge nothing", which is
 * a different claim and a false one. §7 of the phase brief asks the pricing
 * architecture to support a missing fee rather than invent one — that is what
 * `null` is for, and `computeTotals` is written to handle it.
 */

export type FeeStatus =
  /** Agreed commercial terms. Publishable as final pricing. */
  | "verified"
  /** A working number, carried from the pre-Phase-7 components. Not agreed. */
  | "provisional";

export type CommercialTerms = {
  /** Keyrise's handling charge per traveller. `null` when undecided. */
  serviceFee: number | null;
  /** Added to the service fee for expedited handling. `null` when undecided. */
  expressSurcharge: number | null;
  /** Applied to the service component only, never to the government fee. */
  gstRate: number;
  status: FeeStatus;
};

/**
 * PROVISIONAL — REQUIRES BUSINESS CONFIRMATION.
 *
 * Provenance of each number, so whoever confirms them knows what they are
 * confirming rather than rubber-stamping a value of unknown origin:
 *
 *   serviceFee 1499        One of three figures that used to be hardcoded in
 *                          three components. `ApplicationCard` used 499 and
 *                          1999, `FeeBreakdown` used 1499, so the same page
 *                          quoted three different service fees depending on
 *                          where you looked. 1499 was chosen in Phase 5 because
 *                          it was the one the fee breakdown showed, not because
 *                          anyone priced it.
 *
 *   expressSurcharge 1500  Carried over verbatim from the old plan selector's
 *                          flat "+1500" for express. Same provenance: it is
 *                          what the code did, not what the business decided.
 *
 *   gstRate 0.18           This one is NOT provisional in the same sense. 18%
 *                          is the statutory Indian GST rate for this service
 *                          category; it is a rate set by law rather than by
 *                          Keyrise, so it does not need commercial sign-off.
 *                          It is grouped here because it belongs to the same
 *                          calculation, and it is why `status` describes the
 *                          two fees rather than the whole object.
 */
export const KEYRISE_TERMS: CommercialTerms = {
  serviceFee: 1499,
  expressSurcharge: 1500,
  gstRate: 0.18,
  status: "provisional",
};

/** True when the fees above are still awaiting commercial sign-off. */
export const feesAreProvisional = KEYRISE_TERMS.status === "provisional";

/**
 * How an undecided fee prints, everywhere, in words.
 *
 * Not "₹0" — that says the charge is nil, which is a different claim and a
 * false one. Not "—" either: on a fee table a dash reads as nil too. One
 * constant so the five surfaces that can show a price cannot drift into five
 * different euphemisms.
 */
export const FEE_NOT_PUBLISHED = "Not yet published";
