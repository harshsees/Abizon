"use client";

/**
 * The application header.
 *
 * Deliberately NOT `SiteHeader`. The marketing header carries a search field,
 * a destination mega-menu, the guarantee block and an account link — every one
 * of them an invitation to leave a flow the user has just chosen to enter.
 * This one carries identity, where you are, and the way out. Nothing else.
 *
 * Three regions, and the middle one is the point: the destination sits at the
 * optical centre so the applicant can always see which country they are
 * applying to without reading a form field. The save state sits beside it
 * because "saved on this device" is a promise that has to be visible while
 * they are typing, not buried on a confirmation screen.
 */

import { Check, X } from "lucide-react";
import Link from "next/link";

type ApplicationHeaderProps = {
  countryName: string;
  flagUrl: string;
  /** Where the exit control goes back to — the country page it came from. */
  exitHref: string;
  /** Shown once there is something on this device worth resuming. */
  saved: boolean;
  progressPercent: number;
};

export function ApplicationHeader({
  countryName,
  flagUrl,
  exitHref,
  saved,
  progressPercent,
}: ApplicationHeaderProps) {
  return (
    <header className="sticky top-0 z-nav border-b border-border bg-surface/85 backdrop-blur-md">
      {/* A 2px rule, not a bar. Progress is reinforcement here; the step rail
          is the thing that actually communicates position. */}
      <div
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Application progress"
        className="absolute inset-x-0 top-0 h-0.5 bg-border"
      >
        <div
          className="h-full bg-primary transition-[width] duration-[--duration-slow] ease-[--ease-out] motion-reduce:transition-none"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          aria-label="Keyrise home"
          className="flex flex-shrink-0 items-center gap-2"
        >
          <svg
            className="size-6 text-foreground"
            viewBox="0 0 100 100"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M15 80 L50 20 L85 80 Z"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M40 55 L60 55" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            <path d="M50 20 L55 35" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
          </svg>
          <span className="text-lg font-black tracking-tighter text-foreground">
            keyrise
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-3">
          <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
            <img
              src={flagUrl}
              alt=""
              className="h-3.5 w-5 flex-shrink-0 rounded-[2px] object-cover"
            />
            <span className="truncate">{countryName}</span>
          </p>

          {/* Says where it is saved, because it is not saved anywhere else. */}
          {saved && (
            <span className="hidden items-center gap-1.5 border-l border-border pl-3 text-2xs text-muted-foreground sm:flex">
              <Check aria-hidden className="size-3 text-success" />
              Saved on this device
            </span>
          )}
        </div>

        <Link
          href={exitHref}
          aria-label={`Leave the application and return to the ${countryName} page`}
          className="flex size-11 flex-shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground sm:size-10"
        >
          <X aria-hidden className="size-5" />
        </Link>
      </div>
    </header>
  );
}
