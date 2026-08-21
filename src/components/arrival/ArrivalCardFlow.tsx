"use client";

/**
 * ONE SHEET, ONE JOB.
 * ---------------------------------------------------------------------------
 * The arrival card is a short form, so it gets a short flow: a single sheet on
 * the same ground as the application, the passport scanner above the fields it
 * fills, and one action at the bottom. No steps, no rail, no summary — those
 * exist in the application because there are five screens and money involved,
 * and importing them here would dress four minutes of typing as a process.
 *
 * ── What this does not do, and says so ──
 *
 * It does not submit anything. Arrival cards are filed on the destination
 * government's own portal, and there is no API to file one on somebody's
 * behalf; what this can honestly do is get the details together, check the
 * passport reads correctly, and hand the traveller to the official page with
 * the window explained. So the primary action opens the government site, and
 * is labelled as doing that.
 *
 * That is a smaller promise than the reference this was modelled on, which
 * shows a "Submit application" button on the same screen. Ours would be a
 * button that cannot do what it says.
 */

import { ExternalLink, Plus, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { PassportAutofill } from "@/components/application/PassportAutofill";
import { Field, Input } from "@/components/ui/field";
import type { ArrivalCard } from "@/lib/arrivalCard";
import type { CountryVisaConfig } from "@/lib/countryVisa";
import { EMPTY_DETAILS, type TravellerDetails } from "@/lib/application/state";
import { cn } from "@/lib/utils";

type Traveller = { id: string; details: TravellerDetails };

const newTraveller = (): Traveller => ({
  id: crypto.randomUUID(),
  details: { ...EMPTY_DETAILS },
});

export function ArrivalCardFlow({
  config,
  card,
}: {
  config: CountryVisaConfig;
  card: ArrivalCard;
}) {
  const [travellers, setTravellers] = useState<Traveller[]>([newTraveller()]);

  const patch = (id: string, next: Partial<TravellerDetails>) =>
    setTravellers((current) =>
      current.map((traveller) =>
        traveller.id === id
          ? { ...traveller, details: { ...traveller.details, ...next } }
          : traveller,
      ),
    );

  return (
    <div className="flex min-h-screen flex-col bg-background bg-[image:var(--gradient-application)]">
      <header className="px-4 py-5 sm:px-6">
        <Link
          href={`/visa/${config.slug}`}
          className="text-2xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to {config.displayName}
        </Link>
      </header>

      <main
        id="main-content"
        className="flex flex-1 justify-center px-4 pb-24 sm:px-6"
      >
        <div className="w-full max-w-[34rem]">
          <div className="overflow-hidden rounded-card border border-border bg-surface shadow-e2">
            <div className="px-5 py-7 sm:px-8 sm:py-9">
              {/* The masthead from the reference: flag, the destination in
                  small caps, then the promise as the heading. */}
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.flagUrl}
                  alt=""
                  width={36}
                  height={27}
                  className="mt-1 h-auto w-9 flex-shrink-0 rounded-sm"
                />
                <div className="min-w-0">
                  <p className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {config.displayName} · arrival card
                  </p>
                  <h1 className="type-h2 mt-1 text-balance text-foreground">
                    {card.free ? "Free, and takes a few minutes" : card.scheme}
                  </h1>
                </div>
              </div>

              <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
                The <strong className="text-foreground">{card.scheme}</strong>
                {card.abbreviation ? ` (${card.abbreviation})` : ""} is
                {card.mandatory ? " required" : " available"} for everyone
                entering {config.displayName}. It is issued by their government
                and{" "}
                {card.free ? (
                  <strong className="text-foreground">costs nothing</strong>
                ) : (
                  "carries a fee"
                )}
                . Anyone charging you for it is charging for the typing.
              </p>

              {card.submitWithinDaysOfArrival !== undefined && (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface-sunken px-4 py-3 text-2xs leading-relaxed text-muted-foreground">
                  <ShieldCheck
                    aria-hidden
                    className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground"
                  />
                  <span>
                    It can only be submitted within{" "}
                    <strong className="text-foreground">
                      {card.submitWithinDaysOfArrival} days
                    </strong>{" "}
                    of arriving. Filing earlier is the most common way this gets
                    rejected — fill it in now, submit it inside the window.
                  </span>
                </p>
              )}

              {travellers.map((traveller, index) => (
                <section
                  key={traveller.id}
                  className={cn(
                    "border-t border-border pt-6",
                    index === 0 ? "mt-8" : "mt-6",
                  )}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Traveller {index + 1}
                    </h2>
                    {travellers.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setTravellers((current) =>
                            current.filter((item) => item.id !== traveller.id),
                          )
                        }
                        className="-mr-2 flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-2xs font-semibold text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
                      >
                        <Trash2 aria-hidden className="size-3" />
                        Remove
                        <span className="sr-only"> traveller {index + 1}</span>
                      </button>
                    )}
                  </div>

                  <PassportAutofill
                    className="mt-4"
                    onFilled={(next) => patch(traveller.id, next)}
                  />

                  <div className="my-6 flex items-center gap-3">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-2xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                      or type them
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      labelTone="micro"
                      label="Full name"
                      className="sm:col-span-2"
                      helper="Exactly as printed in the passport."
                    >
                      {(field) => (
                        <Input
                          {...field}
                          tone="underline"
                          value={traveller.details.fullName}
                          onChange={(event) =>
                            patch(traveller.id, { fullName: event.target.value })
                          }
                        />
                      )}
                    </Field>

                    <Field labelTone="micro" label="Date of birth">
                      {(field) => (
                        <Input
                          {...field}
                          tone="underline"
                          type="date"
                          value={traveller.details.dateOfBirth}
                          onChange={(event) =>
                            patch(traveller.id, {
                              dateOfBirth: event.target.value,
                            })
                          }
                        />
                      )}
                    </Field>

                    <Field labelTone="micro" label="Passport number">
                      {(field) => (
                        <Input
                          {...field}
                          tone="underline"
                          value={traveller.details.passportNumber}
                          onChange={(event) =>
                            patch(traveller.id, {
                              passportNumber: event.target.value,
                            })
                          }
                        />
                      )}
                    </Field>

                    <Field labelTone="micro" label="Passport expiry">
                      {(field) => (
                        <Input
                          {...field}
                          tone="underline"
                          type="date"
                          value={traveller.details.passportExpiry}
                          onChange={(event) =>
                            patch(traveller.id, {
                              passportExpiry: event.target.value,
                            })
                          }
                        />
                      )}
                    </Field>

                    <Field labelTone="micro" label="Nationality">
                      {(field) => (
                        <Input
                          {...field}
                          tone="underline"
                          value={traveller.details.nationality}
                          onChange={(event) =>
                            patch(traveller.id, {
                              nationality: event.target.value,
                            })
                          }
                        />
                      )}
                    </Field>
                  </div>
                </section>
              ))}

              <button
                type="button"
                onClick={() =>
                  setTravellers((current) => [...current, newTraveller()])
                }
                className="mt-6 flex h-11 cursor-pointer items-center gap-2 rounded-full border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
              >
                <Plus aria-hidden className="size-4" />
                Add traveller
              </button>
            </div>

            {/* The action is an outbound link, not a submit. There is no API to
                file an arrival card on somebody's behalf, so a "Submit" button
                here would be a button that cannot do what it says. */}
            <div className="border-t border-border bg-surface-sunken px-5 py-4 sm:px-8">
              <a
                href={card.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-bold text-background transition-colors hover:bg-subtle-foreground sm:h-11"
              >
                Continue on the {config.displayName} government site
                <ExternalLink aria-hidden className="size-4" />
              </a>
              <p className="mt-2.5 text-center text-2xs leading-relaxed text-muted-foreground">
                Opens {new URL(card.officialUrl).hostname} in a new tab. Keep
                this page open to copy your details across.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
