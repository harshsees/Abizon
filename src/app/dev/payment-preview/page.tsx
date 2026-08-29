import { notFound } from "next/navigation";

import { PaymentPreview } from "./PaymentPreview";

/**
 * THE PAYMENT SCREEN, ON ITS OWN.
 *
 * `paymentEnabled` is false, so the step is not in the application sequence and
 * cannot be reached by filling in an application. This route exists so it can
 * still be looked at, reviewed and adjusted before a gateway is chosen — the
 * alternative being a screen nobody sees until the day it has to work.
 *
 * IT 404s IN PRODUCTION. Not hidden behind an obscure path, not
 * `robots: noindex`, not a query parameter — the route object does not resolve
 * at all off a dev server. A checkout that simulates success is the single page
 * in this codebase that most needs to be unreachable by a real applicant, and
 * "nobody will find it" is not a way of making something unreachable.
 *
 * The simulation itself lives in `PaymentPreview`, deliberately in this folder
 * rather than anywhere near the component it drives, so no production import
 * can pick it up.
 */
export default function PaymentPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PaymentPreview />;
}

export const metadata = {
  title: "Payment preview (dev)",
  robots: { index: false, follow: false },
};
