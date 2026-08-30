"use client";

/**
 * UPLOAD FROM PHONE
 * ---------------------------------------------------------------------------
 * The reference offers this under the traveller card and it is the single most
 * useful control on the screen: the passport is in the applicant's hand and the
 * camera that can photograph it well is in their pocket, not in the laptop lid.
 *
 * ── Why this one is real ──
 *
 * It was left out of the first build because "pair a phone over a QR code"
 * sounds like it needs a pairing service, a session token and a socket. It does
 * not, because this application is already synced: `sync.ts` opens a row keyed
 * to the signed-in account, and any device signed into that account which opens
 * `/apply?country=…` resumes the same application — that is the same mechanism
 * that lets somebody start on a laptop and finish on a train.
 *
 * So the QR encodes the apply URL, and the hand-off is: open it on the phone,
 * photograph the passport there, and the document arrives against the same
 * application. No new service, no token to expire, nothing to leak.
 *
 * ── What it honestly cannot do ──
 *
 * There is no live channel back, so this screen does not pretend a document has
 * arrived. It says the upload will show here after a refresh, and offers the
 * button that does it. Claiming "synced in real-time" over a page that does not
 * poll is exactly the sentence the previous build of this flow was deleted for.
 *
 * ── And when there is no account ──
 *
 * Then there is nothing for the phone to join, and the sheet says so and offers
 * sign-in instead of a QR code that would open a second, unrelated draft.
 */

import { RefreshCw, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function PhoneHandoffSheet({
  applyUrl,
  signedIn,
  signInHref,
  onClose,
}: {
  /** Absolute URL to this application. Encoded into the QR. */
  applyUrl: string;
  signedIn: boolean;
  signInHref: string;
  onClose: () => void;
}) {
  const [qr, setQr] = useState<string>();
  const [qrFailed, setQrFailed] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    let cancelled = false;

    // Imported on open rather than at module scope: the encoder is dead weight
    // on a page nobody has asked to hand off from.
    void import("qrcode")
      .then((mod) =>
        mod.default.toDataURL(applyUrl, {
          margin: 1,
          width: 440,
          errorCorrectionLevel: "M",
          color: { dark: "#0f172a", light: "#ffffff" },
        }),
      )
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => {
        if (!cancelled) setQrFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [applyUrl, signedIn]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-overlay px-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="phone-handoff-title"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-[380px] rounded-[22px] bg-surface p-6 shadow-e4"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
        >
          <X aria-hidden className="size-4" />
        </button>

        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-lg bg-primary-subtle text-primary"
          >
            <Smartphone className="size-4" />
          </span>
          <h2
            id="phone-handoff-title"
            className="text-[17px] font-bold text-foreground"
          >
            Upload from phone
          </h2>
        </div>

        {signedIn ? (
          <>
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
              Scan this with your phone&rsquo;s camera. It opens the same
              application, signed in as you — photograph the passport there.
            </p>

            <div className="mt-5 flex justify-center">
              {qr ? (
                /* eslint-disable-next-line @next/next/no-img-element -- a data:
                   URL generated in this tab; there is nothing to optimise. */
                <img
                  src={qr}
                  alt="QR code linking to this application"
                  className="size-[200px] rounded-xl border border-border"
                />
              ) : (
                <div className="flex size-[200px] items-center justify-center rounded-xl border border-dashed border-border text-2xs text-muted-foreground">
                  {qrFailed ? "Could not draw the code" : "Preparing…"}
                </div>
              )}
            </div>

            <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
              Uploads made on your phone appear here once this page reloads.
            </p>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface text-[13px] font-bold text-foreground transition-colors hover:bg-surface-sunken"
            >
              <RefreshCw aria-hidden className="size-3.5" />
              Check for it now
            </button>
          </>
        ) : (
          <>
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">
              This needs an account. Your phone joins the application by signing
              in to it — without one there is nothing for it to join, and it
              would start a separate draft.
            </p>
            <Link
              href={signInHref}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-foreground text-[14px] font-bold text-background transition-colors hover:bg-subtle-foreground"
            >
              Sign in to continue on your phone
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
