import { beforeEach, describe, expect, it } from "vitest";

import { checkLimit, clearLocalLimitsForTests, LIMITS } from "./rateLimit";

/**
 * The in-process fallback. There are no Upstash credentials in the test
 * environment, which is what these exercise — and which is also the mode a
 * misconfigured deployment would run in, so its behaviour is worth pinning down
 * rather than treating as a stub.
 */

beforeEach(() => {
  clearLocalLimitsForTests();
});

describe("checkLimit", () => {
  it("allows up to the limit and refuses after it", async () => {
    const { limit } = LIMITS.staffLoginPerIp;

    for (let attempt = 0; attempt < limit; attempt += 1) {
      const result = await checkLimit("staffLoginPerIp", "203.0.113.0/24");
      expect(result.ok).toBe(true);
    }

    const blocked = await checkLimit("staffLoginPerIp", "203.0.113.0/24");
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("counts each identifier separately", async () => {
    const { limit } = LIMITS.staffLoginPerIp;

    for (let attempt = 0; attempt < limit; attempt += 1) {
      await checkLimit("staffLoginPerIp", "203.0.113.0/24");
    }

    // One address exhausting its budget must not lock out everybody else.
    expect((await checkLimit("staffLoginPerIp", "198.51.100.0/24")).ok).toBe(true);
  });

  it("keeps separate budgets per limit name", async () => {
    const { limit } = LIMITS.staffLoginPerIp;

    for (let attempt = 0; attempt < limit; attempt += 1) {
      await checkLimit("staffLoginPerIp", "203.0.113.0/24");
    }

    // The same address is counted against a different limit independently:
    // "ten sign-in attempts" and "twenty code requests" are separate budgets.
    expect((await checkLimit("otpSendPerIp", "203.0.113.0/24")).ok).toBe(true);
  });

  it("reports how much is left", async () => {
    const first = await checkLimit("otpSendPerIp", "203.0.113.0/24");
    const second = await checkLimit("otpSendPerIp", "203.0.113.0/24");

    expect(first.remaining).toBe(LIMITS.otpSendPerIp.limit - 1);
    expect(second.remaining).toBe(LIMITS.otpSendPerIp.limit - 2);
  });
});
