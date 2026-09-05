"use client";

/**
 * THE ARRIVAL-CARD SHEET.
 * ---------------------------------------------------------------------------
 * One tall panel on a near-empty ground: masthead, a passport shortcut, an OR
 * rule, and a two-column form that scrolls inside the panel while the actions
 * stay pinned to its foot. The composition, the geometry and the beats are
 * taken from the reference recording; three things in it are deliberately not
 * reproduced, and each is marked where it would have gone.
 *
 * ── Geometry, measured from the recording (1902 × 906) ──
 *
 *   panel            726px wide, radius ~30px, near-white on #f1f1f0
 *   header           flag + destination in small caps, then the promise set
 *                    in the serif face and underlined; FAQ pill at the right
 *   scroll           the panel scrolls internally; the masthead and the
 *                    action bar do not move with it
 *   actions          outlined "Add traveller" against a solid dark primary
 *   marker           a small dashed-ring avatar floating to the panel's left,
 *                    level with the first section
 *
 * ── What is different, and why ──
 *
 *   1. THE PRIMARY ACTION IS NOT "SUBMIT APPLICATION".
 *      The reference shows one. Abizon cannot file an arrival card: none of
 *      these immigration services accepts a third-party submission, so a
 *      Submit button here would be a button that cannot do what it says. The
 *      action collects the form, tells the traveller it is ready, and opens
 *      the government's own page — which is the true final state of this flow.
 *
 *   2. THE FORM DOES NOT COME BACK FULLY POPULATED FROM A SCAN.
 *      The recording's passport fills every field including the issue date and
 *      the place of issue. Neither is in the machine-readable zone — they are
 *      printed only in the visual part of the page — so a scan here fills the
 *      seven fields the zone actually carries and leaves the rest alone. See
 *      `MRZ_FILLABLE_FIELDS`.
 *
 *   3. THE CHECKS ARE THE CHECKS WE RUN.
 *      See `QualityChecksModal`.
 *
 * ── Nothing is persisted ──
 *
 * No storage, no query string, no request. See `lib/arrival/state.ts`.
 */

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  CircleHelp,
  ExternalLink,
  House,
  Loader2,
  Plus,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { ArrivalFaqModal } from "@/components/arrival/ArrivalFaqModal";
import { ArrivalFormField } from "@/components/arrival/ArrivalFormField";
import {
  QualityChecksModal,
  type QualityChecksState,
} from "@/components/arrival/QualityChecksModal";
import type { ArrivalCard, ArrivalCardFieldKey } from "@/lib/arrivalCard";
import { arrivalCardFields } from "@/lib/arrivalCard";
import {
  mrzToValues,
  newArrivalTraveller,
  remainingRequiredCount,
  validateTraveller,
  type ArrivalCardValues,
  type ArrivalTraveller,
} from "@/lib/arrival/state";
import type { CountryVisaConfig } from "@/lib/countryVisa";
import { DURATION, EASE } from "@/lib/motion";
import { BrowserMrzScanner, type PassportScanner, type ScanProgress } from "@/lib/passport/scan";
import { ACCEPTED_UPLOAD_EXTENSIONS, validateUpload } from "@/lib/storage/limits";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Flow                                                                       */
/* -------------------------------------------------------------------------- */

export function ArrivalCardFlow({
  config,
  card,
}: {
  config: CountryVisaConfig;
  card: ArrivalCard;
}) {
  const reduced = useReducedMotion();
  const fields = useMemo(() => arrivalCardFields(card), [card]);

  // Stable across the server render and hydration; see `newArrivalTraveller`.
  const firstTravellerId = useId();
  const [travellers, setTravellers] = useState<ArrivalTraveller[]>(() => [
    newArrivalTraveller(firstTravellerId),
  ]);
  /** Which traveller's passport is being read. Null when none is. */
  const [scanningFor, setScanningFor] = useState<string | null>(null);
  const [checks, setChecks] = useState<QualityChecksState | null>(null);
  const [filledCount, setFilledCount] = useState(0);
  const [rejected, setRejected] = useState<string | undefined>();
  const [faqOpen, setFaqOpen] = useState(false);
  /**
   * Errors are not shown while somebody is still filling the form in — a
   * required-field message under an input nobody has reached yet is noise.
   * They appear when the primary action is used, and stay live after that.
   */
  const [showErrors, setShowErrors] = useState(false);
  const [ready, setReady] = useState(false);
  /**
   * Bumped by the primary action to ask for the focus move below. A counter
   * rather than a boolean the effect has to clear: clearing it would be a
   * setState inside an effect, and a second press of the same button has to
   * move focus again even though nothing else changed.
   */
  const [errorFocusRequest, setErrorFocusRequest] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<PassportScanner | null>(null);
  const uploadTargetRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // The engine holds a Worker and several megabytes; leaving it running after
  // the traveller has moved on is what makes a phone warm.
  useEffect(() => {
    return () => {
      void scannerRef.current?.dispose();
      scannerRef.current = null;
    };
  }, []);

  /**
   * Move to the first field that needs attention, after the render that marks
   * it. Without this the traveller is left to hunt for a red line somewhere in
   * a panel that scrolls independently of the page.
   */
  useEffect(() => {
    if (errorFocusRequest === 0) return;

    const firstInvalid = scrollRef.current?.querySelector<HTMLElement>(
      "[aria-invalid='true']",
    );
    if (!firstInvalid) return;

    firstInvalid.focus({ preventScroll: true });
    firstInvalid.scrollIntoView({
      block: "center",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [errorFocusRequest, reduced]);

  const errorsFor = useCallback(
    (traveller: ArrivalTraveller) =>
      showErrors ? validateTraveller(card, traveller.values) : {},
    [card, showErrors],
  );

  const remaining = remainingRequiredCount(card, travellers);
  const allValid = travellers.every(
    (traveller) => Object.keys(validateTraveller(card, traveller.values)).length === 0,
  );

  const patch = (id: string, key: ArrivalCardFieldKey, value: string) =>
    setTravellers((current) =>
      current.map((traveller) =>
        traveller.id === id
          ? {
              ...traveller,
              values: { ...traveller.values, [key]: value },
              // Edited by hand, so it is no longer the scan's value and should
              // stop being labelled as one.
              autofilled: traveller.autofilled.filter((filled) => filled !== key),
            }
          : traveller,
      ),
    );

  const openPicker = (travellerId: string) => {
    setRejected(undefined);
    uploadTargetRef.current = travellerId;
    fileInputRef.current?.click();
  };

  const handleFile = useCallback(
    async (file: File, travellerId: string) => {
      // The same limits as every other upload in the app, from the same
      // module — one place decides what an acceptable image is.
      const problem = validateUpload(file);
      if (problem) {
        setRejected(problem);
        return;
      }

      setRejected(undefined);
      setScanningFor(travellerId);
      setChecks({ phase: "scanning", progress: null });

      scannerRef.current ??= new BrowserMrzScanner();
      // Kept alongside the state so the settled panel can say where the run
      // stopped; reading it back off `checks` would race the last update.
      let lastProgress: ScanProgress | null = null;
      const onProgress = (progress: ScanProgress) => {
        lastProgress = progress;
        setChecks({ phase: "scanning", progress });
      };

      const outcome = await scannerRef.current.scan(file, onProgress);

      // Only a read whose check digits all agreed is written to the form. An
      // `unverified` read has at least one wrong character and no way to say
      // which of the rest to trust, so filling from it would hand somebody a
      // form they believe was scanned correctly. Nothing is written.
      if (outcome.status === "verified") {
        const values = mrzToValues(outcome.fields);
        const keys = Object.keys(values) as ArrivalCardFieldKey[];
        // Only the keys this destination's form actually asks for.
        const applicable = keys.filter((key) =>
          fields.some((field) => field.key === key),
        );

        setFilledCount(applicable.length);
        setTravellers((current) =>
          current.map((traveller) =>
            traveller.id === travellerId
              ? {
                  ...traveller,
                  values: {
                    ...traveller.values,
                    ...Object.fromEntries(applicable.map((key) => [key, values[key]])),
                  },
                  autofilled: Array.from(new Set([...traveller.autofilled, ...applicable])),
                }
              : traveller,
          ),
        );
      } else {
        setFilledCount(0);
      }

      setChecks({ phase: "settled", outcome, progress: lastProgress });
      setScanningFor(null);
    },
    [fields],
  );

  const closeChecks = () => {
    setChecks(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const addTraveller = () =>
    setTravellers((current) => [...current, newArrivalTraveller()]);

  const removeTraveller = (id: string) =>
    setTravellers((current) => current.filter((traveller) => traveller.id !== id));

  const officialHost = new URL(card.officialUrl).hostname;

  const handlePrimary = () => {
    setShowErrors(true);
    if (!allValid) {
      // Deferred rather than done here: on the first press `showErrors` has
      // only just been queued, so nothing in the panel is marked invalid yet
      // and a query at this point finds nothing to move to.
      setErrorFocusRequest((request) => request + 1);
      return;
    }
    setReady(true);
  };

  return (
    <div className="relative min-h-screen bg-background">
      {/* §8. The reference's ground is a warm near-white with an extremely
          soft cool glow toward the right. Two low-opacity radial layers,
          because one at this strength reads as a blob and two read as air. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(55%_55%_at_102%_48%,color-mix(in_oklab,var(--color-success-subtle)_85%,transparent)_0%,transparent_68%),radial-gradient(40%_38%_at_86%_80%,color-mix(in_oklab,var(--color-accent-subtle)_50%,transparent)_0%,transparent_62%)]"
      />

      {/* §9/§10. Two small floating controls, clear of the panel. `fixed` so
          they survive the page scrolling on a phone, and offset by the safe
          area so neither lands under a notch. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-sticky flex items-start justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:p-6">
        <Link
          href={`/visa/${config.slug}`}
          className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-full bg-surface/85 px-3.5 text-2xs font-semibold text-foreground shadow-e1 backdrop-blur-sm transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          Back
        </Link>

        <Link
          href="/"
          aria-label="abizon home"
          className="pointer-events-auto grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-surface/85 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <House aria-hidden className="size-[18px]" strokeWidth={1.75} />
        </Link>
      </div>

      <main
        id="main-content"
        className="relative flex min-h-screen justify-center px-4 py-16 sm:px-6 sm:py-20"
      >
        {/* §31. The floating marker. Absolutely positioned against the panel's
            own wrapper so it tracks the panel rather than the viewport, and
            hidden below `xl` where there is no gutter to hold it without
            pushing the panel off centre. */}
        <div className="relative w-full max-w-[45.5rem]">
          <div
            aria-hidden
            className="absolute -left-24 top-[7.5rem] hidden size-[4.25rem] place-items-center rounded-full border border-dashed border-border-strong xl:grid"
          >
            <span className="grid size-[3.25rem] place-items-center rounded-full bg-surface-sunken text-muted-foreground">
              {initialsOf(travellers[0]?.values) ?? (
                <UserRound aria-hidden className="size-6" strokeWidth={1.75} />
              )}
            </span>
          </div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduced ? { duration: 0 } : { duration: DURATION.slow, ease: EASE.out }
            }
            className={cn(
              "flex flex-col overflow-hidden rounded-[1.875rem] border border-border bg-surface shadow-e2",
              // §13. The panel holds its own height and scrolls inside on a
              // desktop window, so the masthead and the actions stay put while
              // the form moves — which is the reference's interaction. On a
              // phone that would be a scrolling box inside a scrolling page,
              // so below `sm` the panel grows and the page scrolls instead.
              "sm:max-h-[calc(100dvh-10rem)]",
            )}
          >
            {/* ---------------------------------------------------------- */}
            {/* Masthead                                                    */}
            {/* ---------------------------------------------------------- */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-8 sm:py-6">
              <div className="flex min-w-0 items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.flagUrl}
                  alt=""
                  width={40}
                  height={30}
                  className="mt-0.5 h-auto w-9 shrink-0 rounded-md shadow-e1 sm:w-10"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {config.displayName} {card.abbreviation ?? "arrival card"}
                  </p>
                  {/* §14/§71. Country-aware, and set in the serif face with
                      the underline the reference uses. The claim is about the
                      form — free, official, and short — not about how fast the
                      destination's government will answer, which is not ours
                      to promise. */}
                  {/* Not a flex row: the mark belongs at the end of the
                      sentence, and a flex child would break to its own line
                      the moment the sentence wrapped — which it does on a
                      phone. Inline, with the underline stopped before it so
                      the rule ends with the words. */}
                  <h1 className="mt-1 font-serif text-[1.25rem] font-medium leading-snug text-balance text-foreground sm:text-[1.625rem]">
                    <span className="underline decoration-border-strong decoration-1 underline-offset-[6px]">
                      Your {card.noun}, free and official.
                    </span>{" "}
                    <BadgeCheck
                      aria-label="Free on the government's own site"
                      className="inline-block size-[1.125rem] translate-y-[3px] text-success"
                    />
                  </h1>
                </div>
              </div>

              {/* §16. Hidden outright when the destination has no questions,
                  rather than opening an empty dialog. */}
              {card.faqs && card.faqs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFaqOpen(true)}
                  className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-border-strong bg-surface px-4 text-2xs font-bold text-foreground transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                  <CircleHelp aria-hidden className="size-4" />
                  FAQs
                </button>
              )}
            </div>

            {/* ---------------------------------------------------------- */}
            {/* The form                                                    */}
            {/* ---------------------------------------------------------- */}
            <div
              ref={scrollRef}
              // `data-lenis-prevent` keeps a wheel gesture inside the panel
              // from being consumed by the smooth-scrolled page behind it.
              data-lenis-prevent
              className={cn(
                "min-h-0 flex-1 px-5 py-7 sm:overflow-y-auto sm:overscroll-contain sm:px-8",
                // §32. A thin, quiet scrollbar rather than the platform's.
                "sm:[&::-webkit-scrollbar]:w-1.5",
                "sm:[&::-webkit-scrollbar-thumb]:rounded-full sm:[&::-webkit-scrollbar-thumb]:bg-border-strong",
                "sm:[&::-webkit-scrollbar-track]:bg-transparent",
                "[scrollbar-width:thin] [scrollbar-color:var(--color-border-strong)_transparent]",
              )}
            >
              {card.submitWithinDaysOfArrival !== undefined && (
                <p className="mb-7 rounded-2xl bg-surface-sunken px-4 py-3 text-2xs leading-relaxed text-muted-foreground">
                  Submit it within{" "}
                  <strong className="text-foreground">
                    {card.submitWithinDaysOfArrival} days
                  </strong>{" "}
                  of arriving in {config.displayName}. Filing earlier is the most
                  common way this gets rejected — fill it in now, submit it
                  inside the window.
                </p>
              )}

              {travellers.map((traveller, index) => {
                const errors = errorsFor(traveller);
                const scanning = scanningFor === traveller.id;

                return (
                  <section
                    key={traveller.id}
                    aria-labelledby={`${traveller.id}-heading`}
                    className={index === 0 ? "" : "mt-10 border-t border-border pt-8"}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h2
                        id={`${traveller.id}-heading`}
                        className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-foreground"
                      >
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-white">
                          <UserRound aria-hidden className="size-4" strokeWidth={2.25} />
                        </span>
                        {index === 0 ? "Personal information" : `Traveller ${index + 1}`}
                      </h2>

                      {travellers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTraveller(traveller.id)}
                          className="-mr-2 flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-2xs font-semibold text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
                        >
                          <Trash2 aria-hidden className="size-3.5" />
                          Remove
                          <span className="sr-only"> traveller {index + 1}</span>
                        </button>
                      )}
                    </div>

                    {/* §19. The shortcut, above the fields it fills. */}
                    <button
                      type="button"
                      onClick={() => openPicker(traveller.id)}
                      disabled={scanningFor !== null}
                      className={cn(
                        "mt-5 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full",
                        "border border-foreground/85 bg-surface px-5 text-sm font-bold text-foreground",
                        "transition-colors duration-[--duration-fast] hover:bg-surface-sunken",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
                        "disabled:pointer-events-none disabled:opacity-55",
                      )}
                    >
                      {scanning ? (
                        <Loader2
                          aria-hidden
                          className="size-4 animate-spin motion-reduce:animate-none"
                        />
                      ) : (
                        <Upload aria-hidden className="size-4" />
                      )}
                      {scanning
                        ? "Reading your passport…"
                        : "Upload passport front to auto-fill"}
                    </button>

                    {/* The photo page, said once per traveller. People reach
                        for the page with the stamps otherwise, and the zone is
                        not on it. */}
                    <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
                      The photo page, with the two lines of{" "}
                      <code className="font-mono">&lt;&lt;&lt;</code> along the bottom.
                      It is read on your device and never uploaded.
                    </p>

                    {/* §21 */}
                    <div className="my-7 flex items-center gap-4">
                      <span className="h-px flex-1 bg-border" />
                      <span className="text-2xs font-semibold tracking-[0.14em] text-muted-foreground">
                        OR
                      </span>
                      <span className="h-px flex-1 bg-border" />
                    </div>

                    {/* §22. Two columns on a pointer, one on a phone. */}
                    <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                      {fields.map((field) => (
                        <ArrivalFormField
                          key={field.key}
                          field={field}
                          value={traveller.values[field.key] ?? ""}
                          error={errors[field.key]}
                          autofilled={traveller.autofilled.includes(field.key)}
                          onChange={(next) => patch(traveller.id, field.key, next)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              {rejected && (
                <p
                  role="alert"
                  className="mt-6 rounded-2xl bg-destructive-subtle px-4 py-3 text-2xs font-semibold leading-relaxed text-destructive-subtle-foreground"
                >
                  {rejected}
                </p>
              )}

              {/* There is deliberately no "Add traveller" at the end of the
                  scroll area. The action bar carries one, pinned and always
                  visible; a second at the foot of the form was the same
                  control twice, and being inside the scroll it spent most of
                  its life half-hidden behind the bar that already had it. */}
            </div>

            {/* ---------------------------------------------------------- */}
            {/* §33/§36. The action bar, pinned to the panel's foot.        */}
            {/* ---------------------------------------------------------- */}
            <div className="shrink-0 border-t border-border bg-surface-sunken px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8">
              <AnimatePresence mode="wait" initial={false}>
                {ready ? (
                  <motion.div
                    key="ready"
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
                    transition={
                      reduced ? { duration: 0 } : { duration: DURATION.base, ease: EASE.out }
                    }
                  >
                    {/* §74. The truthful final state. Not "submitted" — the
                        form is ready and the government's page is one tap
                        away. abizon has not filed anything and does not say
                        it has. */}
                    <a
                      href={card.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-bold text-background transition-colors hover:bg-subtle-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                    >
                      Continue on {officialHost}
                      <ExternalLink aria-hidden className="size-4" />
                    </a>
                    <p className="mt-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
                      Ready to submit. {card.scheme} is filed on the{" "}
                      {config.displayName} government&rsquo;s own site — opens in a new
                      tab, and this page stays open so you can copy the details
                      across.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="actions"
                    initial={false}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4 }}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center"
                  >
                    <button
                      type="button"
                      onClick={addTraveller}
                      className="flex h-13 cursor-pointer items-center justify-center gap-2 rounded-full border border-border-strong bg-surface px-6 text-sm font-bold text-foreground transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:h-12"
                    >
                      <Plus aria-hidden className="size-4" />
                      Add travellers
                    </button>

                    <button
                      type="button"
                      onClick={handlePrimary}
                      // Not `disabled`. A dead button tells somebody nothing
                      // about what is missing, cannot be focused, and cannot
                      // explain itself; this one is always usable and answers
                      // the question when pressed.
                      aria-describedby="arrival-remaining"
                      className="flex h-13 flex-1 cursor-pointer items-center justify-center rounded-full bg-foreground px-7 text-sm font-bold text-background transition-colors hover:bg-subtle-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground sm:h-12"
                    >
                      Review and continue
                    </button>

                    <p id="arrival-remaining" className="sr-only" aria-live="polite">
                      {remaining === 0
                        ? "All required fields are filled in."
                        : `${remaining} required ${remaining === 1 ? "field is" : "fields are"} still empty.`}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>

      {/* One picker for the whole flow; the traveller it belongs to is held in
          a ref rather than duplicated per section. */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_UPLOAD_EXTENSIONS}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          const target = uploadTargetRef.current;
          if (file && target) void handleFile(file, target);
        }}
      />

      {checks && (
        <QualityChecksModal
          open
          state={checks}
          filledCount={filledCount}
          onClose={closeChecks}
          onRetry={() => {
            const target = uploadTargetRef.current;
            closeChecks();
            if (target) openPicker(target);
          }}
          onEnterManually={closeChecks}
        />
      )}

      {card.faqs && card.faqs.length > 0 && (
        <ArrivalFaqModal
          open={faqOpen}
          onClose={() => setFaqOpen(false)}
          destination={config.displayName}
          scheme={card.scheme}
          faqs={card.faqs}
        />
      )}
    </div>
  );
}

/** "MU" for Manvendra Umat, once there is enough of a name to abbreviate. */
function initialsOf(values: ArrivalCardValues | undefined): string | null {
  if (!values) return null;
  const first = values.firstName?.trim()?.[0];
  const last = values.lastName?.trim()?.[0];
  if (!first && !last) return null;
  return `${first ?? ""}${last ?? ""}`.toUpperCase();
}
