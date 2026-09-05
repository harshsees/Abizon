/**
 * CALENDAR ARITHMETIC, IN ONE PLACE
 * ---------------------------------------------------------------------------
 * Extracted because there were about to be two of it. `DatePickerModal` has
 * carried a private `getDaysInMonth` since the country page was built, and the
 * new dates step needs the same grid in a different composition — two months
 * side by side rather than one column that scrolls. Copying twelve lines of
 * date maths is how one of the two copies ends up with a leap-year bug that
 * only appears in February.
 *
 * ── Two things here are easy to get wrong and are therefore stated ──
 *
 * MONDAY IS COLUMN ZERO. `Date.prototype.getDay` is Sunday-indexed, and India
 * — like most of Europe — reads a calendar starting on Monday. The shift is
 * `(getDay() + 6) % 7`, and it has to be applied to the padding as well as to
 * the header, or the whole grid is off by one for any month starting on a
 * Sunday.
 *
 * DATES ARE COMPARED BY DAY, NOT BY INSTANT. A `Date` is a moment, so
 * `new Date()` is 14:32 today and every cell in the grid is midnight — which
 * makes today itself compare as "in the past" for the rest of the day, and
 * strikes it out on a calendar somebody is looking at. `startOfDay` is what
 * every comparison here goes through.
 *
 * ── Why local time and not UTC ──
 *
 * A traveller picking the 4th means the 4th where they are standing. Building
 * these in UTC would show somebody in IST a grid that is a day out for half of
 * every day, and the value stored (`yyyy-mm-dd`) has no timezone in it anyway —
 * it is a calendar date, not an instant, and the whole flow treats it as one.
 */

/** Monday-first, matching the grid this fills. */
export const WEEKDAY_INITIALS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;

/** Midnight, local, on the same calendar day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Same calendar day, ignoring the time of day on either side. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * The cells of one month, padded so the first column is always Monday.
 *
 * `null` is a leading blank. Trailing blanks are NOT emitted: a CSS grid ends
 * a short final row on its own, and padding to a full six-row rectangle would
 * add up to six empty cells that only exist to be skipped by a screen reader.
 */
export function monthGrid(year: number, month: number): Array<Date | null> {
  const cursor = new Date(year, month, 1);
  const cells: Array<Date | null> = [];

  const leading = (cursor.getDay() + 6) % 7;
  for (let index = 0; index < leading; index += 1) cells.push(null);

  while (cursor.getMonth() === month) {
    cells.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return cells;
}

/**
 * `count` consecutive months from `from`, as `{ year, month }` pairs.
 *
 * Written with `new Date(year, month + n, 1)` rather than by incrementing a
 * month number, because that is the one arithmetic the `Date` constructor does
 * correctly for free: month 12 of 2026 is January 2027, and every hand-rolled
 * version of this has to remember that and usually does not.
 */
export function monthsFrom(
  from: Date,
  count: number,
): Array<{ year: number; month: number }> {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(from.getFullYear(), from.getMonth() + offset, 1);
    return { year: date.getFullYear(), month: date.getMonth() };
  });
}

/** `yyyy-mm-dd`, local. The form every date in the application state takes. */
export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * The inverse, and it is `new Date(y, m, d)` rather than `new Date(string)`.
 *
 * `new Date("2026-09-04")` is parsed as UTC midnight by the specification, so
 * in every timezone west of Greenwich it is the 3rd — which would show an
 * applicant a different day from the one they picked, on the screen where they
 * check it.
 */
export function fromIsoDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  const date = new Date(year, month, day);
  // Rejects `2026-02-31`, which the constructor silently rolls into March.
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return undefined;
  }

  return date;
}
