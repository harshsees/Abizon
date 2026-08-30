"use client";

/**
 * REVIEW PASSPORT DETAILS
 * ---------------------------------------------------------------------------
 * The last screen of the passport sub-flow: the pages on the left, the values
 * read off them on the right, and one button.
 *
 * ── Why the images stay on screen ──
 *
 * This is the only screen in the flow where a mistake is expensive and silent.
 * A transposed passport number is not caught by anything downstream — it is
 * caught by the government, weeks later, as a refusal. So the page the number
 * was read from sits beside the number, full size, and the applicant checks one
 * against the other without navigating anywhere. The step this replaces
 * (`ApplicantDetailsStep`) put the same fields on a screen with no passport on
 * it at all, and asked people to proof-read from memory.
 *
 * ── The fields are the ones this product actually stores ──
 *
 * The reference asks for FIRST NAME, LAST NAME, FATHER'S NAME and MOTHER'S
 * NAME. This asks for the full name as printed, because that is what
 * `travellers.full_name` holds and the schema says why: the passport is the
 * authority on where a name divides, and splitting it here would mean guessing.
 * Parents' names are not collected by this product at all — there is no column
 * for them and no destination in the dataset that asks — so there are no boxes
 * for them. Two columns, same rhythm, real fields.
 *
 * ── The countdown ──
 *
 * When every value verified against its check digit, the button counts itself
 * down from five and then continues. That is the reference's behaviour and it
 * is defensible precisely because it is bounded to the verified case: the MRZ's
 * check digits agreed, so the risk of an unnoticed error is as low as it gets,
 * and the applicant who wants to read anyway has "Continue reviewing" sitting
 * under the button — which cancels it permanently, not for one tick. Any
 * keystroke cancels it too. Nothing auto-advances a form somebody is typing in.
 */

import { ArrowRight, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { ContactDetails, TravellerDetails } from "@/lib/application/state";

import { ApplyBack } from "../ApplyChrome";

const AUTO_CONTINUE_SECONDS = 5;

type ReviewField = {
  key: keyof TravellerDetails;
  label: string;
  type?: "text" | "date";
  options?: string[];
  required?: boolean;
  /** Spans both columns. */
  wide?: boolean;
};

const FIELDS: ReviewField[] = [
  { key: "fullName", label: "Full name, as printed", required: true, wide: true },
  { key: "dateOfBirth", label: "Date of birth", type: "date", required: true },
  { key: "gender", label: "Gender", options: ["Male", "Female", "Other"], required: true },
  { key: "passportNumber", label: "Passport number", required: true },
  { key: "passportExpiry", label: "Passport valid till", type: "date", required: true },
  { key: "nationality", label: "Nationality", required: true },
];

export function PassportReview({
  travellerName,
  photoPageUrl,
  backPageUrl,
  details,
  contact,
  verified,
  onDetailsChange,
  onContactChange,
  onEditImage,
  onContinue,
  onBack,
  onClose,
  canContinue,
}: {
  travellerName: string;
  photoPageUrl?: string;
  backPageUrl?: string;
  details: TravellerDetails;
  contact: ContactDetails;
  /** The MRZ read and every check digit agreed. Gates the countdown only. */
  verified: boolean;
  onDetailsChange: (patch: Partial<TravellerDetails>) => void;
  onContactChange: (patch: Partial<ContactDetails>) => void;
  onEditImage: (face: "photo" | "back") => void;
  onContinue: () => void;
  /** Back to the page that produced these values. */
  onBack: () => void;
  /** Out of the passport errand entirely, to the document list. */
  onClose: () => void;
  canContinue: boolean;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const cancelled = useRef(false);

  // Arm once, and only on a clean read of a complete form.
  useEffect(() => {
    if (cancelled.current || !verified || !canContinue) return;
    setRemaining((current) => (current === null ? AUTO_CONTINUE_SECONDS : current));
  }, [verified, canContinue]);

  useEffect(() => {
    if (remaining === null) return;
    if (remaining <= 0) {
      onContinue();
      return;
    }
    const id = setTimeout(() => setRemaining((value) => (value ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onContinue]);

  /** Any edit stops the clock, for good. */
  const stopCountdown = () => {
    cancelled.current = true;
    setRemaining(null);
  };

  const counting = remaining !== null && remaining > 0;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 pb-24 pt-20 md:px-8 md:pt-24">
      {/* The same two controls every other screen in the errand carries, in
          the same two places. A screen that drops them is a screen the
          applicant has to scroll to work out how to leave. */}
      <ApplyBack onClick={onBack} />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close and go back to your documents"
        className="fixed right-4 top-4 z-raised flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-subtle-foreground transition-colors duration-[--duration-fast] hover:bg-surface-sunken hover:text-foreground md:right-6 md:top-6"
      >
        <X aria-hidden className="size-4" />
      </button>

      <h1 className="font-serif text-[30px] font-medium leading-tight tracking-[-0.01em] text-foreground md:text-[36px]">
        Review passport details
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Read from {travellerName ? `${travellerName}'s` : "the"} passport. Check
        every value against the page beside it — a single wrong character is the
        most common reason an application comes back.
      </p>

      <div className="mt-9 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)] lg:gap-14">
        {/* ---------------------------------------------------------------
            The pages.
            --------------------------------------------------------------- */}
        <div className="space-y-4 rounded-2xl border border-dashed border-border-strong p-4">
          {(
            [
              { face: "photo" as const, url: photoPageUrl, label: "Photo page" },
              { face: "back" as const, url: backPageUrl, label: "Back page" },
            ] satisfies Array<{ face: "photo" | "back"; url?: string; label: string }>
          ).map(({ face, url, label }) =>
            url ? (
              <figure key={face} className="relative overflow-hidden rounded-xl shadow-e1">
                {/* eslint-disable-next-line @next/next/no-img-element -- a blob:
                    URL for a file chosen in this tab. */}
                <img src={url} alt={`Your passport ${label.toLowerCase()}`} className="block w-full" />
                <button
                  type="button"
                  onClick={() => onEditImage(face)}
                  aria-label={`Replace the ${label.toLowerCase()}`}
                  className="absolute bottom-2.5 right-2.5 flex size-8 cursor-pointer items-center justify-center rounded-lg bg-surface/95 text-primary shadow-e2 transition-colors hover:bg-surface"
                >
                  <Pencil aria-hidden className="size-3.5" />
                </button>
              </figure>
            ) : (
              <button
                key={face}
                type="button"
                onClick={() => onEditImage(face)}
                className="flex h-28 w-full cursor-pointer items-center justify-center rounded-xl border border-dashed border-border-strong bg-surface-sunken text-2xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
              >
                Add the {label.toLowerCase()}
              </button>
            ),
          )}
        </div>

        {/* ---------------------------------------------------------------
            The values.
            --------------------------------------------------------------- */}
        <div>
          <div className="grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <RuledField
                key={field.key}
                field={field}
                value={details[field.key]}
                onChange={(value) => {
                  stopCountdown();
                  onDetailsChange({ [field.key]: value } as Partial<TravellerDetails>);
                }}
              />
            ))}
          </div>

          <div className="mt-11">
            <h2 className="text-base font-bold text-foreground">Contact details</h2>
            <p className="mt-1 text-2xs text-muted-foreground">
              Where the decision and any request for more documents will reach
              you.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-7 sm:grid-cols-2">
              <RuledField
                field={{ key: "fullName", label: "Email address", required: true }}
                inputType="email"
                value={contact.email}
                onChange={(value) => {
                  stopCountdown();
                  onContactChange({ email: value });
                }}
              />
              <RuledField
                field={{ key: "fullName", label: "Phone number", required: true }}
                inputType="tel"
                value={contact.phone}
                onChange={(value) => {
                  stopCountdown();
                  onContactChange({ phone: value });
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={onContinue}
            disabled={!canContinue}
            className="group relative mt-11 flex h-[54px] w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl bg-foreground text-base font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] ease-[--ease-out] hover:bg-subtle-foreground active:scale-[0.99] disabled:cursor-default disabled:bg-muted-foreground/60 disabled:shadow-none motion-reduce:transform-none"
          >
            {/* The countdown, drawn as the button filling rather than as a
                number alone — a bare "(3)" beside a label reads as a quantity
                of something, not as time running out. */}
            {counting && (
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 bg-subtle-foreground transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                style={{
                  width: `${((AUTO_CONTINUE_SECONDS - (remaining ?? 0)) / AUTO_CONTINUE_SECONDS) * 100}%`,
                }}
              />
            )}
            <span className="relative flex items-center gap-2">
              Continue
              {counting && ` (${remaining})`}
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-[--duration-fast] group-enabled:group-hover:translate-x-1 motion-reduce:transition-none"
              />
            </span>
          </button>

          {counting && (
            <button
              type="button"
              onClick={stopCountdown}
              className="mx-auto mt-3 block cursor-pointer text-2xs font-semibold text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            >
              Continue reviewing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * A label over a value over a rule.
 *
 * No box. The reference's form is a grid of ruled lines, and it works here for
 * the same reason it works there: these are values that have been READ for you,
 * and a bordered input invites you to fill in an empty box. A ruled line
 * presents a filled-in one and invites you to check it.
 */
function RuledField({
  field,
  value,
  onChange,
  inputType,
}: {
  field: ReviewField;
  value: string;
  onChange: (value: string) => void;
  inputType?: React.HTMLInputTypeAttribute;
}) {
  /**
   * Nothing is marked wrong until it has been visited and left.
   *
   * Every required field is empty when this screen opens after a scan that
   * failed to read anything, so marking on emptiness alone paints the form red
   * before the applicant has typed a character — which reads as "you have made
   * six mistakes" rather than "there are six things to fill in". The asterisks
   * say what is required; the disabled Continue says the form is not done yet.
   */
  const [visited, setVisited] = useState(false);
  const empty = value.trim().length === 0;
  const invalid = visited && empty && Boolean(field.required);

  return (
    <label className={field.wide ? "sm:col-span-2" : undefined}>
      <span className="block text-[11px] font-bold uppercase tracking-[0.07em] text-subtle-foreground">
        {field.label}
        {field.required && <span className="text-destructive"> *</span>}
      </span>

      {field.options ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mt-2.5 h-9 w-full cursor-pointer appearance-none border-b border-border bg-transparent text-[15px] font-medium text-foreground outline-none transition-colors focus:border-primary"
        >
          <option value="">Select</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={inputType ?? field.type ?? "text"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => setVisited(true)}
          aria-invalid={invalid || undefined}
          className="mt-2.5 h-9 w-full border-b border-border bg-transparent text-[15px] font-medium text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary aria-[invalid=true]:border-destructive/60"
        />
      )}
    </label>
  );
}
