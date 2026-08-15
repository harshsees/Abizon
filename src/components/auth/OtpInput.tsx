"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * THE CODE INPUT — one real input wearing six boxes.
 * ---------------------------------------------------------------------------
 * The obvious build is six `<input>` elements with focus-juggling between them.
 * This is one input, visually transparent, stretched across six presentational
 * cells. That choice buys four things the six-input version has to reimplement
 * badly:
 *
 *   SMS AUTOFILL. iOS and Android offer to fill a code straight from the SMS,
 *     but only for a single field carrying `autocomplete="one-time-code"`. Six
 *     inputs get no offer, and on this flow that suggestion is the difference
 *     between two taps and reading a code off a notification.
 *   PASTE. Pasting `483920` fills the field, because it is a field. The
 *     six-input version needs a paste handler that splits and redistributes.
 *   SCREEN READERS. One labelled input announcing "Verification code" rather
 *     than six unlabelled boxes announcing "edit text, blank" six times.
 *   KEYBOARD. Arrows, home/end, shift-select, undo and backspace all work,
 *     because none of them were reimplemented.
 *
 * The cells below are therefore decoration. They render `value[i]` and a fake
 * caret; they never hold state.
 *
 * ANIMATION SEAM. The per-cell classes are the intended attachment point —
 * each cell carries `data-filled`, `data-active` and `data-invalid`, so motion
 * can be driven off attribute selectors or by mapping over `cells` with a
 * motion component, without touching the input logic.
 */

export type OtpInputProps = {
  length?: number;
  name: string;
  value: string;
  onChange: (value: string) => void;
  /** Fired when the last digit lands, so the form can submit itself. */
  onComplete?: () => void;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  "aria-describedby"?: string;
  id?: string;
};

export function OtpInput({
  length = 6,
  name,
  value,
  onChange,
  onComplete,
  invalid = false,
  disabled = false,
  autoFocus = false,
  id,
  ...aria
}: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  // Guards against firing completion repeatedly while the field sits full —
  // a re-render on an unrelated state change must not resubmit the form.
  const completedFor = useRef<string | null>(null);

  useEffect(() => {
    if (value.length === length && completedFor.current !== value) {
      completedFor.current = value;
      onComplete?.();
    }
    if (value.length < length) completedFor.current = null;
  }, [value, length, onComplete]);

  const cells = Array.from({ length }, (_, index) => index);

  // With the field full, the caret sits on the last cell rather than past the
  // end, so there is always exactly one highlighted box.
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div
      className="relative"
      // A click anywhere on the row focuses the real field. Without this,
      // clicking a cell does nothing, because the cells are not inputs.
      onMouseDown={(event) => {
        event.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <input
        ref={inputRef}
        id={id}
        name={name}
        value={value}
        onChange={(event) => {
          // Digits only, and never longer than the code. Applied here rather
          // than with a pattern so that pasting "483 920" or "code: 483920"
          // still lands correctly.
          const next = event.target.value.replace(/\D/g, "").slice(0, length);
          onChange(next);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        autoFocus={autoFocus}
        // `one-time-code` is what triggers the OS autofill offer.
        autoComplete="one-time-code"
        // `numeric` gives the phone keypad without the tel keyboard's
        // punctuation keys, none of which belong in a numeric code.
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={length}
        aria-invalid={invalid || undefined}
        {...aria}
        className={cn(
          "absolute inset-0 h-full w-full opacity-0",
          // The real caret would show through the transparent field and sit in
          // the wrong place; the cells draw their own.
          "caret-transparent",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        )}
      />

      <div className="pointer-events-none flex items-center justify-between gap-2 sm:gap-3">
        {cells.map((index) => {
          const char = value[index] ?? "";
          const isActive = focused && index === activeIndex && !disabled;

          return (
            <div
              key={index}
              data-filled={char ? "" : undefined}
              data-active={isActive ? "" : undefined}
              data-invalid={invalid ? "" : undefined}
              className={cn(
                "flex h-14 flex-1 items-center justify-center rounded-md border bg-surface",
                "text-xl font-black tabular-nums text-foreground sm:h-16 sm:text-2xl",
                "transition-[border-color,box-shadow,background-color] duration-[--duration-fast] ease-[--ease-out]",
                char ? "border-border-strong" : "border-input",
                isActive && "border-primary shadow-[0_0_0_3px_var(--color-primary-subtle)]",
                invalid && "border-destructive",
                disabled && "bg-surface-sunken opacity-60",
              )}
            >
              {char || (
                <span
                  className={cn(
                    "block h-6 w-px bg-primary",
                    // The caret only blinks on the cell being typed into.
                    isActive ? "animate-caret-blink" : "opacity-0",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
