"use client";

/**
 * The focused capture view for ONE document, for ONE traveller.
 *
 * Phase 5B §13 asks the passport step to present two clear actions. This is
 * that screen, and it generalises: the same view serves the photograph, and
 * anything a destination adds later, because which actions appear is read from
 * the requirement's `capture` field rather than from a document's name.
 *
 * THE SEAM (established in 5A, unchanged here):
 *
 *     DocumentsStep  →  PassportCapture  →  DocumentUploader  (a file)
 *                                        →  LiveCapture       (the camera)
 *
 * Phase 5D rebuilt `LiveCapture` behind that contract, and this file needed one
 * change for it: `onUploadInstead`. The camera can fail in ways the user cannot
 * fix — no camera on the device, an HTTP origin, a browser without
 * `mediaDevices` — and when it does, dropping them back on a chooser whose
 * other option has just failed is a dead end. It now switches them straight to
 * the uploader.
 *
 * Why a focused view rather than an inline row: uploading a passport is the
 * one moment in the flow that needs both hands and full attention. The
 * reference does the same — leaving its checklist for a dedicated
 * "Passport, photo page up" screen — and the pattern is right for the same
 * reason a modal is right for a payment.
 */

import { AlertCircle, ArrowLeft, Camera, Check, RotateCw, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { DocumentUploader } from "@/components/DocumentUploader";
import type { DocumentRequirement } from "@/lib/application/documents";
import type { DocumentEntry } from "@/lib/application/state";
import { isRetryable } from "@/lib/application/sync";
import { ACCEPTED_UPLOAD_LABEL } from "@/lib/storage/limits";
import { cn } from "@/lib/utils";

import { LiveCapture } from "./LiveCapture";

type Method = "choose" | "upload" | "scan";

type PassportCaptureProps = {
  requirement: DocumentRequirement;
  travellerName: string;
  entry?: DocumentEntry;
  onProvide: (entry: DocumentEntry) => void;
  onClear: () => void;
  /** Returns to the checklist. */
  onBack: () => void;
  /** Re-queues a failed upload with the bytes already in hand. */
  onRetry?: () => void;
};

export function PassportCapture({
  requirement,
  travellerName,
  entry,
  onProvide,
  onClear,
  onBack,
  onRetry,
}: PassportCaptureProps) {
  const cameraAvailable =
    requirement.capture === "camera" || requirement.capture === "either";

  // Land straight on Upload when there is no camera to choose between.
  const [method, setMethod] = useState<Method>(
    cameraAvailable ? "choose" : "upload",
  );

  /** Escape backs out of the view, matching the camera's own Escape. */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && method !== "scan") onBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [method, onBack]);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1.5 text-2xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        All documents
      </button>

      <div>
        <h2 className="type-h3 text-foreground">{requirement.label}</h2>
        <p className="mt-1 text-2xs text-muted-foreground">
          For {travellerName || "this traveller"}
        </p>
        <p className="mt-3 max-w-md text-xs leading-relaxed text-muted-foreground">
          {requirement.detail}
        </p>
      </div>

      {/* A FAILED UPLOAD IS OFFERED A RETRY, NOT A RE-CHOOSE.

          The bytes are still in hand — `DocumentEntry.blob` is only released
          once the upload succeeds — so a dropped connection costs one tap, not
          a second trip through the file picker or another photograph of a
          passport. Retrying is only offered where it can work: a file the
          server rejected on its own merits will be rejected identically, and a
          button that does nothing four times is worse than no button. */}
      {entry?.upload === "failed" && onRetry && isRetryable(entry.error ?? "") && (
        <div className="rounded-xl border border-destructive-border bg-destructive-subtle px-4 py-3">
          <p className="flex items-start gap-2 text-2xs font-semibold text-destructive-subtle-foreground">
            <AlertCircle aria-hidden className="mt-px size-3.5 flex-shrink-0" />
            {entry.error ?? "That upload did not complete."}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-2xs font-bold text-destructive-subtle-foreground underline underline-offset-2"
          >
            <RotateCw aria-hidden className="size-3" />
            Try uploading again
          </button>
        </div>
      )}

      {entry && entry.upload !== "failed" && method === "choose" && (
        <p className="flex items-center gap-2 rounded-xl border border-border bg-success-subtle px-4 py-2.5 text-2xs font-semibold text-success-subtle-foreground">
          <Check aria-hidden className="size-3.5" />
          {entry.upload === "stored"
            ? "Saved to your application. Choosing again replaces it."
            : "Already attached. Choosing again replaces it."}
        </p>
      )}

      {method === "scan" ? (
        <LiveCapture
          requirement={requirement}
          onCancel={() => setMethod("choose")}
          // §13 — the fallback is always reachable. When the camera is blocked,
          // missing, busy or unsupported, the user lands on the uploader rather
          // than back at a chooser whose other option has just failed them.
          onUploadInstead={() => setMethod("upload")}
          onCapture={(previewDataUrl) => {
            // No `blob` here, and that is not an omission. The camera produces
            // a data URL because that is what a canvas gives and what the
            // preview needs; the sync layer converts it to bytes when it
            // uploads. Doing the conversion here would mean holding the image
            // twice — once as base64, once as binary — on the device least able
            // to spare the memory.
            onProvide({
              source: "capture",
              previewDataUrl,
              providedAt: Date.now(),
              upload: "local",
            });
            // Straight back to the checklist. The applicant already confirmed
            // this image in the camera's own preview, so returning them to the
            // Upload/Scan chooser would ask "how do you want to do this?" about
            // something they have just finished doing.
            onBack();
          }}
        />
      ) : method === "upload" ? (
        <div className="space-y-4">
          <DocumentUploader
            requirement={requirement}
            entry={entry}
            onProvide={onProvide}
            onClear={onClear}
          />

          {/* Unlike the camera, an upload has no confirmation step of its own —
              the file lands and the row shows it. So the way back to the
              checklist is offered rather than taken automatically, leaving room
              to replace a file that turned out to be the wrong one. */}
          <div className="flex flex-wrap items-center gap-4">
            {entry && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-12 cursor-pointer items-center rounded-xl bg-primary px-5 sm:h-11 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
              >
                Done
              </button>
            )}
            {cameraAvailable && (
              <button
                type="button"
                onClick={() => setMethod("choose")}
                className="cursor-pointer text-2xs font-semibold text-muted-foreground underline-offset-4 hover:underline"
              >
                Use a different method
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Two clear actions. */
        <div className="grid gap-3 sm:grid-cols-2">
          <MethodCard
            Icon={Upload}
            title={`Upload ${requirement.shortLabel.toLowerCase()}`}
            body={`Choose a scan or photo already on this device. ${ACCEPTED_UPLOAD_LABEL}.`}
            onClick={() => setMethod("upload")}
          />
          <MethodCard
            Icon={Camera}
            title={`Scan ${requirement.shortLabel.toLowerCase()}`}
            body="Use this device's camera. Nothing leaves the browser."
            onClick={() => setMethod("scan")}
          />
        </div>
      )}
    </div>
  );
}

function MethodCard({
  Icon,
  title,
  body,
  onClick,
}: {
  Icon: typeof Upload;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-border bg-surface p-5 text-left",
        "transition-[background-color,border-color] duration-[--duration-fast]",
        "hover:border-border-strong hover:bg-surface-sunken",
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary-subtle text-primary-subtle-foreground">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="text-sm font-semibold text-foreground">{title}</span>
      <span className="text-2xs leading-relaxed text-muted-foreground">{body}</span>
    </button>
  );
}
