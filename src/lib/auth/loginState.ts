/**
 * The login screen's state shape.
 *
 * WHY THIS IS NOT IN `app/actions/auth.ts` WITH THE ACTIONS IT DESCRIBES. A
 * `"use server"` module may only export async functions — every export becomes
 * a callable server endpoint, so a plain object export is a build error, not a
 * style preference. The type would survive (types are erased) but the initial
 * value would not, so both live here and the actions import them.
 *
 * It is a discriminated union rather than a bag of optional fields because the
 * two steps genuinely have different data: there is no challenge id before a
 * code has been sent, and pretending otherwise with `challengeId?: string`
 * would push a null check into every use.
 */
export type LoginState =
  | {
      step: "phone";
      error?: string;
      /** Echoed back so a rejected submission does not clear the field. */
      iso?: string;
      national?: string;
    }
  | {
      step: "code";
      challengeId: string;
      phoneE164: string;
      expiresAt: number;
      resendAvailableAt: number;
      error?: string;
      /** Present after a wrong guess, so the UI can warn as they run out. */
      attemptsRemaining?: number;
      /** True when the challenge is dead and the UI must offer a fresh start. */
      fatal?: boolean;
    };

export const INITIAL_LOGIN_STATE: LoginState = { step: "phone" };
