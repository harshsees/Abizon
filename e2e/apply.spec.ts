import { expect, test } from "@playwright/test";

/**
 * THE APPLY FLOW, IN LOCAL MODE.
 * ---------------------------------------------------------------------------
 * The e2e environment has no `DATABASE_URL`, on purpose — a suite that needs a
 * live Postgres is a suite that stops being run, and the one thing that must
 * never be pointed at production is the database.
 *
 * So what these cover is the half that has to keep working when the server is
 * not there, which is the half most likely to rot: `openApplicationAction`
 * answers `{ available: false, reason: "no-backend" }`, the sync layer falls
 * back, and every piece of copy that could otherwise claim something is saved
 * has to say the opposite instead.
 *
 * That branch is not a nicety. It is what a developer sees on a fresh clone,
 * and it is what an applicant sees if the database is unreachable mid-form.
 *
 * The synced half — uploads, submission, the reference — is covered by the unit
 * tests over the reducer and the repository, because exercising it end to end
 * would mean provisioning Supabase from CI.
 */

test.describe("the apply flow without a backend", () => {
  test("refuses to start without a destination, and says why", async ({ page }) => {
    await page.goto("/apply");

    // The requirements, the fee and the documents all depend on it, so there is
    // no meaningful application to render.
    await expect(page.getByRole("heading", { name: /pick a destination first/i })).toBeVisible();
  });

  test("opens on the trip step for a real destination", async ({ page }) => {
    await page.goto("/apply?country=thailand");

    await expect(page.getByRole("heading", { name: /confirm your trip/i })).toBeVisible();
    await expect(page.getByText("Thailand").first()).toBeVisible();
  });

  test("says the progress is on this device, not in an account", async ({
    page,
    viewport,
  }) => {
    await page.goto("/apply?country=thailand&travellers=1");

    await page.getByLabel("Traveller 1 first name").pressSequentially("ASHA");

    // THE ASSERTION THAT MATTERS, and it holds at every width: the header claims
    // where the work is saved, and the two answers have very different
    // consequences for somebody about to close the tab. Without a backend it
    // must never say "your account".
    await expect(page.getByText("Saved to your account")).toBeHidden();

    // The positive half is desktop-only. The indicator is `hidden sm:flex` —
    // on a phone the header gives its width to the destination name instead,
    // which is the more useful thing to see while typing.
    if ((viewport?.width ?? 0) >= 640) {
      await expect(page.getByText("Saved on this device")).toBeVisible();
    }
  });

  test("tells the applicant their documents will not survive the tab", async ({ page }) => {
    await page.goto("/apply?country=thailand&travellers=1");

    await page.getByLabel("Traveller 1 first name").pressSequentially("ASHA");
    await page.getByRole("button", { name: /continue to documents/i }).click();

    await expect(page.getByRole("heading", { name: /prepare your documents/i })).toBeVisible();

    // The local-mode sentence. Its counterpart — "uploaded to your account as
    // you attach it" — would be a straightforward lie here.
    await expect(page.getByText(/nothing is uploaded to a server/i)).toBeVisible();
    await expect(page.getByText(/uploaded to your account/i)).toBeHidden();
  });

  test("offers no submit button when there is nothing to submit to", async ({ page }) => {
    await page.goto("/apply?country=thailand&travellers=1");

    // A greyed-out Submit would imply the button is the last missing piece,
    // when in fact there is no account to submit against. The absence is the
    // honest signal.
    await expect(page.getByRole("button", { name: /^submit application$/i })).toBeHidden();
  });
});

test.describe("tracking", () => {
  test("does not claim a reference was checked when nothing could check it", async ({
    page,
  }) => {
    await page.goto("/track/ABZ-4K7P-2QRT");

    // "We cannot look this up" and "we looked and found nothing" are different
    // sentences to someone with a flight booked. With no database, only the
    // first is true.
    await expect(page.getByText(/not available on this deployment/i)).toBeVisible();
    await expect(page.getByText(/we have no application with that reference/i)).toBeHidden();
  });

  test("still draws the lifecycle, so the journey does not look shorter than it is", async ({
    page,
  }) => {
    await page.goto("/track/ABZ-4K7P-2QRT");

    await expect(page.getByText("Submitted").first()).toBeVisible();
    await expect(page.getByText("With the authority").first()).toBeVisible();

    // `withdrawn` is where an application stops, not a stage everybody passes
    // through, so it is not drawn as one.
    await expect(page.getByText("Withdrawn")).toBeHidden();
  });
});
