"use client";

/**
 * The four-step process timeline. Split out of `VisaInfoAndPlans`; markup
 * unchanged.
 *
 * The timestamps inside it ("20 Jul, 01:08 PM", "8 Jan, 5:45 AM") are static
 * illustrations, not live tracking data, and they predate this phase. They stay
 * until there is a real application-status source to read from — a
 * fresher-looking fake date would not be more true.
 */

export function VisaProcess() {
  return (
      <div className="pt-8 border-t border-border/50 space-y-6">
        <div>
          <h2 id="process-section" className="text-2xl font-bold text-foreground tracking-tight scroll-mt-28">
            How Process Works
          </h2>
        </div>

        <div className="relative pl-6 md:pl-8 border-l border-border ml-3.5 space-y-6 pt-2 pb-2">
          {/* Step 1 */}
          <div className="relative">
            <span className="absolute -left-[30px] md:-left-[38px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 border border-white">
              <span className="h-1.5 w-1.5 rounded-full bg-surface"></span>
            </span>
            <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-sm hover:shadow-md transition duration-300">
              <p className="text-xs font-bold text-primary-subtle-foreground">Step 1</p>
              <h3 className="text-lg font-bold text-foreground mt-1">Apply on Keyrise</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Submit your documents on Keyrise — only pay government fee.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <span className="absolute -left-[30px] md:-left-[38px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 border border-white">
              <span className="h-1.5 w-1.5 rounded-full bg-surface"></span>
            </span>
            <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-sm hover:shadow-md transition duration-300">
              <p className="text-xs font-bold text-primary-subtle-foreground">Step 2</p>
              <h3 className="text-lg font-bold text-foreground mt-1">Your Documents Are Verified</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Keyrise verifies your documents and submits to Immigration
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <span className="absolute -left-[30px] md:-left-[38px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 border border-white">
              <span className="h-1.5 w-1.5 rounded-full bg-surface"></span>
            </span>
            <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-sm hover:shadow-md transition duration-300 space-y-4">
              <div>
                <p className="text-xs font-bold text-primary-subtle-foreground">Step 3</p>
                <h3 className="text-lg font-bold text-foreground mt-1">Your Visa Gets Processed</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  We work with Immigration to ensure you get your Visa on time.
                </p>
              </div>
              
              {/* Nested tracking sub-timeline */}
              <div className="bg-surface-sunken border border-border rounded-xl p-4.5 space-y-4">
                <div className="relative pl-5 border-l border-amber-500/30 space-y-4 ml-1">
                  {/* Item 1 */}
                  <div className="relative">
                    <span className="absolute -left-[24.5px] top-1 h-2 w-2 rounded-full bg-amber-600 border border-white" />
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      Application has been sent to the immigration supervisor
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-muted-foreground">8 Jan, 5:45 AM</span>
                      <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider">
                        ON TIME
                      </span>
                    </div>
                  </div>
                  {/* Item 2 */}
                  <div className="relative">
                    <span className="absolute -left-[24.5px] top-1 h-2 w-2 rounded-full bg-amber-600 border border-white" />
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      Application has been sent to internal intelligence
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-muted-foreground">8 Jan, 5:45 AM</span>
                      <span className="inline-flex items-center rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-700 uppercase tracking-wider">
                        ON TIME
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <span className="absolute -left-[30px] md:-left-[38px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 border border-white">
              <span className="h-1.5 w-1.5 rounded-full bg-surface"></span>
            </span>
            <div className="rounded-2xl border border-border bg-surface p-5 md:p-6 shadow-sm hover:shadow-md transition duration-300 space-y-4">
              <div>
                <p className="text-xs font-bold text-primary-subtle-foreground">Step 4</p>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  Get Your Visa on <span className="text-primary-subtle-foreground">20 Jul, 01:08 PM</span>
                </h3>
              </div>

              {/* Nested fee grid */}
              <div className="bg-surface-sunken border border-border rounded-xl p-4 divide-y divide-slate-200/60">
                {/* Row 1 */}
                <div className="flex items-center justify-between py-2 first:pt-0">
                  <span className="text-xs font-bold text-slate-700 leading-snug">Your visa is approved on time</span>
                  <span className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm border border-emerald-100/50">
                    Pay Keyrise Fee
                  </span>
                </div>
                {/* Row 2 */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-bold text-slate-700 leading-snug max-w-[200px] md:max-w-none">
                    Your visa is approved even one second after the promised time
                  </span>
                  <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-primary-subtle-foreground shadow-sm border border-amber-100/50 shrink-0">
                    Keyrise Fee Waived
                  </span>
                </div>
                {/* Row 3 */}
                <div className="flex items-center justify-between py-2 last:pb-0">
                  <span className="text-xs font-bold text-slate-700 leading-snug">Your visa is rejected</span>
                  <span className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm border border-red-100/50">
                    Government Fee Refunded
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
