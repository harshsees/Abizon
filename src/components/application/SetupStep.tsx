"use client";

/**
 * Step 1 — confirm the trip.
 *
 * This step CONFIRMS; it does not interrogate. Country, visa type, travellers,
 * plan and travel date all arrive from `CountryApplicationPanel` through the
 * URL, so the applicant's first screen shows them their own choices rather
 * than an empty form. The flow this replaces discarded all five and opened on
 * a blank name box.
 *
 * The destination sits at the top as a read-only fact with a link back, not as
 * an editable control: changing country mid-application changes the fee, the
 * documents and the step sequence, so it is a decision that belongs on the
 * country page.
 *
 * TRAVEL DATE. Phase 5B §9 puts the travel date on this step and §12 asks for
 * a clean date selection. Rather than ask twice across two steps, the date is
 * a distinct section here, offering the same three answers the country page
 * already offered — within 30 days / not decided / an exact date — and reusing
 * `DatePickerModal` for the third. `resolveTravelWindow` derives "exact" from
 * the date rather than storing it twice.
 */

import { CalendarDays, Check, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DatePickerModal } from "@/components/DatePickerModal";
import { Field, Input } from "@/components/ui/field";
import { getCountrySlug } from "@/data/countries";
import { useApplication } from "@/lib/application/context";
import { resolveTravelWindow } from "@/lib/application/state";
import { cn } from "@/lib/utils";

import { ProcessingPlanSelector } from "./ProcessingPlanSelector";

const longDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </h2>
  );
}

export function SetupStep() {
  const { state, dispatch, country, config } = useApplication();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!country || !config) return null;

  const travellers = state.travellers;
  const travelWindow = resolveTravelWindow(state);

  return (
    <div className="space-y-10">
      {/* ---------------------------------------------------------------- */}
      {/* Destination — stated, not asked                                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <SectionHeading>Destination</SectionHeading>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
          <span className="flex min-w-0 items-center gap-3">
            <img
              src={config.flagUrl}
              alt=""
              className="h-6 w-9 flex-shrink-0 rounded-sm object-cover ring-1 ring-border"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-foreground">
                {config.displayName}
              </span>
              <span className="block truncate text-2xs text-muted-foreground">
                {config.visaType}
                {config.validity ? ` · valid ${config.validity}` : ""}
              </span>
            </span>
          </span>
          <Link
            href={`/visa/${getCountrySlug(country.name)}`}
            className="flex-shrink-0 text-2xs font-semibold text-primary-subtle-foreground underline-offset-4 hover:underline"
          >
            Change
          </Link>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Travellers                                                        */}
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <SectionHeading>Travellers</SectionHeading>

        {travellers.length === 0 ? (
          <button
            type="button"
            onClick={() => dispatch({ type: "addTraveller" })}
            className="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed border-border-strong bg-surface px-4 py-8 transition-colors hover:bg-surface-sunken"
          >
            <UserPlus aria-hidden className="size-5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              Add the first traveller
            </span>
            <span className="text-2xs text-muted-foreground">
              You can add up to ten on one application.
            </span>
          </button>
        ) : (
          <>
            <ul className="space-y-2.5">
              {travellers.map((traveller, index) => (
                <li key={traveller.id} className="flex items-end gap-2.5">
                  <Field
                    labelTone="micro"
                    label={`Traveller ${index + 1} first name`}
                    hideLabel={index > 0}
                    required
                    className="flex-1"
                    helper={
                      index === 0
                        ? "Exactly as printed in the passport."
                        : undefined
                    }
                  >
                    {(field) => (
                      <Input
                        tone="underline"
                        {...field}
                        type="text"
                        autoComplete="given-name"
                        placeholder={
                          index > 0
                            ? `Traveller ${index + 1} first name`
                            : undefined
                        }
                        value={traveller.firstName}
                        onChange={(event) =>
                          dispatch({
                            type: "renameTraveller",
                            id: traveller.id,
                            firstName: event.target.value,
                          })
                        }
                      />
                    )}
                  </Field>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "removeTraveller", id: traveller.id })
                    }
                    className="flex size-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive sm:size-10"
                  >
                    <Trash2 aria-hidden className="size-4" />
                    <span className="sr-only">
                      Remove traveller {index + 1}
                      {traveller.firstName ? ` (${traveller.firstName})` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {travellers.length < 10 && (
              <button
                type="button"
                onClick={() => dispatch({ type: "addTraveller" })}
                className="flex cursor-pointer items-center gap-2 text-2xs font-semibold text-primary-subtle-foreground transition-opacity hover:opacity-75"
              >
                <UserPlus aria-hidden className="size-3.5" />
                Add another traveller
              </button>
            )}
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Processing speed                                                  */}
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <SectionHeading>Processing speed</SectionHeading>
        <ProcessingPlanSelector
          config={config}
          value={state.plan}
          onChange={(plan) => dispatch({ type: "setPlan", plan })}
        />
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Travel date                                                       */}
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-3">
        <SectionHeading>When do you travel?</SectionHeading>

        {/* `role="group"` with pressed toggles, NOT a radiogroup. A radiogroup
            is a single tab stop with roving focus, and the third option — the
            exact date — is a separate control below that opens a dialog. Three
            toggle buttons that each report their own pressed state describe
            this honestly; a radiogroup would promise arrow-key semantics that
            the third option cannot join. */}
        <div
          role="group"
          aria-label="When do you travel?"
          className="grid grid-cols-2 gap-2.5"
        >
          {(
            [
              { key: "soon", label: "Within 30 days" },
              { key: "later", label: "Not decided yet" },
            ] as const
          ).map((option) => {
            const active = travelWindow === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  dispatch({
                    type: "setTravelWindow",
                    travelWindow: option.key,
                  })
                }
                className={cn(
                  "cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-semibold",
                  "transition-[background-color,border-color] duration-[--duration-fast]",
                  active
                    ? "border-primary bg-primary-subtle text-primary-subtle-foreground"
                    : "border-border bg-surface text-subtle-foreground hover:border-border-strong",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  {option.label}
                  {active && (
                    <Check aria-hidden className="size-4 flex-shrink-0" />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-pressed={travelWindow === "exact"}
          className={cn(
            "flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left",
            "transition-[background-color,border-color] duration-[--duration-fast]",
            travelWindow === "exact"
              ? "border-primary bg-primary-subtle"
              : "border-border bg-surface hover:border-border-strong",
          )}
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <CalendarDays
              aria-hidden
              className={cn(
                "size-4 flex-shrink-0",
                travelWindow === "exact"
                  ? "text-primary-subtle-foreground"
                  : "text-muted-foreground",
              )}
            />
            <span
              className={cn(
                "truncate text-sm font-semibold",
                travelWindow === "exact"
                  ? "text-primary-subtle-foreground"
                  : "text-subtle-foreground",
              )}
            >
              {state.travelDate
                ? longDate.format(new Date(state.travelDate))
                : "Pick an exact date"}
            </span>
          </span>
          <span className="flex-shrink-0 text-2xs font-semibold text-muted-foreground">
            {state.travelDate ? "Change" : "Optional"}
          </span>
        </button>
      </section>

      <DatePickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        // Today, so the picker's two months follow the real calendar rather
        // than the August 2026 date it used to hardcode.
        minDate={new Date()}
        confirmLabel="Use this date"
        onSelectDate={(date) => {
          dispatch({
            type: "setTravelDate",
            travelDate: date.toISOString().split("T")[0],
          });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}
