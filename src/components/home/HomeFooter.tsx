/**
 * The homepage's footer, on the same paper as the sections above it: brand and
 * line on the left, three link columns, a legal row. The links are the ones the site footer carries, cut to
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
    <footer className="relative z-10 bg-paper text-ink">
      <div className="mx-auto w-full max-w-[1240px] px-4 md:px-6">
        <div className="grid grid-cols-2 gap-10 border-t border-rule py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:py-16">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" aria-label="abizon home" className="inline-flex items-center gap-2 text-ink">
              <BrandMark tone="current" className="size-6" />
              <Wordmark className="text-lg !text-ink" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-muted">
              Visa applications for Indian passport holders — prepared, checked and filed, with the delivery date
              promised before you pay.
            </p>
            <a
              href="mailto:support@abizonvisa.com"
              className="mt-4 inline-block text-sm text-ink underline decoration-rule underline-offset-4 hover:decoration-ink"
            >
              support@abizonvisa.com
            </a>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-faint">{col.title}</p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule py-6 text-xs text-ink-faint">
          <span>&copy; {new Date().getFullYear()} abizon</span>
          <span className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/image-credits" className="hover:text-ink">Image credits</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
