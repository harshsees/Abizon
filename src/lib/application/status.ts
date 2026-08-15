/**
 * APPLICATION STATUS MODEL
 * ---------------------------------------------------------------------------
 * The full lifecycle an application will eventually move through, and — kept
 * separately and deliberately — the part of it this build can actually observe.
 *
 * THE LINE THIS FILE DRAWS
 *
 * `draft` and `ready` are determined entirely on this device, from the
 * application state itself: whether every step is satisfied is something
 * `buildSummary` already computes without asking anyone.
 *
 * ── WHAT CHANGED, AND WHAT DID NOT ──
 *
 * This file used to say that `submitted` onward "describe things that happen on
 * a server and at a consulate", that Abizon had no submission endpoint and no
 * applications API, and that no code path could report them. That was true and
 * it is no longer: there is a submission endpoint, an applications table, and an
 * ops console in which a named member of staff records what happened.
 *
 * So the flags flip. What has NOT changed is the standard they were set by —
 * a status is `supported` when this system can genuinely determine it, and not
 * when it would be convenient to display. `processing` is supported because a
 * person at Abizon filed the application and said so, which is a real
 * observation with an actor and a timestamp against it in `application_events`.
 *
 * There is still no authority integration, and there is no honest way to build
 * one: consulates do not publish status APIs. Every status past `submitted`
 * therefore means "a member of staff observed this", which is weaker than an
 * API and is what the tracking page says.
 */

export type ApplicationStatusId =
  | "draft"
  | "ready"
  | "submitted"
  | "received"
  | "processing"
  | "decision"
  | "completed"
  /** Out of sequence. An application the applicant stopped, which is an ending
   *  rather than a stage — see `inSequence`. */
  | "withdrawn";

export type ApplicationStatusMeta = {
  id: ApplicationStatusId;
  label: string;
  description: string;
  /**
   * True where THIS BUILD can genuinely determine the status. Every one of them
   * now can — the first two from the application state, the rest from a
   * transition a named member of staff recorded.
   */
  supported: boolean;
  /**
   * Whether it is a stage on the way through. `withdrawn` is not: it is where
   * an application stops, and drawing it as a step everybody passes through
   * would be wrong for the ninety-nine applications that never reach it.
   */
  inSequence: boolean;
};

/** Ordered. The index is the lifecycle position. */
export const APPLICATION_STATUSES: readonly ApplicationStatusMeta[] = [
  {
    id: "draft",
    label: "Draft",
    description: "Started, but not everything is filled in yet.",
    supported: true,
    inSequence: true,
  },
  {
    id: "ready",
    label: "Ready to submit",
    description: "Every step is complete. Nothing has been filed or charged.",
    supported: true,
    inSequence: true,
  },
  {
    id: "submitted",
    label: "Submitted",
    description: "Sent to Abizon for filing.",
    supported: true,
    inSequence: true,
  },
  {
    id: "received",
    label: "Received",
    description: "Abizon has checked the documents and accepted them.",
    supported: true,
    inSequence: true,
  },
  {
    id: "processing",
    label: "With the authority",
    description: "Filed with the destination's immigration authority.",
    supported: true,
    inSequence: true,
  },
  {
    id: "decision",
    label: "Decision issued",
    description: "The authority has decided.",
    supported: true,
    inSequence: true,
  },
  {
    id: "completed",
    label: "Delivered",
    description: "The outcome has been sent to you.",
    supported: true,
    inSequence: true,
  },
  {
    id: "withdrawn",
    label: "Withdrawn",
    description: "Stopped at your request. Nothing further will be filed.",
    supported: true,
    inSequence: false,
  },
] as const;

/** The stages drawn as a journey. Excludes `withdrawn` — see `inSequence`. */
export const SEQUENCE_STATUSES = APPLICATION_STATUSES.filter(
  (status) => status.inSequence,
);

/** Position in the journey, or -1 for a status that is not part of it. */
export function statusIndex(id: ApplicationStatusId): number {
  return SEQUENCE_STATUSES.findIndex((status) => status.id === id);
}

/**
 * The database speaks a slightly different vocabulary from the interface —
 * `decided` and `closed` rather than `decision` and `delivered` — because the
 * schema names an event and the interface names what the applicant sees. One
 * translation, here, rather than a `switch` in every component.
 */
export function statusFromDatabase(value: string): ApplicationStatusId {
  switch (value) {
    case "decided":
      return "decision";
    case "closed":
      return "completed";
    case "draft":
    case "ready":
    case "submitted":
    case "received":
    case "processing":
    case "withdrawn":
      return value;
    default:
      // A status this build does not know about is a deployment where the
      // schema moved ahead of the interface. Reporting the last thing that is
      // certainly true beats inventing a stage.
      return "submitted";
  }
}

export function isStatusSupported(id: ApplicationStatusId): boolean {
  return APPLICATION_STATUSES.find((status) => status.id === id)?.supported ?? false;
}

/** The statuses this build can report at all. Today: the first two. */
export const SUPPORTED_STATUSES: ApplicationStatusId[] = APPLICATION_STATUSES.filter(
  (status) => status.supported,
).map((status) => status.id);

/* -------------------------------------------------------------------------- */
/* Events                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A timestamped transition. The shape a real service would return, so the
 * timeline can render history rather than only a current position.
 *
 * There is no code today that constructs one of these. That is the point: an
 * empty event list is the truthful answer, and a component that renders events
 * will render nothing rather than something invented.
 */
export type TrackingEvent = {
  id: string;
  status: ApplicationStatusId;
  /** ISO 8601, from the source that observed it. Never `Date.now()` locally. */
  at: string;
  note?: string;
};

/* -------------------------------------------------------------------------- */
/* The data source seam                                                       */
/* -------------------------------------------------------------------------- */

/**
 * THE TWO REASONS A LOOKUP CAN FAIL, and the distinction the whole tracking
 * page was built around: "we cannot look this up" and "we looked and found
 * nothing" are very different sentences to someone with a flight booked.
 *
 * Before there was a backend only the first could be returned, and the page was
 * written to never imply the reference had been checked. Now both are real, and
 * the page can finally say which one happened.
 */
export type TrackingLookup =
  | {
      available: false;
      /**
       * `"no-status-service"` — this deployment has no database, so nothing was
       * consulted. A statement about Abizon, not about the reference.
       * `"not-found"` — the reference was checked and no application has it.
       */
      reason: "no-status-service" | "not-found";
    }
  | {
      available: true;
      reference: string;
      countrySlug: string;
      status: ApplicationStatusId;
      events: TrackingEvent[];
    };
