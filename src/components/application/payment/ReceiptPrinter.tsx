"use client";

/**
 * THE RECEIPT PRINTER
 * ---------------------------------------------------------------------------
 * The thermal dispenser from the reference the product owner supplied
 * (`image_video/reciept-ui/`), and this time all three of its files are
 * accounted for. `index.html` and `style.css` arrived as themselves; the third
 * turned out to be inside the PDF sitting beside them, which is the reference's
 * `script.js`. Everything below — the four states, the 2.5s feed, the 550ms
 * tear, the 300ms reset before a re-print, the two motion modes, the synced
 * audio — is that file's behaviour, in this codebase's idiom.
 *
 * ── WHAT A PRESS DOES, IN ORDER ──
 *
 *   PRINT        If the paper is already out, it is pulled back first and the
 *                feed starts 300ms later — a printer cannot print a second
 *                copy over the first one, and the reference models that.
 *                Then: state `printing` for exactly 2500ms with the motor
 *                sound generated for exactly 2500ms, and `printed` after.
 *   TEAR         Only from `printed`. The blade flashes, the cutter sound
 *                fires, the sheet is pulled sideways over 550ms and is gone;
 *                the paper resets to `retracted` behind the slit and the
 *                primary button becomes Print again.
 *   CLASSIC /    Two genuinely different animations and two different voices,
 *   SMOOTH       not a label change. Classic is a stepper: an uneven five-stage
 *                feed, a judder on the print, and fourteen audible pulses.
 *                Smooth is one continuous unroll with an arch in it.
 *   SOUND        Off by default. See the note on `DEFAULT_SOUND`.
 *
 * ── THE FIRST COPY PRINTS ITSELF ──
 *
 * The reference opens with the paper loaded and waits to be asked. This does
 * not, and the difference is the difference between a demo and a checkout: a
 * terminal that has just taken a payment prints the receipt, it does not offer
 * to. So the first feed runs on arrival and every button operates the machine
 * from there — which is also why the sound ships off, since nothing can have
 * been consented to before the screen has even been seen.
 *
 * ── EVERY FIGURE ON THE PAPER IS SOURCED ──
 *
 * `lines`, `subtotal`, `tax` and the total arrive already formatted from
 * `PaymentStep`, which reads them off `summary.fees` — the same model the
 * sticky price aside and the payment button read. This file does no arithmetic
 * and holds no fallback amounts (§16).
 *
 * THERE IS NO TRANSACTION NUMBER, and its absence is deliberate. The reference
 * prints "TXN-8849204192" under its barcode; this app has no such number at
 * this point in the flow — the application reference is minted at submission,
 * which happens after payment — and printing a plausible one would be
 * inventing a record. The barcode itself is `aria-hidden` texture and encodes
 * nothing, which is why it carries no caption claiming otherwise.
 */

import { Printer, Scissors, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PrinterAudio, type PrinterMode } from "@/lib/application/printerSound";
import { cn } from "@/lib/utils";

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

type PaperState = "retracted" | "printing" | "printed" | "tearing";

/**
 * The reference's own durations, to the millisecond, and they are load-bearing
 * rather than taste: `FEED_MS` is the length of the keyframes in section 8 of
 * `globals.css` AND the length the motor sound is generated for. If one moves,
 * all three move together.
 */
const FEED_MS = 2500;
const TEAR_MS = 550;
/** The pull-back before a second copy. Long enough to read as a rewind. */
const RESET_MS = 300;

/**
 * SOUND SHIPS OFF, and this is the one place this build departs from the
 * reference on purpose.
 *
 * The reference defaults it on, which is right for a page whose entire subject
 * is a printer. This is a checkout, the first feed runs without anybody asking
 * for it, and a payment confirmation that makes machine noises at somebody who
 * did not ask is a bug however well it is synthesised. The toggle is on screen
 * and the synthesiser is complete; flip this to `true` to ship it on.
 */
const DEFAULT_SOUND = false;

/** Which motion the machine uses. Classic is the stepper — see the header. */
const DEFAULT_MODE: PrinterMode = "classic";

export function ReceiptPrinter({
  document: doc,
  /** The payment headline. The overlay owns the claim; this owns the machine. */
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
  const [paper, setPaper] = useState<PaperState>("retracted");
  const [mode, setMode] = useState<PrinterMode>(DEFAULT_MODE);
  const [sound, setSound] = useState(DEFAULT_SOUND);
  const [cutting, setCutting] = useState(false);
  /**
   * Whether the paper's row has given its space back.
   *
   * Separate from `paper` because it lags it: the space has to stay reserved
   * for the 550ms the torn sheet is flying out of frame, or the caption jumps
   * up through the animation it is meant to be reacting to.
   */
  const [collapsed, setCollapsed] = useState(false);
  /** What the machine last did, printed under the payment headline. */
  const [status, setStatus] = useState("Your receipt is printing…");

  /**
   * Every timer this component starts, cleared together on unmount.
   *
   * The overlay can be dismissed mid-feed — Continue is reachable the whole
   * time — and a `setPaper` landing after that is a React warning and a leak.
   */
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const after = useCallback((ms: number, run: () => void) => {
    timers.current.push(setTimeout(run, ms));
  }, []);

  /**
   * The synthesiser, and the current preference as a ref beside it.
   *
   * The ref exists because `feed` is a `useCallback` the mount effect depends
   * on: reading `sound` from state would put it in the dependency list, and
   * toggling the speaker would re-run the effect and reprint the receipt.
   */
  const audio = useRef<PrinterAudio | null>(null);
  const soundOn = useRef(DEFAULT_SOUND);
  // Mirrored in an effect rather than during render: a ref written while
  // rendering is torn under concurrent React, and every reader of this one is
  // a press or a timer, both of which run after the commit that set it.
  useEffect(() => {
    soundOn.current = sound;
  }, [sound]);

  const play = useCallback((run: (a: PrinterAudio) => void) => {
    if (!soundOn.current) return;
    audio.current ??= new PrinterAudio();
    run(audio.current);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      audio.current?.close();
      audio.current = null;
    },
    [],
  );

  /* ---------------------------------------------------------------------- */
  /* The machine                                                            */
  /* ---------------------------------------------------------------------- */

  /**
   * The current state, mirrored in a ref.
   *
   * The handlers below guard on it, and reading the state variable would put
   * them one render behind a press that arrives during a transition.
   */
  const paperRef = useRef<PaperState>("retracted");
  useEffect(() => {
    paperRef.current = paper;
  }, [paper]);

  /** Feed a sheet. Returns immediately; the states land on timers. */
  const feed = useCallback(
    (using: PrinterMode) => {
      setCollapsed(false);
      // Written here as well as in the effect above, because two presses in
      // the same frame must not both get past the guard in `print`.
      paperRef.current = "printing";
      setPaper("printing");
      setStatus("Your receipt is printing…");
      play((a) => a.motor(using, FEED_MS));
      after(FEED_MS, () => {
        setPaper("printed");
        setStatus("You are all set — tear it off, or keep going.");
      });
    },
    [after, play],
  );

  const print = () => {
    if (paperRef.current === "printing" || paperRef.current === "tearing") return;

    // A second copy cannot be printed over the first. The sheet is pulled back
    // behind the slit and the feed starts after it — the reference's own
    // sequence, and the only one that makes physical sense.
    if (paperRef.current === "printed") {
      paperRef.current = "retracted";
      setPaper("retracted");
      setCollapsed(false);
      setStatus("Loading a fresh copy…");
      after(RESET_MS, () => feed(mode));
      return;
    }

    feed(mode);
  };

  const tear = () => {
    if (paperRef.current !== "printed") return;

    play((a) => a.tear());
    paperRef.current = "tearing";
    setCutting(true);
    setPaper("tearing");
    setStatus("Cut and torn. Print another whenever you like.");

    after(TEAR_MS, () => {
      setCutting(false);
      setPaper("retracted");
      setCollapsed(true);
    });
  };

  /** The first copy prints itself. See the header. */
  useEffect(() => {
    const start = setTimeout(() => feed(DEFAULT_MODE), 250);
    return () => clearTimeout(start);
  }, [feed]);

  const moving = paper === "printing" || paper === "tearing";
  const hasPaper = paper === "printed";

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
          <div className="rcpt-paper" data-state={paper} data-mode={mode}>
            <Paper
              document={doc}
              juddering={paper === "printing" && mode === "classic"}
            />
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
      <div className="mt-9 flex flex-col items-center text-center">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
        {/* What the machine is doing, live. A polite region rather than an
            alert: it is a running commentary on something already visible, and
            it must not interrupt whatever is being read. */}
        <p
          role="status"
          className="mt-1.5 text-2xs font-medium uppercase tracking-[0.1em] text-subtle-foreground"
        >
          {status}
        </p>

        {/* THE MACHINE'S OWN SETTINGS, on their own rail above the actions.
            Motion mode and sound are properties of the printer; Print, Tear and
            Continue are things you do to it. Mixing the two into one row put a
            speaker icon beside the button that leaves the screen. */}
        <div className="mt-6 flex items-center gap-1 rounded-full border border-border bg-surface-sunken p-1">
          <ModeButton
            label="Classic"
            hint="Stepper motor — the sheet steps out and the print judders"
            active={mode === "classic"}
            disabled={moving}
            onClick={() => setMode("classic")}
          />
          <ModeButton
            label="Smooth"
            hint="One continuous unroll"
            active={mode === "smooth"}
            disabled={moving}
            onClick={() => setMode("smooth")}
          />

          <span aria-hidden className="mx-1 h-5 w-px bg-border" />

          <button
            type="button"
            onClick={() => setSound((on) => !on)}
            aria-pressed={sound}
            title={sound ? "Turn the printer sound off" : "Turn the printer sound on"}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-surface hover:text-foreground"
          >
            {sound ? (
              <Volume2 aria-hidden className="size-4" />
            ) : (
              <VolumeX aria-hidden className="size-4" />
            )}
            <span className="sr-only">Printer sound</span>
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={print}
            disabled={moving}
            className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border border-border-strong bg-surface px-6 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-40"
          >
            <Printer aria-hidden className="size-4" />
            {paper === "printing"
              ? "Printing…"
              : hasPaper
                ? "Re-print receipt"
                : "Print receipt"}
          </button>

          {/* Present in every state and disabled where it cannot act, rather
              than appearing and disappearing. A control that vanishes moves the
              button beside it under the cursor mid-press. */}
          <button
            type="button"
            onClick={tear}
            disabled={!hasPaper}
            className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-full border border-dashed border-border-strong bg-surface px-6 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-40"
          >
            <Scissors aria-hidden className="size-4" />
            Tear receipt
          </button>

          {action}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ModeButton({
  label,
  hint,
  active,
  disabled,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      title={hint}
      className={cn(
        "h-8 cursor-pointer rounded-full px-3.5 text-2xs font-semibold",
        "transition-[background-color,color,box-shadow] duration-[--duration-fast]",
        "disabled:pointer-events-none disabled:opacity-45",
        active
          ? "bg-surface text-foreground shadow-e1"
          : "text-subtle-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

/**
 * The printed side of the paper.
 *
 * The reference's layout, in the reference's order and at the reference's type
 * sizes — masthead and mark, the total set large, the meta line, the priced
 * rows, the totals block, the greeting and the barcode. The classes are in
 * section 8 of `globals.css` rather than utilities here because every size on
 * the sheet is an `em` of one root that scales with the machine, which is a
 * relationship Tailwind's fixed scale cannot express.
 *
 * WHERE THE NAME AND THE DESTINATION WENT. The reference has no row for
 * either; it carries a company name, a document title and a meta line. So this
 * puts the destination in the title — it is what the receipt is FOR — and the
 * cardholder in the meta beneath the date, which keeps the sheet the
 * reference's shape while still saying who paid for what.
 */
function Paper({
  document: doc,
  juddering,
}: {
  document: ReceiptDocument;
  juddering: boolean;
}) {
  return (
    <div className="rcpt-ink" data-vibrating={juddering ? "true" : "false"}>
      <div className="rcpt-header">
        <div className="rcpt-brand-block">
          <p className="rcpt-brand">ABIZON</p>
          <p className="rcpt-brand-sub">{doc.destination.toUpperCase()}</p>
        </div>
        <span aria-hidden className="rcpt-badge">
          A
        </span>
      </div>

      <div className="rcpt-amount-block">
        <p data-numeric className="rcpt-amount">
          {doc.amount}
        </p>
        <p className="rcpt-meta">
          {dateFormat.format(doc.at)} · {timeFormat.format(doc.at)}
          {doc.lastFour ? ` · CARD ••${doc.lastFour}` : ""}
        </p>
        <p className="rcpt-meta">Paid by {doc.name}</p>
      </div>

      {doc.lines.length > 0 && (
        <>
          <div className="rcpt-rule" />
          <div className="rcpt-items">
            {doc.lines.map((line) => (
              <div key={line.label} className="rcpt-item">
                <span className="rcpt-item-name">{line.label}</span>
                <span data-numeric className="rcpt-item-price">
                  {line.amount}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="rcpt-rule" />

      <div className="rcpt-totals">
        {doc.subtotal && (
          <div className="rcpt-total-row">
            <span>Subtotal</span>
            <span data-numeric>{doc.subtotal}</span>
          </div>
        )}
        {doc.tax && (
          <div className="rcpt-total-row">
            <span>{doc.tax.label}</span>
            <span data-numeric>{doc.tax.amount}</span>
          </div>
        )}

        <div className="rcpt-grand">
          <span>TOTAL</span>
          <span data-numeric>{doc.amount}</span>
        </div>
      </div>

      <div className="rcpt-footer">
        <p className="rcpt-footer-msg">HAVE A NICE TRIP!</p>
        {/* Texture, not data. See the header on why nothing is printed under
            it. */}
        <span aria-hidden className="rcpt-barcode-wrap">
          <span className="rcpt-barcode" />
        </span>
      </div>
    </div>
  );
}
