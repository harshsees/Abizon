/**
 * SMS DELIVERY — the seam.
 * ---------------------------------------------------------------------------
 * The OTP logic must not know or care who carries the message. That is not
 * architectural neatness for its own sake; it is the difference between being
 * able to develop this feature today and being blocked for a week.
 *
 * THE INDIAN CONSTRAINT. You cannot send a transactional SMS to an Indian
 * number without DLT registration under TRAI's rules: the business entity, the
 * six-character sender header, and the exact message template must all be
 * registered on the operators' DLT portals before a single message is
 * delivered. Unregistered traffic is dropped at the carrier, not bounced — it
 * simply never arrives, which is the worst possible failure mode to debug.
 * Registration needs the *client's* legal documents (PAN, GST, incorporation)
 * and takes days.
 *
 * So the driver interface exists so that `console` can carry the flow while
 * that paperwork is in progress, and `msg91` takes over on the day the header
 * is approved, with no change to any calling code.
 */

export type SmsResult =
  | { ok: true; providerMessageId: string }
  | { ok: false; error: string; retryable: boolean };

export type OtpMessage = {
  /** E.164. */
  to: string;
  code: string;
  /** Minutes until the code expires, for the message body. */
  expiresInMinutes: number;
};

export type SmsDriver = {
  /** Shown in logs and on the login screen when running in a dev mode. */
  readonly name: string;
  /**
   * True when the driver does not actually deliver to a handset. The login UI
   * reads this to decide whether it may show the code on screen — a check that
   * must never be a plain environment comparison scattered through components.
   */
  readonly deliversToHandset: boolean;
  send(message: OtpMessage): Promise<SmsResult>;
};
