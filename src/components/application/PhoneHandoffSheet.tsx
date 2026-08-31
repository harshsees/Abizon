"use client";

/**
 * UPLOAD FROM PHONE
 * ---------------------------------------------------------------------------
 * The single most useful control on the documents screen: the passport is in
 * the applicant's hand and the camera that can photograph it well is in their
 * pocket, not in the laptop lid.
 *
 * Two screens, to the reference:
 *
 *   1. WHAT IS ABOUT TO HAPPEN. A three-step explainer — scan, connect,
 *      upload — with the illustrations drawn rather than fetched. It exists
 *      because "point your phone at this square" is a strange instruction if
 *      you have not been told what the square does, and because the screen
 *      after it is a QR code and nothing else.
 *   2. THE CODE. Large, quiet, and the only thing on the panel.
 *
 * ── The code is real, and it is aimed ──
 *
 * The build this replaces would only draw a code for a signed-in applicant and
 * showed a sign-in link to everybody else. That was defensible when the link
 * was a bare `/apply?country=…` — without an account there really was nothing
 * for the phone to join — but it meant the most common way to meet this
 * feature was a wall.
 *
 * So the link now carries where the application is: the step, the traveller's
 * POSITION in the party, and the kind of document still outstanding. See the
 * note at the top of `context.tsx` for what that is and is not allowed to be —
 * screen coordinates, never values. A signed-in phone resumes the same
 * application through `sync.ts` and lands on the exact capture screen the
 * laptop was looking at. A phone without an account still opens the right
 * screen of a fresh application, which is a worse outcome than the first one
 * and a far better one than a sign-in wall.
 *
 * ── What it still does not claim ──
 *
 * There is no live channel back to this tab. So this screen does not say a
 * document has arrived, and does not say "synced in real time" over a page
 * that does not poll. It says uploads appear here once the page reloads, and
 * gives the button that reloads it. The previous build of this flow was
 * deleted for the opposite behaviour, and the sentence it was deleted for is
 * not coming back.
 */

import { ArrowLeft, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

export function PhoneHandoffSheet({
  applyUrl,
  signedIn,
  onClose,
}: {
  /** Absolute URL to this application, already carrying the hand-off params. */
  applyUrl: string;
  /**
   * Whether the phone will join THIS application or start its own. Changes one
   * sentence; it no longer decides whether there is a code at all.
   */
  signedIn: boolean;
  onClose: () => void;
}) {
  const [screen, setScreen] = useState<"intro" | "code">("intro");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center overflow-y-auto bg-overlay px-5 py-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-handoff-title"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-[720px] rounded-[26px] bg-surface px-6 py-9 shadow-e4 sm:px-10 sm:py-11"
      >
        {screen === "code" && (
          <button
            type="button"
            onClick={() => setScreen("intro")}
            aria-label="Back"
            className="absolute left-4 top-4 flex size-9 cursor-pointer items-center justify-center rounded-full bg-surface-sunken text-subtle-foreground transition-colors hover:text-foreground sm:left-6 sm:top-6"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex size-9 cursor-pointer items-center justify-center rounded-full bg-surface-sunken text-subtle-foreground transition-colors hover:text-foreground sm:right-6 sm:top-6"
        >
          <X aria-hidden className="size-4" />
        </button>

        <div className="flex justify-center">
          <BuzzingPhone />
        </div>

        {screen === "intro" ? (
          <IntroScreen signedIn={signedIn} onContinue={() => setScreen("code")} />
        ) : (
          <CodeScreen applyUrl={applyUrl} signedIn={signedIn} />
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Screen one — what is about to happen                                       */
/* -------------------------------------------------------------------------- */

function IntroScreen({
  signedIn,
  onContinue,
}: {
  signedIn: boolean;
  onContinue: () => void;
}) {
  return (
    <>
      <h2
        id="phone-handoff-title"
        className="mt-5 text-balance text-center text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[30px]"
      >
        Upload documents using your phone
      </h2>
      <p className="mt-2.5 text-balance text-center text-[14px] text-muted-foreground sm:text-[15px]">
        Scan, connect, and securely upload your documents in real time
      </p>

      <Stepper />

      <ol className="mt-7 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-5">
        <Step
          caption="Scan the QR code to securely connect your phone"
          art={<ScanArt />}
        />
        <Step
          caption="Your phone can now be used as an additional upload device"
          art={<ConnectArt />}
        />
        <Step
          caption="Your uploaded documents appear here when you refresh"
          art={<SyncArt />}
        />
      </ol>

      <button
        type="button"
        onClick={onContinue}
        className="mt-9 inline-flex h-[54px] w-full cursor-pointer items-center justify-center rounded-2xl bg-primary text-[15px] font-bold text-on-primary shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-primary-hover active:scale-[0.995] motion-reduce:transform-none"
      >
        Continue on phone
      </button>

      {/* THE SECURITY LINE, WORDED TO WHAT IS TRUE ON EACH PATH.
          The reference prints one absolute claim here. This product cannot
          make it unconditionally: without an account nothing is transmitted at
          all, so "protected in transit" would be describing a journey that
          does not happen. Signed in, documents go over TLS to storage that is
          encrypted at rest, and the sentence is the reference's. */}
      <p className="mt-3.5 flex items-center justify-center gap-1.5 text-center text-[12px] text-muted-foreground">
        <ShieldCheck aria-hidden className="size-3.5" />
        {signedIn
          ? "Encrypted in transit and at rest"
          : "Nothing leaves your phone until you sign in"}
      </p>
    </>
  );
}

/**
 * 1 — 2 — 3, with the dotted runs between them.
 *
 * Purely a picture of the three columns below; it is `aria-hidden` because a
 * screen reader is about to be read the three steps themselves as a list, and
 * hearing "one two three" first adds nothing to that.
 */
function Stepper() {
  return (
    <div aria-hidden className="mt-8 flex items-center justify-center gap-0 px-2">
      {[1, 2, 3].map((number, index) => (
        <div key={number} className="flex flex-1 items-center last:flex-none">
          <span className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-subtle text-[13px] font-bold text-primary">
            {number}
          </span>
          {index < 2 && (
            <span className="relative mx-1.5 h-px flex-1 border-t border-dashed border-border-strong">
              <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-border-strong" />
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function Step({ caption, art }: { caption: string; art: React.ReactNode }) {
  return (
    <li className="flex flex-col items-center">
      <div className="flex h-[132px] w-full items-center justify-center">{art}</div>
      <p className="mt-3 text-balance px-2 text-center text-[13px] leading-snug text-subtle-foreground">
        {caption}
      </p>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Screen two — the code                                                      */
/* -------------------------------------------------------------------------- */

function CodeScreen({
  applyUrl,
  signedIn,
}: {
  applyUrl: string;
  signedIn: boolean;
}) {
  const [qr, setQr] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Imported on open rather than at module scope: the encoder is dead weight
    // on a page nobody has asked to hand off from.
    void import("qrcode")
      .then((mod) =>
        mod.default.toDataURL(applyUrl, {
          margin: 1,
          width: 640,
          errorCorrectionLevel: "M",
          color: { dark: "#0f172a", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [applyUrl]);

  return (
    <>
      <h2
        id="phone-handoff-title"
        className="mt-5 text-center text-[26px] font-bold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[30px]"
      >
        Scan with your phone camera
      </h2>

      <div className="mt-7 flex justify-center">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-e1">
          {qr ? (
            /* eslint-disable-next-line @next/next/no-img-element -- a data: URL
               generated in this tab; there is nothing to optimise or cache. */
            <img
              src={qr}
              alt="QR code that opens this application on your phone"
              className="size-[232px]"
            />
          ) : (
            <div className="flex size-[232px] items-center justify-center text-2xs text-muted-foreground">
              {failed ? "Could not draw the code" : "Preparing…"}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto mt-7 flex w-full max-w-[440px] items-start gap-3.5 rounded-2xl bg-surface-sunken p-4">
        <span
          aria-hidden
          className="flex size-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-on-primary"
        >
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-bold text-foreground">Secure &amp; private</p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
            {signedIn
              ? "The link opens this same application on your phone, signed in as you. Your connection is encrypted and your documents are never shared."
              : "The link opens this application on your phone. Sign in there and it will join this one; otherwise the phone keeps its own copy."}
          </p>
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] leading-relaxed text-muted-foreground">
        Uploads made on your phone appear here once this page reloads.
      </p>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mx-auto mt-3 flex h-11 w-full max-w-[280px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface text-[13px] font-bold text-foreground transition-colors hover:bg-surface-sunken"
      >
        <RefreshCw aria-hidden className="size-3.5" />
        Check for it now
      </button>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* The drawings                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Everything below is inline SVG, and that is a decision rather than an
 * accident. The reference's three illustrations are flat two-colour line art
 * of a phone, a laptop and a document list — objects this project can draw in
 * a few dozen path commands. Fetching three PNGs would cost three requests, a
 * hosting decision and a theme problem (they are drawn on white and this app
 * has a dark mode), for pictures whose entire content is "a phone" and "a
 * laptop".
 *
 * They use the palette tokens, so they follow the theme. Nothing in them is
 * text, so nothing in them needs translating.
 */

/** The mark above the heading on both screens: a handset, buzzing. */
function BuzzingPhone() {
  return (
    <svg
      viewBox="0 0 56 40"
      className="h-11 w-auto"
      fill="none"
      aria-hidden
    >
      <rect
        x="22"
        y="4"
        width="12"
        height="32"
        rx="3"
        className="stroke-foreground"
        strokeWidth="1.6"
      />
      <rect x="26" y="7" width="4" height="1.4" rx="0.7" className="fill-foreground" />
      {[0, 1, 2].map((index) => (
        <g key={index} className="stroke-primary" strokeWidth="1.6" strokeLinecap="round">
          <line
            x1={18 - index * 4}
            y1={14 + index * 3}
            x2={14 - index * 4}
            y2={12 + index * 4}
          />
          <line
            x1={38 + index * 4}
            y1={14 + index * 3}
            x2={42 + index * 4}
            y2={12 + index * 4}
          />
        </g>
      ))}
    </svg>
  );
}

/** Step one: a phone with a code on it. */
function ScanArt() {
  return (
    <svg viewBox="0 0 140 120" className="h-full w-auto" fill="none" aria-hidden>
      <circle cx="62" cy="62" r="44" className="fill-primary-subtle" opacity="0.5" />

      <rect
        x="40"
        y="12"
        width="58"
        height="96"
        rx="10"
        className="fill-surface stroke-foreground"
        strokeWidth="2"
      />
      <rect x="58" y="17" width="22" height="4" rx="2" className="fill-foreground" />

      {/* The code. A fixed pattern, not a real encoding — it is 30px wide on
          screen and a real code at that size would be unreadable noise that
          somebody would eventually try to scan. */}
      <g className="fill-foreground">
        {[
          [0, 0], [1, 0], [2, 0], [4, 0], [6, 0], [7, 0], [8, 0],
          [0, 1], [2, 1], [4, 1], [5, 1], [6, 1], [8, 1],
          [0, 2], [1, 2], [2, 2], [3, 2], [6, 2], [7, 2], [8, 2],
          [1, 3], [3, 3], [4, 3], [5, 3], [7, 3],
          [0, 4], [2, 4], [3, 4], [6, 4], [8, 4],
          [0, 5], [1, 5], [4, 5], [5, 5], [7, 5], [8, 5],
          [0, 6], [1, 6], [2, 6], [4, 6], [6, 6], [7, 6], [8, 6],
          [0, 7], [2, 7], [3, 7], [5, 7], [8, 7],
          [0, 8], [1, 8], [2, 8], [4, 8], [5, 8], [7, 8], [8, 8],
        ].map(([x, y]) => (
          <rect key={`${x}-${y}`} x={53 + x * 3.6} y={41 + y * 3.6} width="3" height="3" />
        ))}
      </g>

      {/* The reticle. */}
      {[
        "M50 46v-6h6", "M88 46v-6h-6", "M50 74v6h6", "M88 74v6h-6",
      ].map((d) => (
        <path
          key={d}
          d={d}
          className="stroke-primary"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
        />
      ))}

      <g className="stroke-primary" strokeWidth="2" strokeLinecap="round">
        <line x1="106" y1="34" x2="114" y2="30" />
        <line x1="108" y1="44" x2="117" y2="44" />
      </g>
    </svg>
  );
}

/** Step two: the laptop and the phone, paired, with a padlock between them. */
function ConnectArt() {
  return (
    <svg viewBox="0 0 160 120" className="h-full w-auto" fill="none" aria-hidden>
      {/* The arc joining the two devices. */}
      <path
        d="M34 34a58 58 0 0 1 92 0"
        className="stroke-primary"
        strokeWidth="2"
        strokeDasharray="6 6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Laptop. */}
      <rect
        x="18"
        y="40"
        width="82"
        height="54"
        rx="5"
        className="fill-surface stroke-foreground"
        strokeWidth="2"
      />
      <rect x="10" y="94" width="98" height="5" rx="2.5" className="fill-border-strong" />
      <circle cx="40" cy="60" r="8" className="fill-border" />
      <path d="M28 82a12 12 0 0 1 24 0z" className="fill-border" />
      {[0, 1, 2].map((row) => (
        <rect
          key={row}
          x="58"
          y={54 + row * 11}
          width={row === 2 ? 20 : 30}
          height="4"
          rx="2"
          className="fill-border"
        />
      ))}
      <circle cx="98" cy="58" r="9" className="fill-primary" />
      <path
        d="M94 58l3 3 5-6"
        className="stroke-on-primary"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Phone. */}
      <rect
        x="112"
        y="46"
        width="34"
        height="56"
        rx="6"
        className="fill-surface stroke-foreground"
        strokeWidth="2"
      />
      <circle cx="129" cy="64" r="6" className="fill-border" />
      <path d="M120 84a9 9 0 0 1 18 0z" className="fill-border" />

      {/* Padlock. */}
      <circle cx="80" cy="98" r="15" className="fill-surface stroke-border" strokeWidth="1.5" />
      <rect x="73" y="96" width="14" height="11" rx="2.5" className="fill-subtle-foreground" />
      <path
        d="M76.5 96v-3a3.5 3.5 0 0 1 7 0v3"
        className="stroke-subtle-foreground"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

/** Step three: the phone sending a document into a checked list. */
function SyncArt() {
  return (
    <svg viewBox="0 0 160 120" className="h-full w-auto" fill="none" aria-hidden>
      <path
        d="M40 26a52 52 0 0 1 78 6"
        className="stroke-border-strong"
        strokeWidth="2"
        strokeDasharray="6 6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Phone, uploading. */}
      <rect
        x="20"
        y="30"
        width="42"
        height="72"
        rx="7"
        className="fill-surface stroke-foreground"
        strokeWidth="2"
      />
      <rect x="30" y="44" width="22" height="30" rx="2" className="fill-border" />
      <circle cx="41" cy="84" r="10" className="fill-primary" />
      <path
        d="M41 89v-10m0 0l-4 4m4-4l4 4"
        className="stroke-on-primary"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* The list on the other side, ticking off. */}
      <rect
        x="78"
        y="26"
        width="76"
        height="80"
        rx="6"
        className="fill-surface-sunken stroke-border"
        strokeWidth="1.5"
      />
      {[0, 1, 2].map((row) => (
        <g key={row}>
          <rect
            x="86"
            y={42 + row * 20}
            width="12"
            height="14"
            rx="2"
            className="fill-border"
          />
          <rect
            x="104"
            y={45 + row * 20}
            width="26"
            height="3.5"
            rx="1.75"
            className="fill-border"
          />
          <rect
            x="104"
            y={52 + row * 20}
            width="18"
            height="3.5"
            rx="1.75"
            className="fill-border"
          />
          <circle cx="142" cy={49 + row * 20} r="6.5" className="fill-success" />
          <path
            d={`M139 ${49 + row * 20}l2 2 4-4`}
            className="stroke-white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      ))}
    </svg>
  );
}
