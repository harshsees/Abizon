import * as Sentry from "@sentry/nextjs";

/**
 * ERROR REPORTING — server side.
 * ---------------------------------------------------------------------------
 * `register()` runs once per server process before anything else. That is the
 * only place Sentry can install its instrumentation early enough to see
 * everything, which is why this is a root-level file convention rather than
 * something imported from a layout.
 *
 * ── The part that matters more than the setup ──
 *
 * Sentry captures generously by default: request bodies, headers, cookies,
 * local variables in some frames, and every breadcrumb leading to the error.
 * On this application those paths carry phone numbers, one-time codes, passport
 * numbers and session cookies, and an error tracker holding all of that is a
 * second copy of the database in somebody else's account.
 *
 * So `beforeSend` and `beforeBreadcrumb` below are not tidying. They are the
 * reason this file is safe to switch on.
 */

/** Anything whose *name* looks like one of these has its value replaced. Names
 *  are matched, not values — a value-based scrubber has to guess, and guessing
 *  wrong in either direction is bad. */
const SENSITIVE = [
  "password",
  "passport",
  "code",
  "otp",
  "token",
  "secret",
  "authorization",
  "cookie",
  "phone",
  "dob",
  "dateofbirth",
  "email",
];

function looksSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE.some((needle) => lower.includes(needle));
}

function scrub<T>(value: T, depth = 0): T {
  if (depth > 4 || value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.map((entry) => scrub(entry, depth + 1)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    result[key] = looksSensitive(key) ? "[redacted]" : scrub(entry, depth + 1);
  }

  return result as unknown as T;
}

export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

    // A visa site's traffic is small enough that full tracing is affordable and
    // useful. Lower it if the bill says otherwise; do not raise the sampling of
    // anything that carries request bodies.
    tracesSampleRate: 0.2,

    // Off. Both attach the request body and headers to the event, which is
    // exactly the data this application must not export.
    sendDefaultPii: false,

    beforeSend(event) {
      // Query strings can carry a `?next=` and, if somebody ever gets it wrong,
      // a reference. Neither belongs in a third-party dashboard.
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.query_string) event.request.query_string = "[redacted]";
        if (event.request.headers) event.request.headers = scrub(event.request.headers);
      }

      if (event.extra) event.extra = scrub(event.extra);
      if (event.contexts) event.contexts = scrub(event.contexts);

      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      // A `console.info` breadcrumb is how a one-time code printed by the
      // development SMS driver would reach Sentry in an environment where both
      // are on at once.
      if (breadcrumb.category === "console") return null;
      if (breadcrumb.data) breadcrumb.data = scrub(breadcrumb.data);
      return breadcrumb;
    },
  });
}

/**
 * Next 16 calls this for errors thrown during rendering and in route handlers.
 * Without it those are logged and never reported, which is the class of error
 * that matters most — a page that throws for one applicant and nobody else.
 */
export const onRequestError = Sentry.captureRequestError;
