"use client";

/**
 * THE ESSENTIAL DOCUMENTS
 * ---------------------------------------------------------------------------
 * One card per traveller, each listing what that destination asks for, and a
 * bottom bar with the two things a party can do next: add somebody, or go and
 * pay.
 *
 * ── The card is the traveller, not the checklist ──
 *
 * The version this replaces was a vertical list of requirement rows with the
 * traveller's name as a heading above each group. It scanned as one long list
 * of documents that happened to be interrupted by names. The reference makes
 * the person the object — initials, name, "0/2 docs uploaded" — and hangs the
 * requirements off them, which is the shape of the actual question: not "which
 * documents are outstanding" but "who still has something to do".
 *
 * With two travellers that difference is small. With five it is the whole
 * screen.
 *
 * ── The requirement rows do not upload anything ──
 *
 * Pressing one opens `DocumentCapture`, which takes over the screen and does
 * not come back until that document is finished — including, for a passport,
 * the scan and the review of what the scan read. When it returns, if the same
 * traveller still has something missing, the next one opens immediately. The
 * applicant walks a queue rather than returning to a list and choosing again.
 */

import {
  Check,
  Loader2,
  Lock,
  Plus,
  RotateCw,
  ScanLine,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { useState } from "react";

import { getCountrySlug } from "@/data/countries";
import { PASSPORT_BACK, type DocumentRequirement } from "@/lib/application/documents";
import { useApplication } from "@/lib/application/context";
import {
  documentKey,
  travellerDocumentState,
  type DocumentEntry,
  type Traveller,
} from "@/lib/application/state";
import { EMPTY_DETAILS } from "@/lib/application/state";

import { DocumentCapture } from "./capture/DocumentCapture";
import { PhoneHandoffSheet } from "./PhoneHandoffSheet";

type Target = { travellerId: string; requirement: DocumentRequirement };

export function DocumentsStep() {
  const { state, dispatch, country, config, sync, blocked, next, jumpTo } =
    useApplication();
  const [target, setTarget] = useState<Target | null>(null);
  const [phoneOpen, setPhoneOpen] = useState(false);

  if (!country || !config) return null;

  const applyPath = `/apply?country=${getCountrySlug(country.name)}`;
  // Absolute, because it is going into a QR code that a different device reads.
  const applyUrl =
    typeof window === "undefined"
      ? applyPath
      : `${window.location.origin}${applyPath}`;

  const traveller = target
    ? state.travellers.find((candidate) => candidate.id === target.travellerId)
    : undefined;

  /**
   * The next thing this traveller is missing, or nothing.
   *
   * This is what makes the capture screens chain: finishing a photograph asks
   * the same person for their passport without a stop at the list in between.
   */
  const nextMissing = (travellerId: string, just: DocumentRequirement) => {
    const person = state.travellers.find((c) => c.id === travellerId);
    if (!person) return undefined;
    return travellerDocumentState(state, country, person).missing.find(
      (requirement) => requirement.kind !== just.kind,
    );
  };

  if (target && traveller) {
    const details = state.details[traveller.id] ?? EMPTY_DETAILS;
    const detailsReady =
      details.fullName.trim().length > 1 &&
      details.dateOfBirth.length > 0 &&
      details.passportNumber.trim().length >= 6 &&
      details.passportExpiry.length > 0 &&
      details.nationality.trim().length > 1 &&
      details.gender.length > 0 &&
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.contact.email) &&
      state.contact.phone.trim().length >= 8;

    return (
      <DocumentCapture
        requirement={target.requirement}
        photoEntry={state.documents[documentKey(traveller.id, target.requirement.kind)]}
        backEntry={state.documents[documentKey(traveller.id, PASSPORT_BACK.kind)]}
        details={details}
        contact={state.contact}
        detailsComplete={detailsReady}
        onProvide={(kind, entry) =>
          dispatch({ type: "setDocument", travellerId: traveller.id, kind, entry })
        }
        onDetailsChange={(patch) =>
          dispatch({ type: "setDetails", travellerId: traveller.id, patch })
        }
        onContactChange={(patch) => dispatch({ type: "setContact", patch })}
        onExit={() => setTarget(null)}
        onDone={() => {
          const following = nextMissing(traveller.id, target.requirement);
          setTarget(
            following ? { travellerId: traveller.id, requirement: following } : null,
          );
        }}
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col items-center px-5 pb-40 pt-24 md:pt-28">
      <header className="max-w-[620px] text-center">
        <h1 className="text-balance text-[23px] font-bold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[26px] md:text-[30px]">
          The Essential Documents
        </h1>
        <p className="mt-2 text-balance text-[15px] text-muted-foreground sm:text-[17px]">
          As required by {config.displayName} for visa processing
        </p>
      </header>

      <div className="mt-9 flex w-full flex-wrap justify-center gap-5">
        {state.travellers.map((person) => (
          <TravellerCard
            key={person.id}
            traveller={person}
            onOpen={(requirement) =>
              setTarget({ travellerId: person.id, requirement })
            }
            onRetry={(requirement) => {
              if (requirement.kind === "passportBack") return;
              sync.retryDocument(person.id, requirement.kind);
            }}
          />
        ))}
      </div>

      {/* -------------------------------------------------------------------
          OR / Upload from phone.
          Under the cards, not inside them: it applies to every traveller on
          the screen, and repeating it per card would offer the same handset
          five times.
          ------------------------------------------------------------------- */}
      <div className="mt-8 flex w-[312px] max-w-full flex-col items-center">
        <div className="flex w-full items-center gap-3" aria-hidden>
          <span className="h-px flex-1 bg-border" />
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={() => setPhoneOpen(true)}
          className="mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-full px-3 text-[14px] font-bold text-primary transition-colors hover:bg-primary-subtle"
        >
          <ScanLine aria-hidden className="size-4" />
          Upload from phone
        </button>
      </div>

      {phoneOpen && (
        <PhoneHandoffSheet
          applyUrl={applyUrl}
          signedIn={sync.mode === "synced"}
          signInHref={`/login?next=${encodeURIComponent(applyPath)}`}
          onClose={() => setPhoneOpen(false)}
        />
      )}

      {/* -------------------------------------------------------------------
          The bar. Fixed, because it is the only way out of this screen and a
          screen with five travellers on it scrolls.
          ------------------------------------------------------------------- */}
      <div className="fixed inset-x-0 bottom-0 z-nav border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:border-none md:bg-transparent md:pb-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-[600px] items-center gap-3 px-5 py-3.5 md:px-0 md:pb-7">
          <button
            type="button"
            onClick={() => jumpTo("travellers")}
            className="inline-flex h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-surface text-[14px] font-bold text-primary shadow-e1 transition-[background-color,transform] duration-[--duration-fast] hover:bg-surface-sunken active:scale-[0.99] motion-reduce:transform-none"
          >
            <Plus aria-hidden className="size-4" />
            Add travelers
          </button>

          <button
            type="button"
            onClick={next}
            disabled={Boolean(blocked)}
            title={blocked}
            className="inline-flex h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-subtle-foreground active:scale-[0.99] disabled:cursor-default disabled:bg-muted-foreground/60 disabled:shadow-none motion-reduce:transform-none"
          >
            <Lock aria-hidden className="size-3.5" />
            Proceed to checkout
          </button>
        </div>

        {/* The disabled button explains itself rather than sitting there grey.
            This is the flow's oldest complaint and the reason `blockingReason`
            returns a sentence instead of a boolean. */}
        {blocked && (
          <p
            role="status"
            className="pb-3 text-center text-[12px] text-muted-foreground md:pb-5"
          >
            {blocked}
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function TravellerCard({
  traveller,
  onOpen,
  onRetry,
}: {
  traveller: Traveller;
  onOpen: (requirement: DocumentRequirement) => void;
  onRetry: (requirement: DocumentRequirement) => void;
}) {
  const { state, country } = useApplication();
  if (!country) return null;

  const { required, provided } = travellerDocumentState(state, country, traveller);
  const initials = traveller.firstName.slice(0, 2).toUpperCase() || "?";

  return (
    <section
      aria-label={`Documents for ${traveller.firstName || "this traveller"}`}
      /* 312x315 and an 18px inset, measured off the reference. The height is
         a minimum rather than fixed so a destination asking for one document
         keeps the proportion and one asking for three grows instead of
         clipping. */
      className="flex min-h-[300px] w-[312px] max-w-full flex-col rounded-[20px] bg-surface p-[18px] shadow-e4"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex size-[46px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-[15px] font-bold tracking-[0.02em] text-on-primary"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[19px] font-medium uppercase leading-tight tracking-[0.01em] text-foreground underline decoration-border-strong decoration-1 underline-offset-[5px]">
            {traveller.firstName || "Unnamed"}
          </p>
          <p className="mt-1 text-[14px] leading-none text-muted-foreground" data-numeric>
            {provided.length}/{required.length} docs uploaded
          </p>
        </div>
      </div>

      {/* `mt-auto` rather than a fixed gap. The reference leaves a good third
          of the card empty between the person and their documents, and that
          space is what stops the card reading as a dense list item — but it is
          the space LEFT OVER, so it has to be pushed rather than measured, or a
          two-document card and a one-document card stop lining up. */}
      <div className="mt-auto space-y-2 pt-9">
        {required.map((requirement) => (
          <RequirementRow
            key={requirement.kind}
            requirement={requirement}
            entry={state.documents[documentKey(traveller.id, requirement.kind)]}
            onOpen={() => onOpen(requirement)}
            onRetry={() => onRetry(requirement)}
          />
        ))}

        {required.length === 0 && (
          <p className="rounded-[14px] bg-surface-sunken px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
            {country.name} asks for no documents. There is nothing to attach.
          </p>
        )}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * One row. Four states, and each says something different.
 *
 * The middle two — uploading and failed — are the reason this is not a plain
 * button. A document that reached this tab and never reached the server is the
 * one failure in the flow that is expensive to discover late, so it is shown
 * here, on the screen the applicant is already looking at, with the retry
 * beside it.
 */
function RequirementRow({
  requirement,
  entry,
  onOpen,
  onRetry,
}: {
  requirement: DocumentRequirement;
  entry?: DocumentEntry;
  onOpen: () => void;
  onRetry: () => void;
}) {
  const failed = entry?.upload === "failed";
  const uploading = entry?.upload === "uploading";
  const done = Boolean(entry) && !failed;

  return (
    <div
      className={[
        "flex h-[46px] items-center gap-3 rounded-[14px] px-3 transition-colors duration-[--duration-fast]",
        failed ? "bg-destructive-subtle" : "bg-surface-sunken",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
      >
        <span
          aria-hidden
          className={[
            "flex size-[26px] flex-shrink-0 items-center justify-center rounded-lg",
            done
              ? "bg-success-subtle text-success"
              : failed
                ? "bg-destructive/10 text-destructive"
                : "bg-primary-subtle text-primary",
          ].join(" ")}
        >
          {done ? (
            <Check className="size-[13px]" strokeWidth={3} />
          ) : failed ? (
            <TriangleAlert className="size-[13px]" />
          ) : uploading ? (
            <Loader2 className="size-[13px] animate-spin" />
          ) : (
            <Upload className="size-[13px]" />
          )}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium leading-none text-foreground">
            {requirement.shortLabel}
          </span>
          {(uploading || failed) && (
            <span
              className={`block truncate text-[11px] ${failed ? "text-destructive" : "text-muted-foreground"}`}
            >
              {failed ? (entry?.error ?? "Did not upload") : "Uploading…"}
            </span>
          )}
        </span>
      </button>

      {failed && (
        <button
          type="button"
          onClick={onRetry}
          aria-label={`Retry uploading the ${requirement.shortLabel.toLowerCase()}`}
          className="flex size-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
        >
          <RotateCw aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  );
}
