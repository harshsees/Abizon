"use client";

/**
 * THE FRAMING GUIDE — and the crop it defines.
 *
 * This element is not decoration. Its rectangle IS the capture region: the
 * camera maps it back to source pixels and crops to it, so what the guide
 * surrounds is exactly what gets saved. That is why it carries a ref out to the
 * caller rather than being drawn independently.
 *
 * THE ASPECT RATIO IS NOT INVENTED. The reference recording contains no
 * passport capture at all — it is entirely the face photograph, start to
 * finish — so there was nothing to copy. The document ratio here is
 * **ISO/IEC 7810 ID-3**, the international standard for the passport data
 * page: 125 × 88 mm, 1.4205:1. A real standard beats a guessed rectangle.
 *
 * The scrim is a single huge `box-shadow` spread rather than four positioned
 * divs — one element, one paint, no seams at the corners, and it resizes with
 * the guide for free.
 */

import { forwardRef } from "react";

import { PASSPORT_ASPECT } from "@/lib/application/passport";

type CaptureFrameGuideProps = {
  shape: "passport" | "face";
  /** Dims the guide while the shutter is not armed. */
  dimmed?: boolean;
};

export const CaptureFrameGuide = forwardRef<HTMLDivElement, CaptureFrameGuideProps>(
  function CaptureFrameGuide({ shape, dimmed = false }, ref) {
    const isPassport = shape === "passport";

    return (
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-5 sm:p-8">
        <div
          ref={ref}
          style={{
            aspectRatio: isPassport ? String(PASSPORT_ASPECT) : "1 / 1",
            // The cut-out. 9999px of spread covers any stage size.
            boxShadow: "0 0 0 9999px rgb(2 6 23 / 0.62)",
          }}
          className={[
            "relative w-full",
            isPassport ? "max-h-full rounded-xl" : "max-h-full max-w-[78%] rounded-full",
            "transition-opacity duration-[--duration-base] motion-reduce:transition-none",
            dimmed ? "opacity-70" : "opacity-100",
          ].join(" ")}
        >
          {/* Corner brackets. The reference uses these on its capture preview,
              which is the one framing device it does show. */}
          {isPassport &&
            (
              [
                "left-0 top-0 border-l-2 border-t-2 rounded-tl-lg",
                "right-0 top-0 border-r-2 border-t-2 rounded-tr-lg",
                "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-lg",
                "right-0 bottom-0 border-r-2 border-b-2 rounded-br-lg",
              ] as const
            ).map((corner) => (
              <span
                key={corner}
                aria-hidden
                className={`absolute size-7 border-white/90 ${corner}`}
              />
            ))}

          {/* A hairline edge so the aperture reads as a window even where the
              brackets do not reach. */}
          <span
            aria-hidden
            className={[
              "absolute inset-0 border border-white/25",
              isPassport ? "rounded-xl" : "rounded-full",
            ].join(" ")}
          />
        </div>
      </div>
    );
  },
);
