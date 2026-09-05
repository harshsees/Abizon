/**
 * Image credits.
 *
 * WHY THIS PAGE EXISTS, and why it is not optional.
 *
 * Every destination photograph on this site comes from Wikimedia Commons, and
 * most of them are CC BY or CC BY-SA — licences that permit commercial use and
 * require, in exchange, that the author be named wherever the work appears.
 * A handful are CC0 or public domain and require nothing; they are listed here
 * anyway, because a credits page with gaps invites the reader to wonder which
 * omissions were deliberate.
 *
 * The country page already carries a credit line over its own hero, which
 * discharges the obligation at the point of use for that one photograph. The
 * homepage grid cannot: 152 credits in a card grid is not a design, and
 * shrinking them until they fit is worse than not attributing at all, because
 * it looks like compliance without being legible. So the grid's attribution is
 * this page, linked site-wide from the footer — which is the arrangement the
 * licences describe as "reasonable to the medium".
 *
 * Nothing here is written by hand. The table is the manifest, rendered, so a
 * photograph cannot be swapped in `countryPhotoManifest.ts` and leave a stale
 * credit behind. That is the whole point of generating it: an attribution that
 * has to be maintained separately from the image is an attribution that will
 * eventually be wrong.
 */

import type { Metadata } from "next";
import Link from "next/link";

import { PageHero, PageShell, Section } from "@/components/PageKit";
import { countriesData, getCountrySlug } from "@/data/countries";
import { COUNTRY_PHOTOS } from "@/lib/countryImagery";
import { displayCountryName } from "@/lib/countryVisa";

export const metadata: Metadata = {
  title: "Image credits | abizon",
  description:
    "Every destination photograph on abizon, with its photographer, licence and source.",
};

type CreditRow = {
  slug: string;
  country: string;
  subject: string;
  credit?: string;
  license: string;
  source?: string;
};

/**
 * One row per destination, in the dataset's own order.
 *
 * Deduplicated by slug rather than by country name: the dataset carries two
 * rows each for Morocco and Jordan (a 30-day and a 90-day product sharing one
 * slug), and they share one photograph. Listing it twice would imply two
 * separately licensed images.
 */
function creditRows(): CreditRow[] {
  const seen = new Set<string>();
  const rows: CreditRow[] = [];

  for (const country of countriesData) {
    const slug = getCountrySlug(country.name);
    if (seen.has(slug)) continue;
    seen.add(slug);

    const photo = COUNTRY_PHOTOS[slug];
    if (!photo || photo.verdict !== "depicts-country") continue;

    rows.push({
      slug,
      country: displayCountryName(country),
      subject: photo.subject,
      credit: photo.credit,
      license: photo.license,
      source: photo.source,
    });
  }

  return rows.sort((a, b) => a.country.localeCompare(b.country));
}

export default function ImageCreditsPage() {
  const rows = creditRows();

  return (
    <PageShell>
      <PageHero
        eyebrow="Attribution"
        title="Image credits"
        description={`Every one of the ${rows.length} destination photographs on this site, with the person who took it, the licence it is used under, and where it came from.`}
      />

      <Section
        title="Where these photographs come from"
        description="Each destination's photograph is the lead image of a named landmark's article on the English Wikipedia, served from Wikimedia Commons. Choosing a landmark first and taking its photograph second is what keeps a picture of one country from being captioned with the name of another."
      >
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Licences marked CC BY or CC BY-SA permit commercial use and require
          attribution; that is what this page is for. Files marked CC0 or public
          domain carry no such requirement and are listed for completeness. A
          photograph&rsquo;s own credit also appears over the hero on its
          destination page. Where a file&rsquo;s author is not recorded on
          Commons, the licence is given without a name.
        </p>

        {/* The table scrolls inside its own container rather than widening the
            page. Three columns of variable-length prose at 390px would
            otherwise force a horizontal scroll on the document itself. */}
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[48rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-surface-sunken">
                <th
                  scope="col"
                  className="px-5 py-3 text-2xs font-bold uppercase tracking-[0.1em] text-muted-foreground"
                >
                  Destination
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-2xs font-bold uppercase tracking-[0.1em] text-muted-foreground"
                >
                  Photograph
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-2xs font-bold uppercase tracking-[0.1em] text-muted-foreground"
                >
                  Credit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr key={row.slug} className="align-top">
                  <th
                    scope="row"
                    className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-foreground"
                  >
                    <Link
                      href={`/visa/${row.slug}`}
                      className="hover:text-primary hover:underline"
                    >
                      {row.country}
                    </Link>
                  </th>
                  <td className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                    {row.source ? (
                      <a
                        href={row.source}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="underline decoration-border-strong underline-offset-4 hover:text-foreground hover:decoration-current"
                      >
                        {row.subject}
                      </a>
                    ) : (
                      row.subject
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                    {row.credit ? (
                      <>
                        <span className="text-foreground">{row.credit}</span>
                        <span className="mx-1.5 text-border-strong">·</span>
                      </>
                    ) : null}
                    {row.license}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 max-w-3xl text-2xs leading-relaxed text-muted-foreground">
          abizon is not affiliated with the Wikimedia Foundation, and no
          photographer listed here has endorsed abizon. If you are the author of
          one of these photographs and want the credit corrected or the image
          removed, write to us and we will act on it.
        </p>
      </Section>
    </PageShell>
  );
}
