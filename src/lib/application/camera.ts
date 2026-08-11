"use client";

/**
 * CAMERA ACCESS
 * ---------------------------------------------------------------------------
 * Everything about getting a `MediaStream`, and everything about failing to.
 *
 * The version this replaces had one `catch {}` that produced one sentence —
 * "We could not open the camera. Check the permission for this site" — for
 * every possible failure. That sentence is wrong for most of them: it is wrong
 * when the site is on plain HTTP, wrong when the laptop has no camera, wrong
 * when another app already holds it, and wrong when the browser has no
 * `mediaDevices` at all. A user told to check a permission they never denied
 * will check it, find nothing, and give up.
 *
 * The DOM tells us more than that, and this module reads it.
 */

/** Every distinguishable way the camera can be unavailable. */
export type CameraProblem =
  | "unsupported"
  | "insecure"
  | "denied"
  | "dismissed"
  | "unavailable"
  | "in-use"
  | "constraints"
  | "unknown";

export type CameraProblemCopy = {
  title: string;
  body: string;
  /** False where retrying cannot possibly help without user action elsewhere. */
  canRetry: boolean;
};

/**
 * `getUserMedia` requires a secure context. On plain HTTP the API is often
 * missing entirely rather than throwing, which is why this is checked before
 * the call and not inferred from a rejection.
 */
export function cameraSupport(): CameraProblem | "ok" {
  if (typeof navigator === "undefined" || typeof window === "undefined") {
    return "unsupported";
  }
  // localhost is treated as secure by browsers, so this does not fire in dev.
  if (!window.isSecureContext) return "insecure";
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  return "ok";
}

/**
 * `NotAllowedError` is raised BOTH when the user actively blocks the camera and
 * when they dismiss the prompt without answering — the spec does not
 * distinguish them, which matters because the remedies differ: a dismissal is
 * fixed by asking again, a block is not.
 *
 * The Permissions API can tell them apart where it exists ("denied" vs
 * "prompt"). Where it does not, this returns `"denied"` and the copy for that
 * case is written to cover both without asserting which happened.
 */
export async function classifyCameraError(error: unknown): Promise<CameraProblem> {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name: unknown }).name)
      : "";

  switch (name) {
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "unavailable";
    case "NotReadableError":
    case "TrackStartError":
      return "in-use";
    case "OverconstrainedError":
    case "ConstraintNotSatisfiedError":
      return "constraints";
    case "SecurityError":
      return "insecure";
    case "NotAllowedError":
    case "PermissionDeniedError":
      break;
    default:
      return "unknown";
  }

  try {
    const status = await navigator.permissions?.query({
      name: "camera" as PermissionName,
    });
    if (status?.state === "prompt") return "dismissed";
  } catch {
    // Firefox and Safari do not expose the camera permission here. Fall
    // through to the combined wording rather than guessing.
  }
  return "denied";
}

export function describeCameraProblem(problem: CameraProblem): CameraProblemCopy {
  switch (problem) {
    case "denied":
      return {
        title: "Camera access is blocked",
        body: "Camera access is required to scan your passport. Allow it for this site in your browser's address bar, then try again — or upload a photo instead.",
        canRetry: true,
      };
    case "dismissed":
      return {
        title: "Camera access is needed",
        body: "Camera access is required to scan your passport. Choose Try again and select Allow when your browser asks — or upload a photo instead.",
        canRetry: true,
      };
    case "unavailable":
      return {
        title: "No camera found",
        body: "This device does not appear to have a camera we can use. Upload a photo of your passport instead.",
        canRetry: true,
      };
    case "in-use":
      return {
        title: "The camera is busy",
        body: "Another app or tab is using the camera. Close it and try again, or upload a photo instead.",
        canRetry: true,
      };
    case "constraints":
      return {
        title: "This camera cannot be used",
        body: "The camera on this device does not support the settings we asked for. Upload a photo instead.",
        canRetry: true,
      };
    case "insecure":
      return {
        title: "Camera needs a secure connection",
        body: "Browsers only allow camera access over HTTPS. Open this page on the secure address, or upload a photo instead.",
        canRetry: false,
      };
    case "unsupported":
      return {
        title: "This browser cannot open a camera",
        body: "Your browser does not support in-page camera capture. Upload a photo of your passport instead.",
        canRetry: false,
      };
    default:
      return {
        title: "The camera would not open",
        body: "Something stopped the camera from starting. Try again, or upload a photo instead.",
        canRetry: true,
      };
  }
}

/** Stops and releases every track. The camera light must go out. */
export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => {
    track.stop();
    stream.removeTrack(track);
  });
}

export type CameraRequest = {
  /** "environment" for documents, "user" for a face. */
  facing: "user" | "environment";
};

/**
 * Asks for the stream.
 *
 * `facingMode` is requested as a preference, not a hard constraint: as an exact
 * constraint it throws `OverconstrainedError` on every laptop, which have only
 * a front camera and would otherwise be told "this camera cannot be used" for
 * a document scan they could perfectly well take.
 *
 * The resolution ask is deliberately high — a passport page has small print,
 * and this is the one capture in the flow where detail is the point.
 */
export async function requestCameraStream({
  facing,
}: CameraRequest): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: facing,
      width: { ideal: 1920 },
      height: { ideal: 1920 },
    },
    audio: false,
  });
}
