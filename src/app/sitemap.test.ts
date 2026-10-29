import { describe, expect, it } from "vitest";

import robots from "./robots";
import sitemap from "./sitemap";
import { countriesData, getCountrySlug } from "@/data/countries";

/**
 * The two files are one statement in two halves — `robots.ts` says what must
 * not be indexed, `sitemap.ts` says what should be — and nothing in the type
 * system stops them contradicting each other. The contradiction is not
 * cosmetic: a URL that appears in both is this site asking a crawler to index
 * a half-finished application or a page keyed by an applicant's reference.
 *
 * It would happen the ordinary way. Someone adds `/apply/review`, notices the
 * sitemap does not list it, and adds it there without reading the disallow
 * list thirty lines away in another file.
 */
describe("sitemap and robots agree", () => {
  const origin = "http://localhost:3000";
  const paths = sitemap().map((entry) => entry.url.replace(origin, "") || "/");

  const disallowed = (() => {
    const rules = robots().rules;
    const list = Array.isArray(rules) ? rules : [rules];
    return list.flatMap((rule) => {
      const value = rule.disallow ?? [];
      return Array.isArray(value) ? value : [value];
    });
  })();

  it("publishes no path that robots.txt disallows", () => {
    const published = paths.filter((path) =>
      disallowed.some((prefix) => path === prefix || path.startsWith(prefix)),
    );

    expect(published).toEqual([]);
  });

  it("publishes absolute URLs on one origin, with no trailing slash", () => {
    for (const entry of sitemap()) {
      expect(entry.url.startsWith(`${origin}/`) || entry.url === origin).toBe(true);
      expect(entry.url.endsWith("/")).toBe(false);
    }
  });

  it("publishes each URL once", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("includes the destination pages, which are the point of the file", () => {
    expect(paths).toContain("/visa/dubai");
    // Every destination the price list sells, and nothing it does not.
    const listed = new Set(countriesData.map((country) => getCountrySlug(country.name)));
    expect(paths.filter((path) => path.startsWith("/visa/")).length).toBe(listed.size);
    expect(paths).not.toContain("/visa/japan");
  });
});
