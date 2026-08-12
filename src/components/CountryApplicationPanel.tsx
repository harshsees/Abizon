"use client";

/**
 * The application entry panel — the country page's primary surface.
 *
 * REBUILT to the reference composition (screenshots 2 and 3). The reference
 * stacks five things in one column and nothing else:
 *
 *   a risk banner            what happens if the application fails
 *   a guarantee tab          the date, riding on the card's top edge
 *   the choices              visa type, travellers
 *   the price and the CTA    one number, one button
 *   the ledger               pay now / pay on approval / total
 *
 * and hangs a support line beneath the card rather than inside it.
 *
 * WHAT IS DIFFERENT FROM THE REFERENCE, and why. Three of its elements are
 * claims Keyrise cannot make, so they are not reproduced:
 *
 *   "only platform with visa protection"  a superlative about a market nobody
 *                                         here has surveyed. The ribbon states
 *                                         what the guarantee covers instead.
 *   "15 hours faster"                     an invented delta against an
 *                                         unnamed baseline. The same invention
 *                                         ("8 hours faster") was removed from
 *                                         this component once already.
 *   a clock time on the guarantee         `VisaGuarantee` has printed a date
 *                                         and no hour since Phase 4, for want
 *                                         of a delivery-time source. Unchanged.
 *
 * The risk banner itself IS reproduced, because the promise behind it is real
 * and stated in three other places in this codebase: the government fee is
 * refunded on a refusal (`WhyKeyrise`, `VisaProcess`, /refunds-policy).
 *
 * Every figure comes from `computeTotals`, so the card, the fee breakdown and
 * the checkout cannot quote three different prices for one visa.
 */

import { useState, useSyncExternalStore } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Landmark,
  Minus,
  Plus,
  ReceiptText,
  ShieldCheck,
  User,
} from "lucide-react";

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
const inrOrUnset = (value: number | null) =>
  value === null ? FEE_NOT_PUBLISHED : inr(value);

/** Keyrise's support line, as published on /emergency-helpline. */
const SUPPORT_TEL = "+911140845678";
const SUPPORT_TEL_DISPLAY = "+91 11 4084 5678";

type TravelChoice = "soon" | "later" | "exact";

type CountryApplicationPanelProps = {
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
  config,
  onPickDate,
  travelDate,
  onStart,
}: CountryApplicationPanelProps) {
  const [travellers, setTravellers] = useState(1);
  const [plan, setPlan] = useState(0);
  const [chosenTravelWindow, setChosenTravelWindow] =
    useState<TravelChoice | null>(null);

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
  const perTraveller = totals.perTraveller;
  const total = perTraveller === null ? null : perTraveller * travellers;
  const payNow = totals.payNow * travellers;
  const payOnApproval =
    totals.payOnApproval === null ? null : totals.payOnApproval * travellers;

  const deliveryDays =
    plan === 1 ? Math.max(1, config.deliveryDays - 1) : config.deliveryDays;
  const expressIsFaster = config.deliveryDays > 1;

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
      {/* ── The risk banner ─────────────────────────────────────────────────
          Sits above the card and slightly behind it, as in the reference: the
          ribbon overhangs the right edge so the banner reads as a label
          attached to the card rather than a second card stacked on it. */}
      <div className="relative rounded-2xl bg-surface-sunken px-5 py-4 pr-6">
        <span className="absolute right-0 top-4 hidden translate-x-2 rounded-l-md rounded-r-sm bg-primary px-3 py-1 text-2xs font-bold text-on-primary shadow-e1 lg:block">
          Included on every application
        </span>

        <div className="flex items-start gap-3">
          <ShieldCheck
            aria-hidden
            className="mt-0.5 h-7 w-7 flex-shrink-0 text-primary"
            strokeWidth={1.8}
          />
          <div className="min-w-0">
            <p className="text-base font-bold text-foreground">Risk-free visa</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Get approved, or the government fee comes back to you in full.
            </p>
          </div>
        </div>
      </div>

      {/* ── The guarantee tab ───────────────────────────────────────────────
          A tab on the card's top edge, per the reference. `-mb-px` and the
          card's own top border meet so the tab and the card share one line. */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 px-1">
        <p className="inline-flex items-center gap-2 text-xs font-bold text-primary">
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Guaranteed by {formatShortDate(deliveryDays)}
        </p>
        {plan === 1 && expressIsFaster && (
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Clock3 aria-hidden className="h-3.5 w-3.5" />1 day sooner
          </p>
        )}
      </div>

      {/* ── The card ────────────────────────────────────────────────────── */}
      <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface shadow-e2">
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

        <div className="p-5 md:p-6">
          {/* 1 — the choices, as the reference's stacked rows.
              The reference's first row is a "Visa Type" dropdown of travel
              purposes. Keyrise records one visa type per destination and no
              purpose at all, so the row that IS a real choice takes its place:
              how fast it is processed. */}
          <div className="divide-y divide-border">
            <label className="block pb-4">
              <span className="text-xs text-muted-foreground">
                {config.visaType} · Processing
              </span>
              <span className="relative mt-1 block">
                <select
                  value={plan}
                  onChange={(event) => setPlan(Number(event.target.value))}
                  className="w-full cursor-pointer appearance-none bg-transparent pr-8 text-lg font-bold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <option value={0}>
                    Standard · {config.deliveryDays}{" "}
                    {config.deliveryDays === 1 ? "day" : "days"}
                  </option>
                  <option value={1}>
                    {expressIsFaster
                      ? `Express · ${config.deliveryDays - 1} ${
                          config.deliveryDays - 1 === 1 ? "day" : "days"
                        }`
                      : "Express · priority handling"}
                  </option>
                </select>
                <ChevronDown
                  aria-hidden
                  className="pointer-events-none absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
                />
              </span>
            </label>

            <div className="flex items-center justify-between gap-3 py-4">
              <span className="flex items-center gap-2.5 text-base font-bold text-foreground">
                <User aria-hidden className="h-5 w-5 text-muted-foreground" />
                <label htmlFor="panel-travellers">Travellers</label>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTravellers((t) => Math.max(1, t - 1))}
                  disabled={travellers <= 1}
                  aria-label="One traveller fewer"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-border text-subtle-foreground transition-colors hover:border-border-strong disabled:pointer-events-none disabled:opacity-40"
                >
                  <Minus aria-hidden className="h-3.5 w-3.5" />
                </button>
                <output
                  id="panel-travellers"
                  data-numeric
                  className="min-w-6 text-center text-base font-bold text-foreground"
                >
                  {travellers}
                </output>
                <button
                  type="button"
                  onClick={() => setTravellers((t) => Math.min(10, t + 1))}
                  disabled={travellers >= 10}
                  aria-label="One traveller more"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-border text-subtle-foreground transition-colors hover:border-border-strong disabled:pointer-events-none disabled:opacity-40"
                >
                  <Plus aria-hidden className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Not in the reference card, kept because it is real function:
                the answer travels to the application so the first screen there
                does not ask a question already answered here. */}
            <button
              type="button"
              onClick={onPickDate}
              className="flex w-full cursor-pointer items-center justify-between gap-3 py-4 text-left"
            >
              <span className="flex items-center gap-2.5 text-sm font-semibold text-subtle-foreground">
                <CalendarDays
                  aria-hidden
                  className="h-5 w-5 text-muted-foreground"
                />
                {travelDate
                  ? travelDate.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "When do you travel?"}
              </span>
              <ChevronRight
                aria-hidden
                className="h-4 w-4 flex-shrink-0 text-muted-foreground"
              />
            </button>

            {!travelDate && (
              <div className="grid grid-cols-2 gap-2 py-4">
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
            )}
          </div>

          {/* 2 — the price. One number, centred, with the rest of the money
              deferred to the ledger below the button. */}
          <div className="pt-6 text-center">
            <p
              data-numeric
              className="text-5xl font-bold tracking-tight text-foreground"
            >
              {totals.payNow === 0 ? "Free" : inr(payNow)}
            </p>
            <p className="mt-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              To be paid now
            </p>
          </div>

          <button
            type="button"
            onClick={handleStart}
            className="mt-5 flex w-full cursor-pointer items-center justify-center rounded-full bg-primary px-5 py-4 text-sm font-bold text-on-primary transition-[background-color,transform] duration-[--duration-fast] ease-[--ease-out] hover:bg-primary-hover active:scale-[0.99] active:bg-primary-active motion-reduce:transform-none"
          >
            {draft ? "Resume Application" : "Start Application"}
          </button>

          {/* 3 — the ledger. The reference's three rows exactly: what is due
              now, what is due on approval, and the sum. */}
          <dl className="mt-6 space-y-4">
            <LedgerRow
              icon={Landmark}
              label="Pay now"
              sub="Government fee"
              value={totals.payNow === 0 ? "Free" : inr(payNow)}
            />
            <LedgerRow
              icon={Clock3}
              label="Pay on approval"
              sub={totals.provisional ? "Keyrise fee · provisional" : "Keyrise fee"}
              value={inrOrUnset(payOnApproval)}
            />
            <div className="border-t border-border pt-4">
              <LedgerRow
                icon={ReceiptText}
                label="Total amount"
                value={inrOrUnset(total)}
                strong
              />
            </div>
          </dl>
        </div>
      </div>

      {/* ── Support, beneath the card ───────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Have queries?</p>
          <p className="text-xs text-muted-foreground">
            Documents, process, price, etc.
          </p>
        </div>
        <a
          href={`tel:${SUPPORT_TEL}`}
          className="inline-flex items-center gap-2 rounded-full border border-primary-border bg-surface px-4 py-2 text-xs font-bold text-primary-subtle-foreground transition-colors hover:bg-primary-subtle"
        >
          {SUPPORT_TEL_DISPLAY}
        </a>
      </div>

      <p className="mt-3 px-1 text-2xs leading-relaxed text-muted-foreground">
        Nothing is charged until you reach checkout. Your {config.displayName}{" "}
        visa is guaranteed by {formatShortDate(deliveryDays)} or the Keyrise fee
        is waived.
      </p>
    </aside>
  );
}

/** One row of the money ledger. */
function LedgerRow({
  icon: Icon,
  label,
  sub,
  value,
  strong = false,
}: {
  icon: typeof Landmark;
  label: string;
  sub?: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="flex items-start gap-3">
        <Icon
          aria-hidden
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground"
        />
        <span>
          <span
            className={`block text-sm ${
              strong ? "font-bold" : "font-semibold"
            } text-foreground`}
          >
            {label}
          </span>
          {sub && (
            <span className="block text-2xs text-muted-foreground">{sub}</span>
          )}
        </span>
      </dt>
      <dd
        data-numeric
        className={`shrink-0 ${
          strong ? "text-base font-bold" : "text-sm font-semibold"
        } text-foreground`}
      >
        {value}
      </dd>
    </div>
  );
}
