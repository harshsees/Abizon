import type { MrzFields } from "@/lib/passport/mrz";
import { nationalityFromCode } from "@/lib/passport/nationality";
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
    /**
     * The MRZ carries a three-letter code; the form takes a nationality word.
     *
     * This used to be `fields.nationality === "IND" ? "Indian" : ""`, which
     * was honest about only knowing one code and quietly awful for everybody
     * else: a Nigerian passport read perfectly, filled five fields, and then
     * WROTE AN EMPTY STRING over the sixth — so the review screen presented a
     * blank required field on the one value the passport had stated
     * unambiguously.
     *
     * `nationality.ts` resolves every code the standard assigns. What it
     * cannot resolve — a stateless or refugee travel document, an
     * organisation code — comes back `undefined`, and `undefined` is spread
     * away rather than written, so the form keeps whatever is already in it
     * instead of being cleared by a scan that had nothing to offer.
     */
    ...(nationalityFromCode(fields.nationality)
      ? { nationality: nationalityFromCode(fields.nationality)! }
      : {}),
    gender:
      fields.sex === "male" ? "Male" : fields.sex === "female" ? "Female" : "",
  };
}

/**
 * What a back-page read contributes to the form.
 *
 * Separate from `fieldsToDetails` because the two reads are different in kind.
 * The photo page has a machine-readable zone whose check digits make most of
 * it verifiable; the back page has no zone at all, so everything on it is
 * plain OCR of printed text with nothing to check it against.
 *
 * That is why exactly one value crosses from here into the form. Nationality
 * is a word from a closed list — `nationalityFromPageText` will only return
 * one of ninety-odd known countries, so a misread is a miss rather than a
 * wrong answer. An address or a parent's name read the same way would be a
 * free-text string with an OCR error somewhere in it, going into a field
 * nothing downstream can validate; the back page shows those on the scan
 * screen and stops there.
 *
 * And it never overwrites. The photo page is the better source and it runs
 * first; this fills the gap it left, or does nothing.
 */
export function backPageToDetails(
  nationality: string | undefined,
  current: TravellerDetails,
): Partial<TravellerDetails> {
  if (!nationality) return {};
  if (current.nationality.trim().length > 0) return {};
  return { nationality };
}
