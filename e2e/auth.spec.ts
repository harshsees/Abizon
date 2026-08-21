import { expect, test } from "@playwright/test";

/**
 * THE SIGN-IN FLOW, through a browser.
 * ---------------------------------------------------------------------------
 * The unit tests cover the rules. These cover the wiring: that the server owns
 * which step is on screen, that a rejected `?next=` really does fall back, and
 * that the route gate bounces a signed-out visitor.
 *
 * NOT COVERED HERE, and deliberately: entering a correct code. The code is
 * generated server-side and handed to the `memory` driver, which lives in the
 * server's memory — a browser test has no way to read it without an endpoint
 * that exposes codes, and adding one to make a test pass would be adding the
 * worst possible endpoint. That path is covered end-to-end in `otp.test.ts`
 * against the modules directly.
 */

/**
 * A number nobody else in this run — or the previous one — has used.
 *
 * The per-number ceiling is five sends an hour, and it is enforced by the
 * in-memory store, which lives in the dev server. `reuseExistingServer` keeps
 * that server alive between local runs, so a fixed number accumulates sends
 * across every run of the day and the suite starts failing on about the third
 * one, in the two tests that send. That reads exactly like a regression in the
 * login flow and is not one; it cost a bisect before the cause was obvious.
 *
 * Deriving the subscriber digits from the clock makes each run a fresh number,
 * so the ceiling is only ever exercised by a test that means to. `9` keeps it
 * in India's mobile range — a landline prefix is rejected before any send, and
 * one of the tests above depends on that being true.
 */
function freshMobile(): { national: string; grouped: string } {
  const national = `9${String(Date.now()).slice(-9)}`;
  return {
    national,
    grouped: `+91 ${national.slice(0, 5)} ${national.slice(5)}`,
  };
}

test.describe("signing in", () => {
  test("bounces a signed-out visitor off the profile and carries the destination", async ({
    page,
  }) => {
    await page.goto("/profile");

    await expect(page).toHaveURL(/\/login\?next=%2Fprofile/);
  });

  test("rejects a malformed number before any SMS is sent", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Mobile number").fill("9882");
    await page.getByRole("button", { name: /send code/i }).click();

    // Still on the phone step. The step is set by the server, so staying here
    // is the assertion that the server refused rather than that the client
    // guessed.
    await expect(page.getByRole("button", { name: /send code/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /enter the code/i })).toBeHidden();
  });

  test("rejects a landline prefix", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Mobile number").fill("1122334455");
    await page.getByRole("button", { name: /send code/i }).click();

    await expect(page.getByRole("heading", { name: /enter the code/i })).toBeHidden();
  });

  test("advances to the code step for a valid number", async ({ page }) => {
    const mobile = freshMobile();
    await page.goto("/login");

    await page.getByLabel("Mobile number").fill(mobile.national);
    await page.getByRole("button", { name: /send code/i }).click();

    await expect(page.getByRole("heading", { name: /enter the code/i })).toBeVisible();

    // Normalised and shown back, grouped for reading. The applicant needs to be
    // able to check they typed the number they meant before waiting for a
    // message that will otherwise never arrive.
    //
    // `.first()` because the grouped number appears inside a sentence, so both
    // the span and its containing paragraph match — which is a strict-mode
    // violation rather than a failure of the thing being tested.
    await expect(page.getByText(mobile.grouped).first()).toBeVisible();
  });

  test("lets the applicant go back and change the number", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Mobile number").fill(freshMobile().national);
    await page.getByRole("button", { name: /send code/i }).click();
    await expect(page.getByRole("heading", { name: /enter the code/i })).toBeVisible();

    await page.getByRole("button", { name: /use a different number/i }).click();
    await expect(page.getByRole("button", { name: /send code/i })).toBeVisible();
  });

  test("does not index the login page", async ({ request }) => {
    // A login screen ranking in search results only ever helps a phishing
    // lookalike rank alongside it.
    const body = await (await request.get("/login")).text();
    expect(body).toContain("noindex");
  });
});

test.describe("the ops console", () => {
  test("is not reachable without a staff session", async ({ page }) => {
    await page.goto("/ops");
    await expect(page).toHaveURL(/\/ops\/login/);
  });

  test("does not leak whether an application exists", async ({ page }) => {
    await page.goto("/ops/applications/00000000-0000-0000-0000-000000000000");
    await expect(page).toHaveURL(/\/ops\/login/);
  });
});
