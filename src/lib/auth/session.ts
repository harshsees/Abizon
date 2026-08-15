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

export async function createSession(userId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const token = await new SignJWT({ sub: userId })
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
    return { sub: payload.sub };
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
