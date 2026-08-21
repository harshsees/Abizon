"use client";

/**
 * THE APPLICATION SHELL
 *
 * LAYOUT. Three columns at xl, two at md, one below — but the middle column is
 * capped at 34rem at every one of them. That cap is the whole idea: a form
 * field stretched to 1800px is unreadable, and the eye loses the left edge
 * between label and input. Growing the viewport adds context around the form,
 * never width to it.
 *
 *   below md   one column. Rail collapses to a segmented bar; the summary
 *              collapses to a disclosure; the CTA becomes a fixed bottom bar,
 *              because on a phone the primary action must be reachable with a
 *              thumb rather than after a scroll.
 *   md         rail + form. Summary drops beneath the form, still expandable.
 *   xl         rail + form + a sticky summary that never needs opening.
 *
 * MOBILE CTA. The fixed bar is `pb-[env(safe-area-inset-bottom)]` and the
 * scroll container carries matching bottom padding, so the last field is never
 * hidden behind it and the bar never sits under a home indicator.
 *
 * FOCUS. Changing step moves focus to the new step's heading, guarded against
 * the first render so it does not steal focus on arrival. Without it, pressing
 * Continue leaves a keyboard user focused on a button belonging to a screen
 * that is gone.
 */

import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { useLenis } from "lenis/react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { getCountrySlug } from "@/data/countries";
import { useApplication } from "@/lib/application/context";
import { FEE_NOT_PUBLISHED } from "@/lib/pricingConfig";

import { ApplicantDetailsStep } from "./ApplicantDetailsStep";
import { ApplicationComplete } from "./ApplicationComplete";
import { ApplicationHeader } from "./ApplicationHeader";
import { ApplicationProgress } from "./ApplicationProgress";
import { ApplicationStepTransition } from "./ApplicationStepTransition";
import { ApplicationSummaryPanel } from "./ApplicationSummary";
import { DocumentsStep } from "./DocumentsStep";
import { ReviewStep } from "./ReviewStep";
import { SetupStep } from "./SetupStep";
import { StepHeader } from "./StepHeader";

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
    blocked,
    summary,
    next,
    back,
    resume,
    sync,
  } = useApplication();

  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(state.step);
  const blockedId = useId();
  const [summaryOpen, setSummaryOpen] = useState(false);

  /**
   * Lenis owns the scroll position app-wide, so a bare `window.scrollTo` gets
   * fought by its rAF loop and lands somewhere between the two. Ask Lenis
   * instead, and fall back only if it is absent (reduced motion disables the
   * wheel smoothing but the instance is still there).
   */
  const lenis = useLenis();

  useEffect(() => {
    if (previousStep.current === state.step) return;
    previousStep.current = state.step;

    // A step change is a page change in every way that matters to the user.
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo({ top: 0, behavior: "auto" });

    headingRef.current?.focus();
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

  const isFirstStep = currentIndex === 0;
  const isLastStep = currentIndex === steps.length - 1;

  const description = STEP_DESCRIPTIONS[currentStep.id]?.(
    config.displayName,
    summary.travellers.count,
  );

  /**
   * Rendered twice — once in the desktop footer, once in the mobile bar. Only
   * one is ever in the accessibility tree, because the other's container is
   * `display: none`. Each gets its own `describedById` so the disabled
   * Continue points at the reason text that is actually beside it.
   */
  const renderNavigation = (describedById: string) => (
    <>
      <button
        type="button"
        onClick={back}
        disabled={isFirstStep}
        className="inline-flex h-12 flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground transition-[background-color,transform] duration-[--duration-fast] ease-[--ease-out] hover:bg-surface-sunken active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35 motion-reduce:transform-none sm:h-11"
      >
        <ArrowLeft aria-hidden className="size-4" />
        <span className="sr-only sm:not-sr-only">Back</span>
      </button>

      {/* THE PRIMARY ACTION IS INK, NOT AMBER, and only inside this flow.
          Amber is the brand accent and stays that everywhere else. Here the
          reference is the destination card: a near-black panel with the name
          set over it, which is the product's own idea of what "premium" looks
          like. An amber button on a white sheet reads as a promotion; the dark
          pill reads as the one thing to press. Reverting is one class. */}
      <button
        type="button"
        onClick={next}
        disabled={Boolean(blocked)}
        aria-describedby={blocked ? describedById : undefined}
        className="group inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-bold text-background shadow-e2 transition-[background-color,transform,box-shadow] duration-[--duration-fast] ease-[--ease-out] hover:bg-subtle-foreground hover:shadow-e3 active:scale-[0.98] active:shadow-e1 disabled:pointer-events-none disabled:opacity-40 motion-reduce:transform-none sm:h-11 sm:flex-none"
      >
        {currentStep.cta}
        <ArrowRight
          aria-hidden
          data-arrow
          className="size-4 transition-transform duration-[--duration-fast] group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        />
      </button>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background bg-[image:var(--gradient-application)]">
      <ApplicationHeader
        countryName={config.displayName}
        flagUrl={config.flagUrl}
        exitHref={countryHref}
        saved={resume !== "none" || state.travellers.length > 0}
        savedTo={sync.mode === "synced" ? "account" : "device"}
        progressPercent={summary.progress.percent}
      />

      <div className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-y-8 px-5 py-7 md:grid-cols-[176px_minmax(0,1fr)] md:gap-x-12 md:px-8 md:py-12 xl:grid-cols-[176px_minmax(0,34rem)_300px] xl:gap-x-16 xl:justify-center">
        {/* Rail. Above the content on mobile, beside it from md. */}
        <div className="md:sticky md:top-28 md:self-start">
          <ApplicationProgress />
        </div>

        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 max-w-[34rem] pb-28 outline-none md:pb-0"
        >
          {/* RESUME NOTICES, and which of them can still be true.

              `downgraded` existed because document files were deliberately not
              persisted — passport scans have no business in localStorage — so a
              draft that had reached review could not be honoured and the flow
              said so rather than silently rewinding somebody.

              With an account that no longer applies: documents are on the
              server and come back with the application. So the notice is shown
              only in local mode, where it is still exactly right. */}
          {sync.mode === "synced" && resume !== "none" && isFirstStep && (
            <p className="mb-7 rounded-xl border border-border bg-surface px-4 py-3 text-2xs leading-relaxed text-muted-foreground">
              Picked up where you left off. This application is saved to your
              account, so you can finish it on any device.
            </p>
          )}

          {sync.mode !== "synced" && resume === "restored" && isFirstStep && (
            <p className="mb-7 rounded-xl border border-border bg-surface px-4 py-3 text-2xs leading-relaxed text-muted-foreground">
              Picked up where you left off. Your progress is saved on this device
              only — not to an account, and not to a server.
            </p>
          )}

          {sync.mode !== "synced" && resume === "downgraded" && isFirstStep && (
            <p
              role="status"
              className="mb-7 rounded-xl border border-primary-border bg-primary-subtle px-4 py-3 text-2xs leading-relaxed text-primary-subtle-foreground"
            >
              We kept your trip details, but your uploaded documents are not
              saved between visits — passport scans stay in the tab you opened
              them in. You will need to attach them again.
            </p>
          )}

          {/* Signed out, with a backend that would have saved this. Offered
              once, at the first step, rather than as a wall in front of the
              flow: somebody who wants to see what is asked for before creating
              an account is a reasonable person, and the country page's own CTA
              already brings most people here signed in. */}
          {sync.mode === "local" && sync.localReason === "no-account" && isFirstStep && (
            <div className="mb-7 rounded-xl border border-primary-border bg-primary-subtle px-4 py-3.5">
              <p className="text-2xs leading-relaxed text-primary-subtle-foreground">
                <span className="font-bold">You are not signed in.</span> You can
                fill this in, but nothing will be saved and you will not be able
                to submit it — documents in particular are discarded when this
                tab closes.
              </p>
              <Link
                href={`/login?next=${encodeURIComponent(`/apply?country=${getCountrySlug(country.name)}`)}`}
                className="mt-2 inline-block text-2xs font-bold text-primary underline underline-offset-2"
              >
                Sign in to save this application
              </Link>
            </div>
          )}

          {/* THE SHEET.
              The step used to sit directly on the page, which left five
              screens of form with nothing holding them together — the eye had
              to infer where the application began and the page ended. One card
              says it instead, and it is the same object the destination cards
              already are: `rounded-card`, a hairline, one step of elevation.

              The resume notices and the collapsed summary stay outside it on
              purpose. They are about the application rather than part of it,
              and folding them in would make the sheet a container for
              everything, which is how a card stops meaning anything. */}
          <div className="overflow-hidden rounded-card border border-border bg-surface shadow-e2">
            <div className="px-5 py-7 sm:px-8 sm:py-9">
              <StepHeader
                ref={headingRef}
                eyebrow={currentStep.eyebrow}
                heading={currentStep.title}
                description={description}
              />

              <div className="mt-8">
                <ApplicationStepTransition
                  stepKey={currentStep.id}
                  direction={state.direction}
                >
                  {currentStep.id === "setup" && <SetupStep />}
                  {currentStep.id === "documents" && <DocumentsStep />}
                  {currentStep.id === "details" && <ApplicantDetailsStep />}
                  {currentStep.id === "review" && <ReviewStep />}
                  {currentStep.id === "ready" && <ApplicationComplete />}
                </ApplicationStepTransition>
              </div>
            </div>

            {/* The actions are a footer of the sheet rather than a rule drawn
                across the page below it — the difference between "this card
                has a next step" and "here is a button somewhere underneath".
                Mobile keeps the fixed bar; a footer that scrolls away is not
                an action bar on a phone. */}
            {!isLastStep && (
              <div className="hidden border-t border-border bg-surface-sunken px-5 py-4 sm:px-8 md:block">
                <div className="flex items-center justify-between gap-4">
                  {renderNavigation(blockedId)}
                </div>
                {blocked && (
                  <p
                    id={blockedId}
                    role="status"
                    className="mt-3 text-right text-2xs text-muted-foreground"
                  >
                    {blocked}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Summary, inline, below md and at md. Sticky column takes over at xl. */}
          <div className="mt-10 xl:hidden">
            <button
              type="button"
              onClick={() => setSummaryOpen((open) => !open)}
              aria-expanded={summaryOpen}
              aria-controls="application-summary-inline"
              className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3.5 text-left"
            >
              <span className="text-sm font-semibold text-foreground">
                Application summary
              </span>
              <span className="flex items-center gap-2">
                <span
                  data-numeric
                  className="text-sm font-bold tracking-tight text-foreground"
                >
                  {summary.fees.total === null
                    ? FEE_NOT_PUBLISHED
                    : `₹${Math.round(summary.fees.total).toLocaleString("en-IN")}`}
                </span>
                <ChevronDown
                  aria-hidden
                  className={`size-4 text-muted-foreground transition-transform duration-[--duration-base] motion-reduce:transition-none ${
                    summaryOpen ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>
            {summaryOpen && (
              <div id="application-summary-inline" className="mt-3">
                <ApplicationSummaryPanel summary={summary} />
              </div>
            )}
          </div>
        </main>

        <div className="hidden xl:sticky xl:top-28 xl:block xl:self-start">
          <ApplicationSummaryPanel summary={summary} />
        </div>
      </div>

      {/* Mobile action bar. */}
      {!isLastStep && (
        <div className="fixed inset-x-0 bottom-0 z-nav border-t border-border bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden">
          {blocked && (
            <p
              id={`${blockedId}-mobile`}
              role="status"
              className="px-5 pt-2.5 text-center text-2xs text-muted-foreground"
            >
              {blocked}
            </p>
          )}
          <div className="flex items-center gap-3 px-5 py-3">
            {renderNavigation(`${blockedId}-mobile`)}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One sentence per step, in the second person. Kept beside the shell rather
 * than in `state.ts` because it is copy, and `state.ts` is the state model.
 */
const STEP_DESCRIPTIONS: Partial<
  Record<string, (country: string, travellers: number) => string>
> = {
  setup: (countryName) =>
    `These came across from the ${countryName} page. Change anything that is not right.`,
  documents: (countryName) =>
    `Exactly what ${countryName} asks for, and nothing else. You can photograph each one with your phone.`,
  details: () =>
    "Copy these straight from the passport. A mismatch is the most common reason an application is returned.",
  review: () => "Nothing is filed or charged until you say so.",
};
