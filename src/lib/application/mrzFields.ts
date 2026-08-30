import type { MrzFields } from "@/lib/passport/mrz";

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
 */
export function fieldsToDetails(fields: MrzFields): Partial<TravellerDetails> {
  const fullName = [fields.givenNames, fields.surname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    fullName,
    dateOfBirth: fields.dateOfBirth,
    passportNumber: fields.passportNumber,
    passportExpiry: fields.dateOfExpiry,
    // The MRZ carries a three-letter code; the form takes a nationality word,
    // and `IND` is not one. Only the code we can state confidently is mapped;
    // anything else is left for the applicant rather than guessed at.
    nationality: fields.nationality === "IND" ? "Indian" : "",
    gender:
      fields.sex === "male" ? "Male" : fields.sex === "female" ? "Female" : "",
  };
}
