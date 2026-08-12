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
 * The fee logic below the road survives from the previous version. It is a real
 * commitment stated elsewhere in the product (pay-on-approval in
 * `CountryApplicationPanel`, the waiver and refund terms on /terms), not a
 * statistic.
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
    art: <PhotoFrameArt />,
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

const OUTCOMES = [
  { case: "Your visa arrives on time", result: "You pay the Keyrise fee" },
  {
    case: "Your visa arrives even one second late",
    result: "The Keyrise fee is waived",
  },
  { case: "Your visa is refused", result: "The government fee is refunded" },
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
  1: { left: "15%", top: "21%", width: "33%", row: true },
  2: { left: "30%", top: "56%", width: "24%" },
  3: { left: "62%", top: "60%", width: "26%", row: true },
  4: { left: "79%", top: "30%", width: "20%", indent: true },
};

export function VisaProcess({ countryName }: { countryName?: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
      <h2 className="type-h2 text-foreground js-reveal-heading">
        The visa process
      </h2>

      {/* ── The road, lg and up ─────────────────────────────────────────── */}
      <div className="relative mt-6 hidden aspect-[1200/720] w-full lg:block">
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
                  fontSize={20}
                  fontWeight={700}
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
                  place.row ? "flex items-start gap-5" : ""
                } ${place.indent ? "pl-12" : ""}`}
                style={{ left: place.left, top: place.top, width: place.width }}
              >
                {place.row && <div className="shrink-0">{step.art}</div>}
                <div className="min-w-0">
                  <p className="text-base font-bold leading-snug text-foreground">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {step.body}
                  </p>
                  {!place.row && <div className="mt-6">{step.art}</div>}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── The same four steps, below lg ───────────────────────────────── */}
      <ol className="mt-8 space-y-8 lg:hidden">
        {STEPS.map((step, index) => (
          <li key={step.num} className="js-info-item relative flex gap-5">
            {/* The rail, drawn per item so the last one has none below it. */}
            {index < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[21px] top-11 bottom-[-2rem] w-px border-l-2 border-dashed border-border-strong"
              />
            )}
            <span
              data-numeric
              aria-hidden
              className="relative z-raised flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#0B0B0D] text-base font-bold text-white"
            >
              {step.num}
            </span>
            <div className="min-w-0 pt-1.5">
              <p className="text-sm font-bold leading-snug text-foreground">
                {step.title}
              </p>
              <p className="mt-1.5 text-xs text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* ── What it costs in each case ──────────────────────────────────── */}
      <div className="mt-14 md:mt-20">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          What you pay, in each case
        </p>
        <dl className="mt-3 divide-y divide-border border-t border-border">
          {OUTCOMES.map((outcome) => (
            <div
              key={outcome.case}
              className="flex items-baseline justify-between gap-6 py-3"
            >
              <dt className="text-xs text-muted-foreground">{outcome.case}</dt>
              <dd className="shrink-0 text-xs font-semibold text-foreground">
                {outcome.result}
              </dd>
            </div>
          ))}
        </dl>
        {countryName && (
          <p className="mt-3 text-2xs text-muted-foreground">
            {/* `{" "}` is explicit: JSX drops the whitespace between an
                expression and the text that follows it across a line break,
                which rendered this as "a Dubaivisa is made by". */}
            The decision on a {countryName}{" "}
            visa is made by the destination&rsquo;s immigration authority.
            Keyrise guarantees the timing of the filing, not the outcome.
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stop illustrations                                                         */
/* -------------------------------------------------------------------------- */
/*
 * Drawn, not sourced. The reference's are photographs — a passport photo of a
 * real person, a real passport number under a loupe — and none of them are
 * Keyrise's to use. All four are `aria-hidden`: every one sits beside a caption
 * that already says the same thing in words.
 */

/** Stop 1 — the applicant's photograph, in its crop guides. */
function PhotoFrameArt() {
  return (
    <div aria-hidden className="relative h-[86px] w-[86px]">
      <span className="absolute -left-2 -top-2 h-3.5 w-3.5 border-l border-t border-border-strong" />
      <span className="absolute -right-2 -top-2 h-3.5 w-3.5 border-r border-t border-border-strong" />
      <span className="absolute -bottom-2 -left-2 h-3.5 w-3.5 border-b border-l border-border-strong" />
      <span className="absolute -bottom-2 -right-2 h-3.5 w-3.5 border-b border-r border-border-strong" />
      <div className="h-full w-full overflow-hidden rounded-md bg-surface-sunken">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle cx="50" cy="38" r="17" className="fill-slate-400" />
          <path
            d="M15 100c0-19 16-31 35-31s35 12 35 31z"
            className="fill-slate-400"
          />
        </svg>
      </div>
    </div>
  );
}

/** Stop 2 — the document check: a loupe over a passport number. */
function MagnifierArt() {
  return (
    <div aria-hidden className="relative w-[190px]">
      <div className="space-y-2 pr-8">
        <span className="block h-1.5 w-full rounded-full bg-border" />
        <span className="block h-1.5 w-3/4 rounded-full bg-border" />
        <span className="block h-1.5 w-5/6 rounded-full bg-border" />
      </div>
      <div className="absolute -bottom-6 right-0 flex h-[68px] w-[68px] items-center justify-center rounded-full border-[3px] border-slate-700 bg-surface shadow-e2">
        <span
          data-numeric
          className="text-lg font-bold tracking-tight text-foreground"
        >
          7320
        </span>
      </div>
      <span
        className="absolute -bottom-11 right-14 block h-6 w-[3px] origin-top rotate-45 rounded-full bg-slate-700"
      />
    </div>
  );
}

/** Stop 3 — the filed application: a stamped document. */
function FiledDocumentArt() {
  return (
    <div
      aria-hidden
      className="relative h-[86px] w-[68px] rounded-md border border-border bg-surface shadow-e2"
    >
      <div className="space-y-1.5 p-3">
        <span className="block h-1 w-full rounded-full bg-border" />
        <span className="block h-1 w-4/5 rounded-full bg-border" />
        <span className="block h-1 w-full rounded-full bg-border" />
        <span className="block h-1 w-2/3 rounded-full bg-border" />
      </div>
      <span className="absolute -bottom-2 -right-2 flex h-8 w-8 rotate-[-12deg] items-center justify-center rounded-full border-2 border-success text-[7px] font-bold uppercase leading-none tracking-tight text-success">
        Filed
      </span>
    </div>
  );
}

/** Stop 4 — the visa itself, granted. */
function DeliveredArt() {
  return (
    <div
      aria-hidden
      className="w-[150px] rounded-lg border border-border bg-surface p-3 shadow-e3"
    >
      <div className="flex items-center justify-between">
        <span className="block h-1.5 w-12 rounded-full bg-border" />
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success">
          <svg viewBox="0 0 20 20" className="h-3 w-3 fill-white">
            <path d="M7.6 14.2 3.8 10.4l1.4-1.4 2.4 2.4 6-6 1.4 1.4z" />
          </svg>
        </span>
      </div>
      <div className="mt-3 h-8 rounded bg-surface-sunken" />
      <div className="mt-2 space-y-1.5">
        <span className="block h-1 w-full rounded-full bg-border" />
        <span className="block h-1 w-3/5 rounded-full bg-border" />
      </div>
    </div>
  );
}
