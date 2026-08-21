/**
 * THE MACHINE-READABLE ZONE.
 * ---------------------------------------------------------------------------
 * The two `<<<<` lines at the bottom of a passport's photo page, defined by
 * ICAO 9303. On a passport they are TD3: exactly two lines of exactly 44
 * characters, drawn in OCR-B, in fixed positions.
 *
 * WHY THIS RATHER THAN READING THE PRINTED PAGE. General OCR of a passport's
 * human-readable text is a guess — variable fonts, variable layouts per issuing
 * country, and no way to know whether the guess was right. The MRZ is the
 * opposite: the position of every field is fixed, the alphabet is restricted to
 * `A-Z 0-9 <`, and five of the fields carry **check digits**. That last part is
 * what makes this worth building. We do not have to trust the read; we can
 * verify it, field by field, and tell the applicant precisely which line to
 * retake instead of silently filling their form with a misread passport number.
 *
 * WHAT IT DOES NOT CONTAIN, so that nothing downstream pretends otherwise:
 * father's name, mother's name, address, place of issue, date of issue. Those
 * are printed on the page — often on the back page — and are not encoded here
 * at all. Any product that fills them from a scan is doing full-page OCR, with
 * the accuracy that implies. Ours leaves them for the applicant to type.
 *
 * This module is pure. It takes text and returns a result; it does no OCR, no
 * image handling and no I/O, which is what makes the rules below testable
 * against the ICAO specimen rather than against a photograph.
 */

/** TD3 — the passport variant. Two lines, 44 characters each. */
export const MRZ_LINE_LENGTH = 44;

export type MrzSex = "male" | "female" | "unspecified";

export type MrzFields = {
  /** Surname as printed, with the MRZ's filler characters resolved. */
  surname: string;
  /** Given names, space-separated. */
  givenNames: string;
  /** Issuing state, ISO 3166-1 alpha-3 as it appears in the MRZ. */
  issuingState: string;
  nationality: string;
  passportNumber: string;
  /** ISO `yyyy-mm-dd`, which is what every date input in this project takes. */
  dateOfBirth: string;
  dateOfExpiry: string;
  sex: MrzSex;
};

/**
 * Which fields verified and which did not. Reported per field rather than as
 * one boolean, because "the passport number failed but everything else passed"
 * is an actionable message and "the scan failed" is not.
 */
export type MrzChecks = {
  passportNumber: boolean;
  dateOfBirth: boolean;
  dateOfExpiry: boolean;
  /** Over the whole of line 2. Catches a transposition the field digits miss. */
  composite: boolean;
};

export type MrzResult =
  | { ok: true; fields: MrzFields; checks: MrzChecks; allChecksPassed: boolean }
  | { ok: false; reason: MrzFailure };

export type MrzFailure =
  | "no-mrz-found"
  | "wrong-line-length"
  | "not-a-passport"
  | "unreadable-dates";

/* -------------------------------------------------------------------------- */
/* Check digits                                                               */
/* -------------------------------------------------------------------------- */

/**
 * ICAO 9303 check digit: weight each character 7, 3, 1 repeating, sum, mod 10.
 * Digits are their value, `A`–`Z` are 10–35, and the filler `<` is zero.
 */
const WEIGHTS = [7, 3, 1];

export function characterValue(character: string): number {
  if (character === "<") return 0;
  if (character >= "0" && character <= "9") return character.charCodeAt(0) - 48;
  if (character >= "A" && character <= "Z") return character.charCodeAt(0) - 55;
  // Anything else cannot appear in a well-formed MRZ. Treating it as zero would
  // let a misread quietly produce a passing check digit.
  return Number.NaN;
}

export function checkDigit(input: string): number {
  let sum = 0;

  for (let index = 0; index < input.length; index += 1) {
    const value = characterValue(input[index]!);
    if (Number.isNaN(value)) return Number.NaN;
    sum += value * WEIGHTS[index % 3]!;
  }

  return sum % 10;
}

function digitMatches(field: string, expected: string): boolean {
  const computed = checkDigit(field);
  if (Number.isNaN(computed)) return false;
  return String(computed) === expected;
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The MRZ carries two-digit years and no century, so the century has to be
 * inferred and the two fields infer it differently.
 *
 * A date of birth is in the past — a passport is not issued to someone unborn —
 * so a two-digit year that would land in the future belongs to the previous
 * century. An expiry is the other way: passports are issued for ten years, so
 * `32` is 2032 rather than 1932.
 *
 * The pivot is deliberately computed from the current year rather than
 * hardcoded. A constant written today is wrong by 2050, silently, in the field
 * that decides whether a passport is valid.
 */
function expandYear(twoDigit: number, kind: "past" | "future"): number {
  const currentYear = new Date().getUTCFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  const candidate = currentCentury + twoDigit;

  if (kind === "past") {
    return candidate > currentYear ? candidate - 100 : candidate;
  }

  /**
   * An expiry is bounded above, not below. A passport runs for at most ten
   * years, so a date more than about fifteen years ahead is the previous
   * century; but it can be arbitrarily far in the *past*, because expired
   * passports exist and people scan them.
   *
   * The first version of this pushed anything more than ten years behind into
   * the next century, on the reasoning that an expiry ought to be ahead of us.
   * The ICAO specimen expires in 2012 and came back as 2112 — an expired
   * passport read as valid for another eighty-six years, which is the single
   * worst way this function could be wrong. The test vector caught it because
   * it is a real document from the standard rather than one written to match
   * the code.
   */
  return candidate > currentYear + 15 ? candidate - 100 : candidate;
}

/** `YYMMDD` → `yyyy-mm-dd`, or null when the digits are not a real date. */
export function parseMrzDate(
  yymmdd: string,
  kind: "past" | "future",
): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;

  const year = expandYear(Number(yymmdd.slice(0, 2)), kind);
  const month = Number(yymmdd.slice(2, 4));
  const day = Number(yymmdd.slice(4, 6));

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Reject 31 February rather than letting Date roll it into March, which would
  // hand the form a date the passport does not show.
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/* -------------------------------------------------------------------------- */
/* Names                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * `SURNAME<<GIVEN<NAMES<<<<<…` — a double filler separates the two, a single
 * filler separates words, and the rest is padding.
 *
 * Names are left as the MRZ transliterates them: uppercase, unaccented. That is
 * what the passport's own machine-readable line says, and an application is
 * checked against the passport rather than against how someone writes their
 * name. Prettifying it here would be inventing data.
 *
 * ── THE NAME IS NOT COVERED BY ANY CHECK DIGIT ──
 *
 * Every check digit in the zone is on line 2. Line 1 — document code, issuing
 * state, and this name field — has none at all, so `allChecksPassed` says
 * nothing whatsoever about the name.
 *
 * That is not theoretical. The first end-to-end run against the ICAO specimen
 * returned a verified read with the name `ANNA MARIAK ERIKSSON`: a stray `K`
 * from a filler character, on a result reporting that every digit matched.
 * The passport number, both dates and the composite were all genuinely
 * verified; the name was a plain OCR guess wearing their credibility.
 *
 * Anything presenting this to a person has to say which half was checked.
 */
export function parseNameField(field: string): {
  surname: string;
  givenNames: string;
} {
  const [rawSurname = "", rawGiven = ""] = field.split("<<");
  const clean = (value: string) =>
    value.replace(/</g, " ").replace(/\s+/g, " ").trim();

  return { surname: clean(rawSurname), givenNames: clean(rawGiven) };
}

/* -------------------------------------------------------------------------- */
/* Finding and reading the zone                                               */
/* -------------------------------------------------------------------------- */

/**
 * OCR of a passport page returns the whole page, not just the zone: the
 * headings, the printed fields, and then the two MRZ lines. This picks the zone
 * out of that.
 *
 * The signature is unmistakable — 44 characters drawn only from `A-Z 0-9 <`,
 * twice, adjacently. Spaces are stripped first because OCR frequently inserts
 * them into the filler runs, and `O`/`0` and `I`/`1` confusion is left alone
 * deliberately: correcting it here would defeat the check digits, which exist
 * precisely to catch it.
 */
export function findMrzLines(text: string): [string, string] | null {
  const candidates = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, "").toUpperCase())
    .filter((line) => line.length > 0);

  for (let index = 0; index < candidates.length - 1; index += 1) {
    const first = candidates[index]!;
    const second = candidates[index + 1]!;

    if (
      first.length === MRZ_LINE_LENGTH &&
      second.length === MRZ_LINE_LENGTH &&
      /^[A-Z0-9<]+$/.test(first) &&
      /^[A-Z0-9<]+$/.test(second) &&
      first.startsWith("P")
    ) {
      return [first, second];
    }
  }

  return null;
}

/**
 * Read a TD3 zone. Both lines must already be exactly 44 characters — use
 * `findMrzLines` to get there from raw OCR output.
 */
export function parseMrz(line1: string, line2: string): MrzResult {
  if (line1.length !== MRZ_LINE_LENGTH || line2.length !== MRZ_LINE_LENGTH) {
    return { ok: false, reason: "wrong-line-length" };
  }

  // `P` is the document code for a passport. An identity card is TD1, three
  // lines of 30, and nothing below would read it correctly.
  if (line1[0] !== "P") return { ok: false, reason: "not-a-passport" };

  const passportNumber = line2.slice(0, 9);
  const passportCheck = line2[9]!;
  const nationality = line2.slice(10, 13);
  const birth = line2.slice(13, 19);
  const birthCheck = line2[19]!;
  const sexCode = line2[20]!;
  const expiry = line2.slice(21, 27);
  const expiryCheck = line2[27]!;
  const personalNumber = line2.slice(28, 42);
  const personalCheck = line2[42]!;
  const compositeCheck = line2[43]!;

  const dateOfBirth = parseMrzDate(birth, "past");
  const dateOfExpiry = parseMrzDate(expiry, "future");

  if (!dateOfBirth || !dateOfExpiry) {
    return { ok: false, reason: "unreadable-dates" };
  }

  // The composite runs over the document number, both dates and the personal
  // number, each with its own check digit included — the ranges are defined by
  // the standard and are not contiguous.
  const compositeSource =
    line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 43);

  const checks: MrzChecks = {
    passportNumber: digitMatches(passportNumber, passportCheck),
    dateOfBirth: digitMatches(birth, birthCheck),
    dateOfExpiry: digitMatches(expiry, expiryCheck),
    composite: digitMatches(compositeSource, compositeCheck),
  };

  const { surname, givenNames } = parseNameField(line1.slice(5));

  return {
    ok: true,
    fields: {
      surname,
      givenNames,
      issuingState: line1.slice(2, 5).replace(/</g, ""),
      nationality: nationality.replace(/</g, ""),
      // The filler is padding, not part of the number.
      passportNumber: passportNumber.replace(/</g, ""),
      dateOfBirth,
      dateOfExpiry,
      sex: sexCode === "M" ? "male" : sexCode === "F" ? "female" : "unspecified",
    },
    checks,
    allChecksPassed:
      checks.passportNumber &&
      checks.dateOfBirth &&
      checks.dateOfExpiry &&
      checks.composite,
  };

  // `personalNumber` and `personalCheck` are read above and deliberately not
  // returned. The field is optional, issuing states use it for different
  // things, and India leaves it as filler — so there is nothing this
  // application could correctly do with it.
  void personalNumber;
  void personalCheck;
}

/** Read a zone straight out of OCR output. */
export function readMrzFromText(text: string): MrzResult {
  const lines = findMrzLines(text);
  if (!lines) return { ok: false, reason: "no-mrz-found" };
  return parseMrz(lines[0], lines[1]);
}
