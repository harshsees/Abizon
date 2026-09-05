/**
 * READING A PAN CARD, AND CHECKING IT IS ONE
 * ---------------------------------------------------------------------------
 * The passport gets a real verification: the machine-readable zone carries
 * check digits, so a misread passport number is CAUGHT rather than believed,
 * and `scan.ts` refuses to present values whose digits do not agree. Every
 * other document in the flow got nothing — a file was attached and that was
 * the end of it.
 *
 * A PAN card is the one other document in the set that can be checked, because
 * the number has a shape that means something:
 *
 *     A A A A A 9 9 9 9 A
 *     └───┬───┘ └──┬──┘ └── check character
 *         │        └─────── a four-digit serial
 *         │
 *         ├─ 1-3  a series code
 *         ├─ 4    the HOLDER TYPE, from a closed set of ten letters
 *         └─ 5    the first letter of the holder's surname (or, for a company,
 *                 of its name)
 *
 * Two of those ten characters are constrained by rules rather than by
 * convention, and that is enough to tell a PAN card from a driving licence,
 * from a photograph of the wrong side, and from a blurred read — which is
 * exactly what an applicant needs told while they are still holding the card.
 *
 * ── What this is NOT ──
 *
 * It is not a check that the PAN exists, that it belongs to the person named,
 * or that it is not suspended. Those are answered by NSDL's verification API
 * and by nothing else; a regular expression cannot know them and this module
 * does not claim to. What it establishes is that the image contains something
 * shaped like a PAN, which is the difference between "we have a file" and "we
 * have the document we asked for".
 *
 * The tenth character is a check character computed from the other nine, but
 * the algorithm is not published by the Income Tax Department. Implementations
 * circulating online disagree with each other and with real cards, so it is
 * deliberately NOT validated here: a check that rejects valid documents is
 * worse than no check, and this one would.
 */

/**
 * The fourth character, and what it says the holder is.
 *
 * A closed set of ten. Anything else in that position is a misread — which is
 * most of the value of the test, because `0`/`O` and `1`/`I` are the confusions
 * OCR makes on a card photographed at an angle, and both land here.
 */
export const HOLDER_TYPES: Readonly<Record<string, string>> = {
  A: "Association of persons",
  B: "Body of individuals",
  C: "Company",
  F: "Firm or LLP",
  G: "Government",
  H: "Hindu undivided family",
  J: "Artificial juridical person",
  L: "Local authority",
  P: "Individual",
  T: "Trust",
};

/** Five letters, four digits, one letter. */
const PAN_SHAPE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export type PanReading = {
  number: string;
  /** The fourth character. */
  holderType: string;
  /** What that character means, in words. */
  holderTypeLabel: string;
  /** The fifth character — the initial of the holder's surname. */
  surnameInitial: string;
};

/**
 * Is this string a well-formed PAN?
 *
 * Case is normalised and interior spaces are dropped, because a card prints
 * the number in a wide-tracked face and OCR frequently returns it in two or
 * three pieces. Nothing else is repaired: substituting `O` for `0` to make a
 * candidate fit would manufacture the very validation this exists to perform.
 */
export function parsePan(text: string): PanReading | null {
  const value = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!PAN_SHAPE.test(value)) return null;

  const holderType = value[3]!;
  const label = HOLDER_TYPES[holderType];
  if (!label) return null;

  return {
    number: value,
    holderType,
    holderTypeLabel: label,
    surnameInitial: value[4]!,
  };
}

/**
 * The PAN on a card, from the words OCR returned.
 *
 * ── Why it joins neighbouring words ──
 *
 * `BQEPG 1234 F` is one number set with wide tracking, and OCR returns it as
 * three tokens as often as one. So each word is tried alone, then joined with
 * the one after it, then with the two after it. Three is the limit: a longer
 * window starts joining the number to the date of birth printed under it, and
 * a ten-character shape can be found inside almost any long enough run of
 * capitals and digits.
 *
 * ── Why the FIRST valid reading wins ──
 *
 * A card carries exactly one PAN. A second match is a coincidence — a
 * signature block or a hologram read as characters — and taking the last would
 * mean a valid read at the top of the card could be replaced by noise at the
 * bottom. Reading order is top-to-bottom on the page, and the number is
 * printed above the photograph on every card issued since 2016.
 */
export function findPan(words: readonly string[]): PanReading | null {
  for (let index = 0; index < words.length; index += 1) {
    for (let span = 1; span <= 3 && index + span <= words.length; span += 1) {
      const reading = parsePan(words.slice(index, index + span).join(""));
      if (reading) return reading;
    }
  }

  return null;
}

/**
 * Does this PAN's surname initial agree with the name on the passport?
 *
 * ── Returns three answers, not two ──
 *
 * `"match"` and `"mismatch"` are what they say. `"unknown"` is the important
 * one, and it is returned whenever there is no surname to compare against or
 * the holder is not an individual — a PAN issued to a company or a Hindu
 * undivided family takes its fifth letter from the entity's name, so comparing
 * it to a traveller's surname is comparing two unrelated things.
 *
 * A mismatch is NOT an error and the caller must not treat it as one. The
 * requirement is the PAN of whoever is paying for the trip, and that is
 * routinely a parent, a spouse or an employer. What a mismatch earns is a
 * sentence on the screen — "this PAN is not in <name>'s surname" — so somebody
 * who uploaded the wrong card notices now rather than at the consulate.
 */
export function surnameAgrees(
  reading: PanReading,
  surname: string | undefined,
): "match" | "mismatch" | "unknown" {
  if (reading.holderType !== "P") return "unknown";

  const initial = surname?.trim().toUpperCase().replace(/[^A-Z]/g, "")[0];
  if (!initial) return "unknown";

  return initial === reading.surnameInitial ? "match" : "mismatch";
}
