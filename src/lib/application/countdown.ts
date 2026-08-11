"use client";

/**
 * THE COUNTDOWN CLOCK
 * ---------------------------------------------------------------------------
 * One hook owns the countdown's time. Components read `digit` and `progress`
 * and draw; they never hold a timer of their own.
 *
 * WHY NOT THE setTimeout CHAIN THIS REPLACES
 *
 * The previous implementation queued four `setTimeout`s at 1000/2000/3000ms and
 * pushed them onto a ref array. Three problems, all of which this fixes:
 *
 *   1. `setTimeout` drifts. Under load, four independent timers accumulate
 *      lateness against each other, so the ring and the numeral disagree about
 *      what time it is. Here there is ONE clock — `performance.now()` — read on
 *      each frame, and both the digit and the ring are pure functions of it.
 *      They cannot drift apart because there is nothing to drift.
 *   2. It could not express a partially elapsed countdown, so the ring had to
 *      be animated separately and hope to stay in step.
 *   3. Its completion fired a capture directly from inside a timer, which is
 *      the "setTimeout as source of truth" that Phase 5C §11 forbids. Here the
 *      hook reports completion once and the CALLER decides what that means.
 *
 * REPLAY (§12) is deterministic and explicit: a run starts when `active` goes
 * false → true, and at no other moment. Re-renders, parent updates and prop
 * identity changes do not restart it. Cancelling and re-arming is a state
 * transition the caller makes, not something React does incidentally.
 *
 * REDUCED MOTION (§13): the numerals still count — they are information about
 * when the shutter fires, not decoration, and removing them would make the
 * capture arrive unannounced. What goes is the continuously sweeping ring:
 * `progress` is quantised to one step per numeral, so the ring advances in
 * three discrete jumps instead of animating. Total duration is unchanged, so
 * the user gets the same time to prepare either way.
 */

import { useEffect, useRef, useState } from "react";

import { COUNTDOWN, prefersReducedMotion } from "@/lib/motion";

export type CountdownFrame = {
  /** 3, 2, 1 — or `null` when no run is in flight. */
  digit: number | null;
  /** 0 → 1 across the whole run. Drives the ring. */
  progress: number;
  running: boolean;
};

const IDLE: CountdownFrame = { digit: null, progress: 0, running: false };

/**
 * Pure: given elapsed seconds, what should be on screen.
 * Exported so the timeline can be asserted in a test without a DOM.
 */
export function frameAt(elapsed: number, reduced = false): CountdownFrame {
  const { from, digitHold, total } = COUNTDOWN;

  if (elapsed >= total) return { digit: null, progress: 1, running: false };

  const index = Math.min(from - 1, Math.floor(elapsed / digitHold));
  const digit = from - index;

  // Quantised under reduced motion: one step per numeral, no sweep.
  const progress = reduced
    ? (index + 1) / from
    : Math.min(1, elapsed / total);

  return { digit, progress, running: true };
}

export function useCaptureCountdown(
  active: boolean,
  onComplete: () => void,
): CountdownFrame {
  const [frame, setFrame] = useState<CountdownFrame>(IDLE);

  /**
   * The completion callback lives in a ref so that a caller re-creating it on
   * every render cannot restart the countdown. Synced in an effect rather than
   * assigned during render — a render can be discarded, and writing to a ref
   * from one that is thrown away leaves the ref describing a render that never
   * committed.
   */
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  useEffect(() => {
    // No synchronous setState here: the reset belongs in the cleanup, which is
    // exactly when a run is actually being torn down.
    if (!active) return;

    const reduced = prefersReducedMotion();
    const startedAt = performance.now();
    let raf = 0;
    let done = false;

    const tick = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const next = frameAt(elapsed, reduced);
      setFrame(next);

      if (next.running) {
        raf = requestAnimationFrame(tick);
        return;
      }

      // Exactly once, and only after the last numeral has had its full hold.
      if (!done) {
        done = true;
        onCompleteRef.current();
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setFrame(IDLE);
    };
  }, [active]);

  return frame;
}
