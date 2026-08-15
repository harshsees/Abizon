import "server-only";

import type { OtpMessage, SmsDriver, SmsResult } from "./types";

/**
 * MSG91 — the production driver for Indian numbers.
 *
 * WHY MSG91 RATHER THAN TWILIO. MSG91 holds direct connections to Jio, Airtel,
 * Vi and BSNL, so an OTP to an Indian handset costs roughly ₹0.15 against
 * roughly ₹0.45 or worse once Twilio's international routing and forex loading
 * are applied — and it arrives faster. At any real volume that gap is the
 * entire SMS budget. Twilio remains the better answer the day this product
 * sends to numbers outside India in bulk, which is what the driver seam is for.
 *
 * WHY WE GENERATE THE CODE AND MSG91 ONLY CARRIES IT. MSG91 sells an OTP
 * endpoint that generates and verifies the code for you. We deliberately do not
 * use it. Verification is where the rate limiting, the attempt ceiling and the
 * session issue all live; handing that to the SMS vendor would mean our
 * security properties are whatever their endpoint happens to enforce this
 * quarter, and would make the vendor impossible to change. They carry the
 * message. We own the secret.
 *
 * THE THREE REQUIRED VALUES, and what each one is:
 *
 *   MSG91_AUTH_KEY          Account credential from the MSG91 dashboard.
 *   MSG91_SENDER_ID         The six-character alphabetic header, e.g. ABIZON.
 *                           Must be registered on DLT and approved.
 *   MSG91_DLT_TEMPLATE_ID   The approved template's id. The body is fixed at
 *                           registration; we may only fill its variables. If
 *                           the text sent does not match the registered
 *                           template exactly, the carrier drops it silently.
 */

const ENDPOINT = "https://control.msg91.com/api/v5/flow/";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. The MSG91 driver cannot send without it. ` +
        `Use SMS_PROVIDER=console in development.`,
    );
  }
  return value;
}

export const msg91Driver: SmsDriver = {
  name: "msg91",
  deliversToHandset: true,

  async send({ to, code, expiresInMinutes }: OtpMessage): Promise<SmsResult> {
    const authKey = requiredEnv("MSG91_AUTH_KEY");
    const templateId = requiredEnv("MSG91_DLT_TEMPLATE_ID");
    const senderId = requiredEnv("MSG91_SENDER_ID");

    // MSG91 wants the number without a leading `+`.
    const mobiles = to.replace(/^\+/, "");

    // A hung SMS call must not hold the applicant's form submission open. Eight
    // seconds is well past MSG91's normal response and well short of a user
    // deciding the site is broken.
    const abort = AbortSignal.timeout(8_000);

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: authKey,
        },
        body: JSON.stringify({
          template_id: templateId,
          sender: senderId,
          short_url: "0",
          realTimeResponse: "1",
          recipients: [
            {
              mobiles,
              // These names must match the variables in the DLT-approved
              // template. Renaming one here without re-registering the template
              // produces a message the carrier will not deliver.
              OTP: code,
              EXPIRY: String(expiresInMinutes),
            },
          ],
        }),
        signal: abort,
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          ok: false,
          error: `MSG91 returned ${response.status}`,
          // 5xx and 429 are worth another attempt; a 400 means the template or
          // the number is wrong and retrying just spends money again.
          retryable: response.status >= 500 || response.status === 429,
        };
      }

      const parsed = body as { type?: string; message?: string; request_id?: string } | null;

      // MSG91 answers 200 with `type: "error"` for template and balance
      // failures, so the status code alone is not proof of delivery.
      if (parsed?.type === "error") {
        return {
          ok: false,
          error: parsed.message ?? "MSG91 rejected the message.",
          retryable: false,
        };
      }

      return { ok: true, providerMessageId: parsed?.request_id ?? "unknown" };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return {
        ok: false,
        error: timedOut ? "MSG91 did not respond in time." : "Could not reach MSG91.",
        retryable: true,
      };
    }
  },
};
