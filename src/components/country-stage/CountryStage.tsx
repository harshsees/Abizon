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

import type { StageEngine } from "./stageEngine";

type StageModule = typeof import("./stageClient");

export function CountryStage({
  countries,
  totalCount,
}: {
  countries: Country[];
  totalCount: number;
}) {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<StageEngine | null>(null);
  const moduleRef = useRef<StageModule | null>(null);
  const countriesRef = useRef(countries);
  // Held in a ref so a new router identity never tears the engine down: the
  // canvas outlives the effect, and a second engine on it would draw nothing.
  const routerRef = useRef(router);

  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    countriesRef.current = countries;
    routerRef.current = router;
  }, [countries, router]);

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

    import("./stageClient")
      .then((mod) => {
        if (cancelled) return;
        moduleRef.current = mod;
        try {
          engine = new mod.StageEngine(
            canvas,
            {
              onActiveChange: (i) => setActive(Math.max(0, i)),
              onOpen: (i) => {
                const c = countriesRef.current[i];
                if (c) routerRef.current.push(`/visa/${getCountrySlug(c.name)}`);
              },
            },
            mod.markerPoints(),
          );
        } catch {
          setFailed(true);
          return;
        }
        engineRef.current = engine;
        const rect = canvas.getBoundingClientRect();
        engine.resize(rect.width, rect.height);
        engine.setCards(mod.toStageCountries(countriesRef.current));

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

  if (failed) return null;

  const count = countries.length;
  const current = count ? countries[Math.min(active, count - 1)] : undefined;
  const slug = current ? getCountrySlug(current.name) : "";
  const pad = (n: number) => String(n).padStart(2, "0");

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      engineRef.current?.step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      engineRef.current?.step(-1);
    }
  };

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carousel"
      aria-label="Destinations"
      onKeyDown={onKeyDown}
      className="relative isolate mb-8 w-full overflow-hidden rounded-[28px] bg-[#02040c] md:mb-10 md:rounded-[36px]"
      style={{ height: "clamp(620px, calc(100svh - 120px), 980px)" }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          "absolute inset-0 h-full w-full cursor-grab touch-pan-y select-none outline-none",
          "transition-opacity duration-700",
          ready ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Mirror Hall's frame: a hairline inset with ticks at two corners. */}
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-[20px] border border-white/[0.05] md:inset-4 md:rounded-[26px]" />
      <span aria-hidden className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-white/30 md:left-4 md:top-4" />
      <span aria-hidden className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-white/30 md:bottom-4 md:right-4" />

      {/* Title. */}
      <div className="pointer-events-none absolute inset-x-0 top-[5.5%] flex flex-col items-center px-6 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/40">
          Abizon <span className="mx-1.5 text-white/25">·</span>
          <span className="text-white/85">{totalCount} destinations</span>
        </p>
        <h2 className="mt-3 text-[34px] font-extralight leading-none tracking-[-0.01em] text-white md:text-[52px]">
          Where to next?
        </h2>
        <p className="mt-3 text-[12px] font-light text-white/50 md:text-[13px]">
          Drag through the hall — the planet turns to meet you.
        </p>
      </div>

      {/* The active destination, over the planet. */}
      {current ? (
        <div className="absolute inset-x-0 top-[72%] flex flex-col items-center px-4 text-center md:top-[71%]">
          {/* A soft scrim so the type holds against a sunlit planet. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[220%] w-[min(760px,120%)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(2,4,12,0.82),rgba(2,4,12,0.5)_55%,transparent)]"
          />
          <p className="font-mono text-[11px] tracking-[0.2em] text-white/60 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
            <span className="text-sky-300">{pad(active + 1)}</span> / {pad(count)}
          </p>

          <div className="mt-1.5 flex items-center gap-3 md:gap-5">
            <button
              type="button"
              onClick={() => engineRef.current?.step(-1)}
              aria-label="Previous destination"
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white/70 backdrop-blur-md transition-colors hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <h3
              key={current.code}
              className="animate-stage-title min-w-0 max-w-[60vw] truncate text-[24px] font-light uppercase tracking-[0.14em] text-white md:max-w-none md:text-[34px]"
            >
              {current.name}
            </h3>
            <button
              type="button"
              onClick={() => engineRef.current?.step(1)}
              aria-label="Next destination"
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white/70 backdrop-blur-md transition-colors hover:border-white/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] font-medium uppercase tracking-[0.12em] text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
            <span>{current.visaType}</span>
            <span aria-hidden className="h-1 w-1 rounded-full bg-white/30" />
            <span>{current.validity}</span>
            <span aria-hidden className="h-1 w-1 rounded-full bg-white/30" />
            <span>{formatGovernmentFee(current.fees)}</span>
            <Link
              href={`/visa/${slug}`}
              className="ml-1 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-semibold normal-case tracking-normal text-slate-950 shadow-[0_0_24px_rgba(125,211,252,0.35)] transition-transform hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
            >
              View {current.name} visa
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          </div>

          <Progress index={active} count={count} />
        </div>
      ) : (
        <div className="absolute inset-x-0 top-[74%] text-center text-sm font-light text-white/60">
          No destinations match these filters.
        </div>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {current ? `${current.name}, ${active + 1} of ${count}` : "No destinations"}
      </p>
    </section>
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
              i === index ? "w-5 bg-sky-300" : "w-[3px] bg-white/30",
            )}
          />
        ))}
      </div>
    );
  }
  const pct = (index / (count - 1)) * 100;
  return (
    <div aria-hidden className="relative mt-3 h-[3px] w-36 rounded-full bg-white/15">
      <span
        className="absolute top-0 h-[3px] w-5 -translate-x-1/2 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.8)] transition-[left] duration-500 ease-out"
        style={{ left: `calc(10px + (100% - 20px) * ${pct / 100})` }}
      />
    </div>
  );
}
