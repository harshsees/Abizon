/**
 * COUNTRY PHOTO SOURCING — regenerates `src/lib/countryPhotoManifest.ts`.
 *
 *   node scripts/country-photos/source.mjs
 *
 * Nothing in the app runs this. It is a build-time tool, run by hand when a
 * destination's photograph needs changing, and its whole output is one
 * generated TypeScript file. It talks to the network; the app never does.
 *
 * ── WHY IT WORKS THIS WAY ────────────────────────────────────────────────
 *
 * The dataset used to carry an Unsplash id per country, chosen by search. Of
 * the 26 that still loaded, seven showed a different country — Bangkok filed
 * under France, Mount Fuji under Nepal, the Pyramids of Giza under Morocco.
 * Searching stock for "France" and trusting the result is the failure, and no
 * amount of checking the URL afterwards catches it, because the URL is not the
 * thing that is wrong.
 *
 * So this inverts the order. `landmarks.json` names a LANDMARK per destination
 * — Wat Arun, the Matterhorn, Angkor Wat — and the script takes the lead
 * photograph of that landmark's own encyclopedia article. The subject is
 * established before the image is chosen, so "is this really France?" is
 * answered by the article's title rather than by looking at the pixels.
 *
 * ── THE FOUR STAGES ──────────────────────────────────────────────────────
 *
 *   1  page images   one batched query for every landmark's lead photograph
 *   2  filtering     reject anything that is not a usable photograph
 *   3  licences      one query per file for author and licence
 *   4  probing       request every derived URL before writing it down
 *
 * Stage 2 is the one that earns its keep. Wikipedia's "page image" for a
 * geography article is very often not a photograph at all: Victoria Harbour's
 * was a 1957 British War Office map, Cuba's a street map of Habana Vieja,
 * Samoa's a country outline. Others are city collages, or frames shot from the
 * ISS. All are rejected by name, and the rejection list is deliberately
 * aggressive — a false negative costs one hand-picked replacement in
 * `landmarks.json`, a false positive ships a map as a destination photograph.
 *
 * ── TWO WIKIMEDIA RULES THAT ARE EASY TO GET WRONG ───────────────────────
 *
 * WIDTHS ARE NOT FREE-FORM. Hotlinked thumbnails are rejected at any width
 * outside a published standard set, and upscales past the original are rejected
 * too. `STANDARD_WIDTHS` is that set; the ladder written into the manifest is
 * its intersection with each file's real size, measured per file. A width that
 * looks reasonable but is not on the list returns 400, not a resized image.
 *
 * THE API DECORATES ITS URLS. `original.source` comes back with `?utm_source=…`
 * appended. Harmless on the original, fatal to the thumbnail derivation, which
 * splices a width segment in after the filename — so the query is stripped
 * before anything is built from it.
 *
 * ── RATE LIMITING ────────────────────────────────────────────────────────
 *
 * Both hosts throttle hard. Every request carries a descriptive User-Agent,
 * batches are paced, and 429s back off and retry rather than being recorded as
 * evidence about an image. The probe stage is deliberately serial: ten parallel
 * HEADs to upload.wikimedia.org come back 429 and look exactly like ten dead
 * images.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, "..", "..", "src", "lib", "countryPhotoManifest.ts");

const API = "https://en.wikipedia.org/w/api.php";
/** Wikimedia asks automated clients to identify themselves and say why. */
const UA =
  "AbizonCountryPhotos/1.0 (https://abizon.com; build-time asset sourcing) node-fetch";

/** The only thumbnail widths upload.wikimedia.org will serve to a hotlink. */
const STANDARD_WIDTHS = [500, 960, 1280, 1920];

/** Below this a file is a thumbnail of something better; the card alone wants ~640px. */
const MIN_SOURCE_WIDTH = 900;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const chunk = (arr, n) =>
  arr.reduce((acc, v, i) => (i % n ? acc[acc.length - 1].push(v) : acc.push([v]), acc), []);

async function api(params, { optional = false } = {}) {
  const url = `${API}?${new URLSearchParams({ ...params, format: "json", formatversion: "2" })}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    // A 4xx that is not a 429 is a real answer about the query. Anything else
    // is the service asking us to slow down.
    if (res.status !== 429 && res.status < 500) throw new Error(`${res.status} ${url}`);
    await sleep(2000 * (attempt + 1));
  }
  if (optional) return null;
  throw new Error(`gave up on ${url}`);
}

/**
 * `commons/1/1a/Foo.jpg` -> `commons/thumb/1/1a/Foo.jpg/960px-Foo.jpg`.
 * The hash directories are part of the address, not derivable from the name.
 */
function thumbUrl(ref, width) {
  const slash = ref.lastIndexOf("/");
  const dir = ref.slice(0, slash);
  const name = ref.slice(slash + 1);
  const project = dir.slice(0, dir.indexOf("/"));
  const hashes = dir.slice(dir.indexOf("/") + 1);
  return `https://upload.wikimedia.org/wikipedia/${project}/thumb/${hashes}/${name}/${width}px-${name}`;
}

const strip = (v) => (v?.value ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

/* -------------------------------------------------------------------------- */

const landmarks = JSON.parse(
  fs.readFileSync(path.join(DIR, "landmarks.json"), "utf8"),
);
const slugs = Object.keys(landmarks);
const titles = [...new Set(slugs.map((s) => landmarks[s][0]))];

/* --- 1. page images ------------------------------------------------------ */

const byTitle = {};
for (const group of chunk(titles, 20)) {
  const data = await api({
    action: "query",
    prop: "pageimages",
    piprop: "original|name",
    titles: group.join("|"),
    redirects: "1",
  });

  // Map the resolved title back to the one we asked for, through both
  // normalisation ("foo bar" -> "Foo bar") and redirects.
  const back = {};
  for (const n of data.query?.normalized ?? []) back[n.to] = n.from;
  for (const r of data.query?.redirects ?? []) back[r.to] = back[r.from] ?? r.from;

  for (const page of data.query?.pages ?? []) {
    byTitle[back[page.title] ?? page.title] = {
      resolved: page.title,
      file: page.pageimage,
      original: page.original?.source?.split("?")[0],
      width: page.original?.width,
      height: page.original?.height,
    };
  }
  process.stderr.write(".");
  await sleep(700);
}

/* --- 2. filtering -------------------------------------------------------- */

/** Things Wikipedia calls a page image that are not a photograph of a place. */
const NOT_A_PHOTOGRAPH =
  /\b(map|flag|coat of arms|locator|seal|emblem|logo|orthographic|diagram|chart|collage|montage|banner|from orbit|seen from space|NASA|ISS[0-9]|STS[0-9])\b/i;

const rows = [];
const failures = [];

for (const slug of slugs) {
  const [title, subject] = landmarks[slug];
  const hit = byTitle[title];
  const fail = (why) => failures.push({ slug, title, why });

  if (!hit?.original || !hit.file) {
    fail("no page image");
    continue;
  }
  // Underscores are word characters, so `\bmap\b` never matches
  // `1957_map_of_Victoria_Harbour.jpg`. Normalise separators first.
  if (NOT_A_PHOTOGRAPH.test(hit.file.replace(/[_-]+/g, " "))) {
    fail(`not a photograph: ${hit.file}`);
    continue;
  }
  if (/\.(gif|svg|tif|tiff)$/i.test(hit.file)) {
    fail(`not a still photograph: ${hit.file}`);
    continue;
  }
  if (hit.width && hit.width < MIN_SOURCE_WIDTH) {
    fail(`too small: ${hit.width}x${hit.height}`);
    continue;
  }

  const widths = STANDARD_WIDTHS.filter((w) => !hit.width || w <= hit.width);
  if (!widths.length) {
    fail(`no standard width fits ${hit.width}`);
    continue;
  }

  rows.push({
    slug,
    subject,
    title: hit.resolved,
    file: hit.file,
    ref: hit.original.replace(/^https:\/\/upload\.wikimedia\.org\/wikipedia\//, ""),
    aspect: hit.width / hit.height,
    widths,
  });
}

/* --- 3. licences --------------------------------------------------------- */
/* One file per request. Batching is faster but a throttled batch loses licence
   data for eight images at once, and an unattributed CC BY file is a licence
   breach rather than a cosmetic gap. */

for (const row of rows) {
  const data = await api(
    {
      action: "query",
      prop: "imageinfo",
      iiprop: "extmetadata",
      titles: `File:${row.file}`,
    },
    { optional: true },
  );
  const em = data?.query?.pages?.[0]?.imageinfo?.[0]?.extmetadata ?? {};
  row.license =
    strip(em.LicenseShortName) ||
    strip(em.License) ||
    "See the Wikimedia Commons file page";
  row.credit = strip(em.Artist).slice(0, 90);
  process.stderr.write(row.credit || row.license !== "See the Wikimedia Commons file page" ? "." : "?");
  await sleep(350);
}
process.stderr.write("\n");

/* --- 4. probing ---------------------------------------------------------- */

async function probe(url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA } });
    if (res.ok) return 200;
    if (res.status !== 429) return res.status;
    await sleep(1500 * (attempt + 1));
  }
  return 429;
}

const verified = [];
for (const row of rows) {
  let settled = false;
  // Walk the ladder down: a 400 means that width was refused, so try smaller.
  for (let i = row.widths.length - 1; i >= 0 && !settled; i--) {
    const status = await probe(thumbUrl(row.ref, row.widths[i]));
    if (status === 200) {
      row.widths = row.widths.slice(0, i + 1);
      verified.push(row);
      settled = true;
    } else if (status !== 400) {
      failures.push({ slug: row.slug, title: row.title, why: `probe ${status}` });
      settled = true;
    }
  }
  if (!settled) failures.push({ slug: row.slug, title: row.title, why: "no width accepted" });
  process.stderr.write(".");
  await sleep(120);
}
process.stderr.write("\n");

/* --- write --------------------------------------------------------------- */

if (failures.length) {
  console.error(`\n${failures.length} destination(s) could not be sourced:`);
  for (const f of failures) console.error(`  ${f.slug} (${f.title}) — ${f.why}`);
  console.error(
    "\nPick a different landmark for each in landmarks.json and run again.\n" +
      "The manifest was NOT written: a partial manifest would silently drop\n" +
      "those destinations back to the fallback plate.",
  );
  process.exit(1);
}

const q = (s) => JSON.stringify(String(s ?? ""));
const key = (s) => (/^[a-z][a-z0-9]*$/.test(s) ? s : q(s));

const body = verified
  .map(
    (r) => `  ${key(r.slug)}: {
    origin: "wikimedia",
    ref: ${q(r.ref)},
    widths: [${r.widths.join(", ")}],
    aspect: ${r.aspect.toFixed(3)},
    subject: ${q(r.subject)},
    verdict: "depicts-country",
    license: ${q(r.license)},
    credit: ${q(r.credit)},
    source: ${q("https://en.wikipedia.org/wiki/" + encodeURIComponent(r.title.replace(/ /g, "_")))},
    reviewedOn: REVIEWED,
  },`,
  )
  .join("\n");

const header = fs
  .readFileSync(path.join(DIR, "manifest-header.txt"), "utf8")
  .replace(/const REVIEWED = "[^"]*";/, `const REVIEWED = "${new Date().toISOString().slice(0, 10)}";`);

fs.writeFileSync(OUT, `${header}${body}\n};\n`);
console.log(`wrote ${verified.length} destinations to ${path.relative(process.cwd(), OUT)}`);
