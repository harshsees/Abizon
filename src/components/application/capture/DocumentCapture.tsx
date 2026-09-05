"use client";

/**
 * ONE DOCUMENT, START TO FINISH
 * ---------------------------------------------------------------------------
 * The takeover that opens when a requirement row is pressed, and the small
 * machine that decides what it shows. It replaces `PassportCapture`, whose job
 * was to offer two method cards and then hand off; this one owns the whole
 * errand, because in the reference the errand does not stop at "a file has
 * been chosen".
 *
 * A PHOTOGRAPH is one screen. Take it or upload it, confirm it in the camera's
 * own preview, done.
 *
 * A PASSPORT is four, and they run without returning to the checklist between
 * them, because they are one continuous task:
 *
 *     photo page  →  scan  →  back page  →  review
 *
 * That chain is the single biggest behavioural difference from the flow this
 * replaces, where each of those was a separate step reached by pressing
 * Continue on a screen that had already finished. Here, choosing a file starts
 * the scan; the scan finishing asks for the other side; supplying that opens
 * the review. The applicant presses one button per screen and every press does
 * something.
 *
 * BOTH PAGES ARE SCANNED, and the back page gets the same screen the photo
 * page does — the wash, the sweep, the SCANNING pill, and labelled boxes
 * landing on what was found. That symmetry is not cosmetic. Supplying the back
 * page used to drop straight into the review form, so the flow taught the
 * applicant that one side of their passport was read and the other was merely
 * collected, which made the back page feel like paperwork rather than part of
 * the same errand.
 *
 * WHAT THE TWO SCANS ARE NOT. They are different reads and they are honest
 * about it. The photo page has a machine-readable zone whose check digits make
 * most of it verifiable; the back page has no zone at all, so nothing on it can
 * be checked and nothing read from it is presented as verified. One value
 * crosses into the form from the back page — the nationality, when the photo
 * page could not supply it — and only because it comes from a closed list of
 * country names where a misread yields no answer rather than a wrong one. See
 * `scanBackPage` and `backPageToDetails`.
 *
 * WHAT HAPPENS TO THE BACK PAGE IMAGE. It is held in this tab and shown on the
 * review screen; it is not uploaded, because `document_kind` in the database
 * has two values and neither is this one. See the note on `DocumentKind`.
 */

import { Monitor, ScanFace } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PASSPORT_BACK, type DocumentRequirement } from "@/lib/application/documents";
import type {
  ContactDetails,
  DocumentEntry,
  TravellerDetails,
} from "@/lib/application/state";
import { backPageToDetails, fieldsToDetails } from "@/lib/application/mrzFields";
import {
  BrowserMrzScanner,
  type BackPageOutcome,
  type ScanOutcome,
  type ScanProgress,
} from "@/lib/passport/scan";

import { LiveCapture } from "../LiveCapture";
import { CaptureTakeover, type CaptureMethod } from "./CaptureTakeover";
import { PassportGuideCard } from "./PassportGuideCard";
import { PassportReview } from "./PassportReview";
import { ScanStage, type ScanStagePhase } from "./ScanStage";
import { UploadPane } from "./UploadPane";

/**
 * The two ways in, and why there are two rather than the reference's three.
 *
 * The reference offers "Scan from Phone" as well, which pairs a handset over a
 * QR code and receives the image from it. There is no pairing service here, so
 * the segment would be a control that opens nothing — and this codebase's
 * standing rule is that a control which leads nowhere is dropped rather than
 * shown disabled. It is the same argument that keeps the payment step out of
 * the sequence while there is no gateway.
 */
const METHODS = [
  { id: "camera" as const, label: "Live Capture", Icon: ScanFace },
  { id: "upload" as const, label: "Upload from device", Icon: Monitor },
];

type Face = "photo" | "back";

/**
 * The screens of the passport errand.
 *
 * `scanning` carries its `face` because both pages use it and the guidance
 * card beside it has to keep showing the side being read — without it the card
 * flipped back to the photo page the moment the back page scan started, which
 * is the opposite of the instruction.
 *
 * The two finished states are separate rather than one with a union inside
 * because they lead to different places: a read photo page goes on to ask for
 * the back, and a read back page goes to the review.
 */
type Stage =
  | { kind: "supply"; face: Face }
  | { kind: "scanning"; face: Face; imageUrl: string; progress: ScanProgress | null }
  | { kind: "scanned"; imageUrl: string; outcome: ScanOutcome }
  | { kind: "scannedBack"; imageUrl: string; outcome: BackPageOutcome }
  | { kind: "review" };

/**
 * The two-tone heading each screen carries, keyed by what is being supplied.
 *
 * The photograph is keyed by METHOD as well as kind, because "look ahead,
 * straight at the camera" is an instruction to somebody about to be
 * photographed and nonsense to somebody choosing a file. Nothing else has two
 * ways in, so nothing else needs the second key.
 *
 * The three trip documents are one screen each and land here for their copy
 * rather than falling through to the generic "ready when you are" — which is a
 * fallback that says nothing about the specific mistake each of these invites:
 * a PAN photographed at an angle, a ticket screenshot cropped above the name,
 * a hotel booking that covers three of the five nights.
 */
const HEADINGS: Record<string, { top: string; accent: string }> = {
  "photograph:camera": { top: "Look ahead,", accent: "straight at the camera" },
  "photograph:upload": { top: "Your photograph,", accent: "plain background" },
  "passport:photo": { top: "Passport,", accent: "photo page up" },
  "passport:back": { top: "Now flip to the", accent: "back page" },
  panCard: { top: "Your PAN card,", accent: "flat and square on" },
  returnTicket: { top: "The flight home,", accent: "with every name showing" },
  hotelStay: { top: "Where you are staying,", accent: "for the whole trip" },
};

export function DocumentCapture({
  requirement,
  photoEntry,
  backEntry,
  details,
  contact,
  onProvide,
  onDetailsChange,
  onContactChange,
  onDone,
  onExit,
  detailsComplete,
}: {
  requirement: DocumentRequirement;
  /** The entry for `requirement.kind`, if one already exists. */
  photoEntry?: DocumentEntry;
  /** The passport's back page, if one has been supplied. */
  backEntry?: DocumentEntry;
  details: TravellerDetails;
  contact: ContactDetails;
  onProvide: (kind: DocumentRequirement["kind"], entry: DocumentEntry) => void;
  onDetailsChange: (patch: Partial<TravellerDetails>) => void;
  onContactChange: (patch: Partial<ContactDetails>) => void;
  onDone: () => void;
  onExit: () => void;
  /** Whether the review screen's Continue may be pressed. */
  detailsComplete: boolean;
}) {
  const isPassport = requirement.kind === "passport";

  const [method, setMethod] = useState<CaptureMethod>(
    requirement.kind === "photograph" ? "camera" : "upload",
  );
  const [stage, setStage] = useState<Stage>({ kind: "supply", face: "photo" });
  /**
   * Whether the MRZ read cleanly. It gates the review screen's countdown and
   * nothing else — a screen may only advance itself when the values on it came
   * back with every check digit agreeing.
   */
  const [verified, setVerified] = useState(false);

  /**
   * Object URLs for the two page images.
   *
   * State, because the review screen renders them — and a mirror in a ref,
   * because the cleanup that revokes them must not re-run every time they
   * change. A blob URL that is never revoked pins the whole file in memory for
   * the life of the document, and a passport photographed on a phone is not a
   * small file.
   *
   * The ref is written from the setter and read only from the unmount cleanup,
   * never during render; the state is what render reads.
   */
  const [urls, setUrls] = useState<Partial<Record<Face, string>>>({});
  const live = useRef<Partial<Record<Face, string>>>({});

  useEffect(
    () => () => {
      Object.values(live.current).forEach((url) => {
        // A data URL is not a blob URL and revoking it is a no-op, but calling
        // it on one is still a lie about what is being released.
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    },
    [],
  );

  const setFaceUrl = (face: Face, url: string) => {
    const previous = live.current[face];
    if (previous?.startsWith("blob:")) URL.revokeObjectURL(previous);
    live.current = { ...live.current, [face]: url };
    setUrls((current) => ({ ...current, [face]: url }));
  };

  /* ---------------------------------------------------------------------- */
  /* The scan                                                               */
  /* ---------------------------------------------------------------------- */

  const scanner = useRef<BrowserMrzScanner | null>(null);

  const runScan = useCallback(
    async (file: Blob, imageUrl: string) => {
      setStage({ kind: "scanning", face: "photo", imageUrl, progress: null });

      scanner.current ??= new BrowserMrzScanner();
      let outcome: ScanOutcome;
      try {
        outcome = await scanner.current.scan(file, (progress) =>
          setStage((current) =>
            current.kind === "scanning" ? { ...current, progress } : current,
          ),
        );
      } catch {
        outcome = { status: "failed", reason: "engine-error" };
      }

      if (outcome.status === "verified") {
        onDetailsChange(fieldsToDetails(outcome.fields));
        setVerified(true);
      } else if (outcome.status === "partial" && outcome.trusted.length > 0) {
        // Fill what the check digits vouch for and leave the rest blank. The
        // countdown stays disarmed: a screen that half-filled itself is a
        // screen somebody has to finish, not one that may advance on its own.
        onDetailsChange(fieldsToDetails(outcome.fields, outcome.trusted));
      }

      setStage({ kind: "scanned", imageUrl, outcome });
    },
    [onDetailsChange],
  );

  /**
   * The back page, read the same way and shown on the same screen.
   *
   * A PLAIN FUNCTION, not a `useCallback`, and deliberately so.
   * `backPageToDetails` refuses to overwrite a nationality the form already
   * holds, so this has to see the CURRENT `details` — a memoised version would
   * either close over a stale one or change on every keystroke in the review
   * form, and the two callers below close over it in turn. It is called from
   * an event handler and never passed to a child, so there is nothing for
   * memoising it to save.
   *
   * A failed back-page read is not a failed errand. Nothing downstream needs
   * anything from this page, so the screen says it could not be read and the
   * Continue button below it goes to the review exactly as it would have.
   */
  const runBackScan = async (file: Blob, imageUrl: string) => {
    setStage({ kind: "scanning", face: "back", imageUrl, progress: null });

    scanner.current ??= new BrowserMrzScanner();
    let outcome: BackPageOutcome;
    try {
      outcome = await scanner.current.scanBackPage(file, (progress) =>
        setStage((current) =>
          current.kind === "scanning" ? { ...current, progress } : current,
        ),
      );
    } catch {
      outcome = { status: "failed", reason: "engine-error" };
    }

    if (outcome.status === "read") {
      const patch = backPageToDetails(outcome.nationality, details);
      if (Object.keys(patch).length > 0) onDetailsChange(patch);
    }

    setStage({ kind: "scannedBack", imageUrl, outcome });
  };

  /* ---------------------------------------------------------------------- */
  /* Supplying an image                                                     */
  /* ---------------------------------------------------------------------- */

  const acceptFile = async (face: Face, file: File) => {
    const url = URL.createObjectURL(file);
    setFaceUrl(face, url);

    const entry: DocumentEntry = {
      source: "upload",
      fileName: file.name,
      fileSize: file.size,
      providedAt: Date.now(),
      blob: file,
      upload: "local",
    };

    if (face === "photo") {
      onProvide(requirement.kind, entry);
      if (isPassport) {
        await runScan(file, url);
      } else {
        onDone();
      }
    } else {
      onProvide(PASSPORT_BACK.kind, entry);
      await runBackScan(file, url);
    }
  };

  const acceptCapture = (face: Face, dataUrl: string) => {
    setFaceUrl(face, dataUrl);

    // No `blob`: a canvas hands back a data URL, and the sync layer converts it
    // when it uploads. Holding both would mean the image twice in memory on the
    // device least able to spare it.
    const entry: DocumentEntry = {
      source: "capture",
      previewDataUrl: dataUrl,
      providedAt: Date.now(),
      upload: "local",
    };

    if (face === "photo") {
      onProvide(requirement.kind, entry);
      if (isPassport) {
        void fetch(dataUrl)
          .then((response) => response.blob())
          .then((blob) => runScan(blob, dataUrl))
          .catch(() =>
            setStage({
              kind: "scanned",
              imageUrl: dataUrl,
              outcome: { status: "failed", reason: "engine-error" },
            }),
          );
      } else {
        onDone();
      }
    } else {
      onProvide(PASSPORT_BACK.kind, entry);
      void fetch(dataUrl)
        .then((response) => response.blob())
        .then((blob) => runBackScan(blob, dataUrl))
        .catch(() =>
          setStage({
            kind: "scannedBack",
            imageUrl: dataUrl,
            outcome: { status: "failed", reason: "engine-error" },
          }),
        );
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Screens                                                                */
  /* ---------------------------------------------------------------------- */

  // The review is a page rather than a framed pane — it is the widest screen
  // in the flow and the heading sits left, not centred — so it steps outside
  // the takeover's frame entirely.
  if (stage.kind === "review") {
    return (
      <div className="fixed inset-0 z-modal overflow-y-auto bg-surface">
        <PassportReview
          photoPageUrl={urls.photo ?? photoEntry?.previewDataUrl}
          backPageUrl={urls.back ?? backEntry?.previewDataUrl}
          details={details}
          contact={contact}
          verified={verified}
          canContinue={detailsComplete}
          onDetailsChange={onDetailsChange}
          onContactChange={onContactChange}
          onEditImage={(face) => setStage({ kind: "supply", face })}
          onBack={() => setStage({ kind: "supply", face: "back" })}
          onClose={onExit}
          onContinue={onDone}
        />
      </div>
    );
  }

  /**
   * Which side the guidance card is showing.
   *
   * Every stage knows its own side now that the back page is scanned too. It
   * used to hard-code "photo" for everything but `supply`, on the reasoning
   * that a scan was always a scan of the photo page — which stopped being true
   * the moment the back page got a scan screen of its own, and would have
   * flipped the card back mid-read.
   */
  const face: Face =
    stage.kind === "supply" || stage.kind === "scanning"
      ? stage.face
      : stage.kind === "scannedBack"
        ? "back"
        : "photo";
  const headingKey = isPassport
    ? `passport:${face}`
    : requirement.kind === "photograph"
      ? `photograph:${method}`
      : requirement.kind;
  const heading = HEADINGS[headingKey] ?? {
    top: requirement.label,
    accent: "ready when you are",
  };

  return (
    <CaptureTakeover
      titleTop={heading.top}
      titleAccent={heading.accent}
      /**
       * The method switch appears only where there is a real choice.
       *
       * `requirement.capture` has always said which documents a camera makes
       * sense for, and until the trip documents arrived every requirement said
       * "either", so nothing read it. A PAN card, a boarding pass and a hotel
       * voucher are all `upload`: the camera behind "Live Capture" is the FACE
       * capture — a countdown, an oval frame guide, a nose-position heuristic —
       * and offering it for a boarding pass would open a screen asking somebody
       * to centre their face in order to photograph a piece of paper.
       */
      methods={
        stage.kind === "supply" && requirement.capture !== "upload"
          ? METHODS
          : undefined
      }
      method={method}
      onMethodChange={setMethod}
      onBack={() => {
        // Backwards inside the errand before backwards out of it: from the back
        // page to the photo page, from a finished scan to choosing again.
        if (stage.kind === "supply" && stage.face === "back") {
          setStage({ kind: "supply", face: "photo" });
          return;
        }
        if (stage.kind === "scanning" || stage.kind === "scanned") {
          setStage({ kind: "supply", face: "photo" });
          return;
        }
        onExit();
      }}
      onClose={onExit}
      /* Mounted for the whole passport errand, not just while a page is being
         chosen. If it unmounted during the scan it would remount already
         turned over, and the flip — the one piece of motion that teaches
         "now do the other side" — would never play. */
      aside={isPassport ? <PassportGuideCard face={face} /> : undefined}
    >
      {stage.kind === "supply" &&
        (method === "camera" ? (
          <LiveCapture
            requirement={face === "back" ? PASSPORT_BACK : requirement}
            onCapture={(dataUrl) => acceptCapture(face, dataUrl)}
            onCancel={onExit}
            onUploadInstead={() => setMethod("upload")}
          />
        ) : (
          <UploadPane onFile={(file) => void acceptFile(face, file)} />
        ))}

      {stage.kind === "scanning" && (
        <ScanStage
          imageUrl={stage.imageUrl}
          phase={{ kind: "scanning", progress: stage.progress }}
          onRetake={() => setStage({ kind: "supply", face: stage.face })}
        />
      )}

      {stage.kind === "scanned" && (
        <>
          <ScanStage
            imageUrl={stage.imageUrl}
            phase={outcomeToPhase(stage.outcome)}
            onRetake={() => setStage({ kind: "supply", face: "photo" })}
          />
          <ContinueButton onClick={() => setStage({ kind: "supply", face: "back" })} />
        </>
      )}

      {stage.kind === "scannedBack" && (
        <>
          <ScanStage
            imageUrl={stage.imageUrl}
            phase={backOutcomeToPhase(stage.outcome)}
            onRetake={() => setStage({ kind: "supply", face: "back" })}
          />
          <ContinueButton onClick={() => setStage({ kind: "review" })} />
        </>
      )}
    </CaptureTakeover>
  );
}

/* -------------------------------------------------------------------------- */

/** The one button both finished-scan screens carry, so they cannot drift. */
function ContinueButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-10 inline-flex h-[54px] w-full max-w-[360px] cursor-pointer items-center justify-center rounded-2xl bg-foreground text-base font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-subtle-foreground active:scale-[0.99] motion-reduce:transform-none"
    >
      Continue
    </button>
  );
}

/**
 * A back-page read, in the words the screen shows.
 *
 * A read that found NOTHING is still a read, and it deliberately does not land
 * in the failure state: the page was scanned, it simply had nothing printed in
 * a shape this reader recognises — which is the normal outcome for a passport
 * whose back page carries a handwritten address, and for every design this
 * project has not seen. Telling that applicant "we could not read this one"
 * would invite them to retake a photograph that was perfectly good.
 *
 * So an empty read shows the page, washed and annotated with nothing, and the
 * Continue button beneath it. Only an engine that could not run is a failure.
 */
function backOutcomeToPhase(outcome: BackPageOutcome): ScanStagePhase {
  if (outcome.status === "failed") {
    return {
      kind: "failed",
      reason: "The reader could not start in this browser.",
    };
  }

  return { kind: "read", boxes: outcome.boxes, fields: outcome.values };
}

/**
 * The scanner's three outcomes, in the words the screen shows.
 *
 * `unverified` deliberately lands in the same place as `failed`: a check digit
 * disagreeing means at least one field is wrong and there is no way to tell
 * which, so presenting the values as read would be presenting a passport
 * number nobody should trust. `PassportAutofill` has always drawn this line
 * and it is drawn in the same place here.
 */
function outcomeToPhase(outcome: ScanOutcome): ScanStagePhase {
  if (outcome.status === "verified" || outcome.status === "partial") {
    const fields = outcome.fields;
    const trusted =
      outcome.status === "verified"
        ? (["passportNumber", "dateOfBirth", "dateOfExpiry"] as const)
        : outcome.trusted;

    return {
      kind: "read",
      boxes: outcome.boxes,
      // Only what was actually taken. Listing a passport number whose check
      // digit disagreed, beside five that passed, invites the applicant to
      // believe it reached the form.
      fields: [
        { label: "Surname", value: fields.surname },
        { label: "Given names", value: fields.givenNames },
        ...(trusted.includes("passportNumber")
          ? [{ label: "Passport no", value: fields.passportNumber }]
          : []),
        ...(trusted.includes("dateOfBirth")
          ? [{ label: "Date of birth", value: fields.dateOfBirth }]
          : []),
        ...(trusted.includes("dateOfExpiry")
          ? [{ label: "Valid till", value: fields.dateOfExpiry }]
          : []),
        { label: "Nationality", value: fields.nationality },
      ],
    };
  }

  return {
    kind: "failed",
    reason:
      outcome.reason === "engine-error"
        ? "The reader could not start in this browser."
        : "No machine-readable zone was found on that image.",
  };
}
