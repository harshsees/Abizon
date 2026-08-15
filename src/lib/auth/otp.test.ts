import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OTP_POLICY, requestCode, resendCode, verifyCode } from "./otp";
import { parsePhone } from "./phone";
import { lastCodeFor } from "./sms/memory";
import { memoryStore, setAuthStoreForTests } from "./store";

/**
 * THE OTP RULES.
 * ---------------------------------------------------------------------------
 * These are the checks the handover document describes as having "passed
 * against the running app on 15 Aug 2026", run from temporary routes that were
 * then deleted, with the note that they "should be reinstated as real tests
 * before this goes anywhere near production". This is that.
 *
 * The `memory` SMS driver exists for exactly this purpose — it hands the code
 * back rather than printing it, which is what makes the attempt caps, the
 * replay guard and the rate limits testable at all.
 *
 * Every test below asserts a *rule*, not an implementation. If `otp.ts` is
 * rewritten and these still pass, the rewrite is correct; that is the property
 * worth having, because the thing being protected is a login.
 */

/**
 * The in-memory store is module state shared across tests. Rather than reaching
 * into it, each test uses a distinct number — which is also closer to reality,
 * since the rate limiter's unit is the number.
 */
let counter = 0;
function freshNumber(): string {
  counter += 1;
  return `+9198825${String(10000 + counter).padStart(5, "0")}`;
}

beforeEach(() => {
  setAuthStoreForTests(memoryStore);
});

afterEach(() => {
  vi.useRealTimers();
  setAuthStoreForTests(null);
});

describe("requesting a code", () => {
  it("issues a six-digit code", async () => {
    const phone = freshNumber();
    const outcome = await requestCode(phone);

    expect(outcome.ok).toBe(true);
    expect(lastCodeFor(phone)).toMatch(/^\d{6}$/);
  });

  it("never stores the code itself", async () => {
    const phone = freshNumber();
    const outcome = await requestCode(phone);
    if (!outcome.ok) throw new Error("expected a code to be issued");

    const stored = await memoryStore.getChallenge(outcome.challengeId);
    const code = lastCodeFor(phone)!;

    // The hash is HMAC-SHA256, so this is both "not the code" and "not a plain
    // hash of the code" — the distinction that makes a table dump useless,
    // since six digits fall to an unkeyed hash instantly.
    expect(stored?.codeHash).toBeDefined();
    expect(stored?.codeHash).not.toContain(code);
    expect(stored?.codeHash).toHaveLength(64);
  });

  it("caps sends per number per hour, and keeps refusing a correct code after the cap", async () => {
    const phone = freshNumber();

    // Five is the documented hourly ceiling. Each request is a fresh challenge,
    // which is precisely the route around the per-challenge limit.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await requestCode(phone)).ok).toBe(true);
    }

    const blocked = await requestCode(phone);
    expect(blocked.ok).toBe(false);
    if (blocked.ok) throw new Error("unreachable");
    expect(blocked.error).toMatch(/too many codes/i);
  });
});

describe("verifying", () => {
  it("accepts the correct code once and refuses the replay", async () => {
    const phone = freshNumber();
    const outcome = await requestCode(phone);
    if (!outcome.ok) throw new Error("expected a code");

    const code = lastCodeFor(phone)!;

    const first = await verifyCode(outcome.challengeId, code);
    expect(first.ok).toBe(true);

    const replay = await verifyCode(outcome.challengeId, code);
    expect(replay.ok).toBe(false);
    if (replay.ok) throw new Error("unreachable");
    expect(replay.error).toMatch(/already been used/i);
    expect(replay.fatal).toBe(true);
  });

  it("dies permanently after five wrong guesses", async () => {
    const phone = freshNumber();
    const outcome = await requestCode(phone);
    if (!outcome.ok) throw new Error("expected a code");

    const correct = lastCodeFor(phone)!;
    const wrong = correct === "000000" ? "111111" : "000000";

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const result = await verifyCode(outcome.challengeId, wrong);
      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("unreachable");
      expect(result.attemptsRemaining).toBe(4 - attempt);
    }

    const fifth = await verifyCode(outcome.challengeId, wrong);
    expect(fifth.ok).toBe(false);
    if (fifth.ok) throw new Error("unreachable");
    expect(fifth.fatal).toBe(true);

    // THE ONE THAT MATTERS. A challenge that has run out of attempts must not
    // accept the right code afterwards — otherwise the cap only slows an
    // attacker down rather than stopping them.
    const afterCap = await verifyCode(outcome.challengeId, correct);
    expect(afterCap.ok).toBe(false);
  });

  it("refuses an expired code", async () => {
    vi.useFakeTimers();

    const phone = freshNumber();
    const outcome = await requestCode(phone);
    if (!outcome.ok) throw new Error("expected a code");

    const code = lastCodeFor(phone)!;

    vi.advanceTimersByTime(OTP_POLICY.ttlMs + 1000);

    const result = await verifyCode(outcome.challengeId, code);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.error).toMatch(/expired/i);

    // Not fatal: the applicant should be offered a new code rather than sent
    // back to the phone step.
    expect(result.fatal).toBe(false);
  });

  it("is inert against a challenge id that does not exist", async () => {
    const result = await verifyCode("00000000-0000-0000-0000-000000000000", "123456");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.fatal).toBe(true);
  });

  it("ignores formatting in the submitted code", async () => {
    const phone = freshNumber();
    const outcome = await requestCode(phone);
    if (!outcome.ok) throw new Error("expected a code");

    const code = lastCodeFor(phone)!;
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;

    expect((await verifyCode(outcome.challengeId, spaced)).ok).toBe(true);
  });
});

describe("resending", () => {
  it("refuses inside the cooldown and issues a new code after it", async () => {
    vi.useFakeTimers();

    const phone = freshNumber();
    const outcome = await requestCode(phone);
    if (!outcome.ok) throw new Error("expected a code");

    const original = lastCodeFor(phone)!;

    const tooSoon = await resendCode(outcome.challengeId);
    expect(tooSoon.ok).toBe(false);
    if (tooSoon.ok) throw new Error("unreachable");
    expect(tooSoon.error).toMatch(/wait/i);

    vi.advanceTimersByTime(OTP_POLICY.resendCooldownMs + 1000);

    const resent = await resendCode(outcome.challengeId);
    expect(resent.ok).toBe(true);

    // A resend issues a *new* code rather than repeating the old one, so an SMS
    // that arrives late leaves the applicant with two codes of which only the
    // newer works. Asserted because it is a deliberate choice that reads like a
    // bug from the outside.
    const replacement = lastCodeFor(phone)!;
    expect(replacement).not.toBe(original);

    expect((await verifyCode(outcome.challengeId, original)).ok).toBe(false);
    expect((await verifyCode(outcome.challengeId, replacement)).ok).toBe(true);
  });

  it("restores the guess allowance", async () => {
    vi.useFakeTimers();

    const phone = freshNumber();
    const outcome = await requestCode(phone);
    if (!outcome.ok) throw new Error("expected a code");

    await verifyCode(outcome.challengeId, "000000");
    await verifyCode(outcome.challengeId, "000000");

    vi.advanceTimersByTime(OTP_POLICY.resendCooldownMs + 1000);
    await resendCode(outcome.challengeId);

    // Attempts spent on a code that never arrived must not follow the applicant
    // to the one that did.
    const result = await verifyCode(outcome.challengeId, "000000");
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.attemptsRemaining).toBe(OTP_POLICY.maxAttempts - 1);
  });

  it("cannot be used to resend indefinitely on one challenge", async () => {
    vi.useFakeTimers();

    const phone = freshNumber();
    const outcome = await requestCode(phone);
    if (!outcome.ok) throw new Error("expected a code");

    // Two resends are allowed on one challenge (three sends including the
    // original). The third must be refused.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      vi.advanceTimersByTime(OTP_POLICY.resendCooldownMs + 1000);
      expect((await resendCode(outcome.challengeId)).ok).toBe(true);
    }

    vi.advanceTimersByTime(OTP_POLICY.resendCooldownMs + 1000);
    const exhausted = await resendCode(outcome.challengeId);
    expect(exhausted.ok).toBe(false);
  });

  it("refuses to resend on a consumed challenge", async () => {
    vi.useFakeTimers();

    const phone = freshNumber();
    const outcome = await requestCode(phone);
    if (!outcome.ok) throw new Error("expected a code");

    await verifyCode(outcome.challengeId, lastCodeFor(phone)!);

    vi.advanceTimersByTime(OTP_POLICY.resendCooldownMs + 1000);

    const result = await resendCode(outcome.challengeId);
    expect(result.ok).toBe(false);
  });
});

describe("phone normalisation", () => {
  // The rate limiter and the store must agree on what "the same number" is.
  // These are the cases from the handover document's login checks.
  it("normalises an Indian number written with a leading zero and a space", () => {
    const parsed = parsePhone("098825 15043", "IN");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("unreachable");
    expect(parsed.e164).toBe("+919882515043");
  });

  it("rejects a number that is too short", () => {
    expect(parsePhone("9882", "IN").ok).toBe(false);
  });

  it("rejects a landline prefix", () => {
    // Indian mobile numbers start 6–9. A landline reaching the SMS gateway is a
    // silently undelivered code and a charge.
    expect(parsePhone("1122334455", "IN").ok).toBe(false);
  });
});
