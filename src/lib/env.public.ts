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

  /**
   * Razorpay's merchant key id.
   *
   * Public in the strongest sense — Checkout puts it in the page itself, and it
   * authenticates nothing; the secret that does is in `env.ts` and stays there.
   *
   * It is read HERE so the browser can answer "is a gateway configured" without
   * a round trip. The apply flow is a client component from the route down, so
   * `paymentIsPreview()` — which decides between the live checkout and the
   * preview card form — has no server to ask.
   *
   * The value used for the actual Checkout call comes back from
   * `createPaymentOrderAction` rather than from here. Same variable, but the
   * order and the key it was created under should travel together: a key read
   * from the bundle and an order created on the server are two facts that can
   * be from different deployments, and Razorpay rejects that pairing in a way
   * nobody would enjoy debugging.
   */
  razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
} as const;

export const publicCapabilities = {
  turnstile: publicEnv.turnstileSiteKey.length > 0,
  analytics: publicEnv.posthogKey.length > 0,
  errorReporting: publicEnv.sentryDsn.length > 0,

  /**
   * Can this deployment take money?
   *
   * The browser's half of `capabilities.payments()` in `env.ts`, and it
   * deliberately checks only the key id — the secret is not here and must never
   * be. The two can therefore disagree in exactly one way: a deployment with a
   * key id and no secret. `env.ts` refuses that deploy in production, which is
   * the right place to catch it.
   */
  payments: publicEnv.razorpayKeyId.length > 0,
} as const;
