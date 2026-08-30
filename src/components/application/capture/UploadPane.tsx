"use client";

/**
 * THE DROP TARGET
 * ---------------------------------------------------------------------------
 * A dashed rectangle, an outlined upload glyph, one sentence and one button.
 * That is the reference's whole upload screen, and the restraint is the point:
 * the headline above has already said what to supply and which way up, so this
 * pane's only job is to be an obvious place to put it.
 *
 * DRAG STATE. The border and the fill both change, to `--color-success`'s
 * subtle pair — the reference tints the whole zone mint the moment a file is
 * over it. A border-only change is easy to miss on a 750x460 target when the
 * pointer is at the edge of it holding a file.
 *
 * The drag counter is not decoration. `dragleave` fires every time the pointer
 * crosses into a CHILD of the zone — the icon, the text, the button — so a
 * boolean flag flickers off and on as the file is moved across the target.
 * Counting enters against leaves is the only way to know whether the pointer
 * has actually left the zone or merely moved inside it.
 */

import { Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  ACCEPTED_UPLOAD_LABEL,
  validateUpload,
} from "@/lib/storage/limits";

export function UploadPane({
  onFile,
  busy = false,
}: {
  onFile: (file: File) => void;
  /** Suppresses interaction while the caller is reading or scanning the file. */
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string>();
  const depth = useRef(0);
  const errorId = useId();

  const accept = (file: File | null | undefined) => {
    if (!file) return;
    const problem = validateUpload(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(undefined);
    onFile(file);
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          depth.current -= 1;
          if (depth.current <= 0) {
            depth.current = 0;
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          depth.current = 0;
          setDragging(false);
          accept(event.dataTransfer.files?.[0]);
        }}
        className={[
          "flex min-h-[240px] w-full flex-col items-center justify-center rounded-[22px] border border-dashed px-6 py-10 text-center sm:min-h-[300px] md:min-h-[340px]",
          "transition-colors duration-[--duration-base] ease-[--ease-out] motion-reduce:transition-none",
          dragging
            ? "border-success bg-success-subtle"
            : "border-border-strong bg-surface-sunken",
        ].join(" ")}
      >
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-full border border-border-strong text-foreground"
        >
          <Upload className="size-4" />
        </span>

        <p className="mt-4 text-[15px] font-bold text-foreground">
          {dragging ? "Drop it here" : "Upload your passport here"}
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          aria-describedby={error ? errorId : undefined}
          className="mt-5 inline-flex h-9 cursor-pointer items-center rounded-full border border-border-strong bg-surface px-5 text-[13px] font-bold text-foreground transition-[background-color,transform] duration-[--duration-fast] ease-[--ease-out] hover:bg-surface-sunken active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none"
        >
          Browse files
        </button>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_UPLOAD_EXTENSIONS}
          className="sr-only"
          onChange={(event) => {
            accept(event.target.files?.[0]);
            // Cleared so choosing the same file twice in a row still fires a
            // change event — which is exactly what a retake does.
            event.target.value = "";
          }}
        />
      </div>

      <p
        id={errorId}
        role={error ? "alert" : undefined}
        className={`mt-2.5 text-center text-[11px] ${error ? "text-destructive" : "text-muted-foreground"}`}
      >
        {error ?? ACCEPTED_UPLOAD_LABEL}
      </p>
    </div>
  );
}
