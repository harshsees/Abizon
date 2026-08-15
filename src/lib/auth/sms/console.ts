import "server-only";

import type { OtpMessage, SmsDriver, SmsResult } from "./types";
import { maskE164 } from "../phone";

/**
 * THE DEVELOPMENT DRIVER — prints the code to the server terminal.
 *
 * This is what lets the login flow be built, reviewed and demonstrated before
 * DLT registration completes and before anyone has paid for a single SMS.
 *
 * It refuses to run when `NODE_ENV === "production"`. That refusal is the
 * whole safety story for this file: a misconfigured production deploy that
 * falls back to this driver would print every OTP into the application log and
 * hand anyone with log access every account on the site. Failing to start is
 * strictly better than starting insecurely, so the guard throws rather than
 * warning.
 */
export const consoleDriver: SmsDriver = {
  name: "console (development only)",
  deliversToHandset: false,

  async send({ to, code, expiresInMinutes }: OtpMessage): Promise<SmsResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "The console SMS driver was selected in production. Refusing to start: " +
          "this would write one-time codes into the server log. Set SMS_PROVIDER=msg91 " +
          "and supply MSG91_AUTH_KEY, MSG91_SENDER_ID and MSG91_DLT_TEMPLATE_ID.",
      );
    }

    // Deliberately loud. A developer scanning a busy Next.js dev log needs to
    // find this without searching for it.
    console.info(
      [
        "",
        "  ┌───────────────────────────────────────────────┐",
        `  │  OTP for ${maskE164(to).padEnd(20)}              │`,
        `  │  CODE: ${code}   (valid ${expiresInMinutes} min)`.padEnd(50) + "│",
        "  │  Development driver — no SMS was sent.        │",
        "  └───────────────────────────────────────────────┘",
        "",
      ].join("\n"),
    );

    return { ok: true, providerMessageId: `console-${Date.now()}` };
  },
};
