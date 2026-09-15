import { decodeJwt, jwtVerify } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The token this app signs must be exactly what `backend/app/core/security.py`
 * accepts. Those checks live in Python and cannot run here, so this pins the
 * claim layout they depend on: issuer, audience, a one-minute lifetime, and a
 * key prefix for applicants only.
 */

const ORIGINAL = { ...process.env };
const SECRET = "vitest-service-secret-that-is-long-enough";

async function loadClient() {
  vi.resetModules();
  return import("./client");
}

beforeEach(() => {
  process.env.SERVICE_JWT_SECRET = SECRET;
});

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("service token", () => {
  it("carries the applicant's key prefix and a one-minute lifetime", async () => {
    const { signServiceToken, SERVICE_TOKEN } = await loadClient();
    const prefix = "0b7f2f5e-4a57-4f45-9f55-8f4cf1f8a001/5d2c6a1e-3b8f-4c1d-9e7a-2f6b8c9d0e11/";

    const token = await signServiceToken({ type: "applicant", id: "user-1", keyPrefix: prefix });
    const { payload, protectedHeader } = await jwtVerify(token, new TextEncoder().encode(SECRET), {
      issuer: SERVICE_TOKEN.issuer,
      audience: SERVICE_TOKEN.audience,
    });

    expect(protectedHeader.alg).toBe("HS256");
    expect(payload).toMatchObject({ sub: "user-1", typ: "applicant", role: "applicant", kp: prefix });
    expect(payload.exp! - payload.iat!).toBe(60);
    expect(payload.jti).toBeTypeOf("string");
  });

  it("gives staff their role and no key prefix", async () => {
    const { signServiceToken } = await loadClient();
    const payload = decodeJwt(await signServiceToken({ type: "staff", id: "staff-1", role: "processor" }));

    expect(payload).toMatchObject({ sub: "staff-1", typ: "staff", role: "processor" });
    expect(payload.kp).toBeUndefined();
  });

  it("signs a fresh token id every time, so tokens are never identical", async () => {
    const { signServiceToken } = await loadClient();
    const first = decodeJwt(await signServiceToken({ type: "system" }));
    const second = decodeJwt(await signServiceToken({ type: "system" }));

    expect(first.jti).not.toBe(second.jti);
  });

  it("refuses to sign without a secret rather than signing with a default", async () => {
    process.env.SERVICE_JWT_SECRET = "";
    const { signServiceToken } = await loadClient();

    await expect(signServiceToken({ type: "system" })).rejects.toThrow(/SERVICE_JWT_SECRET/);
  });
});
