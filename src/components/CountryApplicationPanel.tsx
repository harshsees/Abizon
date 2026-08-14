"use client";

/**
 * The application entry panel — the country page's primary surface.
 *
 * REBUILT to the reference composition (image_video/Dubai/application card
 * desgin.png). The reference stacks four things and nothing else:
 *
 *   a risk banner       a lit, gradient slab with a ribbon overhanging its
 *                       right edge, saying what happens if the visa is refused
 *   a guarantee tab     a folder tab cut into the plate's top-left edge,
 *                       carrying the date, with the speed note beside it on
 *                       the page ground
 *   a plate + card      a pale plate with a white card inset in it, holding
 *                       the choices, the one price, and the CTA
 *   the ledger          pay now / pay on approval / total, with a rule running
 *                       between the first two icons so they read as a sequence
 *
 * and hangs a support line beneath the card rather than inside it.
 *
 * THE PLATE is the piece that makes the composition read as one object rather
 * than three stacked boxes: the tab, the margin around the card and the ground
 * behind the ledger are all one shape, and the white card floats inside it.
 * The reference's plate is lavender because its brand is indigo; Keyrise's
 * brand is amber, so the same role is played by `primary-subtle`. Reproducing
 * the literal lavender would put a second brand hue on the page.
 *
 * WHAT IS DIFFERENT FROM THE REFERENCE, and why. Three of its elements are
 * claims Keyrise cannot make, so they are not reproduced:
 *
 *   "only platform with visa protection"  a superlative about a market nobody
 *                                         here has surveyed. The ribbon states
 *                                         what the guarantee covers instead.
 *   "3 days faster"                       a delta against an unnamed baseline.
 *                                         The speed chip appears only when
 *                                         express is selected, and then states
 *                                         the difference against this page's
 *                                         own standard SLA — a real comparison.
 *   a clock time on the guarantee         `VisaGuarantee` has printed a date
 *                                         and no hour since Phase 4, for want
 *                                         of a delivery-time source. Unchanged.
 *
 * The risk banner itself IS reproduced, because the promise behind it is real
 * and stated in three other places in this codebase: the government fee is
 * refunded on a refusal (`VisaProcess`, /terms, /refunds-policy).
 *
 * Every figure comes from `computeTotals`, and the fee drawer is handed the
 * same object, so the card, its breakdown and the checkout cannot quote three
 * different prices for one visa.
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
  Zap,
} from "lucide-react";

import { GovFeeBreakdown } from "@/components/FeeBreakdown";
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

/**
 * The folder-tab cut, as one literal.
 *
 * A `clip-path` rather than a rotated pseudo-element: the tab has to sit flush
 * on the plate below it at every width, and a transform-based wedge drifts by
 * a subpixel at fractional zoom levels, which shows as a hairline of canvas
 * between the tab and the plate.
 */
const TAB_CLIP = "polygon(0 0, calc(100% - 26px) 0, 100% 100%, 0 100%)";

/** The ribbon's arrow notch, mirroring the reference's folded left end. */
const RIBBON_CLIP = "polygon(11px 0, 100% 0, 100% 100%, 11px 100%, 0 50%)";

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
          Lit from the left rather than flat, so the slab has a source — the
          same logic the promise bands and the hero plate use. The ribbon
          overhangs the right edge so the banner reads as a label attached to
          the card below rather than a second card stacked on it. */}
      <div className="relative rounded-[20px] bg-[linear-gradient(100deg,#E6E6EE_0%,#F2F2F7_46%,#FDF6E7_100%)] px-4 py-3.5 pr-6 shadow-e1">
        <span
          style={{ clipPath: RIBBON_CLIP }}
          className="absolute right-0 top-4 hidden translate-x-2 bg-primary py-1.5 pl-5 pr-3 text-2xs font-semibold tracking-tight text-on-primary lg:block"
        >
          Included on every application
        </span>

        <div className="flex items-start gap-3.5">
          <ShieldCheck
            aria-hidden
            className="mt-0.5 h-7 w-7 flex-shrink-0 text-primary"
            strokeWidth={1.6}
          />
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-tight text-foreground">
              Risk-free visa
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Get approved, or the government fee comes back to you in full.
            </p>
          </div>
        </div>
      </div>

      {/* ── The guarantee tab ───────────────────────────────────────────────
          Cut into the plate's top-left edge. `-mb-px` closes the seam that a
          fractional device-pixel ratio would otherwise open between the tab
          and the plate below it. */}
      <div className="mt-4 flex items-stretch gap-4">
        <p
          style={{ clipPath: TAB_CLIP }}
          className="-mb-px inline-flex items-center gap-2 rounded-tl-[20px] bg-primary-subtle py-2.5 pl-4 pr-10 text-xs font-semibold text-primary-subtle-foreground"
        >
          <ShieldCheck aria-hidden className="h-4 w-4" strokeWidth={1.9} />
          Guaranteed by {formatShortDate(deliveryDays)}
        </p>
        {plan === 1 && expressIsFaster && (
          <p className="inline-flex items-center gap-1.5 self-center text-xs font-semibold text-foreground">
            <Zap aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />1 day
            sooner
          </p>
        )}
      </div>

      {/* ── The plate, and the card inset in it ─────────────────────────── */}
      <div className="rounded-[24px] rounded-tl-none bg-primary-subtle p-1.5 shadow-e1 ring-1 ring-inset ring-primary-border/50">
        <div className="overflow-hidden rounded-[18px] bg-surface shadow-e2">
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

          <div className="p-4 md:p-5">
            {/* 1 — the choices, as the reference's stacked rows.
                The reference's first row is a "Visa Type" dropdown of travel
                purposes. Keyrise records one visa type per destination and no
                purpose at all, so the row that IS a real choice takes its
                place: how fast it is processed. */}
            <div className="divide-y divide-border">
              <label className="block pb-3.5">
                <span className="text-xs text-muted-foreground">
                  {config.visaType} · Processing
                </span>
                <span className="relative mt-1 block">
                  <select
                    value={plan}
                    onChange={(event) => setPlan(Number(event.target.value))}
                    className="w-full cursor-pointer appearance-none bg-transparent pr-8 text-base font-semibold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
                    strokeWidth={1.8}
                  />
                </span>
              </label>

              <div className="flex items-center justify-between gap-3 py-3.5">
                <span className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-foreground">
                  <User
                    aria-hidden
                    className="h-5 w-5 text-muted-foreground"
                    strokeWidth={1.8}
                  />
                  <label htmlFor="panel-travellers">Travellers</label>
                </span>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTravellers((t) => Math.max(1, t - 1))}
                    disabled={travellers <= 1}
                    aria-label="One traveller fewer"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-subtle-foreground transition-colors duration-[--duration-fast] hover:border-border-strong hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Minus aria-hidden className="h-3.5 w-3.5" />
                  </button>
                  <output
                    id="panel-travellers"
                    data-numeric
                    className="min-w-6 text-center text-base font-semibold text-foreground"
                  >
                    {travellers}
                  </output>
                  <button
                    type="button"
                    onClick={() => setTravellers((t) => Math.min(10, t + 1))}
                    disabled={travellers >= 10}
                    aria-label="One traveller more"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-subtle-foreground transition-colors duration-[--duration-fast] hover:border-border-strong hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Plus aria-hidden className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Not in the reference card, kept because it is real function:
                  the answer travels to the application so the first screen
                  there does not ask a question already answered here. */}
              <button
                type="button"
                onClick={onPickDate}
                className="flex w-full cursor-pointer items-center justify-between gap-3 py-3.5 text-left"
              >
                <span className="flex items-center gap-2.5 text-sm font-medium text-subtle-foreground">
                  <CalendarDays
                    aria-hidden
                    className="h-5 w-5 text-muted-foreground"
                    strokeWidth={1.8}
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
                <div className="grid grid-cols-2 gap-2 py-3.5">
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
                          "cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors duration-[--duration-fast]",
                          active
                            ? "border-foreground bg-foreground text-surface"
                            : "border-border bg-surface text-subtle-foreground hover:border-border-strong hover:bg-surface-sunken",
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
                deferred to the ledger below the button.

                48px, down from 60px. At the larger size the figure was taller
                than the section heading two columns to its left, which made the
                page read as though the price were its subject rather than the
                visa. It is still by some distance the largest thing in the
                card, which is the hierarchy that matters. */}
            <div className="pt-6 text-center">
              <p
                data-numeric
                className="text-4xl font-bold tracking-[-0.03em] text-foreground"
              >
                {totals.payNow === 0 ? "Free" : inr(payNow)}
              </p>
              <p className="mt-2 text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                To be paid now
              </p>
            </div>

            <button
              type="button"
              onClick={handleStart}
              className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-full bg-primary px-5 py-3.5 text-sm font-semibold tracking-tight text-on-primary shadow-e2 transition-[background-color,transform,box-shadow] duration-[--duration-fast] ease-[--ease-out] hover:bg-primary-hover hover:shadow-e3 active:scale-[0.99] active:bg-primary-active motion-reduce:transform-none"
            >
              {draft ? "Resume Application" : "Start Application"}
            </button>

            {/* 3 — the ledger. The reference's three rows exactly: what is due
                now, what is due on approval, and the sum. The rule between the
                first two icons is the reference's, and it is doing work — it
                is what says these are two moments in one transaction rather
                than two separate charges. */}
            <dl className="mt-6">
              <div className="relative">
                <span
                  aria-hidden
                  className="absolute left-[9px] top-7 h-[calc(100%-3rem)] w-px bg-border"
                />
                <LedgerRow
                  icon={Landmark}
                  label="Pay now"
                  sub="Government fee"
                  value={totals.payNow === 0 ? "Free" : inr(payNow)}
                />
                <div className="mt-4">
                  <LedgerRow
                    icon={Clock3}
                    label="Pay on approval"
                    sub={
                      totals.provisional
                        ? "Keyrise fee · provisional"
                        : "Keyrise fee"
                    }
                    value={inrOrUnset(payOnApproval)}
                  />
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <LedgerRow
                  icon={ReceiptText}
                  label="Total amount"
                  value={inrOrUnset(total)}
                  strong
                />
              </div>
            </dl>

            {/* 4 — the itemisation, closed. It used to be a permanent section
                in the column beside this card, restating these same figures. */}
            <GovFeeBreakdown
              countryName={config.displayName}
              travellers={travellers}
              totals={totals}
            />
          </div>
        </div>
      </div>

      {/* ── Support, beneath the card ───────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Have queries?
          </p>
          <p className="text-xs text-muted-foreground">
            Documents, process, price, etc.
          </p>
        </div>
        <a
          href={`tel:${SUPPORT_TEL}`}
          className="inline-flex items-center gap-2 rounded-full border border-primary-border bg-surface px-4 py-2 text-xs font-semibold text-primary-subtle-foreground transition-colors duration-[--duration-fast] hover:bg-primary-subtle"
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

/**
 * One row of the money ledger.
 *
 * The sub-label carries the reference's underline. It is decoration, not a
 * link: it names which fee the figure is, and the drawer below the ledger is
 * where the detail actually lives, so an `<a>` here would promise a
 * destination that does not exist.
 */
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
    <div className="relative flex items-start justify-between gap-4">
      <dt className="flex items-start gap-3">
        <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface">
          <Icon
            aria-hidden
            className="h-5 w-5 text-muted-foreground"
            strokeWidth={1.7}
          />
        </span>
        <span>
          <span
            className={`block text-sm tracking-tight ${
              strong ? "font-bold" : "font-semibold"
            } text-foreground`}
          >
            {label}
          </span>
          {sub && (
            <span className="mt-0.5 block text-2xs text-muted-foreground underline decoration-border-strong decoration-1 underline-offset-4">
              {sub}
            </span>
          )}
        </span>
      </dt>
      <dd
        data-numeric
        className={`shrink-0 ${
          strong ? "text-base font-bold" : "text-sm font-semibold"
        } tracking-tight text-foreground`}
      >
        {value}
      </dd>
    </div>
  );
}
