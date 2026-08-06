"use client";

import { FileUp, LoaderCircle } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type UploadState = "uploaded" | "reviewing" | "needs replacement" | "approved";

const STATUS_VARIANT: Record<UploadState, BadgeProps["variant"]> = {
  uploaded: "primary",
  reviewing: "warning",
  "needs replacement": "destructive",
  approved: "success",
};

const ACCEPTED = ".jpg,.jpeg,.png,.pdf";

type DocumentUploaderProps = {
  fileName?: string;
  status: UploadState;
  error?: string;
  onFileSelect: (file: File | null) => void;
};

export function DocumentUploader({
  fileName,
  status,
  error,
  onFileSelect,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const baseId = useId();
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    onFileSelect(event.dataTransfer.files?.[0] ?? null);
  };

  return (
    <div className="space-y-3">
      {/* The drop target is the button itself, so the "drag and drop" copy below
          is actually true — previously it advertised a handler that didn't exist. */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        aria-describedby={[hintId, error ? errorId : null].filter(Boolean).join(" ")}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center justify-center rounded-lg",
          "border border-dashed p-6 text-center transition-colors",
          dragging
            ? "border-primary bg-primary-subtle"
            : error
              ? "border-destructive bg-surface hover:bg-surface-sunken"
              : "border-border-strong bg-surface hover:bg-surface-sunken",
        )}
      >
        <FileUp className="mb-2 size-6 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground">
          Upload passport front page
        </span>
        <span id={hintId} className="mt-1 block text-xs text-muted-foreground">
          Drag and drop supported • JPG, PNG, PDF • Max 5MB
          <span className="mt-1 block">Camera scan option: Coming soon</span>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
      />

      {fileName && (
        <div className="rounded-md border border-border bg-surface p-3 text-sm">
          <p className="font-medium text-foreground">{fileName}</p>
          <Badge variant={STATUS_VARIANT[status]} className="mt-2 capitalize">
            {status === "reviewing" ? (
              <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
            ) : null}
            {status}
          </Badge>
        </div>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
