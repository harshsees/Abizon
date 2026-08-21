/**
 * PUT THE OCR ENGINE ON OUR OWN ORIGIN.
 * ---------------------------------------------------------------------------
 * `tesseract.js` defaults to pulling its worker, its WebAssembly core and its
 * language data from a public CDN at runtime. Three reasons that is not an
 * option here:
 *
 *   - The CSP lists every host this site may reach, exhaustively and on
 *     purpose. Adding a CDN to `script-src` and `connect-src` to save a copy
 *     step trades a real property for a small convenience.
 *   - It puts a third party on the path of a passport scan. Nothing is sent to
 *     them — the OCR runs locally — but the fetch itself says, on every scan,
 *     that this browser is about to read a passport.
 *   - A CDN outage becomes our outage, in the one flow where the alternative
 *     for the applicant is typing nine fields by hand.
 *
 * So everything is served from `/tesseract`. The worker and the core come out
 * of `node_modules`, pinned by the lockfile, so they match the installed
 * version exactly rather than whatever the CDN is serving today. The language
 * data is not in the package and is fetched once, then cached — it is
 * gitignored rather than committed, because a 4MB binary in git is paid for on
 * every clone forever, and this is reproducible from a URL.
 *
 * Runs before `dev` and before `build`. Idempotent: it skips anything already
 * in place, so it costs nothing on a warm checkout.
 */

import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const OUT = join(process.cwd(), "public", "tesseract");

/**
 * The `fast` variant, not `best`. It is a quarter of the size and the accuracy
 * difference is on cursive and degraded print — the MRZ is OCR-B, a typeface
 * designed in 1968 to be read by machines, at a fixed size, with a restricted
 * alphabet and check digits behind it. `best` would cost megabytes to make an
 * already-verified read marginally more likely to pass first time.
 */
const TRAINEDDATA_URL =
  "https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0/eng.traineddata";

/**
 * Pinned to a tag rather than a branch, and verified. This file is executed as
 * a program by the OCR engine; fetching it from a moving reference and running
 * whatever comes back is not something to do quietly in a build step.
 */
const TRAINEDDATA_SHA256 =
  "7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2";

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function copyFromPackage(spec, name) {
  const target = join(OUT, name);
  if (await exists(target)) return `skipped ${name}`;

  await copyFile(require.resolve(spec), target);
  return `copied  ${name}`;
}

async function fetchTraineddata() {
  const target = join(OUT, "eng.traineddata");
  if (await exists(target)) {
    const digest = createHash("sha256")
      .update(await readFile(target))
      .digest("hex");

    if (digest === TRAINEDDATA_SHA256) return "skipped eng.traineddata";
    // A cached copy that does not match is either a truncated download or a
    // different file. Replacing it is safe; keeping it is not.
    console.warn("  cached eng.traineddata did not match its digest, refetching");
  }

  const response = await fetch(TRAINEDDATA_URL);
  if (!response.ok) {
    throw new Error(
      `Could not fetch the OCR language data (HTTP ${response.status}).\n` +
        `  ${TRAINEDDATA_URL}\n` +
        `  The passport scanner needs it. Everything else builds without it.`,
    );
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const digest = createHash("sha256").update(bytes).digest("hex");

  if (digest !== TRAINEDDATA_SHA256) {
    throw new Error(
      `The OCR language data did not match its expected digest.\n` +
        `  expected ${TRAINEDDATA_SHA256}\n` +
        `  received ${digest}\n` +
        `  Refusing to write a file the engine will execute.`,
    );
  }

  await writeFile(target, bytes);
  return `fetched eng.traineddata (${(bytes.length / 1048576).toFixed(1)} MB)`;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const results = [
    await copyFromPackage("tesseract.js/dist/worker.min.js", "worker.min.js"),
    // The SIMD LSTM build: LSTM is the only recognition engine tesseract.js
    // uses, and dropping the legacy one halves the download.
    await copyFromPackage(
      "tesseract.js-core/tesseract-core-simd-lstm.wasm.js",
      "tesseract-core-simd-lstm.wasm.js",
    ),
    await fetchTraineddata(),
  ];

  for (const line of results) console.log(`  ${line}`);
}

main().catch((error) => {
  console.error(`\n[tesseract] ${error.message}\n`);
  process.exit(1);
});

void dirname;
