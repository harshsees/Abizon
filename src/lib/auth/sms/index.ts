import "server-only";

import { consoleDriver } from "./console";
import { memoryDriver } from "./memory";
import { msg91Driver } from "./msg91";
import type { SmsDriver } from "./types";

export type { SmsDriver, SmsResult, OtpMessage } from "./types";

/**
 * Driver selection. One place, read from one variable.
 *
 * The default is `console`, which cannot run in production (it throws). That
 * ordering is deliberate: a developer who has set nothing up gets a working
 * flow, and a production deploy that has set nothing up fails loudly instead of
 * quietly logging one-time codes.
 */
const DRIVERS: Record<string, SmsDriver> = {
  console: consoleDriver,
  memory: memoryDriver,
  msg91: msg91Driver,
};

export function smsDriver(): SmsDriver {
  // `||` rather than `??`: a copied `.env.example` leaves `SMS_PROVIDER=`, and
  // an empty string is a value that `??` passes straight through to the lookup
  // below, where it fails as an unknown driver. Blank means unset here, as it
  // does in `lib/env.ts`.
  const requested = process.env.SMS_PROVIDER || "console";
  const driver = DRIVERS[requested];

  if (!driver) {
    throw new Error(
      `SMS_PROVIDER="${requested}" is not a known driver. ` +
        `Available: ${Object.keys(DRIVERS).join(", ")}.`,
    );
  }

  return driver;
}
