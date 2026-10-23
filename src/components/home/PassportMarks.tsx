"use client";

/**
 * PASSPORT MARKS — what makes the paper below the hall read as a passport page
 * rather than as a blank web page.
 *
 *   Guilloche   the fine interlaced wave print on a passport's visa pages and
 *               on banknotes. Laid faintly across a band of the sheet, faded
 *               out at its edges with a mask so it never sits under body text
 *               at full strength.
 *
 *   Stamp       an entry/exit stamp in worn ink, set in the empty margin
 *               beside a section. It presses onto the page as it scrolls into
 *               view — a beat of scale and rotation, the way a stamp lands —
 *               and then stays still.
 *
 * Both are decoration and are hidden from assistive technology. The stamps
 * name real airports and say nothing about any traveller: no names, no
 * passport numbers, and no dates.
 */

import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Guilloche                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One seamless tile of interlaced sine waves, as a data URI. The period of
 * every wave divides the tile width, so tiles join without a seam.
 */
function guillocheTile(): string {
  const W = 480;
  const H = 140;
  const lines: string[] = [];
  const waves = 14;
  for (let k = 0; k < waves; k++) {
    const phase = (k / waves) * Math.PI * 2;
    const amp = 26 + 10 * Math.sin(phase * 2);
    let d = "";
    for (let x = 0; x <= W; x += 6) {
      const t = (x / W) * Math.PI * 2;
      const y = H / 2 + amp * Math.sin(t * 2 + phase) + 8 * Math.sin(t * 6 - phase);
      d += `${x === 0 ? "M" : "L"}${x} ${y.toFixed(2)}`;
    }
    lines.push(`<path d='${d}'/>`);
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}'><g fill='none' stroke='%2316171b' stroke-width='0.6' opacity='0.5'>${lines.join("")}</g></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E")}")`;
}

/** Deterministic, so it is built once per module rather than per render. */
const GUILLOCHE_TILE = guillocheTile();

export function Guilloche({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-x-0 opacity-[0.16]", className)}
      style={{
        backgroundImage: GUILLOCHE_TILE,
        backgroundSize: "480px 140px",
        maskImage: "radial-gradient(70% 60% at 50% 40%, #000 0%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(70% 60% at 50% 40%, #000 0%, transparent 75%)",
      }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Stamps                                                                      */
/* -------------------------------------------------------------------------- */

type StampProps = {
  /** IATA code, set large in the middle. */
  code: string;
  /** Set around the ring (round) or across the top (box). */
  line: string;
  /** The small word under the code. */
  word: string;
  shape?: "round" | "box";
  tone?: "ink" | "amber";
  rotate?: number;
  className?: string;
};

export function Stamp({ code, line, word, shape = "round", tone = "ink", rotate = -8, className }: StampProps) {
  const reduced = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const color = tone === "amber" ? "text-primary/55" : "text-ink/30";

  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none select-none", color, className)}
      initial={reduced ? { rotate, opacity: 1 } : { scale: 1.35, opacity: 0, rotate: rotate - 10 }}
      whileInView={{ scale: 1, opacity: 1, rotate }}
      viewport={{ once: true, margin: "-25% 0px -25% 0px" }}
      transition={{ type: "spring", stiffness: 420, damping: 22, mass: 0.6 }}
    >
      <svg viewBox="0 0 160 160" className="h-full w-full overflow-visible">
        {/* Worn ink: the edges break up the way a rubber stamp's do. */}
        <defs>
          <filter id={`wear-${id}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={code.length * 7} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.6" result="holes" />
            <feComposite in="SourceGraphic" in2="holes" operator="in" result="worn" />
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" seed={code.length * 3} result="w" />
            <feDisplacementMap in="worn" in2="w" scale="2.5" />
          </filter>
          {shape === "round" && <path id={`ring-${id}`} d="M80 80 m-56 0 a56 56 0 1 1 112 0 a56 56 0 1 1 -112 0" />}
        </defs>

        <g filter={`url(#wear-${id})`} fill="currentColor" stroke="currentColor">
          {shape === "round" ? (
            <>
              <circle cx="80" cy="80" r="74" fill="none" strokeWidth="3" />
              <circle cx="80" cy="80" r="44" fill="none" strokeWidth="1.5" />
              <text
                stroke="none"
                className="font-mono"
                fontSize="11"
                fontWeight="700"
                letterSpacing="3.2"
              >
                {/* Fitted to the ring exactly, whatever the line's length. */}
                <textPath href={`#ring-${id}`} startOffset="0" textLength={348} lengthAdjust="spacing">
                  {line.length > 15 ? `${line} ★ ` : `${line} ★ ${line} ★ `}
                </textPath>
              </text>
              <text x="80" y="86" textAnchor="middle" stroke="none" className="font-sans" fontSize="24" fontWeight="800" letterSpacing="1">
                {code}
              </text>
              <text
                x="80"
                y="102"
                textAnchor="middle"
                stroke="none"
                className="font-mono"
                fontSize="8"
                fontWeight="700"
                letterSpacing="2"
                // The inner ring is 88 wide at its middle; a long word is fitted to it.
                {...(word.length > 8 ? { textLength: 66, lengthAdjust: "spacingAndGlyphs" } : {})}
              >
                {word}
              </text>
            </>
          ) : (
            <>
              <rect x="6" y="34" width="148" height="92" rx="8" fill="none" strokeWidth="3" />
              <rect x="13" y="41" width="134" height="78" rx="4" fill="none" strokeWidth="1.2" />
              <text x="80" y="60" textAnchor="middle" stroke="none" className="font-mono" fontSize="9" fontWeight="700" textLength={116} lengthAdjust="spacingAndGlyphs">
                {line}
              </text>
              <text x="80" y="92" textAnchor="middle" stroke="none" className="font-sans" fontSize="28" fontWeight="800" letterSpacing="2">
                {code}
              </text>
              <text x="80" y="110" textAnchor="middle" stroke="none" className="font-mono" fontSize="8" fontWeight="700" letterSpacing="2">
                {word}
              </text>
            </>
          )}
        </g>
      </svg>
    </motion.div>
  );
}
