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
      className="relative isolate w-full overflow-hidden bg-paper"
      style={{ height: "clamp(640px, 100svh, 1080px)" }}
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

      {/* The planet sinks into the page: the stage's lower edge dissolves into
          the same paper everything below it is set on, so the page reads as
          one continuous background rather than a hero and a page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[12%] bg-gradient-to-b from-transparent to-paper"
      />

      {/* Title, set below the floating nav. */}
      <div className="pointer-events-none absolute inset-x-0 top-[10%] flex flex-col items-center px-6 text-center md:top-[8.5%]">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-ink-faint">
          {totalCount} destinations <span className="mx-1.5 text-ink/25">·</span>
          <span className="text-ink">Drag to explore</span>
        </p>
        <h1 className="mt-3 font-serif text-[36px] font-light leading-none tracking-[-0.02em] text-ink md:text-[54px]">
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
              onClick={() => engineRef.current?.step(-1)}
              aria-label="Previous destination"
              className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-ink/15 bg-paper-raised/70 text-ink-muted backdrop-blur-md transition-colors hover:border-ink/40 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <h3
              key={current.code}
              className="animate-stage-title min-w-0 max-w-[60vw] truncate text-[24px] font-light uppercase tracking-[0.14em] text-ink md:max-w-none md:text-[34px] [text-shadow:0_0_14px_rgb(249_248_245),0_0_3px_rgb(249_248_245)]"
            >
              {current.name}
            </h3>
            <button
              type="button"
              onClick={() => engineRef.current?.step(1)}
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
  const pct = (index / (count - 1)) * 100;
  return (
    <div aria-hidden className="relative mt-3 h-[3px] w-36 rounded-full bg-ink/10">
      <span
        className="absolute top-0 h-[3px] w-5 -translate-x-1/2 rounded-full bg-primary transition-[left] duration-500 ease-out"
        style={{ left: `calc(10px + (100% - 20px) * ${pct / 100})` }}
      />
    </div>
  );
}
