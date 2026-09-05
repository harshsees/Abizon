"use client";

/**
 * OPENING RAZORPAY CHECKOUT
 * ---------------------------------------------------------------------------
 * The whole live payment path on the client, and it is deliberately small: ask
 * the server for an order, open Razorpay's modal, hand what comes back to the
 * server to confirm.
 *
 * ── There is no card form here, and there must not be ──
 *
 * `PaymentPanel` has a beautiful hand-built card form. It cannot be the live
 * path. Razorpay Checkout collects the card in an iframe on Razorpay's own
 * origin, and that is the property that keeps this codebase out of PCI-DSS
 * scope — a property of NOT HAVING the data, not of being careful with it.
 * Collecting a PAN into React state and posting it anywhere puts the merchant
 * in scope, and there is no Razorpay API on a standard account that would
 * accept it if we did.
 *
 * So the form stays for preview and for `/dev/payment-preview`, and the live
 * screen is an amount, a breakdown and one button.
 *
 * ── The script is loaded on press, not on mount ──
 *
 * Checkout is ~100KB and the great majority of people who reach this step do
 * not press the button on the first render — they read the breakdown first.
 * Loading it in a `useEffect` would spend that on every visit to the step;
 * loading it in the click handler costs about 200ms once, inside a press that
 * the applicant already expects to take a moment.
 *
 * ── What happens when the modal is dismissed ──
 *
 * `ondismiss` fires and NOTHING is reported as a failure. Closing a payment
 * modal is the commonest thing anybody does with one, it is not a decline, and
 * telling somebody their payment failed when they simply changed their mind is
 * how a duplicate charge gets made on the retry.
 */

import { useCallback, useRef, useState } from "react";

import {
  confirmPaymentAction,
  createPaymentOrderAction,
} from "@/app/actions/payments";

const SCRIPT_ID = "razorpay-checkout";
const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/**
 * The slice of Razorpay's options this uses.
 *
 * Hand-written rather than pulled from `@types/razorpay`, which does not exist
 * — the package ships no types for the browser global. Naming only what is
 * passed means the compiler checks the call site, and an option added later is
 * added here first.
 */
type CheckoutHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type CheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: CheckoutHandlerResponse) => void;
  prefill?: { name?: string; email?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => RazorpayInstance;
  }
}

/** Shared across mounts — the script only ever needs loading once per page. */
let scriptPromise: Promise<void> | null = null;

function loadCheckout(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("checkout failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      // A failed load must not be cached as a resolved promise, or every
      // subsequent press silently does nothing.
      scriptPromise = null;
      reject(new Error("checkout failed to load"));
    });
    document.head.appendChild(script);
  });

  return scriptPromise;
}

/* -------------------------------------------------------------------------- */

export type CheckoutPhase =
  | { kind: "idle" }
  /** Creating the order, or waiting for the modal. */
  | { kind: "working" }
  /** Razorpay took the money and we verified it. */
  | { kind: "paid" }
  /**
   * Authorised but not yet captured, or confirmed by a call we could not
   * complete. The webhook settles it — see `confirmPaymentAction`.
   */
  | { kind: "pending" }
  | { kind: "failed"; message: string };

export function useRazorpayCheckout(input: {
  applicationId: string;
  /** Shown on the modal. Not a security boundary — the server prices the order. */
  destination: string;
  prefill?: { name?: string; email?: string; contact?: string };
  onPaid: () => void;
}) {
  const [phase, setPhase] = useState<CheckoutPhase>({ kind: "idle" });

  /**
   * Guards a second press while the first is in flight.
   *
   * A ref rather than reading `phase`, because the handler closes over the
   * phase at the moment it was created and a double-click lands both presses
   * before React re-renders. Two presses is two orders and a very confused
   * dashboard.
   */
  const busy = useRef(false);

  const { applicationId, destination, prefill, onPaid } = input;

  const pay = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setPhase({ kind: "working" });

    const release = () => {
      busy.current = false;
    };

    try {
      const created = await createPaymentOrderAction({ applicationId });

      if (created?.serverError || !created?.data) {
        setPhase({
          kind: "failed",
          message: created?.serverError ?? "We could not start that payment.",
        });
        release();
        return;
      }

      await loadCheckout();

      if (!window.Razorpay) {
        setPhase({
          kind: "failed",
          message:
            "The payment window could not load. Disable any blocker for this page, or try a different network.",
        });
        release();
        return;
      }

      const order = created.data;

      const instance = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "Abizon",
        description: destination,
        order_id: order.orderId,
        prefill,
        notes: { reference: order.reference },
        theme: { color: "#b45309" },

        handler: (response) => {
          /**
           * Razorpay's handler is not async and does not await what it calls,
           * so the confirmation runs detached. `void` is the honest marker for
           * that: nothing here can propagate a rejection, so the catch inside
           * is the only one there will be.
           */
          void (async () => {
            try {
              const confirmed = await confirmPaymentAction({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });

              if (confirmed?.serverError || !confirmed?.data) {
                /**
                 * The money may well have been taken — Razorpay called this
                 * handler, which it only does on success. So this is `pending`,
                 * not `failed`: the webhook is the authority and will settle it.
                 * Reporting a failure here is how somebody pays twice.
                 */
                setPhase({ kind: "pending" });
                return;
              }

              if (confirmed.data.status === "paid") {
                setPhase({ kind: "paid" });
                onPaid();
                return;
              }

              if (confirmed.data.status === "pending") {
                setPhase({ kind: "pending" });
                return;
              }

              setPhase({
                kind: "failed",
                message:
                  confirmed.data.message ??
                  "That payment did not complete. Nothing has been charged.",
              });
            } catch {
              setPhase({ kind: "pending" });
            } finally {
              release();
            }
          })();
        },

        modal: {
          ondismiss: () => {
            // Closing the modal is not a decline. Straight back to idle with no
            // message — see the header.
            setPhase({ kind: "idle" });
            release();
          },
        },
      });

      /**
       * A payment Razorpay itself reports as failed, which is different from
       * the modal being dismissed: the applicant tried, and their bank said no.
       * The modal stays open so they can try another method, so this records
       * the reason without closing anything.
       */
      instance.on("payment.failed", (payload) => {
        const description =
          (payload as { error?: { description?: string } })?.error?.description ??
          "Your bank did not complete that payment.";
        setPhase({ kind: "failed", message: `${description} Nothing has been charged.` });
        release();
      });

      instance.open();
    } catch {
      setPhase({
        kind: "failed",
        message: "We could not reach the payment provider. Nothing has been charged.",
      });
      release();
    }
  }, [applicationId, destination, prefill, onPaid]);

  return { phase, pay };
}
