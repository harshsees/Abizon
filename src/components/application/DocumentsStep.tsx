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

import { Check, Loader2, Plus, RotateCw, TriangleAlert, Upload } from "lucide-react";
import { useState } from "react";

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

type Target = { travellerId: string; requirement: DocumentRequirement };

export function DocumentsStep() {
  const { state, dispatch, country, config, sync, blocked, next, jumpTo } =
    useApplication();
  const [target, setTarget] = useState<Target | null>(null);

  if (!country || !config) return null;

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
        travellerName={traveller.firstName}
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
      <header className="max-w-[740px] text-center">
        <h1 className="text-balance text-[26px] font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-[30px] md:text-[34px]">
          The Essential Documents
        </h1>
        <p className="mt-2 text-balance text-base text-muted-foreground sm:text-lg">
          These are as per the official {config.displayName} requirements for
          visa processing
        </p>
      </header>

      <div className="mt-12 flex w-full flex-wrap justify-center gap-6">
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
          The bar. Fixed, because it is the only way out of this screen and a
          screen with five travellers on it scrolls.
          ------------------------------------------------------------------- */}
      <div className="fixed inset-x-0 bottom-0 z-nav border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:border-none md:bg-transparent md:pb-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-[740px] items-center gap-3 px-5 py-4 md:px-0 md:pb-8">
          <button
            type="button"
            onClick={() => jumpTo("travellers")}
            className="inline-flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-border bg-surface text-sm font-bold text-primary shadow-e1 transition-[background-color,transform] duration-[--duration-fast] hover:bg-surface-sunken active:scale-[0.99] motion-reduce:transform-none"
          >
            <Plus aria-hidden className="size-4" />
            Add travelers
          </button>

          <button
            type="button"
            onClick={next}
            disabled={Boolean(blocked)}
            title={blocked}
            className="inline-flex h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-foreground text-sm font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-subtle-foreground active:scale-[0.99] disabled:cursor-default disabled:bg-muted-foreground/60 disabled:shadow-none motion-reduce:transform-none"
          >
            Proceed to checkout
          </button>
        </div>

        {/* The disabled button explains itself rather than sitting there grey.
            This is the flow's oldest complaint and the reason `blockingReason`
            returns a sentence instead of a boolean. */}
        {blocked && (
          <p
            role="status"
            className="pb-3 text-center text-2xs text-muted-foreground md:pb-6"
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
      className="flex w-full max-w-[340px] flex-col rounded-[26px] bg-surface p-5 shadow-e3"
    >
      <div className="flex items-center gap-3.5">
        <span
          aria-hidden
          className="flex size-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold tracking-[0.02em] text-on-primary"
        >
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-medium uppercase tracking-[0.01em] text-foreground underline decoration-border-strong decoration-1 underline-offset-4">
            {traveller.firstName || "Unnamed"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground" data-numeric>
            {provided.length}/{required.length} docs uploaded
          </p>
        </div>
      </div>

      {/* The gap. The reference leaves a good third of the card empty between
          the person and their documents, and it is what stops the card reading
          as a dense list item. */}
      <div className="mt-10 space-y-2.5">
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
          <p className="rounded-2xl bg-surface-sunken px-4 py-3.5 text-2xs text-muted-foreground">
            {country.name} asks for no documents from Indian passport holders.
            There is nothing to attach.
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
        "flex items-center gap-3 rounded-2xl px-3.5 py-3 transition-colors duration-[--duration-fast]",
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
            "flex size-7 flex-shrink-0 items-center justify-center rounded-lg",
            done
              ? "bg-success-subtle text-success"
              : failed
                ? "bg-destructive/10 text-destructive"
                : "bg-primary-subtle text-primary",
          ].join(" ")}
        >
          {done ? (
            <Check className="size-3.5" strokeWidth={3} />
          ) : failed ? (
            <TriangleAlert className="size-3.5" />
          ) : uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
        </span>

        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium text-foreground">
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
