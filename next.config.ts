import type { NextConfig } from "next";

import { countriesData, getCountrySlug } from "./src/data/countries";

/**
 * Country pages used to sit at the root (`/thailand`, plus a hand-written
 * `/dubai`). They now live under `/visa/*`, which keeps them from sharing a
 * namespace with the company and product pages in the footer — a root-level
 * `[countrySlug]` catch-all would otherwise be competing with `/careers`,
 * `/security`, `/status` and the rest for every unmatched path.
 *
 * These redirects are enumerated rather than expressed as a blanket
 * `/:slug -> /visa/:slug` rule on purpose: redirects are evaluated *before*
 * the filesystem, so a wildcard would swallow every new footer route and
 * bounce it to a 404 under /visa. Listing the ~150 known slugs means only
 * genuine old country URLs move.
 */
const countryRedirects = [
  ...new Set(countriesData.map((country) => getCountrySlug(country.name))),
].map((slug) => ({
  source: `/${slug}`,
  destination: `/visa/${slug}`,
  permanent: true, // 308 — these URLs are never coming back
}));

/* -------------------------------------------------------------------------- */
/* Security headers                                                           */
/* -------------------------------------------------------------------------- */

const isDev = process.env.NODE_ENV === "development";

/**
 * THE SUPABASE ORIGIN, and why the CSP has to know about it.
 *
 * Documents never pass through a function: the browser `PUT`s straight to a
 * signed Storage URL, and the ops console renders each document from a
 * sixty-second signed `GET`. Both are cross-origin requests to the project's
 * own hostname, so without it here the upload is blocked by `connect-src` and
 * the viewer by `img-src`.
 *
 * That failure is silent in exactly the way the `flagcdn.com` omission was: the
 * server-side `uploadTicketAction` succeeds, the browser's request never
 * leaves, `finaliseUploadAction` is never called, and the applicant is told
 * "the upload did not complete — check your connection", which is a lie about
 * their network. Nothing appears in any server log.
 *
 * Derived from `SUPABASE_URL` rather than wildcarded to `*.supabase.co`,
 * because `https://*.supabase.co` would authorise every Supabase project on
 * the internet as a destination for an injected upload — and the point of
 * enumerating hosts is that the list is exhaustive. Read from `process.env`
 * directly for the same reason `siteUrl()` does: this file is evaluated during
 * `next build`, and going through `env()` would run the production requirement
 * check on a CI runner that has no secrets.
 */
const supabaseOrigin = (() => {
  const raw = process.env.SUPABASE_URL;
  if (!raw) return null;

  try {
    return new URL(raw).origin;
  } catch {
    // A malformed value is `env.ts`'s problem to report properly. Here it just
    // means no host to add, and a broken CSP entry would be worse than none.
    return null;
  }
})();

const supabaseSource = supabaseOrigin ? ` ${supabaseOrigin}` : "";

/**
 * CONTENT SECURITY POLICY — and the trade-off that decided its shape.
 *
 * Next.js supports a nonce-based CSP, generated per request in `proxy.ts`. It is
 * strictly stronger than what is below, because it removes `'unsafe-inline'`
 * from `script-src` entirely. We are not using it, and the reason is not
 * laziness:
 *
 *   **A nonce forces every page to render dynamically.** Nonces are injected
 *   during server-side rendering from the request's CSP header, and a statically
 *   generated page has no request. Turning it on means 150-odd destination pages
 *   stop being static, lose CDN caching, and are re-rendered per visitor — for a
 *   marketing site whose main job is being fast, that is a large, permanent cost
 *   paid on every page, most of which contain no personal data and no forms.
 *
 * So: a static policy, applied everywhere, tight everywhere it can be. What is
 * given up is protection against an injected *inline* script; what is kept is
 * protection against injected *external* scripts, form hijacking, clickjacking,
 * plugin embedding and base-tag rewriting — and those cover the attacks that
 * actually reach a site with no user-generated content.
 *
 * IF THAT CALCULUS CHANGES — the obvious trigger being applicant-supplied text
 * rendered back to other users — the nonce version belongs in `proxy.ts`, scoped
 * with a matcher to `/login`, `/apply`, `/profile` and `/ops`, which are dynamic
 * already. Those four routes can afford it and the destination pages cannot.
 *
 * EVERY ENTRY BELOW IS LOAD-BEARING. Removing one breaks a specific feature,
 * named where it is not obvious.
 */
const csp = [
  "default-src 'self'",

  // `unsafe-inline`: Next.js inlines its bootstrap and flight payload scripts.
  // Cloudflare: the Turnstile widget on the login form.
  // `unsafe-eval` in development only — React uses eval to rebuild server error
  // stacks in the browser, and neither React nor Next uses it in production.
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${
    isDev ? " 'unsafe-eval'" : ""
  }`,

  // Tailwind v4 emits inline custom properties, and framer-motion and GSAP both
  // animate by writing to `style`. There is no nonce-based version of this that
  // does not mean rewriting the animation layer.
  "style-src 'self' 'unsafe-inline'",

  // `data:` and `blob:` are the passport and photograph capture — the camera
  // produces a blob and the preview reads it back.
  //
  // The three remote hosts are all imagery. Unsplash and Wikimedia are the
  // destination photography (see `lib/countryImagery.ts`); flagcdn.com serves
  // every country flag on the site — the cards, the related-visa strip, the
  // passport index, the application header. Omitting it was caught by an
  // end-to-end run reporting a CSP violation on `flagcdn.com/w80/th.png`, which
  // is the sort of breakage that shows up as "the flags stopped loading" three
  // days after a deploy and nowhere in any log.
  // Supabase is appended for the document viewer in the ops console, which
  // renders passport scans from signed Storage URLs.
  `img-src 'self' data: blob: https://images.unsplash.com https://upload.wikimedia.org https://flagcdn.com${supabaseSource}`,

  "font-src 'self' data:",
  "media-src 'self' blob:",

  // Turnstile's verification calls; Sentry's ingest; PostHog's capture endpoint.
  // Each is only reached if the corresponding key is configured.
  // Supabase is appended for the direct browser-to-Storage upload.
  `connect-src 'self' https://challenges.cloudflare.com https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.posthog.com${supabaseSource}`,

  // The Turnstile challenge renders in an iframe. Without this the widget shows
  // an empty box and every login fails.
  "frame-src https://challenges.cloudflare.com",

  "object-src 'none'",
  "base-uri 'self'",

  // A form on this origin may only post to this origin. Stops an injected form
  // from exfiltrating a half-completed application to somewhere else.
  "form-action 'self'",

  // Clickjacking. This site can never be framed, which matters most for the
  // application flow — an invisible frame over a "Submit" button is the classic
  // version of this attack.
  "frame-ancestors 'none'",

  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },

  // Two years, with subdomains, and preload-eligible. Only meaningful over
  // HTTPS, and harmless on localhost because browsers ignore it there.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },

  // Stops a browser from deciding an uploaded file is HTML because it looks
  // like HTML. Relevant here: documents are served through signed URLs from
  // Supabase, but this closes the same door on anything served from our origin.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // `frame-ancestors` above is the real defence; this is the same rule for
  // browsers that predate it.
  { key: "X-Frame-Options", value: "DENY" },

  // Send the full URL within the site and only the origin when leaving it, so
  // an outbound link from `/track/ABZ-1234` does not hand the reference to a
  // third party.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Camera stays enabled — the passport and photograph capture is the product.
  // Everything else this site has no business asking for is denied outright, so
  // that an injected script cannot ask on our behalf.
  {
    key: "Permissions-Policy",
    value: [
      "camera=(self)",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
      "accelerometer=()",
      "interest-cohort=()",
    ].join(", "),
  },

  // Isolates this origin's browsing context group from popups it opens and from
  // whatever opened it.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },

  // The framework version is not a secret worth keeping, but it is free to stop
  // advertising which release to check advisories against.
  poweredByHeader: false,

  async redirects() {
    return countryRedirects;
  },

  async headers() {
    return [
      {
        // Everything. A header that protects most pages is a header somebody
        // will find the gap in.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // Nothing under the ops console or the account pages may be cached by a
        // shared cache. `private` is not enough on its own — an intermediate
        // proxy that ignores it would be holding somebody's passport review
        // screen.
        source: "/(ops|profile|applications)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, no-cache, must-revalidate, max-age=0",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
