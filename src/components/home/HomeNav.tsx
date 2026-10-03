"use client";

/**
 * THE HOMEPAGE'S NAVIGATION — a floating glass pill over the destination
 * stage, in place of the site header.
 *
 * The full header was a light bar sitting above a dark, full-bleed scene; it
 * cut the page in two. This keeps only what a visitor needs from it — the
 * wordmark home, search (which drives the hall, exactly as the header's did),
 * the tools, tracking and the account — and floats it over the space
 * background the way getlayers floats its own.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileSearch, Search, User } from "lucide-react";

import { BrandMark } from "@/components/BrandLogo";
import { Wordmark } from "@/components/Wordmark";
import { cn } from "@/lib/utils";

const LINKS = [
  { label: "Tools", href: "/tools" },
  { label: "Passport index", href: "/passport-index" },
  { label: "Requirements", href: "/tools/visa-requirements" },
];

export function HomeNav({
  searchQuery,
  onSearchChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const glass = cn(
    "border border-white/10 backdrop-blur-xl transition-colors duration-500",
    scrolled ? "bg-[#070a16]/80" : "bg-white/[0.04]",
  );

  return (
    <header className="pointer-events-none fixed inset-x-0 top-3 z-sticky px-3 md:top-4 md:px-6">
      <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-3">
        <Link
          href="/"
          aria-label="abizon home"
          className={cn("pointer-events-auto flex h-11 items-center gap-2 rounded-full px-4", glass)}
        >
          <BrandMark tone="current" className="size-6 text-white" />
          <Wordmark className="text-lg !text-white" />
        </Link>

        <nav
          aria-label="Primary"
          className={cn("pointer-events-auto hidden h-11 items-center gap-1 rounded-full p-1 md:flex", glass)}
        >
          <label className="relative flex h-9 items-center">
            <span className="sr-only">Search countries</span>
            <Search aria-hidden className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-white/45" />
            <input
              type="search"
              placeholder="Search countries"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-9 w-52 rounded-full bg-white/[0.06] pl-8 pr-3 text-xs text-white placeholder:text-white/40 outline-none ring-sky-300/60 transition-[width,box-shadow] focus:w-64 focus:ring-1 lg:w-60"
            />
          </label>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-xs font-medium text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            href="/track"
            aria-label="Track an application"
            title="Track an application"
            className={cn("grid h-11 w-11 place-items-center rounded-full text-white/75 hover:text-white", glass)}
          >
            <FileSearch className="h-4.5 w-4.5" aria-hidden />
          </Link>
          <Link
            href="/profile"
            aria-label="Open your profile"
            className={cn("grid h-11 w-11 place-items-center rounded-full text-white/75 hover:text-white", glass)}
          >
            <User className="h-4.5 w-4.5" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
