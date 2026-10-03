/**
 * The homepage's footer, in the dark: brand and line on the left, three link
 * columns, a legal row. The links are the ones the site footer carries, cut to
 * what a traveller would look for from the homepage.
 */

import Link from "next/link";

import { BrandMark } from "@/components/BrandLogo";
import { Wordmark } from "@/components/Wordmark";

const COLUMNS: { title: string; links: { name: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { name: "All tools", href: "/tools" },
      { name: "Visa requirements", href: "/tools/visa-requirements" },
      { name: "Visa photo creator", href: "/tools/visa-photo-creator" },
      { name: "Schengen appointments", href: "/tools/schengen-appointment-checker" },
      { name: "UAE visa status", href: "/tools/uae-visa-status-checker" },
      { name: "Track an application", href: "/track" },
    ],
  },
  {
    title: "Guides",
    links: [
      { name: "Schengen visa", href: "/guides/schengen-visa" },
      { name: "US visa", href: "/guides/us-visa" },
      { name: "UK visa", href: "/guides/uk-visa" },
      { name: "Japan visa", href: "/guides/japan-visa" },
      { name: "Passport index", href: "/passport-index" },
      { name: "Student visa", href: "/student-visa" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "Contact", href: "/contact" },
      { name: "Careers", href: "/careers" },
      { name: "Newsroom", href: "/newsroom" },
      { name: "Partners", href: "/partners" },
      { name: "Security", href: "/security" },
      { name: "Refunds policy", href: "/refunds-policy" },
    ],
  },
];

export function HomeFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1240px] px-4 pb-8 md:px-6">
      <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-8 md:p-12">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label="abizon home" className="inline-flex items-center gap-2">
              <BrandMark tone="current" className="size-6 text-white" />
              <Wordmark className="text-lg !text-white" />
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-white/45">
              Visas on time, for every destination in the hall.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-xs text-white/60 transition-colors hover:text-white">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-2 text-[11px] text-white/35">
        <span>&copy; {new Date().getFullYear()} abizon</span>
        <span className="flex gap-4">
          <Link href="/privacy" className="hover:text-white/70">Privacy</Link>
          <Link href="/terms" className="hover:text-white/70">Terms</Link>
          <Link href="/image-credits" className="hover:text-white/70">Image credits</Link>
        </span>
      </div>
    </footer>
  );
}
