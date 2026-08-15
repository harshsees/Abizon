import { describe, expect, it } from "vitest";

import { generatePassword, hashPassword, verifyPassword } from "./password";

describe("staff passwords", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(await verifyPassword("correct horse battery staple", hash)).toBe(true);
    expect(await verifyPassword("correct horse battery stapl", hash)).toBe(false);
  });

  it("salts, so the same password hashes differently every time", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");

    // Without a per-hash salt, two staff who chose the same password are
    // visible as identical rows, and one rainbow table covers both.
    expect(a).not.toBe(b);
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });

  it("carries its parameters, so they can be raised later", async () => {
    const hash = await hashPassword("x");
    const [algorithm, n, r, p] = hash.split("$");

    expect(algorithm).toBe("scrypt");
    expect(Number(n)).toBe(2 ** 16);
    expect(Number(r)).toBe(8);
    expect(Number(p)).toBe(1);
  });

  it("normalises unicode, so the same typed password verifies", async () => {
    // "é" has two Unicode representations and different keyboards produce
    // different ones. Without NFKC the same keystrokes fail to verify on a
    // different machine, which is an impossible support ticket.
    const composed = "café-password";
    const decomposed = "café-password";

    const hash = await hashPassword(composed);
    expect(await verifyPassword(decomposed, hash)).toBe(true);
  });

  it("rejects a malformed stored hash instead of throwing", async () => {
    expect(await verifyPassword("x", "not-a-hash")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });

  it("refuses absurd parameters in a stored hash", async () => {
    // A stored value claiming N=2^40 would turn one login attempt into an
    // out-of-memory crash for anyone with write access to the table.
    const hostile = `scrypt$${2 ** 40}$8$1$AAAA$AAAA`;
    expect(await verifyPassword("x", hostile)).toBe(false);
  });

  it("generates passwords with enough entropy to be worth the trouble", () => {
    const password = generatePassword();
    expect(password.length).toBeGreaterThanOrEqual(20);
    expect(generatePassword()).not.toBe(password);
  });
});
