"use client";

/**
 * UAE visa status lookup.
 *
 * This resolves Keyrise application references against our own tracking route.
 * It deliberately does *not* pretend to query GDRFA or ICP directly — we have
 * no such integration on the client, and a form that returned invented
 * government status would be worse than useless to someone with a flight
 * booked. For non-Keyrise references it says so plainly and points at the
 * official channels.
 */

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ExternalLink, Info, Search } from "lucide-react";

import { DURATION, EASE } from "@/lib/motion";

type Mode = "application" | "passport";

/** Keyrise references look like KR-XXXXXXXX. */
const KEYRISE_REF = /^KR-?[A-Z0-9]{6,10}$/i;
/** Indian passports: one letter, seven digits. */
const PASSPORT = /^[A-Z][0-9]{7}$/i;

export function UaeStatusForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("application");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showExternal, setShowExternal] = useState(false);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    setShowExternal(false);

    if (!trimmed) {
      setError("Enter a reference to look up.");
      return;
    }

    if (mode === "application") {
      if (KEYRISE_REF.test(trimmed)) {
        setError(null);
        router.push(`/track/${encodeURIComponent(trimmed.toUpperCase())}`);
        return;
      }
      // A well-formed reference that isn't ours — be explicit about that.
      setError(null);
      setShowExternal(true);
      return;
    }

    if (!PASSPORT.test(trimmed)) {
      setError(
        "That doesn't look like an Indian passport number. The format is one letter followed by seven digits, e.g. M1234567.",
      );
      return;
    }

    setError(null);
    setShowExternal(true);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-border bg-surface p-5 shadow-e2 md:p-6"
      >
        <div role="tablist" aria-label="Look up by" className="flex gap-2">
          {(
            [
              ["application", "Application number"],
              ["passport", "Passport number"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => {
                setMode(id);
                setValue("");
                setError(null);
                setShowExternal(false);
              }}
              className={`rounded-full border px-4 py-2 text-xs font-bold ${
                mode === id
                  ? "border-primary bg-primary-subtle text-primary-subtle-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-strong"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <label
          htmlFor="uae-status-input"
          className="mt-5 block text-2xs font-black uppercase tracking-widest text-muted-foreground"
        >
          {mode === "application" ? "Application number" : "Passport number"}
        </label>

        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="uae-status-input"
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "uae-status-error" : undefined}
            placeholder={mode === "application" ? "KR-8F42K1" : "M1234567"}
            className="w-full rounded-xl border border-input bg-surface py-3.5 pl-11 pr-4 text-sm font-medium uppercase text-foreground placeholder:normal-case placeholder:text-muted-foreground"
          />
        </div>

        {error && (
          <p
            id="uae-status-error"
            role="alert"
            className="mt-2.5 text-xs font-medium text-destructive-subtle-foreground"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="group mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-on-primary hover:bg-primary-hover"
        >
          Check status
          <ArrowRight className="h-4 w-4 transition-transform duration-[var(--duration-base)] ease-out group-hover:translate-x-0.5" />
        </button>

        <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Applications filed through Keyrise open directly in your tracking timeline. For
            anything filed elsewhere, we&apos;ll point you at the official channel.
          </span>
        </p>
      </form>

      <AnimatePresence>
        {showExternal && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: DURATION.base, ease: EASE.out }}
            className="mt-4 rounded-2xl border border-accent-subtle bg-accent-subtle p-5"
          >
            <h3 className="text-sm font-bold text-accent-subtle-foreground">
              That reference isn&apos;t a Keyrise application
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-accent-subtle-foreground">
              We can only return live status for applications we filed. For a UAE visa filed
              through another agent, an airline or directly, the authoritative status comes
              from the issuing authority — which one depends on the emirate that issued it.
            </p>

            <ul className="mt-4 space-y-2">
              {[
                {
                  label: "GDRFA Dubai — visas issued in Dubai",
                  href: "https://smart.gdrfad.gov.ae/",
                },
                {
                  label: "ICP — visas issued in all other emirates",
                  href: "https://icp.gov.ae/",
                },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-accent-subtle-foreground underline underline-offset-2"
                  >
                    {link.label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs text-accent-subtle-foreground">
              You will need the same passport number plus your date of birth and nationality.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
