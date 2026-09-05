import { describe, expect, it } from "vitest";

import {
  fromIsoDate,
  isSameDay,
  monthGrid,
  monthsFrom,
  startOfDay,
  toIsoDate,
} from "./calendar";

describe("monthGrid", () => {
  it("pads the front so column zero is always Monday", () => {
    // 1 September 2026 is a Tuesday, so one blank Monday cell leads.
    const cells = monthGrid(2026, 8);
    expect(cells[0]).toBeNull();
    expect(cells[1]).toEqual(new Date(2026, 8, 1));
    expect(cells).toHaveLength(1 + 30);
  });

  it("pads six cells for a month starting on a Sunday", () => {
    // 1 February 2026 is a Sunday — the case a Sunday-indexed getDay() gets
    // wrong by six, and the one that makes the whole grid look plausible and
    // be off by a week.
    const cells = monthGrid(2026, 1);
    expect(cells.slice(0, 6).every((cell) => cell === null)).toBe(true);
    expect(cells[6]).toEqual(new Date(2026, 1, 1));
  });

  it("pads nothing for a month starting on a Monday", () => {
    // 1 June 2026 is a Monday.
    expect(monthGrid(2026, 5)[0]).toEqual(new Date(2026, 5, 1));
  });

  it("counts a leap February correctly", () => {
    expect(monthGrid(2028, 1).filter(Boolean)).toHaveLength(29);
    expect(monthGrid(2026, 1).filter(Boolean)).toHaveLength(28);
  });

  it("emits no trailing blanks", () => {
    expect(monthGrid(2026, 8).at(-1)).toEqual(new Date(2026, 8, 30));
  });
});

describe("monthsFrom", () => {
  it("returns consecutive months", () => {
    expect(monthsFrom(new Date(2026, 8, 15), 2)).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 9 },
    ]);
  });

  it("rolls over the year end", () => {
    expect(monthsFrom(new Date(2026, 11, 3), 2)).toEqual([
      { year: 2026, month: 11 },
      { year: 2027, month: 0 },
    ]);
  });
});

describe("startOfDay / isSameDay", () => {
  it("compares by day rather than by instant", () => {
    // The bug this prevents: today at 14:32 compares as earlier than today's
    // midnight cell, so today is struck out on a calendar somebody is using.
    const afternoon = new Date(2026, 8, 4, 14, 32, 7);
    expect(startOfDay(afternoon)).toEqual(new Date(2026, 8, 4));
    expect(isSameDay(afternoon, new Date(2026, 8, 4))).toBe(true);
    expect(isSameDay(afternoon, new Date(2026, 8, 5))).toBe(false);
  });
});

describe("toIsoDate / fromIsoDate", () => {
  it("round-trips a date in local time", () => {
    const date = new Date(2026, 8, 4);
    expect(toIsoDate(date)).toBe("2026-09-04");
    expect(fromIsoDate("2026-09-04")).toEqual(date);
  });

  it("pads single-digit months and days", () => {
    expect(toIsoDate(new Date(2027, 0, 5))).toBe("2027-01-05");
  });

  it("parses as a local calendar date, not as UTC midnight", () => {
    // `new Date("2026-09-04")` is UTC midnight, which is 3 September anywhere
    // west of Greenwich — a different day from the one the applicant picked.
    expect(fromIsoDate("2026-09-04")?.getDate()).toBe(4);
    expect(fromIsoDate("2026-09-04")?.getMonth()).toBe(8);
  });

  it("refuses a date that does not exist", () => {
    // The constructor rolls 31 February into March without complaint.
    expect(fromIsoDate("2026-02-31")).toBeUndefined();
    expect(fromIsoDate("not-a-date")).toBeUndefined();
    expect(fromIsoDate("2026-9-4")).toBeUndefined();
  });
});
