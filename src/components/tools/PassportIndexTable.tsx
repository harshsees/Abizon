"use client";

/**
 * Passport mobility ranking.
 *
 * Searchable and sortable. Rank is competition-style (equal scores share a
 * rank and the next rank skips), which is how mobility indices are normally
 * reported — presenting a strict 1..n ordering would imply a precision the
 * underlying counts don't have.
 */

import { useMemo, useState } from "react";
import { ArrowUpDown, Search } from "lucide-react";

type Passport = {
  country: string;
  code: string;
  visaFree: number;
  visaOnArrival: number;
};

const PASSPORTS: Passport[] = [
  { country: "Singapore", code: "sg", visaFree: 169, visaOnArrival: 26 },
  { country: "Japan", code: "jp", visaFree: 166, visaOnArrival: 27 },
  { country: "Germany", code: "de", visaFree: 165, visaOnArrival: 27 },
  { country: "Italy", code: "it", visaFree: 165, visaOnArrival: 27 },
  { country: "Spain", code: "es", visaFree: 165, visaOnArrival: 27 },
  { country: "France", code: "fr", visaFree: 164, visaOnArrival: 27 },
  { country: "Netherlands", code: "nl", visaFree: 164, visaOnArrival: 27 },
  { country: "South Korea", code: "kr", visaFree: 164, visaOnArrival: 26 },
  { country: "Sweden", code: "se", visaFree: 163, visaOnArrival: 27 },
  { country: "Austria", code: "at", visaFree: 163, visaOnArrival: 27 },
  { country: "Switzerland", code: "ch", visaFree: 161, visaOnArrival: 27 },
  { country: "United Kingdom", code: "gb", visaFree: 160, visaOnArrival: 28 },
  { country: "United States", code: "us", visaFree: 158, visaOnArrival: 28 },
  { country: "Australia", code: "au", visaFree: 157, visaOnArrival: 28 },
  { country: "Canada", code: "ca", visaFree: 157, visaOnArrival: 27 },
  { country: "New Zealand", code: "nz", visaFree: 156, visaOnArrival: 28 },
  { country: "Malaysia", code: "my", visaFree: 148, visaOnArrival: 28 },
  { country: "United Arab Emirates", code: "ae", visaFree: 137, visaOnArrival: 45 },
  { country: "Brazil", code: "br", visaFree: 132, visaOnArrival: 38 },
  { country: "Argentina", code: "ar", visaFree: 130, visaOnArrival: 38 },
  { country: "Mexico", code: "mx", visaFree: 121, visaOnArrival: 38 },
  { country: "Turkey", code: "tr", visaFree: 89, visaOnArrival: 43 },
  { country: "South Africa", code: "za", visaFree: 82, visaOnArrival: 40 },
  { country: "China", code: "cn", visaFree: 61, visaOnArrival: 39 },
  { country: "Indonesia", code: "id", visaFree: 58, visaOnArrival: 41 },
  { country: "India", code: "in", visaFree: 32, visaOnArrival: 30 },
  { country: "Sri Lanka", code: "lk", visaFree: 25, visaOnArrival: 33 },
  { country: "Egypt", code: "eg", visaFree: 25, visaOnArrival: 27 },
  { country: "Nepal", code: "np", visaFree: 21, visaOnArrival: 34 },
  { country: "Bangladesh", code: "bd", visaFree: 20, visaOnArrival: 22 },
  { country: "Pakistan", code: "pk", visaFree: 14, visaOnArrival: 19 },
  { country: "Afghanistan", code: "af", visaFree: 8, visaOnArrival: 18 },
];

type SortKey = "rank" | "visaFree" | "total";

export function PassportIndexTable() {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("rank");

  const ranked = useMemo(() => {
    const withTotals = PASSPORTS.map((p) => ({
      ...p,
      total: p.visaFree + p.visaOnArrival,
    }));

    // Rank on total access, competition-style: equal totals share a rank and
    // the next rank skips. Built with an explicit loop rather than a `map`
    // closing over mutable carry variables — the lint rule against reassigning
    // across a render boundary is right that the closure form is a trap, even
    // though this one is scoped to a single pass.
    const byTotal = [...withTotals].sort((a, b) => b.total - a.total);
    const out: Array<(typeof byTotal)[number] & { rank: number }> = [];

    for (let i = 0; i < byTotal.length; i++) {
      const previous = out[i - 1];
      const rank =
        previous && previous.total === byTotal[i].total ? previous.rank : i + 1;
      out.push({ ...byTotal[i], rank });
    }

    return out;
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? ranked.filter((p) => p.country.toLowerCase().includes(q))
      : ranked;

    if (sort === "visaFree") {
      return [...filtered].sort((a, b) => b.visaFree - a.visaFree);
    }
    if (sort === "total") {
      return [...filtered].sort((a, b) => b.total - a.total);
    }
    return [...filtered].sort((a, b) => a.rank - b.rank);
  }, [ranked, query, sort]);

  const maxTotal = ranked[0]?.total ?? 1;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <label htmlFor="passport-search" className="sr-only">
            Search passports
          </label>
          <input
            id="passport-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a passport…"
            className="w-full rounded-xl border border-input bg-surface py-3 pl-11 pr-4 text-sm font-medium text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          {(
            [
              ["rank", "Rank"],
              ["visaFree", "Visa-free"],
              ["total", "Total access"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={sort === key}
              onClick={() => setSort(key)}
              className={`rounded-full border px-3.5 py-1.5 text-2xs font-bold ${
                sort === key
                  ? "border-primary bg-primary-subtle text-primary-subtle-foreground"
                  : "border-border bg-surface text-muted-foreground hover:border-border-strong"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface shadow-e1">
        <table className="w-full min-w-[620px] border-collapse text-left">
          <caption className="sr-only">
            Passport mobility ranking by visa-free and visa-on-arrival access
          </caption>
          <thead>
            <tr className="border-b border-border bg-surface-sunken">
              {["Rank", "Passport", "Visa-free", "On arrival", "Total"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="px-5 py-3 text-2xs font-black uppercase tracking-widest text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.map((passport) => (
              <tr key={passport.code} className="hover:bg-surface-sunken">
                <td
                  data-numeric
                  className="px-5 py-3.5 text-sm font-black text-foreground"
                >
                  {passport.rank}
                </td>
                <th scope="row" className="px-5 py-3.5">
                  <span className="flex items-center gap-2.5">
                    <span className="h-4 w-6 shrink-0 overflow-hidden rounded-[2px] border border-border">
                      <img
                        src={`https://flagcdn.com/w40/${passport.code}.png`}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {passport.country}
                    </span>
                  </span>
                </th>
                <td data-numeric className="px-5 py-3.5 text-sm text-muted-foreground">
                  {passport.visaFree}
                </td>
                <td data-numeric className="px-5 py-3.5 text-sm text-muted-foreground">
                  {passport.visaOnArrival}
                </td>
                <td className="px-5 py-3.5">
                  <span className="flex items-center gap-2.5">
                    <span
                      data-numeric
                      className="w-8 shrink-0 text-sm font-bold text-foreground"
                    >
                      {passport.total}
                    </span>
                    <span
                      aria-hidden
                      className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-sunken"
                    >
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${(passport.total / maxTotal) * 100}%` }}
                      />
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 && (
        <p className="mt-4 rounded-xl bg-surface-sunken px-4 py-3 text-sm text-muted-foreground">
          No passport matches &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  );
}
