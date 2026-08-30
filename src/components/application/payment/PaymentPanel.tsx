"use client";

/**
 * THE PAYMENT SCREEN.
 *
 * All of the UI, none of the wiring. Every figure it shows and the one action
 * it can take arrive as props, which is what lets the same component render
 * inside the application flow (`PaymentStep`) and on its own in the dev preview
 * without either being a special case of the other.
 *
 * THE SHAPE, AND WHERE IT DIFFERS FROM THE SOURCE DESIGN.
 *
 * The design is a two-panel checkout: methods and the form on the left, a
 * summary on the right with the card tucked inside a "Payment method"
 * accordion. This flow already has that right-hand column — the sticky
 * the summary panel that used to show a running total from step one, and
 * would be actively worse if a second summary appeared beside it.
 *
 * So the card moves. It goes directly above the form rather than into a panel
 * across the page, which is where it wanted to be anyway: the card mirrors what
 * is being typed, and a mirror belongs next to the thing it reflects, not four
 * hundred pixels away where checking it costs a saccade across the page. On a
 * phone the design's second column does not exist at all, and this arrangement
 * is the only one that survives the breakpoint.
 *
 * WHETHER ANY MONEY MOVES IS NOT DECIDED HERE. Two props settle it, and the
 * panel is honest under every combination of them:
 *
 *   onPay absent    the button is disabled beneath a sentence saying why. The
 *                   form still formats, validates and flips the card, because
 *                   the screen should do everything it actually can.
 *   preview         an `onPay` that no acquirer answers. The notice goes above
 *                   the form and the receipt is stamped — both unconditional,
 *                   both before a card is typed. See `paymentConfig.ts` for
 *                   why they are not optional.
 *   neither         a real gateway. Nothing is added and nothing is claimed.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CreditCard,
  Info,
  Lock,
  Smartphone,
  TriangleAlert,
  User,
} from "lucide-react";
import { useId, useState } from "react";

import {
  cardBlockingReason,
  cardDigits,
  cardLastFour,
  cvvLength,
  detectCardBrand,
  EMPTY_CARD_FIELDS,
  formatCardName,
  formatCardNumber,
  formatCvv,
  formatExpiry,
  invalidCardFields,
  type CardFields,
} from "@/lib/application/payment";
import { DURATION, EASE } from "@/lib/motion";
import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  PAYMENT_PREVIEW_NOTICE,
  PAYMENT_UNAVAILABLE_NOTICE,
  paymentMethod,
  type PaymentMethodId,
} from "@/lib/paymentConfig";
import { cn } from "@/lib/utils";

import { BrandMark, PaymentCard } from "./PaymentCard";
import { PaymentOverlay } from "./PaymentOverlay";

/** What a gateway says back. A failure must carry a reason a person can read. */
export type PaymentOutcome = { ok: true } | { ok: false; message: string };

export type PaymentPanelProps = {
  /**
   * The total, already formatted for display, or `null` where a fee component
   * is unpublished. `null` disables paying: an amount nobody has agreed is not
   * an amount anyone may be charged.
   */
  amount: string | null;
  /** Shown in place of the amount when it is `null`. */
  amountUnavailableLabel: string;
  /** What the payment is for. Appears on the receipt. */
  destination: string;
  /** Used on the receipt when the cardholder field is somehow empty. */
  fallbackName?: string;
  /**
   * Take the payment. ABSENT MEANS THERE IS NO GATEWAY, which is the shipped
   * state — the button disables itself and says so rather than pretending.
   */
  onPay?: (fields: CardFields) => Promise<PaymentOutcome>;
  /**
   * No acquirer is behind `onPay`. Renders the notice above the form and stamps
   * the receipt — the two things that keep a live-but-unwired checkout from
   * reading as a real one.
   */
  preview?: boolean;
  /** Where to go once a payment has settled. */
  onComplete: () => void;
  onBack?: () => void;
  /** An extra block under the method tabs. The dev preview puts its warning here. */
  notice?: React.ReactNode;
};

const METHOD_ICONS: Record<PaymentMethodId, typeof CreditCard> = {
  card: CreditCard,
  upi: Smartphone,
  netbanking: Building2,
};

type Phase = "idle" | "authorising" | "settled";

export function PaymentPanel({
  amount,
  amountUnavailableLabel,
  destination,
  fallbackName,
  onPay,
  preview = false,
  onComplete,
  onBack,
  notice,
}: PaymentPanelProps) {
  const [method, setMethod] = useState<PaymentMethodId>(DEFAULT_PAYMENT_METHOD);
  const [fields, setFields] = useState<CardFields>(EMPTY_CARD_FIELDS);
  const [saveCard, setSaveCard] = useState(false);

  /**
   * Turning the card over is driven by focus, not by a control, because the
   * question "where is my CVV" is answered by showing the applicant the side it
   * is printed on at the moment they are asked for it.
   */
  const [showingBack, setShowingBack] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [settledAt, setSettledAt] = useState<Date | null>(null);
  /**
   * Errors are raised on submit, never while typing. A field that goes red on
   * the fourth of sixteen digits is telling the applicant they are wrong for
   * the entire time they are right.
   */
  const [error, setError] = useState<string>();
  const [invalid, setInvalid] = useState<Set<keyof CardFields>>(new Set());

  const errorId = useId();
  const brand = detectCardBrand(cardDigits(fields.number));
  const payable = amount !== null && Boolean(onPay);

  const set = (patch: Partial<CardFields>) => {
    setFields((current) => ({ ...current, ...patch }));
    // Clearing on edit means the message describes the current contents, not
    // the contents at the moment the button was last pressed.
    if (error) setError(undefined);
    if (invalid.size) setInvalid(new Set());
  };

  const handlePay = async () => {
    const reason = cardBlockingReason(fields);
    if (reason) {
      setError(reason);
      setInvalid(invalidCardFields(fields));
      return;
    }
    if (!onPay) return;

    setError(undefined);
    setShowingBack(false);
    setPhase("authorising");

    try {
      const outcome = await onPay(fields);
      if (outcome.ok) {
        setSettledAt(new Date());
        setPhase("settled");
      } else {
        setPhase("idle");
        setError(outcome.message);
      }
    } catch {
      // A thrown gateway call is still a failed payment, and the applicant is
      // owed the same certainty as a declined one: nothing was taken.
      setPhase("idle");
      setError("We could not reach the payment provider. Nothing has been charged.");
    }
  };

  const card = (
    <PaymentCard
      number={fields.number}
      name={fields.name}
      expiry={fields.expiry}
      cvv={fields.cvv}
      brand={brand}
      flipped={showingBack && phase === "idle"}
      authorising={phase === "authorising"}
    />
  );

  return (
    <>
      <div className={cn("space-y-7", phase !== "idle" && "pointer-events-none")}>
        {/* ---------------------------------------------------------------- */}
        {/* Method                                                           */}
        {/* ---------------------------------------------------------------- */}
        <fieldset>
          <legend className="sr-only">Payment method</legend>
          <div className="grid grid-cols-3 gap-3">
            {PAYMENT_METHODS.map((option) => {
              const Icon = METHOD_ICONS[option.id];
              const active = method === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMethod(option.id)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex h-[84px] cursor-pointer flex-col justify-between rounded-xl border bg-surface p-4 text-left",
                    "transition-[border-color,background-color] duration-[--duration-fast]",
                    active
                      ? "border-accent"
                      : "border-border hover:border-border-strong",
                  )}
                >
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-6 transition-colors duration-[--duration-fast]",
                      active ? "text-accent" : "text-muted-foreground",
                    )}
                    strokeWidth={1.5}
                  />
                  <span
                    className={cn(
                      "text-[13px] font-medium",
                      active ? "text-foreground" : "text-subtle-foreground",
                    )}
                  >
                    {option.label}
                  </span>

                  {/* The radio is decorative — the button carries the state via
                      aria-pressed, and a real input here would be a second
                      focus stop for the same choice. */}
                  <span
                    aria-hidden
                    className={cn(
                      "absolute right-4 top-4 flex size-4 items-center justify-center rounded-full border transition-colors duration-[--duration-fast]",
                      active ? "border-accent bg-accent" : "border-border-strong",
                    )}
                  >
                    {active && <span className="size-1.5 rounded-full bg-white" />}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">
            {paymentMethod(method).hint}
          </p>
        </fieldset>

        {/* BEFORE THE FORM, not after it. Somebody who has already typed a card
            number and pressed pay has been misled regardless of what the page
            says underneath. */}
        {preview && (
          <div
            role="note"
            className="flex gap-3 rounded-xl border border-warning-subtle-foreground/30 bg-warning-subtle p-4"
          >
            <TriangleAlert
              aria-hidden
              className="mt-0.5 size-4 flex-shrink-0 text-warning-subtle-foreground"
            />
            <p className="text-2xs leading-relaxed text-warning-subtle-foreground">
              <span className="font-bold">No card is charged.</span>{" "}
              {PAYMENT_PREVIEW_NOTICE}
            </p>
          </div>
        )}

        {notice}

        {/* ---------------------------------------------------------------- */}
        {/* Card                                                             */}
        {/* ---------------------------------------------------------------- */}
        {method === "card" ? (
          <div className="space-y-7">
            {/* The scene keeps its height whichever face is showing, so the
                form below does not jump when the card turns over. */}
            <div className="pay-scene mx-auto h-[210px] w-full max-w-[380px]">
              <motion.div
                layoutId="payment-card"
                className="h-full w-full drop-shadow-[0_12px_28px_rgba(15,23,42,0.18)]"
              >
                {card}
              </motion.div>
            </div>

            <div className="space-y-5">
              <Field
                label="Card number"
                icon={CreditCard}
                value={fields.number}
                onChange={(value) => set({ number: formatCardNumber(value) })}
                onFocus={() => setShowingBack(false)}
                invalid={invalid.has("number")}
                describedBy={error ? errorId : undefined}
                inputMode="numeric"
                autoComplete="cc-number"
                // The same mark the card shows, so the brand is never presented
                // two different ways on one screen.
                trailing={brand ? <BrandMark brand={brand} className="text-accent" /> : null}
              />

              <Field
                label="Name on card"
                icon={User}
                value={fields.name}
                onChange={(value) => set({ name: formatCardName(value) })}
                onFocus={() => setShowingBack(false)}
                invalid={invalid.has("name")}
                describedBy={error ? errorId : undefined}
                autoComplete="cc-name"
                autoCapitalize="characters"
              />

              <div className="flex gap-4">
                <Field
                  label="Expiry"
                  value={fields.expiry}
                  onChange={(value) => set({ expiry: formatExpiry(value) })}
                  onFocus={() => setShowingBack(false)}
                  invalid={invalid.has("expiry")}
                  describedBy={error ? errorId : undefined}
                  inputMode="numeric"
                  autoComplete="cc-exp"
                />
                <Field
                  label="Security code"
                  icon={Lock}
                  value={fields.cvv}
                  onChange={(value) => {
                    const next = formatCvv(value, brand);
                    set({ cvv: next });
                    // Turn back once the code is complete, so the applicant
                    // sees the number they just finished typing.
                    if (next.length === cvvLength(brand)) setShowingBack(false);
                  }}
                  onFocus={() => setShowingBack(true)}
                  invalid={invalid.has("cvv")}
                  describedBy={error ? errorId : undefined}
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  masked
                />
              </div>

              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(event) => setSaveCard(event.target.checked)}
                  className="size-4 cursor-pointer rounded border-border-strong accent-[var(--color-accent)]"
                />
                <span className="text-2xs text-muted-foreground">
                  Save this card for next time
                </span>
              </label>
            </div>
          </div>
        ) : (
          <MethodComingSoon method={method} />
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Errors and the action                                            */}
        {/* ---------------------------------------------------------------- */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="rounded-xl border border-destructive-subtle-foreground/25 bg-destructive-subtle px-4 py-3 text-2xs font-medium text-destructive-subtle-foreground"
          >
            {error}
          </p>
        )}

        {!onPay && (
          <div className="flex gap-3 rounded-xl border border-border bg-surface-sunken p-4">
            <Info
              aria-hidden
              className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground"
            />
            <p className="text-2xs leading-relaxed text-muted-foreground">
              <span className="font-bold text-foreground">
                Nothing will be charged.
              </span>{" "}
              {PAYMENT_UNAVAILABLE_NOTICE}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-12 cursor-pointer items-center rounded-full border border-border-strong bg-surface px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken sm:h-11"
            >
              Back
            </button>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={() => void handlePay()}
            disabled={!payable || method !== "card"}
            className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-subtle-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transform-none sm:h-11 sm:flex-none"
          >
            <Lock aria-hidden className="size-3.5" />
            {amount === null ? amountUnavailableLabel : `Pay ${amount}`}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {phase !== "idle" && (
          <PaymentOverlay
            phase={phase === "settled" ? "settled" : "authorising"}
            card={card}
            preview={preview}
            onDone={onComplete}
            receipt={{
              amount: amount ?? amountUnavailableLabel,
              name: fields.name.trim() || fallbackName || "Cardholder",
              destination,
              lastFour: cardLastFour(fields.number),
              at: settledAt ?? new Date(),
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * A field with the label that rises out of it.
 *
 * The label starts inside the input and moves onto the border once there is
 * something to label — so the field reads as a labelled box at rest and keeps
 * its label visible while being filled, which a placeholder cannot do. It is
 * driven entirely by `:placeholder-shown` against a single-space placeholder,
 * so there is no "has content" state in React to keep in step with the DOM.
 *
 * `masked` renders the security code as a password field. It is the one value
 * here worth hiding from somebody standing behind the applicant, and the card
 * beside it shows the length so nothing is lost by doing so.
 */
function Field({
  label,
  icon: Icon,
  value,
  onChange,
  onFocus,
  invalid = false,
  describedBy,
  trailing,
  masked = false,
  ...input
}: {
  label: string;
  icon?: typeof CreditCard;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  invalid?: boolean;
  describedBy?: string;
  trailing?: React.ReactNode;
  masked?: boolean;
} & Pick<
  React.InputHTMLAttributes<HTMLInputElement>,
  "inputMode" | "autoComplete" | "autoCapitalize"
>) {
  const id = useId();

  return (
    <div className="relative flex-1">
      <input
        {...input}
        id={id}
        type={masked ? "password" : "text"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        // Always a single space, never a real hint. The label rests inside the
        // input until there is something in it, so an actual placeholder would
        // be printed underneath it — which is exactly what "MM / YY" on the
        // expiry field did, rendering as "Expiry `Y". `formatExpiry` inserts
        // the separator as the applicant types, so the format shows itself.
        placeholder=" "
        // No focus ring of its own. `globals.css` puts one amber outline on
        // every interactive element in the app for WCAG 2.4.7, and adding a
        // second blue one here produced two concentric rings around one field.
        // The border colour is the only focus affordance this adds.
        className={cn(
          "peer h-[52px] w-full rounded-xl border bg-transparent px-4 text-sm text-foreground",
          "transition-[border-color] duration-[--duration-fast]",
          "focus:border-accent",
          Icon && "pl-11",
          trailing && "pr-24",
          invalid
            ? "animate-pay-shake border-destructive"
            : "border-input",
        )}
      />

      {Icon && (
        <Icon
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground transition-colors duration-[--duration-fast] peer-focus:text-accent"
          strokeWidth={1.75}
        />
      )}

      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 bg-surface px-1.5 text-sm text-muted-foreground",
          "transition-[top,font-size,color] duration-[--duration-fast] ease-[--ease-out]",
          Icon ? "left-[38px]" : "left-2.5",
          // Risen: focused, or holding a value. `:not(:placeholder-shown)` is
          // the DOM's own answer to "is there anything in here".
          "peer-focus:top-0 peer-focus:text-[11px] peer-focus:text-accent",
          "peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[11px]",
          Icon && "peer-focus:left-2.5 peer-[:not(:placeholder-shown)]:left-2.5",
        )}
      >
        {label}
      </label>

      {trailing && (
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
          {trailing}
        </span>
      )}
    </div>
  );
}

/**
 * A method with no form behind it yet.
 *
 * Only the card form was designed, and inventing a UPI flow now would mean
 * throwing it away the moment a gateway supplies its own — every provider ships
 * its own collect/intent screens. So the tab is selectable, says plainly what
 * it is waiting for, and does not pretend to be a step.
 */
function MethodComingSoon({ method }: { method: PaymentMethodId }) {
  const { label } = paymentMethod(method);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION.base, ease: EASE.out }}
      className="rounded-xl border border-dashed border-border-strong bg-surface-sunken px-5 py-8 text-center"
    >
      <p className="text-sm font-semibold text-foreground">
        {label} is not connected yet
      </p>
      <p className="mx-auto mt-1.5 max-w-sm text-2xs leading-relaxed text-muted-foreground">
        It arrives with the payment provider, which will supply its own screens
        for this. Use a card, or settle the fee with us directly.
      </p>
    </motion.div>
  );
}
