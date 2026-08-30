import type { MrzFields } from "@/lib/passport/mrz";
import type { TrustedField } from "@/lib/passport/recover";

import type { TravellerDetails } from "./state";

/**
 * MRZ values → the six fields this product stores.
 *
 * Lifted out of `PassportAutofill` when that component was replaced by the
 * capture takeover. It was always a pure function sitting in a 305-line client
 * component; two screens want it now, and neither should have to import a
 * camera to get at it.
 *
 * The MRZ transliterates names to uppercase and unaccented, surname first. The
 * form wants one full name as printed. Given names then surname is the order
 * the human-readable page uses, and the order every downstream check expects.
 *
 * @param trusted Which values the check digits vouch for. Anything not named
 *   here that HAS a check digit is left out — a passport number whose digit
 *   disagreed must not reach the form, because the applicant will proof-read
 *   a field they believe was filled correctly. Values with no check digit in
 *   the standard at all (name, nationality, sex) are always included; see the
 *   note on `ScanOutcome`.
 */
export function fieldsToDetails(
  fields: MrzFields,
  trusted: readonly TrustedField[] = ["passportNumber", "dateOfBirth", "dateOfExpiry"],
): Partial<TravellerDetails> {
  const fullName = [fields.givenNames, fields.surname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    fullName,
    ...(trusted.includes("dateOfBirth") ? { dateOfBirth: fields.dateOfBirth } : {}),
    ...(trusted.includes("passportNumber")
      ? { passportNumber: fields.passportNumber }
      : {}),
    ...(trusted.includes("dateOfExpiry")
      ? { passportExpiry: fields.dateOfExpiry }
      : {}),
    // The MRZ carries a three-letter code; the form takes a nationality word,
    // and `IND` is not one. Only the code we can state confidently is mapped;
    // anything else is left for the applicant rather than guessed at.
    nationality: fields.nationality === "IND" ? "Indian" : "",
    gender:
      fields.sex === "male" ? "Male" : fields.sex === "female" ? "Female" : "",
  };
}
