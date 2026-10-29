"use server";

import { z } from "zod";

import { getApplication } from "@/lib/applications/repository";
import { audit } from "@/lib/audit";
import { countryFromSlug } from "@/lib/countryVisa";
import { capabilities } from "@/lib/env";
import {
  advanceStatus,
  paymentByOrder,
  recordOrder,
} from "@/lib/payments/repository";
import {
  checkoutSignatureValid,
  createOrder,
  fetchPayment,
  mapStatus,
  razorpayKeyId,
} from "@/lib/payments/razorpay";
import { checkLimit } from "@/lib/rateLimit";
import { authedAction, userError } from "@/lib/safeAction";
import { quoteVisa, type PricedTraveller } from "@/lib/visaPricing";

/**
 * THE PAYMENT ACTIONS
 * ---------------------------------------------------------------------------
 * Two: open an order, and confirm what the browser brought back.
 *
 * ── THE ONE RULE THIS FILE EXISTS TO ENFORCE ──
 *
 * **The amount is computed here, from the application, and never accepted from
 * the client.**
 *
 * It would be one line shorter to take the total the checkout screen is already
 * displaying, and that one line is the oldest hole in every payment integration
 * ever shipped: a Server Action is a POST endpoint reachable by anything that
 * can make a request, so an `amount` in its input is an amount the payer
 * chooses. `orderAmountPaise` below re-derives it from the destination, the
 * chosen visa option and the travellers — the same `quoteVisa` the screen used, called
 * again on a machine the payer does not control.
 *
 * ── Why confirmation asks Razorpay rather than believing the browser ──
 *
 * Checkout hands the browser three values and an HMAC over two of them. The
 * HMAC proves the browser is relaying something Razorpay signed. It does NOT
 * prove the money was captured: an authorised-but-uncaptured payment produces a
 * perfectly valid signature, and so does one that is refunded a minute later.
 *
 * So `confirmPaymentAction` verifies the signature AND fetches the payment.
 * Between them that is "this came from Razorpay" and "Razorpay says it is
 * captured", which are two different facts and both are needed.
 *
 * The webhook remains the authority — see `api/webhooks/razorpay`. This exists
 * so the applicant gets an answer in the second after paying instead of
 * whenever a webhook happens to arrive.
 */

/* -------------------------------------------------------------------------- */

/** Guard every entry point, so a misconfigured deployment cannot half-charge. */
function requirePayments(): void {
  if (!capabilities.database()) {
    userError("Payments are not available on this environment.");
  }
  if (!capabilities.payments()) {
    userError("Card payment is not switched on yet.");
  }
}

/**
 * What this application costs, in paise, from the application itself.
 *
 * Priced from the travellers the server holds — their dates of birth decide who
 * is a child where a destination prices children differently — and from the
 * option the application records as its `plan`, against the price list in
 * `data/visaOptions.ts`. Prices there are whole rupees, so `× 100` is exact.
 *
 * A party the option cannot price (the New Zealand couple visa with anything
 * but two travellers) is refused rather than charged at a guess.
 */
function orderAmountPaise(input: {
  countrySlug: string;
  plan: number | null;
  travellers: PricedTraveller[];
  travellerCount: number;
}): number {
  const country = countryFromSlug(input.countrySlug);
  if (!country) userError("We could not price that destination.");

  // The rows, when the applicant has added them; the count alone otherwise.
  const party = input.travellers.length ? input.travellers : input.travellerCount;
  const quote = quoteVisa(country.code, input.plan, party);

  if (!quote) {
    userError("That destination is not sold online. Ask us for a callback instead.");
  }
  if (quote.total === null) {
    userError(quote.problem ?? "We could not price this application.");
  }

  return Math.round(quote.total * 100);
}

/* -------------------------------------------------------------------------- */

/**
 * Open a Razorpay order for an application the caller owns.
 *
 * Returns everything the browser needs to open Checkout and nothing else. The
 * key id is public by design — it identifies the merchant and authenticates
 * nothing — which is why it is returned here rather than exposed as a
 * `NEXT_PUBLIC_` variable that would have to be kept in agreement with the
 * server's copy.
 */
export const createPaymentOrderAction = authedAction
  .metadata({ name: "payment.order" })
  .inputSchema(z.object({ applicationId: z.uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    requirePayments();

    /**
     * Rate limited, because order creation is a write to a third party's system
     * that we are billed for reputationally if not financially. Somebody
     * hammering it produces a dashboard full of abandoned orders and nothing
     * else, which is exactly the noise a fraud review looks at.
     */
    const limit = await checkLimit("paymentOrderPerUser", ctx.user.id);
    if (!limit.ok) {
      userError("Too many payment attempts. Wait a moment and try again.");
    }

    const found = await getApplication(ctx.user.id, parsedInput.applicationId);
    if (!found) userError("We could not find that application.");

    const { application, travellers } = found;

    if (application.status !== "draft" && application.status !== "ready") {
      // Not an error worth alarming anybody with — it usually means a second
      // tab, or a back button after a payment that already went through.
      userError("That application has already been submitted.");
    }

    const amountPaise = orderAmountPaise({
      countrySlug: application.countrySlug,
      plan: application.plan,
      travellers,
      travellerCount: application.travellerCount,
    });

    let order;
    try {
      order = await createOrder({
        amountPaise,
        receipt: application.reference,
        applicationId: application.id,
      });
    } catch (error) {
      // Razorpay's own message names tables, fields and account states, none of
      // which an applicant can act on. It goes to the log.
      console.error("[payments] order creation failed", error);
      userError("We could not reach the payment provider. Nothing has been charged.");
    }

    const record = await recordOrder({
      userId: ctx.user.id,
      applicationId: application.id,
      razorpayOrderId: order.id,
      amountPaise,
    });

    if (!record) userError("We could not start a payment for that application.");

    return {
      orderId: order.id,
      amountPaise,
      currency: "INR",
      keyId: razorpayKeyId(),
      /** Prefills Checkout's description line. Not a security boundary. */
      reference: application.reference,
    };
  });

/* -------------------------------------------------------------------------- */

/**
 * Confirm what Checkout handed back.
 *
 * Three checks, in this order, and the order matters — each is cheaper than the
 * one after it and each makes the next meaningful:
 *
 *   1. Do we know this order? An order id we never created is not ours.
 *   2. Does the signature verify? Cheap, local, and proves Razorpay signed it.
 *   3. What does Razorpay say the payment IS? A network call, made only for a
 *      request that has already proved itself.
 */
export const confirmPaymentAction = authedAction
  .metadata({ name: "payment.confirm" })
  .inputSchema(
    z.object({
      // Razorpay's ids, loosely shaped. Tighter patterns would be a guess at a
      // format they have changed before, and the signature check is what
      // actually validates these.
      orderId: z.string().min(4).max(80),
      paymentId: z.string().min(4).max(80),
      signature: z.string().min(16).max(256),
    }),
  )
  .action(async ({ parsedInput, ctx }) => {
    requirePayments();

    const existing = await paymentByOrder(parsedInput.orderId);
    if (!existing) userError("We do not recognise that payment.");

    /**
     * The order belongs to an application; the application belongs to a user.
     * Re-read it scoped by the caller rather than trusting that whoever posted
     * this order id is the person who created it.
     */
    const owned = await getApplication(ctx.user.id, existing.applicationId);
    if (!owned) userError("We do not recognise that payment.");

    if (
      !checkoutSignatureValid({
        orderId: parsedInput.orderId,
        paymentId: parsedInput.paymentId,
        signature: parsedInput.signature,
      })
    ) {
      /**
       * A failed signature is either a bug or an attempt, and both are worth a
       * log line naming the order. The applicant is told the payment could not
       * be confirmed rather than that their signature was wrong, because there
       * is no version of that sentence they can act on.
       */
      console.error("[payments] checkout signature mismatch", {
        orderId: parsedInput.orderId,
      });
      await audit({
        action: "payment.failed",
        actorType: "applicant",
        actorId: ctx.user.id,
        subjectType: "application",
        subjectId: existing.applicationId,
        metadata: { orderId: parsedInput.orderId, reason: "signature-mismatch" },
      });
      userError("We could not confirm that payment. Nothing has been charged.");
    }

    let payment;
    try {
      payment = await fetchPayment(parsedInput.paymentId);
    } catch (error) {
      console.error("[payments] payment lookup failed", error);
      /**
       * The signature verified, so a payment very probably happened — we simply
       * could not read its state. Saying "it failed" would be worse than saying
       * nothing: the webhook will settle it within seconds, and telling
       * somebody their payment failed when it did not is how a second charge
       * gets made.
       */
      return { status: "pending" as const };
    }

    // The order the payment claims to belong to has to be the order we opened.
    if (payment.order_id !== parsedInput.orderId) {
      console.error("[payments] payment/order mismatch", {
        orderId: parsedInput.orderId,
        paymentOrderId: payment.order_id,
      });
      userError("We could not confirm that payment. Nothing has been charged.");
    }

    const status = mapStatus(payment.status);

    await advanceStatus({
      orderId: parsedInput.orderId,
      status,
      paymentId: payment.id,
      signature: parsedInput.signature,
      method: payment.method,
      failureReason: payment.error_description ?? undefined,
    });

    await audit({
      action:
        status === "captured"
          ? "payment.captured"
          : status === "authorized"
            ? "payment.authorized"
            : "payment.failed",
      actorType: "applicant",
      actorId: ctx.user.id,
      subjectType: "application",
      subjectId: existing.applicationId,
      metadata: {
        orderId: parsedInput.orderId,
        paymentId: payment.id,
        amountPaise: existing.amountPaise,
        method: payment.method ?? null,
      },
    });

    /**
     * `authorized` is reported as pending, not paid.
     *
     * With auto-capture on — Razorpay's default — it is momentary. With it off
     * the money is on hold and has not moved, and telling the applicant they
     * have paid would be telling them something that is not yet true and might
     * not become true. The webhook will say `captured` when it is.
     */
    if (status === "captured") return { status: "paid" as const };
    if (status === "authorized") return { status: "pending" as const };

    return {
      status: "failed" as const,
      message:
        "Your bank did not complete that payment, and nothing has been charged. Try again, or use a different method.",
    };
  });
