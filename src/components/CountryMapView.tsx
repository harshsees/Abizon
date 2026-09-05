"use client";

/**
 * THE MAP VIEW — a real map now.
 * ---------------------------------------------------------------------------
 * WHAT THIS REPLACED, and why it had to go. The previous version drew seven
 * hand-written SVG blobs that were meant to be continents, dropped five
 * hardcoded pins on them at percentages someone had eyeballed, and printed
 * "Mock data for demonstrational completeness" underneath. Five of 154
 * destinations, on a world that was not the world. Its own header called it a
 * demonstration and flagged it for either real data or removal.
 *
 * It has real data. Every landmass below is Natural Earth's 110m coastline,
 * and every marker is a country this site actually sells a visa for, placed at
 * that country's published centroid. Nothing on the screen is invented and
 * there is no footnote saying so, because there is nothing left to disclose.
 *
 * ── "LIVE" MEANS IT IS OPERATED, NOT THAT IT STREAMS ──
 *
 * It pans, it zooms, it clusters what would overlap, it responds to the
 * filters above it, and every marker leads somewhere. That is the difference
 * from a picture of a map. What it deliberately is NOT is a tile map: see the
 * header of `scripts/generate-world-map.mjs` for why baking Natural Earth into
 * the bundle beats widening the CSP for a third-party tile server and shipping
 * Leaflet to draw streets nobody will look at.
 *
 * ── THE MARKERS ARE EMOJI, AND SPECIFICALLY THE PIN ──
 *
 * A round pushpin per destination, at the product owner's request. Flag emoji
 * were the obvious alternative and are the wrong choice: Windows renders a
 * regional-indicator pair as two boxed letters rather than a flag, so on the
 * platform this is being built on the map would read as 152 pairs of initials.
 * The flag still appears — as the image from `flagcdn.com` that this app
 * already uses everywhere else — in the card that opens when a pin is chosen,
 * where it is large enough to recognise and cannot fail silently.
 *
 * ── CLUSTERING IS NOT A NICETY HERE ──
 *
 * At world zoom, western Europe is about 60 SVG units across and holds 30-odd
 * destinations. Drawn individually they are a smear. Markers within one cell
 * of a zoom-dependent grid collapse into a count, pressing it zooms to it, and
 * the grid is computed in MAP space rather than screen space so that panning
 * cannot make clusters re-form under the cursor.
 *
 * ── ONE PIN PER COUNTRY, NOT PER LISTING ──
 *
 * `countries.ts` lists Morocco and Jordan twice, under two sets of visa terms
 * each. A country is one place, so it gets one pin; the card it opens names
 * every option that country has, and pressing one starts that application. 154
 * listings, 152 pins, and the number under the header says both rather than
 * quietly rounding one to the other.
 */

import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Country } from "@/data/countries";
import {
  COUNTRY_LATLNG,
  LAND_PATHS,
  MAP_HEIGHT,
  MAP_WIDTH,
  projectX,
  projectY,
} from "@/data/worldMap";
import { cn } from "@/lib/utils";

/** The destination pin. One character, and the whole reason see the header. */
const PIN = "\u{1F4CD}";

/** Zoom stops. 1 is the whole world; 8 puts a single country across the frame. */
const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const ZOOM_STEP = 1.6;

/**
 * The clustering grid, in screen pixels.
 *
 * 46px is a marker's own footprint plus a little air. Below that two pins
 * touch; above it, countries that are genuinely distinct at this zoom get
 * merged and the map stops rewarding zooming in.
 */
const CLUSTER_PX = 46;

type Placed = {
  code: string;
  /** Every listing for this country. Usually one; two for Morocco and Jordan. */
  listings: Country[];
  x: number;
  y: number;
};

type Cluster = {
  key: string;
  x: number;
  y: number;
  members: Placed[];
};

export type CountryMapViewProps = {
  /** The countries the filters above left standing. */
  countries: Country[];
  onSelectCountry: (country: Country) => void;
};

export function CountryMapView({ countries, onSelectCountry }: CountryMapViewProps) {
  /* ---------------------------------------------------------------------- */
  /* What is on the map                                                     */
  /* ---------------------------------------------------------------------- */

  /**
   * One entry per country, in the order the filtered list gave them.
   *
   * A country with no published centroid is dropped rather than placed at
   * 0°,0° — the Gulf of Guinea is where every unplaced marker in every broken
   * map in the world ends up, and a pin in the sea is worse than no pin.
   */
  const placed = useMemo<Placed[]>(() => {
    const byCode = new Map<string, Placed>();

    for (const country of countries) {
      const existing = byCode.get(country.code);
      if (existing) {
        existing.listings.push(country);
        continue;
      }

      const latlng = COUNTRY_LATLNG[country.code];
      if (!latlng) continue;

      byCode.set(country.code, {
        code: country.code,
        listings: [country],
        x: projectX(latlng[1]),
        y: projectY(latlng[0]),
      });
    }

    return [...byCode.values()];
  }, [countries]);

  /* ---------------------------------------------------------------------- */
  /* The viewport                                                           */
  /* ---------------------------------------------------------------------- */

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  /** Pan, in stage pixels, applied before the scale. */
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selected, setSelected] = useState<Placed | null>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  /**
   * Pan is clamped so the map can never be dragged off its own frame.
   *
   * At zoom 1 the only legal offset is 0, which is what makes the whole world
   * the resting state rather than something you can lose.
   */
  const clamp = useCallback(
    (next: { x: number; y: number }, atZoom: number) => {
      const minX = size.width - size.width * atZoom;
      const minY = size.height - size.height * atZoom;
      return {
        x: Math.min(0, Math.max(minX, next.x)),
        y: Math.min(0, Math.max(minY, next.y)),
      };
    },
    [size.height, size.width],
  );

  /**
   * Zoom about a fixed point on the stage.
   *
   * The point under the cursor — or under the centre, for the buttons — has to
   * stay under it, which is the difference between a map and a picture being
   * scaled. Solving for the new pan from `p = (screen - pan) / zoom` being
   * equal before and after gives the line below.
   */
  const zoomAbout = useCallback(
    (factor: number, focusX: number, focusY: number) => {
      setZoom((current) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current * factor));
        if (next === current) return current;
        setPan((currentPan) =>
          clamp(
            {
              x: focusX - ((focusX - currentPan.x) / current) * next,
              y: focusY - ((focusY - currentPan.y) / current) * next,
            },
            next,
          ),
        );
        return next;
      });
    },
    [clamp],
  );

  const zoomToCentre = (factor: number) =>
    zoomAbout(factor, size.width / 2, size.height / 2);

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelected(null);
  };

  /**
   * The wheel handler is attached by hand, and it has to be.
   *
   * React attaches `onWheel` passively, so `preventDefault` inside it is
   * ignored and the browser scrolls the page out from under the map while it
   * zooms. A native listener with `{ passive: false }` is the only way to hold
   * the page still.
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      // A trackpad reports single-digit deltas and a mouse wheel reports 100+.
      // Raising a constant to `-delta/300` gives both a proportionate step
      // instead of a mouse jumping four stops per notch.
      zoomAbout(
        Math.pow(1.0035, -event.deltaY),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    };

    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [zoomAbout]);

  /* ---------------------------------------------------------------------- */
  /* Dragging                                                               */
  /* ---------------------------------------------------------------------- */

  const drag = useRef<{ id: number; x: number; y: number; moved: boolean } | null>(
    null,
  );
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (zoom === 1) return;
    // Not on a marker: those are buttons, and dragging one should not pan.
    if ((event.target as HTMLElement).closest("[data-marker]")) return;
    drag.current = {
      id: event.pointerId,
      x: event.clientX - pan.x,
      y: event.clientY - pan.y,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    state.moved = true;
    setPan(clamp({ x: event.clientX - state.x, y: event.clientY - state.y }, zoom));
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
  };

  /* ---------------------------------------------------------------------- */
  /* Clustering                                                             */
  /* ---------------------------------------------------------------------- */

  /**
   * Grid clustering, in MAP units.
   *
   * The cell is `CLUSTER_PX` converted back through the current scale, so it
   * shrinks as the map is zoomed and clusters break apart on their own. Doing
   * it in map space rather than screen space is what makes the result
   * independent of pan: dragging must not re-shuffle which pins are grouped.
   */
  const clusters = useMemo<Cluster[]>(() => {
    if (!size.width) return [];

    const unitsPerPixel = MAP_WIDTH / (size.width * zoom);
    const cell = CLUSTER_PX * unitsPerPixel;
    const buckets = new Map<string, Placed[]>();

    for (const entry of placed) {
      const key = `${Math.floor(entry.x / cell)}:${Math.floor(entry.y / cell)}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(entry);
      else buckets.set(key, [entry]);
    }

    return [...buckets.entries()].map(([key, members]) => ({
      key,
      // The group's own centre of mass, so a cluster sits among its members
      // rather than at the corner of an invisible grid cell.
      x: members.reduce((sum, m) => sum + m.x, 0) / members.length,
      y: members.reduce((sum, m) => sum + m.y, 0) / members.length,
      members,
    }));
  }, [placed, size.width, zoom]);

  /** Pressing a cluster zooms far enough to break it up, centred on it. */
  const openCluster = (cluster: Cluster) => {
    const focusX = (cluster.x / MAP_WIDTH) * size.width * zoom + pan.x;
    const focusY = (cluster.y / MAP_HEIGHT) * size.height * zoom + pan.y;
    zoomAbout(ZOOM_STEP * 1.4, focusX, focusY);
  };

  const listingCount = countries.length;
  const pinCount = placed.length;

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  return (
    <motion.div
      key="map-view"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="relative flex w-full flex-1 flex-col overflow-hidden rounded-[40px] border border-slate-800/80 bg-slate-900 p-4 shadow-2xl sm:p-6 md:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-40 [background-size:24px_24px]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900/90 to-slate-900/60" />

      {/* ================================================================== */}
      {/* Header                                                             */}
      {/* ================================================================== */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
            <Sparkles className="h-3 w-3 fill-yellow-400/20 text-yellow-400" /> Live
            destination map
          </span>
          <h2 className="text-xl font-bold leading-tight text-white md:text-2xl">
            Everywhere abizon can take you
          </h2>
          <p className="mt-1 max-w-md text-xs text-slate-400">
            Drag to move, scroll or pinch to zoom. Every {PIN} is a destination
            we file for — press one to start that application.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-2.5 backdrop-blur-md">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-slate-300">
            {pinCount} {pinCount === 1 ? "country" : "countries"}
            {listingCount !== pinCount && (
              <span className="text-slate-500"> · {listingCount} visas</span>
            )}
          </span>
        </div>
      </div>

      {/* ================================================================== */}
      {/* The map                                                            */}
      {/* ================================================================== */}
      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          /* The projection's own aspect, taken from the generated constants so
             the stage cannot drift out of step with the geometry drawn in it.
             `max-height` caps it on a wide desktop, where 1:0.39 of 1700px is
             a map taller than the window; the SVG stretches to whatever box it
             gets and the markers are positioned as percentages of the same
             box, so the two can never disagree — a squeezed map is squeezed
             identically under its pins. */
          aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}`,
          maxHeight: "min(60vh, 620px)",
        }}
        className={cn(
          "relative z-10 mt-5 w-full flex-1 touch-none select-none overflow-hidden rounded-3xl",
          "border border-slate-800/70 bg-slate-950/60",
          "min-h-[260px]",
          zoom > 1 && (dragging ? "cursor-grabbing" : "cursor-grab"),
        )}
      >
        <div
          className="absolute inset-0 origin-top-left"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            // No transition while a finger is down — the pan IS the pointer,
            // and easing it puts the map behind the hand moving it.
            transition: dragging ? "none" : "transform 260ms var(--ease-out)",
          }}
        >
          {/* THE WORLD. `preserveAspectRatio="none"` is correct and not a
              shortcut: the stage is locked to the projection's own 2:1, so
              there is no distortion to preserve against, and letting the SVG
              letterbox itself would leave the markers — which are positioned
              in percentages of the stage — sitting off the coastlines. */}
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            aria-hidden
          >
            <g
              fill="rgb(51 65 85)"
              stroke="rgb(100 116 139)"
              // Counter-scaled, so coastlines stay hairlines at every zoom
              // instead of thickening into a cartoon outline.
              strokeWidth={0.35 / zoom}
              vectorEffect="non-scaling-stroke"
            >
              {LAND_PATHS.map((path, index) => (
                <path key={index} d={path} />
              ))}
            </g>
          </svg>

          {/* THE MARKERS, in DOM rather than SVG. Emoji inside `<text>` render
              at different sizes and baselines across platforms and cannot take
              a shadow reliably; a positioned button can do both and is
              focusable without extra work. */}
          {clusters.map((cluster) =>
            cluster.members.length === 1 ? (
              <Pin
                key={cluster.members[0].code}
                entry={cluster.members[0]}
                zoom={zoom}
                active={selected?.code === cluster.members[0].code}
                onSelect={() => setSelected(cluster.members[0])}
              />
            ) : (
              <ClusterDot
                key={cluster.key}
                cluster={cluster}
                zoom={zoom}
                onOpen={() => openCluster(cluster)}
              />
            ),
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Controls                                                         */}
        {/* ---------------------------------------------------------------- */}
        {/* Top-right, not bottom-right. At the foot of the frame they sat over
            New Zealand and the south Pacific, which is where several
            destinations are; the top-right corner of an equirectangular world
            is empty north Pacific at every zoom this map allows. */}
        <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5">
          <MapButton
            label="Zoom in"
            onClick={() => zoomToCentre(ZOOM_STEP)}
            disabled={zoom >= MAX_ZOOM}
          >
            <Plus className="size-4" />
          </MapButton>
          <MapButton
            label="Zoom out"
            onClick={() => zoomToCentre(1 / ZOOM_STEP)}
            disabled={zoom <= MIN_ZOOM}
          >
            <Minus className="size-4" />
          </MapButton>
          <MapButton
            label="Reset the view"
            onClick={reset}
            disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
          >
            <RotateCcw className="size-4" />
          </MapButton>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* The selected destination                                         */}
        {/* ---------------------------------------------------------------- */}
        <AnimatePresence>
          {selected && (
            <DestinationCard
              entry={selected}
              onClose={() => setSelected(null)}
              onSelectCountry={onSelectCountry}
            />
          )}
        </AnimatePresence>
      </div>

      {/* WHY THERE IS NO HIDDEN DUPLICATE LIST HERE.
          One was written and taken out again. A `sr-only` list of 152 buttons
          is still in the tab order, so a sighted keyboard user tabbing through
          this view walked through 152 stops they could not see — a focus
          indicator with nothing under it, which fails 2.4.7 more thoroughly
          than the problem it was solving.
          The markers themselves are ordinary focusable buttons with labels
          instead, and the List view one press away is the plain document
          version of the same 154 visas. */}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * One destination.
 *
 * COUNTER-SCALED. The layer it sits in is scaled by `zoom`, so without
 * `scale(1 / zoom)` a pin at zoom 8 would be eight times the size of a pin at
 * zoom 1 — the marker would zoom with the terrain, which is the one thing a
 * marker must not do.
 */
function Pin({
  entry,
  zoom,
  active,
  onSelect,
}: {
  entry: Placed;
  zoom: number;
  active: boolean;
  onSelect: () => void;
}) {
  const name = entry.listings[0].name;

  return (
    <button
      type="button"
      data-marker
      aria-label={`${name} — ${entry.listings.length === 1 ? entry.listings[0].visaType : `${entry.listings.length} visa options`}`}
      onClick={onSelect}
      style={{
        left: `${(entry.x / MAP_WIDTH) * 100}%`,
        top: `${(entry.y / MAP_HEIGHT) * 100}%`,
        transform: `translate(-50%, -100%) scale(${1 / zoom})`,
        transformOrigin: "bottom center",
      }}
      className="group absolute z-10 cursor-pointer rounded-md focus-visible:z-20"
    >
      {/* The pin's own shadow on the map, so it reads as standing on the
          surface rather than floating over it. */}
      <span
        className={cn(
          "block text-[22px] leading-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.55)]",
          "transition-transform duration-150 group-hover:-translate-y-1 group-focus-visible:-translate-y-1",
          active && "-translate-y-1",
        )}
      >
        {PIN}
      </span>

      {/* The name, on hover and while selected. `whitespace-nowrap` and a
          centred absolute box: a label that wraps at a country's width would
          be two words stacked over a 20px pin. */}
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap",
          "rounded-md border border-slate-700 bg-slate-950/95 px-2 py-0.5",
          "text-[10px] font-bold text-white shadow-xl",
          "opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100",
          active && "opacity-100",
        )}
      >
        {name}
      </span>
    </button>
  );
}

/** Several destinations too close together to draw apart at this zoom. */
function ClusterDot({
  cluster,
  zoom,
  onOpen,
}: {
  cluster: Cluster;
  zoom: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      data-marker
      aria-label={`${cluster.members.length} destinations here — zoom in to separate them`}
      onClick={onOpen}
      style={{
        left: `${(cluster.x / MAP_WIDTH) * 100}%`,
        top: `${(cluster.y / MAP_HEIGHT) * 100}%`,
        transform: `translate(-50%, -50%) scale(${1 / zoom})`,
      }}
      className="absolute z-10 flex cursor-pointer items-center justify-center"
    >
      <span className="relative flex size-8 items-center justify-center rounded-full border-2 border-white/90 bg-emerald-500 text-[11px] font-extrabold text-white shadow-lg transition-transform duration-150 hover:scale-110">
        {/* The ping is what makes a static count read as something you can
            press. One ring, behind the badge, so the number stays legible. */}
        <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-emerald-500/60 motion-reduce:animate-none" />
        {cluster.members.length}
      </span>
    </button>
  );
}

/**
 * What a chosen pin opens.
 *
 * Every visa that country has, not just the first — which is the whole reason
 * a country with two listings gets one pin rather than two pins on top of each
 * other. Each row is the button that starts that application.
 */
function DestinationCard({
  entry,
  onClose,
  onSelectCountry,
}: {
  entry: Placed;
  onClose: () => void;
  onSelectCountry: (country: Country) => void;
}) {
  const name = entry.listings[0].name;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-4 left-4 z-30 w-[260px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/95 shadow-2xl backdrop-blur-md"
    >
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        {/* Plain `img`: `flagcdn.com` is already in `img-src` and is already
            how every other flag in this app is drawn. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://flagcdn.com/w80/${entry.code}.png`}
          alt=""
          width={28}
          height={21}
          loading="lazy"
          className="h-[21px] w-7 flex-shrink-0 rounded-sm object-cover ring-1 ring-white/10"
        />
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">{name}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${name}`}
          className="-mr-1 cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <ul className="divide-y divide-slate-800">
        {entry.listings.map((country) => (
          <li key={country.id}>
            <button
              type="button"
              onClick={() => onSelectCountry(country)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-900"
            >
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-white">
                  {country.visaType}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  {country.validity} · {country.deliveryDays}-day processing
                </span>
              </span>
              <span
                data-numeric
                className="flex-shrink-0 text-sm font-bold text-emerald-400"
              >
                {country.fees}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function MapButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-9 cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-slate-950/85 text-slate-200 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-800 hover:text-white disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
    </button>
  );
}
