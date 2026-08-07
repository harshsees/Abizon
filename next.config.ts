import type { NextConfig } from "next";

import { countriesData, getCountrySlug } from "./src/data/countries";

/**
 * Country pages used to sit at the root (`/thailand`, plus a hand-written
 * `/dubai`). They now live under `/visa/*`, which keeps them from sharing a
 * namespace with the company and product pages in the footer — a root-level
 * `[countrySlug]` catch-all would otherwise be competing with `/careers`,
 * `/security`, `/status` and the rest for every unmatched path.
 *
 * These redirects are enumerated rather than expressed as a blanket
 * `/:slug -> /visa/:slug` rule on purpose: redirects are evaluated *before*
 * the filesystem, so a wildcard would swallow every new footer route and
 * bounce it to a 404 under /visa. Listing the ~150 known slugs means only
 * genuine old country URLs move.
 */
const countryRedirects = [
  ...new Set(countriesData.map((country) => getCountrySlug(country.name))),
].map((slug) => ({
  source: `/${slug}`,
  destination: `/visa/${slug}`,
  permanent: true, // 308 — these URLs are never coming back
}));

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return countryRedirects;
  },
};

export default nextConfig;
