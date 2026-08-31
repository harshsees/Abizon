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
 *
 * ── The opening beat ──
 *
 * `booting` is the second. `ApplicationBoot` holds the screen for about two
 * seconds when the flow first mounts, so arriving from the destination page is
 * a transition rather than a cut. It plays once per mount and never again —
 * moving between steps must not replay it, which is why it is a plain flag
 * here and not derived from the step.
 *
 * ── The notices that used to live here ──
 *
 * A floating strip at the foot of the page carried four of them: picked up
 * where you left off, progress saved on this device only, your documents are
 * not saved between visits, and you are not signed in. They are gone at the
 * product owner's request. The behaviour they described has not changed —
 * `sync.ts` still decides what is persisted and where — so if they come back
 * they come back as the same sentences; nothing else needs to be rebuilt to
 * carry them.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { getCountrySlug } from "@/data/countries";
import { useApplication } from "@/lib/application/context";

import { ApplicationBoot } from "./ApplicationBoot";
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

  /** The opening screen. Once per mount — see the header. */
  const [booting, setBooting] = useState(true);
  const finishBoot = useCallback(() => setBooting(false), []);

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

  /**
   * The opening screen, after the two guards above and before anything else.
   *
   * Placed here on purpose. Above the guards it would hold a loading screen in
   * front of "Pick a destination first" — two seconds of nothing on the way to
   * an error, which is the worst possible order for those two screens. Below
   * them, it only ever precedes an application that is actually going to run.
   */
  if (booting) {
    return <ApplicationBoot countryName={country.name} onDone={finishBoot} />;
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
    <div className="relative min-h-screen">
      {/* The ambient field. A fixed, -z-10 layer rather than a background on
          this element: the capture takeovers cover the page with an opaque
          white sheet, and a background painted here would vanish under them.
          At -10 it sits behind everything and shows through anything that is
          not opaque, which is every screen except those takeovers. */}
      <div aria-hidden className="ambient-field" />

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
              {/* The widest step in the flow. `PaymentPanel` is two columns
                  now — the card and the total on the left, everything that is
                  operated on the right — and 560px was the width of the single
                  column it used to be. */}
              {currentStep.id === "payment" && (
                <div className="mx-auto w-full max-w-[1000px] px-5 pb-24 pt-24 md:px-8 md:pt-28">
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
