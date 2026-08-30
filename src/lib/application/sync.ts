"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  finaliseUploadAction,
  openApplicationAction,
  saveTravellersAction,
  submitApplicationAction,
  updateApplicationAction,
  uploadTicketAction,
} from "@/app/actions/applications";
import type { Country } from "@/data/countries";
import { getCountrySlug } from "@/data/countries";

import { STORED_DOCUMENT_KINDS, type StoredDocumentKind } from "./documents";
import {
  documentKey,
  type ApplicationAction,
  type ApplicationState,
  type DocumentEntry,
  type TravellerDetails,
} from "./state";

/**
 * THE SYNC LAYER — where the flow stops being a tab and starts being a record.
 * ---------------------------------------------------------------------------
 * Everything before this commit ran in the browser. `applicationDraft.ts` says
 * so in its own header — drafts are "a record, in this browser's localStorage",
 * explicitly "not an account, a synced application, or a submission" — and it
 * lists what it deliberately refuses to store: passport numbers, dates of
 * birth, expiry dates, email, phone, and above all the document files.
 *
 * This is where those go instead, and the local draft keeps doing its job
 * unchanged: it is still what makes "Resume application" work on the country
 * page before anybody has signed in.
 *
 * ── The shape, and why it is a controller rather than an effect per field ──
 *
 * Four things have to happen in an order that the applicant never sees:
 *
 *   1. open      the application row exists before anything can reference it
 *   2. travellers  rows exist before a document can point at one
 *   3. documents   bytes go straight to storage, never through a function
 *   4. submit      the one irreversible step, and the only one with a button
 *
 * Step 2 is the awkward one and it is worth being explicit about. The step
 * order is setup → documents → details, so an applicant uploads a passport scan
 * for a traveller who so far has nothing but a first name. A `documents` row
 * references a `travellers` row, so the traveller has to be saved at the *setup*
 * step, with a name and nothing else, and saved again as details arrive.
 *
 * ── Everything degrades ──
 *
 * No account, or no database: this does nothing at all, silently, and the flow
 * behaves exactly as it did before — held in the tab, with the copy that says
 * so. That is not a fallback bolted on afterwards; it is the reason
 * `mode` is the first thing computed and every operation checks it.
 */

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type SyncMode =
  /** The opening call has not answered yet. Nothing is claimed either way. */
  | "unknown"
  /** No account, or no backend. The flow is local and says so. */
  | "local"
  /** Signed in with a backend. Everything below is live. */
  | "synced";

/** Why the flow is local, when it is. The shell says different things for each
 *  — one is a sign-in prompt and the other is a note for a developer. */
export type LocalReason = "no-account" | "no-backend";

export type SyncStatus = "idle" | "opening" | "saving" | "ready" | "error";

export type ApplicationSync = {
  mode: SyncMode;
  localReason?: LocalReason;
  status: SyncStatus;
  /** The server's id, once the application row exists. */
  applicationId?: string;
  /** The human-sayable reference. Shown after submission, and on the phone. */
  reference?: string;
  /** Set once the applicant has submitted. Terminal. */
  submittedReference?: string;
  /** The last thing that went wrong, for the shell to surface. */
  error?: string;

  /** True while any document is in flight. */
  uploading: boolean;
  /** Every required document has reached the server. */
  documentsStored: boolean;

  submit: () => Promise<void>;
  submitting: boolean;
  /** Re-attempts one failed upload. */
  retryDocument: (travellerId: string, kind: StoredDocumentKind) => void;
};

/** What the restore payload carries back, mirrored from the action. */
type Restored = {
  travellers: Array<{
    position: number;
    fullName?: string | null;
    dateOfBirth?: string | null;
    passportNumber?: string | null;
    passportExpiry?: string | null;
    nationality?: string | null;
    gender?: string | null;
    email?: string | null;
    phone?: string | null;
  }>;
  documents: Array<{
    id: string;
    travellerPosition: number;
    kind: string;
    status: string;
    rejectionReason: string | null;
  }>;
};

/**
 * NO `signedIn` OR `backendReady` PROP, and that is the important design
 * decision in this file.
 *
 * The obvious shape is a server component that reads the session and the
 * capability flags and passes them down. It cannot be used here: `/apply` is a
 * statically prerendered route whose client subtree reads `localStorage` in the
 * reducer's initialiser, and it gets away with that *only* because
 * `useSearchParams` inside a `<Suspense>` boundary keeps the subtree from ever
 * rendering on the server (see `app/apply/page.tsx`). Reading cookies in the
 * page would make the route dynamic, the subtree would render server-side with
 * no draft, and every visit would hydrate into a mismatch.
 *
 * So the hook asks instead of being told. `openApplicationAction` answers
 * `{ available: false, reason }` for both "no account" and "no backend", and
 * the mode falls out of the answer. It is one round trip, it is self-correcting
 * when a session expires mid-form, and it keeps the route static.
 */
export type SyncInput = {
  state: ApplicationState;
  dispatch: (action: ApplicationAction) => void;
  country?: Country;
  /** Applies a restored server application to the reducer, once. */
  onRestore: (
    restored: Restored & {
      plan: number | null;
      travelDate: string | null;
      travelWindow: string | null;
      step: string | null;
    },
  ) => void;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A captured image arrives as a data URL, because that is what a canvas
 * produces and what the preview needs. Storage needs bytes.
 *
 * `fetch` on a `data:` URL is the shortest correct conversion — it handles the
 * base64 decode and reads the MIME type out of the URL, both of which a
 * hand-rolled `atob` loop gets subtly wrong for anything but ASCII.
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function isRetryable(message: string): boolean {
  // A message about the file itself will fail identically on a retry, and
  // offering one invites the applicant to press it four times.
  return !/not accepted|too large|is \d+MB|limit is/i.test(message);
}

/* -------------------------------------------------------------------------- */
/* The hook                                                                   */
/* -------------------------------------------------------------------------- */

export function useApplicationSync(input: SyncInput): ApplicationSync {
  const { state, dispatch, country, onRestore } = input;

  const [mode, setMode] = useState<SyncMode>("unknown");
  const [localReason, setLocalReason] = useState<LocalReason>();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [applicationId, setApplicationId] = useState<string>();
  const [reference, setReference] = useState<string>();
  const [submittedReference, setSubmittedReference] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  /**
   * Client traveller id → server traveller id.
   *
   * Held in a ref rather than state because uploads read it inside an async
   * loop, and a stale closure over a state value would send a passport scan to
   * whichever traveller occupied that position a render ago.
   */
  const travellerIds = useRef<Map<string, string>>(new Map());

  /**
   * Set whenever the traveller list changes and cleared when a save lands.
   *
   * This is the guard that matters. `saveTravellers` replaces the list by
   * *position*, so removing the first of three travellers shifts everybody up
   * — and between that removal and the next save, the id map points at the
   * wrong rows. Uploading during that window would attach one applicant's
   * passport to another's record, which is the single worst bug available in
   * this flow. So uploads wait.
   */
  const travellersStale = useRef(true);

  const slug = country ? getCountrySlug(country.name) : undefined;

  /* ---------------------------------------------------------------------- */
  /* 1 — open                                                               */
  /* ---------------------------------------------------------------------- */

  const opened = useRef(false);

  useEffect(() => {
    if (!slug || opened.current) return;
    opened.current = true;

    let cancelled = false;
    setStatus("opening");

    void (async () => {
      const result = await openApplicationAction({ countrySlug: slug });

      if (cancelled) return;

      if (result?.serverError || !result?.data) {
        // A genuine failure, not a "no thanks". Fall back to local so the
        // applicant can still fill the form, and reset the latch so a remount
        // can try again — a transient error here must not leave the flow
        // permanently unable to save with no way back.
        setMode("local");
        setStatus("error");
        setError(result?.serverError ?? "Could not reach the server. Nothing is being saved.");
        opened.current = false;
        return;
      }

      if (!result.data.available) {
        setMode("local");
        setLocalReason(result.data.reason);
        setStatus("ready");
        return;
      }

      const data = result.data;
      setMode("synced");
      setApplicationId(data.applicationId);
      setReference(data.reference);

      // An application already submitted must not be edited. The server
      // enforces this too (`updateApplication` requires status `draft`), and
      // saying so here is what stops the flow from looking like it is saving.
      if (data.status !== "draft") {
        setSubmittedReference(data.reference);
      }

      travellerIds.current = new Map();
      travellersStale.current = true;

      if (data.travellers.length > 0 || data.documents.length > 0) {
        onRestore({
          travellers: data.travellers,
          documents: data.documents,
          plan: data.plan,
          travelDate: data.travelDate,
          travelWindow: data.travelWindow,
          step: data.step,
        });
      }

      setStatus("ready");
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, onRestore]);

  /* ---------------------------------------------------------------------- */
  /* 2 — application fields, debounced                                      */
  /* ---------------------------------------------------------------------- */

  /**
   * Debounced because the apply flow writes on every keystroke that changes a
   * date and on every step change. Eight hundred milliseconds is long enough to
   * collapse a burst and short enough that closing the tab immediately after a
   * change loses at most one.
   */
  const fieldsSignature = JSON.stringify({
    plan: state.plan,
    travelDate: state.travelDate ?? null,
    travelWindow: state.travelWindow ?? null,
    step: state.step,
  });

  useEffect(() => {
    if (mode !== "synced" || !applicationId || submittedReference) return;

    const timer = setTimeout(() => {
      void updateApplicationAction({
        applicationId,
        plan: state.plan,
        travellerCount: Math.max(1, state.travellers.length),
        travelDate: state.travelDate ?? null,
        travelWindow: state.travelWindow ?? null,
        step: state.step,
      }).then((result) => {
        // Deliberately quiet. A failed autosave is not something to interrupt
        // somebody mid-form about — the applicant did not ask for it and cannot
        // act on it. It is surfaced when it matters, at submission, where the
        // server re-checks everything anyway.
        if (result?.serverError) {
          console.warn("[sync] could not save trip details", result.serverError);
        }
      });
    }, 800);

    return () => clearTimeout(timer);

    // The serialised signature IS the dependency. Listing the fields
    // individually would re-fire on identical values, because `travelDate`
    // flips between `undefined` and `null` as it crosses the action boundary
    // and those are different identities to React.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, applicationId, submittedReference, fieldsSignature, state.travellers.length]);

  /* ---------------------------------------------------------------------- */
  /* 3 — travellers, debounced                                              */
  /* ---------------------------------------------------------------------- */

  const travellersSignature = JSON.stringify(
    state.travellers.map((traveller) => ({
      name: traveller.firstName,
      details: state.details[traveller.id] ?? null,
    })),
  );

  useEffect(() => {
    if (mode !== "synced" || !applicationId || submittedReference) return;
    if (state.travellers.length === 0) return;

    travellersStale.current = true;

    const timer = setTimeout(() => {
      /**
       * The whole list, every time, with everything known about each traveller.
       *
       * A patch would be smaller and would be wrong: the applicant can go back
       * to the setup step after entering passport details, and a save from
       * there carrying only names would null every detail on the server. A
       * complete replace cannot do that, because the payload is always the
       * complete truth as this tab knows it.
       */
      const payload = state.travellers.map((traveller, position) => {
        const details: TravellerDetails | undefined = state.details[traveller.id];

        return {
          position,
          // Before the details step there is only a first name. It is written
          // as the full name so the ops queue is not full of blank rows, and
          // overwritten with the real one the moment it is typed.
          fullName: details?.fullName?.trim() || traveller.firstName || null,
          dateOfBirth: details?.dateOfBirth || null,
          passportNumber: details?.passportNumber?.trim() || null,
          passportExpiry: details?.passportExpiry || null,
          nationality: details?.nationality?.trim() || null,
          gender: details?.gender || null,
          // Contact details belong to the lead traveller only — that is the
          // one the form collects them for.
          email: position === 0 ? state.contact.email.trim() || null : null,
          phone: position === 0 ? state.contact.phone.trim() || null : null,
        };
      });

      setStatus("saving");

      void saveTravellersAction({ applicationId, travellers: payload }).then((result) => {
        if (result?.serverError || !result?.data) {
          setStatus("error");
          setError(result?.serverError ?? "Could not save traveller details.");
          return;
        }

        const map = new Map<string, string>();
        for (const assigned of result.data.travellerIds) {
          const traveller = state.travellers[assigned.position];
          if (traveller) map.set(traveller.id, assigned.id);
        }

        travellerIds.current = map;
        travellersStale.current = false;
        setStatus("ready");
        setError(undefined);
      });
    }, 800);

    return () => clearTimeout(timer);

    // Same reasoning as the effect above: the signature is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    applicationId,
    submittedReference,
    travellersSignature,
    state.contact.email,
    state.contact.phone,
  ]);

  /* ---------------------------------------------------------------------- */
  /* 4 — documents                                                          */
  /* ---------------------------------------------------------------------- */

  /**
   * One at a time, and never two of the same document.
   *
   * The effect below re-runs on every state change, and an upload takes
   * seconds. Without this, a keystroke during an upload would start a second
   * one for the same file — two objects in storage, two rows, and the second
   * marking the first deleted.
   */
  const inFlight = useRef<Set<string>>(new Set());

  const uploadOne = useCallback(
    async (travellerId: string, kind: StoredDocumentKind, entry: DocumentEntry) => {
      const key = documentKey(travellerId, kind);
      if (inFlight.current.has(key)) return;

      const serverTravellerId = travellerIds.current.get(travellerId);
      if (!serverTravellerId) return;

      const blob =
        entry.blob ??
        (entry.previewDataUrl ? await dataUrlToBlob(entry.previewDataUrl) : undefined);

      if (!blob) return;

      inFlight.current.add(key);
      dispatch({ type: "setDocumentUpload", travellerId, kind, patch: { upload: "uploading" } });

      const fail = (message: string) => {
        inFlight.current.delete(key);
        dispatch({
          type: "setDocumentUpload",
          travellerId,
          kind,
          patch: { upload: "failed", error: message },
        });
      };

      try {
        const ticket = await uploadTicketAction({
          travellerId: serverTravellerId,
          kind,
          contentType: blob.type || "image/jpeg",
          byteSize: blob.size,
        });

        if (ticket?.serverError || !ticket?.data) {
          fail(ticket?.serverError ?? "Could not prepare the upload.");
          return;
        }

        /**
         * Straight to Supabase. The bytes never touch a function of ours — see
         * the header of `lib/storage/documents.ts` for the two reasons, of
         * which the binding one is that Vercel caps a function's request body
         * at about 4.5MB and a phone camera passport scan is routinely larger.
         */
        const put = await fetch(ticket.data.uploadUrl, {
          method: "PUT",
          body: blob,
          headers: { "content-type": blob.type || "image/jpeg" },
        });

        if (!put.ok) {
          fail("The upload did not complete. Check your connection and try again.");
          return;
        }

        const finalised = await finaliseUploadAction({
          travellerId: serverTravellerId,
          kind,
          path: ticket.data.path,
        });

        if (finalised?.serverError || !finalised?.data) {
          fail(finalised?.serverError ?? "We could not process that image.");
          return;
        }

        inFlight.current.delete(key);
        dispatch({
          type: "setDocumentUpload",
          travellerId,
          kind,
          patch: { upload: "stored", documentId: finalised.data.documentId },
        });
      } catch {
        fail("The upload did not complete. Check your connection and try again.");
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (mode !== "synced" || !applicationId || submittedReference) return;
    // See `travellersStale` — uploading against a stale id map would attach one
    // applicant's passport to another's record.
    if (travellersStale.current) return;

    for (const traveller of state.travellers) {
      for (const kind of STORED_DOCUMENT_KINDS) {
        const entry = state.documents[documentKey(traveller.id, kind)];
        if (entry?.upload === "local") {
          void uploadOne(traveller.id, kind, entry);
        }
      }
    }
  }, [mode, applicationId, submittedReference, state.documents, state.travellers, uploadOne]);

  const retryDocument = useCallback(
    (travellerId: string, kind: StoredDocumentKind) => {
      const entry = state.documents[documentKey(travellerId, kind)];
      if (!entry) return;

      inFlight.current.delete(documentKey(travellerId, kind));
      dispatch({ type: "setDocumentUpload", travellerId, kind, patch: { upload: "local" } });
    },
    [state.documents, dispatch],
  );

  /* ---------------------------------------------------------------------- */
  /* 5 — submit                                                             */
  /* ---------------------------------------------------------------------- */

  const submit = useCallback(async () => {
    if (mode !== "synced" || !applicationId || submitting || submittedReference) return;

    setSubmitting(true);
    setError(undefined);

    const result = await submitApplicationAction({ applicationId });

    setSubmitting(false);

    if (result?.serverError || !result?.data) {
      setError(result?.serverError ?? "We could not submit that. Try again.");
      return;
    }

    setSubmittedReference(result.data.reference);
  }, [mode, applicationId, submitting, submittedReference]);

  /* ---------------------------------------------------------------------- */

  const entries = Object.values(state.documents);
  const uploading = entries.some((entry) => entry.upload === "uploading");

  const documentsStored = useMemo(() => {
    if (mode !== "synced") return false;
    if (entries.length === 0) return false;
    return entries.every((entry) => entry.upload === "stored");
  }, [mode, entries]);

  return {
    mode,
    localReason,
    status,
    applicationId,
    reference,
    submittedReference,
    error,
    uploading,
    documentsStored,
    submit,
    submitting,
    retryDocument,
  };
}

export { isRetryable };
