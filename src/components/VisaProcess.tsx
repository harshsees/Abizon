/**
 * "The visa process" — rebuilt to the reference composition (screenshot 6).
 *
 * The reference draws the four steps as stops along a winding road: a thick
 * pale ribbon with a dashed centre line, entering from the left, switching back
 * twice and climbing off the top right, with a numbered black node at each
 * stop and its caption set beside it. The previous version was a numbered
 * hairline list — the same four facts, with none of the sense of a journey that
 * makes a four-step process feel short rather than long.
 *
 * HOW IT IS BUILT, and why not the obvious way.
 *
 * The road is ONE svg path in a fixed 1200x720 viewBox, stroked twice: a wide
 * round-capped pale stroke for the tarmac and a narrow dashed stroke on the
 * same path for the centre line. Two strokes of one path can never drift apart
 * the way two hand-authored paths would. The captions are absolutely positioned
 * over it in percentages of that same box, so they scale with the road instead
 * of being pinned to pixel offsets that only hold at one width.
 *
 * The road only renders at lg and above. Below that the same four steps render
 * as a vertical dashed rail — not a scaled-down road, because at 768px the
 * captions would be 9px and the switchbacks would read as noise.
 *
 * WHAT IS NOT REPRODUCED. The reference's third stop carries a card reading
 * "Current state — Your visa is being processed by the government". That is a
 * live application status, and Phase 4.1 removed exactly that element from this
 * component with a note explaining why: this is a public page that no applicant
 * is signed in to, there is no filing backend producing statuses, so the card
 * showed a stranger's progress, invented. The stop keeps its illustration and
 * loses the status.
 *
 * PHASE 9, three changes, all of them about weight.
 *
 *   the gap        The road's viewBox carries ~170 units of sky above its
 *                  highest point, so a comfortable `mt-6` under the heading
 *                  rendered as roughly 230px of nothing. The heading and the
 *                  road are one object in the reference; the road container is
 *                  pulled up to close the sky rather than the margin, because
 *                  the sky is where caption 4 lives.
 *   the art        Stops 1 and 4 take real illustrations from
 *                  /images/process/. The reference's are photographs — a real
 *                  passport page, a real portrait, a photographed open book —
 *                  and none of them are Keyrise's to use, so these are drawn to
 *                  the same weight: near-white, one soft shadow, no colour but
 *                  a single warm accent.
 *   the outcomes   "What you pay, in each case" is gone. Three rows restating
 *                  the waiver and the refund, directly above a full-width black
 *                  band that exists to say the same thing, in a section whose
 *                  subject is the process rather than the price. The ledger in
 *                  the application card and /terms both still carry it.
 */

import type { ReactNode } from "react";

type Step = {
  num: number;
  title: string;
  body: string;
  art: ReactNode;
};

const STEPS: Step[] = [
  {
    num: 1,
    title: "Provide documents to submit application.",
    body: "We handle the rest.",
    art: <DocumentsArt />,
  },
  {
    num: 2,
    title: "Keyrise reviews everything thoroughly",
    body: "No scope for error.",
    art: <MagnifierArt />,
  },
  {
    num: 3,
    title: "We file your application with the authority",
    body: "And follow it up until a decision is issued.",
    art: <FiledDocumentArt />,
  },
  {
    num: 4,
    title: "Visa delivered on time",
    body: "Or before time.",
    art: <DeliveredArt />,
  },
];

/**
 * The road, as one path in a 1200x720 box.
 *
 * Corners are quadratics with a fixed 80-unit radius; every straight run
 * between two corners is at least twice that, which is what keeps the curve
 * from cusping. Do not shorten a run without shortening the radius with it.
 *
 * The two verticals are 400 units apart (x=300 and x=700) rather than the 250
 * the first draft used. That gap is not decorative: it is the pocket caption 2
 * sits in, and at 250 the tarmac — 78 units wide, so ±39 either side — left
 * only 172 usable units, which is 14% of the box and too narrow for a line of
 * text. Widening the pocket is the only thing that lets the caption sit inside
 * the switchback the way the reference's does.
 */
const ROAD_PATH = [
  "M -40 300",
  "L 220 300",
  "Q 300 300 300 380",
  "L 300 570",
  "Q 300 650 380 650",
  "L 620 650",
  "Q 700 650 700 570",
  "L 700 430",
  "Q 700 350 780 350",
  "L 860 350",
  "Q 940 350 940 270",
  "L 940 250",
  "Q 940 170 1020 170",
  "L 1260 170",
].join(" ");

/**
 * The tarmac, as a literal.
 *
 * `--color-surface-sunken` is slate-50 (#f8fafc) and the page ground is
 * #f7f7fa — four hundredths of a percent apart, so the first draft's road was
 * invisible. This is the one place in the component that needs a value between
 * the ground and `--color-border`, and there is no token for it.
 */
const TARMAC = "#E9E9F0";

/** Where each numbered node sits on the road, in viewBox units. */
const NODES: Record<number, { x: number; y: number }> = {
  1: { x: 190, y: 300 },
  2: { x: 300, y: 480 },
  3: { x: 700, y: 480 },
  4: { x: 940, y: 260 },
};

/**
 * Where each caption sits, as a percentage of the same box.
 *
 * Every one is placed against its own node and clear of the tarmac. The tarmac
 * is 78 units wide, so a caption whose box comes within 39 units of the path
 * centreline will sit on the road — which is what `indent` exists for: caption
 * 4 has to start left of the final climb to have room for its width, so its
 * box overlaps the road and its *padding* absorbs the overlap.
 */
const CAPTIONS: Record<
  number,
  { left: string; top: string; width: string; row?: boolean; indent?: boolean }
> = {
  1: { left: "12%", top: "19%", width: "38%", row: true },
  2: { left: "30%", top: "56%", width: "24%" },
  3: { left: "62%", top: "60%", width: "26%", row: true },
  4: { left: "78%", top: "28%", width: "21%", indent: true },
};

export function VisaProcess({ countryName }: { countryName?: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
      <h2 className="type-h2 text-foreground js-reveal-heading">
        The visa process
      </h2>

      {/* ── The road, lg and up ─────────────────────────────────────────────
          The negative pull is the heading-to-road gap. See the note above:
          the space being removed is inside the viewBox, not in the margin. */}
      <div className="relative mt-2 hidden aspect-[1200/720] w-full lg:-mt-24 lg:block xl:-mt-32">
        <svg
          viewBox="0 0 1200 720"
          className="absolute inset-0 h-full w-full"
          aria-hidden
          focusable="false"
        >
          {/* Tarmac. */}
          <path
            d={ROAD_PATH}
            fill="none"
            stroke={TARMAC}
            strokeWidth={78}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Centre line, on the identical path. */}
          <path
            d={ROAD_PATH}
            fill="none"
            stroke="#C3C3D0"
            strokeWidth={3}
            strokeDasharray="14 18"
            strokeLinecap="round"
          />

          {STEPS.map((step) => {
            const node = NODES[step.num];
            return (
              <g key={step.num}>
                <circle cx={node.x} cy={node.y} r={22} fill="#0B0B0D" />
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#FFFFFF"
                  fontSize={19}
                  fontWeight={600}
                >
                  {step.num}
                </text>
              </g>
            );
          })}
        </svg>

        {/* The captions ride over the road in the same coordinate space. */}
        <ol className="absolute inset-0">
          {STEPS.map((step) => {
            const place = CAPTIONS[step.num];
            return (
              <li
                key={step.num}
                className={`js-info-item absolute ${
                  place.row ? "flex items-center gap-6" : ""
                } ${place.indent ? "pl-12" : ""}`}
                style={{ left: place.left, top: place.top, width: place.width }}
              >
                {place.row && <div className="shrink-0">{step.art}</div>}
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-snug tracking-tight text-foreground">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.body}
                  </p>
                  {!place.row && <div className="mt-7">{step.art}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── The same four steps, below lg ─────────────────────────────────
          The art comes too. It used to be dropped on small screens, which
          left the mobile reader a plain numbered list where the desktop
          reader got an illustrated journey — and the art is most of what
          makes four steps feel like few. */}
      <ol className="mt-8 space-y-10 lg:hidden">
        {STEPS.map((step, index) => (
          <li key={step.num} className="js-info-item relative flex gap-5">
            {/* The rail, drawn per item so the last one has none below it. */}
            {index < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[21px] top-11 bottom-[-2.5rem] w-px border-l-2 border-dashed border-border-strong"
              />
            )}
            <span
              data-numeric
              aria-hidden
              className="relative z-raised flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#0B0B0D] text-base font-semibold text-white"
            >
              {step.num}
            </span>
            <div className="min-w-0 pt-1.5">
              <p className="text-sm font-semibold leading-snug tracking-tight text-foreground">
                {step.title}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">{step.body}</p>
              <div className="mt-5">{step.art}</div>
            </div>
          </li>
        ))}
      </ol>

      {countryName && (
        <p className="mt-12 max-w-2xl text-2xs leading-relaxed text-muted-foreground md:mt-16">
          {/* `{" "}` is explicit: JSX drops the whitespace between an
              expression and the text that follows it across a line break,
              which rendered this as "a Dubaivisa is made by". */}
          The decision on a {countryName}{" "}
          visa is made by the destination&rsquo;s immigration authority. Keyrise
          guarantees the timing of the filing, not the outcome.
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stop illustrations                                                         */
/* -------------------------------------------------------------------------- */
/*
 * Two of the four are files under /images/process, two are drawn inline.
 *
 * The split is not arbitrary. Stops 1 and 4 are still objects — a passport and
 * a photograph, an open book — and an object is best described by a picture, so
 * they are SVG files with gradients and drop shadows that would be noise in
 * TSX. Stops 2 and 3 are events: something is being checked, something has been
 * stamped. Both need a piece of live type inside them (the magnified number,
 * the FILED mark) that has to sit on the app's own font stack and colour
 * tokens, which a static file cannot do.
 *
 * All four are `aria-hidden`: every one sits beside a caption that already says
 * the same thing in words. The <img>s carry `alt=""` for the same reason, which
 * is what makes them decorative to a screen reader rather than unlabelled.
 */

/** Stop 1 — what the applicant provides: a passport and a photograph. */
function DocumentsArt() {
  return (
    <img
      src="/images/process/documents.svg"
      alt=""
      aria-hidden
      width={240}
      height={200}
      loading="lazy"
      decoding="async"
      className="h-[116px] w-auto select-none lg:h-[152px]"
      draggable={false}
    />
  );
}

/**
 * Stop 2 — the document check.
 *
 * The point of this one is the magnification, and the previous version did not
 * have any: it drew a circle with a number in it, at the same size the number
 * would have been anywhere else. A loupe that does not enlarge is just a
 * circle.
 *
 * So the number exists TWICE. Once in the document, set at the same 3px weight
 * as the lines around it and clipped by nothing — that is the passport number
 * as written. And once inside the lens, at ~4x, overflowing the glass on both
 * sides exactly as the reference's does, clipped to the lens circle so the
 * glyphs are cut by the rim. The rim's chromatic fringe and the highlight
 * across the top are what make the disc read as glass rather than as a hole.
 */
function MagnifierArt() {
  return (
    <div aria-hidden className="relative h-[128px] w-[212px] select-none">
      {/* The document under the glass. */}
      <div className="absolute left-0 top-3 w-[190px] space-y-[11px]">
        <span className="block h-[3px] w-full rounded-full bg-border" />
        <span className="block h-[3px] w-[72%] rounded-full bg-border" />
        <span className="relative block h-[3px] w-[88%] rounded-full bg-border">
          {/* The number as it is actually printed — the thing being read. */}
          <span
            data-numeric
            className="absolute -top-[7px] right-[6px] text-[9px] font-semibold leading-none tracking-tight text-subtle-foreground"
          >
            7320
          </span>
        </span>
        <span className="block h-[3px] w-[58%] rounded-full bg-border" />
      </div>

      {/* The lens. */}
      <div className="absolute right-1 top-[14px] h-[86px] w-[86px]">
        {/* Glass: a clipped disc holding the enlarged number. */}
        <div className="absolute inset-0 overflow-hidden rounded-full bg-[linear-gradient(150deg,#FFFFFF_0%,#FBFBFE_46%,#EFEFF6_100%)] shadow-e2">
          {/* Chromatic fringe. Two blurred crescents at the rim, which is the
              one cue that says "thick glass" and costs two divs. */}
          <span className="absolute -left-1 top-1/2 h-11 w-3 -translate-y-1/2 rounded-full bg-[#38BDF8] opacity-40 blur-[3px]" />
          <span className="absolute -right-1 top-1/2 h-11 w-3 -translate-y-1/2 rounded-full bg-[#F472B6] opacity-40 blur-[3px]" />

          <span
            data-numeric
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[34px] font-bold leading-none tracking-[-0.04em] text-foreground"
          >
            7320
          </span>

          {/* Specular highlight along the top of the dome. */}
          <span className="absolute left-1/2 top-[9px] h-4 w-12 -translate-x-1/2 rounded-full bg-white opacity-70 blur-[5px]" />
          {/* The reflected floor, at the bottom. */}
          <span className="absolute bottom-[7px] left-1/2 h-3.5 w-10 -translate-x-1/2 rounded-full bg-white opacity-50 blur-[4px]" />
        </div>

        {/* The rim, over the glass so it is never covered by the fringe. */}
        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-border-strong" />
      </div>

      {/* The handle, running down-left from the rim. */}
      <span className="absolute bottom-[16px] right-[68px] h-[30px] w-[5px] origin-top rotate-45 rounded-full bg-border-strong" />
      <span className="absolute bottom-[2px] right-[86px] h-[22px] w-[7px] origin-top rotate-45 rounded-full bg-[#3A3A46]" />
    </div>
  );
}

/** Stop 3 — the filed application: a stamped document. */
function FiledDocumentArt() {
  return (
    <div
      aria-hidden
      className="relative h-[96px] w-[76px] rounded-lg border border-border bg-surface shadow-e2"
    >
      <div className="space-y-2 p-3.5">
        <span className="block h-1 w-full rounded-full bg-border" />
        <span className="block h-1 w-4/5 rounded-full bg-border" />
        <span className="block h-1 w-full rounded-full bg-border" />
        <span className="block h-1 w-2/3 rounded-full bg-border" />
        <span className="block h-1 w-3/4 rounded-full bg-border" />
      </div>
      <span className="absolute -bottom-2.5 -right-2.5 flex h-9 w-9 rotate-[-12deg] items-center justify-center rounded-full border-2 border-success bg-surface text-[7px] font-bold uppercase leading-none tracking-tight text-success">
        Filed
      </span>
    </div>
  );
}

/** Stop 4 — the visa, delivered: the reference's open book. */
function DeliveredArt() {
  return (
    <img
      src="/images/process/delivered.svg"
      alt=""
      aria-hidden
      width={260}
      height={190}
      loading="lazy"
      decoding="async"
      className="h-[104px] w-auto select-none lg:h-[132px]"
      draggable={false}
    />
  );
}
