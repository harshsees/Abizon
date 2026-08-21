"use client";

/**
 * Step 3 — passport details, per traveller, plus one contact.
 *
 * PROGRESSIVE DISCLOSURE (§14). One traveller is open at a time. Three
 * travellers otherwise means eighteen fields on one screen, which is the exact
 * shape of form people abandon. A completed traveller collapses to a single
 * row — name, passport number, a tick — so the screen gets shorter as the work
 * gets done, and finishing one automatically opens the next.
 *
 * FIELD SET. Only what a passport carries and what an application needs to
 * reach you: six fields per traveller, and one email plus one phone for the
 * whole application. No address, no occupation, no employer, no income — this
 * is not a KYC form, and nothing in this project asks for those.
 *
 * VALIDATION. Per field, on blur, from `lib/application/schema.ts`, so a
 * half-typed passport number is not scolded mid-keystroke. The step's own gate
 * is `blockingReason`, which is coarse and always current — the two describe
 * the same state at different resolutions and cannot disagree.
 *
 * There is no OCR here, so nothing claims there is. The form the flow replaced
 * advertised "Passport upload can auto-fill some details" and then wrote the
 * literal string "Autofill from passport" into the name field.
 */

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Field, Input } from "@/components/ui/field";
import { useApplication } from "@/lib/application/context";
import { EMPTY_DETAILS, type TravellerDetails } from "@/lib/application/state";
import {
  validateContact,
  validateTravellerDetails,
  type TravellerDetailsInput,
} from "@/lib/application/schema";
import { cn } from "@/lib/utils";

const GENDERS = ["Female", "Male", "Other"];

/**
 * The one control here that is not an `<Input>`, kept in step with the
 * `underline` tone by hand. A native `<select>` cannot go through
 * `inputVariants` without also inheriting the input's height and padding
 * ramp, and the arrow the browser draws needs the right-hand room that
 * `px-0` would take away — so the padding is asymmetric on purpose.
 */
const SELECT_CLASS =
  "h-11 w-full rounded-none border-0 border-b border-input bg-transparent pl-0 pr-6 text-sm text-foreground transition-[border-color] duration-[--duration-fast] hover:border-border-strong focus:border-foreground focus-visible:border-foreground focus-visible:outline-none sm:h-9";

export function ApplicantDetailsStep() {
  const { state, dispatch } = useApplication();

  const [openId, setOpenId] = useState<string | undefined>(
    state.travellers[0]?.id,
  );
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (key: string) =>
    setTouched((previous) => ({ ...previous, [key]: true }));

  const contactErrors = validateContact(state.contact);

  return (
    <div className="space-y-8">
      <section className="space-y-2.5">
        {state.travellers.map((traveller, index) => {
          const details: TravellerDetails =
            state.details[traveller.id] ?? EMPTY_DETAILS;
          const errors = validateTravellerDetails(details);
          const complete = Object.keys(errors).length === 0;
          const expanded = openId === traveller.id;

          const errorFor = (field: keyof TravellerDetailsInput) =>
            touched[`${traveller.id}:${field}`] ? errors[field] : undefined;

          const set = (patch: Partial<TravellerDetails>) =>
            dispatch({ type: "setDetails", travellerId: traveller.id, patch });

          /** Finishing one traveller opens the next rather than dead-ending. */
          const advance = () => {
            const following = state.travellers[index + 1];
            setOpenId(following ? following.id : undefined);
          };

          return (
            <div
              key={traveller.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-surface transition-colors duration-[--duration-fast]",
                expanded ? "border-border-strong" : "border-border",
              )}
            >
              <h2>
                <button
                  type="button"
                  onClick={() => setOpenId(expanded ? undefined : traveller.id)}
                  aria-expanded={expanded}
                  aria-controls={`traveller-panel-${traveller.id}`}
                  className="flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors hover:bg-surface-sunken"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-8 flex-shrink-0 items-center justify-center rounded-full text-2xs font-bold tabular-nums",
                      complete
                        ? "bg-success-subtle text-success-subtle-foreground"
                        : "bg-surface-sunken text-muted-foreground",
                    )}
                  >
                    {complete ? <Check className="size-3.5" /> : index + 1}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {details.fullName ||
                        traveller.firstName ||
                        `Traveller ${index + 1}`}
                    </span>
                    <span className="mt-0.5 block truncate text-2xs text-muted-foreground">
                      {complete
                        ? details.passportNumber
                        : expanded
                          ? "Copy these from the passport"
                          : "Details needed"}
                    </span>
                  </span>

                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "size-4 flex-shrink-0 text-muted-foreground transition-transform duration-[--duration-base] motion-reduce:transition-none",
                      expanded && "rotate-180",
                    )}
                  />
                </button>
              </h2>

              {expanded && (
                <div
                  id={`traveller-panel-${traveller.id}`}
                  className="border-t border-border p-4 sm:p-5"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      labelTone="micro"
                      label="Full name"
                      required
                      className="sm:col-span-2"
                      helper="As printed in the passport, including middle names."
                      error={errorFor("fullName")}
                    >
                      {(field) => (
                        <Input
                          tone="underline"
                          {...field}
                          type="text"
                          autoComplete="name"
                          value={details.fullName}
                          invalid={Boolean(errorFor("fullName"))}
                          onBlur={() => markTouched(`${traveller.id}:fullName`)}
                          onChange={(event) =>
                            set({ fullName: event.target.value })
                          }
                        />
                      )}
                    </Field>

                    <Field
                      labelTone="micro"
                      label="Date of birth"
                      required
                      error={errorFor("dateOfBirth")}
                    >
                      {(field) => (
                        <Input
                          tone="underline"
                          {...field}
                          type="date"
                          value={details.dateOfBirth}
                          invalid={Boolean(errorFor("dateOfBirth"))}
                          onBlur={() =>
                            markTouched(`${traveller.id}:dateOfBirth`)
                          }
                          onChange={(event) =>
                            set({ dateOfBirth: event.target.value })
                          }
                        />
                      )}
                    </Field>

                    <Field
                      labelTone="micro"
                      label="Gender"
                      required
                      error={errorFor("gender")}
                    >
                      {({ id, invalid, "aria-describedby": describedBy }) => (
                        <select
                          id={id}
                          aria-describedby={describedBy}
                          aria-invalid={invalid || undefined}
                          value={details.gender}
                          onBlur={() => markTouched(`${traveller.id}:gender`)}
                          onChange={(event) =>
                            set({ gender: event.target.value })
                          }
                          className={SELECT_CLASS}
                        >
                          <option value="">Select</option>
                          {GENDERS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>

                    <Field
                      labelTone="micro"
                      label="Passport number"
                      required
                      error={errorFor("passportNumber")}
                    >
                      {(field) => (
                        <Input
                          tone="underline"
                          {...field}
                          type="text"
                          autoCapitalize="characters"
                          value={details.passportNumber}
                          invalid={Boolean(errorFor("passportNumber"))}
                          onBlur={() =>
                            markTouched(`${traveller.id}:passportNumber`)
                          }
                          onChange={(event) =>
                            set({
                              passportNumber: event.target.value.toUpperCase(),
                            })
                          }
                        />
                      )}
                    </Field>

                    <Field
                      labelTone="micro"
                      label="Passport expiry"
                      required
                      helper="Six months beyond your travel date, for most destinations."
                      error={errorFor("passportExpiry")}
                    >
                      {(field) => (
                        <Input
                          tone="underline"
                          {...field}
                          type="date"
                          value={details.passportExpiry}
                          invalid={Boolean(errorFor("passportExpiry"))}
                          onBlur={() =>
                            markTouched(`${traveller.id}:passportExpiry`)
                          }
                          onChange={(event) =>
                            set({ passportExpiry: event.target.value })
                          }
                        />
                      )}
                    </Field>

                    <Field
                      labelTone="micro"
                      label="Nationality"
                      required
                      className="sm:col-span-2"
                      error={errorFor("nationality")}
                    >
                      {(field) => (
                        <Input
                          tone="underline"
                          {...field}
                          type="text"
                          value={details.nationality}
                          invalid={Boolean(errorFor("nationality"))}
                          onBlur={() =>
                            markTouched(`${traveller.id}:nationality`)
                          }
                          onChange={(event) =>
                            set({ nationality: event.target.value })
                          }
                        />
                      )}
                    </Field>
                  </div>

                  {complete && index < state.travellers.length - 1 && (
                    <button
                      type="button"
                      onClick={advance}
                      className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-xl border border-border px-4 text-2xs font-semibold text-foreground transition-colors hover:bg-surface-sunken"
                    >
                      Next traveller
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Where we reach you
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            labelTone="micro"
            label="Email"
            required
            helper="Your visa and every status update go here."
            error={touched["contact:email"] ? contactErrors.email : undefined}
          >
            {(field) => (
              <Input
                tone="underline"
                {...field}
                type="email"
                autoComplete="email"
                inputMode="email"
                value={state.contact.email}
                invalid={Boolean(
                  touched["contact:email"] && contactErrors.email,
                )}
                onBlur={() => markTouched("contact:email")}
                onChange={(event) =>
                  dispatch({
                    type: "setContact",
                    patch: { email: event.target.value },
                  })
                }
              />
            )}
          </Field>

          <Field
            labelTone="micro"
            label="Phone"
            required
            error={touched["contact:phone"] ? contactErrors.phone : undefined}
          >
            {(field) => (
              <Input
                tone="underline"
                {...field}
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={state.contact.phone}
                invalid={Boolean(
                  touched["contact:phone"] && contactErrors.phone,
                )}
                onBlur={() => markTouched("contact:phone")}
                onChange={(event) =>
                  dispatch({
                    type: "setContact",
                    patch: { phone: event.target.value },
                  })
                }
              />
            )}
          </Field>
        </div>
      </section>
    </div>
  );
}
