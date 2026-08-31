/**
 * GETTING THE SPELLING OF A NAME RIGHT
 * ---------------------------------------------------------------------------
 * Every other value in a machine-readable zone can be checked: the passport
 * number, the date of birth and the expiry each carry a check digit, so a
 * misread is caught and either corrected or refused. The NAME carries nothing.
 * It lives on line 1, and no check digit in a TD3 zone covers line 1 — so a
 * zone that reads `OBRIKSSON` where the passport says `ERIKSSON` is, as far as
 * the standard is concerned, a perfectly good read.
 *
 * That is the last gap in the autofill, and it is the one an applicant
 * notices, because a name spelt wrong on a visa application is a returned
 * application.
 *
 * ── The second opinion ──
 *
 * The name is printed twice on the page: once in the zone, in cramped OCR-B
 * read through a 37-character whitelist, and once in the human-readable field
 * above it, in a large clean face read with no whitelist at all. The second
 * reading is very much easier, and the scan already performs it — that is the
 * pass that finds where the fields are for the annotation.
 *
 * So the two reads are compared. Where the page carries a word a short edit
 * away from what the zone said, the PAGE spelling wins, because it came from
 * the better source. Where nothing on the page is close, the zone's version
 * stands.
 *
 * ── WHAT THE FIRST VERSION OF THIS FILE GOT WRONG ──
 *
 * It compared, and then returned, a form of the word with everything but
 * `A-Z` stripped out. Three consequences, and all three produced exactly the
 * complaint this module exists to prevent — a name that is not the name on the
 * passport:
 *
 *   1. NO ACCENTED NAME WAS EVER CORRECTED. The zone transliterates: a page
 *      reading `MÜLLER` reaches the zone as `MUELLER`, and `SÁNCHEZ` as
 *      `SANCHEZ`. The old matcher folded the page's `MÜLLER` to `MLLER` — it
 *      dropped the umlaut instead of expanding it — which is two edits from
 *      `MUELLER` on a seven-letter budget of one. Every German, Nordic and
 *      Turkish name on the list failed to match, so every one of them kept the
 *      zone's spelling.
 *   2. NO HYPHENATED OR APOSTROPHISED NAME WAS EVER A CANDIDATE. `O'BRIEN` and
 *      `SMITH-JONES` were rejected outright by the letters-only test, so the
 *      page could not correct them even when the zone had them wrong.
 *   3. EVEN A PERFECT MATCH LOST THE SPELLING. Because the value returned was
 *      the stripped form, adopting the page's `JOSÉ` wrote `JOSE` into the
 *      form. The page was read correctly and the accent was thrown away on the
 *      way out.
 *
 * The fix is one idea: COMPARE IN THE ZONE'S ALPHABET, RETURN IN THE PAGE'S.
 * Every candidate is transliterated the way ICAO 9303 transliterates — `Ü` to
 * `UE`, `Ø` to `OE`, `ß` to `SS`, a plain acute or grave dropped — and the
 * comparison happens on that. What is returned is the word as the page printed
 * it, accents and hyphens intact, because that is the string the applicant is
 * going to proof-read against the document in their hand.
 *
 * ── Why a distance threshold, and why it is tight ──
 *
 * The risk of the whole idea is adopting the wrong word: a page holds
 * `ERIKSSON`, `PASSPORT`, `UTOPIA` and forty other strings, and "closest" is
 * meaningless without a bound. So a candidate has to be
 *
 *   the same shape     within two characters of the same length
 *   nearly the same    at most one edit per four characters, and never more
 *                      than three
 *   a name at all      no digits, and not one of the words every passport
 *                      prints on itself
 *
 * Under those rules `OBRIKSSON` → `ERIKSSON` is adopted (distance 2 of 9) and
 * `ERIKSSON` → `PASSPORT` is not (distance 7). A short name is protected by
 * the per-four rule: `LI` will only ever match `LI`, because one edit on a
 * two-letter word is a different name.
 *
 * ── The stop list ──
 *
 * The budget alone protects long names, because passport boilerplate is not
 * within two edits of anybody's surname. It does not protect SHORT ones as
 * well as it should: a four-letter name has a budget of one, and there are a
 * lot of four- and five-letter words printed on a passport. So the words every
 * data page carries are refused as candidates outright, whatever their
 * distance. It is a small list and it is not a security measure — it is the
 * cheapest way to make sure `SEX` never becomes somebody's given name.
 */

/** Levenshtein, iterative, single row. Both inputs here are one short word. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j]! + 1, // deletion
        current[j - 1]! + 1, // insertion
        previous[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1), // substitution
      );
    }
    previous = current;
  }

  return previous[b.length]!;
}

/**
 * The multi-character transliterations, from ICAO 9303 Part 3.
 *
 * These are the ones that CHANGE THE LENGTH of the word, which is why they
 * have to be applied deliberately rather than left to Unicode normalisation.
 * `Ü` decomposes to `U` plus a combining diaeresis, and dropping the mark
 * gives `U` — but a German passport's zone says `UE`, so folding the mark away
 * produces a string one character shorter than the thing it is being compared
 * against. Every umlaut in the name compounds that.
 *
 * Single-mark letters — `É`, `À`, `Ñ`, `Ç` — are NOT here. The standard maps
 * those to their base letter, which is exactly what dropping the combining
 * mark after NFD does, so they are handled by the general path below.
 */
const TRANSLITERATIONS: Array<[RegExp, string]> = [
  [/Ä/g, "AE"],
  [/Ö/g, "OE"],
  [/Ü/g, "UE"],
  [/ß/gi, "SS"],
  [/Å/g, "AA"],
  [/Æ/g, "AE"],
  [/Ø/g, "OE"],
  [/Þ/g, "TH"],
  [/Ð/g, "D"],
  [/Œ/g, "OE"],
  [/Đ/g, "D"],
  [/Ł/g, "L"],
];

/**
 * A page word in the alphabet the zone would have written it in.
 *
 * Uppercase, transliterated, then stripped to `A-Z` — so `Müller` becomes
 * `MUELLER`, `O'Brien` becomes `OBRIEN` and `Smith-Jones` becomes
 * `SMITHJONES`, which are the three forms a TD3 zone actually carries (the
 * zone has no apostrophe and no hyphen; both become fillers, and the filler
 * between two parts of one surname is dropped when the zone is parsed).
 */
export function transliterate(word: string): string {
  let value = word.toUpperCase();
  for (const [pattern, replacement] of TRANSLITERATIONS) {
    value = value.replace(pattern, replacement);
  }
  // NFD splits a letter from its combining mark; the range strips the marks
  // and leaves the base letter, which is what the standard does with them.
  return value
    .normalize("NFD")
    // The combining diacritical marks block, written as escapes rather than as
    // the characters themselves: a literal combining mark in a source file is
    // invisible in every editor and the first thing a careless save destroys.
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z]/g, "");
}

/**
 * The words a passport prints on itself, in the zone's alphabet.
 *
 * Field labels, document furniture and the two words that appear in most
 * issuing states' names. Not an attempt at every language — a page in Hindi or
 * Arabic script contributes nothing that survives `transliterate` anyway — but
 * the Latin boilerplate that OCR reliably returns and that is short enough to
 * come within a short name's edit budget.
 */
const STOP_WORDS = new Set([
  "AUTHORITY",
  "BIRTH",
  "CODE",
  "COUNTRY",
  "DATE",
  "EXPIRY",
  "FATHER",
  "FILE",
  "GIVEN",
  "GUARDIAN",
  "HOLDER",
  "ISSUE",
  "ISSUING",
  "KINGDOM",
  "MOTHER",
  "NAME",
  "NAMES",
  "NATIONALITY",
  "NUMBER",
  "OBSERVATIONS",
  "PASSEPORT",
  "PASSPORT",
  "PERSONAL",
  "PLACE",
  "REPUBLIC",
  "SEX",
  "SIGNATURE",
  "SPOUSE",
  "STATE",
  "SURNAME",
  "TYPE",
  "VALID",
]);

/**
 * A page token reduced to a candidate, or `null`.
 *
 * `display` is the word as printed, minus the punctuation that clings to the
 * end of a word on a form — a trailing colon after a label, a comma between
 * two names. Interior hyphens and apostrophes are KEPT, because they are part
 * of the name.
 *
 * `compare` is that same word transliterated, which is the string the zone's
 * version is measured against.
 */
function candidate(word: string): { display: string; compare: string } | null {
  const display = word.trim().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
  if (display.length < 2) return null;

  // A digit anywhere means this is a passport number, a date or a file
  // reference, not a name. The old code tested this after stripping, which is
  // why it needs stating here instead.
  if (/\d/.test(display)) return null;

  const compare = transliterate(display);
  if (compare.length < 2) return null;
  if (STOP_WORDS.has(compare)) return null;

  return { display, compare };
}

/** How far apart two spellings may be before they are different words. */
function tolerance(length: number): number {
  return Math.min(3, Math.floor(length / 4));
}

/**
 * The best page spelling for one word of a name, or the original.
 *
 * @param fromMrz  the word as the zone read it
 * @param pageWords every word OCR found on the printed page
 */
export function refineWord(fromMrz: string, pageWords: readonly string[]): string {
  const target = transliterate(fromMrz);
  if (target.length < 2) return fromMrz;

  const budget = tolerance(target.length);

  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const raw of pageWords) {
    const found = candidate(raw);
    if (!found) continue;

    /**
     * AN EXACT MATCH IS TAKEN EVEN WHEN THE BUDGET IS ZERO, and that is the
     * case that carries the accents.
     *
     * A two- or three-letter name gets no edit budget at all, so the old code
     * returned early without looking at the page. But `JOSÉ` and `JOSE` are an
     * exact match in the zone's alphabet, and the page's spelling is the one
     * worth having — the whole point of this pass. Zero budget means "no
     * SUBSTITUTIONS are safe", not "do not look".
     */
    if (found.compare === target) return found.display.toUpperCase();
    if (budget === 0) continue;

    if (Math.abs(found.compare.length - target.length) > 2) continue;

    const distance = editDistance(target, found.compare);
    if (distance <= budget && distance < bestDistance) {
      bestDistance = distance;
      best = found.display;
    }
  }

  /**
   * Uppercased, because a passport data page is set in capitals and the rest of
   * the name is coming from a zone that is capitals by construction. Returning
   * the page's casing verbatim would produce `JOHN Eriksson` on any page OCR
   * happened to read as title case — one half of a name from each source, in
   * two different cases, in a field labelled "as printed".
   */
  return best?.toUpperCase() ?? fromMrz;
}

/**
 * The same, for a name that may be several words.
 *
 * Each word is matched independently, because the page separates given names
 * with spaces and the zone separates them with `<` — so the two never arrive as
 * one comparable string, and matching them whole would fail on the join rather
 * than on the spelling.
 */
export function refineName(fromMrz: string, pageWords: readonly string[]): string {
  const parts = fromMrz.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fromMrz;
  return parts.map((part) => refineWord(part, pageWords)).join(" ");
}
