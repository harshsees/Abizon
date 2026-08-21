import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArrivalCardFlow } from "@/components/arrival/ArrivalCardFlow";
import { countrySlugs, resolveCountry } from "@/lib/countryCatalogue";
import { resolveCountryVisaConfig } from "@/lib/countryVisa";

/**
 * THE ARRIVAL-CARD FLOW.
 * ---------------------------------------------------------------------------
 * A short, separate journey for destinations that operate a free digital
 * arrival card. It is not the visa application and does not pretend to be: no
 * documents step, no payment, no processing time. One screen of personal
 * details, filled from the passport where possible.
 *
 * ── Why the route exists per country rather than as one page with a picker ──
 *
 * Which fields an arrival card wants, and whether it exists at all, is a
 * property of the destination. A single page would have to ask which country
 * first, which is a question the visitor has already answered by being on a
 * destination page.
 *
 * ── Why it 404s for most of the catalogue ──
 *
 * `generateStaticParams` returns only the destinations whose arrival-card entry
 * has been *confirmed*, and the page checks again at render. Every entry in
 * `lib/arrivalCard.ts` currently ships unverified, so this route is presently
 * built for nothing — which is the correct state until somebody has opened each
 * official URL and checked the scheme. Telling a traveller their arrival card
 * is optional when the airline will not board them without it is the failure
 * this refuses to risk, and a 404 is the honest alternative.
 */
export function generateStaticParams() {
  return countrySlugs
    .filter((countrySlug) => {
      const country = resolveCountry(countrySlug);
      return country
        ? Boolean(resolveCountryVisaConfig(country).arrivalCard)
        : false;
    })
    .map((countrySlug) => ({ countrySlug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/arrival-card/[countrySlug]">): Promise<Metadata> {
  const { countrySlug } = await params;
  const country = resolveCountry(countrySlug);
  if (!country) return { title: "Arrival card not found | Abizon" };

  const config = resolveCountryVisaConfig(country);
  const card = config.arrivalCard;
  if (!card) return { title: "Arrival card not found | Abizon" };

  return {
    title: `${card.scheme} | Abizon`,
    description:
      `Fill in the ${card.scheme} for ${config.displayName}. ` +
      `It is free, issued by the ${config.displayName} government, and takes a few minutes.`,
    // A form carrying passport details has nothing to index, and the useful
    // page for search is the destination's own.
    robots: { index: false, follow: true },
  };
}

export default async function ArrivalCardPage({
  params,
}: PageProps<"/arrival-card/[countrySlug]">) {
  const { countrySlug } = await params;
  const country = resolveCountry(countrySlug);
  if (!country) notFound();

  const config = resolveCountryVisaConfig(country);
  // Checked again here rather than trusting the static params: an entry could
  // be flipped back to unverified, and the route must go with it.
  if (!config.arrivalCard) notFound();

  return <ArrivalCardFlow config={config} card={config.arrivalCard} />;
}
