"use client";

/**
 * ONE FIELD OF THE ARRIVAL-CARD FORM.
 * ---------------------------------------------------------------------------
 * The reference does not draw boxes around its inputs. Each field is a small
 * tracked uppercase label, the value beneath it, and a dotted hairline under
 * the value — twelve of those in a two-column grid, on a card that already
 * provides the containment a border would be repeating.
 *
 * Which is what `tone="underline"` on the shared `Input` was built for in the
 * application flow, so this is that primitive with two changes and no new
 * form architecture:
 *
 *   the rule is dotted, and becomes solid on focus. A dotted line reads as
 *   "waiting for something" and a solid one as "this is where you are"; it is
 *   also the only thing that moves when a field is focused, which is what
 *   keeps a form this dense calm to move through.
 *
 *   the label is set in the foreground rather than the muted tone. At 11px
 *   uppercase over a value in the same colour there is not enough separation,
 *   and the reference sets its labels dark for the same reason.
 *
 * Dates use `<input type="date">`, matching `ApplicantDetailsStep` — the
 * browser's own picker, its own calendar affordance at the right edge, and no
 * second date-picker architecture in the app. `DatePickerModal` is not it:
 * that is the travel-date picker, which shows two months from today and is
 * the wrong instrument for a date of birth.
 */

import { Field, Input } from "@/components/ui/field";
import type { ArrivalCardField } from "@/lib/arrivalCard";
import { cn } from "@/lib/utils";

/** Dotted at rest, solid and dark under the cursor. */
const RULE =
  "border-dotted border-b-[1.5px] focus:border-solid focus-visible:border-solid";

/** Labels sit in the foreground; see the note above. */
const LABEL = "[&>label]:text-foreground";

export function ArrivalFormField({
  field,
  value,
  error,
  autofilled,
  onChange,
}: {
  field: ArrivalCardField;
  value: string;
  error?: string;
  /** Written by the passport scan and not since edited. */
  autofilled: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <Field
      label={field.label}
      labelTone="micro"
      required={field.required}
      error={error}
      // §51: an auto-filled field is not turned into a coloured card. The only
      // signal is a line of text under it, and only until it is edited — the
      // value has to stay as ordinary and as editable as one that was typed.
      helper={autofilled ? "Filled from your passport. Check it." : undefined}
      className={cn(LABEL, field.wide && "sm:col-span-2")}
    >
      {({ invalid, ...props }) =>
        field.kind === "select" ? (
          <div className="relative">
            <select
              {...props}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              // `invalid` is destructured out above rather than spread: it is
              // a prop of the `Input` primitive, not an attribute of a DOM
              // node, and React writes anything it does not recognise straight
              // onto the element — so spreading it here put a literal
              // `invalid="false"` on every select.
              aria-invalid={invalid || undefined}
              className={cn(
                "h-11 w-full cursor-pointer appearance-none rounded-none border-0 bg-transparent px-0 pr-6 text-sm sm:h-9",
                "transition-[border-color] duration-[--duration-fast] ease-[--ease-out]",
                RULE,
                invalid
                  ? "border-destructive"
                  : "border-input hover:border-border-strong focus:border-foreground focus-visible:border-foreground focus-visible:outline-none",
                value === "" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {/* The placeholder is a real disabled option rather than a
                  styled label, so the control still announces its own empty
                  state and the form can tell "not answered" from "Other". */}
              <option value="">{field.placeholder}</option>
              {field.options?.map((option) => (
                <option key={option} value={option} className="text-foreground">
                  {option}
                </option>
              ))}
            </select>
            {/* Decorative: the select draws its own affordance on some
                platforms, and this is the one the design calls for. */}
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute right-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        ) : (
          <Input
            {...props}
            invalid={invalid}
            tone="underline"
            type={field.kind === "date" ? "date" : "text"}
            value={value}
            placeholder={field.placeholder}
            onChange={(event) => onChange(event.target.value)}
            // A passport number is transcribed, never remembered — the
            // browser's saved values are noise here, and autocapitalising a
            // name the traveller is copying off a document fights them.
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className={cn(
              RULE,
              // The native date control reserves room for its own picker
              // button; without this the value sits under it.
              field.kind === "date" && "pr-1",
            )}
          />
        )
      }
    </Field>
  );
}
