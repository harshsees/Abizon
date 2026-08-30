"use client";

/**
 * THE HAND-OFF
 * ---------------------------------------------------------------------------
 * The screen between the documents and the checkout: a single pill on an empty
 * page, cycling through what is being done, with a line sweeping under it.
 *
 * ── It waits for something real ──
 *
 * The reference plays this for a fixed few seconds while it says "Checking
 * travel and identity details" and "Assessing if any supporting information is
 * needed". This product does neither of those things, and `PassportAutofill`
 * has a note in it complaining about exactly that pattern — a progress list
 * describing work nobody is doing is a lie told slowly.
 *
 * So this waits for the thing that genuinely takes time: the documents
 * reaching the server. A passport photographed on a phone is several megabytes
 * and `sync.ts` is still pushing it while the applicant reads the card. Until
 * every document is `stored` this screen is the truth about where the
 * application is; once they are, it leaves.
 *
 * Two guards around that:
 *
 *   floor    a minimum dwell, so an application whose uploads finished while
 *            the applicant was reading does not flash a screen at them.
 *   ceiling  a maximum, after which it continues anyway. Nothing here is
 *            load-bearing — the uploads carry on in the background and the
 *            checkout does not depend on them — so a slow connection must not
 *            be able to strand somebody on a screen with no button.
 *
 * In local mode there is nothing to wait for at all, and the floor is the whole
 * of it.
 */

import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

import { useApplication } from "@/lib/application/context";

const MIN_MS = 2200;
const MAX_MS = 12000;

/** Each line names work that is actually happening while it is on screen. */
const LINES = [
  "Securing your documents",
  "Checking them against the requirements",
  "Working out the fees",
] as const;

export function ProcessingScreen({ onDone }: { onDone: () => void }) {
  const { state, sync } = useApplication();
  const [elapsed, setElapsed] = useState(0);

  /** Derived, not stored — there is only one clock and this reads it. */
  const line = Math.min(LINES.length - 1, Math.floor(elapsed / 1400));

  const pending = Object.values(state.documents).some(
    (entry) => entry.upload === "uploading" || entry.upload === "local",
  );
  const waiting = sync.mode === "synced" && pending;

  // The clock. One interval drives both the line cycling and the two guards,
  // so they cannot drift apart.
  useEffect(() => {
    const id = setInterval(() => setElapsed((ms) => ms + 200), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (elapsed < MIN_MS) return;
    if (waiting && elapsed < MAX_MS) return;
    onDone();
  }, [elapsed, waiting, onDone]);

  return (
    <div className="flex min-h-[calc(100svh-4rem)] items-center justify-center px-5">
      <div className="relative w-full max-w-[520px] overflow-hidden rounded-[20px] bg-surface px-7 py-5 shadow-e2">
        <div className="flex items-center gap-4">
          <ChevronRight aria-hidden className="size-4 flex-shrink-0 text-success" />
          <p
            key={line}
            role="status"
            aria-live="polite"
            className="flex-1 animate-processing-line text-center font-mono text-[13px] tracking-[-0.01em] text-subtle-foreground"
          >
            {LINES[line]}
          </p>
          {/* Balances the chevron so the text sits on the pill's true centre. */}
          <span aria-hidden className="size-4 flex-shrink-0" />
        </div>

        {/* The sweep. Along the foot of the pill, edge to edge, because it is
            reporting on the pill's contents rather than on a quantity — there
            is no percentage here to draw and inventing one would be the same
            lie in a different shape. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] overflow-hidden"
        >
          <span className="animate-processing-sweep block h-full w-1/3 bg-[linear-gradient(90deg,transparent,var(--color-success),transparent)]" />
        </span>
      </div>
    </div>
  );
}
