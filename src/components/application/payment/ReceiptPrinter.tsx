"use client";

/**
 * THE RECEIPT PRINTER
 * ---------------------------------------------------------------------------
 * The thermal dispenser from the reference the product owner supplied
 * (`image_video/reciept-ui/`). That folder carried `index.html` and
 * `style.css` and no `script.js`, so the machine, the paper and the three
 * animations are the reference's CSS — ported into section 8 of `globals.css`
 * with a `rcpt-` prefix — and the behaviour below is written from scratch to
 * drive them.
 *
 * ── WHAT THIS REPLACED ──
 *
 * A paper rectangle that slid up from behind the card on a spring. It was
 * fine, and it was also a receipt from nowhere: paper does not rise out of the
 * floor. The reference's idea is better because it names the object doing the
 * work. A card terminal feeds paper downward out of a slot, and everyone who
 * has ever bought anything knows what that means — the transaction is over and
 * this is the record of it. The animation is the argument for the receipt, not
 * decoration on top of one.
 *
 * ── EVERY FIGURE ON THE PAPER IS SOURCED ──
 *
 * `lines`, `subtotal`, `tax` and `total` all arrive already formatted from
 * `PaymentStep`, which reads them off `summary.fees` — the same model the
 * sticky price aside and the payment button read. This file does no
 * arithmetic and holds no fallback amounts (§16).
 *
 * THERE IS NO TRANSACTION NUMBER, and its absence is deliberate. The reference
 * prints "TXN-8849204192" under its barcode; this app has no such number at
 * this point in the flow — the application reference is minted at submission,
 * which happens after payment — and printing a plausible one would be
 * inventing a record. The barcode above it is `aria-hidden` texture and
 * encodes nothing, which is why it carries no caption claiming otherwise.
 *
 * ── THE STATE MACHINE ──
 *
 *   loaded    paper behind the slit, serrated lip showing. ~250ms, so the
 *             feed is something the reader watches begin rather than something
 *             already half done when the screen arrives.
 *   feeding   the 2.5s unroll. Not interruptible — a receipt being pulled back
 *             into a machine is not a thing that happens.
 *   printed   at rest. "Tear receipt" is offered from here.
 *   torn      the blade flashes and the paper is pulled away and gone. Its row
 *             then collapses, so the caption below rises into the space rather
 *             than sitting at the foot of an empty column.
 *
 * Under `prefers-reduced-motion` the feed and tear keyframes are switched off
 * in CSS and their end frames kept, so the paper still arrives and still
 * leaves — the states carry meaning and are not animation for its own sake.
 */

import { Printer, Scissors } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** One priced row on the paper. Both sides already formatted for display. */
export type ReceiptLine = {
  label: string;
  amount: string;
};

export type ReceiptDocument = {
  /** The headline figure, formatted. Also the TOTAL row at the foot. */
  amount: string;
  /** Cardholder as typed, or the fallback the caller chose. */
  name: string;
  destination: string;
  /** Last four digits, or undefined if the number never reached four. */
  lastFour?: string;
  /** When the payment settled. Passed in so the paper does not re-render
   *  itself a minute later showing a different time. */
  at: Date;
  /** The priced rows. Empty is valid — a fee breakdown may be unpublished. */
  lines: ReceiptLine[];
  /** Everything before tax, formatted. Omitted when there is no tax row. */
  subtotal?: string;
  /** The tax row, with its own label because the rate is in it. */
  tax?: ReceiptLine;
};

const dateFormat = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const timeFormat = new Intl.DateTimeFormat("en-IN", {
  hour: "2-digit",
  minute: "2-digit",
});

type PaperState = "loaded" | "feeding" | "printed" | "torn";

/** The reference's own feed duration, and the tear's. Kept in step with the
 *  keyframes in `globals.css` — if one moves, both move. */
const FEED_MS = 2500;
const TEAR_MS = 550;
const LOAD_MS = 250;

export function ReceiptPrinter({
  document: doc,
  /** Sub-heading under the machine. The overlay owns the words. */
  title,
  subtitle,
  /** The overlay's own primary action, rendered in the same button row. */
  action,
}: {
  document: ReceiptDocument;
  title: string;
  subtitle: React.ReactNode;
  action?: React.ReactNode;
}) {
  const [paper, setPaper] = useState<PaperState>("loaded");
  const [cutting, setCutting] = useState(false);
  /**
   * Whether the paper's row has given its space back.
   *
   * Separate from `paper` because it lags it: the space has to stay reserved
   * for the 550ms the torn paper is flying out of frame, or the caption jumps
   * up through the animation it is meant to be reacting to.
   */
  const [collapsed, setCollapsed] = useState(false);

  /**
   * Every timer this component starts, cleared together on unmount.
   *
   * The overlay can be dismissed mid-feed — `Continue` is reachable the whole
   * time — and a `setPaper` landing after that is a React warning and a leak.
   */
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const after = (ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  };

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    },
    [],
  );

  /** The paper feeds on its own. See the header: a terminal that waits to be
   *  asked before printing a receipt for a payment already taken is a machine
   *  nobody has ever used. */
  useEffect(() => {
    const load = setTimeout(() => setPaper("feeding"), LOAD_MS);
    const done = setTimeout(() => setPaper("printed"), LOAD_MS + FEED_MS);
    return () => {
      clearTimeout(load);
      clearTimeout(done);
    };
  }, []);

  const tear = () => {
    if (paper !== "printed") return;
    setCutting(true);
    setPaper("torn");
    after(TEAR_MS, () => {
      setCutting(false);
      setCollapsed(true);
    });
  };

  const reprint = () => {
    if (paper !== "torn") return;
    setCollapsed(false);
    setPaper("loaded");
    after(LOAD_MS, () => setPaper("feeding"));
    after(LOAD_MS + FEED_MS, () => setPaper("printed"));
  };

  return (
    <div className="flex w-full flex-col items-center">
      {/* ================================================================== */}
      {/* The machine                                                        */}
      {/* ================================================================== */}
      <div className="rcpt-machine" aria-hidden>
        <div className="rcpt-hood-top">
          <span className="rcpt-hood-highlight" />
        </div>
        <div className="rcpt-slit" />
        <span className="rcpt-blade" data-cutting={cutting ? "true" : "false"} />
        <div className="rcpt-hood-bottom" />

        {/* The clip. Cuts the paper flat at the slit line and lets its shadow
            fall outside — see the note on `.rcpt-viewport`. */}
        <div className="rcpt-viewport" data-collapsed={collapsed ? "true" : "false"}>
          <div className="rcpt-paper" data-state={paper}>
            <Paper document={doc} />
          </div>
        </div>
      </div>

      {/* THE RECEIPT, AGAIN, FOR A SCREEN READER.
          The paper above is `aria-hidden`: it is a clipped, 3D-transformed,
          serrated graphic whose reading order is at the mercy of a clip-path,
          and half of it is texture. This is the same record as an ordinary
          definition list, which is what a screen reader should be given. */}
      <div className="sr-only">
        <h3>Payment receipt</h3>
        <dl>
          <dt>Paid</dt>
          <dd>{doc.amount}</dd>
          <dt>Date</dt>
          <dd>
            {dateFormat.format(doc.at)}, {timeFormat.format(doc.at)}
          </dd>
          <dt>Name</dt>
          <dd>{doc.name}</dd>
          <dt>For</dt>
          <dd>{doc.destination}</dd>
          {doc.lastFour && (
            <>
              <dt>Card</dt>
              <dd>ending {doc.lastFour}</dd>
            </>
          )}
          {doc.lines.map((line) => (
            <div key={line.label}>
              <dt>{line.label}</dt>
              <dd>{line.amount}</dd>
            </div>
          ))}
          {doc.tax && (
            <>
              <dt>{doc.tax.label}</dt>
              <dd>{doc.tax.amount}</dd>
            </>
          )}
        </dl>
      </div>

      {/* ================================================================== */}
      {/* The caption and the controls                                       */}
      {/* ================================================================== */}
      <div className="mt-8 flex flex-col items-center text-center">
        <h2 className="text-xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">
          {subtitle}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {/* Tear and reprint are the same slot: one of the two is always the
              thing you would do next, and holding both would mean one of them
              is always dead. Neither exists while the paper is moving. */}
          {paper === "printed" && (
            <button
              type="button"
              onClick={tear}
              className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border border-dashed border-border-strong bg-surface px-6 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
            >
              <Scissors aria-hidden className="size-4" />
              Tear receipt
            </button>
          )}

          {paper === "torn" && (
            <button
              type="button"
              onClick={reprint}
              className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border border-border-strong bg-surface px-6 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
            >
              <Printer aria-hidden className="size-4" />
              Print again
            </button>
          )}

          {action}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The printed side of the paper.
 *
 * The reference's layout, in the reference's order: masthead and mark, the
 * total set large, the meta line, the priced rows, the totals block, then the
 * greeting and the barcode.
 */
function Paper({ document: doc }: { document: ReceiptDocument }) {
  return (
    <div className="rcpt-ink">
      {/* Masthead. The reference puts a logo tile on the right; ours is the
          wordmark's own initial, set in the brand blue — a real mark this app
          owns, rather than an image file the receipt would have to load. */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-extrabold tracking-[0.05em] text-[#0b4f8a]">
            ABIZON
          </p>
          <p className="mt-0.5 text-[10px] font-semibold tracking-[0.05em] text-[#555]">
            VISA SERVICE RECEIPT
          </p>
        </div>
        <span
          aria-hidden
          className="flex size-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#0b4f8a] text-[17px] font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
        >
          A
        </span>
      </div>

      {/* The figure, set large — the one thing on a receipt anybody reads. */}
      <p
        data-numeric
        className="text-[26px] font-bold leading-none tracking-tight text-[#111]"
      >
        {doc.amount}
      </p>
      <p className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.04em] text-[#888]">
        {dateFormat.format(doc.at)} · {timeFormat.format(doc.at)}
        {doc.lastFour ? ` · CARD ••${doc.lastFour}` : ""}
      </p>

      <div className="rcpt-rule" />

      <Row label="Name" value={doc.name} />
      <Row label="For" value={doc.destination} />

      {doc.lines.length > 0 && (
        <>
          <div className="rcpt-rule" />
          <div className="flex flex-col gap-2.5">
            {doc.lines.map((line) => (
              <div
                key={line.label}
                className="flex items-baseline justify-between gap-3 text-[11px]"
              >
                <span className="min-w-0 text-[#333]">{line.label}</span>
                <span data-numeric className="flex-shrink-0 font-semibold text-[#222]">
                  {line.amount}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="rcpt-rule" />

      <div className="flex flex-col gap-1.5 text-[11px]">
        {doc.subtotal && (
          <div className="flex justify-between text-[#777]">
            <span>Subtotal</span>
            <span data-numeric>{doc.subtotal}</span>
          </div>
        )}
        {doc.tax && (
          <div className="flex justify-between text-[#777]">
            <span>{doc.tax.label}</span>
            <span data-numeric>{doc.tax.amount}</span>
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-[#ccc] pt-2 text-[12px] font-bold text-[#111]">
          <span>TOTAL</span>
          <span data-numeric>{doc.amount}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2.5 text-center">
        <p className="text-[10px] font-semibold tracking-[0.1em] text-[#555]">
          THANK YOU.
        </p>
        {/* Texture, not data. See the header on why nothing is printed beneath
            it. */}
        <span aria-hidden className="rcpt-barcode" />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5 text-[11px]">
      <span className="flex-shrink-0 text-[#888]">{label}</span>
      <span className="truncate font-medium text-[#333]">{value}</span>
    </div>
  );
}
