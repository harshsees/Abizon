"use client";

/**
 * THE APPLICATION SHELL
 * ---------------------------------------------------------------------------
 * Rebuilt to the reference recording. What it was: a 64px branded header, a
 * 176px labelled step rail, a 34rem form column inside a bordered sheet, a
 * 300px sticky price summary, a footer with Back and Continue, and a fixed
 * mobile action bar — six regions of chrome around one question at a time.
 *
 * What it is now: a page, and three things floating on it.
 *
 *     ApplyProgress   top centre. "33% COMPLETED" over a 165px bar.
 *     ApplyRail       left margin. Three icons.
 *     ApplyBack       top left. One pill.
 *
 * Everything else on screen belongs to the step. That is the whole difference,
 * and it is why the steps below render full-bleed rather than into a slot: the
 * travellers screen wants its field on the page's centre line, the documents
 * screen wants a fixed bottom bar, and the capture takeovers want the entire
 * viewport with the chrome above hidden behind them. A shared sheet with a
 * shared footer could give none of them what they need.
 *
 * ── The shell no longer owns Continue ──
 *
 * There is no shared navigation here. Each step carries its own primary action
 * with the label the reference gives it — "Continue" under the name field,
 * "Proceed to checkout" in the documents bar, Pay inside the payment panel —
 * because in this design the button is part of the composition rather than
 * furniture attached to the bottom of one. `blockingReason` still explains
 * itself; it is just printed next to the button that is disabled by it.
 *
 * ── The hand-off ──
 *
 * `handedOff` is the one piece of screen state the shell keeps. Leaving the
 * documents step plays `ProcessingScreen` before the payment step appears; the
 * flag records that it has been played, so returning to checkout from the rail
 * does not replay it. It resets whenever the step is not `payment`.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import { useEffect, useRef, useState } from "react";

import { getCountrySlug } from "@/data/countries";
import { useApplication } from "@/lib/application/context";

import { ApplicationComplete } from "./ApplicationComplete";
import { ApplicationStepTransition } from "./ApplicationStepTransition";
import { ApplyBack, ApplyProgress, ApplyRail, ApplyRailMobile, type RailStep } from "./ApplyChrome";
import { DocumentsStep } from "./DocumentsStep";
import { PaymentStep } from "./payment/PaymentStep";
import { ProcessingScreen } from "./ProcessingScreen";
import { TravellersStep } from "./TravellersStep";

function Notice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-4 px-5 text-center"
    >
      <h1 className="type-h2 text-balance text-foreground">{title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-2">{action}</div>
    </main>
  );
}

export function ApplicationShell() {
  const {
    state,
    country,
    config,
    steps,
    currentStep,
    currentIndex,
    summary,
    back,
    jumpTo,
    canReach,
    resume,
    sync,
  } = useApplication();

  const router = useRouter();
  const previousStep = useRef(state.step);

  /**
   * Whether the hand-off screen has already played for the step now on show.
   *
   * Adjusted DURING render rather than in an effect. React documents this
   * exact shape for "reset some state when a prop changes" and it is the right
   * one here: an effect would let one frame of the payment panel paint before
   * the processing screen replaced it, which is a flash of the destination on
   * the way to it.
   */
  const [handedOff, setHandedOff] = useState(false);
  const [handedOffStep, setHandedOffStep] = useState(state.step);

  if (handedOffStep !== state.step) {
    setHandedOffStep(state.step);
    setHandedOff(false);
  }

  const lenis = useLenis();

  useEffect(() => {
    if (previousStep.current === state.step) return;
    previousStep.current = state.step;

    // A step change is a page change in every way that matters to the user.
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo({ top: 0, behavior: "auto" });
  }, [state.step, lenis]);

  if (!country || !config || !summary) {
    return (
      <Notice
        title="Pick a destination first"
        body="An application needs to know where you are going — the requirements, the fee and the documents all depend on it."
        action={
          <Link
            href="/"
            className="inline-flex h-12 items-center rounded-xl bg-primary px-6 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
          >
            Browse destinations
          </Link>
        }
      />
    );
  }

  const countryHref = `/visa/${getCountrySlug(country.name)}`;

  if (config.flow === "visa-free") {
    return (
      <Notice
        title={`${config.displayName} does not require a visa`}
        body="There is no application to make. Check the entry rules and what to carry on the destination page."
        action={
          <Link
            href={countryHref}
            className="inline-flex h-12 items-center rounded-xl bg-primary px-6 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover"
          >
            {config.displayName} entry rules
          </Link>
        }
      />
    );
  }

  /** The rail's three, without `ready` — see the note in `ApplyChrome`. */
  const railSteps: RailStep[] = steps
    .filter((step) => step.id !== "ready")
    .map((step, index) => ({
      id: step.id,
      label: step.label,
      reachable: canReach(step.id),
      done: index < currentIndex,
    }));

  const showProcessing = state.step === "payment" && !handedOff;

  return (
    <div className="relative min-h-screen bg-background bg-[image:var(--gradient-application)]">
      {/* Back leaves the flow from the first step and walks it from the rest.
          A Back that is disabled on screen one is a control that spends the
          whole first screen looking broken. */}
      <ApplyBack
        onClick={() => {
          if (currentIndex > 0) back();
          else router.push(countryHref);
        }}
      />

      <ApplyProgress percent={summary.progress.percent} />
      <ApplyRail steps={railSteps} current={state.step} onJump={jumpTo} />
      <ApplyRailMobile steps={railSteps} current={state.step} onJump={jumpTo} />

      <main id="main-content" tabIndex={-1} className="outline-none">
        {/* The notices. Kept, and kept quiet: a floating strip at the foot of
            the page rather than a block above the question, because none of
            them is the thing the applicant came here to do. */}
        <ResumeNotice resume={resume} sync={sync} country={country} step={state.step} />

        <ApplicationStepTransition
          stepKey={showProcessing ? "processing" : currentStep.id}
          direction={state.direction}
        >
          {showProcessing ? (
            <ProcessingScreen onDone={() => setHandedOff(true)} />
          ) : (
            <>
              {currentStep.id === "travellers" && <TravellersStep />}
              {currentStep.id === "documents" && <DocumentsStep />}
              {currentStep.id === "payment" && (
                <div className="mx-auto w-full max-w-[560px] px-5 pb-24 pt-24 md:pt-28">
                  <PaymentStep />
                </div>
              )}
              {currentStep.id === "ready" && (
                <div className="mx-auto w-full max-w-[640px] px-5 pb-24 pt-24 md:pt-28">
                  <ApplicationComplete />
                </div>
              )}
            </>
          )}
        </ApplicationStepTransition>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Resume and sign-in notices.
 *
 * All three of these used to sit above the form as full-width blocks, which on
 * the travellers screen meant the first thing under the heading was a
 * paragraph about localStorage. They are the same sentences, moved to the foot
 * of the page and shown only on the first step, where they are relevant and
 * where there is empty page to put them in.
 */
function ResumeNotice({
  resume,
  sync,
  country,
  step,
}: {
  resume: ReturnType<typeof useApplication>["resume"];
  sync: ReturnType<typeof useApplication>["sync"];
  country: NonNullable<ReturnType<typeof useApplication>["country"]>;
  step: string;
}) {
  if (step !== "travellers") return null;

  const shell =
    "pointer-events-auto mx-auto w-full max-w-[560px] rounded-2xl border px-4 py-3 text-2xs leading-relaxed shadow-e1";

  let body: React.ReactNode = null;

  if (sync.mode === "synced" && resume !== "none") {
    body = (
      <p className={`${shell} border-border bg-surface text-muted-foreground`}>
        Picked up where you left off. This application is saved to your account,
        so you can finish it on any device.
      </p>
    );
  } else if (sync.mode !== "synced" && resume === "restored") {
    body = (
      <p className={`${shell} border-border bg-surface text-muted-foreground`}>
        Picked up where you left off. Your progress is saved on this device only
        — not to an account, and not to a server.
      </p>
    );
  } else if (sync.mode !== "synced" && resume === "downgraded") {
    body = (
      <p
        role="status"
        className={`${shell} border-primary-border bg-primary-subtle text-primary-subtle-foreground`}
      >
        We kept your trip details, but your uploaded documents are not saved
        between visits — passport scans stay in the tab you opened them in. You
        will need to attach them again.
      </p>
    );
  } else if (sync.mode === "local" && sync.localReason === "no-account") {
    body = (
      <div className={`${shell} border-primary-border bg-primary-subtle`}>
        <p className="text-primary-subtle-foreground">
          <span className="font-bold">You are not signed in.</span> You can fill
          this in, but nothing will be saved and you will not be able to submit
          it — documents in particular are discarded when this tab closes.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(`/apply?country=${getCountrySlug(country.name)}`)}`}
          className="mt-1.5 inline-block font-bold text-primary underline underline-offset-2"
        >
          Sign in to save this application
        </Link>
      </div>
    );
  }

  if (!body) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-sticky px-5">
      {body}
    </div>
  );
}
