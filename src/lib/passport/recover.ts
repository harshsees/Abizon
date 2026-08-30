/**
 * RECOVERING AN MRZ FROM WHAT OCR ACTUALLY RETURNS
 * ---------------------------------------------------------------------------
 * `findMrzLines` in `mrz.ts` asks for two adjacent lines of exactly 44
 * characters, drawn only from `A-Z 0-9 <`, the first beginning with `P`. That
 * is a correct description of a machine-readable zone and a hopeless
 * description of an OCR result, which is why autofill never fired: a single
 * dropped character made the line 43 long and the whole read was discarded.
 *
 * The failures a real photograph produces, all of which this module absorbs:
 *
 *   length drift   43 or 45 characters. A filler run reads as one `<` fewer,
 *                  or a speck of dust reads as one more.
 *   noise          the whitelist cannot stop OCR emitting a stray character;
 *                  it only stops it emitting one from outside the alphabet.
 *   filler shapes  `<` is a chevron. It comes back as `«`, `K`, `C`, `(`, `€`,
 *                  and — most often — as nothing at all where a run of six of
 *                  them got collapsed.
 *   line breaks    the zone arrives split across three lines, or with a stray
 *                  fragment of the printed page wedged between the two.
 *   glyph pairs    `O`/`0`, `I`/`1`, `S`/`5`, `B`/`8`, `Z`/`2`, `G`/`6`. OCR-B
 *                  was designed to make these distinguishable to a machine
 *                  reading a flat page under controlled light, which is not
 *                  what a phone photograph is.
 *
 * ── Why guessing is safe here, and only here ──
 *
 * Everything below produces CANDIDATES. Not one of them is trusted: each is
 * handed to `parseMrz`, which recomputes five check digits from the ICAO
 * weighting, and a candidate is only preferred over another because it scored
 * better against those. The winner is returned with its own checks attached, so
 * a caller can still refuse to autofill a read that did not fully verify.
 *
 * That is the whole licence for the character substitutions. We are allowed to
 * try `0` where OCR said `O`, because if that guess is wrong the check digit
 * says so. Substituting without verifying would be inventing a passport number.
 */

import {
  MRZ_LINE_LENGTH,
  parseMrz,
  type MrzChecks,
  type MrzResult,
} from "./mrz";

/* -------------------------------------------------------------------------- */
/* Normalising                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Shapes OCR reports where a chevron was printed. Everything else outside the
 * alphabet is dropped rather than mapped: a stray mark is better removed than
 * turned into a filler that shifts every field after it.
 */
const FILLER_LOOKALIKES = /[«»‹›<>(){}\[\]|/\\^~"'`,.\-_=+*#$%&@?!:;]/g;

export function normaliseLine(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(FILLER_LOOKALIKES, "<")
    .replace(/[^A-Z0-9<]/g, "");
}

/**
 * Could this line plausibly be half of a zone?
 *
 * The length window is deliberately wide. A line 8 characters short is still
 * worth trying, because the shortfall is almost always a collapsed filler run
 * at the end — the fields at the front, which is where every value lives, are
 * untouched.
 */
function isCandidate(line: string): boolean {
  if (line.length < 30 || line.length > 52) return false;
  const fillers = (line.match(/</g) ?? []).length;
  // Every real TD3 line carries a run of fillers. A line of solid text with no
  // chevron at all is the printed page, not the zone.
  return fillers >= 2;
}

/**
 * Bring a line to exactly 44 characters.
 *
 * Short lines are padded on the RIGHT, because the tail of both lines is
 * filler by construction — line 1 ends in the name's padding and line 2 in the
 * optional personal-number field. Long lines lose trailing fillers first, and
 * only then real characters, because a trailing `<` is the most likely thing to
 * be spurious.
 */
function toLength(line: string): string {
  if (line.length === MRZ_LINE_LENGTH) return line;

  if (line.length < MRZ_LINE_LENGTH) {
    return line.padEnd(MRZ_LINE_LENGTH, "<");
  }

  let trimmed = line;
  while (trimmed.length > MRZ_LINE_LENGTH && trimmed.endsWith("<")) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.slice(0, MRZ_LINE_LENGTH);
}

/* -------------------------------------------------------------------------- */
/* Positional correction                                                      */
/* -------------------------------------------------------------------------- */

const TO_DIGIT: Record<string, string> = {
  O: "0", D: "0", Q: "0", U: "0",
  I: "1", L: "1", J: "1",
  Z: "2",
  A: "4",
  S: "5",
  G: "6", C: "6",
  T: "7",
  B: "8",
};

const TO_ALPHA: Record<string, string> = {
  "0": "O",
  "1": "I",
  "2": "Z",
  "4": "A",
  "5": "S",
  "6": "G",
  "8": "B",
};

/**
 * TD3 line 2, by position. Only the runs whose type is fixed by the standard
 * are listed; the passport number (0-8) and the personal number (28-41) are
 * alphanumeric and are left exactly as read.
 */
const LINE_2_DIGITS: Array<[number, number]> = [
  [9, 9], // passport number check
  [13, 18], // date of birth
  [19, 19], // its check
  [21, 26], // date of expiry
  [27, 27], // its check
  [42, 43], // personal-number check, then the composite
];

const LINE_2_ALPHA: Array<[number, number]> = [
  [10, 12], // nationality, ISO 3166-1 alpha-3
];

function coerceRanges(
  line: string,
  ranges: Array<[number, number]>,
  map: Record<string, string>,
): string {
  const chars = line.split("");
  for (const [from, to] of ranges) {
    for (let index = from; index <= to && index < chars.length; index += 1) {
      const replacement = map[chars[index]!];
      if (replacement) chars[index] = replacement;
    }
  }
  return chars.join("");
}

/** The corrections worth trying on line 2, cheapest first. */
function line2Variants(line: string): string[] {
  const variants = new Set<string>([line]);

  const typed = coerceRanges(
    coerceRanges(line, LINE_2_DIGITS, TO_DIGIT),
    LINE_2_ALPHA,
    TO_ALPHA,
  );
  variants.add(typed);

  // The sex field takes exactly three values, and `F` misread as `E` or `P` is
  // common enough to be worth one more variant.
  for (const base of [...variants]) {
    const sex = base[20];
    if (sex && !"MFX<".includes(sex)) {
      variants.add(`${base.slice(0, 20)}<${base.slice(21)}`);
    }
  }

  return [...variants];
}

/** Line 1 carries no check digits, so only its document code is worth fixing. */
function line1Variants(line: string): string[] {
  const variants = new Set<string>([line]);
  if (line[0] !== "P") variants.add(`P${line.slice(1)}`);
  return [...variants];
}

/* -------------------------------------------------------------------------- */
/* The search                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * How good a candidate is, for choosing between two that both parsed.
 *
 * The three field digits are what decide, because they are what gates the
 * autofill. The composite is worth something — it catches a transposition the
 * field digits miss — but less than a field digit, for the reason set out on
 * `TRUSTED_BY_CHECK` below: it also covers the optional personal-number field,
 * which this product does not read and which is the region OCR most often
 * mangles.
 */
export function score(checks: MrzChecks): number {
  return (
    (checks.passportNumber ? 2 : 0) +
    (checks.dateOfBirth ? 2 : 0) +
    (checks.dateOfExpiry ? 2 : 0) +
    (checks.composite ? 1 : 0)
  );
}

/**
 * Which fields a given set of checks makes it safe to fill in.
 *
 * THIS IS THE RULE THAT DECIDES WHETHER AUTOFILL EVER FIRES, and getting it
 * wrong in the cautious direction is what made the feature look broken.
 *
 * The old rule was "every check passed, or fill nothing". In practice the three
 * field digits would pass and the composite would not, and the whole read was
 * thrown away — because the composite spans positions 28-42 as well, which is
 * the OPTIONAL PERSONAL NUMBER: a field that is blank on most passports, filled
 * with a fourteen-character string on some, used by this product for nothing at
 * all, and the single most misread region of the zone. A passport number that
 * verified against its own check digit was being discarded because a field
 * nobody reads did not.
 *
 * So each field is judged by the digit that exists to judge it:
 *
 *   passportNumber   its own check digit, position 9
 *   dateOfBirth      its own, position 19
 *   dateOfExpiry     its own, position 27
 *
 * And the fields with NO check digit anywhere in the standard — surname, given
 * names, nationality, sex — are returned as read and marked unverifiable,
 * because that is what they are. The old rule appeared to verify them and did
 * not: they live on line 1, and no check digit in a TD3 zone covers line 1.
 */
export type TrustedField =
  | "passportNumber"
  | "dateOfBirth"
  | "dateOfExpiry";

export function trustedFields(checks: MrzChecks): TrustedField[] {
  const trusted: TrustedField[] = [];
  if (checks.passportNumber) trusted.push("passportNumber");
  if (checks.dateOfBirth) trusted.push("dateOfBirth");
  if (checks.dateOfExpiry) trusted.push("dateOfExpiry");
  return trusted;
}

export type RecoveredMrz = {
  result: Extract<MrzResult, { ok: true }>;
  /** The two lines that produced it, as fed to the parser. */
  lines: [string, string];
  /** Which candidate lines of the OCR text they came from. */
  lineIndices: [number, number];
};

/**
 * Find the best-verifying zone in a block of OCR text, or nothing.
 *
 * Pairs are tried in order of proximity: adjacent lines first, then one line
 * apart, then two. A stray fragment landing between the two halves of the zone
 * is common; a genuine zone with three lines of text between its halves is not,
 * so the window stops there.
 */
export function recoverMrz(text: string): RecoveredMrz | null {
  const lines = text
    .split(/\r?\n/)
    .map(normaliseLine)
    .filter((line) => line.length > 0);

  const candidates = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => isCandidate(line));

  let best: RecoveredMrz | null = null;
  let bestScore = -1;

  for (let a = 0; a < candidates.length; a += 1) {
    for (let b = a + 1; b < candidates.length; b += 1) {
      if (candidates[b]!.index - candidates[a]!.index > 3) break;

      const first = toLength(candidates[a]!.line);
      const second = toLength(candidates[b]!.line);

      for (const line1 of line1Variants(first)) {
        for (const line2 of line2Variants(second)) {
          const parsed = parseMrz(line1, line2);
          if (!parsed.ok) continue;

          const value = score(parsed.checks);
          if (value > bestScore) {
            bestScore = value;
            best = {
              result: parsed,
              lines: [line1, line2],
              lineIndices: [candidates[a]!.index, candidates[b]!.index],
            };
          }

          // Nothing beats every check passing; stop looking.
          if (parsed.allChecksPassed) return best;
        }
      }
    }
  }

  return best;
}
