/**
 * PUBLIC ENVIRONMENT — the half that ships to the browser.
 * ---------------------------------------------------------------------------
 * Separate from `env.ts` for two reasons, and the second one is not obvious.
 *
 * 1. `env.ts` is `server-only`. Importing it from a client component is a build
 *    error, which is the point — it holds the service-role key.
 *
 * 2. `NEXT_PUBLIC_*` variables are inlined at build time by a *textual* match on
 *    `process.env.NEXT_PUBLIC_FOO`. Reading them through a variable, a loop, or
 *    a Zod `.parse(process.env)` yields `undefined` in the browser, because
 *    there is no `process` there to read from — only the literal the compiler
 *    substituted. So every one of these is written out longhand, and that
 *    repetition is load-bearing rather than laziness.
 *
 * Everything here is public by definition. A Turnstile *site* key is meant to be
 * in the page; a Turnstile *secret* key is in `env.ts` and stays there.
 */

export const publicEnv = {
  /** Cloudflare Turnstile site key. Absent means the widget is not rendered and
   *  the server-side check is skipped — see `lib/auth/turnstile.ts`. */
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",

  /** PostHog. Absent means no analytics is loaded at all, which is the correct
   *  default: a site that has not been configured for analytics should not be
   *  sending anything anywhere. */
  posthogKey: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
  posthogHost: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",

  /** Sentry's browser DSN. A DSN is not a secret — it is a write-only endpoint. */
  sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN ?? "",
} as const;

export const publicCapabilities = {
  turnstile: publicEnv.turnstileSiteKey.length > 0,
  analytics: publicEnv.posthogKey.length > 0,
  errorReporting: publicEnv.sentryDsn.length > 0,
} as const;
