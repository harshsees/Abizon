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
        <h1 className="text-balance text-[23px] font-bold leading-[1.2] tracking-[-0.02em] text-foreground sm:text-[26px] md:text-[30px]">
          Who&rsquo;s going on this trip to {country?.name}?
        </h1>
        <p className="mt-2 text-[15px] text-muted-foreground sm:text-[17px]">
          You can add all travelers or continue solo
        </p>
      </header>

      {/* The field and its button sit on the page's middle third rather than
          directly under the heading. The reference leaves ~300px of nothing
          between the two, and that space is what makes the field read as the
          thing to do rather than as the next item in a list.

          `pt-16` nudges the whole block below the optical centre. Centred
          exactly, the field and the heading read as two items with a gap
          between them; a little lower and the heading owns the top of the page
          and the field owns the middle, which is the reference's proportion. */}
      <div className="flex w-full max-w-[640px] flex-1 flex-col justify-center pb-24 pt-16 md:pt-24">
        {state.travellers.length > 0 && (
          <ul className="mb-7 flex flex-wrap justify-center gap-1.5">
            {state.travellers.map((traveller) => (
              <li key={traveller.id}>
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface py-1 pl-3 pr-1 text-[11px] font-bold uppercase tracking-[0.04em] text-foreground shadow-e1">
                  {traveller.firstName}
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "removeTraveller", id: traveller.id })
                    }
                    aria-label={`Remove ${traveller.firstName}`}
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
            /* NO SUGGESTION LIST.
               `autoComplete="given-name"` asked the browser to offer saved
               names here, so clicking the field dropped a native dropdown of
               everything previously typed into it over the page — on a screen
               whose entire design is one line of type on empty space, that is
               the most intrusive thing that can appear on it. `off` alone is
               not always honoured for a text field with a recognisable name,
               so the field is also named something no heuristic matches and
               the two common password managers are told to stay out. */
            autoComplete="off"
            autoCorrect="off"
            name="traveller-first-name"
            data-lpignore="true"
            data-1p-ignore
            data-form-type="other"
            spellCheck={false}
            aria-label={
              state.travellers.length > 0
                ? "Add another traveller's first name"
                : "Traveller's first name"
            }
            placeholder="Enter traveler's first name"
            /* Removes the app-wide focus ring, which is unlayered CSS and
               therefore unreachable from a utility class. The rule below is
               this field's indicator instead — see globals.css §4. */
            data-focus-ring="none"
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
            className="w-full appearance-none border-0 bg-transparent pb-3.5 text-center text-[22px] font-medium uppercase tracking-[-0.01em] text-foreground caret-foreground shadow-none outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none placeholder:normal-case placeholder:font-normal placeholder:text-muted-foreground/70 sm:text-[25px] md:text-[27px]"
          />

          {/* The rule. Dotted at rest — a solid border reads as an input's
              underline, dotted reads as a writing line — and solid and darker
              while the field has focus.

              IT USED TO GO AMBER. `--color-primary` is this product's brand
              yellow, and a 640px yellow line under the one thing on the screen
              read as a validation warning rather than as focus: yellow means
              "look at this, something is wrong" everywhere else in the app.
              The indicator is now weight and ink — dashed hairline to solid
              2px in `border-strong` — which is still a visible, non-colour
              change on the element's own boundary, so WCAG 2.4.7 is satisfied
              without the field appearing to complain about what is in it. */}
          <div
            aria-hidden
            className="h-0.5 w-full border-t border-dashed border-border-strong transition-[border] duration-[--duration-fast] group-focus-within/field:border-t-2 group-focus-within/field:border-solid group-focus-within/field:border-foreground motion-reduce:transition-none"
          />

          <button
            type="submit"
            disabled={!canContinue}
            className="group mt-10 inline-flex h-[52px] w-full max-w-[340px] cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground text-[15px] font-bold text-background shadow-e2 transition-[background-color,transform,box-shadow] duration-[--duration-base] ease-[--ease-out] hover:bg-subtle-foreground hover:shadow-e3 active:scale-[0.99] disabled:cursor-default disabled:bg-muted-foreground/70 disabled:shadow-none motion-reduce:transform-none"
          >
            Continue
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-[--duration-fast] group-enabled:group-hover:translate-x-1 motion-reduce:transition-none"
            />
          </button>
        </form>
      </div>
    </div>
  );
}
