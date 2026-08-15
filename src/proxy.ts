import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * ROUTE GATING — the fast, optimistic half.
 * ---------------------------------------------------------------------------
 * In Next 16 this file is `proxy.ts`; `middleware.ts` is the deprecated name
 * for the same convention.
 *
 * WHAT THIS IS FOR. Bouncing signed-out visitors off account pages quickly, and
 * keeping signed-in ones off the login screen. It reads the cookie and nothing
 * else, because it runs on every matched request including link prefetches — a
 * database round trip here would be paid on hover, not on navigation.
 *
 * WHAT THIS IS NOT. The security boundary. A valid signature proves the cookie
 * was issued by this server; it does not prove the user still exists, is not
 * suspended, or may see the specific record being requested. Those checks
 * belong next to the data, in `lib/auth/dal.ts`, and every account page calls
 * them regardless of what happened here. If this file were deleted the app
 * would still be secure — it would just redirect later and less pleasantly.
 */

/** Prefixes that require a session. Matched as path segments, so `/profiles`
 *  does not match `/profile`. */
const PROTECTED = ["/profile", "/applications"];

/** Signed-in users have no business on these. */
const AUTH_ROUTES = ["/login"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function key(): Uint8Array {
  const secret = process.env.AUTH_SECRET ?? "development-only-insecure-secret";
  return new TextEncoder().encode(secret);
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return false;

  try {
    await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isProtected = matches(pathname, PROTECTED);
  const isAuthRoute = matches(pathname, AUTH_ROUTES);

  // Nothing to decide on the other 150-odd public pages.
  if (!isProtected && !isAuthRoute) return NextResponse.next();

  const signedIn = await hasValidSession(request);

  if (isProtected && !signedIn) {
    const url = new URL("/login", request.url);
    // Carry the intended destination so signing in resumes it rather than
    // dumping the applicant on a profile page they did not ask for.
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && signedIn) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Without a matcher this runs on static assets and image optimisation too.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|avif|mp4)$).*)"],
};
