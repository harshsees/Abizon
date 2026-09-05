/**
 * READING THE NAME OFF THE TOP OF THE PAGE
 * ---------------------------------------------------------------------------
 * The complaint this file exists to answer: "it's not getting the name that's
 * exactly in the passport — it's fetching the name at the bottom."
 *
 * That is an accurate description of what the scanner did, and it was doing it
 * on purpose. Every value in the flow came out of the machine-readable zone at
 * the foot of the data page, and `names.ts` was allowed to fix the SPELLING of
 * those values against the printed page but never to change what they were.
 * Word by word: the zone says `ERIKSSON`, the page says `ERIKSSON`, take the
 * page's accents. That fixes a misread letter and cannot fix anything else.
 *
 * ── The three things it cannot fix, all of which are the reported bug ──
 *
 *   truncation      TD3 line 1 has 39 characters for the whole name. Longer
 *                   names are cut, and the zone gives no sign it happened. A
 *                   passport reading `RAJENDRAKUMAR` reaches the form as
 *                   `RAJENDRAKUM` — and `refineWord` can only repair that when
 *                   the loss happens to fall inside its edit budget.
 *   dropped names   Where the cut lands between names, a whole given name is
 *                   simply absent. `refineName` maps over the words the zone
 *                   HAS, so a name the zone never carried can never appear.
 *   transliteration The zone is ASCII by construction. Everything that is not
 *                   is folded — and folded lossily for names carrying marks
 *                   the standard has no expansion for.
 *
 * None of those is a misread. The zone was read perfectly and it is not what
 * is printed on the passport, which is the document the consulate compares
 * against.
 *
 * ── What this does instead ──
 *
 * Finds the printed `Surname` and `Given Name(s)` fields — the human-readable
 * ones at the TOP of the page, in a large clean face — and reads what is
 * printed under them. `names.ts` then decides whether to believe it, and that
 * decision is the safety rail: a printed value is adopted only when it
 * CORROBORATES what the zone said. See `preferPrinted`.
 *
 * ── Why the geometry lives here and not in `scan.ts` ──
 *
 * So it can be tested. Everything below takes plain `{ text, bbox }` words and
 * returns plain strings; there is no Tesseract, no worker, no image. The
 * back-page reader in `scan.ts` has the same shape of logic embedded in a
 * method that cannot be exercised without an OCR engine and a photograph of a
 * passport, and it is the part of the scanner nobody can change with any
 * confidence.
 */

export type Rect = { x0: number; y0: number; x1: number; y1: number };
export type Word = { text: string; bbox: Rect };
export type Line = { words: Word[]; bbox: Rect };

/* -------------------------------------------------------------------------- */
/* Vocabulary                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Letters only, upper case, accents folded. The form every comparison here is
 * made in.
 *
 * THE FOLD IS NOT OPTIONAL, and leaving it out is a bug the tests caught: a
 * page printing the bilingual label `Given Name(s) / Prénoms` reaches this as
 * `PRÉNOMS`, and stripping to `A-Z` without decomposing first DELETES the `É`
 * rather than replacing it — yielding `PRNOMS`, which matches no label in any
 * list here, so the field's own label was read as the value under it.
 *
 * NFD splits a letter from its combining mark; the range below removes the
 * marks and leaves the base letter.
 */
function letters(text: string): string {
  return text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z]/g, "");
}

/**
 * The words that NAME the surname field, in the languages a data page prints
 * it in. Matched as whole words rather than prefixes: `NOM` as a prefix would
 * also match nothing useful, but as a substring it matches `PRENOMS`, which is
 * the label of the field directly below and would make every page report its
 * given names as its surname.
 */
const SURNAME_LABELS = new Set([
  "SURNAME",
  "SURNAMES",
  "NOM",
  "NOMS",
  "APELLIDO",
  "APELLIDOS",
  "NACHNAME",
  "COGNOME",
]);

/**
 * The same for given names, and deliberately excluding the bare words `NAME`
 * and `NAMES`.
 *
 * "Given Name(s) / Prénoms" contains both a distinguishing word (`GIVEN`) and
 * a generic one (`NAMES`). Only the distinguishing word may open the field: a
 * page also prints "Name of Father" and "Place of Birth", and a set that
 * accepted `NAME` would open the given-names field on the first of those it
 * met.
 */
const GIVEN_LABELS = new Set([
  "GIVEN",
  "PRENOM",
  "PRENOMS",
  "FORENAME",
  "FORENAMES",
  "VORNAME",
  "VORNAMEN",
  "NOMBRE",
  "NOMBRES",
]);

/**
 * Words that belong to a label without identifying it — the connectives and
 * the generic half of a bilingual label. Skipped wherever a label run is being
 * consumed, so `Given Name(s) / Prénoms` is eaten whole and the value starts
 * at the first word that is none of these.
 */
const LABEL_FILLER = new Set([
  "NAME",
  "NAMES",
  "S",
  "OF",
  "THE",
  "PRENOMS",
  "PRENOM",
  "NOM",
  "NOMS",
  "SURNAME",
  "GIVEN",
  "APELLIDOS",
  "NOMBRES",
]);

/**
 * Everything else a data page prints, which a value must never be.
 *
 * This overlaps `STOP_WORDS` in `names.ts` and is deliberately a separate,
 * larger list: that one guards a per-word edit-distance match on an already
 * plausible name, this one guards a positional grab that has no such
 * protection. The cost of a word here that could be somebody's name is one
 * scan falling back to the zone; the cost of a missing one is a form
 * autofilled with the word `NATIONALITY`.
 */
const NEVER_A_NAME = new Set([
  "AUTHORITY",
  "BIRTH",
  "CODE",
  "COUNTRY",
  "DATE",
  "EXPIRY",
  "FATHER",
  "FILE",
  "GUARDIAN",
  "HOLDER",
  "INDIA",
  "ISSUE",
  "ISSUING",
  "MOTHER",
  "NATIONALITY",
  "NUMBER",
  "OBSERVATIONS",
  "PASSEPORT",
  "PASSPORT",
  "PERSONAL",
  "PLACE",
  "REPUBLIC",
  "REPUBLIQUE",
  "SEX",
  "SIGNATURE",
  "SPOUSE",
  "STATE",
  "TYPE",
  "VALID",
  "VALIDITY",
]);

/**
 * A word that could be part of a printed name.
 *
 * A digit anywhere disqualifies it — that is a passport number, a date or a
 * file reference, and all three sit within a line or two of the name fields on
 * every design. A single letter disqualifies it too: initials exist, but so
 * does the `P` in the Type field and the `/` separators OCR reads as `I`, and
 * the ones that are initials are recoverable from the zone.
 */
function isNameWord(text: string): boolean {
  if (/\d/.test(text)) return false;
  const value = letters(text);
  if (value.length < 2) return false;
  return !NEVER_A_NAME.has(value) && !SURNAME_LABELS.has(value) && !GIVEN_LABELS.has(value);
}

/* -------------------------------------------------------------------------- */
/* The machine-readable zone, which must not be read as printed text          */
/* -------------------------------------------------------------------------- */

/**
 * Is this word part of the zone at the foot of the page?
 *
 * The page pass reads the WHOLE image, zone included, and the zone's own words
 * would otherwise be candidates for the name — which is how a "correction"
 * against the printed page can end up confirming the very reading it was
 * supposed to check.
 *
 * Detected by content, not by position. A zone line is a long run of capitals,
 * digits and `<` fillers, and the fillers are the giveaway: no printed field on
 * a passport contains one, and OCR that mangles them tends to produce `«`, `‹`
 * or a run of `<<`. Position would be the obvious test and it is the wrong one
 * — the crop that framed the photograph decides where the bottom of the image
 * falls, and a page photographed at an angle puts the zone anywhere.
 */
export function isMrzWord(text: string): boolean {
  const value = text.trim();
  if (value.length === 0) return false;
  if (/[<«‹]/.test(value)) return true;
  /**
   * A single unbroken run of 24+ capitals and digits is not a printed field.
   *
   * The threshold started at 18 and was wrong: `THIRUVANANTHAPURAM` is exactly
   * 18 characters and is a place of birth printed on a great many Indian
   * passports, so the zone filter was eating a legitimate page word. A full
   * TD3 line is 44; line 2 with its fillers stripped is 27. 24 clears every
   * Indian place name and still catches a zone line whose chevrons OCR
   * dropped entirely.
   */
  return /^[A-Z0-9]{24,}$/.test(value);
}

/** Every word that is not the zone. The vocabulary a name may be drawn from. */
export function withoutMrz(words: readonly Word[]): Word[] {
  return words.filter((word) => !isMrzWord(word.text));
}

/* -------------------------------------------------------------------------- */
/* Finding the value under a label                                            */
/* -------------------------------------------------------------------------- */

export type PrintedField = { text: string; bbox: Rect };

/**
 * The value belonging to one labelled field.
 *
 * ── Two layouts, and both are normal ──
 *
 * A data page puts the value either to the RIGHT of its label or DIRECTLY
 * BELOW it, and which one depends on the issuing state rather than on
 * anything this can detect. Indian, UK and Schengen passports set the name
 * fields as label-above-value; the fields further down the same page are often
 * label-then-value on one line. So this looks to the right first, and drops to
 * the next line when the label's own line carries nothing but the label.
 *
 * `findLabelledValue` in `scan.ts` deliberately refuses the second case, and it
 * is right to for the BACK page: there the fields are dense and the line below
 * a label is as likely to be the next label. The front page's name fields are
 * the opposite — they are set apart, in a large face, with the value on its own
 * line — so refusing to look down there is refusing to read the field at all.
 *
 * ── Why the horizontal test on the line below ──
 *
 * A two-column page puts Surname on the left and something else on the right
 * at the same height, and the grouping in `groupIntoLines` merges them into one
 * line because they overlap vertically. Taking the whole line below would take
 * both columns. So the collection starts at the word nearest the label's left
 * edge and stops at the first gap wider than three label-heights, which is the
 * gutter between columns and is several times any inter-word space.
 */
export function findFieldValue(
  lines: readonly Line[],
  opening: ReadonlySet<string>,
): PrintedField | undefined {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;

    const labelAt = line.words.findIndex((word) => opening.has(letters(word.text)));
    if (labelAt === -1) continue;

    // Same line, to the right of the label run.
    const sameLine = collectRun(line.words.slice(labelAt + 1));
    if (sameLine.length > 0) return join(sameLine);

    // Otherwise the line below, aligned to the label's left edge.
    const below = lines[index + 1];
    if (!below) continue;

    const height = Math.max(1, line.bbox.y1 - line.bbox.y0);
    // A gap taller than two label-heights is a different part of the page, not
    // this field's value.
    if (below.bbox.y0 - line.bbox.y1 > height * 2) continue;

    const aligned = below.words.filter((word) => word.bbox.x0 >= line.bbox.x0 - height);
    const value = collectRun(aligned, height * 3);
    if (value.length > 0) return join(value);
  }

  return undefined;
}

/**
 * Take name words from the front of a run, stopping at anything that is not
 * one — and, when `maxGap` is given, at the first horizontal gap that wide.
 *
 * Leading label filler is skipped rather than ending the run: "Given Name(s) /
 * Prénoms RAHUL" arrives here as `Name(s) / Prénoms RAHUL` once `GIVEN` has
 * opened the field, and every word before `RAHUL` is filler.
 */
function collectRun(words: readonly Word[], maxGap?: number): Word[] {
  const taken: Word[] = [];

  for (const word of words) {
    const value = letters(word.text);

    if (taken.length === 0 && (value.length === 0 || LABEL_FILLER.has(value))) continue;

    if (!isNameWord(word.text)) break;

    if (maxGap !== undefined && taken.length > 0) {
      const previous = taken[taken.length - 1]!;
      if (word.bbox.x0 - previous.bbox.x1 > maxGap) break;
    }

    taken.push(word);
    // Nobody's given-names field runs past four words, and a run that long is
    // almost certainly walking into the next column.
    if (taken.length === 4) break;
  }

  return taken;
}

function join(words: readonly Word[]): PrintedField {
  return {
    text: words.map((word) => word.text.replace(/[^\p{L}\-']/gu, "")).join(" ").trim(),
    bbox: {
      x0: Math.min(...words.map((word) => word.bbox.x0)),
      y0: Math.min(...words.map((word) => word.bbox.y0)),
      x1: Math.max(...words.map((word) => word.bbox.x1)),
      y1: Math.max(...words.map((word) => word.bbox.y1)),
    },
  };
}

/* -------------------------------------------------------------------------- */

export type PrintedNames = {
  surname?: PrintedField;
  givenNames?: PrintedField;
};

/** Both name fields, as the page prints them. Either may be absent. */
export function readPrintedNames(lines: readonly Line[]): PrintedNames {
  return {
    surname: findFieldValue(lines, SURNAME_LABELS),
    givenNames: findFieldValue(lines, GIVEN_LABELS),
  };
}
