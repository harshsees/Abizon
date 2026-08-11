"use client";

/**
 * THE COUNTDOWN, COMPOSED.
 *
 * Phase 5C §8 asks for clear layers rather than one component with everything
 * mixed in. The layering, outermost first:
 *
 *   LAYER 0  background      the live video. NOT owned here — `LiveCapture`
 *                            renders it, and this phase does not touch it.
 *   LAYER 1  ambient         the soft page glow. Already exists, already
 *                            static in the reference, so nothing is added.
 *   LAYER 2  ring            `CountdownRing` — progress, outside the aperture.
 *   LAYER 3  numeral         `CountdownNumeral` — 3 / 2 / 1, dead centre.
 *   LAYER 4  handoff         not a layer at all. See below.
 *
 * THE HANDOFF (§10). There is no separate outro animation, and adding one would
 * be inventing motion the reference does not have: at frame 374 the numeral and
 * the ring simply stop and the capture is taken. What makes it read as a
 * hand-off rather than a stop is that `onComplete` fires from the countdown's
 * own clock at the instant the last numeral's hold expires — the shutter is the
 * end of the countdown, not an event scheduled near it. There is no gap to
 * perceive, because the same frame that retires "1" grabs the frame.
 *
 * This component holds NO timer. `useCaptureCountdown` owns the clock;
 * everything here is a pure function of the frame it reports.
 */

import { useEffect, useRef } from "react";

import { useCaptureCountdown } from "@/lib/application/countdown";

import { CountdownNumeral } from "./CountdownNumeral";
import { CountdownRing } from "./CountdownRing";

type CaptureCountdownProps = {
  /**
   * Authoritative. The countdown runs while this is true and restarts only on
   * a false → true transition, so returning to the step does not replay it and
   * a re-render never does (§12).
   */
  active: boolean;
  /** Diameter of the capture aperture in px; the ring and numeral scale off it. */
  apertureSize: number;
  /** Fires once, from the countdown's own clock, as the last numeral expires. */
  onComplete: () => void;
  /** Called on each numeral change, for the existing capture beep. */
  onDigit?: (digit: number) => void;
};

export function CaptureCountdown({
  active,
  apertureSize,
  onComplete,
  onDigit,
}: CaptureCountdownProps) {
  const { digit, progress, running } = useCaptureCountdown(active, onComplete);

  if (!running) return null;

  return (
    <>
      <CountdownRing progress={progress} apertureSize={apertureSize} />
      <CountdownNumeral digit={digit} apertureSize={apertureSize} />

      {/* The numerals are aria-hidden — three characters announced in
          succession is noise. One live region states the same thing once per
          numeral, in words. */}
      <span role="status" aria-live="assertive" className="sr-only">
        {digit !== null
          ? `Capturing in ${digit} ${digit === 1 ? "second" : "seconds"}`
          : ""}
      </span>

      <DigitBeep digit={digit} onDigit={onDigit} />
    </>
  );
}

/**
 * Fires `onDigit` once per numeral change.
 *
 * Split out so the audio side-effect is not tangled into the render path of
 * the visual layers. NOTE: the reference recording has no audio track at all
 * (no `soun`/`mp4a` atom in the file), so the beep can be neither confirmed nor
 * refuted against it. It is carried over from the existing implementation
 * rather than introduced here.
 */
function DigitBeep({
  digit,
  onDigit,
}: {
  digit: number | null;
  onDigit?: (digit: number) => void;
}) {
  const previous = useRef<number | null>(null);

  useEffect(() => {
    if (digit !== null && digit !== previous.current) onDigit?.(digit);
    previous.current = digit;
  }, [digit, onDigit]);

  return null;
}
