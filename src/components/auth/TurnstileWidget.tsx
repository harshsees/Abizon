"use client";

import { useEffect, useRef, useState } from "react";

import { publicEnv } from "@/lib/env.public";

/**
 * THE TURNSTILE WIDGET.
 * ---------------------------------------------------------------------------
 * Renders Cloudflare's check and puts its token into the form as a hidden
 * input, where `loginAction` reads it as `turnstileToken`.
 *
 * WHY EXPLICIT RENDERING rather than dropping a `cf-turnstile` div and letting
 * the script find it. The implicit mode renders once, on script load. This form
 * lives inside a two-step state machine that remounts, and it can fail and be
 * resubmitted — and a Turnstile token is single-use, so the second submit of a
 * form that failed the first time posts a token Cloudflare has already seen and
 * gets `timeout-or-duplicate`. Explicit rendering gives us the widget id, which
 * is what `reset()` needs. Without it the applicant hits an unexplainable
 * second failure after every recoverable first one.
 *
 * WHEN NO SITE KEY IS SET, this renders nothing at all — not a disabled widget,
 * not a placeholder. The server-side check in `lib/auth/turnstile.ts` skips in
 * exactly the same case, so the two halves cannot disagree about whether the
 * check is on.
 *
 * CSP. The script and the iframe it creates need `challenges.cloudflare.com` in
 * `script-src` and `frame-src`. Both are in `proxy.ts`, and if either goes
 * missing the widget fails silently and every login stops — which is worth
 * knowing before changing that header.
 */

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "auto" | "light" | "dark";
      appearance?: "always" | "execute" | "interaction-only";
    },
  ) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Shared across mounts — the script only ever needs loading once per page. */
let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Turnstile failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Turnstile failed to load")));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export type TurnstileWidgetProps = {
  /**
   * Changing this resets the widget and clears the token. The login card passes
   * the current error, so a rejected submit issues a fresh token rather than
   * replaying the spent one.
   */
  resetKey?: string;
  /**
   * Whether the form may be submitted yet.
   *
   * ── The bug this exists to close ──
   *
   * The token does not arrive when the page does. Cloudflare's script loads,
   * renders an iframe, runs its checks and calls back — measured at roughly
   * 1.5 to 2 seconds on a fast connection, and longer on a phone. Until that
   * callback fires the hidden input is EMPTY, and the submit button was live
   * the whole time.
   *
   * So somebody who typed their number and pressed Send — which is everybody
   * who knows their own phone number — posted an empty token and was told "We
   * could not confirm you are not a robot. Reload and try again." Reloading
   * does not help, because the race is the same on the next page load and the
   * fast typist loses it again. That is the whole of "I am not able to sign
   * in": a login that works only if you hesitate.
   *
   * Reported upward rather than fixed inside this component because the button
   * that has to be disabled is in `LoginCard`, and a widget that silently
   * blocked its parent's submit would be worse than one that says so.
   *
   * `true` in the two cases where waiting is pointless: no site key (the
   * server skips the check under exactly the same condition), and a widget
   * that failed to load (no token is ever coming, and blocking the button
   * would strand the applicant behind a check that is not running).
   */
  onReadyChange?: (ready: boolean) => void;
};

export function TurnstileWidget({ resetKey, onReadyChange }: TurnstileWidgetProps) {
  const siteKey = publicEnv.turnstileSiteKey;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;
    const container = containerRef.current;

    loadScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: siteKey,
          callback: (value) => setToken(value),
          // A token is good for five minutes. Somebody who opens the login page
          // and then goes to find their phone is inside that window; somebody
          // who leaves the tab open over lunch is not, and gets a fresh one
          // rather than a rejected submit.
          "expired-callback": () => setToken(""),
          "error-callback": () => {
            setToken("");
            setFailed(true);
          },
          theme: "auto",
        });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  // A new `resetKey` means the previous token was spent or rejected.
  useEffect(() => {
    if (!resetKey || !widgetIdRef.current || !window.turnstile) return;
    window.turnstile.reset(widgetIdRef.current);
    setToken("");
  }, [resetKey]);

  /**
   * Tell the form whether it may be submitted.
   *
   * An effect rather than a call inside the Turnstile callbacks, because there
   * are four places readiness changes — the token arriving, it expiring, the
   * widget erroring, and a reset clearing it — and routing them all through
   * one derived value is what stops the fifth one being forgotten.
   */
  const ready = !siteKey || failed || token !== "";
  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  if (!siteKey) return null;

  return (
    <div>
      <input type="hidden" name="turnstileToken" value={token} />
      <div ref={containerRef} className="flex justify-center" />

      {failed ? (
        // Said plainly, because the applicant cannot fix it and should not be
        // left staring at a blank space wondering what did not load. An ad
        // blocker or a corporate network is the usual cause.
        <p className="mt-2 text-center text-2xs text-muted-foreground">
          The security check could not load. Disable any blocker for this page, or
          try a different network.
        </p>
      ) : null}
    </div>
  );
}
