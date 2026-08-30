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
 * WHAT HAPPENS TO THE BACK PAGE. It is held in this tab and shown on the
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
import { fieldsToDetails } from "@/lib/application/mrzFields";
import { BrowserMrzScanner, type ScanOutcome, type ScanProgress } from "@/lib/passport/scan";

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

type Stage =
  | { kind: "supply"; face: Face }
  | { kind: "scanning"; imageUrl: string; progress: ScanProgress | null }
  | { kind: "scanned"; imageUrl: string; outcome: ScanOutcome }
  | { kind: "review" };

const HEADINGS: Record<string, { top: string; accent: string }> = {
  "photograph:camera": { top: "Look ahead,", accent: "straight at the camera" },
  "photograph:upload": { top: "Your photograph,", accent: "plain background" },
  "passport:photo": { top: "Passport,", accent: "photo page up" },
  "passport:back": { top: "Now flip to the", accent: "back page" },
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
      setStage({ kind: "scanning", imageUrl, progress: null });

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
      setStage({ kind: "review" });
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
      setStage({ kind: "review" });
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

  const face: Face =
    stage.kind === "supply"
      ? stage.face
      : // The scan and its result are both about the page just supplied, which
        // is the photo page; the card only turns over when the back is asked
        // for.
        "photo";
  const headingKey = isPassport
    ? `passport:${face}`
    : `photograph:${method}`;
  const heading = HEADINGS[headingKey] ?? {
    top: requirement.label,
    accent: "ready when you are",
  };

  return (
    <CaptureTakeover
      titleTop={heading.top}
      titleAccent={heading.accent}
      methods={stage.kind === "supply" ? METHODS : undefined}
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
          onRetake={() => setStage({ kind: "supply", face: "photo" })}
        />
      )}

      {stage.kind === "scanned" && (
        <>
          <ScanStage
            imageUrl={stage.imageUrl}
            phase={outcomeToPhase(stage.outcome)}
            onRetake={() => setStage({ kind: "supply", face: "photo" })}
          />
          <button
            type="button"
            onClick={() => setStage({ kind: "supply", face: "back" })}
            className="mt-10 inline-flex h-[54px] w-full max-w-[360px] cursor-pointer items-center justify-center rounded-2xl bg-foreground text-base font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-subtle-foreground active:scale-[0.99] motion-reduce:transform-none"
          >
            Continue
          </button>
        </>
      )}
    </CaptureTakeover>
  );
}

/* -------------------------------------------------------------------------- */

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
