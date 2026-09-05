import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The two signature checks and the status mapping.
 *
 * These are the whole security surface of the payment integration that can be
 * tested without an acquirer: everything else is a network call to Razorpay.
 * They are also the three things that fail silently — a swapped secret verifies
 * nothing and returns `false` for every real payment, which looks like an
 * outage rather than a bug.
 *
 * `env` is mocked rather than the process environment being set, because
 * `lib/env.ts` validates and caches on first read, and a test that set
 * `process.env` after another suite had already read it would get the cached
 * value and pass for the wrong reason.
 */

const KEY_SECRET = "test_key_secret_do_not_use";
const WEBHOOK_SECRET = "test_webhook_secret_do_not_use";

vi.mock("@/lib/env", () => ({
  env: () => ({
    NEXT_PUBLIC_RAZORPAY_KEY_ID: "rzp_test_abc123",
    RAZORPAY_KEY_SECRET: KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
  }),
  capabilities: { payments: () => true },
}));

const { checkoutSignatureValid, mapStatus, webhookSignatureValid } = await import(
  "./razorpay"
);

describe("checkoutSignatureValid", () => {
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";

  const sign = (payload: string, secret: string) =>
    createHmac("sha256", secret).update(payload).digest("hex");

  it("accepts the signature Razorpay actually produces", () => {
    expect(
      checkoutSignatureValid({
        orderId,
        paymentId,
        signature: sign(`${orderId}|${paymentId}`, KEY_SECRET),
      }),
    ).toBe(true);
  });

  it("rejects a signature made with the WEBHOOK secret", () => {
    // The commonest way to get this wrong, and the one that produces an
    // integration which passes in test mode and rejects every live payment.
    expect(
      checkoutSignatureValid({
        orderId,
        paymentId,
        signature: sign(`${orderId}|${paymentId}`, WEBHOOK_SECRET),
      }),
    ).toBe(false);
  });

  it("rejects a signature over the payload in the wrong order", () => {
    // `payment|order` rather than `order|payment`. Both are plausible from the
    // documentation and only one is right.
    expect(
      checkoutSignatureValid({
        orderId,
        paymentId,
        signature: sign(`${paymentId}|${orderId}`, KEY_SECRET),
      }),
    ).toBe(false);
  });

  it("rejects a signature for a different payment on the same order", () => {
    expect(
      checkoutSignatureValid({
        orderId,
        paymentId,
        signature: sign(`${orderId}|pay_SOMETHINGELSE`, KEY_SECRET),
      }),
    ).toBe(false);
  });

  it("rejects an empty or truncated signature without throwing", () => {
    // `timingSafeEqual` throws on a length mismatch, so the length guard has to
    // come first. A throw here would be a 500 on a real payment.
    expect(() =>
      checkoutSignatureValid({ orderId, paymentId, signature: "" }),
    ).not.toThrow();
    expect(checkoutSignatureValid({ orderId, paymentId, signature: "" })).toBe(false);
    expect(checkoutSignatureValid({ orderId, paymentId, signature: "abc" })).toBe(false);
  });
});

describe("webhookSignatureValid", () => {
  const body = '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_1"}}}}';

  it("accepts an HMAC over the raw body keyed with the webhook secret", () => {
    const signature = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    expect(webhookSignatureValid(body, signature)).toBe(true);
  });

  it("rejects one keyed with the API key secret", () => {
    const signature = createHmac("sha256", KEY_SECRET).update(body).digest("hex");
    expect(webhookSignatureValid(body, signature)).toBe(false);
  });

  it("rejects a body that has been through a JSON round trip", () => {
    // THE failure this test exists for. Hashing `JSON.stringify(JSON.parse(raw))`
    // works whenever Razorpay's serialiser and V8's happen to agree about
    // whitespace and key order, and fails when they do not — an integration
    // that verifies nine webhooks and rejects the tenth.
    const signature = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
    const reserialised = JSON.stringify(JSON.parse(body), null, 2);

    expect(reserialised).not.toBe(body);
    expect(webhookSignatureValid(reserialised, signature)).toBe(false);
  });

  it("rejects a missing signature header rather than passing it through", () => {
    expect(webhookSignatureValid(body, null)).toBe(false);
  });
});

describe("webhookSignatureValid without a configured secret", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.resetModules();
  });

  it("fails closed", async () => {
    // An unauthenticated webhook that marks payments captured is an endpoint
    // anybody can POST to in order to mark their own application paid. "Not
    // configured" must never mean "accept everything".
    vi.doMock("@/lib/env", () => ({
      env: () => ({ RAZORPAY_WEBHOOK_SECRET: undefined }),
      capabilities: { payments: () => false },
    }));

    const fresh = await import("./razorpay");
    expect(fresh.webhookSignatureValid("{}", "anything")).toBe(false);
  });
});

describe("mapStatus", () => {
  it("maps Razorpay's states onto ours by name", () => {
    expect(mapStatus("created")).toBe("created");
    expect(mapStatus("authorized")).toBe("authorized");
    expect(mapStatus("captured")).toBe("captured");
    expect(mapStatus("refunded")).toBe("refunded");
    expect(mapStatus("failed")).toBe("failed");
  });

  it("treats an unrecognised state as a failure, not as a success", () => {
    // A state this code has not been taught is a state it cannot claim was a
    // successful payment. Erring toward `failed` means not shipping a visa
    // application nobody paid for.
    expect(mapStatus("some_new_state")).toBe("failed");
    expect(mapStatus("")).toBe("failed");
  });
});
