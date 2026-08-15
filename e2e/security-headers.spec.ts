import { expect, test } from "@playwright/test";

/**
 * SECURITY HEADERS.
 * ---------------------------------------------------------------------------
 * These are the cheapest tests in the suite and they cover a failure mode with
 * no other signal: a header dropped from `next.config.ts` breaks nothing, shows
 * nothing, and is noticed by an external scan months later. Nothing about the
 * running site looks different.
 *
 * Each assertion below names the attack it closes, so that anyone loosening one
 * has to decide to.
 */

test.describe("response headers", () => {
  test("a public page carries the full set", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);

    const headers = response.headers();

    // Injected external scripts, form hijacking, plugin embedding.
    expect(headers["content-security-policy"]).toBeTruthy();
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).toContain("form-action 'self'");
    expect(headers["content-security-policy"]).toContain("base-uri 'self'");

    // Clickjacking — an invisible frame over the application flow's submit
    // button is the classic version of this.
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-frame-options"]).toBe("DENY");

    // A file served from this origin being interpreted as HTML.
    expect(headers["x-content-type-options"]).toBe("nosniff");

    // A reference leaking to a third party through an outbound link.
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");

    // The camera stays on — it is the product. Everything else is denied so an
    // injected script cannot ask on our behalf.
    expect(headers["permissions-policy"]).toContain("camera=(self)");
    expect(headers["permissions-policy"]).toContain("geolocation=()");
    expect(headers["permissions-policy"]).toContain("microphone=()");

    // Advertising the exact framework release to check advisories against.
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("the CSP allows what the login page actually needs", async ({ request }) => {
    const csp = (await request.get("/login")).headers()["content-security-policy"];

    // Turnstile renders in an iframe and loads a script. If either is missing
    // the widget shows an empty box and every sign-in fails — with no console
    // error that points at this file.
    expect(csp).toContain("https://challenges.cloudflare.com");
    expect(csp).toContain("frame-src https://challenges.cloudflare.com");

    // The camera preview reads back a blob, and the destination photography is
    // served from remote hosts.
    expect(csp).toContain("blob:");
    expect(csp).toContain("https://images.unsplash.com");
  });

  test("the CSP allows every image host the site actually uses", async ({ request }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"] ?? "";

    // Added after an end-to-end run reported a violation on
    // `flagcdn.com/w80/th.png`. Every country flag on the site comes from there
    // — the cards, the related-visa strip, the passport index, the application
    // header — and a missing host shows up as "the flags stopped loading" days
    // later, in no log, on a page nobody was looking at.
    for (const host of [
      "https://flagcdn.com",
      "https://images.unsplash.com",
      "https://upload.wikimedia.org",
    ]) {
      expect(csp).toContain(host);
    }
  });

  test("blocks image hosts nobody added on purpose", async ({ request }) => {
    const csp = (await request.get("/")).headers()["content-security-policy"] ?? "";

    // The point of listing hosts is that the list is exhaustive. A wildcard
    // would make every assertion above decorative.
    expect(csp).not.toContain("img-src *");
    expect(csp).not.toContain("img-src 'self' https:");
  });

  test("account pages are not cacheable by anything shared", async ({ request }) => {
    // `maxRedirects: 0` is load-bearing. A signed-out request to /profile is
    // redirected to /login, and following it would read the *login page's*
    // headers — which pass this assertion for the wrong reason and would keep
    // passing after the rule was deleted. The header under test is on the
    // redirect itself, because it is applied by path.
    const response = await request.get("/profile", { maxRedirects: 0 });
    const cacheControl = response.headers()["cache-control"] ?? "";

    expect(cacheControl).toContain("no-store");
  });
});
