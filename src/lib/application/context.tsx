"use client";

/**
 * APPLICATION CONTEXT
 * ---------------------------------------------------------------------------
 * Wires the reducer in `state.ts` to the three things outside it: the URL, the
 * country dataset, and the on-device draft.
 *
 * WHAT LIVES IN THE URL, AND WHY
 *
 *   `country`     ALWAYS. It is the one piece of state that changes what the
 *                 application IS. A shared or refreshed link has to resolve to
 *                 the same destination or the flow is meaningless.
 *   `plan`        Seed only. Written by `CountryApplicationPanel` so the
 *   `date`        choices made on the country page are not asked for twice.
 *                 Read once on entry; the flow owns them from then on.
 *   `travellers`  Parsed and validated, but no longer seeds anything — see
 *                 the note in `seedState`. A party size with no names in it
 *                 cannot be turned into travellers without inventing blanks.
 *
 * Deliberately NOT in the URL: traveller names, passport numbers, contact
 * details and document files. Those are personal data, and a URL is the least
 * private thing on the web — it lands in history, in referrer headers, and in
 * whatever a user pastes into a chat window.
 *
 * THE HAND-OFF PARAMS ARE THE ONE EXCEPTION, and they are the exception under
 * conditions. `step`, `t` and `doc` are written into the QR code that carries
 * an application from a laptop to a phone, and they name a screen rather than
 * any value on it: which step, which traveller by POSITION in the party, and
 * which kind of document. There is no name, no number and no image in any of
 * them, and none is a secret — someone who photographs the code learns that
 * an application exists and which screen it is on, which is what they would
 * learn by looking over the applicant's shoulder anyway.
 *
 * The original note here said a step in the URL is a way to deep-link past
 * validation. That is still true and it is still refused: `seedState` runs the
 * requested step through `canReachStep` and drops it on the floor if the steps
 * before it are not satisfied — exactly the check a restored draft goes
 * through. The parameter asks; it does not authorise.
 *
 * WHY HYDRATION IS SAFE HERE
 *
 * This provider reads `localStorage` inside the reducer's lazy initialiser,
 * which is normally a hydration hazard. It is safe in this position because the
 * subtree consuming it also calls `useSearchParams()` inside a `<Suspense>`
 * boundary: Next renders the FALLBACK on the server for a statically
 * prerendered route and only ever renders this content on the client. There is
 * no server HTML for the client to disagree with.
 *
 * That is what lets the resume state be deterministic rather than a
 * post-render flip — the requirement in Phase 5A §11. The reducer's first and
 * only initial value already knows about the draft.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

import type { Country } from "@/data/countries";
import type { DocumentKind } from "@/lib/application/documents";
import { countryFromSlug, resolveCountryVisaConfig } from "@/lib/countryVisa";
import { getDraft, saveDraft } from "@/lib/applicationDraft";

import { useApplicationSync, type ApplicationSync } from "./sync";

import {
  applicationReducer,
  blockingReason,
  buildSummary,
  canReachStep,
  createTraveller,
  initialState,
  stepSequence,
  type ApplicationAction,
  type ApplicationState,
  type ApplicationStepId,
  type ApplicationStepMeta,
  type ApplicationSummary,
  type RestorePayload,
} from "./state";

/* -------------------------------------------------------------------------- */
/* Seeding                                                                    */
/* -------------------------------------------------------------------------- */

function readIntParam(value: string | null, min: number, max: number): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return undefined;
  return Math.min(max, Math.max(min, parsed));
}

/** ISO yyyy-mm-dd only. Anything else is discarded rather than coerced. */
function readDateParam(value: string | null): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  return Number.isNaN(new Date(value).getTime()) ? undefined : value;
}

const STEP_IDS: readonly ApplicationStepId[] = [
  "dates",
  "travellers",
  "sponsor",
  "documents",
  "payment",
  "ready",
];

/** A step id, or nothing. Never a cast: this value comes off a QR code. */
function readStepParam(value: string | null): ApplicationStepId | undefined {
  return STEP_IDS.find((id) => id === value);
}

const DOCUMENT_KINDS: readonly DocumentKind[] = [
  "passport",
  "passportBack",
  "photograph",
  "panCard",
  "returnTicket",
  "hotelStay",
];

function readHandoffParams(
  traveller: string | null,
  document: string | null,
): HandoffTarget | undefined {
  const index = readIntParam(traveller, 0, 9);
  const kind = DOCUMENT_KINDS.find((candidate) => candidate === document);
  if (index === undefined || !kind) return undefined;
  return { traveller: index, document: kind };
}

type SeedInput = {
  slug?: string;
  travellers?: number;
  plan?: number;
  travelDate?: string;
  travelWindow?: "soon" | "later";
  /** From a phone hand-off. Honoured only if `canReachStep` allows it. */
  step?: ApplicationStepId;
};

/**
 * Where a phone hand-off asked to land, once it has been read off the URL.
 *
 * Positions and kinds only — see the note at the top of this file on why that
 * is all the QR is allowed to carry. `traveller` is an index into the party as
 * the laptop had it, because traveller ids are minted per tab and mean nothing
 * on another device.
 */
export type HandoffTarget = {
  traveller: number;
  document: DocumentKind;
};

/**
 * Why a resume landed where it did.
 *
 * `"downgraded"` is the honest case Phase 6A had to add. A draft records the
 * step reached, but document files are deliberately NOT persisted — they are
 * passport scans, and localStorage is the wrong place for those. So a draft
 * saying "review" cannot be honoured after a refresh: the documents are gone
 * and the step is no longer satisfiable. The flow drops the applicant to the
 * first unsatisfied step, and the shell says so rather than silently rewinding
 * them and leaving them to work out why.
 */
export type ResumeKind = "none" | "restored" | "downgraded";

/**
 * The single initial state, built once.
 *
 * URL beats draft for everything the country page sends, because the URL is
 * what the applicant just clicked; a two-week-old draft should not override a
 * fresh choice of three travellers. The draft supplies only what the URL did
 * not carry, plus the two things it alone knows: the step reached and the
 * traveller names.
 */
function seedState(
  input: SeedInput,
  country?: Country,
): { state: ApplicationState; resume: ResumeKind } {
  const draft = input.slug ? getDraft(input.slug) : undefined;

  /**
   * ONLY TRAVELLERS WHOSE NAMES ARE KNOWN.
   *
   * This used to be `Array.from({ length: travellerCount })`, filling any
   * shortfall with `createTraveller("")` — so a country page that sent
   * `?travellers=2` put two nameless travellers into the flow before the
   * applicant had typed anything, and the opening screen showed a chip
   * reading "Unnamed" as its default state.
   *
   * It was also self-defeating: `blockingReason` refuses to leave the
   * travellers step while any traveller has an empty name, so those seeded
   * blanks were the very thing preventing Continue from working. The party
   * size arrives again as names are typed, one per traveller, which is the
   * only place it can arrive from with a name attached.
   */
  const travellers = (draft?.travellerNames ?? [])
    .filter((name) => name.trim().length > 0)
    .map((name) => createTraveller(name));

  const travelDate = input.travelDate ?? draft?.travelDate;
  const state = initialState({
    countrySlug: input.slug,
    travellers,
    plan: input.plan ?? draft?.plan ?? 0,
    travelDate,
    // An exact date IS the answer, so a window is only carried when there is
    // no date to derive it from.
    travelWindow: travelDate ? undefined : (input.travelWindow ?? draft?.travelWindow),
  });

  if (!draft) {
    // A phone opening the hand-off link for the first time has no draft, so
    // the step below would never be considered. The same gate applies: ask,
    // and be refused if the steps before it are not satisfied. Without an
    // account there is nothing to satisfy them WITH, so this is normally a
    // no-op — it matters when the phone is signed in and `sync.ts` has
    // already adopted the server's copy of the application.
    if (input.step && canReachStep(state, country, input.step)) {
      return { state: { ...state, step: input.step }, resume: "restored" };
    }
    return { state, resume: "none" };
  }

  // Only resume onto a step whose way in is actually satisfied. A draft that
  // recorded "review" but whose names are the only thing restored must not
  // drop the applicant past the document step.
  const resumed = input.step ?? (draft.step as ApplicationStepId | undefined);
  const known = stepSequence(country).some((step) => step.id === resumed);

  if (resumed && known && canReachStep(state, country, resumed)) {
    return { state: { ...state, step: resumed }, resume: "restored" };
  }

  // There was a draft, and it pointed further on than the restored state can
  // support. Say so.
  const wasAhead = Boolean(resumed && known && resumed !== "travellers");
  return { state, resume: wasAhead ? "downgraded" : "restored" };
}

/* -------------------------------------------------------------------------- */
/* Context                                                                    */
/* -------------------------------------------------------------------------- */

export type ApplicationContextValue = {
  state: ApplicationState;
  dispatch: (action: ApplicationAction) => void;

  /** `undefined` when `?country=` is missing or unrecognised. */
  country?: Country;
  config?: ReturnType<typeof resolveCountryVisaConfig>;

  steps: ApplicationStepMeta[];
  currentStep: ApplicationStepMeta;
  currentIndex: number;

  /** Why the current step cannot be left, or `undefined`. */
  blocked?: string;
  /** `undefined` until a country is known. */
  summary?: ApplicationSummary;

  next: () => void;
  back: () => void;
  jumpTo: (step: ApplicationStepId) => void;
  canReach: (step: ApplicationStepId) => boolean;
  /**
   * Whether this visit resumed a draft, and whether the draft could be
   * honoured in full. See `ResumeKind`.
   */
  resume: ResumeKind;

  /**
   * The screen a phone hand-off asked to open on, or `undefined`.
   *
   * A REQUEST, not a destination. `DocumentsStep` opens it once and only if
   * the traveller and the document it names both exist in the application this
   * device actually has — a laptop's third traveller does not exist on a phone
   * that resumed a two-person party, and opening a capture for nobody is
   * worse than opening the list.
   */
  handoff?: HandoffTarget;

  /**
   * The server half. `sync.mode` is what every piece of copy in the flow
   * branches on to decide whether it may claim that anything is saved.
   */
  sync: ApplicationSync;
};

const ApplicationContext = createContext<ApplicationContextValue | null>(null);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();

  const slugParam = searchParams.get("country") ?? undefined;
  const country = countryFromSlug(slugParam);

  const windowParam = searchParams.get("when");

  /**
   * The hand-off. Read once and validated against the real unions rather than
   * cast — every one of these values arrives from a QR code that anybody could
   * have edited before scanning it.
   */
  const stepParam = readStepParam(searchParams.get("step"));
  const handoff = readHandoffParams(
    searchParams.get("t"),
    searchParams.get("doc"),
  );

  /**
   * The seed is computed ONCE and both halves of it are kept — the state and
   * why it landed there.
   *
   * A `useState` initialiser rather than `useMemo`, because the answer has to
   * describe the world BEFORE the save effect below writes a draft of its own,
   * and React is free to discard a memo and recompute it — which here would
   * report every visitor as a resume.
   */
  const [seed] = useState(() =>
    seedState(
      {
        slug: slugParam,
        travellers: readIntParam(searchParams.get("travellers"), 1, 10),
        plan: readIntParam(searchParams.get("plan"), 0, 1),
        travelDate: readDateParam(searchParams.get("date")),
        travelWindow:
          windowParam === "soon" || windowParam === "later" ? windowParam : undefined,
        step: stepParam,
      },
      country,
    ),
  );

  const [state, dispatch] = useReducer(applicationReducer, seed.state);
  const resume = seed.resume;

  const steps = useMemo(() => stepSequence(country), [country]);
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === state.step),
  );
  const currentStep = steps[currentIndex] ?? steps[0];

  const blocked = blockingReason(state, country, state.step);
  const summary = useMemo(
    () => (country ? buildSummary(state, country) : undefined),
    [state, country],
  );

  /**
   * Persist progress to the device.
   *
   * Written on change rather than on a timer, so closing the tab mid-step
   * cannot lose the last edit. `saveDraft` is a localStorage write of a small
   * object — cheap enough not to need debouncing, and idempotent.
   *
   * The `worthResuming` guard matters: without it, merely opening `/apply`
   * would write a draft, and the country page would then offer "Resume
   * application" to someone who had glanced at the flow and left. A draft
   * should mean the applicant actually began.
   */
  useEffect(() => {
    if (!state.countrySlug) return;

    /**
     * Has the applicant actually begun?
     *
     * The test used to be `step !== "travellers"`, i.e. "not on the first
     * screen". `dates` is the first screen now, and leaving this alone would
     * have written a draft — and offered "Resume application" on the country
     * page — to anybody who opened /apply and looked at a calendar. The
     * condition is the same one it always was; the name of the first step is
     * not.
     */
    const worthResuming = state.travellers.length > 0 || state.step !== "dates";
    if (!worthResuming) return;

    saveDraft(state.countrySlug, {
      travellers: state.travellers.length || undefined,
      travellerNames: state.travellers.map((traveller) => traveller.firstName),
      plan: state.plan,
      travelDate: state.travelDate,
      travelWindow: state.travelWindow,
      step: state.step,
    });
  }, [
    state.countrySlug,
    state.travellers,
    state.plan,
    state.travelDate,
    state.travelWindow,
    state.step,
  ]);

  /**
   * Adopting a server application, once.
   *
   * The latch is a ref rather than state because it must not cause a render:
   * this fires from inside the sync effect, and a re-render there would re-run
   * the effect that called it. The reducer's `restore` case is where the actual
   * merge policy lives — see the long note on it for why it is conservative
   * about anything the applicant may already be typing.
   */
  const restored = useRef(false);

  const onRestore = useCallback((payload: RestorePayload) => {
    if (restored.current) return;
    restored.current = true;
    dispatch({ type: "restore", payload });
  }, []);

  const sync = useApplicationSync({ state, dispatch, country, onRestore });

  const jumpTo = useCallback(
    (target: ApplicationStepId) => {
      if (!canReachStep(state, country, target)) return;
      const targetIndex = steps.findIndex((step) => step.id === target);
      dispatch({
        type: "goToStep",
        step: target,
        direction: targetIndex >= currentIndex ? 1 : -1,
      });
    },
    [state, country, steps, currentIndex],
  );

  const next = useCallback(() => {
    if (blockingReason(state, country, state.step)) return;
    const following = steps[currentIndex + 1];
    if (!following) return;
    dispatch({ type: "goToStep", step: following.id, direction: 1 });
  }, [state, country, steps, currentIndex]);

  const back = useCallback(() => {
    const previous = steps[currentIndex - 1];
    if (!previous) return;
    dispatch({ type: "goToStep", step: previous.id, direction: -1 });
  }, [steps, currentIndex]);

  const value: ApplicationContextValue = {
    state,
    dispatch,
    country,
    config: country ? resolveCountryVisaConfig(country) : undefined,
    steps,
    currentStep,
    currentIndex,
    blocked,
    summary,
    next,
    back,
    jumpTo,
    canReach: (step) => canReachStep(state, country, step),
    resume,
    handoff,
    sync,
  };

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplication(): ApplicationContextValue {
  const value = useContext(ApplicationContext);
  if (!value) {
    throw new Error("useApplication must be used inside <ApplicationProvider>.");
  }
  return value;
}
