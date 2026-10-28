"use client";

/**
 * THE DESTINATION STAGE — the hero of country discovery.
 *
 * Two references merged into one scene: Mirror Hall's ring of glowing cards
 * on still water in the middle, Ascend's planet rising out of the bottom of the
 * frame beneath it. They are synchronised: whichever card stands at the front
 * of the hall, the planet turns to that country and a pin drops onto it.
 *
 * The canvas is pointer-driven (drag, flick, sideways wheel, click a card);
 * everything a keyboard or screen reader needs is real DOM around it — the
 * previous/next buttons, the arrow keys on the region, a link to the visa page,
 * and a polite live region that names the destination as it changes.
 *
 * It follows the page's search and filters: it is handed the same filtered
 * list as the grid below it.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

import { getCountrySlug, type Country } from "@/data/countries";
import { formatGovernmentFee } from "@/lib/countryVisa";
import { cn } from "@/lib/utils";

import { detectLowPower } from "./lowPower";
import type { StageEngine } from "./stageEngine";

type StageModule = typeof import("./stageClient");

export function CountryStage({ countries }: { countries: Country[] }) {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StageEngine | null>(null);
  const moduleRef = useRef<StageModule | null>(null);
  const countriesRef = useRef(countries);
  // Held in a ref so a new router identity never tears the engine down: the
  // canvas outlives the effect, and a second engine on it would draw nothing.
  const routerRef = useRef(router);
  const activeRef = useRef(0);
  /** Starts the engine; idempotent. Set once the device has been checked. */
  const startRef = useRef<(() => void) | null>(null);

  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // The first destination is the page's largest text, so it is painted at once
  // rather than faded in: an entrance animation on it would hold back LCP.
  // Only a change of destination animates the name.
  const [titleMoved, setTitleMoved] = useState(false);
  // No usable GPU: the scene waits for the visitor, over a drawn sky.
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    countriesRef.current = countries;
    routerRef.current = router;
    activeRef.current = active;
  }, [countries, router, active]);

  /* Mount the engine once. */
  useEffect(() => {
    let cancelled = false;
    let engine: StageEngine | null = null;
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) return;

    let ro: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    let onScroll: (() => void) | null = null;
    let onVisibility: (() => void) | null = null;

    let firstActive = true;

    // three.js and the engine are the heaviest script on the page; let the
    // page's own text paint and hydrate before they are fetched and compiled.
    const idle = new Promise<void>((resolve) => {
      if ("requestIdleCallback" in window) window.requestIdleCallback(() => resolve(), { timeout: 1500 });
      else setTimeout(resolve, 200);
    });

    let started = false;
    let low: boolean | null = null;
    const isLow = () => (low ??= detectLowPower());

    const start = () => {
      if (started || cancelled) return;
      started = true;
      import("./stageClient")
        .then((mod) => {
          if (cancelled) return;
          moduleRef.current = mod;
          try {
            engine = new mod.StageEngine(
              canvas,
              {
                onActiveChange: (i) => {
                  setActive(Math.max(0, i));
                  if (!firstActive) setTitleMoved(true);
                  firstActive = false;
                },
                onOpen: (i) => {
                  const c = countriesRef.current[i];
                  if (c) routerRef.current.push(`/visa/${getCountrySlug(c.name)}`);
                },
              },
              mod.markerPoints(),
              isLow(),
            );
          } catch {
            setFailed(true);
            return;
          }
          engineRef.current = engine;
          const rect = canvas.getBoundingClientRect();
          engine.resize(rect.width, rect.height);
          engine.setCards(mod.toStageCountries(countriesRef.current));
          // Arrows pressed before the engine existed moved the title already.
          if (activeRef.current > 0) engine.jumpTo(activeRef.current);

          ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            engine?.resize(width, height);
          });
          ro.observe(canvas);

          let inView = true;
          const sync = () => engine?.setRunning(inView && !document.hidden);
          io = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            sync();
          });
          io.observe(section);
          onVisibility = sync;
          document.addEventListener("visibilitychange", onVisibility);

          onScroll = () => {
            const r = section.getBoundingClientRect();
            engine?.setScroll(-r.top / Math.max(1, r.height));
          };
          window.addEventListener("scroll", onScroll, { passive: true });
          onScroll();

          sync();
          setReady(true);
        })
        .catch(() => setFailed(true));
    };
    startRef.current = start;

    // On a CPU rasteriser the engine's start alone is seconds of frozen page;
    // there it waits for the visitor to reach for the hall (see the handlers
    // on the section). Everywhere else it starts as soon as the page is idle.
    idle.then(() => {
      if (cancelled) return;
      if (isLow()) setLowPower(true);
      else start();
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
      io?.disconnect();
      if (onScroll) window.removeEventListener("scroll", onScroll);
      if (onVisibility) document.removeEventListener("visibilitychange", onVisibility);
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  /* Follow the page's filters. */
  useEffect(() => {
    const mod = moduleRef.current;
    const engine = engineRef.current;
    if (!mod || !engine) return;
    engine.setCards(mod.toStageCountries(countries));
  }, [countries, ready]);

  // Without the drawn sky to fall back on, a failed scene leaves nothing worth showing.
  if (failed && !lowPower) return null;

  const count = countries.length;
  const current = count ? countries[Math.min(active, count - 1)] : undefined;
  const slug = current ? getCountrySlug(current.name) : "";
  const pad = (n: number) => String(n).padStart(2, "0");

  const wake = () => startRef.current?.();

  /** Through the hall when it is running; before then, the title moves alone. */
  const stepBy = (delta: number) => {
    const engine = engineRef.current;
    if (engine) return engine.step(delta);
    if (!count) return;
    // The same rule as the hall: a long list wraps, a short one stops at its ends.
    const wraps = count >= 13;
    setActive((a) => (wraps ? (a + delta + count) % count : Math.min(Math.max(a + delta, 0), count - 1)));
    setTitleMoved(true);
    wake();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      stepBy(-1);
    }
  };

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Destinations"
      onKeyDown={onKeyDown}
      onPointerEnter={wake}
      onPointerDown={wake}
      onFocus={wake}
      onWheel={wake}
      className="relative isolate w-full overflow-hidden bg-paper"
      style={{ height: "clamp(640px, 100svh, 1080px)" }}
    >
      {lowPower && <DrawnSky />}
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          "absolute inset-0 h-full w-full cursor-grab touch-pan-y select-none outline-none",
          "transition-opacity duration-700",
          ready ? "opacity-100" : "opacity-0",
        )}
      />

      {/* The planet sinks into the page: the stage's lower edge dissolves into
          the same paper everything below it is set on, so the page reads as
          one continuous background rather than a hero and a page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[12%] bg-gradient-to-b from-transparent to-paper"
      />

      {/* Title, set below the floating nav. */}
      <div className="pointer-events-none absolute inset-x-0 top-[10%] flex flex-col items-center px-6 text-center md:top-[8.5%]">
        <h1 className="font-serif text-[36px] font-light leading-none tracking-[-0.02em] text-ink md:text-[54px]">
          Where to next?
        </h1>
      </div>

      {/* The active destination, over the planet. */}
      {current ? (
        <div className="absolute inset-x-0 top-[77%] flex flex-col items-center px-4 text-center md:top-[76.5%]">
          {/* A small, soft wash of paper close behind the type, so ink holds
              against a sunlit planet without veiling the rest of it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[150%] w-[min(560px,105%)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgb(249_248_245/0.8),rgb(249_248_245/0.45)_55%,transparent)]"
          />
          <p className="font-mono text-[11px] font-medium tracking-[0.2em] text-ink [text-shadow:0_0_14px_rgb(249_248_245),0_0_3px_rgb(249_248_245)]">
            <span className="text-primary">{pad(active + 1)}</span> / {pad(count)}
          </p>

          <div className="mt-1.5 flex items-center gap-3 md:gap-5">
            <button
              type="button"
              onClick={() => stepBy(-1)}
              aria-label="Previous destination"
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-ink/15 bg-paper-raised/70 text-ink-muted backdrop-blur-md transition-colors hover:border-ink/40 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <h2
              key={current.code}
              className={cn(
                titleMoved && "animate-stage-title",
                "min-w-0 max-w-[60vw] truncate text-[24px] font-light uppercase tracking-[0.14em] text-ink md:max-w-none md:text-[34px] [text-shadow:0_0_14px_rgb(249_248_245),0_0_3px_rgb(249_248_245)]",
              )}
            >
              {current.name}
            </h2>
            <button
              type="button"
              onClick={() => stepBy(1)}
              aria-label="Next destination"
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-ink/15 bg-paper-raised/70 text-ink-muted backdrop-blur-md transition-colors hover:border-ink/40 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink [text-shadow:0_0_14px_rgb(249_248_245),0_0_3px_rgb(249_248_245)]">
            <span>{current.visaType}</span>
            <span aria-hidden className="h-1 w-1 rounded-full bg-ink/25" />
            <span>{current.validity}</span>
            <span aria-hidden className="h-1 w-1 rounded-full bg-ink/25" />
            <span>{formatGovernmentFee(current.fees)}</span>
            <Link
              href={`/visa/${slug}`}
              className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[11px] font-semibold normal-case tracking-normal text-paper shadow-[0_8px_20px_-8px_rgba(22,23,27,0.45)] transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              View {current.name} visa
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>

          <Progress index={active} count={count} />
        </div>
      ) : (
        <div className="absolute inset-x-0 top-[78%] text-center text-sm text-ink-muted">
          No destinations match these filters.
        </div>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {current ? `${current.name}, ${active + 1} of ${count}` : "No destinations"}
      </p>
    </section>
  );
}

/**
 * The stage before its scene, on a device without a GPU: the daylight sky and
 * the planet's horizon, drawn in CSS so it costs nothing to paint. The planet
 * sits where the engine puts it — limb at 70% (69% from md), as wide as
 * `StageEngine.resize` makes it — so the scene lands on top of it in place.
 */
function DrawnSky() {
  const planet: React.CSSProperties = {
    background:
      "radial-gradient(circle at 40% 6%, #8db5de 0%, #4f83bb 10%, #2f629a 26%, #1f4675 48%, #16365c 100%)",
    boxShadow: "0 0 0 1.5px rgb(170 204 248 / 0.55), 0 -6px 48px 6px rgb(160 196 245 / 0.5)",
  };
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          "radial-gradient(55% 45% at 18% 4%, rgb(255 249 238 / 0.8), transparent 70%), linear-gradient(to top, #f9f8f5 0%, #f2f4f8 50%, #e2ecf9 100%)",
      }}
    >
      <div
        className="absolute left-1/2 top-[70%] aspect-square w-[210vw] -translate-x-1/2 rounded-full md:hidden"
        style={planet}
      />
      <div
        className="absolute left-1/2 top-[69%] hidden aspect-square -translate-x-1/2 rounded-full md:block"
        style={{ ...planet, width: "max(120vw, calc(1.9 * clamp(640px, 100svh, 1080px)))" }}
      />
    </div>
  );
}

/** Dots for a short hall, as Mirror Hall has; a scrubbed track for a long one. */
function Progress({ index, count }: { index: number; count: number }) {
  if (count <= 1) return null;
  if (count <= 12) {
    return (
      <div aria-hidden className="mt-3 flex items-center gap-1.5">
        {Array.from({ length: count }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-[3px] rounded-full transition-all duration-500",
              i === index ? "w-5 bg-primary" : "w-[3px] bg-ink/25",
            )}
          />
        ))}
      </div>
    );
  }
  // Moved by transform, not `left`, so the slide runs on the compositor. The
  // track is 144px (w-36) and the thumb 20px, so it travels 124px.
  const travel = (index / (count - 1)) * 124;
  return (
    <div aria-hidden className="relative mt-3 h-[3px] w-36 rounded-full bg-ink/10">
      <span
        className="absolute left-0 top-0 h-[3px] w-5 rounded-full bg-primary transition-transform duration-500 ease-out"
        style={{ transform: `translateX(${travel}px)` }}
      />
    </div>
  );
}
