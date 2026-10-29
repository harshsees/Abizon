/**
 * The price of a visa, worked out one way for the whole app.
 *
 * The country page, the application's summary, the receipt and the server that
 * opens the payment order all call `quoteVisa`, so they cannot disagree. The
 * server calls it again on its own copy of the application, which is what
 * makes the charged amount the price list's rather than the browser's.
 *
 * Prices come from `data/visaOptions.ts` and are all-inclusive: there is no fee
 * or tax to add. The only arithmetic here is the party — adults, children
 * where a destination prices them differently, and fixed-party options.
 */

import { CHILD_UNDER, visaOptionsFor, type VisaOption } from "@/data/visaOptions";

export type PricedTraveller = { dateOfBirth?: string | null };

export type QuoteLine = {
  label: string;
  count: number;
  /** Per unit, in rupees. */
  unit: number;
  amount: number;
};

export type VisaQuote = {
  option: VisaOption;
  /** The option's position for this destination — the application's `plan`. */
  index: number;
  travellers: number;
  lines: QuoteLine[];
  /** `null` when the party cannot be priced as chosen; `problem` says why. */
  total: number | null;
  problem?: string;
};

/** Whole years on `on`, or `null` for a date of birth that does not parse. */
export function ageOn(dateOfBirth: string, on: Date): number | null {
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = on.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    on.getMonth() < dob.getMonth() ||
    (on.getMonth() === dob.getMonth() && on.getDate() < dob.getDate());
  if (beforeBirthday) age -= 1;
  return age;
}

/**
 * The option at `index`, falling back to the first. An index from an old draft
 * or a hand-edited URL lands on a real option rather than on nothing.
 */
export function resolveOption(
  code: string,
  index: number | null | undefined,
): { option: VisaOption; index: number } | null {
  const list = visaOptionsFor(code);
  if (!list.length) return null;
  const i = index != null && index >= 0 && index < list.length ? index : 0;
  return { option: list[i], index: i };
}

/**
 * `travellers` is either a count, where nobody's age is known yet (the country
 * page), or the travellers themselves (the application and the server). A
 * traveller whose date of birth is missing is priced as an adult until it is
 * entered. That can move the price either way — on the UAE 30-day visa the
 * first child costs more than an adult — which is why the application's
 * summary and the server both quote from the dates of birth themselves.
 */
export function quoteVisa(
  code: string,
  index: number | null | undefined,
  travellers: number | PricedTraveller[],
  on: Date = new Date(),
): VisaQuote | null {
  const resolved = resolveOption(code, index);
  if (!resolved) return null;
  const { option } = resolved;

  const party = typeof travellers === "number" ? [] : travellers;
  const count = Math.max(1, typeof travellers === "number" ? travellers : travellers.length);

  if (option.partySize) {
    const ok = count === option.partySize;
    return {
      ...resolved,
      travellers: count,
      lines: [
        {
          label: `${option.title} (${option.partySize} travellers)`,
          count: 1,
          unit: option.price,
          amount: option.price,
        },
      ],
      total: ok ? option.price : null,
      problem: ok
        ? undefined
        : `This visa is for exactly ${option.partySize} travellers. Choose the individual visa for ${
            count === 1 ? "one traveller" : `${count} travellers`
          }.`,
    };
  }

  const children = option.child
    ? party.filter((t) => {
        if (!t.dateOfBirth) return false;
        const age = ageOn(t.dateOfBirth, on);
        return age !== null && age < CHILD_UNDER;
      }).length
    : 0;
  const adults = count - children;

  const lines: QuoteLine[] = [];
  if (adults > 0) {
    lines.push({
      label: option.child ? (adults === 1 ? "Adult" : "Adults") : count === 1 ? "Traveller" : "Travellers",
      count: adults,
      unit: option.price,
      amount: adults * option.price,
    });
  }
  if (option.child && children > 0) {
    lines.push({ label: "Child", count: 1, unit: option.child.first, amount: option.child.first });
    if (children > 1) {
      lines.push({
        label: children === 2 ? "Additional child" : "Additional children",
        count: children - 1,
        unit: option.child.additional,
        amount: (children - 1) * option.child.additional,
      });
    }
  }

  return {
    ...resolved,
    travellers: count,
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
  };
}

export const formatInr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

/** "₹8,400 per adult · children from ₹3,500", for the options list. */
export function describeOptionPrice(option: VisaOption): string {
  if (option.partySize) return `${formatInr(option.price)} for ${option.partySize} travellers`;
  if (!option.child) return `${formatInr(option.price)} per traveller`;
  const lowest = Math.min(option.child.first, option.child.additional);
  return `${formatInr(option.price)} per adult · children from ${formatInr(lowest)}`;
}
