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
 *   `travellers`  Seed only. Written by `CountryApplicationPanel` so the
 *   `plan`        choices made on the country page are not asked for twice.
 *   `date`        Read once on entry; the flow owns them from then on.
 *
 * Deliberately NOT in the URL: the current step, traveller names, passport
 * numbers, contact details and document files. A step in the URL is a way to
 * deep-link past validation. The rest is personal data, and a URL is the least
 * private thing on the web — it lands in history, in referrer headers, and in
 * whatever a user pastes into a chat window.
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

type SeedInput = {
  slug?: string;
  travellers?: number;
  plan?: number;
  travelDate?: string;
  travelWindow?: "soon" | "later";
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

  const travellerCount = input.travellers ?? draft?.travellers ?? 0;

  const names = draft?.travellerNames ?? [];
  const travellers = Array.from({ length: travellerCount }, (_, index) =>
    createTraveller(names[index] ?? ""),
  );

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

  if (!draft) return { state, resume: "none" };

  // Only resume onto a step whose way in is actually satisfied. A draft that
  // recorded "review" but whose names are the only thing restored must not
  // drop the applicant past the document step.
  const resumed = draft.step as ApplicationStepId | undefined;
  const known = stepSequence(country).some((step) => step.id === resumed);

  if (resumed && known && canReachStep(state, country, resumed)) {
    return { state: { ...state, step: resumed }, resume: "restored" };
  }

  // There was a draft, and it pointed further on than the restored state can
  // support. Say so.
  const wasAhead = Boolean(resumed && known && resumed !== "setup");
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

    const worthResuming = state.travellers.length > 0 || state.step !== "setup";
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
