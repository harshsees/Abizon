"use client";

/**
 * WHAT ARE YOUR ESTIMATED TRAVEL DATES?
 * ---------------------------------------------------------------------------
 * The first screen of the flow, built to the reference: a white card on the
 * ambient field, a two-state pill above two months side by side, and Reset and
 * Continue on a hairline at the foot.
 *
 * ── Why this step exists at all ──
 *
 * It was being answered without being asked. `CountryApplicationPanel` seeds
 * `?date=` through the URL, so somebody who came through that panel had
 * answered it — and everybody who reached `/apply` any other way had a travel
 * window assumed for them, with no screen on which to see or change it. Every
 * figure downstream is measured from this date: which processing plans are
 * offered, what "guaranteed in 3 days" is counted from, whether the passport's
 * six-month validity rule is even satisfiable.
 *
 * ── The two answers are not two tabs of the same question ──
 *
 * The reference draws Fixed Date and Flexible Date as a segmented control, and
 * the temptation is to treat Flexible as a second calendar with a range in it.
 * It is not. `travelWindow` in the state model has exactly two non-exact
 * values, `soon` and `later`, and they are the same two answers the country
 * page offers — so Flexible is a choice between two named windows, and picking
 * one clears any date. Building a range picker here would invent a third kind
 * of answer that nothing downstream can read.
 *
 * ── The floor on the calendar ──
 *
 * Not today. `deliveryDays` from the dataset, plus a day: an application for a
 * visa that takes four working days cannot be for a flight tomorrow, and
 * offering the date is offering something the guarantee cannot cover. The
 * struck-out days say so before the applicant picks one and finds out at
 * checkout.
 */

import { useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";

import { useApplication } from "@/lib/application/context";
import {
  WEEKDAY_INITIALS,
  fromIsoDate,
  isSameDay,
  monthGrid,
  monthsFrom,
  startOfDay,
  toIsoDate,
} from "@/lib/application/calendar";
import { cn } from "@/lib/utils";

const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const cellLabel = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** How many months the card shows at once. Two, as the reference sets it. */
const MONTHS_SHOWN = 2;

const WINDOWS = [
  {
    id: "soon" as const,
    title: "In the next few weeks",
    detail: "We will file as soon as your documents are in.",
  },
  {
    id: "later" as const,
    title: "Later than that",
    detail: "We will hold your application and file it in good time.",
  },
];

export function DatesStep() {
  const { state, dispatch, config, next, blocked } = useApplication();

  const [mode, setMode] = useState<"fixed" | "flexible">(
    state.travelDate ? "fixed" : state.travelWindow ? "flexible" : "fixed",
  );

  /**
   * How far into the future the first selectable day is.
   *
   * `deliveryDays + 1` — see the header. Recomputed against `Date.now()` on
   * every render rather than frozen in state, because a flow left open
   * overnight would otherwise keep offering yesterday.
   */
  const floor = useMemo(() => {
    const days = (config?.deliveryDays ?? 1) + 1;
    const date = startOfDay(new Date());
    date.setDate(date.getDate() + days);
    return date;
  }, [config?.deliveryDays]);

  /**
   * Which month the card opens on, and it slides.
   *
   * State rather than derived from `floor`, because the chevron in the corner
   * of the reference moves it — an applicant booking six months out needs to
   * get there, and a card that can only ever show the next two months is a
   * calendar that refuses half the answers.
   */
  const [anchor, setAnchor] = useState(() => {
    const chosen = state.travelDate ? fromIsoDate(state.travelDate) : undefined;
    return startOfDay(chosen && chosen >= floor ? chosen : floor);
  });

  const months = useMemo(() => monthsFrom(anchor, MONTHS_SHOWN), [anchor]);

  const selected = state.travelDate ? fromIsoDate(state.travelDate) : undefined;

  /** The first month on show is the floor's own month — there is nothing before it. */
  const canGoBack =
    anchor.getFullYear() > floor.getFullYear() ||
    (anchor.getFullYear() === floor.getFullYear() && anchor.getMonth() > floor.getMonth());

  const shift = (delta: number) =>
    setAnchor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));

  const reset = () => {
    dispatch({ type: "setTravelDate", travelDate: undefined });
    setAnchor(floor);
  };

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col items-center px-4 pb-28 pt-24 md:pt-28">
      <header className="max-w-[640px] text-center">
        <h1 className="text-balance text-[23px] font-bold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[26px] md:text-[30px]">
          What are your estimated travel dates?
        </h1>
        <p className="mt-2.5 inline-flex items-center gap-2 text-[15px] text-muted-foreground">
          <Lightbulb aria-hidden className="size-4 text-accent" />
          Tentative dates work. You can change these later.
        </p>
      </header>

      {/* The card. `overflow-hidden` so the footer's hairline meets the rounded
          corners rather than running past them. */}
      <section className="mt-8 w-full max-w-[860px] overflow-hidden rounded-[24px] bg-surface shadow-e4">
        <div className="px-5 pt-7 md:px-9">
          <div
            role="radiogroup"
            aria-label="How settled are your dates?"
            className="mx-auto flex w-fit rounded-full bg-surface-sunken p-1"
          >
            {(
              [
                { id: "fixed", label: "Fixed Date" },
                { id: "flexible", label: "Flexible Date" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={mode === option.id}
                onClick={() => setMode(option.id)}
                className={cn(
                  "cursor-pointer rounded-full px-6 py-2 text-sm font-bold transition-colors duration-[--duration-fast]",
                  mode === option.id
                    ? "bg-surface text-foreground shadow-e1"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {mode === "fixed" ? (
          <div className="px-5 pb-7 pt-8 md:px-9">
            {/* Two months, split by a vertical hairline on desktop and stacked
                below it — 640px cannot hold two calendars and the reference
                does not try. */}
            <div className="grid gap-8 md:grid-cols-2 md:gap-0 md:divide-x md:divide-border">
              {months.map(({ year, month }, index) => (
                <MonthPanel
                  key={`${year}-${month}`}
                  year={year}
                  month={month}
                  floor={floor}
                  selected={selected}
                  onSelect={(date) =>
                    dispatch({ type: "setTravelDate", travelDate: toIsoDate(date) })
                  }
                  /* The chevrons sit on the outer edges of the pair: back on
                     the first month, forward on the last. */
                  onBack={index === 0 && canGoBack ? () => shift(-1) : undefined}
                  onForward={index === months.length - 1 ? () => shift(1) : undefined}
                  className={index === 0 ? "md:pr-8" : "md:pl-8"}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="px-5 pb-7 pt-8 md:px-9">
            <div
              role="radiogroup"
              aria-label="When are you travelling?"
              className="mx-auto grid max-w-[520px] gap-3"
            >
              {WINDOWS.map((window) => {
                const active = !state.travelDate && state.travelWindow === window.id;
                return (
                  <button
                    key={window.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() =>
                      dispatch({ type: "setTravelWindow", travelWindow: window.id })
                    }
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-2xl border px-5 py-4 text-left transition-colors duration-[--duration-fast]",
                      active
                        ? "border-primary bg-primary-subtle"
                        : "border-border bg-surface hover:border-border-strong",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "mt-0.5 flex size-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        active ? "border-primary" : "border-border-strong",
                      )}
                    >
                      {active && <span className="size-2.5 rounded-full bg-primary" />}
                    </span>
                    <span>
                      <span className="block text-[15px] font-bold text-foreground">
                        {window.title}
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-relaxed text-muted-foreground">
                        {window.detail}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* The footer. Reset clears the date rather than the whole step: there
            is nothing else on this screen to reset, and a control that also
            cleared the flexible answer would be undoing a choice the applicant
            can see is still made. */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4 md:px-9">
          <button
            type="button"
            onClick={reset}
            disabled={!state.travelDate}
            className="cursor-pointer rounded-full bg-surface-sunken px-6 py-3 text-sm font-bold text-subtle-foreground transition-colors hover:bg-border disabled:cursor-default disabled:opacity-50"
          >
            Reset
          </button>

          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={next}
              disabled={Boolean(blocked)}
              className="inline-flex h-[48px] cursor-pointer items-center rounded-full bg-foreground px-8 text-sm font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-subtle-foreground active:scale-[0.99] disabled:cursor-default disabled:bg-muted-foreground/60 disabled:shadow-none motion-reduce:transform-none"
            >
              Continue
            </button>

            {/* The disabled button explains itself. Every other step in this
                flow does the same, and it is the flow's oldest complaint. */}
            {blocked && (
              <p role="status" className="text-[12px] text-muted-foreground">
                {blocked}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * One month.
 *
 * The header is a `<caption>`-shaped row rather than a heading inside the grid,
 * so the chevrons can sit on the same baseline as the month name — which is
 * where the reference puts them and is also where a thumb expects them.
 */
function MonthPanel({
  year,
  month,
  floor,
  selected,
  onSelect,
  onBack,
  onForward,
  className,
}: {
  year: number;
  month: number;
  floor: Date;
  selected?: Date;
  onSelect: (date: Date) => void;
  onBack?: () => void;
  onForward?: () => void;
  className?: string;
}) {
  const cells = useMemo(() => monthGrid(year, month), [year, month]);
  const label = monthLabel.format(new Date(year, month, 1));

  return (
    <section aria-label={label} className={className}>
      <div className="mb-5 flex items-center justify-between">
        {/* A fixed-size slot whether or not there is a button in it, so the
            month name does not shift sideways as the chevrons appear. */}
        <span className="size-8">
          {onBack && (
            <Chevron direction="back" label={`Show the month before ${label}`} onClick={onBack} />
          )}
        </span>

        <h2 className="text-[17px] font-bold tracking-tight text-foreground">{label}</h2>

        <span className="size-8">
          {onForward && (
            <Chevron direction="forward" label={`Show the month after ${label}`} onClick={onForward} />
          )}
        </span>
      </div>

      <div
        aria-hidden
        className="mb-2 grid grid-cols-7 text-center text-[12px] font-bold text-muted-foreground"
      >
        {WEEKDAY_INITIALS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, index) =>
          day === null ? (
            <span key={`pad-${index}`} />
          ) : (
            <DayCell
              key={day.getTime()}
              day={day}
              disabled={day < floor}
              selected={Boolean(selected && isSameDay(selected, day))}
              onSelect={onSelect}
            />
          ),
        )}
      </div>
    </section>
  );
}

function Chevron({
  direction,
  label,
  onClick,
}: {
  direction: "back" | "forward";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden fill="none">
        <path
          d={direction === "back" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/**
 * One day.
 *
 * A day before the floor is rendered as a disabled BUTTON rather than a plain
 * span, so it keeps its place in the grid and announces itself as unavailable
 * rather than simply not being there. Struck through, as the reference draws
 * it — the strike is what distinguishes "too soon" from "not a day".
 */
function DayCell({
  day,
  disabled,
  selected,
  onSelect,
}: {
  day: Date;
  disabled: boolean;
  selected: boolean;
  onSelect: (date: Date) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      aria-label={cellLabel.format(day)}
      onClick={() => onSelect(day)}
      className={cn(
        "mx-auto flex size-9 items-center justify-center rounded-full text-[15px] transition-colors duration-[--duration-fast]",
        disabled
          ? "cursor-default text-muted-foreground/45 line-through"
          : selected
            ? "cursor-pointer bg-foreground font-bold text-background"
            : "cursor-pointer text-foreground hover:bg-surface-sunken",
      )}
    >
      <span data-numeric>{day.getDate()}</span>
    </button>
  );
}
