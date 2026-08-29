import { describe, expect, it } from "vitest";

import {
  PAYMENT_GATEWAY,
  PAYMENT_METHODS,
  PAYMENT_PREVIEW_NOTICE,
  PAYMENT_PREVIEW_RECEIPT_STAMP,
  paymentEnabled,
  paymentIsPreview,
  paymentMethod,
} from "./paymentConfig";

/**
 * THE POINT OF THIS FILE.
 *
 * The payment step is live on the site without a gateway behind it. What makes
 * that honest rather than a fake checkout is two disclosures — the notice above
 * the form and the stamp across the receipt — and disclosures are exactly the
 * kind of thing that gets deleted in a tidy-up six months from now by somebody
 * who reads them as placeholder copy.
 *
 * So the invariant is asserted rather than described in a comment: while the
 * app is in preview, both must exist and both must actually say that nothing is
 * charged. A test failing here is not a broken test — it means the screen has
 * started claiming to take money it cannot take.
 */
describe("payment mode", () => {
  it("is internally consistent", () => {
    // preview is derived from the gateway, so the two cannot disagree.
    expect(paymentIsPreview).toBe(PAYMENT_GATEWAY === "none");

    // A named gateway is always enabled; "none" is enabled only in preview.
    if (PAYMENT_GATEWAY !== "none") expect(paymentEnabled).toBe(true);
  });

  it("shows the step, in one mode or the other", () => {
    // Documents the current shipped state. If the step is ever taken back out
    // of the flow, this is the line that says so out loud.
    expect(paymentEnabled).toBe(true);
  });
});

describe("preview disclosures", () => {
  it("keeps both disclosures while no gateway answers", () => {
    if (!paymentIsPreview) return;

    expect(PAYMENT_PREVIEW_NOTICE.trim().length).toBeGreaterThan(0);
    expect(PAYMENT_PREVIEW_RECEIPT_STAMP.trim().length).toBeGreaterThan(0);
  });

  it("says plainly that no card is charged, rather than hinting at it", () => {
    if (!paymentIsPreview) return;

    // The applicant has their wallet out. "Coming soon" is not the same
    // sentence as "your card will not be charged", and only one of them
    // answers the question they are about to act on.
    expect(PAYMENT_PREVIEW_NOTICE.toLowerCase()).toMatch(/no card is charged/);
    expect(PAYMENT_PREVIEW_NOTICE.toLowerCase()).toMatch(/no money moves/);

    // And it must not leave them wondering how they are meant to pay instead.
    expect(PAYMENT_PREVIEW_NOTICE.toLowerCase()).toMatch(/directly/);
  });

  it("stamps the receipt so it cannot be read as a record on its own", () => {
    if (!paymentIsPreview) return;

    // The receipt outlives the screen — screenshotted, or forwarded to somebody
    // who never saw the notice on the form. It has to carry the disclaimer
    // itself, which means the word has to be in the stamp.
    expect(PAYMENT_PREVIEW_RECEIPT_STAMP.toUpperCase()).toMatch(/PREVIEW|SPECIMEN|NOT A REAL/);
  });
});

describe("payment methods", () => {
  it("resolves every id in the union", () => {
    for (const method of PAYMENT_METHODS) {
      expect(paymentMethod(method.id)).toBe(method);
    }
  });

  it("throws on an id with no entry, rather than rendering an undefined label", () => {
    // A member added to `PaymentMethodId` but not to `PAYMENT_METHODS` should
    // fail at the call site instead of drawing a blank tab.
    expect(() => paymentMethod("wallet" as never)).toThrow(/Unknown payment method/);
  });

  it("offers a card tab, which is the only method with a form", () => {
    expect(PAYMENT_METHODS.some((method) => method.id === "card")).toBe(true);
  });
});
