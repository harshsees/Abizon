/**
 * "Loading your application".
 * ---------------------------------------------------------------------------
 * The reference recording opens on this: a near-empty off-white viewport, one
 * editorial serif line a little above centre, and a hairline rule beneath it
 * with a soft green segment travelling along. No navigation, no logo, no
 * spinner. It is the quietest screen in the product and that is the point.
 *
 * ── Why this is a route `loading.tsx` and not a timer ──
 *
 * The obvious way to reproduce it is to render the form behind a `useState`
 * flag and flip it after a second and a half. That would be a delay we
 * invented, shown to somebody whose page was already ready — the same
 * dishonesty as a fake progress bar, and it would make the flow measurably
 * slower for everyone.
 *
 * Instead this is the segment's Suspense fallback. React streams it while the
 * server component resolves and swaps it for the form the moment it lands, so
 * the screen appears for exactly as long as there is something to wait for:
 * a blink on a fast connection, a real wait on a slow one. Nobody is shown a
 * loading screen for work that already finished.
 *
 * Server-rendered, so there is no client JS between the request and this
 * appearing.
 */
export function ArrivalCardLoading() {
  return (
    <div
      // `polite` rather than `assertive`: a screen reader should mention this
      // between sentences, not interrupt for it.
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6"
    >
      {/* Held a little above the optical centre — text centred in a viewport
          looks low, and the reference sits it around 47%. */}
      <div className="-mt-[6vh] flex w-full max-w-lg flex-col items-center">
        <h1 className="type-h2 text-center text-balance text-foreground">
          Loading your application
        </h1>

        {/* The track. A dashed hairline rather than a solid one, so at rest it
            reads as a guide rather than an empty progress bar waiting to
            fill. */}
        <div
          aria-hidden
          className="relative mt-7 h-px w-full max-w-[15rem] overflow-hidden"
        >
          <div className="absolute inset-0 bg-[repeating-linear-gradient(to_right,var(--color-border-strong)_0_4px,transparent_4px_9px)]" />
          {/* The luminous segment. Blurred and gradient-faded at both ends so
              there is no edge to read as a position. */}
          <div className="absolute inset-y-[-3px] left-0 w-16 animate-arrival-load-sweep rounded-full bg-[linear-gradient(90deg,transparent,var(--color-success)_50%,transparent)] blur-[2px]" />
        </div>
      </div>
    </div>
  );
}
