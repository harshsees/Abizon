"use client";

/**
 * SCANNING A PASSPORT, IN THE BROWSER.
 * ---------------------------------------------------------------------------
 * Reads the machine-readable zone off a photograph and hands back verified
 * fields. `mrz.ts` owns the rules, `recover.ts` owns getting from OCR noise to
 * two clean lines, `preprocess.ts` owns getting the image into a state the
 * engine can read, and this owns the sequence.
 *
 * ── The image never leaves the device ──
 *
 * The OCR runs in a Worker on the applicant's own machine, against an engine
 * served from our origin. No passport photograph is uploaded to read it, and no
 * third party is on the path. That is the property that made client-side OCR
 * worth the megabytes over a hosted extraction API, and it is the thing to
 * preserve if this is ever replaced.
 *
 * ── Why it takes three passes ──
 *
 * The first version took one, over the whole photograph, and essentially never
 * succeeded. The three now are:
 *
 *   1. MRZ CROP. The bottom third, upscaled and contrast-normalised, read with
 *      the MRZ alphabet and "one uniform block". This is the pass that is
 *      supposed to work, and on a reasonable photograph it does.
 *   2. WHOLE PAGE, same settings. The fallback for a photograph framed so
 *      loosely that the zone is not in the bottom third, or so tightly that the
 *      crop cut through it.
 *   3. PRINTED PAGE, no whitelist, with word boxes. Only after 1 or 2 has
 *      produced verified values. Its job is NOT to read anything — it is to
 *      find where on the page the values we already have are printed, so the
 *      interface can point at them.
 *
 * Pass 3 is what makes the scan animation honest. The reference draws labelled
 * rectangles over First Name, Date of Birth and Passport No while it works;
 * this draws them too, but each rectangle is a word box OCR actually returned,
 * matched to a value the MRZ's check digits already verified. Nothing is placed
 * by guesswork.
 *
 * ── Why the result is never simply "here are the fields" ──
 *
 * OCR is a guess. The MRZ's check digits turn that guess into something
 * verifiable, and this module refuses to present unverified values as facts: a
 * read whose digits do not agree comes back as `unverified`, with the failing
 * fields named, and the caller decides what to say. Autofilling a passport
 * number that failed its own checksum is worse than not autofilling at all.
 *
 * ── The seam ──
 *
 * `PassportScanner` is the whole contract. Swapping in Mindee, Klippa or Regula
 * later means one more implementation of this interface; the flow above it does
 * not change. That swap sends passport images to a processor, which is a DPDP
 * decision before it is a technical one.
 */

import { refineName } from "./names";
import { nationalityFromPageText } from "./nationality";
import { decodeOnce, prepare } from "./preprocess";
import { recoverMrz, score, trustedFields, type TrustedField } from "./recover";
import type { MrzChecks, MrzFailure, MrzFields } from "./mrz";

export type ScanProgress =
  | { phase: "starting" }
  | { phase: "reading"; percent: number }
  | { phase: "verifying" }
  | { phase: "locating" };

/**
 * Where a value is printed on the page, in fractions of the image, with the
 * label to put beside it. Empty when pass 3 found nothing — never a guess.
 */
/**
 * The values a scan can point at on a page.
 *
 * The first five come off the photo page and are cross-checked against the
 * machine-readable zone. The rest come off the BACK page, which has no zone,
 * and are found by their printed label rather than by matching a verified
 * value — see `#readBackPage`. They are annotated and shown; none of them
 * reaches the form.
 */
export type FieldBoxKey =
  | "surname"
  | "givenNames"
  | "passportNumber"
  | "dateOfBirth"
  | "dateOfExpiry"
  | "fatherName"
  | "motherName"
  | "spouseName"
  | "address"
  | "fileNumber"
  | "oldPassport";

export type FieldBox = {
  key: FieldBoxKey;
  label: string;
  value: string;
  /** Fractions of the original image, top-left origin. */
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * THE THREE ANSWERS, and what each licenses the caller to do.
 *
 *   verified   all three field check digits agreed. Fill everything.
 *   partial    some agreed. Fill ONLY those, which is what `trusted`
 *              names; the rest is returned so the interface can show what
 *              was read without putting it in the form.
 *   failed     no zone, or nothing that parsed.
 *
 * `trusted` never includes the name, nationality or sex, and that is not an
 * omission: no check digit in a TD3 zone covers line 1, so those values are
 * unverifiable by construction. They are filled alongside the verified ones
 * — a name read badly is obvious to its owner in a way a transposed passport
 * number is not — and the review screen is where they get looked at.
 */
export type ScanOutcome =
  | { status: "verified"; fields: MrzFields; boxes: FieldBox[] }
  | {
      status: "partial";
      fields: MrzFields;
      checks: MrzChecks;
      /** Which values the check digits vouch for. */
      trusted: TrustedField[];
      /** Which did not, in the applicant's words. */
      failed: string[];
      boxes: FieldBox[];
    }
  | { status: "failed"; reason: MrzFailure | "engine-error" };

/**
 * WHAT A BACK PAGE READ COMES BACK AS.
 *
 * A deliberately smaller answer than `ScanOutcome`, because a back page is a
 * deliberately smaller read. There is no machine-readable zone on it and
 * therefore no check digit anywhere on the page, so there is no `verified`
 * state to report and nothing here is presented as verified.
 *
 *   read    OCR found the page and something on it. `values` is what it found,
 *           `boxes` is where. Either may be empty — a back page whose fields
 *           are all handwritten is still a successfully read back page.
 *   failed  the engine could not run, or the image could not be decoded.
 *
 * `nationality` is the ONE value that leaves this module for the form, and it
 * is the one value on the page drawn from a closed list. See
 * `backPageToDetails` for why the rest stays here.
 */
export type BackPageOutcome =
  | {
      status: "read";
      /** Label/value pairs for the screen, in printed order. */
      values: Array<{ label: string; value: string }>;
      boxes: FieldBox[];
      /** Resolved from the issuing state printed on the page, if it is there. */
      nationality?: string;
    }
  | { status: "failed"; reason: "engine-error" };

export interface PassportScanner {
  scan(image: Blob, onProgress?: (progress: ScanProgress) => void): Promise<ScanOutcome>;
  /**
   * Read the passport's back page.
   *
   * Shares the worker with `scan`, which is the whole reason it lives on the
   * same object: the engine costs several megabytes and a second or two to
   * start, and the back page is read moments after the photo page in the same
   * errand. A separate scanner instance would pay that twice.
   */
  scanBackPage(
    image: Blob,
    onProgress?: (progress: ScanProgress) => void,
  ): Promise<BackPageOutcome>;
  /** Release the worker. Cheap to call when it was never started. */
  dispose(): Promise<void>;
}

/** Human labels for the checks, for the message the applicant actually reads. */
const CHECK_LABELS: Record<keyof MrzChecks, string> = {
  passportNumber: "passport number",
  dateOfBirth: "date of birth",
  dateOfExpiry: "expiry date",
  composite: "overall checksum",
};

/**
 * The MRZ alphabet, and only it. Constraining the character set is the single
 * most effective thing available here: `O` and `0`, `I` and `1`, `S` and `5`
 * are the confusions OCR-B invites, and while the whitelist cannot stop them it
 * removes every candidate outside the alphabet, which is most of them.
 *
 * The check digits still do the deciding. This just makes them pass more often.
 */
const MRZ_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";

/**
 * Where to look for the zone, in order.
 *
 * The zone sits at the very foot of the data page. The first window is
 * generous enough to survive a photograph with some table in the frame; the
 * second is the whole image, for one framed so tightly the first cut through
 * the lines.
 */
const MRZ_WINDOWS = [
  { x: 0, y: 0.62, width: 1, height: 0.38 },
  { x: 0, y: 0, width: 1, height: 1 },
];

type Rect = { x0: number; y0: number; x1: number; y1: number };

type TesseractWord = { text: string; bbox: Rect };

type TesseractWorker = {
  recognize: (
    image: Blob,
    options?: Record<string, unknown>,
    output?: Record<string, boolean>,
  ) => Promise<{ data: { text: string; blocks?: unknown } }>;
  setParameters: (parameters: Record<string, string>) => Promise<unknown>;
  terminate: () => Promise<unknown>;
};

export class BrowserMrzScanner implements PassportScanner {
  #worker: TesseractWorker | null = null;
  #starting: Promise<TesseractWorker> | null = null;

  /**
   * Started once and kept. Spinning the engine up costs several megabytes and
   * a second or two; an applicant who retakes a blurred photo should not pay
   * that twice.
   */
  async #ensureWorker(onProgress?: (progress: ScanProgress) => void): Promise<TesseractWorker> {
    if (this.#worker) return this.#worker;

    this.#starting ??= (async () => {
      onProgress?.({ phase: "starting" });

      // Imported here rather than at module scope so that the eight megabytes
      // of engine are only fetched by someone who actually scans, and never by
      // the 150 destination pages.
      const { createWorker } = await import("tesseract.js");

      const worker = (await createWorker("eng", 1, {
        workerPath: "/tesseract/worker.min.js",
        corePath: "/tesseract/tesseract-core-simd-lstm.wasm.js",
        langPath: "/tesseract",
        // The language data is served uncompressed from our own origin.
        gzip: false,
        logger: (message: { status: string; progress: number }) => {
          if (message.status === "recognizing text") {
            onProgress?.({ phase: "reading", percent: Math.round(message.progress * 100) });
          }
        },
      })) as unknown as TesseractWorker;

      this.#worker = worker;
      return worker;
    })();

    try {
      return await this.#starting;
    } catch (error) {
      // A failed start must not leave a rejected promise cached, or every
      // retry for the rest of the session replays the same failure.
      this.#starting = null;
      throw error;
    }
  }

  /** The MRZ configuration: restricted alphabet, one uniform block. */
  async #configureForMrz(worker: TesseractWorker) {
    await worker.setParameters({
      tessedit_char_whitelist: MRZ_ALPHABET,
      tessedit_pageseg_mode: "6",
    });
  }

  /** The printed-page configuration: everything, laid out normally. */
  async #configureForPage(worker: TesseractWorker) {
    await worker.setParameters({
      tessedit_char_whitelist: "",
      tessedit_pageseg_mode: "3",
    });
  }

  async scan(
    image: Blob,
    onProgress?: (progress: ScanProgress) => void,
  ): Promise<ScanOutcome> {
    let worker: TesseractWorker;
    let bitmap: ImageBitmap;

    try {
      worker = await this.#ensureWorker(onProgress);
      bitmap = await decodeOnce(image);
    } catch {
      // Deliberately not logged with the error attached: the stack from an OCR
      // failure can carry image data, and this runs on a passport.
      return { status: "failed", reason: "engine-error" };
    }

    try {
      await this.#configureForMrz(worker);

      let recovered: ReturnType<typeof recoverMrz> = null;
      let bestScore = -1;

      for (const window of MRZ_WINDOWS) {
        const prepared = await prepare(bitmap, window);
        const result = await worker.recognize(prepared.blob);
        const candidate = recoverMrz(result.data.text);
        if (!candidate) continue;

        // Keep the BETTER read, not merely the first or the perfect one. The
        // crop usually wins, but on an image that was already sharp the whole
        // page can beat it, and a version that only replaced on a perfect
        // score would throw the better of two imperfect reads away.
        const value = score(candidate.result.checks);
        if (value > bestScore) {
          bestScore = value;
          recovered = candidate;
        }
        if (candidate.result.allChecksPassed) break;
      }

      if (!recovered) {
        bitmap.close();
        return { status: "failed", reason: "no-mrz-found" };
      }

      onProgress?.({ phase: "verifying" });

      const { fields, checks } = recovered.result;

      /**
       * Pass 3 — read the printed page.
       *
       * It does two jobs, and the second is the more valuable. It finds where
       * the verified values are printed, which is what the annotation draws.
       * And it gives the NAME a second opinion: line 1 of the zone carries no
       * check digit, so a misread name is undetectable from the zone alone,
       * while the same name is printed above it in a large clean face. See
       * `names.ts` for the rules on when the page's spelling is preferred.
       *
       * Best-effort by design: a scan that verified is a success whether or not
       * the page could be read as well.
       */
      onProgress?.({ phase: "locating" });
      let boxes: FieldBox[] = [];
      let refined = fields;
      try {
        const located = await this.#locate(worker, bitmap, fields);
        boxes = located.boxes;
        refined = located.fields;
      } catch {
        boxes = [];
      }

      bitmap.close();

      const trusted = trustedFields(checks);

      // Every field that has a check digit passed it. The composite may still
      // have failed — it also covers the personal number, which nothing here
      // reads — and that is not a reason to withhold three verified values.
      if (trusted.length === 3) {
        return { status: "verified", fields: refined, boxes };
      }

      const failed = (Object.keys(checks) as Array<keyof MrzChecks>)
        .filter((key) => !checks[key])
        .map((key) => CHECK_LABELS[key]);

      return { status: "partial", fields: refined, checks, trusted, failed, boxes };
    } catch {
      bitmap.close();
      return { status: "failed", reason: "engine-error" };
    }
  }

  /**
   * Find where the verified values are printed, by reading the page normally
   * and matching words against values we already trust.
   *
   * The match is deliberately strict — normalised equality, or containment for
   * a value at least four characters long — because a loose match would put a
   * label on the wrong part of somebody's passport, which is worse than putting
   * no label anywhere.
   */
  async #locate(
    worker: TesseractWorker,
    bitmap: ImageBitmap,
    fields: MrzFields,
  ): Promise<{ boxes: FieldBox[]; fields: MrzFields }> {
    await this.#configureForPage(worker);
    // No contrast pass. See the note on `prepare` — the percentile stretch is
    // built for the zone's crop and reduces a whole page to noise.
    const prepared = await prepare(bitmap, undefined, { contrast: false });
    const result = await worker.recognize(prepared.blob, undefined, { blocks: true });
    await this.#configureForMrz(worker);

    const words = collectWords(result.data.blocks);
    if (words.length === 0) return { boxes: [], fields };

    // The names, corrected against the printed page before anything else uses
    // them — so the boxes below are matched on the CORRECTED spelling, which
    // is the spelling actually on the page and therefore the one that will
    // match a word box exactly.
    const vocabulary = words.map((word) => word.text);
    const refined: MrzFields = {
      ...fields,
      surname: refineName(fields.surname, vocabulary),
      givenNames: refineName(fields.givenNames, vocabulary),
    };

    const wanted: Array<{ key: FieldBox["key"]; label: string; value: string }> = [
      { key: "surname", label: "Last name", value: refined.surname },
      { key: "givenNames", label: "First name", value: refined.givenNames.split(" ")[0] ?? "" },
      { key: "passportNumber", label: "Passport no", value: refined.passportNumber },
      { key: "dateOfBirth", label: "Date of birth", value: refined.dateOfBirth },
      { key: "dateOfExpiry", label: "Valid till", value: refined.dateOfExpiry },
    ];

    const boxes: FieldBox[] = [];

    for (const { key, label, value } of wanted) {
      const needle = normaliseValue(value);
      if (needle.length < 3) continue;

      const hit =
        key === "dateOfBirth" || key === "dateOfExpiry"
          ? findDate(words, value)
          : words.find((word) => {
              const text = normaliseValue(word.text);
              if (text.length < 3) return false;
              return text === needle || (needle.length >= 4 && text.includes(needle));
            });

      if (!hit) continue;

      boxes.push({
        key,
        label,
        value,
        x: hit.bbox.x0 / prepared.width,
        y: hit.bbox.y0 / prepared.height,
        width: (hit.bbox.x1 - hit.bbox.x0) / prepared.width,
        height: (hit.bbox.y1 - hit.bbox.y0) / prepared.height,
      });
    }

    return { boxes, fields: refined };
  }

  /**
   * READ THE BACK PAGE.
   *
   * ── Why it is a different method and not a flag on `scan` ──
   *
   * Because it is a different problem. `scan` is built around a
   * machine-readable zone: it crops to the bottom third, constrains the
   * alphabet to the MRZ's thirty-seven characters, and lets the check digits
   * decide whether the read may be believed. A back page has none of that. It
   * is ordinary printed text in ordinary type, with labels beside values, and
   * running the MRZ configuration over it would return a page of nonsense with
   * nothing to catch it.
   *
   * So this is one pass with the PAGE configuration — no whitelist, normal
   * layout analysis, word boxes on — and everything downstream of it treats
   * what comes back as unverified, because it is.
   *
   * ── How values are found ──
   *
   * By their printed label, not by matching something already known. The photo
   * page could match against MRZ values whose check digits had passed; here
   * there is nothing to match against, so the reader looks for `FATHER`,
   * `MOTHER`, `ADDRESS`, `FILE NO` and their common variants, and takes what
   * is printed after them on the same line.
   *
   * That is a weaker technique and it is treated as one. A label that is not
   * found yields nothing rather than a guess, the values are shown on the scan
   * screen and go no further, and the applicant is not asked to confirm any of
   * them — the review screen's fields all come from the photo page.
   *
   * ── The one exception ──
   *
   * Nationality, via `nationalityFromPageText`, which only ever returns a
   * member of a closed list of country names. A misread produces no answer
   * rather than a wrong one, which is the property that makes it safe to put
   * in the form — and it fills the gap left when the MRZ's three-letter code
   * came back as noise.
   */
  async scanBackPage(
    image: Blob,
    onProgress?: (progress: ScanProgress) => void,
  ): Promise<BackPageOutcome> {
    let worker: TesseractWorker;
    let bitmap: ImageBitmap;

    try {
      worker = await this.#ensureWorker(onProgress);
      bitmap = await decodeOnce(image);
    } catch {
      // As in `scan`: never logged with the error attached, because an OCR
      // stack can carry image data and this runs on a passport.
      return { status: "failed", reason: "engine-error" };
    }

    try {
      onProgress?.({ phase: "locating" });

      await this.#configureForPage(worker);
      // As in `#locate`: a printed page is read without the MRZ contrast pass.
      const prepared = await prepare(bitmap, undefined, { contrast: false });
      const result = await worker.recognize(prepared.blob, undefined, { blocks: true });
      // Left as it was found, so the next photo-page scan does not inherit a
      // page configuration it did not ask for.
      await this.#configureForMrz(worker);

      bitmap.close();

      const words = collectWords(result.data.blocks);
      const lines = groupIntoLines(words);

      const found: FieldBox[] = [];
      const values: Array<{ label: string; value: string }> = [];

      for (const field of BACK_PAGE_FIELDS) {
        const hit = findLabelledValue(lines, field.match);
        if (!hit) continue;

        values.push({ label: field.label, value: hit.text });
        found.push({
          key: field.key,
          label: field.label,
          value: hit.text,
          x: hit.bbox.x0 / prepared.width,
          y: hit.bbox.y0 / prepared.height,
          width: (hit.bbox.x1 - hit.bbox.x0) / prepared.width,
          height: (hit.bbox.y1 - hit.bbox.y0) / prepared.height,
        });
      }

      return {
        status: "read",
        values,
        boxes: found,
        nationality: nationalityFromPageText(words.map((word) => word.text)),
      };
    } catch {
      bitmap.close();
      return { status: "failed", reason: "engine-error" };
    }
  }

  async dispose(): Promise<void> {
    const worker = this.#worker;
    this.#worker = null;
    this.#starting = null;
    await worker?.terminate().catch(() => {});
  }
}

/* -------------------------------------------------------------------------- */
/* The back page                                                              */
/* -------------------------------------------------------------------------- */

/**
 * What to look for, and the words it is printed under.
 *
 * The variants are not padding. `FATHER` alone misses "NAME OF FATHER" on some
 * designs and "FATHER'S NAME" on others once the apostrophe has been OCR'd as
 * a comma or dropped entirely, which is why matching is done on letters only.
 * Ordered as the fields appear on the page, so the list beside the image reads
 * top to bottom.
 */
const BACK_PAGE_FIELDS: Array<{
  key: FieldBoxKey;
  label: string;
  /** Normalised label fragments. Any one of them matching is a hit. */
  match: string[];
}> = [
  { key: "fatherName", label: "Father", match: ["FATHER", "LEGALGUARDIAN", "GUARDIAN"] },
  { key: "motherName", label: "Mother", match: ["MOTHER"] },
  { key: "spouseName", label: "Spouse", match: ["SPOUSE", "HUSBAND", "WIFE"] },
  { key: "address", label: "Address", match: ["ADDRESS"] },
  { key: "oldPassport", label: "Previous passport", match: ["OLDPASSPORT", "PREVIOUSPASSPORT"] },
  { key: "fileNumber", label: "File number", match: ["FILENO", "FILENUMBER"] },
];

type TesseractLine = { words: TesseractWord[]; bbox: Rect };

/**
 * Words grouped into lines by vertical overlap.
 *
 * The recognition tree does have a `lines` level, but this walks words instead,
 * for the same reason `collectWords` does: tesseract.js has moved the shape of
 * that tree between versions, and word nodes are recognisable by carrying a
 * `symbols` array rather than by their depth. Grouping by geometry is a few
 * lines and cannot be broken by a library upgrade.
 *
 * Two words are on the same line when their vertical extents overlap by more
 * than half the shorter one's height. That is more forgiving than comparing
 * baselines, which matters on a photographed page that is never quite square.
 */
function groupIntoLines(words: TesseractWord[]): TesseractLine[] {
  const sorted = [...words].sort((a, b) => a.bbox.y0 - b.bbox.y0);
  const lines: TesseractLine[] = [];

  for (const word of sorted) {
    const height = word.bbox.y1 - word.bbox.y0;
    const line = lines.find((candidate) => {
      const overlap =
        Math.min(candidate.bbox.y1, word.bbox.y1) -
        Math.max(candidate.bbox.y0, word.bbox.y0);
      return overlap > Math.min(height, candidate.bbox.y1 - candidate.bbox.y0) * 0.5;
    });

    if (line) {
      line.words.push(word);
      line.bbox = {
        x0: Math.min(line.bbox.x0, word.bbox.x0),
        y0: Math.min(line.bbox.y0, word.bbox.y0),
        x1: Math.max(line.bbox.x1, word.bbox.x1),
        y1: Math.max(line.bbox.y1, word.bbox.y1),
      };
    } else {
      lines.push({ words: [word], bbox: { ...word.bbox } });
    }
  }

  // Left to right within each line: the words arrived sorted by height alone.
  for (const line of lines) line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);

  return lines;
}

/**
 * The value printed after a label, and the box around it.
 *
 * Walks each line looking for a word whose letters start one of the label
 * fragments, then takes everything to its right as the value. A colon, where
 * OCR kept one, is dropped along with any leading `NAME` or `OF` left over
 * from a multi-word label.
 *
 * Returns nothing rather than a guess when the label is found but there is
 * nothing to its right — on many designs the value is on the NEXT line, and
 * reaching down to grab it would as often grab the following label.
 */
function findLabelledValue(
  lines: TesseractLine[],
  match: string[],
): { text: string; bbox: Rect } | undefined {
  for (const line of lines) {
    const index = line.words.findIndex((word) => {
      const letters = word.text.toUpperCase().replace(/[^A-Z]/g, "");
      return letters.length >= 4 && match.some((fragment) => fragment.startsWith(letters));
    });
    if (index === -1) continue;

    // Everything to the right of the label, minus the connective words a
    // multi-word label leaves behind.
    const rest = line.words
      .slice(index + 1)
      .filter((word) => {
        const letters = word.text.toUpperCase().replace(/[^A-Z]/g, "");
        return !["NAME", "OF", "S", "NO"].includes(letters);
      });

    const text = rest
      .map((word) => word.text)
      .join(" ")
      .replace(/^[:\-\s]+/, "")
      .trim();

    if (text.length < 2) continue;

    return {
      text,
      bbox: {
        x0: Math.min(...rest.map((word) => word.bbox.x0)),
        y0: Math.min(...rest.map((word) => word.bbox.y0)),
        x1: Math.max(...rest.map((word) => word.bbox.x1)),
        y1: Math.max(...rest.map((word) => word.bbox.y1)),
      },
    };
  }

  return undefined;
}

/* -------------------------------------------------------------------------- */

function normaliseValue(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Every word box in a recognition result.
 *
 * The tree is blocks → paragraphs → lines → words → symbols, and the level
 * wanted is `words`: a box around a line is not a box around a field, and a box
 * around a symbol is a box around one letter. A word is recognisable as the
 * node that carries a `symbols` array, which is what this matches on rather
 * than on tree depth — tesseract.js has moved this shape between versions and
 * depth is the thing most likely to change again.
 *
 * `symbols` is never descended into. Returning nothing is a supported outcome:
 * the annotation is optional, and a version that reports boxes differently must
 * not be able to fail a scan that has already verified.
 */
function collectWords(blocks: unknown): TesseractWord[] {
  const words: TesseractWord[] = [];

  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== "object") return;

    const record = node as Record<string, unknown>;
    const bbox = record.bbox as Rect | undefined;

    if (
      Array.isArray(record.symbols) &&
      typeof record.text === "string" &&
      bbox &&
      typeof bbox.x0 === "number" &&
      typeof bbox.y0 === "number" &&
      typeof bbox.x1 === "number" &&
      typeof bbox.y1 === "number"
    ) {
      words.push({ text: record.text, bbox });
      return;
    }

    for (const key of ["blocks", "paragraphs", "lines", "words"]) {
      if (key in record) walk(record[key]);
    }
  };

  walk(blocks);
  return words;
}

/**
 * Dates are printed in a dozen formats — `04/10/2002`, `04 OCT 2002`,
 * `04 OCT / OCT 02` — so they are matched on their parts rather than as a
 * string: the day and the four-digit year appearing in the same word, or a word
 * holding the day next to one holding the year.
 */
function findDate(words: TesseractWord[], iso: string): TesseractWord | undefined {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) return undefined;

  const exact = words.find((word) => {
    const digits = word.text.replace(/\D/g, "");
    return digits.includes(day) && digits.includes(year) && digits.length >= 6;
  });
  if (exact) return exact;

  const MONTHS = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ];
  const monthName = MONTHS[Number.parseInt(month, 10) - 1];

  return words.find((word) => {
    const text = word.text.toUpperCase();
    return Boolean(monthName) && text.includes(monthName!) && text.includes(day);
  });
}
