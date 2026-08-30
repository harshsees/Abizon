"use client";

/**
 * THE GUIDANCE CARD
 * ---------------------------------------------------------------------------
 * A passport lying open, floated beside the drop zone, showing which way up
 * and which page. The reference does this and it earns its place: "photo page
 * up" is a sentence somebody has to decode, and a picture of the page settles
 * it before they have finished reading.
 *
 * IT IS A SCHEMATIC, NOT A DOCUMENT. Every field is a grey bar, the portrait
 * is a plain block, the machine-readable zone is a row of dashes. There is no
 * name, no number, no emblem and no country. That is deliberate on two counts:
 * a drawing of a real passport is a drawing of somebody's identity document,
 * and a schematic reads faster anyway — the eye is being asked to match a
 * LAYOUT, and detail is what gets in the way of that.
 *
 * The two faces differ where the real pages differ: the photo page is
 * portrait-block-plus-fields with the MRZ across the foot, and the back page is
 * paragraphs with a barcode at the head. That contrast is the entire message
 * of the "now flip it over" screen.
 */

export function PassportGuideCard({ face }: { face: "photo" | "back" }) {
  return (
    <div className="flex size-[300px] items-center justify-center rounded-[28px] bg-surface shadow-e4">
      <svg
        viewBox="0 0 220 210"
        className="h-[230px] w-[240px]"
        role="img"
        aria-label={
          face === "photo"
            ? "An open passport showing the photo page, facing up"
            : "An open passport turned to the back page"
        }
      >
        {/* The cover behind, so the page reads as one leaf of a book rather
            than a loose card. */}
        <rect
          x="18"
          y="6"
          width="184"
          height="58"
          rx="6"
          className="fill-surface-sunken"
        />
        <rect
          x="10"
          y="52"
          width="200"
          height="140"
          rx="6"
          className="fill-surface stroke-border"
          strokeWidth="1.5"
        />

        {face === "photo" ? (
          <>
            {/* Header rule */}
            <rect x="24" y="64" width="172" height="5" rx="2.5" className="fill-border" />

            {/* Portrait */}
            <rect x="24" y="78" width="44" height="54" rx="3" className="fill-border-strong" />

            {/* Field rows, two columns, shortening down the page the way a
                data page's values do. */}
            {[0, 1, 2, 3, 4].map((row) => (
              <g key={row}>
                <rect
                  x="78"
                  y={80 + row * 11}
                  width={54 - row * 4}
                  height="3.5"
                  rx="1.75"
                  className="fill-border"
                />
                <rect
                  x="146"
                  y={80 + row * 11}
                  width={44 - row * 3}
                  height="3.5"
                  rx="1.75"
                  className="fill-border"
                />
              </g>
            ))}

            {/* Signature */}
            <rect x="24" y="140" width="40" height="3" rx="1.5" className="fill-border-strong" />

            {/* Machine-readable zone — the two dashed lines across the foot. */}
            <g className="text-border-strong">
              {[0, 1].map((line) => (
                <line
                  key={line}
                  x1="24"
                  y1={158 + line * 10}
                  x2="196"
                  y2={158 + line * 10}
                  stroke="currentColor"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="3 4"
                />
              ))}
            </g>
          </>
        ) : (
          <>
            {/* Barcode at the head — the back page's most recognisable mark. */}
            <g className="text-border-strong">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((bar) => (
                <line
                  key={bar}
                  x1={132 + bar * 5}
                  y1="66"
                  x2={132 + bar * 5}
                  y2="82"
                  stroke="currentColor"
                  strokeWidth={bar % 3 === 0 ? 3 : 1.5}
                  strokeLinecap="round"
                />
              ))}
            </g>

            {/* Label / value pairs — parents, address, file number. */}
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <g key={row}>
                <rect
                  x="24"
                  y={70 + row * 18}
                  width="52"
                  height="3"
                  rx="1.5"
                  className="fill-border"
                />
                <rect
                  x="24"
                  y={78 + row * 18}
                  width={140 - (row % 3) * 26}
                  height="4"
                  rx="2"
                  className="fill-border-strong"
                />
              </g>
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
