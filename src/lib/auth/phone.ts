/**
 * PHONE NUMBERS — normalisation before anything else touches them.
 * ---------------------------------------------------------------------------
 * Every layer below this one (rate limiting, the challenge store, the user
 * record, the SMS provider) keys on a phone number, and they must all agree on
 * what "the same number" means. `9328415585`, `09328415585`, `+91 93284 15585`
 * and `+919328415585` are one person; if the rate limiter and the store
 * disagree about that, the rate limiter is trivially bypassed by adding a
 * space.
 *
 * So: one canonical form, E.164 (`+919328415585`), produced here and nowhere
 * else. Display formatting is a separate function and is never fed back in.
 *
 * WHY A COUNTRY LIST RATHER THAN libphonenumber. `libphonenumber-js` is ~145kB
 * and models the entire world's numbering plans. This product sells Indian visa
 * applications to Indian passport holders; the realistic set is India plus the
 * handful of places Indians live and hold local SIMs. A seven-entry table is
 * auditable at a glance and costs nothing. When the list stops being enough,
 * that is the moment to take the dependency — not before.
 */

export type CallingCode = {
  /** ISO 3166-1 alpha-2, used as the stable key and for the flag. */
  iso: string;
  /** Dialling prefix, without the leading `+`. */
  code: string;
  label: string;
  /** Digits expected after the prefix. */
  nationalLength: number;
  /**
   * Leading digits a valid mobile can start with. Landlines and invalid ranges
   * are rejected here rather than by the SMS provider, because the provider
   * charges for the attempt and answers slowly.
   */
  mobilePrefixes: RegExp;
};

/**
 * India first and default. The `6-9` rule is the current mobile allocation —
 * Indian mobile numbers are ten digits beginning 6, 7, 8 or 9, and nothing
 * else is a mobile.
 */
export const CALLING_CODES: CallingCode[] = [
  { iso: "IN", code: "91", label: "India", nationalLength: 10, mobilePrefixes: /^[6-9]/ },
  { iso: "AE", code: "971", label: "UAE", nationalLength: 9, mobilePrefixes: /^5/ },
  { iso: "US", code: "1", label: "USA", nationalLength: 10, mobilePrefixes: /^[2-9]/ },
  { iso: "GB", code: "44", label: "UK", nationalLength: 10, mobilePrefixes: /^7/ },
  { iso: "SG", code: "65", label: "Singapore", nationalLength: 8, mobilePrefixes: /^[89]/ },
  { iso: "AU", code: "61", label: "Australia", nationalLength: 9, mobilePrefixes: /^4/ },
  { iso: "CA", code: "1", label: "Canada", nationalLength: 10, mobilePrefixes: /^[2-9]/ },
];

export const DEFAULT_ISO = "IN";

export function callingCodeFor(iso: string): CallingCode {
  return CALLING_CODES.find((entry) => entry.iso === iso) ?? CALLING_CODES[0];
}

export type PhoneParseResult =
  | { ok: true; e164: string; iso: string; national: string }
  | { ok: false; error: string };

/**
 * Turn whatever was typed into E.164, or explain why it cannot be.
 *
 * The error strings are user-facing and deliberately specific: "that is nine
 * digits, Indian mobiles are ten" tells someone what to fix, where "invalid
 * phone number" makes them retype the same thing and fail again.
 */
export function parsePhone(rawNational: string, iso: string): PhoneParseResult {
  const country = callingCodeFor(iso);

  // Strip everything a human might type as decoration: spaces, dashes,
  // brackets, and a leading +country if they pasted a full number.
  let digits = rawNational.replace(/[^\d]/g, "");

  if (!digits) return { ok: false, error: "Enter your mobile number." };

  // A pasted full number arrives with the country code already on the front.
  // Removing it here means paste works, which is how most people fill this in
  // from a contacts app.
  if (digits.length > country.nationalLength && digits.startsWith(country.code)) {
    digits = digits.slice(country.code.length);
  }

  // A single leading zero is the domestic trunk prefix. It is not part of the
  // number and E.164 has no room for it.
  if (digits.length === country.nationalLength + 1 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length !== country.nationalLength) {
    return {
      ok: false,
      error: `${country.label} mobile numbers are ${country.nationalLength} digits. You entered ${digits.length}.`,
    };
  }

  if (!country.mobilePrefixes.test(digits)) {
    return {
      ok: false,
      error: "That does not look like a mobile number. An OTP cannot reach a landline.",
    };
  }

  return { ok: true, e164: `+${country.code}${digits}`, iso: country.iso, national: digits };
}

/**
 * `+919328415585` → `+91 93284 15585`.
 *
 * Used on the OTP screen so the applicant can check, before waiting for an SMS
 * that will never arrive, that they typed the number they meant.
 */
/**
 * SPLITTING OFF THE COUNTRY CODE.
 *
 * This used to be `/^\+(\d{1,3})(\d+)$/`, which is wrong for every number whose
 * country code is shorter than three digits — the quantifier is greedy and
 * there is nothing after it to force a backtrack, so `+919882515043` split as
 * `919` and `882515043`. India, the default and the overwhelming majority of
 * this site's traffic, rendered on the OTP screen as `+919 882515043`.
 *
 * That is worse than no formatting at all. The entire stated purpose of showing
 * the number back is so the applicant can check they typed the one they meant
 * before waiting for a message; a mis-grouped number invites them to conclude
 * they made a mistake and start again, which costs another SMS.
 *
 * Codes are matched against the list we support, longest first, so `+1` and
 * `+971` cannot be confused. A number from anywhere else falls through to the
 * old guess, which is the right behaviour for a case we cannot do better on.
 */
function splitCountryCode(e164: string): { code: string; rest: string } | null {
  const match = /^\+(\d+)$/.exec(e164);
  if (!match) return null;

  const digits = match[1];

  const codes = [...new Set(CALLING_CODES.map((entry) => entry.code))].sort(
    (a, b) => b.length - a.length,
  );

  for (const code of codes) {
    if (digits.startsWith(code)) {
      return { code, rest: digits.slice(code.length) };
    }
  }

  return { code: digits.slice(0, 2), rest: digits.slice(2) };
}

export function formatE164(e164: string): string {
  const split = splitCountryCode(e164);
  if (!split) return e164;

  const { code, rest } = split;
  if (rest.length === 10) return `+${code} ${rest.slice(0, 5)} ${rest.slice(5)}`;
  return `+${code} ${rest}`;
}

/**
 * `+91 •••• •5585` — for logs, support screens and anywhere the full number is
 * more than the reader needs. Never used on the OTP screen itself, where the
 * whole point is confirming the number is right.
 */
export function maskE164(e164: string): string {
  // Same fix as `formatE164` — and it mattered here too, because a mask that
  // splits the code wrongly reveals one more digit of the number than intended.
  const split = splitCountryCode(e164);
  if (!split) return "•••";

  const { code, rest } = split;
  return `+${code} ${"•".repeat(Math.max(0, rest.length - 4))}${rest.slice(-4)}`;
}
