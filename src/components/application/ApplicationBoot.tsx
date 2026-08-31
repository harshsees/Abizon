"use client";

/**
 * THE OPENING SCREEN
 * ---------------------------------------------------------------------------
 * What is on the page for the first couple of seconds after "Start
 * application" is pressed, before the flow's first question appears.
 *
 * ── Why a flow that is already loaded shows a loading screen ──
 *
 * Because pressing a button on the destination page and landing mid-form is a
 * cut, not a transition. The destination page is a wide editorial layout; the
 * application is a bare page with one field on it. Going straight from one to
 * the other reads as the site having broken and been replaced by something
 * else — the reference recording puts a screen between them for exactly this
 * reason, and it is the moment the flow starts feeling like a product rather
 * than a route change.
 *
 * ── It is not a lie, but it is not load-bearing either ──
 *
 * The lines below name work this application genuinely does on entry —
 * resolving the destination's visa configuration, restoring a saved draft,
 * opening the synced row for a signed-in account. None of it takes two
 * seconds, and this screen does not pretend to be waiting on any of it: there
 * is no percentage, no per-line tick, and nothing here reports a result.
 *
 * That is the same line `ProcessingScreen` draws in its own header, and it is
 * drawn in the same place: a sweep, because a sweep says "something is
 * happening"; never a bar, because a bar says "this much of it is done", and
 * this screen has no idea how much of anything is done.
 *
 * ── The dwell ──
 *
 * `DWELL_MS` is the whole of it. Long enough that the screen registers as a
 * deliberate beat rather than a flash, short enough that nobody waits on it.
 * Under `prefers-reduced-motion` it is cut to a third: the reason for the
 * screen is a visual one, and somebody who has asked for less motion has asked
 * to be got on with.
 */

import { useEffect, useState } from "react";

import { Wordmark } from "@/components/Wordmark";

const DWELL_MS = 2100;
const REDUCED_DWELL_MS = 700;

/** One line per ~700ms. Three of them fills the dwell exactly. */
const LINE_MS = 700;

export function ApplicationBoot({
  countryName,
  onDone,
}: {
  countryName?: string;
  onDone: () => void;
}) {
  /**
   * Read once, at mount. This only ever renders on the client — `/apply` puts
   * the whole flow behind a Suspense boundary whose fallback is what the
   * server renders — so there is no server value for it to disagree with.
   */
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const lines = [
    "Opening your application",
    countryName
      ? `Loading ${countryName} requirements`
      : "Loading the destination requirements",
    "Preparing your document checklist",
  ];

  const [elapsed, setElapsed] = useState(0);
  const line = Math.min(lines.length - 1, Math.floor(elapsed / LINE_MS));

  // One clock drives both the line cycling and the exit, so they cannot drift.
  useEffect(() => {
    const id = setInterval(() => setElapsed((ms) => ms + 100), 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (elapsed < (reduced ? REDUCED_DWELL_MS : DWELL_MS)) return;
    onDone();
  }, [elapsed, reduced, onDone]);

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-5">
      {/* The same field the flow behind this one paints, so the background does
          not change at the moment the screen does. Without it the boot screen
          is flat and the travellers step arrives on a gradient, which reads as
          two pages rather than one arriving. */}
      <div aria-hidden className="ambient-field" />

      {/* The mark, breathing. It is the one thing on screen that was also on
          the page the applicant just left, so it carries the continuity this
          screen exists to provide. */}
      <span aria-hidden className="animate-boot-mark motion-reduce:animate-none">
        <Wordmark className="text-3xl" />
      </span>

      <div className="relative mt-9 w-full max-w-[420px] overflow-hidden rounded-[20px] bg-surface px-7 py-5 shadow-e2">
        <p
          key={line}
          role="status"
          aria-live="polite"
          className="animate-processing-line text-center font-mono text-[13px] tracking-[-0.01em] text-subtle-foreground"
        >
          {lines[line]}
        </p>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
        >
          <span className="animate-processing-sweep block h-full w-1/3 bg-[linear-gradient(90deg,transparent,var(--color-primary),transparent)]" />
        </span>
      </div>
    </div>
  );
}
