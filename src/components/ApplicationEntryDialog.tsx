"use client";

/**
 * THE WAY IN
 * ---------------------------------------------------------------------------
 * One dialog, opened by every control on the destination page that means
 * "begin", asking at most two questions and then going.
 *
 *     1. Resume, or start again?      only when there is something to resume
 *     2. Before or after <date>?      only when it has not already been asked
 *
 * ── What this replaces ──
 *
 * The page used to route those two questions through the page itself.
 * "Check Required Documents" scrolled to the requirements section; "Start
 * Application" scrolled to the panel; the panel then asked when you travel,
 * and its button read either "Start Application" or "Resume Application"
 * depending on a draft the reader had not been told about. So the choice
 * between resuming and starting over was made FOR the reader by a button label
 * four screens down, and the only way to discover a saved application was to
 * scroll far enough to see the word change.
 *
 * Both questions are now asked where the decision is actually made — at the
 * moment of pressing "begin" — and asked out loud.
 *
 * ── Why the date question is two buttons and not a calendar ──
 *
 * Because the flow needs the ANSWER, not the date. Everything downstream keys
 * off whether the trip is inside the guaranteed window or beyond it: which
 * processing plan is worth showing, whether express means anything, what the
 * guarantee band says. A calendar asks for precision the traveller often does
 * not have yet and that nothing needs. The panel still carries a real date
 * picker for anyone who does know, and this dialog skips its own question when
 * they have used it.
 */

import { ArrowRight, CalendarDays, Clock3, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { ApplicationDraft } from "@/lib/applicationDraft";
import { clearDraft, describeAge } from "@/lib/applicationDraft";

export type EntryChoice = {
  travellers: number;
  plan: number;
  travelWindow?: "soon" | "later";
  travelDate?: string;
  /** True when the reader chose to carry on with a saved application. */
  resumed: boolean;
};

export function ApplicationEntryDialog({
  countryName,
  countrySlug,
  /** The guarantee date the two travel buttons are phrased around. */
  guaranteeDate,
  draft,
  /** Defaults from the panel, when the panel is what opened this. */
  seed,
  /** The panel has its own date control, so it does not need the question. */
  askTravelWindow = true,
  onGo,
  onClose,
}: {
  countryName: string;
  countrySlug: string;
  guaranteeDate: Date;
  draft?: ApplicationDraft;
  seed?: { travellers?: number; plan?: number; travelDate?: string; travelWindow?: "soon" | "later" };
  askTravelWindow?: boolean;
  onGo: (choice: EntryChoice) => void;
  onClose: () => void;
}) {
  /**
   * Which question is on screen.
   *
   * Both are conditional, so the opening step is computed rather than fixed —
   * and when neither applies the dialog has nothing to ask and gets out of the
   * way instead of showing an empty box with a Continue button on it.
   */
  const needsChoice = Boolean(draft);
  const needsWindow = askTravelWindow && !seed?.travelDate && !seed?.travelWindow;

  const [step, setStep] = useState<"choice" | "window">(
    needsChoice ? "choice" : "window",
  );

  useEffect(() => {
    if (!needsChoice && !needsWindow) {
      onGo({
        travellers: seed?.travellers ?? 1,
        plan: seed?.plan ?? 0,
        travelDate: seed?.travelDate,
        travelWindow: seed?.travelWindow,
        resumed: false,
      });
    }
    // Once, on open. The answer cannot change while the dialog is up.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!needsChoice && !needsWindow) return null;

  const go = (extra: Partial<EntryChoice>) =>
    onGo({
      travellers: seed?.travellers ?? draft?.travellers ?? 1,
      plan: seed?.plan ?? draft?.plan ?? 0,
      travelDate: seed?.travelDate ?? draft?.travelDate,
      travelWindow: seed?.travelWindow ?? draft?.travelWindow,
      resumed: false,
      ...extra,
    });

  const dateLabel = guaranteeDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-overlay px-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-title"
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-[400px] rounded-[22px] bg-surface p-6 shadow-e4"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3.5 top-3.5 flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground"
        >
          <X aria-hidden className="size-4" />
        </button>

        {step === "choice" && draft ? (
          <>
            <h2 id="entry-title" className="pr-8 text-[17px] font-bold text-foreground">
              You have a {countryName} application in progress
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              Started {describeAge(draft.startedAt)}. Carry on where you left
              off, or begin a new one.
            </p>

            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={() => go({ resumed: true })}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors hover:border-border-strong hover:bg-surface-sunken"
              >
                <span
                  aria-hidden
                  className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary"
                >
                  <Clock3 className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-foreground">
                    Resume
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    Keep the answers already given
                  </span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  // Cleared here rather than on arrival, so the flow cannot
                  // restore the old draft over a deliberately fresh start.
                  clearDraft(countrySlug);
                  if (needsWindow) setStep("window");
                  else go({ resumed: false, travelDate: undefined, travelWindow: undefined });
                }}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors hover:border-border-strong hover:bg-surface-sunken"
              >
                <span
                  aria-hidden
                  className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-subtle-foreground"
                >
                  <RotateCcw className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold text-foreground">
                    Start new
                  </span>
                  <span className="block text-[12px] text-muted-foreground">
                    Discard it and begin again
                  </span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="entry-title" className="pr-8 text-[17px] font-bold text-foreground">
              When do you plan to travel?
            </h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
              {countryName} is guaranteed by {dateLabel} on an application
              started today.
            </p>

            <div className="mt-5 space-y-2.5">
              {(
                [
                  {
                    key: "soon" as const,
                    label: `Before ${dateLabel}`,
                    sub: "Inside the guaranteed window",
                  },
                  {
                    key: "later" as const,
                    label: `After ${dateLabel}`,
                    sub: "Or not decided yet",
                  },
                ]
              ).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => go({ travelWindow: option.key })}
                  className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-3.5 text-left transition-colors hover:border-border-strong hover:bg-surface-sunken"
                >
                  <span
                    aria-hidden
                    className="flex size-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary"
                  >
                    <CalendarDays className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-foreground">
                      {option.label}
                    </span>
                    <span className="block text-[12px] text-muted-foreground">
                      {option.sub}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="size-4 flex-shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
