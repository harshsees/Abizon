"use client";

/**
 * What a sticker-visa destination (Schengen, USA, Canada) gets instead of the
 * application panel.
 *
 * These visas are not priced or applied for online: the consulate takes the
 * application in person, and every case starts with a conversation. So the
 * page asks for a name and a number, and the team calls back. The request goes
 * to the ops console, and to the team's inbox once one is configured.
 *
 * Same plate-and-card composition as `CountryApplicationPanel`, so the two
 * kinds of country page read as the same product.
 */

import { useState } from "react";
import { CheckCircle2, Loader2, PhoneCall } from "lucide-react";

import { requestCallbackAction } from "@/app/actions/callbacks";
import type { CountryVisaConfig } from "@/lib/countryVisa";

const SUPPORT_TEL = "+911140845678";
const SUPPORT_TEL_DISPLAY = "+91 11 4084 5678";

const FIELD =
  "mt-1.5 w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-[16px] text-foreground outline-none transition-colors duration-[--duration-fast] placeholder:text-muted-foreground/70 focus:border-primary";

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent"; phone: string }
  | { state: "error"; message: string };

export function CallbackRequestPanel({ config }: { config: CountryVisaConfig }) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = (key: string) => String(form.get(key) ?? "");

    setStatus({ state: "sending" });
    const result = await requestCallbackAction({
      countrySlug: config.slug,
      name: value("name"),
      phone: value("phone"),
      email: value("email"),
      travelPlan: value("travelPlan"),
      message: value("message"),
      website: value("website"),
    });

    if (result?.data?.ok) {
      setStatus({ state: "sent", phone: value("phone") });
      return;
    }
    const fieldError = result?.validationErrors
      ? Object.values(result.validationErrors)
          .flatMap((entry) =>
            entry && typeof entry === "object" && "_errors" in entry
              ? ((entry as { _errors?: string[] })._errors ?? [])
              : [],
          )
          .find(Boolean)
      : undefined;
    setStatus({
      state: "error",
      message:
        fieldError ??
        result?.serverError ??
        "We could not send your request. Please call us instead.",
    });
  };

  return (
    <aside className="w-full">
      <div className="rounded-[24px] bg-primary-subtle p-1.5 shadow-e1 ring-1 ring-inset ring-primary-border/50">
        <div className="overflow-hidden rounded-[18px] bg-surface shadow-e2">
          <div className="p-4 md:p-5">
            <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Sticker visa · Request a callback
            </p>
            <h2 className="type-h3 mt-2 text-foreground">
              Talk to us about your {config.displayName} visa
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A {config.displayName} visa is a sticker visa, applied for in person
              rather than online. Leave your details and our representative will
              call you back to take you through it.
            </p>

            {status.state === "sent" ? (
              <div
                role="status"
                className="mt-5 flex items-start gap-3 rounded-2xl bg-surface-sunken p-4"
              >
                <CheckCircle2
                  aria-hidden
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-success-subtle-foreground"
                />
                <p className="text-sm leading-relaxed text-foreground">
                  Thank you. We have your request and will call you on{" "}
                  <span className="font-semibold">{status.phone}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-3.5" noValidate>
                <label className="block text-xs font-medium text-subtle-foreground">
                  Your name
                  <input name="name" required autoComplete="name" className={FIELD} />
                </label>
                <label className="block text-xs font-medium text-subtle-foreground">
                  Phone number
                  <input
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    className={FIELD}
                  />
                </label>
                <label className="block text-xs font-medium text-subtle-foreground">
                  Email <span className="text-muted-foreground">(optional)</span>
                  <input name="email" type="email" autoComplete="email" className={FIELD} />
                </label>
                <label className="block text-xs font-medium text-subtle-foreground">
                  When are you travelling? <span className="text-muted-foreground">(optional)</span>
                  <input name="travelPlan" placeholder="e.g. June 2027" className={FIELD} />
                </label>
                <label className="block text-xs font-medium text-subtle-foreground">
                  Anything we should know? <span className="text-muted-foreground">(optional)</span>
                  <textarea name="message" rows={3} className={`${FIELD} resize-none`} />
                </label>

                {/* The honeypot: off-screen and out of the tab order, so only a
                    form-filling script ever puts anything in it. */}
                <input
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />

                {status.state === "error" && (
                  <p role="alert" className="text-xs text-destructive">
                    {status.message}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status.state === "sending"}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-sm font-semibold tracking-tight text-on-primary shadow-e2 transition-[background-color,box-shadow] duration-[--duration-fast] hover:bg-primary-hover hover:shadow-e3 disabled:pointer-events-none disabled:opacity-60"
                >
                  {status.state === "sending" ? (
                    <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                  ) : (
                    <PhoneCall aria-hidden className="h-4 w-4" />
                  )}
                  Request a callback
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Rather call now?
          </p>
          <p className="text-xs text-muted-foreground">We are happy to talk it through.</p>
        </div>
        <a
          href={`tel:${SUPPORT_TEL}`}
          className="inline-flex items-center gap-2 rounded-full border border-primary-border bg-surface px-4 py-2 text-xs font-semibold text-primary-subtle-foreground transition-colors duration-[--duration-fast] hover:bg-primary-subtle"
        >
          {SUPPORT_TEL_DISPLAY}
        </a>
      </div>
    </aside>
  );
}
