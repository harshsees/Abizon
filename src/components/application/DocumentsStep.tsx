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
  MoreVertical,
  Pencil,
  Plus,
  RotateCw,
  ScanLine,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { getCountrySlug } from "@/data/countries";
import {
  PASSPORT_BACK,
  requiredDocuments,
  type DocumentRequirement,
} from "@/lib/application/documents";
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
  const { state, dispatch, country, config, sync, blocked, next, jumpTo, handoff } =
    useApplication();
  /**
   * A phone that arrived on a hand-off link opens the capture it was sent to.
   *
   * THE OPENING VALUE OF `target`, not an effect that sets it. An effect would
   * paint the document list for one frame and then replace it with the capture
   * takeover, which on a phone is a visible flash of a screen the applicant
   * never asked for; it would also need a ref to stop it firing again the
   * moment the capture was closed, since the URL still says what it said. As
   * an initialiser there is nothing to guard: it runs once, before the first
   * paint, and closing the capture sets `null` like any other close.
   *
   * Resolved only when the traveller and the document it names both exist
   * here. The link carries a POSITION in the party, and a phone that resumed a
   * two-person application has no third traveller for a laptop's third
   * position to point at — an unresolvable target opens the list instead,
   * which is the honest fallback.
   */
  const [target, setTarget] = useState<Target | null>(() => {
    if (!handoff || !country) return null;

    const person = state.travellers[handoff.traveller];
    if (!person) return null;

    const requirement = requiredDocuments(country.documents).find(
      (candidate) => candidate.kind === handoff.document,
    );
    if (!requirement) return null;

    return { travellerId: person.id, requirement };
  });

  const [phoneOpen, setPhoneOpen] = useState(false);

  if (!country || !config) return null;

  /**
   * The hand-off link.
   *
   * Absolute, because it is going into a QR code that a different device
   * reads, and aimed, because a code that only says "open the apply page"
   * makes the phone repeat every screen the laptop has already finished. The
   * params name a screen and nothing else — see the note at the top of
   * `context.tsx`. `pending` is the first traveller with something still
   * outstanding, which is the screen the applicant reached for their phone in
   * order to do.
   */
  const applyPath = `/apply?country=${getCountrySlug(country.name)}`;
  const pending = state.travellers
    .map((person, index) => ({
      index,
      missing: travellerDocumentState(state, country, person).missing[0],
    }))
    .find((candidate) => candidate.missing);

  const handoffPath =
    `${applyPath}&step=documents` +
    (pending ? `&t=${pending.index}&doc=${pending.missing!.kind}` : "");

  const applyUrl =
    typeof window === "undefined"
      ? handoffPath
      : `${window.location.origin}${handoffPath}`;

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
        /**
         * KEYED ON THE ERRAND, and this is load-bearing rather than a lint fix.
         *
         * `onDone` chains one requirement straight into the next without
         * returning to the list — passport, then photograph. Unkeyed, that is
         * the same element in the same position, so React reuses the instance
         * and every `useState` initialiser inside it is skipped: the capture
         * opened on the photograph while still holding the passport's `stage`
         * of `{ kind: "review" }` and its `method` of "upload". The passport
         * review screen is rendered before the method is even consulted, so
         * finishing the passport re-rendered the review instead of opening the
         * live face capture, and Live Capture was unreachable in the shipped
         * flow.
         *
         * The traveller is in the key as well as the requirement: two people
         * both needing a photograph are two errands, not one continued.
         */
        key={`${target.travellerId}:${target.requirement.kind}`}
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
        {state.travellers.map((person, index) => (
          <TravellerCard
            key={person.id}
            traveller={person}
            /* One card in, then the next. See `.animate-traveller-card`. */
            flipDelay={index * 110}
            onOpen={(requirement) =>
              setTarget({ travellerId: person.id, requirement })
            }
            onRetry={(requirement) => {
              if (requirement.kind === "passportBack") return;
              sync.retryDocument(person.id, requirement.kind);
            }}
            onRename={(firstName) =>
              dispatch({ type: "renameTraveller", id: person.id, firstName })
            }
            onRemove={() => dispatch({ type: "removeTraveller", id: person.id })}
            /* The last traveller cannot be removed from here: an application
               with nobody on it is not a state this step can render, and the
               way to start over is Back, not deleting yourself out of the
               screen you are looking at. */
            removable={state.travellers.length > 1}
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

/**
 * ONE TRAVELLER.
 *
 * -- The entrance --
 *
 * The card turns in on its own left edge instead of fading up. That is not
 * decoration for its own sake: this screen is one card on an otherwise empty
 * page, and something arriving with weight is what stops the screen reading as
 * a form that failed to load the rest of itself. Parties stagger, so four
 * travellers arrive as four people.
 *
 * The animation is CSS (`.animate-traveller-card`), not Framer. It is one
 * keyframe on one element and the 3D lives in a `perspective` on the wrapper;
 * there is nothing here for a motion library to interpolate that a keyframe
 * cannot.
 *
 * -- The menu --
 *
 * Rename and remove, behind the three dots in the corner, restored after the
 * rebuild dropped them and put back in the same place. Renaming happens in
 * place: the name turns into an input on the card rather than opening a
 * dialog, because the value being changed is one word long and a modal to edit
 * one word is a modal too many. Escape abandons it, Enter and blur commit, and
 * an empty name is refused rather than stored -- a nameless traveller blocks
 * the step, so accepting one would break the screen from inside the control
 * that is supposed to fix it.
 */
function TravellerCard({
  traveller,
  flipDelay = 0,
  removable,
  onOpen,
  onRetry,
  onRename,
  onRemove,
}: {
  traveller: Traveller;
  /** Milliseconds to hold before the flip-in starts. */
  flipDelay?: number;
  /** False for the last traveller standing -- see the call site. */
  removable: boolean;
  onOpen: (requirement: DocumentRequirement) => void;
  onRetry: (requirement: DocumentRequirement) => void;
  onRename: (firstName: string) => void;
  onRemove: () => void;
}) {
  const { state, country } = useApplication();
  const [editing, setEditing] = useState(false);

  if (!country) return null;

  const { required, provided } = travellerDocumentState(state, country, traveller);
  const initials = traveller.firstName.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="traveller-card-scene w-[312px] max-w-full">
      <section
        aria-label={`Documents for ${traveller.firstName || "this traveller"}`}
        style={{ "--flip-delay": `${flipDelay}ms` } as React.CSSProperties}
        /* 312x315 and an 18px inset, measured off the reference. The height is
           a minimum rather than fixed so a destination asking for one document
           keeps the proportion and one asking for three grows instead of
           clipping. */
        className="animate-traveller-card flex min-h-[300px] w-full flex-col rounded-[20px] bg-surface p-[18px] shadow-e4"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-[46px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-[15px] font-bold tracking-[0.02em] text-on-primary"
          >
            {initials}
          </span>

          <div className="min-w-0 flex-1 pt-0.5">
            {editing ? (
              <NameEditor
                value={traveller.firstName}
                onCommit={(next) => {
                  if (next.trim().length > 0) onRename(next);
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <p className="truncate text-[19px] font-medium uppercase leading-tight tracking-[0.01em] text-foreground underline decoration-border-strong decoration-1 underline-offset-[5px]">
                {traveller.firstName}
              </p>
            )}
            <p className="mt-1 text-[14px] leading-none text-muted-foreground" data-numeric>
              {provided.length}/{required.length} docs uploaded
            </p>
          </div>

          <CardMenu
            name={traveller.firstName}
            removable={removable}
            onEdit={() => setEditing(true)}
            onRemove={onRemove}
          />
        </div>

        {/* `mt-auto` rather than a fixed gap. The reference leaves a good third
            of the card empty between the person and their documents, and that
            space is what stops the card reading as a dense list item -- but it
            is the space LEFT OVER, so it has to be pushed rather than measured,
            or a two-document card and a one-document card stop lining up. */}
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
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Rename in place.
 *
 * Sized and cased to sit exactly where the name was, so opening the editor
 * does not move the card's contents by a pixel -- the text simply becomes
 * editable. Uppercase because the reducer uppercases on commit anyway, and a
 * field that shows one thing and stores another is a field that surprises.
 */
function NameEditor({
  value,
  onCommit,
  onCancel,
}: {
  value: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(draft);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
      aria-label="Traveller's first name"
      autoComplete="off"
      spellCheck={false}
      className="w-full border-b border-border-strong bg-transparent pb-0.5 text-[19px] font-medium uppercase leading-tight tracking-[0.01em] text-foreground outline-none"
    />
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The three dots.
 *
 * A plain popover rather than a library menu: two items, no submenus, no
 * typeahead. What it does owe the keyboard is an escape hatch and a click-away,
 * both of which are here -- a popover that can only be closed by choosing
 * something from it is a trap.
 *
 * Remove asks first. It discards a person and every document attached to them,
 * and it sits one row away from Edit; an undo would be better, but this flow
 * has nowhere to put one, and a confirm is what is available.
 */
function CardMenu({
  name,
  removable,
  onEdit,
  onRemove,
}: {
  name: string;
  removable: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const dismiss = () => {
      setConfirming(false);
      setOpen(false);
    };

    const onPointer = (event: PointerEvent) => {
      if (!wrap.current?.contains(event.target as Node)) dismiss();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);


  return (
    <div ref={wrap} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => {
          // The confirmation belongs to one opening of the menu, not to the
          // card: reopening it must not show "Tap again to remove" still
          // armed from last time. Cleared on the toggle rather than in an
          // effect watching `open`, which is the same reset one render later
          // and one cascading render more expensive.
          setConfirming(false);
          setOpen((value) => !value);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Options for ${name || "this traveller"}`}
        className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors duration-[--duration-fast] hover:bg-surface-sunken hover:text-foreground"
      >
        <MoreVertical aria-hidden className="size-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-raised w-[188px] overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-e3"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-foreground transition-colors hover:bg-surface-sunken"
          >
            <Pencil aria-hidden className="size-3.5 text-muted-foreground" />
            Edit name
          </button>

          {removable && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                if (!confirming) {
                  setConfirming(true);
                  return;
                }
                setOpen(false);
                onRemove();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-destructive transition-colors hover:bg-destructive-subtle"
            >
              <Trash2 aria-hidden className="size-3.5" />
              {confirming ? "Tap again to remove" : "Remove traveller"}
            </button>
          )}
        </div>
      )}
    </div>
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
          {/* The status line, or — when there is no status to report — what
              this row means for the rest of the party.

              A trip document (PAN, ticket, hotel) appears on the lead
              traveller's card and nowhere else, so a family looking at four
              cards sees three extra rows on the first one and nothing to
              explain why. Without the note, the obvious reading is that the
              first traveller has been singled out for extra paperwork.

              The status wins when there is one: "Uploading…" is about this
              second and the note is about the whole application, and stacking
              both puts two lines under a 15px label in a 46px row. */}
          {uploading || failed ? (
            <span
              className={`block truncate text-[11px] ${failed ? "text-destructive" : "text-muted-foreground"}`}
            >
              {failed ? (entry?.error ?? "Did not upload") : "Uploading…"}
            </span>
          ) : (
            requirement.sharedNote && (
              <span className="block truncate text-[11px] text-muted-foreground">
                {requirement.sharedNote}
              </span>
            )
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
