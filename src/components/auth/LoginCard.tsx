"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, MessageSquare, Pencil, ShieldCheck } from "lucide-react";

import { loginAction } from "@/app/actions/auth";
import { INITIAL_LOGIN_STATE, type LoginState } from "@/lib/auth/loginState";
import { OtpInput } from "@/components/auth/OtpInput";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { CALLING_CODES, DEFAULT_ISO, formatE164 } from "@/lib/auth/phone";
import { cn } from "@/lib/utils";

/**
 * THE LOGIN CARD — two steps, one server-owned state.
 * ---------------------------------------------------------------------------
 * Which step is on screen is read from `state.step`, which only the server
 * sets. The client cannot advance itself to the code step, because advancing
 * means an SMS was accepted for delivery and only the server knows that. This
 * is why a failed send leaves the applicant on the phone step with the number
 * still in the box, rather than on a code screen waiting for a message that was
 * never sent.
 *
 * THREE FORMS, ONE ACTION. Verify, resend and change-number are separate
 * `<form>` elements sharing the one `formAction` from `useActionState`, so they
 * all resolve into the same state. The alternative — one form with a mutable
 * hidden `intent` — races: setting React state in a button's `onClick` does not
 * reach the DOM before the submit event that follows it in the same dispatch,
 * so the wrong intent gets posted. Forms cannot nest, so they are siblings.
 */

export type LoginCardProps = {
  /** Where to send the applicant after a successful sign-in. */
  next?: string;
  /** Development-only notice that the SMS driver is not really sending. */
  delivery: { delivers: boolean; driver: string; ttlMinutes: number };
};

export function LoginCard({ next, delivery }: LoginCardProps) {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_LOGIN_STATE);

  return (
    <div className="w-full max-w-md">
      <div className="rounded-card border border-border bg-surface p-6 shadow-e2 sm:p-8">
        {state.step === "phone" ? (
          <PhoneStep state={state} formAction={formAction} pending={pending} />
        ) : (
          <CodeStep
            /**
             * Remounting is how the typed digits get cleared, rather than an
             * effect that calls `setCode("")` when one of these changes —
             * which is the "derive state from props" antipattern, and which
             * React flags as a cascading render.
             *
             * The key changes on a new challenge, on a resend, and on a
             * rejected attempt. All three mean the digits on screen are now
             * wrong and must not be auto-submitted back at the server. The
             * remount also re-fires `autoFocus`, putting the caret back in the
             * field, which is where it should be after an error anyway.
             */
            key={`${state.challengeId}:${state.resendAvailableAt}:${state.error ?? ""}`}
            state={state}
            formAction={formAction}
            pending={pending}
            next={next}
            ttlMinutes={delivery.ttlMinutes}
          />
        )}
      </div>

      {!delivery.delivers ? (
        <p className="mt-4 rounded-md border border-dashed border-border bg-surface-sunken px-4 py-3 text-2xs leading-relaxed text-muted-foreground">
          <span className="font-bold text-foreground">No SMS is being sent.</span>{" "}
          The <code className="font-mono">{delivery.driver}</code> driver is active — your
          code is printed in the terminal running <code className="font-mono">npm run dev</code>.
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — the number                                                        */
/* -------------------------------------------------------------------------- */

function PhoneStep({
  state,
  formAction,
  pending,
}: {
  state: Extract<LoginState, { step: "phone" }>;
  formAction: (payload: FormData) => void;
  pending: boolean;
}) {
  const [iso, setIso] = useState(state.iso ?? DEFAULT_ISO);
  const country = CALLING_CODES.find((entry) => entry.iso === iso) ?? CALLING_CODES[0];

  /**
   * Whether the bot check has produced a token yet.
   *
   * Starts `false` and is raised by the widget — including immediately, and
   * synchronously enough, in the two cases where there is nothing to wait for
   * (no site key, or a widget that failed to load). See `onReadyChange`.
   *
   * `useCallback` because it is passed to a child that lists it as an effect
   * dependency; a fresh function each render would re-run that effect on every
   * keystroke in the number field.
   */
  const [botCheckReady, setBotCheckReady] = useState(false);
  const handleReadyChange = useCallback((value: boolean) => setBotCheckReady(value), []);

  return (
    <>
      <header className="mb-6">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your mobile number is your account. We will send a {""}
          one-time code to confirm it is you.
        </p>
      </header>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="intent" value="start" />

        <Field
          label="Mobile number"
          error={state.error}
          helper="Standard SMS rates from your operator may apply."
        >
          {({ id, invalid, "aria-describedby": describedBy }) => (
            <div className="flex gap-2">
              {/* The country code is a select rather than free text so the
                  number can never be submitted with an ambiguous prefix. */}
              <select
                name="iso"
                value={iso}
                onChange={(event) => setIso(event.target.value)}
                aria-label="Country code"
                className={cn(
                  "h-11 shrink-0 rounded-md border border-input bg-surface px-2.5 text-sm",
                  "text-foreground transition-[border-color] duration-[--duration-fast]",
                  "hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2",
                  "focus-visible:outline-ring sm:h-10",
                )}
              >
                {CALLING_CODES.map((entry) => (
                  <option key={entry.iso} value={entry.iso}>
                    {entry.iso} +{entry.code}
                  </option>
                ))}
              </select>

              <Input
                id={id}
                name="national"
                type="tel"
                // `tel` keyboard here (unlike the code field) because a phone
                // number is what the OS autofill offers against this type.
                autoComplete="tel-national"
                inputMode="numeric"
                autoFocus
                defaultValue={state.national ?? ""}
                maxLength={country.nationalLength + 4}
                placeholder={"9".repeat(country.nationalLength)}
                invalid={invalid}
                aria-describedby={describedBy}
                className="flex-1 tabular-nums"
              />
            </div>
          )}
        </Field>

        {/* Renders nothing when no site key is configured, which is the same
            condition under which the server skips the check — so the widget
            cannot be missing while the server still demands a token. The reset
            key is the current error: a rejected submit spends its token, and
            resubmitting the spent one fails with a message about robots that
            has nothing to do with what went wrong. */}
        <TurnstileWidget resetKey={state.error} onReadyChange={handleReadyChange} />

        {/* Disabled until there is a token to send, and SAYING SO on its
            face rather than sitting there greyed out.

            Not `loading`: that prop hides the children behind a spinner, so
            the label explaining the wait would be invisible — which is the
            failure mode this whole fix is about. The wait is a second or two
            and the applicant is usually still typing through it. */}
        <Button
          type="submit"
          size="lg"
          block
          loading={pending}
          disabled={!botCheckReady}
        >
          {botCheckReady ? "Send code" : "Security check…"}
          <ArrowRight data-arrow className="size-4" />
        </Button>
      </form>

      {/* DPDP Act consent notice. The Act makes the purpose of collection
          something that has to be stated at the point of collection, not buried
          in a policy the applicant never opens. */}
      <p className="mt-5 text-2xs leading-relaxed text-muted-foreground">
        By continuing you agree to our{" "}
        <a href="/terms" className="font-semibold text-primary underline-offset-2 hover:underline">
          terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="font-semibold text-primary underline-offset-2 hover:underline">
          privacy policy
        </a>
        . We use your number to identify your account and to send updates about
        your application — nothing else.
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2 — the code                                                          */
/* -------------------------------------------------------------------------- */

function CodeStep({
  state,
  formAction,
  pending,
  next,
  ttlMinutes,
}: {
  state: Extract<LoginState, { step: "code" }>;
  formAction: (payload: FormData) => void;
  pending: boolean;
  next?: string;
  ttlMinutes: number;
}) {
  // Starts empty on every mount, and the parent remounts this component
  // whenever the digits need clearing — see the `key` where it is rendered.
  const [code, setCode] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const secondsToResend = useCountdown(state.resendAvailableAt);

  const dead = Boolean(state.fatal);

  return (
    <>
      <header className="mb-6">
        <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-primary-subtle text-primary-subtle-foreground">
          <MessageSquare className="size-5" aria-hidden="true" />
        </div>

        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Enter the code
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Sent to{" "}
          <span className="font-semibold tabular-nums text-foreground">
            {formatE164(state.phoneE164)}
          </span>
          . It expires in {ttlMinutes} minutes.
        </p>

        {/* Changing the number is its own form so it can post a different
            intent without racing the verify submit. */}
        <form action={formAction}>
          <input type="hidden" name="intent" value="restart" />
          <button
            type="submit"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary underline-offset-2 hover:underline"
          >
            <Pencil className="size-3" aria-hidden="true" />
            Use a different number
          </button>
        </form>
      </header>

      <form ref={formRef} action={formAction} className="space-y-5">
        <input type="hidden" name="intent" value="verify" />
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <Field
          label="Verification code"
          hideLabel
          error={state.error}
          helper={
            state.attemptsRemaining !== undefined && !state.error
              ? `${state.attemptsRemaining} attempts left.`
              : undefined
          }
        >
          {({ id, invalid, "aria-describedby": describedBy }) => (
            <OtpInput
              id={id}
              name="code"
              value={code}
              onChange={setCode}
              invalid={invalid}
              disabled={pending || dead}
              autoFocus
              aria-describedby={describedBy}
              // Submitting the moment the sixth digit lands is the whole point
              // of a six-box field — asking someone to then reach for a button
              // is a step the interface already has enough information to skip.
              onComplete={() => {
                if (!pending && !dead) formRef.current?.requestSubmit();
              }}
            />
          )}
        </Field>

        {dead ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md bg-destructive-subtle px-3.5 py-3 text-xs font-semibold text-destructive-subtle-foreground"
          >
            <AlertCircle className="mt-px size-4 shrink-0" aria-hidden="true" />
            This sign-in attempt is closed. Start again with your number.
          </p>
        ) : (
          <Button
            type="submit"
            size="lg"
            block
            loading={pending}
            disabled={code.length < 6}
          >
            Verify and continue
            <ArrowRight data-arrow className="size-4" />
          </Button>
        )}
      </form>

      {/* Resend — again a separate form, same action, same state. */}
      <form action={formAction} className="mt-5 text-center">
        <input type="hidden" name="intent" value="resend" />
        {secondsToResend > 0 ? (
          <p className="text-xs text-muted-foreground">
            Did not get it? You can ask again in{" "}
            <span className="font-bold tabular-nums text-foreground">{secondsToResend}s</span>
          </p>
        ) : (
          <button
            type="submit"
            disabled={pending}
            className="text-xs font-bold text-primary underline-offset-2 hover:underline disabled:opacity-50"
          >
            Send a new code
          </button>
        )}
      </form>

      <p className="mt-6 flex items-start gap-2 border-t border-border pt-5 text-2xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        <span>
          abizon will never ask for this code by phone, email or WhatsApp. If someone
          asks you for it, they are not us.
        </span>
      </p>
    </>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Seconds until `target`, ticking down to zero.
 *
 * The state here is the current time, not the remaining seconds, and the
 * remaining seconds are derived on render. That ordering matters twice:
 *
 *   - a new `target` (a resend pushes it 30s out) is reflected immediately,
 *     with no effect needed to copy a prop into state;
 *   - the reading comes from the wall clock rather than from counting interval
 *     ticks, so a backgrounded tab — where timers are throttled hard — shows
 *     the true remaining time on return instead of however far a starved
 *     interval happened to get.
 */
function useCountdown(target: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (target <= Date.now()) return;

    const id = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= target) clearInterval(id);
    }, 500);

    return () => clearInterval(id);
  }, [target]);

  return Math.max(0, Math.ceil((target - now) / 1000));
}
