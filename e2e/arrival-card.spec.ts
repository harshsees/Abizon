import { expect, test } from "@playwright/test";

/**
 * THE ARRIVAL-CARD FLOW.
 * ---------------------------------------------------------------------------
 * What is worth covering here is not that the form renders. It is the set of
 * claims the flow must never make, each of which is a sentence somebody could
 * add in good faith and nobody would notice:
 *
 *   - that the destination has an arrival card, when nobody checked
 *   - that Abizon submitted it
 *   - that a passport was verified against anything
 *
 * The first is a route test, because the route IS the claim: an arrival-card
 * page existing for a destination tells the visitor the scheme exists. The
 * rest are copy tests, which is the right shape — the failure mode is wording,
 * and wording is what these read.
 *
 * The scan itself is covered by the unit tests over `mrzToValues` and the MRZ
 * parser. Exercising it end to end would need a photograph of a real passport
 * in the repository, which is not a thing to commit.
 */

/**
 * One worker for this file, which is what CI already does for the whole suite
 * (`workers: 1`).
 *
 * The reason is the one the config already records for `/login`: these run
 * against `next dev`, which compiles a route on its first request. This file
 * is the heaviest cold-compile load in the suite — eleven variants of a
 * dynamic segment plus two destination pages — and several workers hitting
 * them at once made the dev server answer 500, and made an interactive click
 * miss the 30s test timeout, in a different test on every run. All thirteen
 * URLs serve correctly from a production build and from a warm dev server.
 *
 * Serialising the file removes the contention rather than retrying past it,
 * and costs about twenty seconds locally. Other files still run in parallel.
 */
test.describe.configure({ mode: "serial" });

/** Measured against atlys.com on 2026-08-22; see `lib/arrivalCard.ts`. */
const LIVE = ["sri-lanka", "thailand", "malaysia", "maldives", "mauritius"];

/**
 * Schemes that genuinely exist but ship `unverified`, plus destinations with
 * no scheme at all. Both must be unreachable, and for the same reason.
 */
const OFF = ["singapore", "philippines", "cambodia", "france", "japan"];

/*
 * Both sets are walked inside one test each rather than generated into a test
 * per destination. Ten workers each asking a development server for a
 * different variant of the same uncompiled dynamic route is a compile
 * stampede, and it answers some of them 500 — a property of `next dev` under
 * `fullyParallel`, not of the route, which serves all eleven correctly from a
 * production build. Sequential navigation inside one worker also happens to be
 * what the assertion is about: the set, not each member.
 */
test.describe("who gets an arrival card", () => {
  test("the five that were measured, and it names each destination", async ({ page }) => {
    for (const slug of LIVE) {
      const response = await page.goto(`/arrival-card/${slug}`);
      expect(response?.status(), slug).toBe(200);

      // Country-aware rather than hardcoded: the masthead has to be about the
      // destination the visitor chose.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByRole("button", { name: /upload passport front/i }),
      ).toBeVisible();
    }
  });

  test("everywhere else is a 404, not an empty form", async ({ page }) => {
    for (const slug of OFF) {
      // A page that loads and then says "unavailable" still tells a crawler
      // and a visitor that the URL means something. It does not.
      const response = await page.goto(`/arrival-card/${slug}`);
      expect(response?.status(), slug).toBe(404);
    }
  });

  test("the destination page links to it only where there is one", async ({ page }) => {
    await page.goto("/visa/sri-lanka");
    await expect(page.locator('a[href="/arrival-card/sri-lanka"]')).toHaveCount(1);

    await page.goto("/visa/france");
    await expect(page.locator('a[href^="/arrival-card/"]')).toHaveCount(0);
  });
});

test.describe("what the flow refuses to claim", () => {
  test("never offers to submit the arrival card itself", async ({ page }) => {
    await page.goto("/arrival-card/thailand");

    // Abizon cannot file one — no immigration service here accepts a
    // third-party submission — so a "Submit application" button would be a
    // button that cannot do what it says.
    await expect(page.getByRole("button", { name: /^submit/i })).toHaveCount(0);
  });

  test("does not claim any database or security check", async ({ page }) => {
    await page.goto("/arrival-card/thailand");
    const body = (await page.locator("body").innerText()).toLowerCase();

    // The reference this was modelled on shows "Checking global security
    // databases" while a passport uploads. We are not connected to one.
    expect(body).not.toContain("security database");
    expect(body).not.toContain("travel restriction");
    expect(body).not.toContain("government database");
    expect(body).not.toContain("verified against");
  });

  test("says the passport is read on the device, not uploaded", async ({ page }) => {
    await page.goto("/arrival-card/thailand");
    await expect(page.getByText(/read on your device and never uploaded/i).first())
      .toBeVisible();
  });

  test("sends the completed form to the government's own site", async ({ page }) => {
    await page.goto("/arrival-card/thailand");

    for (const [label, value] of [
      ["First name", "Manvendra"],
      ["Last name", "Umat"],
      ["Date of birth", "2002-10-04"],
      ["Passport number", "W3405208"],
      ["Passport issued on", "2022-09-02"],
      ["Passport valid till", "2032-09-01"],
      ["Passport place of issue", "Jaipur"],
    ] as const) {
      await page.getByLabel(new RegExp(`^${label}`, "i")).first().fill(value);
    }

    await page.getByRole("button", { name: /review and continue/i }).click();

    // The truthful final state: ready, and handed off. Not "submitted", and
    // no invented reference number.
    const onward = page.getByRole("link", { name: /continue on/i });
    await expect(onward).toBeVisible();
    await expect(onward).toHaveAttribute("href", /^https:\/\/tdac\.immigration\.go\.th/);
    await expect(page.getByText(/ready to submit/i)).toBeVisible();
  });

  test("will not advance on an empty form, and says what is missing", async ({ page }) => {
    await page.goto("/arrival-card/thailand");
    await page.getByRole("button", { name: /review and continue/i }).click();

    await expect(page.getByText(/first name is required/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /continue on/i })).toHaveCount(0);
  });
});

test.describe("more than one traveller", () => {
  test("adds a section without disturbing the first", async ({ page }) => {
    await page.goto("/arrival-card/thailand");

    const first = page.getByLabel(/^First name/i).first();
    await first.fill("Manvendra");

    await page.getByRole("button", { name: /add travellers/i }).click();
    await expect(page.getByRole("heading", { name: /^traveller 2$/i })).toBeVisible();

    // The bug this exists to catch: a second traveller sharing one traveller's
    // worth of state, so filling either overwrites the other.
    await page.getByLabel(/^First name/i).nth(1).fill("Anjali");
    await expect(first).toHaveValue("Manvendra");

    await page.getByRole("button", { name: /remove.*traveller 2/i }).click();
    await expect(page.getByRole("heading", { name: /^traveller 2$/i })).toHaveCount(0);
    await expect(first).toHaveValue("Manvendra");
  });
});
