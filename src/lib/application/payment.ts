/**
 * CARD FIELD LOGIC — formatting, brand detection, and shape validation.
 * ---------------------------------------------------------------------------
 * Pure functions, no React, so the rules a card field enforces can be tested
 * without mounting a form. `PaymentStep` is then a view over these.
 *
 * WHAT "VALID" MEANS HERE, AND WHAT IT DOES NOT.
 *
 * Everything in this file is a check on the *shape* of what was typed. Luhn
 * says the digits are self-consistent; it says nothing about whether the card
 * exists, has funds, or belongs to the person holding it. Only an acquirer
 * knows that, and there is no acquirer — see `paymentConfig.ts`.
 *
 * That distinction is the whole reason these are separate: a client-side check
 * that catches a transposed digit before a round trip is worth having, and a
 * client-side check that lets the UI *say* a card is good is not. So the
 * strongest thing `cardBlockingReason` returns is "this cannot be a card
 * number", never "this card will work".
 *
 * The reason-not-boolean shape matches `blockingReason` in `state.ts`: a
 * disabled button that cannot say what is missing is the single complaint that
 * flow was rebuilt to answer.
 */

/* -------------------------------------------------------------------------- */
/* Brands                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The brand badge on the card face and in the number field.
 *
 * The design hardcodes VISA. Detecting it instead fills the same slot with
 * something true, and RuPay earns its place in a rupee checkout — it is the
 * domestic scheme and a large share of Indian debit cards carry it.
 *
 * Prefixes only, which is what a client can know. The authoritative BIN range
 * belongs to the acquirer, and a wrong guess here costs a wrong logo rather
 * than a wrong charge.
 */
export type CardBrand = "visa" | "mastercard" | "amex" | "rupay" | "discover";

export const CARD_BRAND_LABEL: Record<CardBrand, string> = {
  visa: "VISA",
  mastercard: "MASTERCARD",
  amex: "AMEX",
  rupay: "RuPay",
  discover: "DISCOVER",
};

/** Digits a completed number holds, per brand. Amex is the odd one at 15. */
const BRAND_LENGTHS: Record<CardBrand, number[]> = {
  visa: [13, 16, 19],
  mastercard: [16],
  amex: [15],
  rupay: [16],
  discover: [16, 19],
};

/** The CVV length a brand asks for. Amex prints four, everyone else three. */
const BRAND_CVV_LENGTH: Record<CardBrand, number> = {
  visa: 3,
  mastercard: 3,
  amex: 4,
  rupay: 3,
  discover: 3,
};

export const DEFAULT_CVV_LENGTH = 3;
/** Longest a number can get, so the input can cap itself before a brand is known. */
export const MAX_CARD_DIGITS = 19;

/**
 * Whether a partially typed prefix could still fall inside a numeric BIN range.
 *
 * Written as arithmetic rather than as a regex because the ranges that matter
 * are not alternations of digits — Mastercard's second series is 2221–2720, and
 * the regex spelling of that is both unreadable and, on the first attempt here,
 * wrong: it admitted 2220. The prefix is padded low and high to the range's
 * width and the two spans are tested for overlap, so "222" is still a possible
 * Mastercard while "2220" is definitively not.
 */
function prefixInRange(digits: string, low: number, high: number): boolean {
  if (digits.length === 0) return false;
  const width = String(high).length;
  const head = digits.slice(0, width);
  const lowest = Number(head.padEnd(width, "0"));
  const highest = Number(head.padEnd(width, "9"));
  return highest >= low && lowest <= high;
}

/**
 * RuPay first, because its 6521/6522 sit inside Discover's broader 65.
 * Order is load-bearing; these are not interchangeable lists.
 */
const RUPAY_PREFIXES = ["6521", "6522", "6069", "6080", "6081", "6082"] as const;
const DISCOVER_PREFIXES = ["6011", "65", "644", "645", "646", "647", "648", "649"] as const;

export function detectCardBrand(digits: string): CardBrand | undefined {
  if (digits.length === 0) return undefined;

  if (digits.startsWith("4")) return "visa";
  if (/^3[47]/.test(digits)) return "amex";

  // Mastercard: the original 51–55, plus the 2221–2720 series live since 2017.
  // Matching only 51–55 would leave a card issued in the last several years
  // with no logo at all.
  if (/^5[1-5]/.test(digits)) return "mastercard";
  if (digits.startsWith("2") && prefixInRange(digits, 2221, 2720)) {
    return "mastercard";
  }

  // THE 6 SPACE IS CONTESTED. RuPay and Discover both issue in it, and the
  // overlap is real rather than an artefact of these lists being short. Each
  // brand gets its own unambiguous prefixes and anything else beginning 6 is
  // left unbadged — an absent logo is a smaller error than a confident wrong
  // one, and the acquirer settles it either way.
  if (digits.startsWith("6")) {
    // Nothing is decided before the fourth digit. "65" genuinely belongs to
    // both — it is Discover's own range and the opening of RuPay's 6521/6522 —
    // so badging earlier means showing a logo and then changing it under the
    // applicant while they are still reading the number off the card.
    if (digits.length < 4) return undefined;
    if (RUPAY_PREFIXES.some((prefix) => digits.startsWith(prefix))) return "rupay";
    if (DISCOVER_PREFIXES.some((prefix) => digits.startsWith(prefix))) return "discover";
    return undefined;
  }

  return undefined;
}

export function cvvLength(brand: CardBrand | undefined): number {
  return brand ? BRAND_CVV_LENGTH[brand] : DEFAULT_CVV_LENGTH;
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

export function cardDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, MAX_CARD_DIGITS);
}

/**
 * Group the number the way it is printed on the card.
 *
 * Amex is 4-6-5, not 4-4-4-4. Grouping it in fours makes an applicant checking
 * their typing against the card in their hand read across a different rhythm
 * than the one embossed in front of them, which is exactly when digits get
 * dropped.
 */
export function formatCardNumber(value: string): string {
  const digits = cardDigits(value);
  const groups = detectCardBrand(digits) === "amex" ? [4, 6, 5] : [4, 4, 4, 4, 3];

  const parts: string[] = [];
  let cursor = 0;
  for (const size of groups) {
    if (cursor >= digits.length) break;
    parts.push(digits.slice(cursor, cursor + size));
    cursor += size;
  }
  return parts.join(" ");
}

/**
 * "MM / YY", built as the applicant types.
 *
 * A leading digit above 1 is a month on its own — typing "3" can only mean
 * March — so it is padded to "03" rather than waiting for a second digit that
 * would make the month impossible.
 */
export function formatExpiry(value: string): string {
  let digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length === 1 && digits > "1") digits = `0${digits}`;
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

/** Digits only, so callers never parse the display string. */
export function expiryParts(value: string): { month: number; year: number } | undefined {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 4) return undefined;
  const month = Number(digits.slice(0, 2));
  // Two-digit years are this century. A card expiring in 2099 is not a case
  // worth handling; a card expiring in 1926 is not a case at all.
  const year = 2000 + Number(digits.slice(2));
  return { month, year };
}

/**
 * The name as it is embossed. Digits are dropped as they are typed, because no
 * card carries them, and silently accepting one produces a mismatch at the
 * acquirer whose cause the applicant cannot see.
 */
export function formatCardName(value: string): string {
  return value.replace(/[^A-Za-z .'\-]/g, "").slice(0, 26);
}

export function formatCvv(value: string, brand?: CardBrand): string {
  return value.replace(/\D/g, "").slice(0, cvvLength(brand));
}

/** Last four, for the receipt and anywhere else the card is referred to. */
export function cardLastFour(value: string): string | undefined {
  const digits = cardDigits(value);
  return digits.length >= 4 ? digits.slice(-4) : undefined;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The Luhn checksum.
 *
 * A parity check, and worth being clear about what it buys: it catches every
 * single-digit typo and most transpositions. It is not a statement that the
 * card exists — roughly one in ten random digit strings passes it.
 */
export function passesLuhn(digits: string): boolean {
  if (digits.length < 12) return false;

  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let value = digits.charCodeAt(i) - 48;
    if (value < 0 || value > 9) return false;
    if (double) {
      value *= 2;
      if (value > 9) value -= 9;
    }
    sum += value;
    double = !double;
  }
  return sum % 10 === 0;
}

export function cardNumberComplete(value: string): boolean {
  const digits = cardDigits(value);
  const brand = detectCardBrand(digits);
  const lengths = brand ? BRAND_LENGTHS[brand] : [16];
  return lengths.includes(digits.length) && passesLuhn(digits);
}

/**
 * Whether the card has already expired, measured against the end of its month
 * — a card marked 08/26 is good through 31 August 2026, not through the 1st.
 *
 * `now` is a parameter so this is testable without freezing the clock.
 */
export function expiryIsUsable(value: string, now = new Date()): boolean {
  const parts = expiryParts(value);
  if (!parts) return false;
  if (parts.month < 1 || parts.month > 12) return false;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (parts.year < currentYear) return false;
  if (parts.year === currentYear && parts.month < currentMonth) return false;
  // A card issued today cannot expire in 2050; a mistyped year can.
  return parts.year <= currentYear + 20;
}

export type CardFields = {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
};

export const EMPTY_CARD_FIELDS: CardFields = {
  number: "",
  name: "",
  expiry: "",
  cvv: "",
};

/**
 * Why this card cannot be submitted, in the applicant's words, or `undefined`.
 *
 * Ordered as the form is read, so the message names the first thing wrong
 * going down the page rather than the last rule that happened to fail.
 */
export function cardBlockingReason(
  fields: CardFields,
  now = new Date(),
): string | undefined {
  const digits = cardDigits(fields.number);
  const brand = detectCardBrand(digits);

  if (digits.length === 0) return "Enter your card number.";
  if (!cardNumberComplete(fields.number)) {
    // Distinguishing "not finished" from "cannot be right" matters: the first
    // is a prompt to keep typing, the second is a prompt to look at the card.
    const lengths = brand ? BRAND_LENGTHS[brand] : [16];
    return digits.length < Math.min(...lengths)
      ? "That card number looks too short."
      : "Check the card number — one of the digits is not right.";
  }

  if (fields.name.trim().length < 2) return "Enter the name printed on the card.";

  if (fields.expiry.replace(/\D/g, "").length < 4) return "Enter the expiry date.";
  if (!expiryIsUsable(fields.expiry, now)) return "That expiry date has passed.";

  const needed = cvvLength(brand);
  if (fields.cvv.length < needed) {
    return `Enter the ${needed}-digit security code from the ${
      brand === "amex" ? "front" : "back"
    } of the card.`;
  }

  return undefined;
}

/** Which fields the shake-and-highlight treatment applies to on a failed pay. */
export function invalidCardFields(
  fields: CardFields,
  now = new Date(),
): Set<keyof CardFields> {
  const brand = detectCardBrand(cardDigits(fields.number));
  const invalid = new Set<keyof CardFields>();

  if (!cardNumberComplete(fields.number)) invalid.add("number");
  if (fields.name.trim().length < 2) invalid.add("name");
  if (!expiryIsUsable(fields.expiry, now)) invalid.add("expiry");
  if (fields.cvv.length < cvvLength(brand)) invalid.add("cvv");

  return invalid;
}
