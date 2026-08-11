/**
 * APPLICATION STATE MODEL
 * ---------------------------------------------------------------------------
 * One reducer, one shape, one place that decides what "complete" means.
 *
 * WHY A REDUCER AND NOT useState
 *
 * The flow this replaces held fourteen `useState` calls in a 1179-line
 * component, and the relationships between them were implicit. Whether the
 * user could reach checkout was recomputed inline from three of them
 * (`allDocsUploaded`), whether a traveller card was in "name entry" mode was
 * encoded as `firstName === ""`, and the step could be set from four different
 * click handlers without anything checking the step before it was satisfied.
 *
 * The rule here is that **validation and progress are derived, never stored**.
 * `isStepComplete` reads the state; nothing writes a `stepValid` flag that can
 * fall out of date. The only stored progress is which step the user is looking
 * at, plus the direction they arrived from — and the direction exists purely so
 * a transition can be played, with no animation library referenced anywhere in
 * this file.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 *   - Prices. Every figure comes from `computeTotals` at read time via
 *     `buildSummary`. There is no fee in this module and no second GST.
 *   - Submission. There is no API, so there is no `submitting`, no
 *     `applicationId`, and no success state. The terminal step is `"ready"`,
 *     which means exactly what it says.
 *   - Document approval. A file being present is `"provided"`. Whether it is
 *     acceptable is a judgement only a reviewer can make, and no reviewer
 *     exists yet.
 */

import type { Country } from "@/data/countries";
import {
  computeTotals,
  resolveCountryVisaConfig,
  type CountryVisaConfig,
} from "@/lib/countryVisa";

import { requiredDocuments, type DocumentKind, type DocumentRequirement } from "./documents";

/* -------------------------------------------------------------------------- */
/* Steps                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * The sequence is derived from the destination, not assumed.
 *
 * `documents` drops out entirely where `country.documents` is
 * "No Documents Required" — around a dozen destinations in the dataset. The
 * previous flow had no way to express that and asked everyone for two files.
 */
export type ApplicationStepId = "setup" | "documents" | "details" | "review" | "ready";

export type ApplicationStepMeta = {
  id: ApplicationStepId;
  /** Rail label and the accessible step name. */
  label: string;
  /** Small line above the heading. */
  eyebrow: string;
  /** The editorial heading at the top of the step. */
  title: string;
  /**
   * The CTA label shown WHILE ON this step, naming where it goes.
   *
   * Phase 5B §17 forbids ambiguous labels, so no step says just "Continue".
   * `setup` is resolved at build time because where it leads depends on
   * whether the destination asks for documents at all.
   */
  cta: string;
};

const STEP_META: Record<ApplicationStepId, Omit<ApplicationStepMeta, "id">> = {
  setup: {
    label: "Trip",
    eyebrow: "Your trip",
    title: "Confirm your trip",
    cta: "Continue to documents",
  },
  documents: {
    label: "Documents",
    eyebrow: "Documents",
    title: "Prepare your documents",
    cta: "Continue to passport details",
  },
  details: {
    label: "Details",
    eyebrow: "Passport details",
    title: "Enter passport details",
    cta: "Review application",
  },
  review: {
    label: "Review",
    eyebrow: "Review",
    title: "Check everything over",
    cta: "Confirm and finish",
  },
  ready: {
    label: "Ready",
    eyebrow: "Ready",
    title: "Ready to submit",
    cta: "",
  },
};

/** The ordered steps for a destination. */
export function stepSequence(country?: Country): ApplicationStepMeta[] {
  const ids: ApplicationStepId[] = ["setup", "documents", "details", "review", "ready"];

  const needsDocuments = country
    ? requiredDocuments(country.documents).length > 0
    : true;

  return ids
    .filter((id) => (id === "documents" ? needsDocuments : true))
    .map((id) => {
      const meta = { id, ...STEP_META[id] };
      // Nothing should promise a documents step that will not appear.
      if (id === "setup" && !needsDocuments) {
        return { ...meta, cta: "Continue to passport details" };
      }
      return meta;
    });
}

/* -------------------------------------------------------------------------- */
/* Shape                                                                      */
/* -------------------------------------------------------------------------- */

export type Traveller = {
  id: string;
  /** Upper-cased as entered. Empty means the card is still awaiting a name. */
  firstName: string;
};

/**
 * A supplied document.
 *
 * There is no "approved" or "reviewing" member. The previous uploader flipped
 * itself to "approved" on a 900ms timer, which told the applicant their
 * passport had passed a check that never ran.
 */
export type DocumentEntry = {
  source: "upload" | "capture";
  /** Present for an uploaded file. */
  fileName?: string;
  /** Bytes, for the uploaded-file line. */
  fileSize?: number;
  /**
   * A thumbnail, for images only. Produced by a real `FileReader` pass — which
   * is genuinely asynchronous, and is the only thing in this flow that has an
   * honest loading state. Held in memory only; never persisted.
   */
  previewDataUrl?: string;
  providedAt: number;
};

/** Keyed `${travellerId}:${kind}` so one map covers every traveller. */
export type DocumentMap = Record<string, DocumentEntry>;

export function documentKey(travellerId: string, kind: DocumentKind): string {
  return `${travellerId}:${kind}`;
}

/** The passport-derived fields. Distinct from the document image itself. */
export type TravellerDetails = {
  fullName: string;
  dateOfBirth: string;
  passportNumber: string;
  passportExpiry: string;
  nationality: string;
  gender: string;
};

export const EMPTY_DETAILS: TravellerDetails = {
  fullName: "",
  dateOfBirth: "",
  passportNumber: "",
  passportExpiry: "",
  nationality: "Indian",
  gender: "",
};

export type ContactDetails = { email: string; phone: string };

/**
 * How settled the trip is. The same three answers `CountryApplicationPanel`
 * offers on the country page, so the flow asks the question in the words the
 * applicant already saw rather than re-asking it differently.
 *
 * `"exact"` is DERIVED from `travelDate` rather than stored: picking a date IS
 * the answer, and holding it twice only creates two things that can disagree.
 * That is the same rule the country panel follows.
 */
export type TravelWindow = "soon" | "later" | "exact";

export function resolveTravelWindow(
  state: Pick<ApplicationState, "travelDate" | "travelWindow">,
): TravelWindow | undefined {
  return state.travelDate ? "exact" : state.travelWindow;
}

export type ApplicationState = {
  /** Mirrors `?country=`. The URL is the owner; this is the working copy. */
  countrySlug?: string;
  travellers: Traveller[];
  /** Index into the processing options. 0 standard, 1 express. */
  plan: number;
  /** ISO yyyy-mm-dd. Set only for the "exact" answer. */
  travelDate?: string;
  /** The non-exact answers. See `resolveTravelWindow`. */
  travelWindow?: "soon" | "later";
  step: ApplicationStepId;
  /** 1 forward, -1 backward. Consumed by the transition wrapper only. */
  direction: 1 | -1;
  documents: DocumentMap;
  details: Record<string, TravellerDetails>;
  contact: ContactDetails;
};

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export type ApplicationAction =
  | { type: "addTraveller"; firstName?: string }
  | { type: "renameTraveller"; id: string; firstName: string }
  | { type: "removeTraveller"; id: string }
  | { type: "setPlan"; plan: number }
  | { type: "setTravelDate"; travelDate?: string }
  | { type: "setTravelWindow"; travelWindow: "soon" | "later" }
  | { type: "setDocument"; travellerId: string; kind: DocumentKind; entry: DocumentEntry }
  | { type: "clearDocument"; travellerId: string; kind: DocumentKind }
  | { type: "setDetails"; travellerId: string; patch: Partial<TravellerDetails> }
  | { type: "setContact"; patch: Partial<ContactDetails> }
  | { type: "goToStep"; step: ApplicationStepId; direction?: 1 | -1 };

/**
 * Traveller ids.
 *
 * `crypto.randomUUID` where available, with a counter fallback for older
 * browsers. The previous flow used `Math.random().toString(36)`, which can
 * collide and is not a stable identity to key React lists or a document map on.
 */
let travellerCounter = 0;
function newTravellerId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  travellerCounter += 1;
  return `traveller-${travellerCounter}`;
}

export function createTraveller(firstName = ""): Traveller {
  return { id: newTravellerId(), firstName: firstName.trim().toUpperCase() };
}

export function initialState(seed: Partial<ApplicationState> = {}): ApplicationState {
  return {
    travellers: [],
    plan: 0,
    step: "setup",
    direction: 1,
    documents: {},
    details: {},
    contact: { email: "", phone: "" },
    ...seed,
  };
}

export function applicationReducer(
  state: ApplicationState,
  action: ApplicationAction,
): ApplicationState {
  switch (action.type) {
    case "addTraveller":
      return {
        ...state,
        travellers: [...state.travellers, createTraveller(action.firstName)],
      };

    case "renameTraveller":
      return {
        ...state,
        travellers: state.travellers.map((traveller) =>
          traveller.id === action.id
            ? { ...traveller, firstName: action.firstName.trim().toUpperCase() }
            : traveller,
        ),
      };

    case "removeTraveller": {
      // Removing a traveller must take their documents and details with them,
      // or an orphaned entry keeps counting toward completion forever.
      const documents = { ...state.documents };
      const details = { ...state.details };
      for (const key of Object.keys(documents)) {
        if (key.startsWith(`${action.id}:`)) delete documents[key];
      }
      delete details[action.id];

      return {
        ...state,
        travellers: state.travellers.filter((t) => t.id !== action.id),
        documents,
        details,
      };
    }

    case "setPlan":
      return { ...state, plan: action.plan };

    case "setTravelDate":
      // A date IS the "exact" answer, so it clears any looser one.
      return {
        ...state,
        travelDate: action.travelDate,
        travelWindow: action.travelDate ? undefined : state.travelWindow,
      };

    case "setTravelWindow":
      // Choosing a window discards a previously picked date, or the review
      // would show "not decided" next to a specific day.
      return {
        ...state,
        travelWindow: action.travelWindow,
        travelDate: undefined,
      };

    case "setDocument":
      return {
        ...state,
        documents: {
          ...state.documents,
          [documentKey(action.travellerId, action.kind)]: action.entry,
        },
      };

    case "clearDocument": {
      const documents = { ...state.documents };
      delete documents[documentKey(action.travellerId, action.kind)];
      return { ...state, documents };
    }

    case "setDetails":
      return {
        ...state,
        details: {
          ...state.details,
          [action.travellerId]: {
            ...EMPTY_DETAILS,
            ...state.details[action.travellerId],
            ...action.patch,
          },
        },
      };

    case "setContact":
      return { ...state, contact: { ...state.contact, ...action.patch } };

    case "goToStep":
      return { ...state, step: action.step, direction: action.direction ?? 1 };

    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/* Derived — validation and progress                                          */
/* -------------------------------------------------------------------------- */

export type TravellerDocumentState = {
  traveller: Traveller;
  required: DocumentRequirement[];
  provided: DocumentKind[];
  missing: DocumentRequirement[];
  complete: boolean;
};

export function travellerDocumentState(
  state: ApplicationState,
  country: Country,
  traveller: Traveller,
): TravellerDocumentState {
  const required = requiredDocuments(country.documents);
  const provided = required
    .filter((requirement) => state.documents[documentKey(traveller.id, requirement.kind)])
    .map((requirement) => requirement.kind);
  const missing = required.filter(
    (requirement) => !state.documents[documentKey(traveller.id, requirement.kind)],
  );

  return { traveller, required, provided, missing, complete: missing.length === 0 };
}

function detailsComplete(details?: TravellerDetails): boolean {
  if (!details) return false;
  return (
    details.fullName.trim().length > 1 &&
    details.dateOfBirth.length > 0 &&
    details.passportNumber.trim().length >= 6 &&
    details.passportExpiry.length > 0 &&
    details.nationality.trim().length > 1 &&
    details.gender.length > 0
  );
}

function contactComplete(contact: ContactDetails): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email) && contact.phone.trim().length >= 8;
}

/**
 * Why a step cannot be left, in the user's words, or `undefined` when it can.
 *
 * Returning the reason rather than a boolean is what lets the Continue control
 * explain itself instead of sitting there greyed out — the single most common
 * complaint about the flow this replaces, where "Proceed to checkout" was
 * disabled with no indication of what was missing.
 */
export function blockingReason(
  state: ApplicationState,
  country: Country | undefined,
  step: ApplicationStepId,
): string | undefined {
  if (!country) return "Choose a destination before continuing.";

  switch (step) {
    case "setup": {
      if (state.travellers.length === 0) return "Add at least one traveller.";
      if (state.travellers.some((t) => t.firstName.trim().length === 0)) {
        return "Every traveller needs a first name.";
      }
      return undefined;
    }

    case "documents": {
      const incomplete = state.travellers.filter(
        (traveller) => !travellerDocumentState(state, country, traveller).complete,
      );
      if (incomplete.length === 0) return undefined;
      const names = incomplete.map((t) => t.firstName || "an unnamed traveller");
      return `Still missing documents for ${names.join(", ")}.`;
    }

    case "details": {
      const incomplete = state.travellers.filter(
        (traveller) => !detailsComplete(state.details[traveller.id]),
      );
      if (incomplete.length > 0) {
        const names = incomplete.map((t) => t.firstName || "an unnamed traveller");
        return `Passport details are incomplete for ${names.join(", ")}.`;
      }
      if (!contactComplete(state.contact)) {
        return "Add an email address and phone number we can reach you on.";
      }
      return undefined;
    }

    case "review":
    case "ready":
      return undefined;

    default:
      return undefined;
  }
}

export function isStepComplete(
  state: ApplicationState,
  country: Country | undefined,
  step: ApplicationStepId,
): boolean {
  return blockingReason(state, country, step) === undefined;
}

/** Every step before the current one is satisfied. Gates the rail. */
export function canReachStep(
  state: ApplicationState,
  country: Country | undefined,
  target: ApplicationStepId,
): boolean {
  const sequence = stepSequence(country);
  const targetIndex = sequence.findIndex((s) => s.id === target);
  if (targetIndex <= 0) return true;

  return sequence
    .slice(0, targetIndex)
    .every((s) => isStepComplete(state, country, s.id));
}

export function stepIndexOf(
  step: ApplicationStepId,
  country?: Country,
): number {
  return Math.max(0, stepSequence(country).findIndex((s) => s.id === step));
}

/**
 * Completed steps over total steps.
 *
 * Counts what the applicant has actually satisfied, not which screen they are
 * looking at. The old header read 33% the moment a name was typed and 66% on
 * arriving at the documents screen, before anything was uploaded.
 */
export function progressPercent(
  state: ApplicationState,
  country: Country | undefined,
): number {
  const sequence = stepSequence(country);
  const gated = sequence.filter((s) => s.id !== "ready");
  if (gated.length === 0) return 0;

  const done = gated.filter((s) => isStepComplete(state, country, s.id)).length;
  return Math.round((done / gated.length) * 100);
}

/* -------------------------------------------------------------------------- */
/* Summary — the shared read model                                            */
/* -------------------------------------------------------------------------- */

/**
 * One object describing the whole application, for anything that needs to show
 * it: the review step, the sticky aside, and whatever Phase 5B renders. Built
 * on demand from state + country, so it cannot go stale, and every figure in it
 * comes from `computeTotals`.
 */
export type ApplicationSummary = {
  country: {
    slug: string;
    name: string;
    displayName: string;
    code: string;
    flagUrl: string;
    visaType: Country["visaType"];
    validity?: string;
    deliveryDays: number;
  };
  travellers: { count: number; names: string[] };
  plan: {
    index: number;
    label: string;
    /** Express is only faster where the destination leaves room for it. */
    deliveryDays: number;
    isExpress: boolean;
  };
  travelDate?: string;
  travelWindow?: TravelWindow;
  documents: {
    required: DocumentRequirement[];
    requiredCount: number;
    providedCount: number;
    perTraveller: TravellerDocumentState[];
  };
  /** Passport data entry, distinct from the passport image. */
  passport: { completeCount: number; total: number };
  /**
   * Every figure the price summary shows, already multiplied by party size.
   *
   * `expressSurcharge` and `baseServiceFee` are split out here rather than in
   * the UI: `computeTotals` folds the surcharge into `serviceFee`, and a
   * component that subtracted one from the other to draw a line item would be
   * doing pricing arithmetic — which is exactly what Phase 5B §16 forbids.
   */
  fees: ReturnType<typeof computeTotals> & {
    travellers: number;
    /** `null` while any Keyrise fee component is undecided. See pricingConfig. */
    total: number | null;
    baseServiceFee: number | null;
    expressSurcharge: number;
  };
  progress: {
    stepId: ApplicationStepId;
    stepIndex: number;
    stepCount: number;
    percent: number;
  };
  /**
   * `"ready-for-submission"` is the terminal state this product actually
   * supports. It is never `"submitted"`, because nothing is sent anywhere.
   */
  readiness: "incomplete" | "ready-for-submission";
};

export function planLabel(index: number): string {
  return index === 1 ? "Express" : "Standard";
}

export function planDeliveryDays(config: CountryVisaConfig, index: number): number {
  return index === 1 ? Math.max(1, config.deliveryDays - 1) : config.deliveryDays;
}

export function buildSummary(
  state: ApplicationState,
  country: Country,
): ApplicationSummary {
  const config = resolveCountryVisaConfig(country);
  const sequence = stepSequence(country);

  const totals = computeTotals(config.pricing, { express: state.plan === 1 });
  const travellerCount = Math.max(1, state.travellers.length);
  const expressSurcharge =
    state.plan === 1 ? (config.pricing.expressSurcharge ?? 0) : 0;

  const perTraveller = state.travellers.map((traveller) =>
    travellerDocumentState(state, country, traveller),
  );
  const required = requiredDocuments(country.documents);

  const gated = sequence.filter((s) => s.id !== "ready");
  const allComplete = gated.every((s) => isStepComplete(state, country, s.id));

  return {
    country: {
      slug: config.slug,
      name: config.name,
      displayName: config.displayName,
      code: config.code,
      flagUrl: config.flagUrl,
      visaType: config.visaType,
      validity: config.validity,
      deliveryDays: config.deliveryDays,
    },
    travellers: {
      count: state.travellers.length,
      names: state.travellers.map((t) => t.firstName).filter(Boolean),
    },
    plan: {
      index: state.plan,
      label: planLabel(state.plan),
      deliveryDays: planDeliveryDays(config, state.plan),
      isExpress: state.plan === 1,
    },
    travelDate: state.travelDate,
    travelWindow: resolveTravelWindow(state),
    documents: {
      required,
      requiredCount: required.length * state.travellers.length,
      providedCount: perTraveller.reduce((sum, t) => sum + t.provided.length, 0),
      perTraveller,
    },
    passport: {
      completeCount: state.travellers.filter((t) => detailsComplete(state.details[t.id]))
        .length,
      total: state.travellers.length,
    },
    fees: {
      ...totals,
      travellers: travellerCount,
      // PHASE 8C: null propagates. An undecided Keyrise fee makes the party
      // total undecided too, rather than quietly becoming the government fee.
      total: totals.perTraveller === null ? null : totals.perTraveller * travellerCount,
      expressSurcharge,
      baseServiceFee:
        totals.serviceFee === null ? null : totals.serviceFee - expressSurcharge,
    },
    progress: {
      stepId: state.step,
      stepIndex: stepIndexOf(state.step, country),
      stepCount: sequence.length,
      percent: progressPercent(state, country),
    },
    readiness: allComplete ? "ready-for-submission" : "incomplete",
  };
}
