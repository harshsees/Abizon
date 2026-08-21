"use client";

/**
 * SCAN A PASSPORT, FILL THE FORM.
 * ---------------------------------------------------------------------------
 * Sits above the six fields it fills. The applicant chooses the photo page,
 * the machine-readable zone is read in their own browser, and the fields that
 * verify are written into the form.
 *
 * ── What this claims, and what it does not ──
 *
 * The step it replaces is typing nine values off a passport, where the usual
 * failure is one wrong character in a passport number and a returned
 * application. So the bar is not "usually right" — it is "right, or says it is
 * not". The MRZ carries check digits and `lib/passport/mrz.ts` verifies them,
 * so there are three outcomes and each says something different:
 *
 *   verified    every digit agreed. Fields are filled and the applicant is
 *               told to check them anyway, because a verified read of the
 *               wrong passport is still the wrong passport.
 *   unverified  something did not agree. NOTHING is filled, and the failing
 *               field is named. Filling a passport number that failed its own
 *               checksum is worse than filling nothing: the applicant
 *               proof-reads a form they believe was filled correctly.
 *   failed      no zone found. Say so plainly and let them type.
 *
 * ── Why the progress list is honest ──
 *
 * The reference this was modelled on shows "Checking global security
 * databases" and "Identifying any travel restrictions" while a passport
 * uploads. We do neither of those things. The three lines below are the three
 * things that actually happen, and they are worth showing because the engine
 * genuinely takes a few seconds to start — an unexplained pause on a screen
 * holding a passport is its own kind of alarming.
 */

import { AlertCircle, Check, Loader2, ScanLine, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  BrowserMrzScanner,
  type PassportScanner,
  type ScanOutcome,
  type ScanProgress,
} from "@/lib/passport/scan";
import type { MrzFields } from "@/lib/passport/mrz";
import type { TravellerDetails } from "@/lib/application/state";
import { ACCEPTED_UPLOAD_EXTENSIONS, validateUpload } from "@/lib/storage/limits";
import { cn } from "@/lib/utils";

/**
 * The MRZ transliterates names to uppercase and unaccented, surname first. The
 * form wants one full name as printed. Given names then surname is the order
 * the human-readable page uses, and the order every downstream check expects.
 */
export function fieldsToDetails(fields: MrzFields): Partial<TravellerDetails> {
  const fullName = [fields.givenNames, fields.surname]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    fullName,
    dateOfBirth: fields.dateOfBirth,
    passportNumber: fields.passportNumber,
    passportExpiry: fields.dateOfExpiry,
    // The MRZ carries a three-letter code; the form takes a nationality word,
    // and `IND` is not one. Only the code we can state confidently is mapped;
    // anything else is left for the applicant rather than guessed at.
    nationality: fields.nationality === "IND" ? "Indian" : "",
    gender:
      fields.sex === "male" ? "Male" : fields.sex === "female" ? "Female" : "",
  };
}

type Stage = "idle" | "scanning" | "done";

type StepState = "waiting" | "active" | "done";

const STEPS = [
  { key: "start", label: "Starting the reader" },
  { key: "read", label: "Reading the machine-readable zone" },
  { key: "verify", label: "Verifying the check digits" },
] as const;

function stageOf(progress: ScanProgress | null, index: number): StepState {
  const reached =
    progress === null
      ? -1
      : progress.phase === "starting"
        ? 0
        : progress.phase === "reading"
          ? 1
          : 2;

  if (index < reached) return "done";
  if (index === reached) return "active";
  return "waiting";
}

export function PassportAutofill({
  onFilled,
  className,
}: {
  onFilled: (patch: Partial<TravellerDetails>) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<PassportScanner | null>(null);

  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [rejected, setRejected] = useState<string | undefined>();

  // The engine holds a Worker and several megabytes. Leaving it running after
  // the applicant has moved on is the kind of thing that makes a phone warm.
  useEffect(() => {
    return () => {
      void scannerRef.current?.dispose();
      scannerRef.current = null;
    };
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      setRejected(undefined);

      // Same limits as every other upload in the flow, from the same module.
      const problem = validateUpload(file);
      if (problem) {
        setRejected(problem);
        return;
      }

      setStage("scanning");
      setProgress({ phase: "starting" });
      setOutcome(null);

      scannerRef.current ??= new BrowserMrzScanner();
      const result = await scannerRef.current.scan(file, setProgress);

      setOutcome(result);
      setStage("done");

      if (result.status === "verified") {
        onFilled(fieldsToDetails(result.fields));
      }
    },
    [onFilled],
  );

  const reset = () => {
    setStage("idle");
    setOutcome(null);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={stage === "scanning"}
        className={cn(
          "flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full",
          "border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground",
          "transition-colors duration-[--duration-fast] hover:bg-surface-sunken",
          "disabled:pointer-events-none disabled:opacity-60 sm:h-11",
        )}
      >
        {stage === "scanning" ? (
          <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />
        ) : (
          <Upload aria-hidden className="size-4" />
        )}
        {stage === "scanning" ? "Reading your passport…" : "Upload passport to auto-fill"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_UPLOAD_EXTENSIONS}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {/* The photo page, said once. Applicants reach for the page with the
          stamps otherwise, and the zone is not on it. */}
      <p className="text-center text-2xs leading-relaxed text-muted-foreground">
        The photo page, with the two lines of <code className="font-mono">&lt;&lt;&lt;</code>{" "}
        at the bottom. It is read on your device and not uploaded.
      </p>

      {rejected && (
        <p role="alert" className="text-2xs font-semibold text-destructive">
          {rejected}
        </p>
      )}

      {/* Progress. Not a modal: the form underneath is still the thing being
          filled, and covering it to report on a three-second read would hide
          the answer at the moment it arrives. */}
      {stage === "scanning" && (
        <ul className="flex flex-col gap-2 rounded-xl bg-surface-sunken px-4 py-3.5">
          {STEPS.map((step, index) => {
            const state = stageOf(progress, index);
            return (
              <li
                key={step.key}
                className={cn(
                  "flex items-center gap-2.5 text-2xs",
                  state === "waiting" ? "text-muted-foreground" : "text-foreground",
                )}
              >
                <span aria-hidden className="flex size-4 items-center justify-center">
                  {state === "done" ? (
                    <Check className="size-3.5 text-success" />
                  ) : state === "active" ? (
                    <Loader2 className="size-3.5 animate-spin text-muted-foreground motion-reduce:animate-none" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-border-strong" />
                  )}
                </span>
                {step.label}
                {state === "active" &&
                  progress?.phase === "reading" &&
                  ` · ${progress.percent}%`}
              </li>
            );
          })}
        </ul>
      )}

      {stage === "done" && outcome?.status === "verified" && (
        <div className="flex items-start gap-2.5 rounded-xl bg-success-subtle px-4 py-3">
          <ScanLine aria-hidden className="mt-0.5 size-4 flex-shrink-0 text-success" />
          {/* Specific about which half was verified, because the two halves
              have genuinely different standing. Every check digit in the zone
              is on line 2; the name sits on line 1 and has none. Saying "every
              check digit matched" and leaving it there lends the name a
              credibility it has not got — the first run of this returned a
              verified read with a stray letter in the surname. */}
          <p className="text-2xs leading-relaxed text-success-subtle-foreground">
            <span className="font-bold">Filled from your passport.</span> The
            passport number and both dates matched their check digits.{" "}
            <span className="font-bold">Please read the name over</span> — it is
            the one field the passport carries no checksum for, so it is the one
            we cannot verify for you.
          </p>
        </div>
      )}

      {stage === "done" && outcome?.status === "unverified" && (
        <div className="flex items-start gap-2.5 rounded-xl bg-surface-sunken px-4 py-3">
          <AlertCircle aria-hidden className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-2xs leading-relaxed text-muted-foreground">
            <span className="font-bold text-foreground">
              The scan did not verify, so nothing was filled in.
            </span>{" "}
            The {outcome.failed.join(" and ")} did not match{" "}
            {outcome.failed.length === 1 ? "its" : "their"} check digit, which
            usually means glare or a soft focus on the bottom two lines.{" "}
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer font-semibold text-foreground underline underline-offset-2"
            >
              Try another photo
            </button>{" "}
            or type the details below.
          </p>
        </div>
      )}

      {stage === "done" && outcome?.status === "failed" && (
        <div className="flex items-start gap-2.5 rounded-xl bg-surface-sunken px-4 py-3">
          <AlertCircle aria-hidden className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
          <p className="text-2xs leading-relaxed text-muted-foreground">
            <span className="font-bold text-foreground">
              {outcome.reason === "not-a-passport"
                ? "That looks like an identity card rather than a passport."
                : "No machine-readable zone found."}
            </span>{" "}
            {outcome.reason === "not-a-passport"
              ? "The scan reads passports only."
              : "Make sure the two lines at the very bottom of the photo page are in shot and in focus."}{" "}
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer font-semibold text-foreground underline underline-offset-2"
            >
              Try again
            </button>{" "}
            or type the details below.
          </p>
        </div>
      )}
    </div>
  );
}
