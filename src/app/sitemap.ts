import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";
import { countrySlugs } from "@/lib/countryCatalogue";

/**
 * SITEMAP.
 * ---------------------------------------------------------------------------
 * `robots.ts` is the list of what must not be indexed. This is the other half:
 * the list of what should be, stated positively, because a brand-new domain has
 * no crawl history and nothing linking to it. Left to discovery alone, the 150+
 * destination pages — the entire reason the site is indexable at all — surface
 * at whatever rate a crawler happens to walk the internal links from the
 * homepage, which for a site nobody links to yet is indistinguishable from
 * never.
 *
 * WHY THE PATHS ARE LISTED BY HAND. There is no filesystem route manifest to
 * read at build time, and deriving one would mean re-encoding the three reasons
 * a route is absent from this list. Those reasons are not uniform:
 *
 *   noindex in the page's own metadata  /login, /profile, /ops, /dev/*,
 *                                       /arrival-card/*
 *   disallowed in robots.ts             /apply, /track/, /api/
 *   not a page a stranger can arrive at /ops/applications/[id]
 *
 * A route added later is therefore absent from the sitemap until someone adds
 * it, which is the safe direction for the mistake to run: a missing URL costs
 * crawl latency, while a wrong URL here publishes a page that was meant to stay
 * private. `sitemap.test.ts` enforces the half that can be checked mechanically
 * — nothing in this list may match a `Disallow` rule in `robots.ts`.
 *
 * NO `lastModified`, `changeFrequency` OR `priority`. All three are optional,
 * all three are ignored by Google unless they are accurate, and none of them
 * can be made accurate here. `new Date()` in a build-time sitemap claims every
 * page changed at the moment of the last deploy — a typo fix on the careers
 * page would announce 150 destination pages as freshly modified. A crawler that
 * checks one and finds it unchanged learns to discount the field for the whole
 * site, which is worse than never having sent it. The URL list is the part that
 * is true, so the URL list is what this sends.
 *
 * Built at build time, like `robots.ts`, so it reads `siteUrl()` — which takes
 * `SITE_URL` from `process.env` directly rather than through `env()`, to keep
 * `next build` hermetic on a runner with no production secrets. See the comment
 * on `siteUrl` in `lib/env.ts`.
 */

/**
 * Everything public that is not a destination page. Ordered as the site's own
 * navigation orders it — the product, then the guides and tools, then the
 * editorial pages, then the legal ones — so that a diff here reads as a change
 * to the site rather than a change to an alphabetised list.
 */
const STATIC_PATHS = [
  "/",
  "/atlas",
  "/passport-index",
  "/student-visa",
  "/defense-personnel",
  "/rejection-recovery",
  "/emergency-helpline",
  "/guides/japan-visa",
  "/guides/schengen-visa",
  "/guides/uk-visa",
  "/guides/us-visa",
  "/tools",
  "/tools/schengen-appointment-checker",
  "/tools/uae-visa-status-checker",
  "/tools/visa-photo-creator",
  "/tools/visa-requirements",
  "/bible",
  "/magazine",
  "/faultlines",
  "/engineering",
  "/speed",
  "/status",
  "/transparency",
  "/fee-change-audit",
  "/image-credits",
  "/newsroom",
  "/careers",
  "/partners",
  "/contact",
  "/security",
  "/privacy",
  "/terms",
  "/refunds-policy",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteUrl();

  return [
    ...STATIC_PATHS.map((path) => ({
      // The apex is `origin` itself: `${origin}/` would publish a URL one
      // redirect away from the canonical the page announces.
      url: path === "/" ? origin : `${origin}${path}`,
    })),
    ...countrySlugs.map((slug) => ({ url: `${origin}/visa/${slug}` })),
  ];
}
