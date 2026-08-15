import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";

import { publicEnv } from "@/lib/env.public";

/**
 * THE BROWSER SIDE — error reporting and analytics.
 * ---------------------------------------------------------------------------
 * Both are off unless their key is present, and that is the correct default: a
 * site nobody has configured analytics for should not be sending anything
 * anywhere.
 *
 * ── The two things that would be a data breach with a dashboard ──
 *
 * 1. **Session replay is disabled outright.** Replay records the DOM, including
 *    what is typed into inputs. On the apply flow that is a passport number, a
 *    date of birth and a photograph; on the login screen it is a one-time code.
 *    Masking can be configured, and a masking rule that is wrong once is a
 *    permanent recording of somebody's passport. There is no version of this
 *    feature worth the risk on this application.
 *
 * 2. **Autocapture is off on `/apply`, `/login`, `/profile` and `/ops`.**
 *    Autocapture records the text of what was clicked, which on those pages
 *    includes traveller names and reference numbers. It stays on elsewhere,
 *    where the pages are marketing content and the data is a destination name.
 */

const PRIVATE_PATHS = ["/apply", "/login", "/profile", "/applications", "/ops", "/track"];

function isPrivate(pathname: string): boolean {
  return PRIVATE_PATHS.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

if (publicEnv.sentryDsn) {
  Sentry.init({
    dsn: publicEnv.sentryDsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,

    // Same reasoning as the server: no request bodies, no headers, no cookies.
    sendDefaultPii: false,

    // Explicit, even though it is also the default — this is the setting that
    // would quietly start recording passports if a future SDK changed its mind.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    beforeBreadcrumb(breadcrumb) {
      // A `ui.input` breadcrumb carries what was typed.
      if (breadcrumb.category === "ui.input") return null;
      if (breadcrumb.category === "console") return null;
      return breadcrumb;
    },
  });
}

if (publicEnv.posthogKey) {
  posthog.init(publicEnv.posthogKey, {
    api_host: publicEnv.posthogHost,

    // Decided per page, below, rather than globally.
    autocapture: !isPrivate(window.location.pathname),

    // See the header. Not negotiable on a site that handles passports.
    disable_session_recording: true,

    // PostHog's default captures the full URL including the query string. A
    // `?next=/applications/abc` or a reference in a path is not analytics data.
    mask_all_element_attributes: true,
    mask_all_text: false,

    // Manual, so that a route change into a private path does not capture a
    // pageview with the reference in it before the check below runs.
    capture_pageview: false,
    capture_pageleave: true,

    person_profiles: "identified_only",
  });

  const capture = () => {
    const { pathname } = window.location;
    if (isPrivate(pathname)) return;

    // Pathname only. No search string, no hash — a reference lives in the path
    // on `/track/:reference`, which is why that prefix is in the private list.
    posthog.capture("$pageview", { $current_url: window.location.origin + pathname });
  };

  capture();

  // App Router navigations do not fire `popstate` for pushes, so patching is
  // the only reliable hook without a router subscription in every layout.
  const push = history.pushState;
  history.pushState = function patched(...args) {
    push.apply(this, args);
    capture();
  };
  window.addEventListener("popstate", capture);
}

/** Next 16 reports client-side navigation timing through this hook. Exported
 *  unconditionally; it is inert when Sentry was never initialised. */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
