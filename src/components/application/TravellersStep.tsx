"use client";

/**
 * WHO'S GOING
 * ---------------------------------------------------------------------------
 * The opening screen, rebuilt to the reference: one question, one field, one
 * button, and nothing else on a 900px-tall page.
 *
 * The field is the whole idea. It is not a bordered input with a label above
 * it — it is 30px of type on the page's centre line with a dotted rule under
 * it, so the placeholder reads as the question continuing rather than as a
 * form control. That is why the placeholder is a full sentence ("Enter
 * traveler's first name") and why there is no label: the heading two hundred
 * pixels above it is the label, and a screen with one field does not need to
 * say which field it means.
 *
 * WHAT THIS REPLACES. `SetupStep` — 308 lines asking for the party size, the
 * processing plan and the travel window, all three of which the destination
 * page has already asked. They arrive through the URL (`CountryApplicationPanel`
 * writes them), so re-asking them was the flow's opening move being a repeat of
 * the applicant's last one.
 *
 * NAMES ARE UPPERCASED, as they are on a passport, and the reducer does it —
 * `createTraveller` and `renameTraveller` both `.toUpperCase()`. The input
 * shows uppercase as you type so that what you see is what is stored, rather
 * than the value changing under you on submit.
 */

import { ArrowRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useApplication } from "@/lib/application/context";

export function TravellersStep() {
  const { state, dispatch, country, steps, currentIndex } = useApplication();
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // The field is the only thing on the screen that can be operated, so it
  // takes focus on arrival. `preventScroll` because the page is already at the
  // top and the browser's own focus scroll would nudge it.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const trimmed = name.trim();
  const canContinue = trimmed.length > 0 || state.travellers.length > 0;

  const following = steps[currentIndex + 1];

  const submit = () => {
    if (!canContinue || !following) return;

    if (trimmed.length > 0) {
      dispatch({ type: "addTraveller", firstName: trimmed });
      setName("");
    }

    /**
     * The step change is dispatched, not delegated to the context's `next`.
     *
     * `next` re-checks `blockingReason` against the state it closed over, and
     * the traveller just added is not in that state yet — it is in the action
     * queued on the line above. So `next` would look at an empty party, decide
     * the step is not satisfied, and silently refuse; the name would appear on
     * screen and the button would do nothing. Deferring it by a frame does not
     * help either, because the closure is stale rather than early.
     *
     * Dispatching the move directly is correct precisely because the guard
     * `next` would apply is already known to pass: a traveller with a
     * non-empty name is the entire condition this step gates on, and it was
     * either just added or was already there.
     */
    dispatch({ type: "goToStep", step: following.id, direction: 1 });
  };

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col items-center px-5 pt-24 md:pt-28">
      <header className="text-center">
        <h1 className="text-balance text-[26px] font-bold leading-tight tracking-[-0.02em] text-foreground sm:text-[30px] md:text-[34px]">
          Who&rsquo;s going on this trip to {country?.name}?
        </h1>
        <p className="mt-2 text-base text-muted-foreground sm:text-lg">
          You can add all travelers or continue solo
        </p>
      </header>

      {/* The field and its button sit on the page's middle third rather than
          directly under the heading. The reference leaves ~300px of nothing
          between the two, and that space is what makes the field read as the
          thing to do rather than as the next item in a list. */}
      <div className="flex w-full max-w-[720px] flex-1 flex-col justify-center pb-24">
        {state.travellers.length > 0 && (
          <ul className="mb-9 flex flex-wrap justify-center gap-2">
            {state.travellers.map((traveller) => (
              <li key={traveller.id}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-1.5 pl-3.5 pr-1.5 text-2xs font-bold uppercase tracking-[0.04em] text-foreground shadow-e1">
                  {traveller.firstName || "Unnamed"}
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "removeTraveller", id: traveller.id })
                    }
                    aria-label={`Remove ${traveller.firstName || "this traveller"}`}
                    className="flex size-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
                  >
                    <X aria-hidden className="size-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="group/field flex flex-col items-center"
        >
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoComplete="given-name"
            spellCheck={false}
            aria-label={
              state.travellers.length > 0
                ? "Add another traveller's first name"
                : "Traveller's first name"
            }
            placeholder="Enter traveler's first name"
            /* `uppercase` applies to the value only — a placeholder is painted
               by the browser from the attribute, and `::placeholder` below
               puts its casing back so the prompt stays a sentence.

               The global `*:focus-visible` ring is turned off HERE AND ONLY
               HERE, and replaced rather than removed: this field is 720px wide
               with no box of its own, so the shared 2px outline draws a rounded
               rectangle around empty space and invents a border the design does
               not have. The rule below thickens and takes the brand colour on
               focus instead, which is a visible indicator on the element's own
               boundary — what the outline was there to provide. */
            className="w-full bg-transparent pb-4 text-center text-2xl font-medium uppercase tracking-[-0.01em] text-foreground caret-primary outline-none focus-visible:outline-none placeholder:normal-case placeholder:font-normal placeholder:text-muted-foreground/80 sm:text-[28px] md:text-[30px]"
          />

          {/* The rule. Dotted at rest — a solid border reads as an input's
              underline, dotted reads as a writing line — and solid, doubled and
              amber while the field has focus, which is this field's focus
              indicator. */}
          <div
            aria-hidden
            className="h-0.5 w-full border-t border-dashed border-border-strong transition-colors duration-[--duration-fast] group-focus-within/field:border-t-2 group-focus-within/field:border-solid group-focus-within/field:border-primary motion-reduce:transition-none"
          />

          <button
            type="submit"
            disabled={!canContinue}
            className="group mt-16 inline-flex h-[58px] w-full max-w-[360px] cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-foreground text-lg font-bold text-background shadow-e2 transition-[background-color,transform,box-shadow] duration-[--duration-base] ease-[--ease-out] hover:bg-subtle-foreground hover:shadow-e3 active:scale-[0.99] disabled:cursor-default disabled:bg-muted-foreground/70 disabled:shadow-none motion-reduce:transform-none"
          >
            Continue
            <ArrowRight
              aria-hidden
              className="size-5 transition-transform duration-[--duration-fast] group-enabled:group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </button>
        </form>
      </div>
    </div>
  );
}
