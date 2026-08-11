"use client";

/**
 * /apply — the application route.
 *
 * The route is now a mount point. Phase 5A moved 1179 lines of flow, camera,
 * modal and toast out of here: chrome and navigation to `ApplicationShell`,
 * state to `lib/application`, the camera to `LiveCapture`.
 *
 * The `<Suspense>` boundary is load-bearing, not decoration. `useSearchParams`
 * inside it makes Next render the fallback during prerender and the content on
 * the client only, which is what lets `ApplicationProvider` read the on-device
 * draft in its reducer initialiser without a hydration mismatch — the flow
 * knows whether it is resuming before its first paint, rather than flipping
 * after one.
 *
 * WHAT WAS REMOVED FROM THIS FILE AND NOT REBUILT
 *
 *   - "Who's going on this trip to United Arab Emirates?" and "as per the
 *     official United Arab Emirates embassy requirements": hardcoded, on all
 *     154 destinations, while the resolved country sat unused two hundred lines
 *     above.
 *   - A "Photo" and a "Passport" button on every traveller, regardless of what
 *     the destination asks for.
 *   - "Browse files", which marked the passport provided without opening a file
 *     picker or receiving a file.
 *   - The phone-upload modal: a QR glyph that encodes nothing, a
 *     `/apply?traveler=<id>` share link no route reads, "synced in real-time"
 *     with nothing to sync to, and "Protected with industry-standard AES-256
 *     encryption" / "100% Encrypted & Safe" over a flow that transmits nothing.
 *     Phone hand-off is a real feature worth building; none of that was it.
 *   - `"Payment flow would go here."` as the checkout step.
 */

import { Suspense } from "react";

import { ApplicationShell } from "@/components/application/ApplicationShell";
import { ApplicationProvider } from "@/lib/application/context";

export default function ApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading your application…</p>
        </div>
      }
    >
      <ApplicationProvider>
        <ApplicationShell />
      </ApplicationProvider>
    </Suspense>
  );
}
