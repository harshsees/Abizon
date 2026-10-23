"use client";

/**
 * THE ROUTE MAP — every destination in the catalogue, drawn as a route out of
 * India, under the bar that splits them by visa type.
 *
 * It is the homepage's answer to "what is this place for": not a picture of
 * travel, but the actual catalogue laid on the actual map, from where the
 * reader is standing. Hovering a visa type above lights its routes, so the
 * numbers in the bar point at real places.
 *
 * The coastlines come from `data/worldMap.ts` (Natural Earth 110m, baked at
 * authoring time). It is ~120KB of path data, so it is imported on mount
 * rather than at the top of the file: the stage already loads the same module
 * lazily, and this shares that chunk instead of putting it in the page bundle.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { countriesData, type Country } from "@/data/countries";
import { cn } from "@/lib/utils";

type WorldMap = typeof import("@/data/worldMap");

/** Where routes start when the dataset has no coordinate for India. */
const INDIA_FALLBACK: readonly [number, number] = [21, 78];

export function RouteMap({ highlight }: { highlight: Country["visaType"] | null }) {
  const [map, setMap] = useState<WorldMap | null>(null);
  const [drawn, setDrawn] = useState(false);
  const ref = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    import("@/data/worldMap").then((mod) => {
      if (!cancelled) setMap(mod);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Draw the routes once the map is on screen, not while it is below the fold.
  useEffect(() => {
    const el = ref.current;
    if (!el || !map) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -15% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [map]);

  const geometry = useMemo(() => {
    if (!map) return null;
    const [lat0, lng0] = map.COUNTRY_LATLNG.in ?? INDIA_FALLBACK;
    const x0 = map.projectX(lng0);
    const y0 = map.projectY(lat0);

    const seen = new Set<string>();
    const routes = countriesData
      .filter((c) => c.code !== "in" && map.COUNTRY_LATLNG[c.code] && !seen.has(c.code) && seen.add(c.code))
      .map((c) => {
        const [lat, lng] = map.COUNTRY_LATLNG[c.code];
        const x1 = map.projectX(lng);
        const y1 = map.projectY(lat);
        // A great-circle-ish bow: the control point sits off the midpoint,
        // always to the north, further for longer routes.
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.hypot(dx, dy);
        let nx = -dy / (len || 1);
        let ny = dx / (len || 1);
        if (ny > 0) {
          nx = -nx;
          ny = -ny;
        }
        const bow = Math.min(len * 0.28, 90);
        const cx = (x0 + x1) / 2 + nx * bow;
        const cy = (y0 + y1) / 2 + ny * bow;
        return {
          code: c.code,
          type: c.visaType,
          x1,
          y1,
          len,
          d: `M${x0.toFixed(1)} ${y0.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`,
        };
      })
      // Short routes first, so the drawing spreads outward from India.
      .sort((a, b) => a.len - b.len);

    return { x0, y0, routes, land: map.LAND_PATHS, width: map.MAP_WIDTH, height: map.MAP_HEIGHT };
  }, [map]);

  return (
    <div className="relative w-full" style={{ aspectRatio: "1000 / 394" }}>
      {geometry && (
        <svg
          ref={ref}
          viewBox={`0 0 ${geometry.width} ${geometry.height}`}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label={`Routes from India to ${geometry.routes.length} destinations`}
        >
          <g className="fill-ink/[0.07]">
            {geometry.land.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </g>

          <g fill="none" strokeLinecap="round">
            {geometry.routes.map((r, i) => {
              const on = highlight === r.type;
              const dim = highlight !== null && !on;
              return (
                <path
                  key={r.code}
                  d={r.d}
                  pathLength={1}
                  strokeDasharray="1"
                  strokeWidth={on ? 1.1 : 0.7}
                  className={cn(
                    "transition-[stroke,stroke-width,opacity] duration-300",
                    on ? "stroke-primary" : "stroke-ink",
                    dim ? "opacity-[0.08]" : on ? "opacity-90" : "opacity-[0.22]",
                  )}
                  style={{
                    strokeDashoffset: drawn || reduced ? 0 : 1,
                    transition: reduced
                      ? undefined
                      : `stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1) ${i * 9}ms, stroke 300ms, stroke-width 300ms, opacity 300ms`,
                  }}
                />
              );
            })}
          </g>

          <g>
            {geometry.routes.map((r, i) => {
              const on = highlight === r.type;
              return (
                <circle
                  key={r.code}
                  cx={r.x1}
                  cy={r.y1}
                  r={on ? 2.2 : 1.5}
                  className={cn(
                    "transition-[opacity,fill] duration-300",
                    on ? "fill-primary" : "fill-ink",
                    highlight !== null && !on ? "opacity-15" : on ? "opacity-100" : "opacity-40",
                  )}
                  style={{
                    opacity: drawn || reduced ? undefined : 0,
                    transitionDelay: drawn && !reduced ? `${i * 9 + 600}ms` : undefined,
                  }}
                />
              );
            })}
          </g>

          {/* India: where every route starts. */}
          <g>
            {!reduced && (
              <circle cx={geometry.x0} cy={geometry.y0} r={4} className="route-origin-ring fill-none stroke-primary" strokeWidth={1} />
            )}
            <circle cx={geometry.x0} cy={geometry.y0} r={3.6} className="fill-primary" />
            <circle cx={geometry.x0} cy={geometry.y0} r={1.4} className="fill-paper" />
            <text
              x={geometry.x0 + 8}
              y={geometry.y0 + 18}
              className="fill-ink font-sans text-[9px] font-medium uppercase tracking-[0.14em]"
            >
              You are here · India
            </text>
          </g>
        </svg>
      )}
    </div>
  );
}
