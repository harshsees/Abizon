"use client";

/**
 * Camera failed — say which way, and give both ways out.
 *
 * §5 asks for a clear explanation and, where appropriate, "Try again" AND
 * "Upload instead". Both are always offered here except where retrying cannot
 * possibly work: on an insecure origin or a browser with no `mediaDevices`,
 * a Try again button would just fail identically and teach the user that the
 * app is broken rather than that the camera is unavailable.
 *
 * The upload route is never hidden behind the camera failing, either — it is a
 * peer choice on the previous screen. This is the fallback for someone who
 * already chose to scan.
 */

import { CameraOff, RotateCcw, Upload } from "lucide-react";

import {
  describeCameraProblem,
  type CameraProblem,
} from "@/lib/application/camera";

type CameraErrorPanelProps = {
  problem: CameraProblem;
  onRetry: () => void;
  onUploadInstead: () => void;
};

export function CameraErrorPanel({
  problem,
  onRetry,
  onUploadInstead,
}: CameraErrorPanelProps) {
  const { title, body, canRetry } = describeCameraProblem(problem);

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface p-6 text-center sm:p-8"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-surface-sunken text-muted-foreground">
        <CameraOff aria-hidden className="size-5" />
      </span>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
          {body}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {canRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-5 sm:h-11 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
          >
            <RotateCcw aria-hidden className="size-4" />
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onUploadInstead}
          className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 sm:h-11 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
        >
          <Upload aria-hidden className="size-4" />
          Upload instead
        </button>
      </div>
    </div>
  );
}
