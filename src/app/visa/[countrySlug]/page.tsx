import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CountryVisaPage } from "@/components/CountryVisaPage";
import { countriesData, getCountrySlug } from "@/data/countries";

/**
 * The dataset carries a couple of duplicate rows (Morocco and Jordan each
 * appear twice) which collapse to the same slug. Returning a duplicate from
 * generateStaticParams makes the build emit the same route twice, so the
 * lookup is deduped once here and reused by both the params list and the page.
 */
const countryBySlug = new Map(
  countriesData.map((country) => [getCountrySlug(country.name), country] as const),
);

export function generateStaticParams() {
  return [...countryBySlug.keys()].map((countrySlug) => ({ countrySlug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/visa/[countrySlug]">): Promise<Metadata> {
  const { countrySlug } = await params;
  const country = countryBySlug.get(countrySlug);

  if (!country) return { title: "Visa not found | Keyrise" };

  const displayName = country.name === "United Arab Emirates" ? "Dubai" : country.name;
  const title = `${displayName} Visa for Indians — Fees, Documents & Processing Time | Keyrise`;
  const description =
    `Apply online for a ${displayName} ${country.visaType.toLowerCase()} with ${country.validity.toLowerCase()} validity. ` +
    `Delivered in ${country.deliveryDays} ${country.deliveryDays === 1 ? "day" : "days"}, guaranteed, or your money back. ` +
    `Government fee ${country.fees}. Documents needed: ${country.documents.toLowerCase()}.`;

  return {
    title,
    description,
    alternates: { canonical: `/visa/${countrySlug}` },
    openGraph: {
      title,
      description,
      type: "website",
      images: country.imageUrl ? [{ url: country.imageUrl }] : undefined,
    },
  };
}

export default async function Page({ params }: PageProps<"/visa/[countrySlug]">) {
  const { countrySlug } = await params;
  const country = countryBySlug.get(countrySlug);

  if (!country) notFound();

  return <CountryVisaPage country={country} />;
}
