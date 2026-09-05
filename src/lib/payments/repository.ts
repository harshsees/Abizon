import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { audit } from "@/lib/audit";
import { requireDb } from "@/lib/db/client";
import { applications, payments } from "@/lib/db/schema";

/**
 * THE PAYMENTS TABLE, AND THE FOUR THINGS DONE TO IT
 * ---------------------------------------------------------------------------
 * Create a row when an order is made, then move its status from one of three
 * places: the browser handshake, the webhook, or a reconciliation read.
 *
 * ── The invariant every function here protects ──
 *
 * **A row's status only ever moves forward, and `captured` is terminal until a
 * refund.**
 *
 * The reason is delivery order. The browser handshake and the webhook race, and
 * either can win: Razorpay's webhook regularly beats the redirect, and a
 * webhook is retried for hours after that. So the sequence
 *
 *     webhook says captured → handshake says authorized → webhook retry
 *
 * is ordinary traffic, and a naive "write what you were told" would demote a
 * captured payment to authorised and then promote it again — with an
 * application flipping between paid and unpaid in between.
 *
 * `advanceStatus` refuses to move backwards. It is the whole of the concurrency
 * story here, and it is why neither caller needs a lock.
 */

/** How far along the line each status is. Higher never yields to lower. */
const RANK: Record<string, number> = {
  created: 0,
  failed: 1,
  authorized: 2,
  captured: 3,
  refunded: 4,
};

export type PaymentRecord = {
  id: string;
  applicationId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amountPaise: number;
  currency: string;
  status: string;
  method: string | null;
  capturedAt: number | null;
};

/* -------------------------------------------------------------------------- */

/**
 * Record an order we have just created at Razorpay.
 *
 * The application is re-read inside this function with `userId` in the `where`
 * clause rather than being trusted from the caller. It is the same rule as
 * everywhere else in this codebase, and here it is the difference between a
 * payment attached to your own application and one attached to somebody else's.
 */
export async function recordOrder(input: {
  userId: string;
  applicationId: string;
  razorpayOrderId: string;
  amountPaise: number;
}): Promise<PaymentRecord | null> {
  const db = requireDb();

  const [application] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(eq(applications.id, input.applicationId), eq(applications.userId, input.userId)),
    )
    .limit(1);

  if (!application) return null;

  const [row] = await db
    .insert(payments)
    .values({
      applicationId: application.id,
      userId: input.userId,
      razorpayOrderId: input.razorpayOrderId,
      amountPaise: input.amountPaise,
      status: "created",
    })
    .returning();

  await audit({
    action: "payment.order_created",
    actorType: "applicant",
    actorId: input.userId,
    subjectType: "application",
    subjectId: application.id,
    // The order id, the amount, and nothing else. An audit row is read by
    // people who are not the payer.
    metadata: { orderId: input.razorpayOrderId, amountPaise: input.amountPaise },
  });

  return toRecord(row);
}

/** The row for an order, or nothing. Used by both the handshake and the webhook. */
export async function paymentByOrder(orderId: string): Promise<PaymentRecord | null> {
  const db = requireDb();

  const [row] = await db
    .select()
    .from(payments)
    .where(eq(payments.razorpayOrderId, orderId))
    .limit(1);

  return row ? toRecord(row) : null;
}

/**
 * Move a payment forward, or leave it alone.
 *
 * Returns the status the row ENDED UP AT, which is not necessarily the one that
 * was passed in — a webhook arriving late gets back `captured` after asking for
 * `authorized`, and that is the correct answer to give it.
 *
 * ── Why the guard is in the WHERE clause and not in JavaScript ──
 *
 * Read-then-write across two statements is a race between two webhook
 * deliveries, and Razorpay delivers concurrently. Putting the rank comparison
 * in the `where` makes the update conditional inside the database, so the
 * loser of a race updates zero rows instead of overwriting the winner. Drizzle
 * has no rank function, so the eligible statuses are enumerated — which is a
 * short list and reads more clearly than a CASE expression would.
 */
export async function advanceStatus(input: {
  orderId: string;
  status: "created" | "authorized" | "captured" | "failed" | "refunded";
  paymentId?: string;
  signature?: string;
  method?: string;
  failureReason?: string;
}): Promise<PaymentRecord | null> {
  const db = requireDb();

  const target = RANK[input.status] ?? 0;
  const overtakeable = Object.keys(RANK).filter(
    (status) => (RANK[status] ?? 0) < target,
  ) as Array<"created" | "authorized" | "captured" | "failed" | "refunded">;

  if (overtakeable.length === 0) {
    // Nothing ranks below `created`, so there is no forward move to make.
    return paymentByOrder(input.orderId);
  }

  await db
    .update(payments)
    .set({
      status: input.status,
      // Written whenever supplied, including on a move that does not change the
      // status — a webhook carrying the payment id is worth recording even when
      // the handshake already captured the row.
      ...(input.paymentId ? { razorpayPaymentId: input.paymentId } : {}),
      ...(input.signature ? { signature: input.signature } : {}),
      ...(input.method ? { method: input.method } : {}),
      ...(input.failureReason ? { failureReason: input.failureReason } : {}),
      ...(input.status === "captured" ? { capturedAt: new Date() } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(payments.razorpayOrderId, input.orderId),
        inArray(payments.status, overtakeable),
      ),
    );

  return paymentByOrder(input.orderId);
}

/* -------------------------------------------------------------------------- */

function toRecord(row: typeof payments.$inferSelect): PaymentRecord {
  return {
    id: row.id,
    applicationId: row.applicationId,
    razorpayOrderId: row.razorpayOrderId,
    razorpayPaymentId: row.razorpayPaymentId,
    amountPaise: row.amountPaise,
    currency: row.currency,
    status: row.status,
    method: row.method,
    capturedAt: row.capturedAt?.getTime() ?? null,
  };
}
