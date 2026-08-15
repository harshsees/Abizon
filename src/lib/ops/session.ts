import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * STAFF SESSIONS — deliberately not the applicant's session.
 * ---------------------------------------------------------------------------
 * Different cookie, different secret, different lifetime, different path.
 *
 * ── Different secret ──
 *
 * `AUTH_SECRET` is rotated when an applicant session leaks. That rotation signs
 * out every applicant, which is correct, and it must not also lock out the
 * people who would be handling the incident. `OPS_SESSION_SECRET` is separate
 * so the two decisions stay separate.
 *
 * It also means a forged applicant token cannot become a staff token. With a
 * shared secret, the only thing standing between "I can sign a JWT" and "I can
 * read every passport" would be a claim in the payload.
 *
 * ── Different lifetime ──
 *
 * Eight hours, not seven days. A working day. An applicant staying signed in
 * over a week is convenience; an ops console staying signed in over a week is a
 * laptop in a coffee shop.
 *
 * ── Different path ──
 *
 * Scoped to `/ops`, so the cookie is not attached to the 150 public pages. It
 * cannot leak through a referrer, a cache, or a CDN that never sees it.
 */

const COOKIE_NAME = "__Host-abizon_ops";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export type StaffSession = {
  sub: string;
  ver: number;
  role: "viewer" | "processor" | "admin";
};

function key(): Uint8Array {
  const secret = env().OPS_SESSION_SECRET;

  if (!secret) {
    // No development fallback, unlike `AUTH_SECRET`. The applicant flow falls
    // back so a fresh clone can run the login screen; the ops console has
    // nothing to demonstrate without a database anyway, and an unauthenticated
    // path into a passport viewer is not worth the convenience.
    throw new Error(
      "OPS_SESSION_SECRET is not set, so the ops console cannot sign sessions. " +
        "Generate one with `openssl rand -base64 32`.",
    );
  }

  return new TextEncoder().encode(secret);
}

export async function createStaffSession(session: StaffSession): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const token = await new SignJWT({ sub: session.sub, ver: session.ver, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    // The `__Host-` prefix is only honoured over HTTPS with `secure`, no
    // `domain`, and `path=/`. It is what stops a subdomain from setting a
    // cookie this application would then read as its own. Which means the path
    // cannot be narrowed to `/ops` after all — the prefix and the narrow path
    // are mutually exclusive, and the prefix is the stronger guarantee.
    secure: true,
    sameSite: "strict",
    expires: expiresAt,
    path: "/",
  });
}

export async function readStaffSession(): Promise<StaffSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });

    if (typeof payload.sub !== "string") return null;
    if (typeof payload.ver !== "number") return null;
    if (payload.role !== "viewer" && payload.role !== "processor" && payload.role !== "admin") {
      return null;
    }

    return { sub: payload.sub, ver: payload.ver, role: payload.role };
  } catch {
    return null;
  }
}

export async function destroyStaffSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export const OPS_COOKIE_NAME = COOKIE_NAME;
