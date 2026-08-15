import { describe, expect, it } from "vitest";

import {
  blindIndex,
  currentKeyVersion,
  decryptField,
  encryptField,
  FIELD_CONTEXT,
  normaliseForIndex,
} from "./fields";

/**
 * FIELD ENCRYPTION.
 * ---------------------------------------------------------------------------
 * The properties tested here are the ones a reviewer would otherwise have to
 * take on trust, and each of them is a real failure mode:
 *
 *   - a scheme that produces the same ciphertext twice leaks equality;
 *   - one that decrypts a tampered value gives an attacker with database write
 *     access a way to change a passport number;
 *   - one that ignores the column context lets a ciphertext be moved between
 *     columns to see what happens.
 */

describe("encryptField / decryptField", () => {
  it("round-trips", () => {
    const encrypted = encryptField("L898902C", FIELD_CONTEXT.passportNumber);
    expect(decryptField(encrypted, FIELD_CONTEXT.passportNumber)).toBe("L898902C");
  });

  it("does not contain the plaintext", () => {
    const encrypted = encryptField("L898902C", FIELD_CONTEXT.passportNumber);
    expect(encrypted).not.toContain("L898902C");
  });

  it("produces different ciphertext for the same input each time", () => {
    const a = encryptField("L898902C", FIELD_CONTEXT.passportNumber);
    const b = encryptField("L898902C", FIELD_CONTEXT.passportNumber);

    // A fresh IV per encryption. Without this, two travellers sharing a passport
    // number would be visible as identical column values — which is the whole
    // property the blind index is *deliberately* limited to leaking.
    expect(a).not.toBe(b);
  });

  it("records the key version in the stored value", () => {
    const encrypted = encryptField("x", FIELD_CONTEXT.dob);
    expect(encrypted.split(".")[1]).toBe(String(currentKeyVersion()));
  });

  it("refuses a value encrypted for a different column", () => {
    const encrypted = encryptField("L898902C", FIELD_CONTEXT.passportNumber);

    // GCM's additional authenticated data. Somebody with write access to the
    // database cannot shuffle ciphertext between columns.
    expect(() => decryptField(encrypted, FIELD_CONTEXT.dob)).toThrow();
  });

  it("refuses a tampered ciphertext rather than decrypting to garbage", () => {
    const encrypted = encryptField("L898902C", FIELD_CONTEXT.passportNumber);
    const parts = encrypted.split(".");

    // Flip a character in the ciphertext segment.
    const body = parts[4];
    parts[4] = (body[0] === "A" ? "B" : "A") + body.slice(1);

    expect(() => decryptField(parts.join("."), FIELD_CONTEXT.passportNumber)).toThrow();
  });

  it("refuses a value that is not in the stored format at all", () => {
    expect(() => decryptField("L898902C", FIELD_CONTEXT.passportNumber)).toThrow(
      /not an encrypted field value/i,
    );
  });
});

describe("blindIndex", () => {
  it("is stable for the same value", () => {
    const a = blindIndex("L898902C", FIELD_CONTEXT.passportNumber);
    const b = blindIndex("L898902C", FIELD_CONTEXT.passportNumber);
    expect(a).toBe(b);
  });

  it("ignores spacing and case", () => {
    // Passport numbers are written with spaces on some documents and not on
    // others. Without normalisation the same passport indexes twice and the
    // search silently misses.
    expect(blindIndex("l898 902c", FIELD_CONTEXT.passportNumber)).toBe(
      blindIndex("L898902C", FIELD_CONTEXT.passportNumber),
    );
  });

  it("differs for different values", () => {
    expect(blindIndex("L898902C", FIELD_CONTEXT.passportNumber)).not.toBe(
      blindIndex("L898902D", FIELD_CONTEXT.passportNumber),
    );
  });

  it("does not contain the plaintext", () => {
    expect(blindIndex("L898902C", FIELD_CONTEXT.passportNumber)).not.toContain("L898902C");
  });

  it("normalises spacing, hyphens and case away", () => {
    expect(normaliseForIndex(" l898-902 c ")).toBe("L898902C");
  });
});
