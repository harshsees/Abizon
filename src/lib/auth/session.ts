import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * SESSIONS — a signed cookie, and nothing in it worth stealing.
 * ---------------------------------------------------------------------------
 * The payload carries the user id and nothing else. Not the phone number, not
 * a name, not an application reference. A JWT is signed, not encrypted: anyone
 * holding the cookie can read its contents, so the contents must be worth
 * reading. An opaque id is; a phone number is a piece of personal data under
 * the DPDP Act sitting in a value that gets copied into logs, proxies and
 * browser storage.
 *
 * Anything the interface needs beyond the id is looked up server-side from the
 * id — see `dal.ts`. That costs a store read per request and buys the property
 * that a stolen cookie discloses nothing on its own.
 */

const COOKIE_NAME = "abizon_session";

/** Seven days. Long enough that a returning applicant is not asked to sign in
 *  again mid-application, short enough that an abandoned session on a shared
 *  machine is not indefinite. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionPayload = {
  /** The user id. Named `sub` to match the JWT registered claim. */
  sub: string;
  /**
   * The user's `tokenVersion` at the moment this session was issued, compared
   * against the stored one on every authenticated request.
   *
   * WHY A STATELESS COOKIE NEEDS THIS. Verifying a signature proves the cookie
   * came from us; it proves nothing about whether it should still work. Without
   * a version there is exactly one way to revoke a session — rotate
   * `AUTH_SECRET` — and that signs out every applicant on the platform. Which is
   * right for a leaked secret and absurd for one person losing their phone.
   *
   * It is a small number, not a secret, and it discloses nothing: an attacker
   * holding the cookie already holds the session.
   */
  ver: number;
};

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "AUTH_SECRET is not set. Sessions cannot be signed. " +
          "Generate one with `openssl rand -base64 32`.",
      );
    }
    return new TextEncoder().encode("development-only-insecure-secret");
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string, tokenVersion: number): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const token = await new SignJWT({ sub: userId, ver: tokenVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Off over plain HTTP so the flow works on `localhost`; on everywhere else.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;

    // Sessions issued before the version claim existed have no `ver`. Treating
    // them as version 0 lets them keep working, which is correct: every user
    // starts at 0, so an old cookie and a fresh row still agree. The first
    // revocation invalidates them along with everything else.
    const ver = typeof payload.ver === "number" ? payload.ver : 0;

    return { sub: payload.sub, ver };
  } catch {
    // Expired, tampered with, or signed by a previous AUTH_SECRET. All three
    // mean the same thing to the caller: there is no session.
    return null;
  }
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** Exported for `proxy.ts`, which sees the raw request rather than `cookies()`. */
export const SESSION_COOKIE_NAME = COOKIE_NAME;
