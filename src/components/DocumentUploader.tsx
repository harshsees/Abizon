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
 * There is deliberately no "uploading" and no "approved". Nothing is uploaded
 * — there is no endpoint — and nothing is approved, because no reviewer has
 * looked at it. The version this replaces flipped to "approved" on a 900ms
 * timer, telling applicants their passport had passed a check that never ran.
 * `setTimeout` is not a backend, and a spinner is not a result.
 *
 * PDFs get no thumbnail: rendering one needs a PDF engine this project does
 * not ship. They show a file chip instead, which is honest about what is known.
 */

import { FileText, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { DocumentRequirement } from "@/lib/application/documents";
import type { DocumentEntry } from "@/lib/application/state";
import { cn } from "@/lib/utils";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.pdf";
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** The one place the rules are applied. Returns a message, or `undefined`. */
export function validateDocumentFile(file: File): string | undefined {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "That file type is not accepted. Use a JPG, PNG or PDF.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "That file is over 5MB. Try a JPG instead of a PDF, or a lower-resolution scan.";
  }
  return undefined;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

    const problem = validateDocumentFile(file);
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
              <FileText aria-hidden className="size-5 text-muted-foreground" />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {entry.fileName ?? "Photographed with your camera"}
            </p>
            {/* A fact, not a verdict. */}
            <p className="mt-0.5 text-2xs text-muted-foreground">
              {entry.fileSize ? `${formatBytes(entry.fileSize)} · ` : ""}
              Attached — checked before filing
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
          accept={ACCEPTED_EXTENSIONS}
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
          Drag and drop, or choose a file · JPG, PNG, PDF · up to 5MB
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
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
