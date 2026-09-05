import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { capabilities, env } from "@/lib/env";

/**
 * RAZORPAY, AND THE THREE SIGNATURES THAT MATTER
 * ---------------------------------------------------------------------------
 * Everything this application needs from Razorpay is three HTTP calls and two
 * HMACs, so this is a fetch wrapper rather than their SDK.
 *
 * ── Why not the `razorpay` npm package ──
 *
 * It is a thin wrapper over the same REST API, it pulls in its own HTTP stack,
 * and its typings are loose enough that the compiler would not have caught any
 * of the mistakes worth catching here. What it does supply — `validateWebhook
 * Signature` — is nine lines of `createHmac`, and writing them means the
 * comparison is `timingSafeEqual` rather than whatever the library reached for.
 * A payment integration is a bad place to inherit a dependency's opinion about
 * how to compare two secrets.
 *
 * ── The two HMACs are different and are constantly confused ──
 *
 * They use DIFFERENT SECRETS and DIFFERENT PAYLOADS, and swapping them produces
 * an integration that appears to work in test mode and rejects every live
 * payment:
 *
 *   Checkout handshake   HMAC-SHA256 of `${order_id}|${payment_id}` keyed with
 *                        the API KEY SECRET. Returned to the browser and posted
 *                        back by it.
 *   Webhook              HMAC-SHA256 of the RAW REQUEST BODY keyed with the
 *                        WEBHOOK SECRET, which is set separately in the
 *                        dashboard and is not the API key secret.
 *
 * ── Neither of them is proof of payment on its own ──
 *
 * The handshake proves the browser is relaying something Razorpay signed. It
 * does not prove the money was captured — an authorised-but-uncaptured payment
 * produces a valid signature, and so does a payment that is later reversed. The
 * webhook is the authority. The handshake exists so the applicant sees a
 * confirmation in the second after paying rather than whenever a webhook
 * happens to arrive, and `confirmCheckout` therefore verifies the signature AND
 * asks the API what state the payment is actually in.
 *
 * That second call is the whole difference between "the browser told us it went
 * through" and "we checked".
 */

const API = "https://api.razorpay.com/v1";

/** Razorpay is slow to fail and fast to succeed. Ten seconds is well past a
 *  normal order creation and short enough that a stalled request does not hold
 *  a Server Action open. */
const TIMEOUT_MS = 10_000;

function auth(): string {
  const id = env().NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const secret = env().RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay is not configured.");
  return `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`;
}

/** The merchant id the browser needs to open Checkout. Public by design. */
export function razorpayKeyId(): string {
  const id = env().NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!id) throw new Error("Razorpay is not configured.");
  return id;
}

export function razorpayConfigured(): boolean {
  return capabilities.payments();
}

/* -------------------------------------------------------------------------- */
/* Orders                                                                     */
/* -------------------------------------------------------------------------- */

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

/**
 * Create an order.
 *
 * `amountPaise` is computed by the caller FROM THE APPLICATION, never taken
 * from the client — see `createPaymentOrderAction`. This function has no way to
 * check that and does not try; it is stated here because this is where somebody
 * looking for the amount will read.
 *
 * `receipt` carries our own reference so a row in Razorpay's dashboard can be
 * matched to an application without a lookup table. It is capped at 40
 * characters by their API, which `ABZ-XXXX-XXXX` is comfortably inside.
 *
 * `notes` is metadata Razorpay stores and echoes back on the webhook. The
 * application id goes in it so a webhook that arrives before our own row is
 * committed — which happens, because Razorpay is fast — can still be attributed.
 * Nothing personal goes in `notes`: it is visible to anybody with dashboard
 * access and is echoed in webhook payloads.
 */
export async function createOrder(input: {
  amountPaise: number;
  receipt: string;
  applicationId: string;
}): Promise<RazorpayOrder> {
  const response = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { authorization: auth(), "content-type": "application/json" },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: { applicationId: input.applicationId },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    // The body carries Razorpay's own description, which is what an operator
    // needs. It never reaches the applicant — the action writes their message.
    const detail = await response.text().catch(() => "");
    throw new Error(`Razorpay order creation failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return (await response.json()) as RazorpayOrder;
}

/* -------------------------------------------------------------------------- */
/* Payments                                                                   */
/* -------------------------------------------------------------------------- */

export type RazorpayPayment = {
  id: string;
  order_id: string;
  /** `created` | `authorized` | `captured` | `refunded` | `failed`. */
  status: string;
  amount: number;
  currency: string;
  method?: string;
  error_description?: string | null;
};

/** What Razorpay says the payment's state is. The authority for the handshake. */
export async function fetchPayment(paymentId: string): Promise<RazorpayPayment> {
  const response = await fetch(`${API}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { authorization: auth() },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Razorpay payment lookup failed (${response.status}): ${detail.slice(0, 300)}`);
  }

  return (await response.json()) as RazorpayPayment;
}

/* -------------------------------------------------------------------------- */
/* Signatures                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Constant-time comparison of two hex digests.
 *
 * `timingSafeEqual` throws when the buffers differ in length, so the length is
 * checked first — and that check is not itself a leak, because the length of a
 * SHA-256 hex digest is a constant that an attacker already knows.
 *
 * Whether a timing attack on an HMAC comparison is practical over the internet
 * is arguable. Whether it is worth arguing about in a payment path is not.
 */
function digestsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * The handshake Checkout posts back.
 *
 * HMAC-SHA256 of `${orderId}|${paymentId}` keyed with the API KEY SECRET —
 * not the webhook secret. See the header.
 */
export function checkoutSignatureValid(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = env().RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret)
    .update(`${input.orderId}|${input.paymentId}`)
    .digest("hex");

  return digestsMatch(expected, input.signature);
}

/**
 * The webhook signature.
 *
 * HMAC-SHA256 of the RAW BODY keyed with the WEBHOOK SECRET.
 *
 * "Raw" is the load-bearing word and the commonest way to get this wrong: the
 * body has to be the exact bytes Razorpay sent, so the route reads `req.text()`
 * and hashes that BEFORE parsing. Hashing `JSON.stringify(JSON.parse(body))`
 * fails whenever their serialiser and V8's disagree about key order,
 * whitespace or unicode escaping — which they do, intermittently, which is the
 * worst way for this to fail.
 *
 * Returns false rather than throwing when no secret is set. An unauthenticated
 * webhook that marks payments captured is an endpoint anybody can POST to in
 * order to mark their own application paid, so "not configured" has to fail
 * closed. `env.ts` refuses the production deploy that would reach this.
 */
export function webhookSignatureValid(rawBody: string, signature: string | null): boolean {
  const secret = env().RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return digestsMatch(expected, signature);
}

/* -------------------------------------------------------------------------- */

/**
 * Razorpay's payment states, mapped onto ours.
 *
 * `created` at Razorpay means an order exists and nothing has been paid, which
 * is our `created`. Everything else lines up by name. Anything unrecognised
 * becomes `failed` rather than being ignored: a state this code has not been
 * taught is a state it cannot claim was a successful payment, and treating an
 * unknown as a failure is the direction that errs toward not shipping a visa
 * application nobody paid for.
 */
export function mapStatus(
  razorpayStatus: string,
): "created" | "authorized" | "captured" | "failed" | "refunded" {
  switch (razorpayStatus) {
    case "created":
      return "created";
    case "authorized":
      return "authorized";
    case "captured":
      return "captured";
    case "refunded":
      return "refunded";
    default:
      return "failed";
  }
}
