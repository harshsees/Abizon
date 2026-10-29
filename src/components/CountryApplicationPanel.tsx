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
 *   the ledger          what is being paid for, and the total
 *
 * and hangs a support line beneath the card rather than inside it.
 *
 * THE PLATE is the piece that makes the composition read as one object rather
 * than three stacked boxes: the tab, the margin around the card and the ground
 * behind the ledger are all one shape, and the white card floats inside it.
 * The reference's plate is lavender because its brand is indigo; Abizon's
 * brand is amber, so the same role is played by `primary-subtle`. Reproducing
 * the literal lavender would put a second brand hue on the page.
 *
 * WHAT IS DIFFERENT FROM THE REFERENCE, and why. Two of its elements are
 * claims Abizon cannot make, so they are not reproduced:
 *
 *   "only platform with visa protection"  a superlative about a market nobody
 *                                         here has surveyed. The ribbon states
 *                                         what the guarantee covers instead.
 *   a clock time on the guarantee         `VisaGuarantee` has printed a date
 *                                         and no hour since Phase 4, for want
 *                                         of a delivery-time source. Unchanged.
 *
 * THE CHOICES (29 Oct 2026). The first row used to be a Standard / Express
 * select over one invented price. It is now the destination's own visa options
 * from the price list (`data/visaOptions.ts`), each with its entry type, stay,
 * validity and processing time, and the price is the option's, all-inclusive.
 * Where an option prices children differently, the party is counted as adults
 * and children, so the estimate here is the one the application charges once
 * dates of birth are entered.
 *
 * Every figure comes from `quoteVisa`, the same function the application and
 * the server's payment order use, so the card and the checkout cannot quote
 * two different prices for one visa.
 */

import { useState, useSyncExternalStore } from "react";
import {
  Baby,
  CalendarDays,
  Check,
  ChevronRight,
  Minus,
  Plus,
  ReceiptText,
  ShieldCheck,
  User,
  Users,
  Zap,
} from "lucide-react";

import { CHILD_UNDER, visaOptionsFor, type VisaOption } from "@/data/visaOptions";
import { type CountryVisaConfig, formatShortDate } from "@/lib/countryVisa";
import { describeOptionPrice, quoteVisa } from "@/lib/visaPricing";
import {
  describeAge,
  getDraftsSnapshot,
  getServerDraftsSnapshot,
  saveDraft,
  selectDraft,
  subscribeDrafts,
} from "@/lib/applicationDraft";

const inr = (value: number) => `₹${Math.round(value).toLocaleString("en-IN")}`;

/**
 * A stand-in date of birth for a child counted on this card, so `quoteVisa`
 * prices them as one. The application replaces it with the real date.
 */
const CHILD_STAND_IN = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 5);
  return d.toISOString().split("T")[0];
})();

const MAX_TRAVELLERS = 10;

/** Abizon's support line, as published on /emergency-helpline. */
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
   *
   * `plan` is the chosen visa option's position in the destination's list.
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
  const options = visaOptionsFor(config.code);
  const [plan, setPlan] = useState(0);
  const option: VisaOption | undefined = options[plan] ?? options[0];
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
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

  // Children are only counted apart where the option prices them apart.
  const countsChildren = Boolean(option?.child);
  const childCount = countsChildren ? children : 0;
  const travellers = adults + childCount;

  const quote = quoteVisa(config.code, plan, [
    ...Array.from({ length: adults }, () => ({})),
    ...Array.from({ length: childCount }, () => ({ dateOfBirth: CHILD_STAND_IN })),
  ]);
  const total = quote?.total ?? null;

  const deliveryDays = option?.processingDays ?? config.deliveryDays;

  const choose = (index: number) => {
    setPlan(index);
    // A fixed-party option starts at its party, so its price is a price.
    const partySize = options[index]?.partySize;
    if (partySize) {
      setAdults(partySize);
      setChildren(0);
    }
  };

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
        {option?.express && (
          <p className="inline-flex items-center gap-1.5 self-center text-xs font-semibold text-foreground">
            <Zap aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
            Express
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
            {/* 1 — the choices. First the visa itself, from the price list;
                then who is travelling, and when. */}
            <div role="radiogroup" aria-label="Choose your visa">
              <p className="text-xs text-muted-foreground">Choose your visa</p>
              <div className="mt-2 space-y-2">
                {options.map((o, index) => (
                  <OptionCard
                    key={o.id}
                    option={o}
                    selected={index === plan}
                    onSelect={() => choose(index)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-3 divide-y divide-border border-t border-border">
              <Stepper
                id="panel-adults"
                icon={countsChildren ? User : Users}
                label={countsChildren ? "Adults" : "Travellers"}
                value={adults}
                min={1}
                max={MAX_TRAVELLERS - childCount}
                onChange={setAdults}
              />
              {countsChildren && (
                <Stepper
                  id="panel-children"
                  icon={Baby}
                  label={`Children (under ${CHILD_UNDER})`}
                  value={children}
                  min={0}
                  max={MAX_TRAVELLERS - adults}
                  onChange={setChildren}
                />
              )}

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
                  ).map((choice) => {
                    const active = travelChoice === choice.key;
                    return (
                      <button
                        key={choice.key}
                        type="button"
                        onClick={() => setChosenTravelWindow(choice.key)}
                        aria-pressed={active}
                        className={[
                          "cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors duration-[--duration-fast]",
                          active
                            ? "border-foreground bg-foreground text-surface"
                            : "border-border bg-surface text-subtle-foreground hover:border-border-strong hover:bg-surface-sunken",
                        ].join(" ")}
                      >
                        {choice.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2 — the price. One number, centred, and everything is in it. */}
            <div className="pt-6 text-center">
              <p
                data-numeric
                className="text-4xl font-bold tracking-[-0.03em] text-foreground"
              >
                {total === null ? "—" : inr(total)}
              </p>
              <p className="mt-2 text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Total · all fees and taxes included
              </p>
              {quote?.problem && (
                <p role="status" className="mt-2 text-xs text-muted-foreground">
                  {quote.problem}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={total === null}
              className="mt-4 flex w-full cursor-pointer items-center justify-center rounded-full bg-primary px-5 py-3.5 text-sm font-semibold tracking-tight text-on-primary shadow-e2 transition-[background-color,transform,box-shadow] duration-[--duration-fast] ease-[--ease-out] hover:bg-primary-hover hover:shadow-e3 active:scale-[0.99] active:bg-primary-active disabled:pointer-events-none disabled:opacity-50 motion-reduce:transform-none"
            >
              {draft ? "Resume Application" : "Start Application"}
            </button>

            {/* 3 — the ledger: who is being paid for, and the sum. */}
            {quote && quote.total !== null && (
              <dl className="mt-6">
                {quote.lines.map((line) => (
                  <div key={line.label} className="mt-3 first:mt-0">
                    <LedgerRow
                      icon={line.label.toLowerCase().includes("child") ? Baby : User}
                      label={line.count > 1 ? `${line.label} × ${line.count}` : line.label}
                      sub={line.count > 1 ? `${inr(line.unit)} each` : undefined}
                      value={inr(line.amount)}
                    />
                  </div>
                ))}
                <div className="mt-4 border-t border-border pt-4">
                  <LedgerRow
                    icon={ReceiptText}
                    label="Total amount"
                    value={inr(quote.total)}
                    strong
                  />
                </div>
              </dl>
            )}
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
        Nothing is charged until you reach checkout. The price includes the
        government fee, our service and taxes; nothing is added later.
      </p>
    </aside>
  );
}

/** One of the destination's visa options, as a selectable card. */
function OptionCard({
  option,
  selected,
  onSelect,
}: {
  option: VisaOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const facts = [
    option.stay && { label: "Stay", value: option.stay },
    option.validity && { label: "Validity", value: option.validity },
    option.processing && { label: "Processing", value: option.processing },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={[
        "block w-full cursor-pointer rounded-2xl border px-4 py-3.5 text-left transition-colors duration-[--duration-fast]",
        selected
          ? "border-foreground bg-surface shadow-e1"
          : "border-border bg-surface hover:border-border-strong hover:bg-surface-sunken",
      ].join(" ")}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-semibold tracking-tight text-foreground">
            {option.title}
          </span>
          <span className="mt-0.5 block text-2xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {option.entry} entry{option.express ? " · Express" : ""}
          </span>
        </span>
        <span
          aria-hidden
          className={[
            "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border",
            selected ? "border-foreground bg-foreground text-surface" : "border-border-strong",
          ].join(" ")}
        >
          {selected && <Check className="h-3 w-3" strokeWidth={3} />}
        </span>
      </span>

      {facts.length > 0 && (
        <span className="mt-3 grid grid-cols-3 gap-2">
          {facts.map((fact) => (
            <span key={fact.label} className="min-w-0">
              <span className="block text-2xs text-muted-foreground">{fact.label}</span>
              <span className="block text-xs font-semibold text-foreground">{fact.value}</span>
            </span>
          ))}
        </span>
      )}

      <span data-numeric className="mt-3 block text-xs font-semibold text-foreground">
        {describeOptionPrice(option)}
      </span>
    </button>
  );
}

/** A labelled − n + counter. */
function Stepper({
  id,
  icon: Icon,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  icon: typeof User;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <span className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-foreground">
        <Icon aria-hidden className="h-5 w-5 text-muted-foreground" strokeWidth={1.8} />
        <label htmlFor={id}>{label}</label>
      </span>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`${label}: one fewer`}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-subtle-foreground transition-colors duration-[--duration-fast] hover:border-border-strong hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-40"
        >
          <Minus aria-hidden className="h-3.5 w-3.5" />
        </button>
        <output
          id={id}
          data-numeric
          className="min-w-6 text-center text-base font-semibold text-foreground"
        >
          {value}
        </output>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`${label}: one more`}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-border text-subtle-foreground transition-colors duration-[--duration-fast] hover:border-border-strong hover:bg-surface-sunken disabled:pointer-events-none disabled:opacity-40"
        >
          <Plus aria-hidden className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * One row of the money ledger.
 *
 * The sub-label carries the reference's underline. It is decoration, not a
 * link: it names what the figure is per person.
 */
function LedgerRow({
  icon: Icon,
  label,
  sub,
  value,
  strong = false,
}: {
  icon: typeof User;
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
