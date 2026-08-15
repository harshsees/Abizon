import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";

/**
 * ROBOTS.
 * ---------------------------------------------------------------------------
 * The 150-odd destination pages are the entire point of the site being
 * indexable, and everything below is the list of things that are not.
 *
 * This is the *third* line of defence for those paths, not the first — the ops
 * console and the account pages are behind an auth gate and carry
 * `robots: noindex` in their own metadata. A `Disallow` in a public file is a
 * request, not a control: it is honoured by search engines and ignored by
 * everything else, and it also publishes the list of paths worth probing.
 *
 * They are listed anyway, because the failure it prevents is real and
 * embarrassing — a signed-in page rendered into a crawler's cache, or a login
 * screen ranking alongside a phishing lookalike.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Staff only, and never useful to a visitor.
          "/ops",
          // Per-account, and behind a session.
          "/profile",
          "/applications",
          // A login screen appearing in results only ever helps something
          // pretending to be it rank alongside it.
          "/login",
          // Half-finished applications. Nothing here is a page anyone should
          // arrive at from a search.
          "/apply",
          // The reference is in the path, so an indexed tracking page is a
          // published reference.
          "/track/",
          // Cron endpoints and the health check.
          "/api/",
        ],
      },
    ],
    host: siteUrl(),
  };
}
