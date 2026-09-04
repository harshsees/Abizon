/**
 * GENERATES `src/data/worldMap.ts`.
 * ---------------------------------------------------------------------------
 * The map view needs two things that are data rather than code: the shape of
 * the world's landmasses, and where each destination sits on it. Both are
 * derived here, at authoring time, and written into a checked-in module.
 *
 * ── WHY IT IS BAKED RATHER THAN FETCHED ──
 *
 * `next.config.ts` sets a strict Content-Security-Policy with no tile host in
 * `img-src` and no map provider in `connect-src`. Reaching for Leaflet and
 * OpenStreetMap would mean widening both, taking a runtime dependency on a
 * third party's tile server for a decorative view, and shipping a ~150KB
 * library — for a map that never needs to show a street. Natural Earth's
 * 110m coastlines are enough to recognise every continent at the sizes this
 * renders at, they are 40KB once simplified, and they cannot fail to load.
 *
 * ── WHY THE DEPENDENCIES ARE dev-ONLY ──
 *
 * `world-atlas`, `topojson-client` and `world-countries` are imported by this
 * script and by nothing else. Their output is a checked-in `.ts` file, so
 * nothing they contain reaches the browser and `npm ci --omit=dev` still
 * builds. Re-run this after changing `src/data/countries.ts`:
 *
 *     node scripts/generate-world-map.mjs
 *
 * ── THE PROJECTION ──
 *
 * Equirectangular, and deliberately the simplest one there is: longitude maps
 * straight to x and latitude straight to y. It is reversible in two lines,
 * which is what lets the component convert a click back into a coordinate and
 * lets the marker layer be plain absolutely-positioned DOM over the SVG rather
 * than SVG itself — the markers are emoji, and emoji in SVG `<text>` render
 * inconsistently across platforms.
 *
 * ── THE FRAME ──
 *
 * 84°N to 58°S, which is not the full sphere and is the right frame for this
 * map. Below 58°S there is nothing but Antarctica: no destination, no
 * coastline anybody recognises, and a white band across the bottom that pushes
 * everything the map is actually about into the top two-thirds. Above 84°N is
 * the same argument with ice. Cutting both gives a 1000 x 394 canvas where the
 * inhabited world fills the frame, and every scale stays honest because the
 * degrees-per-unit is identical on both axes — which is what makes the
 * projection equirectangular rather than merely rectangular.
 */

import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const topology = require("world-atlas/countries-110m.json");
const { feature } = require("topojson-client");
const worldCountries = require("world-countries");

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

/* -------------------------------------------------------------------------- */
/* The projection                                                             */
/* -------------------------------------------------------------------------- */

/** The drawing surface. Width is the full 360° of longitude; height falls out
 *  of the latitude band at the same units-per-degree. See the header. */
const WIDTH = 1000;
const LAT_MAX = 84;
const LAT_MIN = -58;
const UNITS_PER_DEGREE = WIDTH / 360;
const HEIGHT = Math.round((LAT_MAX - LAT_MIN) * UNITS_PER_DEGREE);

const clampLat = (lat) => Math.max(LAT_MIN, Math.min(LAT_MAX, lat));
const projectX = (lng) => (lng + 180) * UNITS_PER_DEGREE;
const projectY = (lat) => (LAT_MAX - clampLat(lat)) * UNITS_PER_DEGREE;

/* -------------------------------------------------------------------------- */
/* Land geometry                                                              */
/* -------------------------------------------------------------------------- */

const countries = feature(topology, topology.objects.countries);

/**
 * Rings smaller than this in projected units are dropped.
 *
 * At the sizes this map renders — 1000 units across a viewport around 900px
 * wide — a ring under 0.6 square units is a speck well under a pixel. Keeping
 * them costs a third of the file for marks nobody can see. Every inhabited island
 * group large enough to matter survives it; the ones that do not are still
 * pinned, because the markers come from coordinates and not from this.
 */
const MIN_RING_AREA = 0.6;

/** One decimal of a projected unit is 0.036° of longitude — about 4km at the
 *  equator, and a tenth of a pixel at the widest this map is ever drawn. Two
 *  decimals doubles the file to resolve 400m nobody can see. */
const round = (n) => Math.round(n * 10) / 10;

/** The shoelace formula. Sign is irrelevant here; only magnitude is used. */
function ringArea(points) {
  let sum = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    sum += points[j][0] * points[i][1] - points[i][0] * points[j][1];
  }
  return Math.abs(sum) / 2;
}

function ringToPath(ring) {
  /**
   * ANTARCTICA AND THE ARCTIC ICE ARE DROPPED, not clipped.
   *
   * A ring lying entirely outside the latitude band would otherwise be
   * flattened onto the frame edge and drawn as a solid bar the full width of
   * the map.
   */
  const lats = ring.map(([, lat]) => lat);
  if (Math.max(...lats) < LAT_MIN || Math.min(...lats) > LAT_MAX) return null;

  const points = ring.map(([lng, lat]) => [
    round(projectX(lng)),
    round(projectY(lat)),
  ]);

  if (points.length < 4) return null;
  if (ringArea(points) < MIN_RING_AREA) return null;

  /**
   * SPLIT AT THE ANTIMERIDIAN.
   *
   * GeoJSON stores a ring that straddles 180° as longitudes that jump from
   * +179 to -179. Projected, that is one segment running the entire width of
   * the map — which is exactly what it drew: two horizontal bars across the
   * world, one at Chukotka's latitude and one at Fiji's, each stretching coast
   * to coast through open ocean.
   *
   * Any step wider than half the map is that wrap and nothing else — no real
   * coastline moves 180° between two vertices — so the ring is cut there and
   * continues as a new subpath. `fill` closes each subpath on its own, so the
   * two halves land against the left and right edges where they belong.
   *
   * Consecutive duplicates are dropped in the same pass: rounding collapses
   * neighbouring vertices in dense coastal detail onto the same point, and a
   * path full of zero-length segments is bytes that draw nothing.
   */
  const subpaths = [];
  let current = [];
  for (const point of points) {
    const last = current[current.length - 1];
    if (last && Math.abs(point[0] - last[0]) > WIDTH / 2) {
      subpaths.push(current);
      current = [point];
      continue;
    }
    if (last && last[0] === point[0] && last[1] === point[1]) continue;
    current.push(point);
  }
  subpaths.push(current);

  const drawn = subpaths
    .filter((sub) => sub.length >= 3)
    .map((sub) => `M${sub.map(([x, y]) => `${x} ${y}`).join("L")}Z`);

  return drawn.length ? drawn.join("") : null;
}

const paths = [];
for (const f of countries.features) {
  const { type, coordinates } = f.geometry;
  const polygons = type === "Polygon" ? [coordinates] : coordinates;
  for (const polygon of polygons) {
    // Outer ring only. Holes are lakes, and a lake drawn as a hole in a
    // single-colour landmass is indistinguishable from the sea around it.
    const path = ringToPath(polygon[0]);
    if (path) paths.push(path);
  }
}

/* -------------------------------------------------------------------------- */
/* Destination coordinates                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Where each destination's marker goes.
 *
 * `world-countries` carries a `latlng` per country — the centroid its own
 * dataset publishes. That is the honest anchor for "we serve this country":
 * a capital city would put France's marker on Paris and imply the service is
 * about the city, and a bounding-box centre puts several countries in the sea.
 */
const byCca2 = new Map(worldCountries.map((c) => [c.cca2.toLowerCase(), c]));

/** Read the ISO codes straight out of the app's own list, so this file can
 *  never describe a different set of destinations than the site sells. */
const source = await import(join(root, "src/data/countries.ts").replace(/\\/g, "/"))
  .catch(() => null);

let codes;
if (source?.countriesData) {
  codes = source.countriesData.map((c) => ({ code: c.code, name: c.name }));
} else {
  // `countries.ts` is TypeScript and Node cannot import it directly. Parse the
  // literal rows instead — they are one per line and machine-written.
  const { readFileSync } = await import("node:fs");
  const text = readFileSync(join(root, "src/data/countries.ts"), "utf8");
  codes = [...text.matchAll(/name:\s*"([^"]+)",\s*code:\s*"([a-z]{2})"/g)].map(
    (m) => ({ name: m[1], code: m[2] }),
  );
}

const coordinates = {};
const missing = [];
const seen = new Set();
for (const { code, name } of codes) {
  const match = byCca2.get(code);
  if (!match) {
    missing.push(`${name} (${code})`);
    continue;
  }
  seen.add(code);
  const [lat, lng] = match.latlng;
  // Two decimals here, not one: this is degrees, where a tenth is 11km and
  // enough to move a small country's marker off it.
  coordinates[code] = [Math.round(lat * 100) / 100, Math.round(lng * 100) / 100];
}

if (missing.length) {
  console.error("No coordinate for:", missing.join(", "));
  process.exitCode = 1;
}

/**
 * `countries.ts` lists some destinations twice — the same country under two
 * sets of visa terms (Morocco and Jordan, at the time of writing). One country
 * is one place on a map, so this keys by ISO code and the count below reports
 * both figures rather than quietly claiming to have placed every row.
 */
const duplicated = codes.length - seen.size;

/* -------------------------------------------------------------------------- */
/* Emit                                                                       */
/* -------------------------------------------------------------------------- */

const file = `/**
 * GENERATED — do not edit by hand.
 *
 * Written by \`scripts/generate-world-map.mjs\` from Natural Earth's 110m
 * country boundaries (via \`world-atlas\`) and the country centroids published
 * by \`world-countries\`. Re-run that script after changing
 * \`src/data/countries.ts\`; the reasoning behind every constant here is in its
 * header, including why this is baked rather than fetched from a tile server.
 *
 * Source data is public domain (Natural Earth) and MIT (world-countries).
 */

/** The projected drawing surface. Both are SVG user units, not pixels. */
export const MAP_WIDTH = ${WIDTH};
export const MAP_HEIGHT = ${HEIGHT};

/** The latitude band the canvas covers — see the script header on the frame. */
export const MAP_LAT_MAX = ${LAT_MAX};
export const MAP_LAT_MIN = ${LAT_MIN};

/** Units per degree. Identical on both axes, which is what makes this
 *  equirectangular rather than merely rectangular. */
const UNITS_PER_DEGREE = MAP_WIDTH / 360;

/** Longitude to x, in the same units as \`MAP_WIDTH\`. */
export function projectX(lng: number): number {
  return (lng + 180) * UNITS_PER_DEGREE;
}

/** Latitude to y, clamped to the band the canvas covers. */
export function projectY(lat: number): number {
  const clamped = Math.max(MAP_LAT_MIN, Math.min(MAP_LAT_MAX, lat));
  return (MAP_LAT_MAX - clamped) * UNITS_PER_DEGREE;
}

/** Every landmass outline, as an SVG path. ${paths.length} rings. */
export const LAND_PATHS: readonly string[] = ${JSON.stringify(paths, null, 0)};

/** ISO 3166-1 alpha-2 (lowercased, matching \`countries.ts\`) to [lat, lng]. */
export const COUNTRY_LATLNG: Readonly<Record<string, readonly [number, number]>> =
  ${JSON.stringify(coordinates, null, 2)};
`;

writeFileSync(join(root, "src/data/worldMap.ts"), file, "utf8");

console.log(
  `wrote src/data/worldMap.ts — ${paths.length} rings, ` +
    `${Object.keys(coordinates).length} countries placed from ` +
    `${codes.length} listings (${duplicated} duplicate ISO code` +
    `${duplicated === 1 ? "" : "s"}), ` +
    `${(file.length / 1024).toFixed(1)}KB`,
);
