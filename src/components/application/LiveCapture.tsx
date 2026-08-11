"use client";

/**
 * LIVE CAPTURE — the camera experience.
 *
 * WHAT WAS KEPT FROM THE EXISTING IMPLEMENTATION (§1 — nothing working was
 * thrown away): the `getUserMedia` call, the canvas capture, the face-mode
 * mirroring, the framing heuristic and its guidance copy, the beep, Escape to
 * leave, the countdown wiring from Phase 5C, and `stopEverything`'s teardown.
 *
 * WHAT PHASE 5D CHANGED, and why each one was wrong before:
 *
 *   1. ONE catch, one message. Every failure — no camera, HTTP origin, camera
 *      held by another app, browser without `mediaDevices` — produced "Check
 *      the permission for this site". Four of those are not permission
 *      problems. `lib/application/camera.ts` now classifies them and
 *      `CameraErrorPanel` explains the actual one, with Try again and Upload
 *      instead.
 *   2. NO READY STATE. The old code went straight to "framing" the moment
 *      `getUserMedia` resolved, which is before the video element has a frame —
 *      a black box, then a jump. There is now a `loading` phase that waits for
 *      `loadedmetadata`.
 *   3. THE WHOLE FRAME WAS SAVED. `grabFrame` drew the entire video at
 *      `object-cover`, so the saved image included everything outside the guide
 *      the user carefully aligned to. The capture now maps the guide rectangle
 *      back through the cover transform into source pixels and crops to it, at
 *      native resolution.
 *   4. NOTHING CHECKED THE RESULT. A capture with the lens covered saved a
 *      black rectangle and called it a passport. `checkCapturedImage` now
 *      rejects undecodable, too-small and blank frames — the only three things
 *      that can honestly be checked without OCR.
 *   5. A NEW CANVAS PER CAPTURE. Both canvases are now refs (§26).
 *
 * WHAT IT STILL DOES NOT DO, deliberately: it does not detect a passport, read
 * an MRZ, or validate any field. There is no OCR in this project. Nothing on
 * screen says "detected", "scanning", "verified" or "approved" (§4, §19, §29).
 */

import { Camera, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { CaptureCountdown } from "@/components/application/countdown/CaptureCountdown";
import { CameraErrorPanel } from "@/components/application/camera/CameraErrorPanel";
import { CaptureFrameGuide } from "@/components/application/camera/CaptureFrameGuide";
import { ScanSweep } from "@/components/application/camera/ScanSweep";
import {
  cameraSupport,
  classifyCameraError,
  requestCameraStream,
  stopStream,
  type CameraProblem,
} from "@/lib/application/camera";
import type { DocumentRequirement } from "@/lib/application/documents";
import { checkCapturedImage } from "@/lib/application/passport";

type CaptureMode = "face" | "document";

/**
 * §20 — one explicit phase, never a pile of booleans.
 *
 *   requesting  the camera is being opened; the browser prompt may be up
 *   error       could not get a stream; carries which problem
 *   loading     stream acquired, waiting for the first frame
 *   ready       live and framed, awaiting the trigger
 *   counting    3 → 2 → 1 (Phase 5C)
 *   capturing   shutter taken, sweep playing
 *   review      an image exists and is being confirmed
 *   rejected    the captured image failed a real check
 */
type Phase =

  | { kind: "requesting" }
  | { kind: "error"; problem: CameraProblem }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "counting" }
  | { kind: "capturing"; image: string }
  | { kind: "review"; image: string }
  | { kind: "rejected"; message: string };

type LiveCaptureProps = {
  requirement: DocumentRequirement;
  onCapture: (dataUrl: string) => void;
  onCancel: () => void;
  /** Hands the user to the upload route when the camera cannot serve them. */
  onUploadInstead: () => void;
};

const FACE_GUIDANCE_DEFAULT = "Align your face in the circle";

export function LiveCapture({
  requirement,
  onCapture,
  onCancel,
  onUploadInstead,
}: LiveCaptureProps) {
  const mode: CaptureMode = requirement.kind === "photograph" ? "face" : "document";

  const [phase, setPhase] = useState<Phase>({ kind: "requesting" });
  const [guidance, setGuidance] = useState(
    mode === "face" ? FACE_GUIDANCE_DEFAULT : "Fill the frame with the photo page",
  );

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rafRef = useRef<number | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const guideRef = useRef<HTMLDivElement | null>(null);

  /**
   * Both canvases live for the component's lifetime (§26). The old code called
   * `document.createElement("canvas")` on every capture and on every framing
   * pass — a fresh backing store, and a fresh GPU texture, several times a
   * second.
   */
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [apertureSize, setApertureSize] = useState(256);

  /* ---------------------------------------------------------------------- */
  /* Teardown — §9, mandatory                                               */
  /* ---------------------------------------------------------------------- */

  const stopEverything = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    stopStream(streamRef.current);
    streamRef.current = null;

    // Detaching the element's source matters as well as stopping the tracks:
    // a retained `srcObject` keeps the decoder alive across a retake cycle.
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // Unmount, in every direction — back, capture, retake, continue, navigation.
  useEffect(() => stopEverything, [stopEverything]);

  const leave = useCallback(() => {
    stopEverything();
    onCancel();
  }, [stopEverything, onCancel]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") leave();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [leave]);

  /* ---------------------------------------------------------------------- */
  /* Measurement                                                            */
  /* ---------------------------------------------------------------------- */

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setApertureSize(stage.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Audio                                                                  */
  /* ---------------------------------------------------------------------- */

  const playBeep = useCallback((frequency = 800, seconds = 0.15) => {
    try {
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtor) return;
      const context = new AudioCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + seconds);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + seconds);
    } catch {
      // Audio is a garnish. A blocked AudioContext must not stop a capture.
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Capture                                                                */
  /* ---------------------------------------------------------------------- */

  /**
   * Crops to the guide, at source resolution.
   *
   * The video is painted with `object-cover`, so the displayed picture is a
   * scaled, centre-cropped window onto the source. To save exactly what the
   * user framed, the guide's on-screen rectangle has to be mapped back through
   * that transform:
   *
   *   scale   = max(stageW / videoW, stageH / videoH)      (cover)
   *   offset  = (videoW * scale - stageW) / 2              (centred overflow)
   *   source  = (guideX + offsetX) / scale, and so on
   *
   * Drawing at `sw × sh` means no upscaling and no resampling loss — the saved
   * pixels are the sensor's own. Quality is 0.95, not the 0.92 this used to
   * use: a passport page is the one image in the flow where small print has to
   * survive (§10).
   */
  const grabFrame = useCallback((): string | undefined => {
    const video = videoRef.current;
    const stage = stageRef.current;
    const guide = guideRef.current;
    if (!video || !stage || !video.videoWidth) return undefined;

    const stageRect = stage.getBoundingClientRect();
    const guideRect = (guide ?? stage).getBoundingClientRect();

    const scale = Math.max(
      stageRect.width / video.videoWidth,
      stageRect.height / video.videoHeight,
    );
    const offsetX = (video.videoWidth * scale - stageRect.width) / 2;
    const offsetY = (video.videoHeight * scale - stageRect.height) / 2;

    const sx = (guideRect.left - stageRect.left + offsetX) / scale;
    const sy = (guideRect.top - stageRect.top + offsetY) / scale;
    const sw = guideRect.width / scale;
    const sh = guideRect.height / scale;

    // Clamp, so a guide overhanging the frame cannot ask for pixels that do
    // not exist — drawImage silently produces transparent bands otherwise.
    const cx = Math.max(0, Math.min(sx, video.videoWidth));
    const cy = Math.max(0, Math.min(sy, video.videoHeight));
    const cw = Math.max(1, Math.min(sw, video.videoWidth - cx));
    const ch = Math.max(1, Math.min(sh, video.videoHeight - cy));

    const canvas = (captureCanvasRef.current ??= document.createElement("canvas"));
    canvas.width = Math.round(cw);
    canvas.height = Math.round(ch);
    const context = canvas.getContext("2d");
    if (!context) return undefined;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);

    // The face preview is mirrored so it behaves like a mirror; the saved frame
    // has to match what the user was looking at. A document is not mirrored.
    if (mode === "face") {
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
    }
    context.drawImage(video, cx, cy, cw, ch, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.95);
  }, [mode]);

  /** Takes the shutter and starts the sweep. Validation happens after it. */
  const takeShutter = useCallback(() => {
    const image = grabFrame();
    if (!image) {
      setPhase({
        kind: "rejected",
        message:
          "The camera did not return an image. Try again, or upload a photo instead.",
      });
      return;
    }
    playBeep(1200, 0.25);
    // The stream is stopped the moment the pixels are in hand — the camera
    // light must not stay on through the sweep and the preview (§9).
    stopEverything();
    setPhase({ kind: "capturing", image });
  }, [grabFrame, playBeep, stopEverything]);

  /** Runs when the sweep finishes: the only real check this project can make. */
  const settleCapture = useCallback(async (image: string) => {
    const result = await checkCapturedImage(image);
    setPhase(result.ok ? { kind: "review", image } : { kind: "rejected", message: result.message });
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Framing heuristic — face only, unchanged behaviour                     */
  /* ---------------------------------------------------------------------- */

  const startFraming = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = (analysisCanvasRef.current ??= document.createElement("canvas"));
    canvas.width = 80;
    canvas.height = 80;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let goodReads = 0;

    const analyse = () => {
      if (!streamRef.current || !context) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        context.drawImage(video, 0, 0, 80, 80);
        const { data } = context.getImageData(0, 0, 80, 80);

        let luminance = 0;
        let skin = 0;
        let centre = 0;

        for (let y = 0; y < 80; y += 1) {
          for (let x = 0; x < 80; x += 1) {
            const i = (y * 80 + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            luminance += 0.299 * r + 0.587 * g + 0.114 * b;

            if (x >= 20 && x < 60 && y >= 20 && y < 60) {
              centre += 1;
              if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
                skin += 1;
              }
            }
          }
        }

        const averageLuminance = luminance / 6400;
        const skinRatio = centre > 0 ? skin / centre : 0;

        let message = FACE_GUIDANCE_DEFAULT;
        if (averageLuminance < 45) message = "Too dark — turn on a light";
        else if (skinRatio < 0.12) message = "Move into the circle";
        else if (skinRatio < 0.22) message = "Come closer";
        else if (skinRatio > 0.48) message = "Step back";
        else message = "Hold still";

        setGuidance(message);

        if (message === "Hold still") {
          goodReads += 1;
          if (goodReads >= 6) {
            if (rafRef.current !== null) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
            setPhase({ kind: "counting" });
            return;
          }
        } else {
          goodReads = 0;
        }
      }

      timersRef.current.push(
        setTimeout(() => {
          if (streamRef.current) rafRef.current = requestAnimationFrame(analyse);
        }, 150),
      );
    };

    rafRef.current = requestAnimationFrame(analyse);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Start                                                                  */
  /* ---------------------------------------------------------------------- */

  /**
   * Opens the camera and RETURNS the resulting phase rather than setting it.
   *
   * That shape is what lets the mount-time open and the Retake button share one
   * implementation without either writing state from inside an effect body:
   * the effect resolves the promise and sets the result, the button sets
   * "requesting" for immediate feedback and then sets the result. Pure in,
   * pure out — the only side effects are the stream handle and teardown.
   */
  const openCamera = useCallback(async (): Promise<Phase> => {
    stopEverything();

    const support = cameraSupport();
    if (support !== "ok") return { kind: "error", problem: support };

    try {
      const stream = await requestCameraStream({
        facing: mode === "face" ? "user" : "environment",
      });
      streamRef.current = stream;
      return { kind: "loading" };
    } catch (error) {
      return { kind: "error", problem: await classifyCameraError(error) };
    }
  }, [mode, stopEverything]);

  /** Retake, and the retry on the error panel. */
  const restart = useCallback(() => {
    setPhase({ kind: "requesting" });
    void openCamera().then(setPhase);
  }, [openCamera]);

  /**
   * Attach the stream once the element exists, and only call it ready when the
   * decoder actually has dimensions. `loadedmetadata` is the earliest point at
   * which `videoWidth` is non-zero — which is what the crop maths needs.
   */
  useEffect(() => {
    if (phase.kind !== "loading") return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;

    const onReady = () => {
      setPhase({ kind: "ready" });
      if (mode === "face") {
        timersRef.current.push(
          setTimeout(() => {
            if (streamRef.current) startFraming();
          }, 400),
        );
      }
    };

    if (video.readyState >= video.HAVE_METADATA) {
      onReady();
      return;
    }
    video.addEventListener("loadedmetadata", onReady, { once: true });
    return () => video.removeEventListener("loadedmetadata", onReady);
  }, [phase.kind, mode, startFraming]);

  /**
   * The user chose "Scan", so the camera opens without a second click.
   *
   * `alive` guards the case where the component unmounts while the permission
   * prompt is still up: the promise resolves into a stream nobody will render,
   * and without this the tracks would stay open with the camera light on.
   */
  useEffect(() => {
    let alive = true;
    void openCamera().then((next) => {
      if (alive) setPhase(next);
      else stopEverything();
    });
    return () => {
      alive = false;
    };
    // Once, on mount. Re-running would reopen a camera a retake just opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Render                                                                 */
  /* ---------------------------------------------------------------------- */

  if (phase.kind === "error") {
    return (
      <div className="space-y-4">
        <Header requirement={requirement} mode={mode} onClose={leave} />
        <CameraErrorPanel
          problem={phase.problem}
          onRetry={restart}
          onUploadInstead={() => {
            stopEverything();
            onUploadInstead();
          }}
        />
      </div>
    );
  }

  const live =
    phase.kind === "loading" ||
    phase.kind === "ready" ||
    phase.kind === "counting" ||
    phase.kind === "requesting";
  const stillImage =
    phase.kind === "capturing" || phase.kind === "review" ? phase.image : undefined;

  return (
    <div className="space-y-4">
      <Header requirement={requirement} mode={mode} onClose={leave} />

      {/* §6 — dark, centred, uncluttered. The stage is capped so the camera is
          never "unnecessarily huge on desktop" (§23) and fills the width it is
          given on a phone (§22). */}
      <div
        ref={stageRef}
        className={[
          "relative mx-auto w-full overflow-hidden rounded-2xl bg-slate-950 shadow-e3",
          mode === "face" ? "max-w-sm" : "max-w-lg",
          "aspect-[3/4] sm:aspect-[4/3]",
        ].join(" ")}
      >
        {live && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-label="Live camera preview"
            className={[
              "absolute inset-0 h-full w-full object-cover",
              mode === "face" ? "scale-x-[-1]" : "",
              phase.kind === "ready" || phase.kind === "counting"
                ? "opacity-100"
                : "opacity-0",
              "transition-opacity duration-[--duration-base] motion-reduce:transition-none",
            ].join(" ")}
          />
        )}

        {stillImage && (
          <img
            src={stillImage}
            alt={`Your ${requirement.label.toLowerCase()}, as captured`}
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}

        {/* The guide is the crop. Hidden once there is a still to look at. */}
        {live && (
          <CaptureFrameGuide
            ref={guideRef}
            shape={mode === "face" ? "face" : "passport"}
            dimmed={phase.kind !== "ready" && phase.kind !== "counting"}
          />
        )}

        {phase.kind === "capturing" && (
          <ScanSweep onDone={() => void settleCapture(phase.image)} />
        )}

        {phase.kind === "counting" && (
          <CaptureCountdown
            active
            apertureSize={apertureSize * 0.5}
            onComplete={takeShutter}
            onDigit={() => playBeep(800, 0.12)}
          />
        )}

        {(phase.kind === "requesting" || phase.kind === "loading") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <span className="size-7 animate-spin rounded-full border-2 border-white/25 border-t-white motion-reduce:animate-none" />
            <p role="status" className="max-w-[16rem] text-2xs font-medium text-white/80">
              {phase.kind === "requesting"
                ? "Waiting for camera permission…"
                : "Starting the camera…"}
            </p>
          </div>
        )}

        {/* Instructions live over the scrim, not in a floating pill stack. */}
        {phase.kind === "ready" && (
          <p
            role="status"
            className="absolute inset-x-0 bottom-4 z-raised mx-auto w-fit max-w-[85%] rounded-full bg-black/65 px-3.5 py-1.5 text-center text-2xs font-semibold text-white backdrop-blur-sm"
          >
            {mode === "face" ? guidance : "Line the photo page up inside the frame"}
          </p>
        )}

        {/* §19 — states what happened. Not "verified", not "accepted". */}
        {phase.kind === "review" && (
          <p className="absolute inset-x-0 bottom-4 z-raised mx-auto w-fit rounded-full bg-black/65 px-3.5 py-1.5 text-2xs font-semibold text-white backdrop-blur-sm">
            Photo captured
          </p>
        )}
      </div>

      {phase.kind === "rejected" && (
        <p
          role="alert"
          className="mx-auto max-w-sm text-center text-2xs font-semibold text-destructive"
        >
          {phase.message}
        </p>
      )}

      {/* Controls. 44px minimum touch targets throughout (§22). */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {phase.kind === "ready" && mode === "document" && (
          <button
            type="button"
            onClick={() => setPhase({ kind: "counting" })}
            className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl bg-primary px-7 sm:h-11 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
          >
            <Camera aria-hidden className="size-4" />
            Capture
          </button>
        )}

        {(phase.kind === "review" || phase.kind === "rejected") && (
          <>
            <button
              type="button"
              onClick={restart}
              className="inline-flex h-12 cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface px-5 sm:h-11 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
            >
              <RotateCcw aria-hidden className="size-4" />
              Retake
            </button>

            {phase.kind === "review" ? (
              <button
                type="button"
                onClick={() => {
                  stopEverything();
                  onCapture(phase.image);
                }}
                className="inline-flex h-12 cursor-pointer items-center rounded-xl bg-primary px-7 sm:h-11 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
              >
                Use this photo
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  stopEverything();
                  onUploadInstead();
                }}
                className="inline-flex h-12 cursor-pointer items-center rounded-xl bg-primary px-6 sm:h-11 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
              >
                Upload instead
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Header({
  requirement,
  mode,
  onClose,
}: {
  requirement: DocumentRequirement;
  mode: CaptureMode;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-foreground">
        {mode === "face"
          ? "Take your photograph"
          : `Photograph your ${requirement.shortLabel.toLowerCase()}`}
      </p>
      <button
        type="button"
        onClick={onClose}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground sm:size-9"
      >
        <X aria-hidden className="size-4" />
        <span className="sr-only">Close the camera</span>
      </button>
    </div>
  );
}
