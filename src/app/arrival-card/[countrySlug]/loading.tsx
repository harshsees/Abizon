import { ArrivalCardLoading } from "@/components/arrival/ArrivalCardLoading";

/**
 * The route segment's Suspense fallback. Shown while the page's server
 * component resolves, and for exactly that long — see the note in
 * `ArrivalCardLoading` on why this is not a timer.
 */
export default function Loading() {
  return <ArrivalCardLoading />;
}
