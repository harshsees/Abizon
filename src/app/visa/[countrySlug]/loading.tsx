/**
 * Country page skeleton.
 *
 * The reference site leans heavily on pulsing placeholders rather than
 * spinners — a spinner tells you something is happening, a skeleton tells you
 * what is about to arrive and holds the layout so nothing jumps when it does.
 *
 * `animate-pulse` is neutralised by the global prefers-reduced-motion block,
 * which leaves a static grey scaffold. That is the correct fallback: the
 * information here is the shape, not the movement.
 */
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-[1200px] px-4 pt-4 md:px-6 md:pt-6">
        {/* Hero */}
        <div className="h-[540px] animate-pulse rounded-[28px] bg-surface-sunken md:h-[620px]" />
      </div>

      {/* Sub-navigation */}
      <div className="mt-8 border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl gap-8 px-4 md:px-6">
          {[64, 88, 96, 72, 56].map((width, i) => (
            <div key={i} className="flex h-16 items-center md:h-18">
              <div
                className="h-3 animate-pulse rounded-full bg-surface-sunken"
                style={{ width }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 pt-6 md:px-6">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-[1.08fr_0.92fr] md:gap-12">
          {/* Left column */}
          <div className="space-y-6">
            {[0, 1, 2].map((block) => (
              <div
                key={block}
                className="space-y-4 rounded-2xl border border-border bg-surface p-6"
              >
                <div className="h-5 w-1/3 animate-pulse rounded-full bg-surface-sunken" />
                <div className="space-y-2.5">
                  <div className="h-3 w-full animate-pulse rounded-full bg-surface-sunken" />
                  <div className="h-3 w-11/12 animate-pulse rounded-full bg-surface-sunken" />
                  <div className="h-3 w-4/6 animate-pulse rounded-full bg-surface-sunken" />
                </div>
              </div>
            ))}
          </div>

          {/* Sticky application card */}
          <div className="hidden md:block">
            <div className="space-y-5 rounded-2xl border border-border bg-surface p-6">
              <div className="h-6 w-2/5 animate-pulse rounded-full bg-surface-sunken" />
              <div className="h-24 animate-pulse rounded-xl bg-surface-sunken" />
              <div className="h-24 animate-pulse rounded-xl bg-surface-sunken" />
              <div className="h-12 animate-pulse rounded-xl bg-surface-sunken" />
            </div>
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading visa details
      </span>
    </div>
  );
}
