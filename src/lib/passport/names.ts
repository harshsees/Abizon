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
 * ── Why a distance threshold, and why it is tight ──
 *
 * The risk of the whole idea is adopting the wrong word: a page holds
 * `ERIKSSON`, `PASSPORT`, `UTOPIA` and forty other strings, and "closest" is
 * meaningless without a bound. So a candidate has to be
 *
 *   the same shape     within two characters of the same length
 *   nearly the same    at most one edit per four characters, and never more
 *                      than three
 *   a name at all      letters only; nothing with a digit in it
 *
 * Under those rules `OBRIKSSON` → `ERIKSSON` is adopted (distance 2 of 9) and
 * `ERIKSSON` → `PASSPORT` is not (distance 7). A short name is protected by
 * the per-four rule: `LI` will only ever match `LI`, because one edit on a
 * two-letter word is a different name.
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

/** Letters only, uppercased. A name with a digit in it is an OCR accident. */
function nameLike(word: string): string | null {
  const cleaned = word.toUpperCase().replace(/[^A-Z]/g, "");
  if (cleaned.length < 2 || cleaned.length !== word.trim().length) {
    // The second test rejects `ERIKSSON,` and `L898902C3` alike: anything that
    // needed characters stripped was not a bare name on the page.
    const bare = word.trim().toUpperCase();
    if (!/^[A-Z]{2,}$/.test(bare)) return null;
    return bare;
  }
  return cleaned;
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
  const target = fromMrz.toUpperCase().trim();
  if (target.length < 2) return fromMrz;

  const budget = tolerance(target.length);
  if (budget === 0) {
    // Too short for any edit to be safe: accept only an exact match, which
    // changes nothing but confirms the read.
    return pageWords.some((word) => nameLike(word) === target) ? target : fromMrz;
  }

  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const raw of pageWords) {
    const candidate = nameLike(raw);
    if (!candidate) continue;
    if (Math.abs(candidate.length - target.length) > 2) continue;

    const distance = editDistance(target, candidate);
    if (distance === 0) return target; // The page agrees. Nothing to do.
    if (distance <= budget && distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }

  return best ?? fromMrz;
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
