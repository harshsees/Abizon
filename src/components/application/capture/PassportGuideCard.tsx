"use client";

/**
 * THE GUIDANCE CARD
 * ---------------------------------------------------------------------------
 * A passport lying open beside the drop zone, showing which way up and which
 * page — and turning itself over when the flow asks for the other side.
 *
 * ── The flip is the instruction ──
 *
 * "Now flip to the back page" is a sentence. The card doing it is a
 * demonstration, and it lands before the sentence has been read. It is also the
 * only motion on that screen, so it carries no risk of competing with anything;
 * the reference plays exactly this and it is the moment the flow feels
 * designed rather than assembled.
 *
 * Mechanically it is a `rotateY` on a `preserve-3d` parent with two absolutely
 * stacked faces and `backface-visibility: hidden` — the same technique as
 * `.pay-card`, which is why the CSS lives beside it in globals.css rather than
 * as a wall of arbitrary Tailwind values.
 *
 * ── It is a schematic, not a document ──
 *
 * Every field is a bar, the portrait is a block, the machine-readable zone is a
 * row of dashes. No name, no number, no emblem, no country. Two reasons, and
 * the first is the binding one: a convincing drawing of a passport is a
 * drawing of somebody's identity document. The second is that the eye is being
 * asked to match a LAYOUT, and detail is what gets in the way of that.
 *
 * What the redesign added over the first version is depth, not detail — a
 * cover under the page, a gutter down the spine, paper that is warm rather than
 * white, a portrait with tone in it, and a shadow that puts the whole thing on
 * a surface. It reads as an object now. It still says nothing.
 */

export function PassportGuideCard({ face }: { face: "photo" | "back" }) {
  return (
    <figure className="pass-guide">
      <div
        className="pass-guide-flip"
        data-flipped={face === "back" ? "true" : undefined}
      >
        <div className="pass-guide-face">
          <PassportPage face="photo" />
        </div>
        <div className="pass-guide-face pass-guide-face--back">
          <PassportPage face="back" />
        </div>
      </div>

      <figcaption className="pass-guide-caption">
        {face === "photo" ? "Photo page" : "Back page"}
      </figcaption>
    </figure>
  );
}

/* -------------------------------------------------------------------------- */

function PassportPage({ face }: { face: "photo" | "back" }) {
  return (
    <svg
      viewBox="0 0 240 200"
      className="h-full w-full"
      role="img"
      aria-label={
        face === "photo"
          ? "An open passport showing the photo page, facing up"
          : "An open passport turned to the back page"
      }
    >
      <defs>
        <linearGradient id={`cover-${face}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--slate-700)" />
          <stop offset="100%" stopColor="var(--slate-900)" />
        </linearGradient>
        <linearGradient id={`paper-${face}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--white)" />
          <stop offset="100%" stopColor="var(--slate-50)" />
        </linearGradient>
        <linearGradient id={`portrait-${face}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--slate-200)" />
          <stop offset="100%" stopColor="var(--slate-400)" />
        </linearGradient>
        {/* The gutter. A passport lies open around a spine, and the shadow
            falling into it is most of what makes a flat drawing read as a
            book. */}
        <linearGradient id={`gutter-${face}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgb(15 23 42 / 0)" />
          <stop offset="50%" stopColor="rgb(15 23 42 / 0.10)" />
          <stop offset="100%" stopColor="rgb(15 23 42 / 0)" />
        </linearGradient>
      </defs>

      {/* Cover, showing as a margin around the page. */}
      <rect x="6" y="4" width="228" height="192" rx="9" fill={`url(#cover-${face})`} />
      {/* A hairline of gilt on the cover's edge. The one warm note. */}
      <rect
        x="6"
        y="4"
        width="228"
        height="192"
        rx="9"
        fill="none"
        stroke="var(--amber-600)"
        strokeOpacity="0.28"
        strokeWidth="1"
      />

      {/* The page. */}
      <rect x="14" y="12" width="212" height="176" rx="5" fill={`url(#paper-${face})`} />
      <rect x="112" y="12" width="16" height="176" fill={`url(#gutter-${face})`} />

      {face === "photo" ? (
        <>
          {/* Header band — the issuing line across the top of a data page. */}
          <rect x="26" y="24" width="188" height="7" rx="3.5" className="fill-border" />

          {/* Portrait. */}
          <rect
            x="26"
            y="42"
            width="52"
            height="64"
            rx="3"
            fill={`url(#portrait-${face})`}
          />
          {/* A head-and-shoulders silhouette inside it, so the block reads as
              a photograph rather than as an empty slot. */}
          <circle cx="52" cy="64" r="11" className="fill-surface" fillOpacity="0.55" />
          <path
            d="M34 106 a18 16 0 0 1 36 0 z"
            className="fill-surface"
            fillOpacity="0.55"
          />

          {/* Field pairs — a short label over a longer value, twice across. */}
          {[0, 1, 2, 3].map((row) => (
            <g key={row}>
              <rect
                x="88"
                y={44 + row * 16}
                width="30"
                height="2.5"
                rx="1.25"
                className="fill-border"
              />
              <rect
                x="88"
                y={50 + row * 16}
                width={54 - row * 6}
                height="4"
                rx="2"
                className="fill-border-strong"
              />
              <rect
                x="156"
                y={44 + row * 16}
                width="26"
                height="2.5"
                rx="1.25"
                className="fill-border"
              />
              <rect
                x="156"
                y={50 + row * 16}
                width={44 - row * 5}
                height="4"
                rx="2"
                className="fill-border-strong"
              />
            </g>
          ))}

          {/* Signature. */}
          <path
            d="M28 122 q7 -7 13 0 t13 0 t10 -3"
            fill="none"
            className="stroke-border-strong"
            strokeWidth="1.6"
            strokeLinecap="round"
          />

          {/* The machine-readable zone, on its own slightly cooler band —
              which is exactly how it looks on the real page. */}
          <rect x="20" y="142" width="200" height="38" rx="3" className="fill-surface-sunken" />
          {[0, 1].map((line) => (
            <line
              key={line}
              x1="28"
              y1={155 + line * 14}
              x2="212"
              y2={155 + line * 14}
              className="stroke-border-strong"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="2.5 4"
            />
          ))}
        </>
      ) : (
        <>
          {/* Barcode at the head — the back page's most recognisable mark. */}
          {[
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
          ].map((bar) => (
            <line
              key={bar}
              x1={140 + bar * 5.2}
              y1="26"
              x2={140 + bar * 5.2}
              y2="46"
              className="stroke-foreground"
              strokeOpacity="0.55"
              strokeWidth={bar % 3 === 0 ? 3 : 1.4}
              strokeLinecap="round"
            />
          ))}

          {/* Label-over-value pairs: parents, address, file number. */}
          {[0, 1, 2, 3, 4].map((row) => (
            <g key={row}>
              <rect
                x="26"
                y={30 + row * 24}
                width="46"
                height="2.5"
                rx="1.25"
                className="fill-border"
              />
              <rect
                x="26"
                y={37 + row * 24}
                width={row === 2 ? 168 : 122 - (row % 3) * 22}
                height="4.5"
                rx="2.25"
                className="fill-border-strong"
              />
            </g>
          ))}

          {/* Perforated file number down the fore-edge. */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((dot) => (
            <circle
              key={dot}
              cx="212"
              cy={70 + dot * 12}
              r="1.6"
              className="fill-border-strong"
            />
          ))}

          <rect x="26" y="158" width="70" height="4" rx="2" className="fill-border-strong" />
        </>
      )}
    </svg>
  );
}
