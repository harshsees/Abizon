import { describe, expect, it } from "vitest";

import { formatE164, maskE164, parsePhone } from "./phone";

/**
 * The formatting tests below exist because of a bug an end-to-end test caught:
 * `/^\+(\d{1,3})(\d+)$/` is greedy with nothing after it to force a backtrack,
 * so every Indian number split as `919` + the rest and rendered `+919 882515043`
 * on the OTP screen — the one place whose whole purpose is letting the applicant
 * confirm they typed the right number.
 *
 * India is first in each group for that reason.
 */

describe("formatE164", () => {
  it("groups an Indian number", () => {
    expect(formatE164("+919882515043")).toBe("+91 98825 15043");
    expect(formatE164("+919328415585")).toBe("+91 93284 15585");
  });

  it("groups a three-digit country code", () => {
    // The case the fix must not break while fixing the two-digit one.
    expect(formatE164("+971501234567")).toBe("+971 501234567");
  });

  it("groups a one-digit country code", () => {
    expect(formatE164("+12025550143")).toBe("+1 20255 50143");
  });

  it("leaves an unrecognisable value alone", () => {
    expect(formatE164("not a number")).toBe("not a number");
  });
});

describe("maskE164", () => {
  it("shows the country code and the last four digits only", () => {
    expect(maskE164("+919882515043")).toBe("+91 ••••••5043");
  });

  it("does not reveal an extra digit through a wrong split", () => {
    // The greedy version produced "+919 •••••5043", which discloses the 9.
    expect(maskE164("+919882515043")).not.toContain("+919 ");
  });

  it("refuses anything it cannot parse", () => {
    expect(maskE164("garbage")).toBe("•••");
  });
});

describe("parsePhone", () => {
  it("strips a leading zero and spacing", () => {
    const parsed = parsePhone("098825 15043", "IN");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("unreachable");
    expect(parsed.e164).toBe("+919882515043");
  });

  it("round-trips through formatting", () => {
    const parsed = parsePhone("9882515043", "IN");
    if (!parsed.ok) throw new Error("unreachable");

    // The property that actually matters: whatever `parsePhone` produces,
    // `formatE164` must be able to group. A canonical form only one of them
    // understands is how the OTP screen came to disagree with the store.
    expect(formatE164(parsed.e164)).toBe("+91 98825 15043");
  });
});
