import "server-only";

import type { OtpMessage, SmsDriver, SmsResult } from "./types";

/**
 * THE TEST DRIVER — keeps sent codes in memory so a test can read them.
 *
 * The console driver proves a code was generated but puts it somewhere only a
 * human reading a terminal can see, which makes the OTP rules — attempt caps,
 * replay, expiry, rate limits — untestable without scraping stdout. This driver
 * hands the code back to the caller instead.
 *
 * Like the console driver it refuses to run in production, for the same reason
 * and with more force: this one keeps every code it has ever sent in a map.
 */
const sent = new Map<string, string>();

export const memoryDriver: SmsDriver = {
  name: "memory (tests)",
  deliversToHandset: false,

  async send({ to, code }: OtpMessage): Promise<SmsResult> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("The memory SMS driver must never run in production.");
    }
    sent.set(to, code);
    return { ok: true, providerMessageId: `memory-${Date.now()}` };
  },
};

/** The most recent code sent to a number, for assertions. */
export function lastCodeFor(phoneE164: string): string | undefined {
  return sent.get(phoneE164);
}
