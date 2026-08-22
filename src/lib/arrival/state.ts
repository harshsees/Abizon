/**
 * ARRIVAL-CARD FORM STATE.
 * ---------------------------------------------------------------------------
 * Deliberately separate from `lib/application/state.ts`. The visa application
 * is five screens, a plan, documents, uploads and money; the arrival card is
 * one screen of typing that we never submit. Sharing a reducer between them
 * would mean every arrival-card traveller carried a plan and an upload queue
 * it has no use for, and every change to one flow would have to be reasoned
 * about in the other.
 *
 * ── Nothing here is persisted ──
 *
 * There is no localStorage, no sessionStorage, no query string and no server.
 * A passport number and a date of birth are enough to impersonate somebody to
 * an airline, and this flow has no backend that could hold them safely, so the
 * values live in React state and die with the tab. That is also why refreshing
 * the page starts over: an empty form is the honest cost of not keeping this.
 */

import type { MrzFields } from "@/lib/passport/mrz";
import {
  arrivalCardFields,
  type ArrivalCard,
  type ArrivalCardField,
  type ArrivalCardFieldKey,
} from "@/lib/arrivalCard";

export type ArrivalCardValues = Partial<Record<ArrivalCardFieldKey, string>>;

export type ArrivalTraveller = {
  id: string;
  values: ArrivalCardValues;
  /**
   * Which fields the passport scan wrote, so the form can say so without
   * pretending the rest were checked. Cleared for a field as soon as the
   * traveller edits it — at that point the value is theirs, not the scan's.
   */
  autofilled: ArrivalCardFieldKey[];
};

/**
 * `id` is passed in for the first traveller and generated for the rest.
 *
 * The first one exists before hydration — it is the section the server renders
 * — and its id ends up in the `id`/`aria-labelledby` pair on its heading. A
 * `crypto.randomUUID()` there produces one value on the server and a different
 * one in the browser, which is a hydration mismatch React will not patch up
 * and which quietly breaks the heading's association with its section. So the
 * page hands it a `useId()` instead. Every traveller after that is added by a
 * click, which only ever happens in the browser.
 */
export function newArrivalTraveller(id?: string): ArrivalTraveller {
  return { id: id ?? crypto.randomUUID(), values: {}, autofilled: [] };
}

/* -------------------------------------------------------------------------- */
/* Dates                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The form holds dates as `yyyy-mm-dd`, which is what `<input type="date">`
 * reads and writes, and shows them as `dd mmm yyyy`. Two representations for
 * one value is a cost, but the alternative is either a text field that has to
 * parse "02/09/22" six different ways or a native picker that cannot be
 * pre-filled from a scan.
 */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function formatIsoDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const index = Number(month) - 1;
  if (index < 0 || index > 11) return iso;
  return `${day} ${MONTHS[index]} ${year}`;
}

/** Midnight today, local. Compared against, never displayed. */
function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  // Rejects 2026-02-31, which `new Date` would roll forward to March.
  if (date.getDate() !== Number(match[3])) return null;
  return date;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

export type ArrivalCardErrors = Partial<Record<ArrivalCardFieldKey, string>>;

/**
 * The rules are only the ones that are true of any passport, plus whatever the
 * destination's own field list marks required.
 *
 * Deliberately NOT enforced: a minimum passport validity at arrival. Six
 * months is the usual figure and it is wrong often enough to matter — several
 * of these destinations ask for three, or for validity through the stay only —
 * and this flow does not know the travel date. Inventing the rule would block
 * a traveller whose passport their government would have accepted.
 */
export function validateTraveller(
  card: ArrivalCard,
  values: ArrivalCardValues,
): ArrivalCardErrors {
  const errors: ArrivalCardErrors = {};
  const fields = arrivalCardFields(card);

  for (const field of fields) {
    const value = values[field.key]?.trim() ?? "";
    if (field.required && value === "") {
      errors[field.key] = `${field.label} is required.`;
    }
  }

  const has = (key: ArrivalCardFieldKey) =>
    fields.some((field) => field.key === key);

  const dob = values.dateOfBirth ? parseIsoDate(values.dateOfBirth) : null;
  const issued = values.passportIssuedOn ? parseIsoDate(values.passportIssuedOn) : null;
  const expiry = values.passportValidTill ? parseIsoDate(values.passportValidTill) : null;

  if (has("dateOfBirth") && values.dateOfBirth && !dob) {
    errors.dateOfBirth = "That is not a date we can read.";
  } else if (dob && dob > today()) {
    errors.dateOfBirth = "Date of birth cannot be in the future.";
  }

  if (has("passportIssuedOn") && values.passportIssuedOn && !issued) {
    errors.passportIssuedOn = "That is not a date we can read.";
  } else if (issued && issued > today()) {
    errors.passportIssuedOn = "A passport cannot be issued in the future.";
  }

  if (has("passportValidTill") && values.passportValidTill && !expiry) {
    errors.passportValidTill = "That is not a date we can read.";
  } else if (expiry && expiry <= today()) {
    // Not a rule we invented: an expired passport is not travel-ready
    // anywhere, and the traveller would rather hear it here.
    errors.passportValidTill = "This passport has expired.";
  }

  if (issued && expiry && !errors.passportIssuedOn && !errors.passportValidTill) {
    if (issued >= expiry) {
      errors.passportValidTill = "The expiry date must be after the issue date.";
    }
  }

  if (dob && issued && !errors.dateOfBirth && !errors.passportIssuedOn) {
    if (issued < dob) {
      errors.passportIssuedOn = "The passport was issued before this date of birth.";
    }
  }

  // Passport numbers are alphanumeric everywhere that issues one. The length
  // varies by country, so only the alphabet is checked — a length rule would
  // reject somebody's real passport.
  const passportNumber = values.passportNumber?.trim();
  if (passportNumber && !/^[A-Za-z0-9]+$/.test(passportNumber)) {
    errors.passportNumber = "Passport numbers are letters and digits only.";
  }

  return errors;
}

export function isTravellerComplete(
  card: ArrivalCard,
  values: ArrivalCardValues,
): boolean {
  return Object.keys(validateTraveller(card, values)).length === 0;
}

/** How many required fields still have nothing in them, across the party. */
export function remainingRequiredCount(
  card: ArrivalCard,
  travellers: readonly ArrivalTraveller[],
): number {
  const required = arrivalCardFields(card).filter((field) => field.required);
  return travellers.reduce(
    (total, traveller) =>
      total +
      required.filter((field) => !(traveller.values[field.key] ?? "").trim()).length,
    0,
  );
}

/* -------------------------------------------------------------------------- */
/* Autofill                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * What a passport scan can honestly fill.
 *
 * The machine-readable zone carries the surname, given names, passport number,
 * nationality, date of birth, sex and expiry — and nothing else. It does NOT
 * carry the issue date or the place of issue, both of which are printed only
 * in the visual part of the photo page, and it has no concept of marital
 * status. Those fields stay empty after a scan rather than being guessed at,
 * which is why the reference recording's fully-populated form is not something
 * this can honestly reproduce.
 */
export const MRZ_FILLABLE_FIELDS: readonly ArrivalCardFieldKey[] = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "gender",
  "nationality",
  "passportNumber",
  "passportValidTill",
];

/** The fields on this destination's form a scan could fill, in form order. */
export function autofillableFields(card: ArrivalCard): ArrivalCardField[] {
  return arrivalCardFields(card).filter((field) =>
    MRZ_FILLABLE_FIELDS.includes(field.key),
  );
}

/* -------------------------------------------------------------------------- */
/* Scan → form                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The machine-readable zone, mapped onto this form's fields.
 *
 * Only what the zone actually carries. `passportIssuedOn`, `passportPlaceOfIssue`
 * and `maritalStatus` are absent from it and stay absent from here — inferring
 * an issue date from an expiry (they are usually ten years apart, and usually
 * is not a document) is exactly the kind of helpfulness that gets somebody
 * turned around at a border.
 */
export function mrzToValues(fields: MrzFields): ArrivalCardValues {
  const values: ArrivalCardValues = {};

  if (fields.givenNames) values.firstName = titleCase(fields.givenNames);
  if (fields.surname) values.lastName = titleCase(fields.surname);
  if (fields.dateOfBirth) values.dateOfBirth = fields.dateOfBirth;
  if (fields.dateOfExpiry) values.passportValidTill = fields.dateOfExpiry;
  if (fields.passportNumber) values.passportNumber = fields.passportNumber;
  if (fields.sex === "male") values.gender = "Male";
  if (fields.sex === "female") values.gender = "Female";
  // The zone carries a three-letter code, and the form wants a nationality.
  // Only the one we can state confidently is mapped; the rest is left for the
  // traveller rather than guessed at.
  if (fields.nationality === "IND") values.nationality = "Indian";

  return values;
}

/**
 * The zone transliterates names to uppercase. "MANVENDRA SINGH" set beside a
 * typed "Colombo" reads as a different kind of value; this makes the two
 * agree. Hyphens and apostrophes keep their following capital, so O'Brien and
 * Smith-Jones survive.
 */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(^|[\s'\-])([a-z])/g, (_, prefix: string, letter: string) => prefix + letter.toUpperCase());
}
