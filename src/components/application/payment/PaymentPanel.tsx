"use client";

/**
 * THE PAYMENT SCREEN.
 *
 * All of the UI, none of the wiring. Every figure it shows and the one action
 * it can take arrive as props, which is what lets the same component render
 * inside the application flow (`PaymentStep`) and on its own in the dev preview
 * without either being a special case of the other.
 *
 * ── THE SHAPE ──
 *
 * Two columns, and which half holds what is the whole layout decision:
 *
 *     LEFT    the card, and the one figure that matters — what is being paid,
 *             for what. It is the OBJECT of the transaction, and it is the
 *             half that does not change while the applicant works.
 *     RIGHT   the method, the fields, the button. Everything that is operated.
 *
 * An earlier build stacked the card directly above the form in a 560px column,
 * on the reasoning that a mirror belongs next to the thing it reflects. It
 * does — but "above" is not "next to" on a screen 1400px wide, and stacking
 * meant that by the time the applicant reached the security code the card had
 * scrolled off the top, which is precisely when it is most useful. Side by
 * side, the card is level with the fields it mirrors and stays there.
 *
 * The card column is `lg:sticky`, so on a short viewport the form scrolls past
 * a card that stays put. Below `lg` the two columns become one and the card
 * goes back on top, where it is still the first thing seen and no longer has a
 * column to be beside.
 *
 * ── THE METHOD TABS ──
 *
 * Three equal cards with a radio in the corner is what the source design has,
 * and it is a form control drawn as furniture: 84px tall each, a quarter of
 * the panel's height spent on a choice most people do not make. What every
 * payment provider ships instead is a segmented row — the methods sit on one
 * track, the selected one lifts onto the surface, and the marks of what is
 * accepted sit under it. That is what is here.
 *
 * ── WHETHER ANY MONEY MOVES IS NOT DECIDED HERE ──
 *
 * Two props settle it:
 *
 *   onPay absent    the button is disabled beneath a sentence saying why. The
 *                   form still formats, validates and flips the card, because
 *                   the screen should do everything it actually can.
 *   preview         an `onPay` that no acquirer answers.
 *   neither         a real gateway.
 *
 * THE PREVIEW BANNER THAT USED TO SIT ABOVE THE FORM, and the stamp across the
 * receipt, have been removed at the product owner's request. `paymentConfig.ts`
 * still holds both strings and still argues for them, and
 * `paymentConfig.test.ts` still checks they are worded to carry the disclosure
 * — so putting them back is rendering two constants that already exist, in the
 * two places named in that file's header. Nothing else was built on their
 * absence.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  Building2,
  CreditCard,
  Info,
  Lock,
  ShieldCheck,
  Smartphone,
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
  PAYMENT_UNAVAILABLE_NOTICE,
  paymentMethod,
  type PaymentMethodId,
} from "@/lib/paymentConfig";
import { cn } from "@/lib/utils";

import { BrandMark, PaymentCard } from "./PaymentCard";
import { PaymentOverlay } from "./PaymentOverlay";
import type { ReceiptLine } from "./ReceiptPrinter";

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
  /** What the payment is for. Appears on the receipt and in the left column. */
  destination: string;
  /**
   * THE RECEIPT'S PRICED ROWS, already formatted and already multiplied by
   * party size — the caller reads them off `summary.fees`, which is the same
   * model the sticky price aside reads. Passed in rather than derived here for
   * the reason §16 gives: a component that showed a price it had computed
   * itself would be a second answer to what this application costs.
   *
   * Empty is a legitimate answer. A destination whose Abizon fee is unpublished
   * has no breakdown to print, and the paper prints the total alone.
   */
  receiptLines?: ReceiptLine[];
  /** Everything before tax, formatted. Omit where there is no tax row. */
  receiptSubtotal?: string;
  /** The tax row. Its label carries the rate, so it travels as a pair. */
  receiptTax?: ReceiptLine;
  /** Used on the receipt when the cardholder field is somehow empty. */
  fallbackName?: string;
  /**
   * Take the payment. ABSENT MEANS THERE IS NO GATEWAY, which is the shipped
   * state — the button disables itself and says so rather than pretending.
   */
  onPay?: (fields: CardFields) => Promise<PaymentOutcome>;
  /** No acquirer is behind `onPay`. */
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
  receiptLines,
  receiptSubtotal,
  receiptTax,
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
      <div
        className={cn(
          "grid grid-cols-1 gap-10 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-14",
          phase !== "idle" && "pointer-events-none",
        )}
      >
        {/* ================================================================ */}
        {/* LEFT — the card, and what is being paid                          */}
        {/* ================================================================ */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          {/* The scene keeps its height whichever face is showing, so nothing
              below it jumps when the card turns over. */}
          <div className="pay-scene mx-auto h-[228px] w-full max-w-[400px]">
            <motion.div
              layoutId="payment-card"
              className="h-full w-full drop-shadow-[0_18px_40px_rgba(15,23,42,0.22)]"
            >
              {card}
            </motion.div>
          </div>

          {/* WHAT IS BEING PAID, under the card rather than in a third column.
              This flow has one line item and one total; a full order summary
              with a subtotal, a fee row and a rule between them would be a
              table with a single row in it. */}
          <dl className="mx-auto mt-8 w-full max-w-[400px] space-y-3.5">
            <div className="flex items-baseline justify-between gap-6">
              <dt className="text-2xs uppercase tracking-[0.09em] text-muted-foreground">
                Paying for
              </dt>
              <dd className="text-right text-sm font-medium text-foreground">
                {destination}
              </dd>
            </div>

            <div className="flex items-baseline justify-between gap-6 border-t border-border pt-3.5">
              <dt className="text-2xs uppercase tracking-[0.09em] text-muted-foreground">
                Total
              </dt>
              <dd
                data-numeric
                className="text-right text-xl font-bold tracking-tight text-foreground"
              >
                {amount ?? amountUnavailableLabel}
              </dd>
            </div>
          </dl>

          {/* The two marks the reference recording sets under its card. They
              are claims about how the details travel, so each is worded to be
              true of what this app actually does: the page is served over TLS
              (see the HSTS header in `next.config.ts`), and the card fields
              are handed to the provider rather than stored here — which is
              what makes the scope question moot rather than what makes it
              certified. Neither says "certified", because nothing here has
              been. */}
          <ul className="mx-auto mt-5 flex w-full max-w-[400px] flex-wrap items-center gap-x-5 gap-y-2 text-2xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <Lock aria-hidden className="size-3.5 flex-shrink-0" />
              Sent over an encrypted connection
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldCheck aria-hidden className="size-3.5 flex-shrink-0" />
              Card details never stored by Abizon
            </li>
          </ul>
        </aside>

        {/* ================================================================ */}
        {/* RIGHT — everything that is operated                              */}
        {/* ================================================================ */}
        <div className="space-y-7">
          <MethodTabs method={method} onChange={setMethod} />

          {notice}

          {method === "card" ? (
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

              <label className="flex cursor-pointer items-center gap-2.5 pt-0.5">
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
          ) : (
            <MethodComingSoon method={method} />
          )}

          {error && (
            <p
              id={errorId}
              role="alert"
              className="rounded-xl border border-destructive-subtle-foreground/25 bg-destructive-subtle px-4 py-3 text-2xs font-medium text-destructive-subtle-foreground"
            >
              {error}
            </p>
          )}

          {/* UNREACHABLE IN THE SHIPPED FLOW — `PaymentStep` always supplies an
              `onPay`. It is kept for the dev preview and for the day the
              gateway prop is threaded from configuration, because the
              alternative to a sentence here is a dead button with nothing
              beside it. */}
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
                className="inline-flex h-12 cursor-pointer items-center rounded-full border border-border-strong bg-surface px-6 text-sm font-semibold text-foreground transition-colors hover:bg-surface-sunken"
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
              className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-foreground px-8 text-sm font-bold text-background shadow-e2 transition-[background-color,transform] duration-[--duration-fast] hover:bg-subtle-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 motion-reduce:transform-none sm:flex-none"
            >
              <Lock aria-hidden className="size-3.5" />
              {amount === null ? amountUnavailableLabel : `Pay ${amount}`}
            </button>
          </div>
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
              lines: receiptLines ?? [],
              subtotal: receiptSubtotal,
              tax: receiptTax,
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * THE METHOD SWITCHER.
 *
 * A segmented track: three equal buttons on a sunken rail, the selected one
 * lifted onto the surface with a shadow. It is the control every payment
 * provider ships, and it is the same component this codebase already uses for
 * the capture screens' Live / Upload switch, so the flow does not have two
 * unrelated ways of drawing the same decision.
 *
 * WHAT IT REPLACES: three 84px cards with a radio dot in each corner. Those
 * were the source design's, and they read as a form question — three things to
 * consider — rather than as a tab bar. The choice is between three words; it
 * does not need a quarter of the panel.
 *
 * The marks underneath are the schemes actually accepted, drawn small and set
 * in the muted ink so they read as a footnote to the tab rather than as three
 * more things to press. They only appear under Card, because they are only
 * true of Card.
 */
function MethodTabs({
  method,
  onChange,
}: {
  method: PaymentMethodId;
  onChange: (method: PaymentMethodId) => void;
}) {
  return (
    <fieldset>
      <legend className="sr-only">Payment method</legend>

      <div
        role="group"
        aria-label="Payment method"
        className="flex items-center gap-1 rounded-full bg-surface-sunken p-1"
      >
        {PAYMENT_METHODS.map((option) => {
          const Icon = METHOD_ICONS[option.id];
          const active = method === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={active}
              className={cn(
                "flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full px-3 text-[13px] font-semibold",
                "transition-[background-color,color,box-shadow] duration-[--duration-fast] ease-[--ease-out]",
                active
                  ? "bg-surface text-foreground shadow-e1"
                  : "text-subtle-foreground hover:text-foreground",
              )}
            >
              <Icon
                aria-hidden
                className={cn("size-4", active ? "text-accent" : "text-muted-foreground")}
                strokeWidth={1.75}
              />
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-2xs leading-relaxed text-muted-foreground">
          {paymentMethod(method).hint}
        </p>

        {method === "card" && (
          <span
            aria-label="Visa, Mastercard and RuPay accepted"
            className="flex flex-shrink-0 items-center gap-2.5 opacity-70"
          >
            <BrandMark brand="visa" className="text-[13px] text-subtle-foreground" />
            <BrandMark brand="mastercard" />
            <span className="text-[11px] font-extrabold italic tracking-wide text-subtle-foreground">
              RuPay
            </span>
          </span>
        )}
      </div>
    </fieldset>
  );
}

/* -------------------------------------------------------------------------- */

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
      className="rounded-xl border border-dashed border-border-strong bg-surface-sunken px-5 py-10 text-center"
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
