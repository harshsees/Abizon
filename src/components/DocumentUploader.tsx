"use client";

/**
 * File upload for one required document.
 *
 * STATES, and which of them are real (Phase 5B §11, §20):
 *
 *   idle       nothing chosen
 *   reading    a genuine `FileReader` pass over the selected image, to make a
 *              thumbnail. This is the ONLY loading state in the flow, and it
 *              exists because the work exists — not to make the UI feel busy.
 *   provided   the file is held. Replace and Remove both available.
 *   error      failed validation; the previous file, if any, is untouched.
 *
 * There is deliberately no "approved". Whether a passport scan is acceptable is
 * a judgement, and it is made by a person in the ops console. The version this
 * replaces flipped to "approved" on a 900ms timer, telling applicants their
 * passport had passed a check that never ran. `setTimeout` is not a backend,
 * and a spinner is not a result.
 *
 * WHAT CHANGED WHEN THE BACKEND ARRIVED. Two things, and both are subtractions:
 *
 *   - **PDFs are no longer accepted.** The server re-encodes every upload
 *     through `sharp` to strip EXIF — a passport photographed at home otherwise
 *     carries the applicant's home coordinates — and there is no PDF engine in
 *     this project to do that with. Accepting one meant a file the client said
 *     was fine and the server rejected after it had been sent.
 *   - **The limits come from `lib/storage/limits.ts`**, which the server reads
 *     too. They were 5MB and PDF-inclusive here and 15MB and image-only there;
 *     one definition is the only way they stay agreed.
 *
 * The file itself now travels with the entry, so the sync layer has bytes to
 * upload. It is never persisted — see the note on `DocumentEntry.blob`.
 */

import { Image as ImageIcon, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { DocumentRequirement } from "@/lib/application/documents";
import type { DocumentEntry } from "@/lib/application/state";
import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  formatBytes,
  MAX_UPLOAD_BYTES,
  validateUpload,
} from "@/lib/storage/limits";
import { cn } from "@/lib/utils";

export { formatBytes };

/** Resolves to a data URL for images, and to `undefined` for anything else. */
function readImagePreview(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return Promise.resolve(undefined);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    // A thumbnail is a nicety. Failing to make one must not fail the upload.
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

type DocumentUploaderProps = {
  requirement: DocumentRequirement;
  entry?: DocumentEntry;
  onProvide: (entry: DocumentEntry) => void;
  onClear: () => void;
  /** Rendered beneath the drop target — the live-capture entry point. */
  children?: React.ReactNode;
};

export function DocumentUploader({
  requirement,
  entry,
  onProvide,
  onClear,
  children,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string>();

  const baseId = useId();
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;

  const accept = async (file: File | null) => {
    if (!file) return;

    const problem = validateUpload(file);
    if (problem) {
      setError(problem);
      return;
    }

    setError(undefined);
    setReading(true);
    const previewDataUrl = await readImagePreview(file);
    setReading(false);

    onProvide({
      source: "upload",
      fileName: file.name,
      fileSize: file.size,
      previewDataUrl,
      providedAt: Date.now(),
      // The bytes, for the sync layer to upload. A `File` is a `Blob`, so this
      // is the original rather than a copy — the data URL above is a thumbnail
      // for the interface and is not what gets sent.
      blob: file,
      upload: "local",
    });
  };

  const openPicker = () => inputRef.current?.click();

  /* ---------------------------------------------------------------------- */
  /* Provided                                                               */
  /* ---------------------------------------------------------------------- */

  if (entry && !reading) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          <span className="flex size-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-sunken">
            {entry.previewDataUrl ? (
              <img
                src={entry.previewDataUrl}
                alt={`Your ${requirement.label.toLowerCase()}`}
                className="size-full object-cover"
              />
            ) : (
              <ImageIcon aria-hidden className="size-5 text-muted-foreground" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {entry.fileName ?? "Photographed with your camera"}
            </p>
            {/* Facts, not verdicts. Which of them is true is decided by the
                upload state, so this line cannot say "saved" about a file that
                is still sitting in the tab. */}
            <p className="mt-0.5 text-2xs text-muted-foreground">
              {entry.fileSize ? `${formatBytes(entry.fileSize)} · ` : ""}
              {entry.upload === "stored"
                ? "Saved to your application — checked before filing"
                : entry.upload === "uploading"
                  ? "Uploading…"
                  : entry.upload === "failed"
                    ? (entry.error ?? "Upload failed")
                    : "Attached — checked before filing"}
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={openPicker}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
            >
              <RefreshCw aria-hidden className="size-4" />
              <span className="sr-only">Replace {requirement.label}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setError(undefined);
                onClear();
              }}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive-subtle hover:text-destructive"
            >
              <X aria-hidden className="size-4" />
              <span className="sr-only">Remove {requirement.label}</span>
            </button>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_UPLOAD_EXTENSIONS}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => accept(event.target.files?.[0] ?? null)}
        />

        {error && (
          <p role="alert" className="text-2xs font-semibold text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Reading — a real async pass                                            */
  /* ---------------------------------------------------------------------- */

  if (reading) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4"
      >
        <Loader2 aria-hidden className="size-4 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">Reading your file…</p>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Idle                                                                   */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="space-y-2.5">
      <button
        type="button"
        onClick={openPicker}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          accept(event.dataTransfer.files?.[0] ?? null);
        }}
        aria-describedby={[hintId, error ? errorId : null].filter(Boolean).join(" ")}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl",
          "border border-dashed px-4 py-7 text-center",
          "transition-[background-color,border-color] duration-[--duration-fast]",
          dragging
            ? "border-primary bg-primary-subtle"
            : error
              ? "border-destructive bg-surface"
              : "border-border-strong bg-surface hover:bg-surface-sunken",
        )}
      >
        <Upload aria-hidden className="size-5 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">
          Upload {requirement.shortLabel.toLowerCase()}
        </span>
        <span id={hintId} className="text-2xs text-muted-foreground">
          Drag and drop, or choose a file · JPG, PNG or WebP · up to {formatBytes(MAX_UPLOAD_BYTES)}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_UPLOAD_EXTENSIONS}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => accept(event.target.files?.[0] ?? null)}
      />

      {children}

      {error && (
        <p id={errorId} role="alert" className="text-2xs font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
