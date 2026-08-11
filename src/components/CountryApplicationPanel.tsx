"use client";

/**
 * The application entry panel — the country page's primary surface.
 *
 * Replaces `ApplicationCard`, which was a dashboard: amber gradients, nested
 * cards, a plan toggle, two selects, a stepper, a price, a shining CTA and a
 * four-row fee ledger, all competing at once. It also carried three things that
 * were not true:
 *
 *   - "Guaranteed by {today+2}, 07:33 pm" — a hardcoded clock time, and a
 *     hardcoded 2-day offset that ignored the country's real deliveryDays. On
 *     Dubai (1 day) it printed 12 Aug while the hero printed 11 Aug: two
 *     different guarantee dates, on one page, 200px apart.
 *   - "8 hours faster" — an invented express delta.
 *   - its own fee arithmetic, since replaced by `computeTotals`.
 *
 * This panel answers the three questions the reference asks before anything
 * else — what will it cost, what do I need, and when am I travelling — then
 * gets out of the way. Every figure comes from `computeTotals`; the guarantee
 * is the same `VisaGuarantee` the hero renders, so the page cannot contradict
 * itself again.
 */

import { useState, useSyncExternalStore } from "react";
import { CalendarDays, Check, ChevronRight, Minus, Plus, Zap } from "lucide-react";

import { VisaGuarantee } from "@/components/VisaGuarantee";
import { Country } from "@/data/countries";
// One list of required documents for the whole product — the panel, the
// requirements section and the application flow all read the same function.
// The panel's own `documentList` was one of the three copies Phase 5A merged.
import { requiredDocumentLabels } from "@/lib/application/documents";
import {
  computeTotals,
  type CountryVisaConfig,
  formatShortDate,
} from "@/lib/countryVisa";
import { FEE_NOT_PUBLISHED } from "@/lib/pricingConfig";
import {
  describeAge,
  getDraftsSnapshot,
  getServerDraftsSnapshot,
  saveDraft,
  selectDraft,
  subscribeDrafts,
} from "@/lib/applicationDraft";

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

type TravelChoice = "soon" | "later" | "exact";

type CountryApplicationPanelProps = {
  country: Country;
  config: CountryVisaConfig;
  /** Opens the existing date picker. */
  onPickDate: () => void;
  /** Chosen exact date, when one has been picked. */
  travelDate?: Date;
  /**
   * `travelWindow` carries the looser answer ("within 30 days" / "not decided
   * yet"). Phase 6A added it: the panel had always collected it and then
   * dropped it at the handoff, so a user who answered the question here was
   * asked it again on the application's first screen.
   */
  onStart: (details: {
    travellers: number;
    plan: number;
    travelWindow?: "soon" | "later";
  }) => void;
};

export function CountryApplicationPanel({
  country,
  config,
  onPickDate,
  travelDate,
  onStart,
}: CountryApplicationPanelProps) {
  const [travellers, setTravellers] = useState(1);
  const [plan, setPlan] = useState(0);
  const [chosenTravelWindow, setChosenTravelWindow] = useState<TravelChoice | null>(
    null,
  );
  const [showDocs, setShowDocs] = useState(false);

  /**
   * Drafts live in localStorage, which is an external store — read through
   * `useSyncExternalStore` so React has the value before it commits, rather
   * than through an effect that would flip the CTA from "Start" to "Resume"
   * after the first paint.
   */
  const drafts = useSyncExternalStore(
    subscribeDrafts,
    getDraftsSnapshot,
    getServerDraftsSnapshot,
  );
  const draft = selectDraft(drafts, config.slug);

  // Derived, not stored: picking an exact date IS the travel-window answer, so
  // holding it in state as well only creates two things that can disagree.
  const travelChoice: TravelChoice | null = travelDate
    ? "exact"
    : chosenTravelWindow;

  const totals = computeTotals(config.pricing, { express: plan === 1 });
  const total = totals.perTraveller === null ? null : totals.perTraveller * travellers;

  const docs = requiredDocumentLabels(country.documents);
  const deliveryDays = plan === 1 ? Math.max(1, config.deliveryDays - 1) : config.deliveryDays;

  const handleStart = () => {
    // "exact" is derived from the date, so only the loose answers travel as a
    // window — sending both would give the flow two sources for one question.
    const travelWindow =
      chosenTravelWindow === "soon" || chosenTravelWindow === "later"
        ? chosenTravelWindow
        : undefined;

    saveDraft(config.slug, {
      travellers,
      plan,
      travelDate: travelDate?.toISOString().split("T")[0],
      travelWindow,
    });
    onStart({ travellers, plan, travelWindow });
  };

  return (
    <aside className="w-full">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-e2">
        {/* Resume — only when this browser has actually begun one. */}
        {draft && (
          <div className="flex items-center gap-3 border-b border-border bg-surface-sunken px-5 py-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary-subtle-foreground">
              <Check aria-hidden className="h-4 w-4" />
            </span>
            <p className="text-2xs leading-snug text-muted-foreground">
              You started this application{" "}
              <span className="font-semibold text-foreground">
                {describeAge(draft.startedAt)}
              </span>
              . Saved on this device only.
            </p>
          </div>
        )}

        <div className="space-y-6 p-5 md:p-6">
          {/* 1 — what it costs */}
          <div>
            <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Total for {travellers} {travellers === 1 ? "traveller" : "travellers"}
            </p>
            <p
              data-numeric
              className="mt-1.5 text-4xl font-bold tracking-tight text-foreground"
            >
              {total === null ? FEE_NOT_PUBLISHED : inr(total)}
            </p>
            <p className="mt-1.5 text-2xs text-muted-foreground">
              {/* PHASE 8C §9: a zero authority fee reads as words here too. The
                  fee breakdown already printed "Free" for these destinations
                  while this line printed "₹0 government fee now" on the same
                  page. Japan, South Africa, the Maldives and 8 others. */}
              {totals.payNow === 0 ? "No government fee" : `${inr(totals.payNow)} government fee now`} ·{" "}
              {totals.payOnApproval === null
                ? `Keyrise fee ${FEE_NOT_PUBLISHED.toLowerCase()}`
                : `${inr(totals.payOnApproval)} to Keyrise on approval`}
            </p>
          </div>

          {/* 2 — how many, how fast */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="panel-travellers"
                className="text-sm font-semibold text-foreground"
              >
                Travellers
              </label>
              <div className="flex items-center gap-1 rounded-full border border-border p-1">
                <button
                  type="button"
                  onClick={() => setTravellers((t) => Math.max(1, t - 1))}
                  disabled={travellers <= 1}
                  aria-label="One traveller fewer"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-40"
                >
                  <Minus aria-hidden className="h-3.5 w-3.5" />
                </button>
                <output
                  id="panel-travellers"
                  data-numeric
                  className="min-w-6 text-center text-sm font-bold text-foreground"
                >
                  {travellers}
                </output>
                <button
                  type="button"
                  onClick={() => setTravellers((t) => Math.min(10, t + 1))}
                  disabled={travellers >= 10}
                  aria-label="One traveller more"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-40"
                >
                  <Plus aria-hidden className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="sr-only">Processing speed</legend>
              {[
                { index: 0, label: "Standard", days: config.deliveryDays },
                {
                  index: 1,
                  label: "Express",
                  days: Math.max(1, config.deliveryDays - 1),
                },
              ].map((option) => {
                const active = plan === option.index;
                // Express only means something when it is actually sooner.
                const sameSpeed = option.index === 1 && option.days === config.deliveryDays;
                return (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setPlan(option.index)}
                    aria-pressed={active}
                    className={[
                      "cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-foreground bg-foreground text-surface"
                        : "border-border bg-surface hover:border-border-strong",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-1.5 text-xs font-bold">
                      {option.index === 1 && <Zap aria-hidden className="h-3 w-3" />}
                      {option.label}
                    </span>
                    <span
                      className={[
                        "mt-0.5 block text-2xs",
                        active ? "text-surface/70" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {sameSpeed
                        ? "Priority handling"
                        : `${option.days} ${option.days === 1 ? "day" : "days"}`}
                    </span>
                  </button>
                );
              })}
            </fieldset>
          </div>

          {/* 3 — what you need */}
          <div className="rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setShowDocs((open) => !open)}
              aria-expanded={showDocs}
              className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success-subtle text-success-subtle-foreground">
                  <Check aria-hidden className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-semibold text-foreground">
                  {docs.length === 0
                    ? "No documents needed"
                    : `${docs.length} document${docs.length > 1 ? "s" : ""} to prepare`}
                </span>
              </span>
              <ChevronRight
                aria-hidden
                className={[
                  "h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform",
                  showDocs ? "rotate-90" : "",
                ].join(" ")}
              />
            </button>

            {showDocs && (
              <ul className="space-y-1.5 border-t border-border px-4 py-3">
                {docs.length === 0 ? (
                  <li className="text-2xs text-muted-foreground">
                    {config.displayName} does not require documents to be
                    submitted in advance.
                  </li>
                ) : (
                  docs.map((doc) => (
                    <li
                      key={doc}
                      className="flex items-start gap-2 text-2xs text-muted-foreground"
                    >
                      <Check
                        aria-hidden
                        className="mt-0.5 h-3 w-3 flex-shrink-0 text-success"
                      />
                      {doc}
                    </li>
                  ))
                )}
                <li className="pt-1 text-2xs text-muted-foreground">
                  You can scan these with your phone during the application.
                </li>
              </ul>
            )}
          </div>

          {/* 4 — when you travel */}
          <div className="space-y-2.5">
            <p className="text-sm font-semibold text-foreground">
              When do you plan to travel?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { key: "soon", label: "Within 30 days" },
                  { key: "later", label: "Not decided yet" },
                ] as const
              ).map((option) => {
                const active = travelChoice === option.key;
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setChosenTravelWindow(option.key)}
                    aria-pressed={active}
                    className={[
                      "cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors",
                      active
                        ? "border-foreground bg-foreground text-surface"
                        : "border-border bg-surface text-subtle-foreground hover:border-border-strong",
                    ].join(" ")}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onPickDate}
              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-left transition-colors hover:border-border-strong"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-subtle-foreground">
                <CalendarDays aria-hidden className="h-4 w-4 text-muted-foreground" />
                {travelDate
                  ? travelDate.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Pick an exact date"}
              </span>
              <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* 5 — go */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleStart}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-5 py-4 text-sm font-bold text-on-primary transition-colors hover:bg-primary-hover active:bg-primary-active"
            >
              {draft ? "Resume application" : "Start application"}
            </button>

            <VisaGuarantee
              tone="onLight"
              className="w-full justify-center"
              deliveryDays={deliveryDays}
              countryName={config.displayName}
            />

            <p className="text-center text-2xs text-muted-foreground">
              Nothing is charged until you reach checkout. Guaranteed by{" "}
              {formatShortDate(deliveryDays)} or our fee is waived.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
