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
 * `buildSummary` already computes without asking anyone. They are `supported`.
 *
 * `submitted` onward describe things that happen on a server and at a consulate.
 * Abizon has no submission endpoint, no applications API and no authority
 * integration, so nothing in this codebase can know whether an application was
 * received, is being processed, or has been decided. They are NOT supported,
 * and no code path may report them until a real source does.
 *
 * That distinction is data, not a comment: `isStatusSupported` is what the UI
 * branches on, so adding a real service is a matter of flipping the flag and
 * implementing `lookupApplicationStatus` — not of hunting for hardcoded
 * assumptions in components.
 */

export type ApplicationStatusId =
  | "draft"
  | "ready"
  | "submitted"
  | "received"
  | "processing"
  | "decision"
  | "completed";

export type ApplicationStatusMeta = {
  id: ApplicationStatusId;
  label: string;
  description: string;
  /**
   * True only where THIS BUILD can genuinely determine the status. Everything
   * from `submitted` on needs a backend that does not exist.
   */
  supported: boolean;
};

/** Ordered. The index is the lifecycle position. */
export const APPLICATION_STATUSES: readonly ApplicationStatusMeta[] = [
  {
    id: "draft",
    label: "Draft",
    description: "Started on this device. Not everything is filled in yet.",
    supported: true,
  },
  {
    id: "ready",
    label: "Ready to submit",
    description: "Every step is complete. Nothing has been filed or charged.",
    supported: true,
  },
  {
    id: "submitted",
    label: "Submitted",
    description: "Sent to Abizon for filing.",
    supported: false,
  },
  {
    id: "received",
    label: "Received",
    description: "Abizon has the application and has begun document checks.",
    supported: false,
  },
  {
    id: "processing",
    label: "With the authority",
    description: "Filed with the destination's immigration authority.",
    supported: false,
  },
  {
    id: "decision",
    label: "Decision issued",
    description: "The authority has decided.",
    supported: false,
  },
  {
    id: "completed",
    label: "Delivered",
    description: "The outcome has been sent to you.",
    supported: false,
  },
] as const;

export function statusIndex(id: ApplicationStatusId): number {
  return APPLICATION_STATUSES.findIndex((status) => status.id === id);
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

export type TrackingLookup =
  | {
      available: false;
      /**
       * `"no-status-service"` — there is no applications API in this build.
       * This is the only reason that can be returned today, and it is about
       * Abizon's capability, NOT about the reference the user typed. The page
       * must not imply the reference was checked and not found.
       */
      reason: "no-status-service";
    }
  | {
      available: true;
      status: ApplicationStatusId;
      events: TrackingEvent[];
    };

/**
 * The one function to implement when an applications API exists.
 *
 * It returns `{ available: false }` unconditionally. Nothing is fetched,
 * nothing is matched, and the reference is not consulted — so the UI built on
 * it says "we cannot look this up" rather than "we looked and found nothing",
 * which are very different statements to someone with a flight booked.
 */
export async function lookupApplicationStatus(
  reference: string,
): Promise<TrackingLookup> {
  // Referenced so the signature a real lookup needs survives, and so this
  // cannot be mistaken for a working implementation.
  void reference;
  return { available: false, reason: "no-status-service" };
}
