import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CountryVisaPage } from "@/components/CountryVisaPage";
import { countrySlugs, resolveCountry } from "@/lib/countryCatalogue";
import { countryOgImage } from "@/lib/countryImagery";
import { deriveVisaFlow, displayCountryName, formatGovernmentFee } from "@/lib/countryVisa";

/**
 * Routing goes through the catalogue, which is the product's single slug
 * resolver.
 *
 * This route used to build its own `new Map(countriesData.map(...))`. `Map.set`
 * overwrites, so for the duplicated Morocco row that map kept the LAST entry
 * while `countryFromSlug` — used by /apply — kept the FIRST. The page quoted
 * ₹5,169 and the application quoted ₹4,669 for the same visa. One resolver
 * makes that class of bug unrepresentable.
 */
export function generateStaticParams() {
  return countrySlugs.map((countrySlug) => ({ countrySlug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/visa/[countrySlug]">): Promise<Metadata> {
  const { countrySlug } = await params;
  const country = resolveCountry(countrySlug);

  if (!country) return { title: "Visa not found | Abizon" };

  // Was a second copy of this rule. One definition, imported.
  const displayName = displayCountryName(country);

  /**
   * PHASE 7C: metadata follows the flow, like the page body already does.
   *
   * Phase 7B stopped visa-free destinations from rendering an application panel
   * and a fee — but `generateMetadata` was untouched, so all 30 of them still
   * told search engines and link previews "Apply online for a Mauritius visa
   * free … Government fee Free. Fees, Documents & Processing Time". The page
   * said there is nothing to apply for while its own title advertised applying.
   *
   * Branching on `deriveVisaFlow`, not on a country name, so this stays
   * configuration rather than a list of special cases.
   */
  const isVisaFree = deriveVisaFlow(country.visaType) === "visa-free";
  const ogImage = countryOgImage(countrySlug);

  const title = isVisaFree
    ? `${displayName} Visa Requirements for Indians — No Visa Needed | Abizon`
    : `${displayName} Visa for Indians — Fees, Documents & Processing Time | Abizon`;

  const description = isVisaFree
    ? `Indian passport holders do not need a visa for ${displayName}. ` +
      `Entry is permitted for ${country.validity.toLowerCase()}. ` +
      `Check passport validity and entry conditions before you travel.`
    : `Apply online for a ${displayName} ${country.visaType.toLowerCase()} with ${country.validity.toLowerCase()} validity. ` +
      `Delivered in ${country.deliveryDays} ${country.deliveryDays === 1 ? "day" : "days"}, guaranteed, or your money back. ` +
      `Government fee ${formatGovernmentFee(country.fees)}. Documents needed: ${country.documents.toLowerCase()}.`;

  return {
    title,
    description,
    alternates: { canonical: `/visa/${countrySlug}` },
    openGraph: {
      title,
      description,
      type: "website",
      /**
       * PHASE 8B. Two things were wrong here, and only one of them was visible.
       *
       * The visible one: `hasAuthenticImagery` let through every photograph it
       * had not specifically blacklisted, so the France share card carried a
       * photograph of Bangkok. A share card is a claim about a place made in
       * someone else's feed, where there is no page around it to correct the
       * impression — it is the worst possible surface for a wrong image.
       *
       * The invisible one: the URL passed through was `country.imageUrl`, the
       * 400x550 *card* crop. Every share surface renders OG art at 1.91:1, so
       * a portrait image was being centre-cropped or letterboxed by Twitter,
       * Slack and WhatsApp independently. The manifest derives a real 1200x630.
       *
       * No trustworthy photograph means no `images` key at all, and the crawler
       * falls back to the site-level card — never a stand-in destination photo.
       */
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function Page({ params }: PageProps<"/visa/[countrySlug]">) {
  const { countrySlug } = await params;
  const country = resolveCountry(countrySlug);

  if (!country) notFound();

  return <CountryVisaPage country={country} />;
}
