import { audit } from "@/lib/audit";
import { capabilities } from "@/lib/env";
import { advanceStatus, paymentByOrder } from "@/lib/payments/repository";
import { mapStatus, webhookSignatureValid } from "@/lib/payments/razorpay";

/**
 * THE RAZORPAY WEBHOOK — the authority on whether we were paid.
 * ---------------------------------------------------------------------------
 * `confirmPaymentAction` exists so the applicant sees an answer in the second
 * after they pay. This exists so the answer is right.
 *
 * The difference matters because the browser is not a reliable narrator of its
 * own payment: it can be closed on the redirect, lose its connection between
 * the bank and us, or simply be a tab somebody switched away from. Every one of
 * those leaves money captured at Razorpay and an application that never heard
 * about it. Razorpay retries this endpoint for hours precisely so that case
 * resolves itself.
 *
 * ── THE RAW BODY. This is the one thing to get right ──
 *
 * The signature is an HMAC over the EXACT BYTES Razorpay sent. So the body is
 * read once, as text, and hashed BEFORE anything parses it.
 *
 * The tempting shape — parse the JSON, then hash `JSON.stringify(parsed)` — is
 * wrong and, worse, is INTERMITTENTLY wrong: it works whenever their serialiser
 * and V8's happen to agree about key order, whitespace and unicode escaping,
 * and fails when they do not. An integration that verifies nine webhooks and
 * rejects the tenth is far harder to diagnose than one that never works.
 *
 * ── Why this route is not `authedAction` ──
 *
 * There is no user. Razorpay is not signed in, holds no session, and its
 * request carries no cookie. The signature IS the authentication, which is why
 * `webhookSignatureValid` fails closed when no secret is configured: an
 * unauthenticated webhook that marks payments captured is an endpoint anybody
 * can POST to in order to mark their own application paid.
 *
 * ── Why it always answers 200 once the signature verifies ──
 *
 * A non-2xx tells Razorpay to retry. That is right for "we could not process
 * this" and wrong for "we processed it and there was nothing to do" — an
 * unknown order, an event type we ignore, a duplicate delivery. Retrying those
 * forever achieves nothing and buries the deliveries that genuinely failed.
 * So: 401 for a bad signature, 500 only for our own failure, 200 for everything
 * we understood.
 */

/** Node, not Edge: `webhookSignatureValid` uses `node:crypto`. */
export const runtime = "nodejs";

/**
 * Never cached, never prerendered. A webhook that Next decided to render at
 * build time is a webhook that answers every delivery with the same stale body.
 */
export const dynamic = "force-dynamic";

/**
 * The events worth acting on.
 *
 * `payment.captured` is the one that means money moved. `payment.failed` is
 * recorded because "the applicant tried and their bank refused" is the single
 * most common support question and the answer is otherwise nowhere.
 * `payment.authorized` matters only on an account with auto-capture off, where
 * it is the state a payment sits in until somebody captures it.
 *
 * Everything else — settlements, refunds initiated in the dashboard, subscription
 * events — is acknowledged and ignored. Subscribing to fewer events in the
 * Razorpay dashboard would be tidier, but this file cannot depend on somebody
 * having done that.
 */
const HANDLED = new Set(["payment.captured", "payment.authorized", "payment.failed"]);

type RazorpayWebhook = {
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        status?: string;
        method?: string;
        error_description?: string | null;
        amount?: number;
      };
    };
  };
};

export async function POST(request: Request): Promise<Response> {
  if (!capabilities.database() || !capabilities.payments()) {
    // Nothing to write to, or nothing that could have created an order. A 503
    // rather than a 200: this deployment genuinely cannot handle the delivery,
    // and a retry against a fixed deployment is the right outcome.
    return new Response("payments not configured", { status: 503 });
  }

  // Read once, as bytes-as-text. See the header.
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!webhookSignatureValid(raw, signature)) {
    console.error("[razorpay] webhook signature rejected");
    return new Response("invalid signature", { status: 401 });
  }

  let body: RazorpayWebhook;
  try {
    body = JSON.parse(raw) as RazorpayWebhook;
  } catch {
    // Signed by us and not JSON is a contradiction, so this is a Razorpay bug
    // or a truncated body. Retrying will not help either way.
    console.error("[razorpay] webhook body was signed but did not parse");
    return new Response("ok", { status: 200 });
  }

  const event = body.event ?? "";
  if (!HANDLED.has(event)) return new Response("ok", { status: 200 });

  const entity = body.payload?.payment?.entity;
  const orderId = entity?.order_id;

  if (!orderId || !entity?.id) {
    console.error("[razorpay] webhook carried no order id", { event });
    return new Response("ok", { status: 200 });
  }

  try {
    const existing = await paymentByOrder(orderId);

    if (!existing) {
      /**
       * An order we have no row for.
       *
       * Two innocent causes and one that is not. Innocent: the webhook beat our
       * own insert — Razorpay is fast and this genuinely happens — or the order
       * belongs to a different environment sharing the same Razorpay account,
       * which is what test and preview deployments do.
       *
       * Not innocent: somebody replaying a signed body at us. That case is
       * already handled, because a signature they cannot forge is the gate, and
       * the worst a replay achieves is this branch.
       *
       * A 200 either way. Retrying would fix the first cause and spam the log
       * for the second, and the first is fixed anyway by `confirmPaymentAction`
       * when the browser comes back.
       */
      console.warn("[razorpay] webhook for an unknown order", { orderId, event });
      return new Response("ok", { status: 200 });
    }

    const status = mapStatus(entity.status ?? "");

    /**
     * `advanceStatus` refuses to move a status backwards, which is what makes
     * this idempotent. Razorpay delivers the same event more than once by
     * design, and the handshake races it — see the header of
     * `payments/repository.ts`.
     */
    const updated = await advanceStatus({
      orderId,
      status,
      paymentId: entity.id,
      method: entity.method,
      failureReason: entity.error_description ?? undefined,
    });

    await audit({
      action:
        status === "captured"
          ? "payment.captured"
          : status === "authorized"
            ? "payment.authorized"
            : "payment.failed",
      // Not the applicant: they may have closed the tab an hour ago. Razorpay
      // told us this, and `system` is the honest actor for a fact that arrived
      // without anybody present.
      actorType: "system",
      subjectType: "application",
      subjectId: existing.applicationId,
      metadata: {
        orderId,
        paymentId: entity.id,
        event,
        // What the row ended up at, which is not always what this delivery
        // asked for. That difference is the interesting thing in the log.
        resultingStatus: updated?.status ?? "unknown",
      },
    });

    return new Response("ok", { status: 200 });
  } catch (error) {
    // Our failure, not theirs. A 500 asks Razorpay to try again, which is
    // exactly what should happen when our database was briefly unreachable.
    console.error("[razorpay] webhook processing failed", error);
    return new Response("processing failed", { status: 500 });
  }
}
