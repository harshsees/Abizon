"use client";

/**
 * WHO IS SPONSORING THIS TRIP?
 * ---------------------------------------------------------------------------
 * Two cards on an otherwise empty page — the people already on the application,
 * and Someone else — with the answer's meaning stated above them, because
 * "sponsor" is a word that means something specific here and nothing much in
 * ordinary use.
 *
 * ── Why the question is asked at all ──
 *
 * It is on the form. Every consulate in this catalogue asks who is funding the
 * trip, and an officer weighs that person's finances rather than the
 * traveller's — a student with no income and a parent with a salary is an
 * ordinary, approvable application, and the same student presented as funding
 * themselves is not. Filing without it is filing incomplete, which is the one
 * thing this service exists to prevent.
 *
 * ── Why it comes after the travellers and not before them ──
 *
 * The reference numbers this screen second, and it cannot be second here: the
 * cards offer the people ON the application by name, and until the party exists
 * there is nobody to offer. Second would mean a screen whose main choice is
 * always empty. See the note in `stepSequence`.
 *
 * ── Someone else is a name, not a person ──
 *
 * A sponsor who is travelling is already a traveller row with a passport, a
 * photograph and a set of details, and the state stores a pointer to them. A
 * sponsor who is not travelling exists nowhere else, so their name is stored
 * here — and only their name. Collecting a non-traveller's date of birth,
 * address and income on this screen is the beginning of a second application
 * form, and none of it is asked for by anything downstream. What Abizon needs
 * at this point is who to name; what the consulate needs from them is
 * requested later, by a person, if it is requested at all.
 */

import { useState } from "react";
import { Check, Plus } from "lucide-react";

import { useApplication } from "@/lib/application/context";
import { cn } from "@/lib/utils";

export function SponsorStep() {
  const { state, dispatch, next, blocked } = useApplication();

  const sponsor = state.sponsor;
  const choosingOther = sponsor?.kind === "other";

  /**
   * The typed name, held locally and committed on every keystroke.
   *
   * Local state as well as reducer state because the input has to stay
   * controlled while the name is empty — `sponsor.name` of `""` is a valid
   * intermediate state that the step correctly refuses, and reading the field's
   * value straight off the reducer would work but couples every character to a
   * dispatch that also re-renders the cards beside it.
   */
  const [otherName, setOtherName] = useState(
    sponsor?.kind === "other" ? sponsor.name : "",
  );

  const chooseOther = (name: string) => {
    setOtherName(name);
    dispatch({ type: "setSponsor", sponsor: { kind: "other", name } });
  };

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col items-center px-5 pb-40 pt-24 md:pt-28">
      <header className="max-w-[640px] text-center">
        <h1 className="text-balance text-[23px] font-bold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[26px] md:text-[30px]">
          Let&rsquo;s know who&rsquo;s sponsoring this trip
        </h1>
        <p className="mt-2.5 text-balance text-[15px] leading-relaxed text-muted-foreground">
          A sponsor is whoever is funding the majority of this trip. Their
          finances are what the consulate weighs, so this is one of the few
          answers that genuinely changes an outcome.
        </p>
      </header>

      {/* The reference leaves a great deal of air between the question and the
          answers, and it is load-bearing: this is one question with two
          answers, and crowding them under the heading makes it read as a form
          with two fields. */}
      <div className="mt-16 flex w-full max-w-[820px] flex-col items-stretch gap-4 md:mt-24 md:flex-row md:items-start md:gap-0">
        <div className="flex flex-1 flex-col gap-3">
          {state.travellers.map((traveller) => {
            const selected =
              sponsor?.kind === "traveller" && sponsor.travellerId === traveller.id;

            return (
              <SponsorCard
                key={traveller.id}
                selected={selected}
                onSelect={() =>
                  dispatch({
                    type: "setSponsor",
                    sponsor: { kind: "traveller", travellerId: traveller.id },
                  })
                }
                leading={
                  <span
                    aria-hidden
                    className="flex size-[42px] flex-shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-on-primary"
                  >
                    {traveller.firstName.slice(0, 2).toUpperCase() || "?"}
                  </span>
                }
                label={traveller.firstName || "Unnamed traveller"}
              />
            );
          })}
        </div>

        {/* The divider the reference draws between the two answers. Vertical on
            desktop, gone on mobile where the cards are already stacked and a
            horizontal rule would read as a section break. */}
        <span
          aria-hidden
          className="mx-8 hidden w-px self-stretch bg-border md:block"
        />

        <div className="flex flex-1 flex-col gap-3">
          <SponsorCard
            selected={choosingOther}
            onSelect={() => chooseOther(otherName)}
            leading={
              <span
                aria-hidden
                className="flex size-[42px] flex-shrink-0 items-center justify-center rounded-full bg-surface-sunken text-muted-foreground"
              >
                <Plus className="size-5" />
              </span>
            }
            label="Someone else"
          />

          {/* The name field appears only once Someone else is chosen. Shown
              always, it would be a field asking for a name nobody has been
              asked for yet — and it is the only thing on this screen that
              needs typing, so it should not be there until it is needed. */}
          {choosingOther && (
            <label className="flex flex-col gap-1.5 rounded-2xl bg-surface px-5 py-4 shadow-e2">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Their full name
              </span>
              <input
                autoFocus
                value={otherName}
                onChange={(event) => chooseOther(event.target.value)}
                placeholder="As it appears on their documents"
                autoComplete="off"
                className="w-full border-b border-border-strong bg-transparent pb-1 text-[16px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary"
              />
            </label>
          )}
        </div>
      </div>

      {/* The bar. Fixed, matching the documents step, because this screen is
          mostly air and a button in the flow would sit halfway up an empty
          page on a tall display. */}
      <div className="fixed inset-x-0 bottom-0 z-nav border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:border-none md:bg-transparent md:pb-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-[440px] px-5 py-3.5 md:px-0 md:pb-7">
          <button
            type="button"
            onClick={next}
            disabled={Boolean(blocked)}
            title={blocked}
            className="inline-flex h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground text-[14px] font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-subtle-foreground active:scale-[0.99] disabled:cursor-default disabled:bg-muted-foreground/60 disabled:shadow-none motion-reduce:transform-none"
          >
            Continue with selected sponsor
          </button>
        </div>

        {blocked && (
          <p
            role="status"
            className="pb-3 text-center text-[12px] text-muted-foreground md:pb-5"
          >
            {blocked}
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * One answer.
 *
 * A `radio`-roled button rather than a real `<input type="radio">`: the two
 * groups are in separate columns with a divider between them, and a native
 * radio group whose members are split across two flex columns needs a
 * `fieldset` wrapping both — which is a layout constraint imposed by a control,
 * for a behaviour (`aria-checked`, arrow-key roving) this can state directly.
 */
function SponsorCard({
  selected,
  onSelect,
  leading,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  leading: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "flex w-full cursor-pointer items-center gap-3.5 rounded-full bg-surface py-3 pl-3 pr-5 text-left shadow-e2",
        "transition-[box-shadow,transform] duration-[--duration-fast] hover:shadow-e3 active:scale-[0.99] motion-reduce:transform-none",
        selected && "ring-2 ring-primary",
      )}
    >
      {leading}

      <span className="min-w-0 flex-1 truncate text-[17px] font-medium uppercase tracking-[0.01em] text-foreground">
        {label}
      </span>

      <span
        aria-hidden
        className={cn(
          "flex size-[22px] flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected ? "border-primary bg-primary text-on-primary" : "border-border-strong",
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3.5} />}
      </span>
    </button>
  );
}
