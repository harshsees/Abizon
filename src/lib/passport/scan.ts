"use client";

/**
 * SCANNING A PASSPORT, IN THE BROWSER.
 * ---------------------------------------------------------------------------
 * Reads the machine-readable zone off a photograph and hands back verified
 * fields. `mrz.ts` owns the rules; this owns getting text out of an image.
 *
 * ── The image never leaves the device ──
 *
 * The OCR runs in a Worker on the applicant's own machine, against an engine
 * served from our origin. No passport photograph is uploaded to read it, and
 * no third party is on the path. That is the property that made client-side
 * OCR worth the megabytes over a hosted extraction API, and it is the thing to
 * preserve if this is ever replaced.
 *
 * ── Why the result is never simply "here are the fields" ──
 *
 * OCR is a guess. The MRZ's check digits turn that guess into something
 * verifiable, and this module refuses to present unverified values as facts:
 * a read whose digits do not agree comes back as `unverified`, with the failing
 * fields named, and the caller decides what to say. Autofilling a passport
 * number that failed its own checksum is worse than not autofilling at all —
 * the applicant proof-reads a form they believe was filled correctly.
 *
 * ── The seam ──
 *
 * `PassportScanner` is the whole contract. Swapping in Mindee, Klippa or
 * Regula later means one more implementation of this interface; the flow above
 * it does not change. That swap sends passport images to a processor, which is
 * a DPDP decision before it is a technical one.
 */

import {
  readMrzFromText,
  type MrzChecks,
  type MrzFields,
  type MrzFailure,
} from "./mrz";

export type ScanProgress =
  | { phase: "starting" }
  | { phase: "reading"; percent: number }
  | { phase: "verifying" };

export type ScanOutcome =
  /** Read, and every check digit agreed. Safe to fill in. */
  | { status: "verified"; fields: MrzFields }
  /**
   * Read, but at least one check digit disagreed, so at least one field is
   * wrong and we cannot tell which of the remaining ones to trust either.
   */
  | { status: "unverified"; fields: MrzFields; checks: MrzChecks; failed: string[] }
  /** Nothing usable came back. */
  | { status: "failed"; reason: MrzFailure | "engine-error" };

export interface PassportScanner {
  scan(image: Blob, onProgress?: (progress: ScanProgress) => void): Promise<ScanOutcome>;
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

type TesseractWorker = {
  recognize: (image: Blob) => Promise<{ data: { text: string } }>;
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

      await worker.setParameters({
        tessedit_char_whitelist: MRZ_ALPHABET,
        // The zone is two lines of uniform text. Telling the engine that stops
        // it trying to segment the passport's columns and headings, which is
        // where full-page layout analysis wastes its time and its accuracy.
        tessedit_pageseg_mode: "6",
      });

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

  async scan(
    image: Blob,
    onProgress?: (progress: ScanProgress) => void,
  ): Promise<ScanOutcome> {
    let text: string;

    try {
      const worker = await this.#ensureWorker(onProgress);
      const result = await worker.recognize(image);
      text = result.data.text;
    } catch {
      // Deliberately not logged with the error attached: the stack from an OCR
      // failure can carry image data, and this runs on a passport.
      return { status: "failed", reason: "engine-error" };
    }

    onProgress?.({ phase: "verifying" });

    const parsed = readMrzFromText(text);
    if (!parsed.ok) return { status: "failed", reason: parsed.reason };

    if (parsed.allChecksPassed) {
      return { status: "verified", fields: parsed.fields };
    }

    const failed = (Object.keys(parsed.checks) as Array<keyof MrzChecks>)
      .filter((key) => !parsed.checks[key])
      .map((key) => CHECK_LABELS[key]);

    return {
      status: "unverified",
      fields: parsed.fields,
      checks: parsed.checks,
      failed,
    };
  }

  async dispose(): Promise<void> {
    const worker = this.#worker;
    this.#worker = null;
    this.#starting = null;
    await worker?.terminate().catch(() => {});
  }
}
