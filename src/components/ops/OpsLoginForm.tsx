"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";

import { opsLoginAction, type OpsLoginState } from "@/app/actions/ops";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

/**
 * Both factors on one screen. `app/actions/ops.ts` explains why: a two-step
 * form that accepts the password before asking for the code has told the
 * attacker the password was right, which is a password oracle.
 */
export function OpsLoginForm() {
  const [state, formAction, pending] = useActionState<OpsLoginState, FormData>(
    opsLoginAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <Field label="Email">
        {({ id, invalid, "aria-describedby": describedBy }) => (
          <Input
            id={id}
            name="email"
            type="email"
            autoComplete="username"
            required
            autoFocus
            invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      </Field>

      <Field label="Password">
        {({ id, invalid, "aria-describedby": describedBy }) => (
          <Input
            id={id}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            invalid={invalid}
            aria-describedby={describedBy}
          />
        )}
      </Field>

      <Field label="Authenticator code" helper="The six digits from your authenticator app.">
        {({ id, invalid, "aria-describedby": describedBy }) => (
          <Input
            id={id}
            name="totp"
            type="text"
            // `one-time-code` is what lets a password manager or iOS offer the
            // code directly. Without it, staff type it by hand every time.
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            required
            invalid={invalid}
            aria-describedby={describedBy}
            className="tabular-nums tracking-[0.3em]"
          />
        )}
      </Field>

      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md bg-destructive-subtle px-3.5 py-3 text-xs font-semibold text-destructive-subtle-foreground"
        >
          <AlertCircle className="mt-px size-4 shrink-0" aria-hidden="true" />
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" block loading={pending}>
        Sign in
        <ArrowRight data-arrow className="size-4" />
      </Button>
    </form>
  );
}
